import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDbAdapter, ROLE_PERMISSIONS } from './db-adapter.js';
import {
  handlePublicDictRoutes,
  handleAuthenticatedAiRoutes,
  MAX_USER_CUSTOM_LESSONS
} from './ai-dict-router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function resolveSecretKey(explicitSecret, secretDir) {
  if (explicitSecret && explicitSecret.length >= 16) {
    return explicitSecret;
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('[CRITICAL SECURITY] JWT_SECRET is not configured (>=16 chars) in production!');
  }
  const secretPath = path.join(secretDir, '.jwt_secret');
  try {
    if (!fs.existsSync(secretDir)) {
      fs.mkdirSync(secretDir, { recursive: true });
    }
    if (fs.existsSync(secretPath)) {
      return fs.readFileSync(secretPath, 'utf8').trim();
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, 'utf8');
    return generated;
  } catch {
    // Read-only serverless filesystems (e.g. Vercel /var/task): fall back to an ephemeral in-memory secret
    // so public endpoints like /api/auth/config never crash with ENOENT. Always set JWT_SECRET in production.
    return crypto.randomBytes(32).toString('hex');
  }
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function createRateLimiter({ windowMs = 60_000, maxRequests = 25 } = {}) {
  const hits = new Map();

  return function checkLimit(ip) {
    const now = Date.now();
    // Periodically prune stale entries
    if (hits.size > 1000) {
      for (const [k, rec] of hits.entries()) {
        if (now > rec.resetAt) hits.delete(k);
      }
    }
    const existing = hits.get(ip);
    if (!existing || now > existing.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }
    existing.count += 1;
    if (existing.count > maxRequests) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      };
    }
    return { allowed: true, retryAfterSec: 0 };
  };
}

function resolveCorsOrigin(req) {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) return null;

  const allowedEnv = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (allowedEnv.length > 0) {
    return allowedEnv.includes(requestOrigin) ? requestOrigin : null;
  }

  // Same-origin or local dev origins allowed by default
  const host = req.headers.host;
  if (host && (requestOrigin === `https://${host}` || requestOrigin === `http://${host}`)) {
    return requestOrigin;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) {
    return requestOrigin;
  }
  return null;
}

function sendJson(req, res, statusCode, body, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...extraHeaders
  };
  const corsOrigin = resolveCorsOrigin(req);
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
}

function parseJsonBody(req, limit = 5 * 1024 * 1024) {
  // Vercel @vercel/node pre-parses application/json into req.body before invoking the handler.
  if (req && req.body !== undefined) {
    if (req.body === null) return Promise.resolve({});
    if (Buffer.isBuffer(req.body)) {
      if (req.body.length > limit) return Promise.reject(new Error('Payload too large (Limit 5MB).'));
      const raw = req.body.toString('utf8').trim();
      if (!raw) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(raw));
      } catch {
        return Promise.reject(new Error('Invalid JSON format.'));
      }
    }
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > limit) {
        return Promise.reject(new Error('Payload too large (Limit 5MB).'));
      }
      if (!req.body.trim()) return Promise.resolve({});
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch {
        return Promise.reject(new Error('Invalid JSON format.'));
      }
    }
    if (typeof req.body === 'object') {
      return Promise.resolve(req.body);
    }
  }

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large (Limit 5MB).'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON format.'));
      }
    });

    req.on('error', reject);
  });
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function sanitizeUser(user) {
  if (!user) return null;
  const role = user.role || 'user';
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role,
    status: user.status || 'active',
    permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user,
    createdAt: user.createdAt
  };
}

/**
 * Verifies Google OAuth credentials (ID Token or Access Token) directly against Google servers.
 * Never trusts unsigned client-supplied emails or unverified JWT payloads.
 */
async function defaultVerifyGoogleCredentials({ credential, accessToken }) {
  const expectedClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!expectedClientId) {
    const err = new Error('Google OAuth chưa được cấu hình (thiếu GOOGLE_CLIENT_ID trên máy chủ).');
    err.statusCode = 503;
    throw err;
  }

  if (credential && typeof credential === 'string') {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.email) {
      const err = new Error('Google ID Token không hợp lệ hoặc đã hết hạn.');
      err.statusCode = 401;
      throw err;
    }
    if (payload.aud !== expectedClientId) {
      const err = new Error('Google ID Token không khớp với ứng dụng (Invalid audience).');
      err.statusCode = 401;
      throw err;
    }
    if (payload.email_verified !== true && payload.email_verified !== 'true') {
      const err = new Error('Tài khoản Google chưa xác minh email.');
      err.statusCode = 401;
      throw err;
    }
    if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) {
      const err = new Error('Google ID Token đã hết hạn.');
      err.statusCode = 401;
      throw err;
    }
    if (payload.iss && payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      const err = new Error('Nguồn cấp Google ID Token không hợp lệ.');
      err.statusCode = 401;
      throw err;
    }
    return {
      email: String(payload.email).trim().toLowerCase(),
      emailVerified: true,
      name: String(payload.name || payload.given_name || payload.email.split('@')[0]).trim(),
      avatar: payload.picture || '',
      googleId: String(payload.sub || '')
    };
  }

  if (accessToken && typeof accessToken === 'string') {
    // Verify token audience first to prevent confused-deputy replay across Google OAuth apps
    const infoCheckRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    const tokenMeta = await infoCheckRes.json().catch(() => ({}));
    const tokenAudience = tokenMeta.aud || tokenMeta.azp || '';
    if (!infoCheckRes.ok || tokenAudience !== expectedClientId) {
      const err = new Error('Google Access Token không hợp lệ hoặc không thuộc ứng dụng này.');
      err.statusCode = 401;
      throw err;
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !profile.email || profile.email_verified !== true) {
      const err = new Error('Không thể xác minh tài khoản từ Google UserInfo.');
      err.statusCode = 401;
      throw err;
    }

    return {
      email: String(profile.email).trim().toLowerCase(),
      emailVerified: true,
      name: String(profile.name || profile.given_name || profile.email.split('@')[0]).trim(),
      avatar: profile.picture || '',
      googleId: String(profile.sub || '')
    };
  }

  const err = new Error('Thiếu mã xác thực Google (credential hoặc accessToken).');
  err.statusCode = 400;
  throw err;
}

/**
 * Factory creating an isolated Auth/Sync/Admin API handler + DB lifecycle.
 */
export function createAuthAndSyncHandler(options = {}) {
  const dbPath = options.dbPath;
  const secretDir = dbPath ? path.dirname(dbPath) : DEFAULT_DATA_DIR;
  const jwtSecret = resolveSecretKey(options.jwtSecret, secretDir);
  const verifyGoogleFn = options.verifyGoogleCredentials || defaultVerifyGoogleCredentials;
  const authRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: options.authRateLimitMax || 25 });
  const dictRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: options.dictRateLimitMax || 60 });
  const dbPromise = createDbAdapter({ dbPath: options.dbPath, databaseUrl: options.databaseUrl });

  function generateToken(userId, role = 'user', tokenVersion = 1) {
    const timestamp = Date.now();
    const payload = `${userId}.${role}.${tokenVersion}.${timestamp}`;
    const signature = crypto.createHmac('sha256', jwtSecret).update(payload).digest('hex');
    return `${payload}.${signature}`;
  }

  function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 5) return null;

    const [userId, role, tokenVersionStr, timestampStr, signature] = parts;
    const payload = `${userId}.${role}.${tokenVersionStr}.${timestampStr}`;
    const expectedSig = crypto.createHmac('sha256', jwtSecret).update(payload).digest('hex');

    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const timestamp = parseInt(timestampStr, 10);
    const tokenVersion = parseInt(tokenVersionStr, 10);
    if (isNaN(timestamp) || isNaN(tokenVersion) || Date.now() - timestamp > TOKEN_TTL_MS) {
      return null;
    }

    return { userId, role, tokenVersion };
  }

  async function handler(req, res, pathname) {
    const db = await dbPromise;

    // CORS Preflight
    if (req.method === 'OPTIONS') {
      const corsOrigin = resolveCorsOrigin(req);
      const headers = {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      };
      if (corsOrigin) {
        headers['Access-Control-Allow-Origin'] = corsOrigin;
        headers['Vary'] = 'Origin';
      }
      res.writeHead(204, headers);
      res.end();
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();

    // Rate limit authentication endpoints against brute force
    if (pathname.startsWith('/api/auth/') && pathname !== '/api/auth/config' && pathname !== '/api/auth/me') {
      const limit = authRateLimiter(clientIp);
      if (!limit.allowed) {
        sendJson(req, res, 429, { error: `Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau ${limit.retryAfterSec} giây.` }, {
          'Retry-After': String(limit.retryAfterSec)
        });
        return;
      }
    }

    // --- Public Dictionary & Translation Routes (with DB cache & rate limit) ---
    if (pathname.startsWith('/api/dict/')) {
      const limit = dictRateLimiter(clientIp);
      if (!limit.allowed) {
        sendJson(req, res, 429, { error: `Quá nhiều yêu cầu tra từ điển. Vui lòng thử lại sau ${limit.retryAfterSec} giây.` }, {
          'Retry-After': String(limit.retryAfterSec)
        });
        return;
      }
      const handled = await handlePublicDictRoutes({ req, res, pathname, db, parseJsonBody, sendJson, options });
      if (handled) return;
    }

    // --- 0. GET /api/auth/config ---
    if (pathname === '/api/auth/config' && req.method === 'GET') {
      sendJson(req, res, 200, {
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        appName: 'AURA Learning',
        version: '2.1.0'
      });
      return;
    }

    // --- 0.1 POST /api/auth/google (Verified Google GIS / OAuth Login) ---
    if (pathname === '/api/auth/google' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const verified = await verifyGoogleFn({
          credential: body.credential,
          accessToken: body.accessToken
        });

        const email = verified.email;
        const name = verified.name || email.split('@')[0];
        const avatar = verified.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
        const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

        let user = await db.findUserByEmail(email);
        if (user) {
          if (user.status && user.status !== 'active') {
            sendJson(req, res, 403, { error: 'Tài khoản này đã bị tạm khóa.' });
            return;
          }
          if (adminEmail && email === adminEmail && verified.emailVerified) {
            user.role = 'admin';
          }
          if (avatar && (!user.avatar || user.avatar.includes('dicebear'))) {
            user.avatar = avatar;
          }
          user = await db.saveUser(user);
        } else {
          const userId = `usr_g_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          const salt = crypto.randomBytes(32).toString('hex');
          const hash = hashPassword(crypto.randomBytes(24).toString('hex'), salt);
          const role = adminEmail && email === adminEmail && verified.emailVerified ? 'admin' : 'user';

          user = await db.saveUser({
            id: userId,
            name,
            email,
            salt,
            hash,
            avatar,
            role,
            googleId: verified.googleId || '',
            provider: 'google',
            status: 'active',
            tokenVersion: 1,
            createdAt: Date.now()
          });
          console.info(`[Auth Audit] New Google user registered: ${email} (${userId}, Role: ${role})`);
        }

        if (Array.isArray(body.initialWords) && body.initialWords.length > 0) {
          await db.saveUserWords(user.id, body.initialWords, []);
        }

        const token = generateToken(user.id, user.role || 'user', user.tokenVersion || 1);
        console.info(`[Auth Audit] Google login verified: ${email} (${user.id}, Role: ${user.role || 'user'})`);
        sendJson(req, res, 200, { user: sanitizeUser(user), token });
      } catch (err) {
        const status = err.statusCode || 500;
        console.warn(`[Auth Security] Google login rejected (${status}):`, err.message);
        sendJson(req, res, status, { error: err.message || 'Xác thực Google thất bại.' });
      }
      return;
    }

    // --- 1. POST /api/auth/register ---
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const name = (body.name || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        if (!name || name.length < 2) {
          sendJson(req, res, 400, { error: 'Họ và tên phải có ít nhất 2 ký tự.' });
          return;
        }
        if (!email || !email.includes('@') || !email.includes('.')) {
          sendJson(req, res, 400, { error: 'Địa chỉ email không hợp lệ.' });
          return;
        }
        if (!password || password.length < 6) {
          sendJson(req, res, 400, { error: 'Mật khẩu phải từ 6 ký tự trở lên.' });
          return;
        }
        if (await db.findUserByEmail(email)) {
          sendJson(req, res, 409, { error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
          return;
        }

        const salt = crypto.randomBytes(32).toString('hex');
        const hash = hashPassword(password, salt);
        const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
        // Public registration ALWAYS starts as standard 'user' — never auto-escalate by email domain
        const role = 'user';

        const newUser = await db.saveUser({
          id: userId,
          name,
          email,
          salt,
          hash,
          avatar,
          role,
          status: 'active',
          tokenVersion: 1,
          createdAt: Date.now()
        });

        if (Array.isArray(body.initialWords) && body.initialWords.length > 0) {
          await db.saveUserWords(userId, body.initialWords, []);
        }

        const token = generateToken(userId, role, 1);
        console.info(`[Auth Audit] User registered: ${email} (${userId}, Role: ${role})`);
        sendJson(req, res, 201, { user: sanitizeUser(newUser), token });
      } catch (err) {
        console.error('[Auth Error] Register failed:', err);
        sendJson(req, res, 500, { error: err.message || 'Lỗi xử lý đăng ký tài khoản.' });
      }
      return;
    }

    // --- 2. POST /api/auth/login ---
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';

        if (!email || !password) {
          sendJson(req, res, 400, { error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' });
          return;
        }

        const user = await db.findUserByEmail(email);
        if (!user) {
          sendJson(req, res, 401, { error: 'Email hoặc mật khẩu không chính xác.' });
          return;
        }
        if (user.status && user.status !== 'active') {
          sendJson(req, res, 403, { error: 'Tài khoản này đã bị tạm khóa.' });
          return;
        }

        const hash = hashPassword(password, user.salt);
        if (hash !== user.hash) {
          sendJson(req, res, 401, { error: 'Email hoặc mật khẩu không chính xác.' });
          return;
        }

        const role = user.role || 'user';
        const token = generateToken(user.id, role, user.tokenVersion || 1);
        console.info(`[Auth Audit] User logged in: ${email} (${user.id}, Role: ${role})`);
        sendJson(req, res, 200, { user: sanitizeUser(user), token });
      } catch (err) {
        console.error('[Auth Error] Login failed:', err);
        sendJson(req, res, 500, { error: err.message || 'Lỗi đăng nhập hệ thống.' });
      }
      return;
    }

    // --- Authenticated Endpoints Guard ---
    const token = extractBearerToken(req);
    const tokenPayload = verifyToken(token);

    if (!tokenPayload) {
      sendJson(req, res, 401, { error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
      return;
    }

    const { userId } = tokenPayload;
    const currentUser = await db.getUser(userId);

    if (!currentUser) {
      sendJson(req, res, 401, { error: 'Tài khoản người dùng không tồn tại.' });
      return;
    }
    if ((currentUser.tokenVersion || 1) !== tokenPayload.tokenVersion) {
      sendJson(req, res, 401, { error: 'Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.' });
      return;
    }
    if (currentUser.status && currentUser.status !== 'active') {
      sendJson(req, res, 403, { error: 'Tài khoản của bạn đã bị tạm khóa.' });
      return;
    }

    // --- 2.5 POST /api/auth/logout (Server-side Token Revocation) ---
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      await db.incrementTokenVersion(userId);
      sendJson(req, res, 200, { ok: true });
      return;
    }

    // --- 3. GET /api/auth/me ---
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      sendJson(req, res, 200, { user: sanitizeUser(currentUser) });
      return;
    }

    // --- 4. GET /api/sync/words ---
    if (pathname === '/api/sync/words' && req.method === 'GET') {
      try {
        const words = await db.getUserWords(userId);
        sendJson(req, res, 200, { words, count: words.length, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 5. POST /api/sync/words (Supports additions, updates AND deletions) ---
    if (pathname === '/api/sync/words' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const incoming = Array.isArray(body.words) ? body.words : [];
        const deletedList = [
          ...(Array.isArray(body.deletedWords) ? body.deletedWords : []),
          ...(Array.isArray(body.deletedWordIds) ? body.deletedWordIds : [])
        ];
        const merged = await db.saveUserWords(userId, incoming, deletedList);
        sendJson(req, res, 200, { words: merged, count: merged.length, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 5.1 POST /api/sync/reviews (SRS Audit Logs) ---
    if (pathname === '/api/sync/reviews' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const logs = Array.isArray(body.logs) ? body.logs : (body.review ? [body.review] : []);
        const recorded = await db.recordReviewLogs(userId, logs);
        sendJson(req, res, 200, { recorded, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 5.2 GET/POST /api/sync/lessons (Custom Video Lessons) ---
    if (pathname === '/api/sync/lessons' && req.method === 'GET') {
      try {
        const lessons = await db.getUserLessons(userId);
        sendJson(req, res, 200, { lessons, count: lessons.length });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    if (pathname === '/api/sync/lessons' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const lessons = Array.isArray(body.lessons) ? body.lessons : [];
        const deletedLessonIds = Array.isArray(body.deletedLessonIds) ? body.deletedLessonIds : [];
        const isUnlimited = currentUser.role === 'pro' || currentUser.role === 'admin';

        if (!isUnlimited && lessons.length > 0) {
          const existing = await db.getUserLessons(userId);
          const delSet = new Set(deletedLessonIds.map(String));
          const existingIds = new Set(existing.filter(l => !delSet.has(l.id)).map(l => l.id));
          const hasNewOverLimit = lessons.some(l => l?.id && !existingIds.has(l.id)) &&
            (existingIds.size + lessons.filter(l => l?.id && !existingIds.has(l.id)).length > MAX_USER_CUSTOM_LESSONS);

          if (hasNewOverLimit) {
            sendJson(req, res, 403, {
              error: `Tài khoản User tiêu chuẩn tối đa ${MAX_USER_CUSTOM_LESSONS} bài học tự nhập. Nâng cấp Pro để import không giới hạn.`
            });
            return;
          }
        }

        const merged = await db.syncUserLessons(userId, lessons, deletedLessonIds);
        sendJson(req, res, 200, { lessons: merged, count: merged.length, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 5.3 GET/POST /api/sync/state (Scenarios, Streak, Profiles, Shorts) ---
    if (pathname === '/api/sync/state' && req.method === 'GET') {
      try {
        const state = await db.getUserLearningState(userId);
        sendJson(req, res, 200, { state, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    if (pathname === '/api/sync/state' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const patch = (body.state && typeof body.state === 'object') ? body.state : {};
        const state = await db.saveUserLearningState(userId, patch);
        sendJson(req, res, 200, { state, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 5.4 Authenticated AI Roleplay Routes ---
    if (pathname.startsWith('/api/ai/')) {
      const handled = await handleAuthenticatedAiRoutes({ req, res, pathname, db, currentUser, parseJsonBody, sendJson, options });
      if (handled) return;
    }

    // --- 6. GET /api/sync/lingq ---
    if (pathname === '/api/sync/lingq' && req.method === 'GET') {
      try {
        const statuses = await db.getUserLingq(userId);
        sendJson(req, res, 200, { statuses, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 7. POST /api/sync/lingq ---
    if (pathname === '/api/sync/lingq' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const incoming = (body.statuses && typeof body.statuses === 'object') ? body.statuses : {};
        const merged = await db.saveUserLingq(userId, incoming);
        sendJson(req, res, 200, { statuses: merged, syncedAt: Date.now() });
      } catch (err) {
        sendJson(req, res, 500, { error: err.message });
      }
      return;
    }

    // --- 8. RBAC ADMIN ENDPOINTS (Role: 'admin' required) ---
    if (pathname.startsWith('/api/admin/')) {
      if (currentUser.role !== 'admin') {
        sendJson(req, res, 403, { error: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin).' });
        return;
      }

      if (pathname === '/api/admin/users' && req.method === 'GET') {
        const users = await db.getAllUsers();
        sendJson(req, res, 200, { users, count: users.length });
        return;
      }

      if (pathname === '/api/admin/metrics' && req.method === 'GET') {
        const metrics = await db.getMetrics();
        sendJson(req, res, 200, { metrics });
        return;
      }

      if (pathname === '/api/admin/users/role' && req.method === 'POST') {
        try {
          const body = await parseJsonBody(req);
          const { targetUserId, newRole } = body;
          const updated = await db.updateUserRole(targetUserId, newRole);
          if (!updated) {
            sendJson(req, res, 404, { error: 'Không tìm thấy người dùng cần đổi vai trò.' });
            return;
          }
          console.info(`[Admin RBAC Audit] Admin ${currentUser.email} updated user ${targetUserId} role to ${newRole}`);
          sendJson(req, res, 200, { user: sanitizeUser(updated) });
        } catch (err) {
          sendJson(req, res, 400, { error: err.message });
        }
        return;
      }
    }

    sendJson(req, res, 404, { error: 'API Endpoint Not Found' });
  }

  return {
    handler,
    close: async () => {
      const db = await dbPromise;
      await db.close();
    },
    getDb: () => dbPromise
  };
}

let defaultInstance = null;
export async function handleAuthAndSync(req, res, pathname) {
  if (!defaultInstance) {
    defaultInstance = createAuthAndSyncHandler();
  }
  return defaultInstance.handler(req, res, pathname);
}
