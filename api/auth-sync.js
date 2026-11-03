import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'aura_cloud_db.json');
const SECRET_PATH = path.join(DATA_DIR, '.jwt_secret');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persistent Secret for Token Signing
function getSecretKey() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, generated, 'utf8');
  return generated;
}

const JWT_SECRET = getSecretKey();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// In-Memory Database with Atomic Disk Persistence
class CloudDatabase {
  constructor() {
    this.data = {
      users: {},       // userId -> { id, name, email, salt, hash, avatar, createdAt }
      words: {},       // userId -> SavedWord[]
      lingq: {},       // userId -> Record<word, status>
      meta: { version: 1, lastUpdatedAt: Date.now() }
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data = {
            users: parsed.users || {},
            words: parsed.words || {},
            lingq: parsed.lingq || {},
            meta: parsed.meta || { version: 1, lastUpdatedAt: Date.now() }
          };
          console.info(`[AURA Cloud DB] Loaded ${Object.keys(this.data.users).length} registered users from disk.`);
        }
      }
    } catch (err) {
      console.error('[AURA Cloud DB] Error loading database from disk, starting fresh:', err);
    }
  }

  save() {
    try {
      this.data.meta.lastUpdatedAt = Date.now();
      const tempPath = `${DB_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('[AURA Cloud DB] Failed to save database to disk:', err);
    }
  }

  findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    return Object.values(this.data.users).find(u => u.email.toLowerCase() === cleanEmail);
  }

  getUser(userId) {
    return this.data.users[userId] || null;
  }

  saveUser(user) {
    this.data.users[user.id] = user;
    if (!this.data.words[user.id]) {
      this.data.words[user.id] = [];
    }
    if (!this.data.lingq[user.id]) {
      this.data.lingq[user.id] = {};
    }
    this.save();
  }

  getUserWords(userId) {
    return this.data.words[userId] || [];
  }

  saveUserWords(userId, incomingWords) {
    const existing = this.data.words[userId] || [];
    const wordMap = new Map();

    // Index existing
    existing.forEach(w => {
      if (w && w.id) wordMap.set(w.id, w);
    });

    // Merge incoming (LWW - Last-Write-Wins based on USN and savedAt)
    (incomingWords || []).forEach(inc => {
      if (!inc || !inc.id) return;
      const prev = wordMap.get(inc.id);
      if (!prev) {
        wordMap.set(inc.id, { ...inc, isDirty: false });
      } else {
        const incUsn = inc.usn || 0;
        const prevUsn = prev.usn || 0;
        const incTime = inc.lastReviewedAt || inc.savedAt || 0;
        const prevTime = prev.lastReviewedAt || prev.savedAt || 0;

        if (incUsn > prevUsn || (incUsn === prevUsn && incTime >= prevTime)) {
          wordMap.set(inc.id, { ...inc, isDirty: false });
        }
      }
    });

    const merged = Array.from(wordMap.values());
    this.data.words[userId] = merged;
    this.save();
    return merged;
  }

  getUserLingq(userId) {
    return this.data.lingq[userId] || {};
  }

  saveUserLingq(userId, incomingStatuses) {
    const current = this.data.lingq[userId] || {};
    const merged = { ...current, ...(incomingStatuses || {}) };
    this.data.lingq[userId] = merged;
    this.save();
    return merged;
  }
}

const db = new CloudDatabase();

// Cryptographic helpers
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateToken(userId) {
  const timestamp = Date.now();
  const payload = `${userId}.${timestamp}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, timestampStr, signature] = parts;
  const payload = `${userId}.${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
    return null; // Expired
  }

  return userId;
}

// Request helpers
function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function parseJsonBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];

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
      } catch (err) {
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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

/**
 * Main API Handler for /api/auth/* and /api/sync/*
 */
export async function handleAuthAndSync(req, res, pathname) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    });
    res.end();
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
        sendJson(res, 400, { error: 'Họ và tên phải có ít nhất 2 ký tự.' });
        return;
      }
      if (!email || !email.includes('@') || !email.includes('.')) {
        sendJson(res, 400, { error: 'Địa chỉ email không hợp lệ.' });
        return;
      }
      if (!password || password.length < 6) {
        sendJson(res, 400, { error: 'Mật khẩu phải từ 6 ký tự trở lên.' });
        return;
      }

      if (db.findUserByEmail(email)) {
        sendJson(res, 409, { error: 'Email này đã được đăng ký. Vui lòng đăng nhập.' });
        return;
      }

      const salt = crypto.randomBytes(32).toString('hex');
      const hash = hashPassword(password, salt);
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

      const newUser = {
        id: userId,
        name,
        email,
        salt,
        hash,
        avatar,
        createdAt: Date.now()
      };

      db.saveUser(newUser);

      // If initial words provided during registration (from offline anonymous session), save them!
      if (Array.isArray(body.initialWords) && body.initialWords.length > 0) {
        db.saveUserWords(userId, body.initialWords);
        console.info(`[Auth] Migrated ${body.initialWords.length} initial offline words to user ${email}.`);
      }

      const token = generateToken(userId);
      console.info(`[Auth Audit] User registered successfully: ${email} (${userId})`);
      sendJson(res, 201, { user: sanitizeUser(newUser), token });
    } catch (err) {
      console.error('[Auth Error] Register failed:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý đăng ký tài khoản.' });
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
        sendJson(res, 400, { error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' });
        return;
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        sendJson(res, 401, { error: 'Email hoặc mật khẩu không chính xác.' });
        return;
      }

      const hash = hashPassword(password, user.salt);
      if (hash !== user.hash) {
        sendJson(res, 401, { error: 'Email hoặc mật khẩu không chính xác.' });
        return;
      }

      const token = generateToken(user.id);
      console.info(`[Auth Audit] User logged in: ${email} (${user.id})`);
      sendJson(res, 200, { user: sanitizeUser(user), token });
    } catch (err) {
      console.error('[Auth Error] Login failed:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi đăng nhập hệ thống.' });
    }
    return;
  }

  // --- 3. GET /api/auth/me ---
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const token = extractBearerToken(req);
    const userId = verifyToken(token);
    if (!userId) {
      sendJson(res, 401, { error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
      return;
    }
    const user = db.getUser(userId);
    if (!user) {
      sendJson(res, 404, { error: 'Tài khoản không tồn tại.' });
      return;
    }
    sendJson(res, 200, { user: sanitizeUser(user) });
    return;
  }

  // --- Authenticated Sync Endpoints ---
  const token = extractBearerToken(req);
  const userId = verifyToken(token);

  if (!userId) {
    sendJson(res, 401, { error: 'Yêu cầu xác thực tài khoản để đồng bộ đám mây.' });
    return;
  }

  // --- 4. GET /api/sync/words ---
  if (pathname === '/api/sync/words' && req.method === 'GET') {
    try {
      const words = db.getUserWords(userId);
      sendJson(res, 200, { words, count: words.length, syncedAt: Date.now() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // --- 5. POST /api/sync/words ---
  if (pathname === '/api/sync/words' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const incoming = Array.isArray(body.words) ? body.words : [];
      const merged = db.saveUserWords(userId, incoming);
      console.info(`[Sync Audit] Synced ${incoming.length} incoming words for user ${userId}. Total words: ${merged.length}`);
      sendJson(res, 200, { words: merged, count: merged.length, syncedAt: Date.now() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // --- 6. GET /api/sync/lingq ---
  if (pathname === '/api/sync/lingq' && req.method === 'GET') {
    try {
      const statuses = db.getUserLingq(userId);
      sendJson(res, 200, { statuses, syncedAt: Date.now() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // --- 7. POST /api/sync/lingq ---
  if (pathname === '/api/sync/lingq' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const incoming = (body.statuses && typeof body.statuses === 'object') ? body.statuses : {};
      const merged = db.saveUserLingq(userId, incoming);
      sendJson(res, 200, { statuses: merged, syncedAt: Date.now() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // Route not found in auth/sync router
  sendJson(res, 404, { error: 'API Endpoint Not Found' });
}
