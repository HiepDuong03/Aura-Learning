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

// ==============================================================================
// RBAC (ROLE-BASED ACCESS CONTROL) PERMISSIONS MATRIX
// ==============================================================================
const ROLE_PERMISSIONS = {
  guest: ['vocab:read'],
  user: ['vocab:read', 'vocab:write', 'vocab:sync', 'import:limited'],
  pro: ['vocab:read', 'vocab:write', 'vocab:sync', 'import:unlimited', 'speech:ai_score'],
  admin: [
    'vocab:read',
    'vocab:write',
    'vocab:sync',
    'import:unlimited',
    'speech:ai_score',
    'admin:manage_users',
    'admin:view_metrics'
  ]
};

// ==============================================================================
// IN-MEMORY NORMALIZED RELATIONAL DATABASE WITH ATOMIC DISK PERSISTENCE
// Tables: users, words_master, vocabulary_notes, srs_cards, srs_review_logs, user_lingq
// ==============================================================================
class RelationalCloudDatabase {
  constructor() {
    this.tables = {
      users: {},            // userId -> { id, name, email, salt, hash, avatar, role, status, createdAt, updatedAt }
      words_master: {},     // wordId -> { id, lemma, phonetic, partOfSpeech, defaultTranslationVi, definitionEn, cefrLevel }
      vocabulary_notes: {}, // noteId -> { id, userId, profileId, wordId, customTranslation, contextSentence, sourceLessonId, createdAt }
      srs_cards: {},        // cardId -> { id, noteId, userId, state, easeFactor, intervalDays, repetitions, lapses, dueAt, usn }
      srs_review_logs: [],  // [ { id, cardId, userId, rating, scheduledInterval, easeFactor, reviewedAt } ]
      user_lingq: {},       // userId -> { [lemma]: status }
      meta: { version: 2, lastUpdatedAt: Date.now() }
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Backward-compatible schema migration from v1 (flat words) to v2 (relational tables)
          if (parsed.users) {
            this.tables.users = parsed.users;
          }
          if (parsed.words_master) {
            this.tables.words_master = parsed.words_master;
            this.tables.vocabulary_notes = parsed.vocabulary_notes || {};
            this.tables.srs_cards = parsed.srs_cards || {};
            this.tables.srs_review_logs = parsed.srs_review_logs || [];
            this.tables.user_lingq = parsed.lingq || parsed.user_lingq || {};
          } else if (parsed.words) {
            // Migrate v1 flat words into v2 relational entities
            this.migrateV1Words(parsed.words);
            this.tables.user_lingq = parsed.lingq || {};
          }
          console.info(`[AURA Relational DB] Loaded ${Object.keys(this.tables.users).length} users, ${Object.keys(this.tables.words_master).length} master dictionary entries, ${Object.keys(this.tables.srs_cards).length} SRS cards.`);
        }
      }
    } catch (err) {
      console.error('[AURA Relational DB] Error loading database from disk, starting fresh:', err);
    }
  }

  /**
   * Migrate legacy flat words into 3NF normalized tables
   */
  migrateV1Words(wordsByUser) {
    Object.entries(wordsByUser || {}).forEach(([userId, words]) => {
      if (Array.isArray(words)) {
        this.saveUserWords(userId, words);
      }
    });
  }

  save() {
    try {
      this.tables.meta.lastUpdatedAt = Date.now();
      const tempPath = `${DB_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.tables, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('[AURA Relational DB] Failed to save database to disk:', err);
    }
  }

  findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    return Object.values(this.tables.users).find(u => u.email.toLowerCase() === cleanEmail);
  }

  getUser(userId) {
    return this.tables.users[userId] || null;
  }

  getAllUsers() {
    return Object.values(this.tables.users).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role || 'user',
      permissions: ROLE_PERMISSIONS[u.role || 'user'] || ROLE_PERMISSIONS.user,
      createdAt: u.createdAt,
      cardCount: Object.values(this.tables.srs_cards).filter(c => c.userId === u.id).length
    }));
  }

  updateUserRole(userId, newRole) {
    const user = this.tables.users[userId];
    if (!user) return null;
    if (!ROLE_PERMISSIONS[newRole]) {
      throw new Error(`Invalid role: ${newRole}. Must be one of: guest, user, pro, admin`);
    }
    user.role = newRole;
    user.updatedAt = Date.now();
    this.save();
    return user;
  }

  saveUser(user) {
    const role = user.role || (user.email.endsWith('@aura.ai') ? 'admin' : 'user');
    this.tables.users[user.id] = {
      ...user,
      role,
      status: user.status || 'active',
      updatedAt: Date.now()
    };
    this.save();
  }

  /**
   * Normalizes incoming words into:
   * 1. words_master (Global dictionary)
   * 2. vocabulary_notes (Context & translation)
   * 3. srs_cards (Anki SM-2 state)
   * 4. Returns combined client SavedWord format for zero UI breakage
   */
  saveUserWords(userId, incomingWords) {
    const now = Date.now();

    (incomingWords || []).forEach(inc => {
      if (!inc || !inc.word) return;
      const lemma = inc.word.toLowerCase().trim();
      const wordId = `wm_${Buffer.from(lemma).toString('base64url')}`;

      // 1. Table: words_master
      if (!this.tables.words_master[wordId]) {
        this.tables.words_master[wordId] = {
          id: wordId,
          lemma,
          phonetic: inc.phonetic || `/${lemma}/`,
          partOfSpeech: inc.partOfSpeech || 'n.',
          defaultTranslationVi: inc.translation || '',
          definitionEn: inc.definitionEn || '',
          cefrLevel: 'B1',
          createdAt: now
        };
      }

      // 2. Table: vocabulary_notes
      const noteId = `note_${userId}_${wordId}`;
      const existingNote = this.tables.vocabulary_notes[noteId];
      this.tables.vocabulary_notes[noteId] = {
        id: noteId,
        userId,
        profileId: inc.profileId || userId,
        wordId,
        customTranslation: inc.translation || existingNote?.customTranslation || '',
        contextSentence: inc.contextSentence || existingNote?.contextSentence || '',
        sourceLessonId: inc.videoTitle || existingNote?.sourceLessonId || 'YouTube Lesson',
        createdAt: existingNote?.createdAt || inc.savedAt || now,
        updatedAt: now
      };

      // 3. Table: srs_cards
      const cardId = `card_${noteId}`;
      const existingCard = this.tables.srs_cards[cardId];
      const incUsn = inc.usn || 0;
      const prevUsn = existingCard?.usn || 0;

      if (!existingCard || incUsn >= prevUsn) {
        this.tables.srs_cards[cardId] = {
          id: cardId,
          noteId,
          userId,
          profileId: inc.profileId || userId,
          cardType: 'recognition',
          state: inc.state || 'new',
          easeFactor: inc.easeFactor || 2.50,
          intervalDays: typeof inc.interval === 'number' ? inc.interval : 0,
          repetitions: typeof inc.repetitions === 'number' ? inc.repetitions : 0,
          lapses: typeof inc.lapses === 'number' ? inc.lapses : 0,
          dueAt: inc.dueAt || now,
          lastReviewedAt: inc.lastReviewedAt || now,
          usn: Math.max(incUsn, prevUsn) + 1,
          createdAt: existingCard?.createdAt || inc.savedAt || now
        };
      }
    });

    this.save();
    return this.getUserWords(userId);
  }

  /**
   * Reconstitutes normalized tables into client SavedWord[]
   */
  getUserWords(userId) {
    const userCards = Object.values(this.tables.srs_cards).filter(c => c.userId === userId);
    
    return userCards.map(card => {
      const note = this.tables.vocabulary_notes[card.noteId];
      const master = note ? this.tables.words_master[note.wordId] : null;

      return {
        id: card.id,
        word: master?.lemma || 'unknown',
        phonetic: master?.phonetic || '',
        partOfSpeech: master?.partOfSpeech || '',
        translation: note?.customTranslation || master?.defaultTranslationVi || '',
        definitionEn: master?.definitionEn || '',
        contextSentence: note?.contextSentence || '',
        videoTitle: note?.sourceLessonId || 'Lesson',
        savedAt: card.createdAt,
        easeFactor: card.easeFactor,
        interval: card.intervalDays,
        repetitions: card.repetitions,
        lapses: card.lapses,
        state: card.state,
        dueAt: card.dueAt,
        lastReviewedAt: card.lastReviewedAt,
        usn: card.usn,
        isDirty: false,
        profileId: card.profileId
      };
    });
  }

  getUserLingq(userId) {
    return this.tables.user_lingq[userId] || {};
  }

  saveUserLingq(userId, incomingStatuses) {
    const current = this.tables.user_lingq[userId] || {};
    const merged = { ...current, ...(incomingStatuses || {}) };
    this.tables.user_lingq[userId] = merged;
    this.save();
    return merged;
  }

  getMetrics() {
    return {
      totalUsers: Object.keys(this.tables.users).length,
      totalWordsMaster: Object.keys(this.tables.words_master).length,
      totalVocabularyNotes: Object.keys(this.tables.vocabulary_notes).length,
      totalSRSCards: Object.keys(this.tables.srs_cards).length,
      totalReviewLogs: this.tables.srs_review_logs.length,
      lastUpdatedAt: this.tables.meta.lastUpdatedAt
    };
  }
}

const db = new RelationalCloudDatabase();

// Cryptographic helpers
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function generateToken(userId, role = 'user') {
  const timestamp = Date.now();
  const payload = `${userId}.${role}.${timestamp}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 4 && parts.length !== 3) return null;

  let userId, role, timestampStr, signature;
  if (parts.length === 4) {
    [userId, role, timestampStr, signature] = parts;
  } else {
    // Backward compatibility with 3-part tokens
    [userId, timestampStr, signature] = parts;
    role = 'user';
  }

  const payload = parts.length === 4 ? `${userId}.${role}.${timestampStr}` : `${userId}.${timestampStr}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');

  if (signature.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) {
    return null; // Expired
  }

  return { userId, role };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  const role = user.role || 'user';
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role,
    permissions: ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user,
    createdAt: user.createdAt,
  };
}

/**
 * Decode JWT payload (standard for Google ID Token verification)
 */
function decodeJwtPayload(jwt) {
  try {
    if (!jwt || typeof jwt !== 'string') return null;
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Main API Handler for /api/auth/*, /api/sync/*, and /api/admin/*
 */
export async function handleAuthAndSync(req, res, pathname) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end();
    return;
  }

  // --- 0. GET /api/auth/config ---
  if (pathname === '/api/auth/config' && req.method === 'GET') {
    sendJson(res, 200, {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      appName: 'AURA Learning',
      version: '2.0.0'
    });
    return;
  }

  // --- 0.1 POST /api/auth/google (Google GIS & OAuth Login) ---
  if (pathname === '/api/auth/google' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      let email = '';
      let name = '';
      let avatar = '';
      let googleId = '';

      if (body.credential) {
        // Google Identity Services (GIS) ID Token
        const decoded = decodeJwtPayload(body.credential);
        if (!decoded || !decoded.email) {
          sendJson(res, 400, { error: 'Google ID Token không hợp lệ hoặc đã hết hạn.' });
          return;
        }
        email = (decoded.email || '').trim().toLowerCase();
        name = (decoded.name || decoded.given_name || email.split('@')[0]).trim();
        avatar = decoded.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
        googleId = decoded.sub || '';
      } else {
        // Direct OAuth / email authentication
        email = (body.email || '').trim().toLowerCase();
        name = (body.name || email.split('@')[0] || 'Google User').trim();
        avatar = body.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
        googleId = body.googleId || '';
      }

      if (!email || !email.includes('@') || !email.includes('.')) {
        sendJson(res, 400, { error: 'Địa chỉ email Google không hợp lệ.' });
        return;
      }

      let user = db.findUserByEmail(email);
      let role = 'user';
      if (email === process.env.ADMIN_EMAIL || email.endsWith('@aura.ai')) {
        role = 'admin';
      }

      if (user) {
        if (email === process.env.ADMIN_EMAIL || email.endsWith('@aura.ai')) {
          user.role = 'admin';
        }
        if (avatar && (!user.avatar || user.avatar.includes('dicebear'))) {
          user.avatar = avatar;
        }
        db.saveUser(user);
      } else {
        const userId = `usr_g_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const salt = crypto.randomBytes(32).toString('hex');
        const hash = hashPassword(crypto.randomBytes(24).toString('hex'), salt);

        user = {
          id: userId,
          name,
          email,
          salt,
          hash,
          avatar,
          role,
          googleId,
          provider: 'google',
          status: 'active',
          createdAt: Date.now()
        };
        db.saveUser(user);
        console.info(`[Auth Audit] New Google user registered: ${email} (${userId}, Role: ${role})`);
      }

      // Migrate initial offline words if any
      if (Array.isArray(body.initialWords) && body.initialWords.length > 0) {
        db.saveUserWords(user.id, body.initialWords);
        console.info(`[Auth] Migrated ${body.initialWords.length} initial offline words to user ${email}.`);
      }

      const token = generateToken(user.id, user.role || 'user');
      console.info(`[Auth Audit] Google login successful: ${email} (${user.id}, Role: ${user.role || 'user'})`);
      sendJson(res, 200, { user: sanitizeUser(user), token });
    } catch (err) {
      console.error('[Auth Error] Google login failed:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi xử lý xác thực Google.' });
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
      const role = email.endsWith('@aura.ai') ? 'admin' : 'user';

      const newUser = {
        id: userId,
        name,
        email,
        salt,
        hash,
        avatar,
        role,
        status: 'active',
        createdAt: Date.now()
      };

      db.saveUser(newUser);

      // If initial words provided during registration (from offline anonymous session), save them!
      if (Array.isArray(body.initialWords) && body.initialWords.length > 0) {
        db.saveUserWords(userId, body.initialWords);
        console.info(`[Auth] Migrated ${body.initialWords.length} initial offline words to user ${email}.`);
      }

      const token = generateToken(userId, role);
      console.info(`[Auth Audit] User registered: ${email} (${userId}, Role: ${role})`);
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

      const role = user.role || 'user';
      const token = generateToken(user.id, role);
      console.info(`[Auth Audit] User logged in: ${email} (${user.id}, Role: ${role})`);
      sendJson(res, 200, { user: sanitizeUser(user), token });
    } catch (err) {
      console.error('[Auth Error] Login failed:', err);
      sendJson(res, 500, { error: err.message || 'Lỗi đăng nhập hệ thống.' });
    }
    return;
  }

  // --- Authenticated Endpoints Guard ---
  const token = extractBearerToken(req);
  const tokenPayload = verifyToken(token);

  if (!tokenPayload) {
    sendJson(res, 401, { error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
    return;
  }

  const { userId, role } = tokenPayload;
  const currentUser = db.getUser(userId);

  if (!currentUser) {
    sendJson(res, 404, { error: 'Tài khoản người dùng không tồn tại.' });
    return;
  }

  // --- 3. GET /api/auth/me ---
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    sendJson(res, 200, { user: sanitizeUser(currentUser) });
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
      console.info(`[Sync Audit] Synced ${incoming.length} words into relational tables for user ${userId}. Total: ${merged.length}`);
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

  // --- 8. RBAC ADMIN ENDPOINTS (Role: 'admin' required) ---
  if (pathname.startsWith('/api/admin/')) {
    if (currentUser.role !== 'admin') {
      sendJson(res, 403, { error: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (Admin).' });
      return;
    }

    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const users = db.getAllUsers();
      sendJson(res, 200, { users, count: users.length });
      return;
    }

    if (pathname === '/api/admin/metrics' && req.method === 'GET') {
      const metrics = db.getMetrics();
      sendJson(res, 200, { metrics });
      return;
    }

    if (pathname === '/api/admin/users/role' && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { targetUserId, newRole } = body;
        const updated = db.updateUserRole(targetUserId, newRole);
        if (!updated) {
          sendJson(res, 404, { error: 'Không tìm thấy người dùng cần đổi vai trò.' });
          return;
        }
        console.info(`[Admin RBAC Audit] Admin ${currentUser.email} updated user ${targetUserId} role to ${newRole}`);
        sendJson(res, 200, { user: sanitizeUser(updated) });
      } catch (err) {
        sendJson(res, 400, { error: err.message });
      }
      return;
    }
  }

  // Route not found in auth/sync router
  sendJson(res, 404, { error: 'API Endpoint Not Found' });
}
