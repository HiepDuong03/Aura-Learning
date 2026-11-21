import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROLE_PERMISSIONS = {
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

function makeWordId(lemma) {
  return `wm_${Buffer.from(lemma).toString('base64url')}`;
}

function makeScopedProfileId(userId, rawProfileId) {
  const clean = (rawProfileId || '').trim();
  if (!clean || clean === 'prof_default' || clean === userId) {
    return userId;
  }
  return clean.startsWith(`${userId}__`) ? clean : `${userId}__${clean}`;
}

function normalizeDeletedList(deletedWords) {
  const deletedIds = new Set();
  const deletedLemmas = new Set();
  for (const item of deletedWords || []) {
    if (!item) continue;
    if (typeof item === 'string') {
      deletedIds.add(item);
    } else if (typeof item === 'object') {
      if (item.id) deletedIds.add(String(item.id));
      if (item.word) deletedLemmas.add(String(item.word).toLowerCase().trim());
    }
  }
  return { deletedIds, deletedLemmas };
}

/**
 * Local JSON file adapter with async serialized write queue (dev/offline fallback).
 * Supports configurable dbPath so tests run isolated from production files.
 */
class LocalFileDbAdapter {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.writeQueue = Promise.resolve();
    this.tables = {
      users: {},
      words_master: {},
      vocabulary_notes: {},
      srs_cards: {},
      srs_review_logs: [],
      user_lingq: {},
      user_custom_lessons: {},
      user_learning_state: {},
      ai_usage: {},
      meta: { version: 4, lastUpdatedAt: Date.now() }
    };
  }

  async init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.users) this.tables.users = parsed.users;
          if (parsed.words_master) {
            this.tables.words_master = parsed.words_master;
            this.tables.vocabulary_notes = parsed.vocabulary_notes || {};
            this.tables.srs_cards = parsed.srs_cards || {};
            this.tables.srs_review_logs = parsed.srs_review_logs || [];
            this.tables.user_lingq = parsed.lingq || parsed.user_lingq || {};
            this.tables.user_custom_lessons = parsed.user_custom_lessons || {};
            this.tables.user_learning_state = parsed.user_learning_state || {};
            this.tables.ai_usage = parsed.ai_usage || {};
          } else if (parsed.words) {
            for (const [uid, words] of Object.entries(parsed.words)) {
              if (Array.isArray(words)) {
                await this.saveUserWords(uid, words, []);
              }
            }
            this.tables.user_lingq = parsed.lingq || {};
          }
        }
      }
    } catch (err) {
      console.error('[AURA LocalDB] Error loading database from disk, starting fresh:', err);
    }
  }

  scheduleSave() {
    this.tables.meta.lastUpdatedAt = Date.now();
    const snapshot = JSON.stringify(this.tables, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${this.dbPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
      await fs.promises.writeFile(tempPath, snapshot, 'utf8');
      await fs.promises.rename(tempPath, this.dbPath);
    }).catch((err) => {
      console.error('[AURA LocalDB] Async save failed:', err);
    });
    return this.writeQueue;
  }

  async findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    return Object.values(this.tables.users).find(u => u.email.toLowerCase() === cleanEmail) || null;
  }

  async getUser(userId) {
    return this.tables.users[userId] || null;
  }

  async getAllUsers() {
    return Object.values(this.tables.users).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role || 'user',
      status: u.status || 'active',
      permissions: ROLE_PERMISSIONS[u.role || 'user'] || ROLE_PERMISSIONS.user,
      createdAt: u.createdAt,
      cardCount: Object.values(this.tables.srs_cards).filter(c => c.userId === u.id).length
    }));
  }

  async saveUser(user) {
    const role = user.role || 'user';
    this.tables.users[user.id] = {
      ...user,
      role,
      status: user.status || 'active',
      tokenVersion: user.tokenVersion || 1,
      updatedAt: Date.now()
    };
    await this.scheduleSave();
    return this.tables.users[user.id];
  }

  async updateUserRole(userId, newRole) {
    const user = this.tables.users[userId];
    if (!user) return null;
    if (!ROLE_PERMISSIONS[newRole]) {
      throw new Error(`Invalid role: ${newRole}. Must be one of: guest, user, pro, admin`);
    }
    user.role = newRole;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    user.updatedAt = Date.now();
    await this.scheduleSave();
    return user;
  }

  async incrementTokenVersion(userId) {
    const user = this.tables.users[userId];
    if (!user) return null;
    user.tokenVersion = (user.tokenVersion || 1) + 1;
    user.updatedAt = Date.now();
    await this.scheduleSave();
    return user;
  }

  async getUserWords(userId) {
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
        videoTitle: note?.sourceVideoTitle || note?.sourceLessonId || 'Lesson',
        sourceLessonId: note?.sourceLessonKey || undefined,
        sourceYoutubeId: note?.sourceYoutubeId || undefined,
        sourceTimestampSec: typeof note?.sourceTimestampSec === 'number' ? note.sourceTimestampSec : undefined,
        savedAt: card.createdAt,
        easeFactor: card.easeFactor,
        interval: card.intervalDays,
        repetitions: card.repetitions,
        lapses: card.lapses,
        state: card.state,
        dueAt: card.dueAt,
        lastReviewedAt: card.lastReviewedAt,
        stability: typeof card.stability === 'number' ? card.stability : undefined,
        difficulty: typeof card.difficulty === 'number' ? card.difficulty : undefined,
        schedulerVersion: card.schedulerVersion || undefined,
        usn: card.usn,
        isDirty: false,
        profileId: card.profileId
      };
    });
  }

  async saveUserWords(userId, incomingWords, deletedWords = []) {
    const now = Date.now();
    const { deletedIds, deletedLemmas } = normalizeDeletedList(deletedWords);

    // 1. Delete cards/notes explicitly deleted by this user
    if (deletedIds.size > 0 || deletedLemmas.size > 0) {
      for (const [cardId, card] of Object.entries(this.tables.srs_cards)) {
        if (card.userId !== userId) continue;
        const note = this.tables.vocabulary_notes[card.noteId];
        const master = note ? this.tables.words_master[note.wordId] : null;
        const lemma = master?.lemma?.toLowerCase().trim() || '';
        if (deletedIds.has(cardId) || (lemma && deletedLemmas.has(lemma))) {
          delete this.tables.srs_cards[cardId];
          if (note) delete this.tables.vocabulary_notes[note.id];
        }
      }
      // Also remove by canonical noteId if lemma was passed directly
      for (const lemma of deletedLemmas) {
        const wordId = makeWordId(lemma);
        const noteId = `note_${userId}_${wordId}`;
        const cardId = `card_${noteId}`;
        if (this.tables.srs_cards[cardId]?.userId === userId) {
          delete this.tables.srs_cards[cardId];
        }
        if (this.tables.vocabulary_notes[noteId]?.userId === userId) {
          delete this.tables.vocabulary_notes[noteId];
        }
      }
    }

    // 2. Upsert non-deleted incoming words
    for (const inc of incomingWords || []) {
      if (!inc || !inc.word) continue;
      const lemma = inc.word.toLowerCase().trim();
      if (deletedIds.has(inc.id) || deletedLemmas.has(lemma)) continue;

      const wordId = makeWordId(lemma);
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

      const noteId = `note_${userId}_${wordId}`;
      const existingNote = this.tables.vocabulary_notes[noteId];
      this.tables.vocabulary_notes[noteId] = {
        id: noteId,
        userId,
        profileId: inc.profileId || userId,
        wordId,
        customTranslation: inc.translation || existingNote?.customTranslation || '',
        contextSentence: inc.contextSentence || existingNote?.contextSentence || '',
        sourceVideoTitle: inc.videoTitle || existingNote?.sourceVideoTitle || existingNote?.sourceLessonId || 'YouTube Lesson',
        sourceLessonId: inc.videoTitle || existingNote?.sourceLessonId || 'YouTube Lesson',
        sourceLessonKey: inc.sourceLessonId || existingNote?.sourceLessonKey || undefined,
        sourceYoutubeId: inc.sourceYoutubeId || existingNote?.sourceYoutubeId || undefined,
        sourceTimestampSec: typeof inc.sourceTimestampSec === 'number' ? inc.sourceTimestampSec : existingNote?.sourceTimestampSec,
        createdAt: existingNote?.createdAt || inc.savedAt || now,
        updatedAt: now
      };

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
          stability: typeof inc.stability === 'number' ? inc.stability : existingCard?.stability,
          difficulty: typeof inc.difficulty === 'number' ? inc.difficulty : existingCard?.difficulty,
          schedulerVersion: inc.schedulerVersion || existingCard?.schedulerVersion || undefined,
          usn: Math.max(incUsn, prevUsn) + 1,
          createdAt: existingCard?.createdAt || inc.savedAt || now
        };
      }
    }

    await this.scheduleSave();
    return this.getUserWords(userId);
  }

  async recordReviewLogs(userId, logs) {
    const inserted = [];
    for (const log of logs || []) {
      if (!log || typeof log.rating !== 'number') continue;
      const lemma = log.word ? String(log.word).toLowerCase().trim() : '';
      const fallbackCardId = lemma ? `card_note_${userId}_${makeWordId(lemma)}` : log.wordId;
      const cardId = this.tables.srs_cards[log.wordId]?.userId === userId ? log.wordId : fallbackCardId;
      const entry = {
        id: log.id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        cardId: cardId || log.wordId || 'unknown',
        userId,
        rating: log.rating,
        scheduledInterval: Number(log.interval || 0),
        previousInterval: Number(log.lastInterval || 0),
        easeFactor: Number(log.easeFactor || 2.5),
        reviewedAt: Number(log.reviewedAt || Date.now())
      };
      this.tables.srs_review_logs.push(entry);
      inserted.push(entry);
    }
    if (inserted.length > 0) {
      await this.scheduleSave();
    }
    return inserted.length;
  }

  async getUserLingq(userId) {
    return this.tables.user_lingq[userId] || {};
  }

  async saveUserLingq(userId, incomingStatuses) {
    const current = this.tables.user_lingq[userId] || {};
    const merged = { ...current, ...(incomingStatuses || {}) };
    this.tables.user_lingq[userId] = merged;
    await this.scheduleSave();
    return merged;
  }

  async getUserLessons(userId) {
    const list = this.tables.user_custom_lessons[userId] || [];
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async syncUserLessons(userId, incomingLessons = [], deletedLessonIds = []) {
    const delSet = new Set((deletedLessonIds || []).map(String));
    const current = (this.tables.user_custom_lessons[userId] || []).filter(l => !delSet.has(l.id));
    const map = new Map(current.map(l => [l.id, l]));
    for (const l of incomingLessons || []) {
      if (l && l.id && l.title && !delSet.has(l.id)) {
        map.set(l.id, { ...l, isCustom: true });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    this.tables.user_custom_lessons[userId] = merged;
    await this.scheduleSave();
    return merged;
  }

  async getMetrics() {
    return {
      totalUsers: Object.keys(this.tables.users).length,
      totalWordsMaster: Object.keys(this.tables.words_master).length,
      totalVocabularyNotes: Object.keys(this.tables.vocabulary_notes).length,
      totalSRSCards: Object.keys(this.tables.srs_cards).length,
      totalReviewLogs: this.tables.srs_review_logs.length,
      storageEngine: 'local-json',
      lastUpdatedAt: this.tables.meta.lastUpdatedAt
    };
  }

  async findMasterWord(lemma) {
    const clean = String(lemma || '').toLowerCase().trim();
    if (!clean) return null;
    const wordId = makeWordId(clean);
    return this.tables.words_master[wordId] || null;
  }

  async upsertMasterWord(entry) {
    const lemma = String(entry?.word || entry?.lemma || '').toLowerCase().trim();
    if (!lemma) return null;
    const wordId = makeWordId(lemma);
    const existing = this.tables.words_master[wordId];
    this.tables.words_master[wordId] = {
      id: wordId,
      lemma,
      phonetic: entry.phonetic || existing?.phonetic || `/${lemma}/`,
      partOfSpeech: entry.partOfSpeech || existing?.partOfSpeech || 'vocabulary',
      defaultTranslationVi: entry.translation || entry.defaultTranslationVi || existing?.defaultTranslationVi || '',
      definitionEn: entry.definitionEn || existing?.definitionEn || '',
      exampleEn: entry.exampleEn || existing?.exampleEn || '',
      synonyms: Array.isArray(entry.synonyms) ? entry.synonyms : (existing?.synonyms || []),
      cefrLevel: entry.cefrLevel || existing?.cefrLevel || 'B1',
      createdAt: existing?.createdAt || Date.now()
    };
    await this.scheduleSave();
    return this.tables.words_master[wordId];
  }

  async getUserLearningState(userId) {
    return this.tables.user_learning_state[userId] || {};
  }

  async saveUserLearningState(userId, patchState = {}) {
    const prev = this.tables.user_learning_state[userId] || {};
    const next = { ...prev, ...patchState, updatedAt: Date.now() };
    this.tables.user_learning_state[userId] = next;
    await this.scheduleSave();
    return next;
  }

  async getAiUsageCount(userId, dateKey) {
    return Number(this.tables.ai_usage?.[`${userId}:${dateKey}`] || 0);
  }

  async incrementAiUsage(userId, dateKey) {
    const k = `${userId}:${dateKey}`;
    const next = Number(this.tables.ai_usage?.[k] || 0) + 1;
    this.tables.ai_usage[k] = next;
    await this.scheduleSave();
    return next;
  }

  async close() {
    await this.writeQueue;
  }
}

/**
 * Production PostgreSQL 3NF Adapter using `pg` Pool & parameterized transactions.
 */
class PostgresDbAdapter {
  constructor(connectionString) {
    const cleaned = String(connectionString || '').replace(/\s+/g, '');
    const isLocal = cleaned.includes('localhost') || cleaned.includes('127.0.0.1');
    let normalizedUrl = cleaned;
    if (!isLocal) {
      try {
        const parsed = new URL(cleaned);
        // pg-connection-string treats ?sslmode=require as verify-full and overrides ssl.rejectUnauthorized,
        // which rejects private CA certs used by managed providers like Aiven.
        parsed.searchParams.delete('sslmode');
        normalizedUrl = parsed.toString();
      } catch {
        normalizedUrl = cleaned;
      }
    }
    this.pool = new Pool({
      connectionString: normalizedUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000
    });
  }

  async init() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(128) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          salt VARCHAR(128) NOT NULL,
          name VARCHAR(150) NOT NULL,
          avatar_url TEXT,
          role VARCHAR(20) NOT NULL DEFAULT 'user',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          token_version INTEGER NOT NULL DEFAULT 1,
          google_id VARCHAR(128),
          provider VARCHAR(30),
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );
        ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(128);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(30);

        CREATE TABLE IF NOT EXISTS user_profiles (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(150) NOT NULL,
          avatar_url TEXT,
          last_active_at BIGINT NOT NULL,
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS words_master (
          id VARCHAR(128) PRIMARY KEY,
          lemma VARCHAR(150) NOT NULL UNIQUE,
          phonetic VARCHAR(150),
          part_of_speech VARCHAR(60),
          default_translation_vi TEXT NOT NULL,
          definition_en TEXT,
          cefr_level VARCHAR(10) DEFAULT 'B1',
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_vocabulary_notes (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          profile_id VARCHAR(128) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          word_id VARCHAR(128) NOT NULL REFERENCES words_master(id) ON DELETE RESTRICT,
          custom_translation TEXT,
          context_sentence TEXT,
          source_lesson_id VARCHAR(255),
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS srs_cards (
          id VARCHAR(255) PRIMARY KEY,
          note_id VARCHAR(255) NOT NULL REFERENCES user_vocabulary_notes(id) ON DELETE CASCADE,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          profile_id VARCHAR(128) NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          card_type VARCHAR(20) NOT NULL DEFAULT 'recognition',
          state VARCHAR(20) NOT NULL DEFAULT 'new',
          ease_factor FLOAT NOT NULL DEFAULT 2.50,
          interval_days INTEGER NOT NULL DEFAULT 0,
          repetitions INTEGER NOT NULL DEFAULT 0,
          lapses INTEGER NOT NULL DEFAULT 0,
          due_at BIGINT NOT NULL,
          last_reviewed_at BIGINT,
          usn INTEGER NOT NULL DEFAULT 1,
          created_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS srs_review_logs (
          id VARCHAR(128) PRIMARY KEY,
          card_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating SMALLINT NOT NULL,
          scheduled_interval INTEGER NOT NULL,
          previous_interval INTEGER NOT NULL,
          ease_factor FLOAT NOT NULL,
          reviewed_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_lingq_matrix (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          word VARCHAR(150) NOT NULL,
          status SMALLINT NOT NULL DEFAULT 0,
          updated_at BIGINT NOT NULL,
          UNIQUE (user_id, word)
        );

        CREATE TABLE IF NOT EXISTS user_custom_lessons (
          id VARCHAR(150) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          youtube_id VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          channel VARCHAR(150),
          level VARCHAR(10) DEFAULT 'B1',
          duration VARCHAR(20),
          duration_sec INTEGER DEFAULT 0,
          subtitles_json TEXT NOT NULL,
          payload_json TEXT,
          created_at BIGINT NOT NULL
        );

        ALTER TABLE words_master ADD COLUMN IF NOT EXISTS example_en TEXT;
        ALTER TABLE words_master ADD COLUMN IF NOT EXISTS synonyms_json TEXT;
        ALTER TABLE user_vocabulary_notes ADD COLUMN IF NOT EXISTS source_video_title VARCHAR(255);
        ALTER TABLE user_vocabulary_notes ADD COLUMN IF NOT EXISTS source_youtube_id VARCHAR(64);
        ALTER TABLE user_vocabulary_notes ADD COLUMN IF NOT EXISTS source_timestamp_sec FLOAT;
        ALTER TABLE srs_cards ADD COLUMN IF NOT EXISTS stability FLOAT;
        ALTER TABLE srs_cards ADD COLUMN IF NOT EXISTS difficulty FLOAT;
        ALTER TABLE srs_cards ADD COLUMN IF NOT EXISTS scheduler_version VARCHAR(16);

        CREATE TABLE IF NOT EXISTS user_learning_state (
          user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          state_json TEXT NOT NULL DEFAULT '{}',
          updated_at BIGINT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_ai_daily_usage (
          id VARCHAR(180) PRIMARY KEY,
          user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date_key VARCHAR(20) NOT NULL,
          turns_count INTEGER NOT NULL DEFAULT 0,
          updated_at BIGINT NOT NULL
        );
      `);
      console.info('[AURA PostgresDB] Schema verified and connection pool ready.');
    } finally {
      client.release();
    }
  }

  mapRowToUser(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      hash: row.password_hash,
      salt: row.salt,
      name: row.name,
      avatar: row.avatar_url,
      role: row.role || 'user',
      status: row.status || 'active',
      tokenVersion: Number(row.token_version || 1),
      googleId: row.google_id || undefined,
      provider: row.provider || undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    };
  }

  async findUserByEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    return this.mapRowToUser(res.rows[0]);
  }

  async getUser(userId) {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
    return this.mapRowToUser(res.rows[0]);
  }

  async getAllUsers() {
    const res = await this.pool.query(`
      SELECT u.*, COUNT(c.id)::int AS card_count
      FROM users u
      LEFT JOIN srs_cards c ON c.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      avatar: r.avatar_url,
      role: r.role || 'user',
      status: r.status || 'active',
      permissions: ROLE_PERMISSIONS[r.role || 'user'] || ROLE_PERMISSIONS.user,
      createdAt: Number(r.created_at),
      cardCount: Number(r.card_count || 0)
    }));
  }

  async saveUser(user) {
    const now = Date.now();
    const role = user.role || 'user';
    const status = user.status || 'active';
    const tokenVersion = user.tokenVersion || 1;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO users (id, email, password_hash, salt, name, avatar_url, role, status, token_version, google_id, provider, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          token_version = EXCLUDED.token_version,
          updated_at = EXCLUDED.updated_at
      `, [
        user.id,
        user.email.trim().toLowerCase(),
        user.hash,
        user.salt,
        user.name,
        user.avatar || null,
        role,
        status,
        tokenVersion,
        user.googleId || null,
        user.provider || null,
        user.createdAt || now,
        now
      ]);

      await client.query(`
        INSERT INTO user_profiles (id, user_id, name, avatar_url, last_active_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.id, user.name, user.avatar || null, now, now]);

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.getUser(user.id);
  }

  async updateUserRole(userId, newRole) {
    if (!ROLE_PERMISSIONS[newRole]) {
      throw new Error(`Invalid role: ${newRole}. Must be one of: guest, user, pro, admin`);
    }
    const res = await this.pool.query(
      'UPDATE users SET role = $1, token_version = token_version + 1, updated_at = $2 WHERE id = $3 RETURNING *',
      [newRole, Date.now(), userId]
    );
    return this.mapRowToUser(res.rows[0]);
  }

  async incrementTokenVersion(userId) {
    const res = await this.pool.query(
      'UPDATE users SET token_version = token_version + 1, updated_at = $1 WHERE id = $2 RETURNING *',
      [Date.now(), userId]
    );
    return this.mapRowToUser(res.rows[0]);
  }

  async getUserWords(userId) {
    const res = await this.pool.query(`
      SELECT
        c.id, c.state, c.ease_factor, c.interval_days, c.repetitions, c.lapses,
        c.due_at, c.last_reviewed_at, c.stability, c.difficulty, c.scheduler_version, c.usn, c.created_at, c.profile_id,
        n.custom_translation, n.context_sentence, n.source_lesson_id, n.source_video_title, n.source_youtube_id, n.source_timestamp_sec,
        w.lemma, w.phonetic, w.part_of_speech, w.default_translation_vi, w.definition_en
      FROM srs_cards c
      JOIN user_vocabulary_notes n ON n.id = c.note_id
      JOIN words_master w ON w.id = n.word_id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    return res.rows.map(r => ({
      id: r.id,
      word: r.lemma,
      phonetic: r.phonetic || '',
      partOfSpeech: r.part_of_speech || '',
      translation: r.custom_translation || r.default_translation_vi || '',
      definitionEn: r.definition_en || '',
      contextSentence: r.context_sentence || '',
      videoTitle: r.source_video_title || r.source_lesson_id || 'Lesson',
      sourceLessonId: r.source_lesson_id || undefined,
      sourceYoutubeId: r.source_youtube_id || undefined,
      sourceTimestampSec: r.source_timestamp_sec !== null && r.source_timestamp_sec !== undefined ? Number(r.source_timestamp_sec) : undefined,
      savedAt: Number(r.created_at),
      easeFactor: Number(r.ease_factor),
      interval: Number(r.interval_days),
      repetitions: Number(r.repetitions),
      lapses: Number(r.lapses),
      state: r.state,
      dueAt: Number(r.due_at),
      lastReviewedAt: r.last_reviewed_at ? Number(r.last_reviewed_at) : Number(r.created_at),
      stability: r.stability !== null && r.stability !== undefined ? Number(r.stability) : undefined,
      difficulty: r.difficulty !== null && r.difficulty !== undefined ? Number(r.difficulty) : undefined,
      schedulerVersion: r.scheduler_version || undefined,
      usn: Number(r.usn),
      isDirty: false,
      profileId: r.profile_id
    }));
  }

  async saveUserWords(userId, incomingWords, deletedWords = []) {
    const now = Date.now();
    const { deletedIds, deletedLemmas } = normalizeDeletedList(deletedWords);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (deletedIds.size > 0) {
        await client.query(
          `DELETE FROM user_vocabulary_notes
           WHERE user_id = $1 AND id IN (SELECT note_id FROM srs_cards WHERE user_id = $1 AND id = ANY($2::text[]))`,
          [userId, Array.from(deletedIds)]
        );
      }
      if (deletedLemmas.size > 0) {
        const delWordIds = Array.from(deletedLemmas).map(makeWordId);
        await client.query(
          'DELETE FROM user_vocabulary_notes WHERE user_id = $1 AND word_id = ANY($2::text[])',
          [userId, delWordIds]
        );
      }

      for (const inc of incomingWords || []) {
        if (!inc || !inc.word) continue;
        const lemma = inc.word.toLowerCase().trim();
        if (deletedIds.has(inc.id) || deletedLemmas.has(lemma)) continue;

        const wordId = makeWordId(lemma);
        const scopedProfileId = makeScopedProfileId(userId, inc.profileId);

        await client.query(`
          INSERT INTO user_profiles (id, user_id, name, last_active_at, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [scopedProfileId, userId, scopedProfileId === userId ? 'Default' : inc.profileId, now, now]);

        await client.query(`
          INSERT INTO words_master (id, lemma, phonetic, part_of_speech, default_translation_vi, definition_en, cefr_level, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'B1', $7)
          ON CONFLICT (lemma) DO NOTHING
        `, [wordId, lemma, inc.phonetic || `/${lemma}/`, inc.partOfSpeech || 'n.', inc.translation || '', inc.definitionEn || '', now]);

        const noteId = `note_${userId}_${wordId}`;
        await client.query(`
          INSERT INTO user_vocabulary_notes (id, user_id, profile_id, word_id, custom_translation, context_sentence, source_lesson_id, source_video_title, source_youtube_id, source_timestamp_sec, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            custom_translation = COALESCE(NULLIF(EXCLUDED.custom_translation, ''), user_vocabulary_notes.custom_translation),
            context_sentence = COALESCE(NULLIF(EXCLUDED.context_sentence, ''), user_vocabulary_notes.context_sentence),
            source_lesson_id = COALESCE(NULLIF(EXCLUDED.source_lesson_id, ''), user_vocabulary_notes.source_lesson_id),
            source_video_title = COALESCE(NULLIF(EXCLUDED.source_video_title, ''), user_vocabulary_notes.source_video_title),
            source_youtube_id = COALESCE(NULLIF(EXCLUDED.source_youtube_id, ''), user_vocabulary_notes.source_youtube_id),
            source_timestamp_sec = COALESCE(EXCLUDED.source_timestamp_sec, user_vocabulary_notes.source_timestamp_sec),
            updated_at = EXCLUDED.updated_at
        `, [
          noteId,
          userId,
          scopedProfileId,
          wordId,
          inc.translation || '',
          inc.contextSentence || '',
          inc.sourceLessonId || inc.videoTitle || 'YouTube Lesson',
          inc.videoTitle || 'YouTube Lesson',
          inc.sourceYoutubeId || null,
          typeof inc.sourceTimestampSec === 'number' ? inc.sourceTimestampSec : null,
          inc.savedAt || now,
          now
        ]);

        const cardId = `card_${noteId}`;
        const incUsn = Number(inc.usn || 0);
        await client.query(`
          INSERT INTO srs_cards (id, note_id, user_id, profile_id, card_type, state, ease_factor, interval_days, repetitions, lapses, due_at, last_reviewed_at, stability, difficulty, scheduler_version, usn, created_at)
          VALUES ($1, $2, $3, $4, 'recognition', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (id) DO UPDATE SET
            state = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.state ELSE srs_cards.state END,
            ease_factor = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.ease_factor ELSE srs_cards.ease_factor END,
            interval_days = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.interval_days ELSE srs_cards.interval_days END,
            repetitions = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.repetitions ELSE srs_cards.repetitions END,
            lapses = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.lapses ELSE srs_cards.lapses END,
            due_at = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.due_at ELSE srs_cards.due_at END,
            last_reviewed_at = CASE WHEN $15 >= srs_cards.usn THEN EXCLUDED.last_reviewed_at ELSE srs_cards.last_reviewed_at END,
            stability = CASE WHEN $15 >= srs_cards.usn THEN COALESCE(EXCLUDED.stability, srs_cards.stability) ELSE srs_cards.stability END,
            difficulty = CASE WHEN $15 >= srs_cards.usn THEN COALESCE(EXCLUDED.difficulty, srs_cards.difficulty) ELSE srs_cards.difficulty END,
            scheduler_version = CASE WHEN $15 >= srs_cards.usn THEN COALESCE(EXCLUDED.scheduler_version, srs_cards.scheduler_version) ELSE srs_cards.scheduler_version END,
            usn = GREATEST(srs_cards.usn, $15) + 1
        `, [
          cardId,
          noteId,
          userId,
          scopedProfileId,
          inc.state || 'new',
          Number(inc.easeFactor || 2.5),
          Number(inc.interval || 0),
          Number(inc.repetitions || 0),
          Number(inc.lapses || 0),
          Number(inc.dueAt || now),
          Number(inc.lastReviewedAt || now),
          typeof inc.stability === 'number' ? inc.stability : null,
          typeof inc.difficulty === 'number' ? inc.difficulty : null,
          inc.schedulerVersion || null,
          incUsn + 1,
          inc.savedAt || now
        ]);
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return this.getUserWords(userId);
  }

  async recordReviewLogs(userId, logs) {
    let count = 0;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const log of logs || []) {
        if (!log || typeof log.rating !== 'number') continue;
        const lemma = log.word ? String(log.word).toLowerCase().trim() : '';
        const canonicalCardId = lemma ? `card_note_${userId}_${makeWordId(lemma)}` : (log.wordId || 'unknown');
        const id = log.id || `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await client.query(`
          INSERT INTO srs_review_logs (id, card_id, user_id, rating, scheduled_interval, previous_interval, ease_factor, reviewed_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          id,
          canonicalCardId,
          userId,
          Number(log.rating),
          Number(log.interval || 0),
          Number(log.lastInterval || 0),
          Number(log.easeFactor || 2.5),
          Number(log.reviewedAt || Date.now())
        ]);
        count++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return count;
  }

  async getUserLingq(userId) {
    const res = await this.pool.query('SELECT word, status FROM user_lingq_matrix WHERE user_id = $1', [userId]);
    const out = {};
    for (const r of res.rows) {
      out[r.word] = Number(r.status);
    }
    return out;
  }

  async saveUserLingq(userId, incomingStatuses) {
    const now = Date.now();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const [word, status] of Object.entries(incomingStatuses || {})) {
        const clean = word.toLowerCase().trim();
        if (!clean) continue;
        const id = `lq_${userId}_${Buffer.from(clean).toString('base64url')}`;
        await client.query(`
          INSERT INTO user_lingq_matrix (id, user_id, word, status, updated_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, word) DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `, [id, userId, clean, Number(status), now]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.getUserLingq(userId);
  }

  async getUserLessons(userId) {
    const res = await this.pool.query(
      'SELECT * FROM user_custom_lessons WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map(r => {
      if (r.payload_json) {
        try {
          return JSON.parse(r.payload_json);
        } catch {}
      }
      return {
        id: r.id,
        youtubeId: r.youtube_id,
        title: r.title,
        channel: r.channel || 'YouTube',
        level: r.level || 'B1',
        duration: r.duration || '0:00',
        durationSec: Number(r.duration_sec || 0),
        subtitles: JSON.parse(r.subtitles_json || '[]'),
        quizzes: [],
        isCustom: true,
        createdAt: Number(r.created_at)
      };
    });
  }

  async syncUserLessons(userId, incomingLessons = [], deletedLessonIds = []) {
    const now = Date.now();
    const delIds = (deletedLessonIds || []).map(String);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (delIds.length > 0) {
        await client.query(
          'DELETE FROM user_custom_lessons WHERE user_id = $1 AND id = ANY($2::text[])',
          [userId, delIds]
        );
      }
      for (const l of incomingLessons || []) {
        if (!l || !l.id || !l.title || delIds.includes(l.id)) continue;
        const lessonObj = { ...l, isCustom: true, createdAt: l.createdAt || now };
        await client.query(`
          INSERT INTO user_custom_lessons (id, user_id, youtube_id, title, channel, level, duration, duration_sec, subtitles_json, payload_json, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            subtitles_json = EXCLUDED.subtitles_json,
            payload_json = EXCLUDED.payload_json
          WHERE user_custom_lessons.user_id = EXCLUDED.user_id
        `, [
          lessonObj.id,
          userId,
          lessonObj.youtubeId || '',
          lessonObj.title,
          lessonObj.channel || '',
          lessonObj.level || 'B1',
          lessonObj.duration || '0:00',
          Number(lessonObj.durationSec || 0),
          JSON.stringify(lessonObj.subtitles || []),
          JSON.stringify(lessonObj),
          Number(lessonObj.createdAt || now)
        ]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.getUserLessons(userId);
  }

  async getMetrics() {
    const res = await this.pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM words_master) AS total_words_master,
        (SELECT COUNT(*)::int FROM user_vocabulary_notes) AS total_notes,
        (SELECT COUNT(*)::int FROM srs_cards) AS total_cards,
        (SELECT COUNT(*)::int FROM srs_review_logs) AS total_logs
    `);
    const r = res.rows[0] || {};
    return {
      totalUsers: Number(r.total_users || 0),
      totalWordsMaster: Number(r.total_words_master || 0),
      totalVocabularyNotes: Number(r.total_notes || 0),
      totalSRSCards: Number(r.total_cards || 0),
      totalReviewLogs: Number(r.total_logs || 0),
      storageEngine: 'postgresql',
      lastUpdatedAt: Date.now()
    };
  }

  async findMasterWord(lemma) {
    const clean = String(lemma || '').toLowerCase().trim();
    if (!clean) return null;
    const res = await this.pool.query('SELECT * FROM words_master WHERE lemma = $1 LIMIT 1', [clean]);
    const r = res.rows[0];
    if (!r) return null;
    let synonyms = [];
    try {
      if (r.synonyms_json) synonyms = JSON.parse(r.synonyms_json);
    } catch {}
    return {
      id: r.id,
      lemma: r.lemma,
      phonetic: r.phonetic || '',
      partOfSpeech: r.part_of_speech || 'vocabulary',
      defaultTranslationVi: r.default_translation_vi || '',
      definitionEn: r.definition_en || '',
      exampleEn: r.example_en || '',
      synonyms
    };
  }

  async upsertMasterWord(entry) {
    const lemma = String(entry?.word || entry?.lemma || '').toLowerCase().trim();
    if (!lemma) return null;
    const wordId = makeWordId(lemma);
    const now = Date.now();
    await this.pool.query(`
      INSERT INTO words_master (id, lemma, phonetic, part_of_speech, default_translation_vi, definition_en, example_en, synonyms_json, cefr_level, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'B1', $9)
      ON CONFLICT (lemma) DO UPDATE SET
        phonetic = COALESCE(NULLIF(EXCLUDED.phonetic, ''), words_master.phonetic),
        part_of_speech = COALESCE(NULLIF(EXCLUDED.part_of_speech, ''), words_master.part_of_speech),
        default_translation_vi = COALESCE(NULLIF(EXCLUDED.default_translation_vi, ''), words_master.default_translation_vi),
        definition_en = COALESCE(NULLIF(EXCLUDED.definition_en, ''), words_master.definition_en),
        example_en = COALESCE(NULLIF(EXCLUDED.example_en, ''), words_master.example_en),
        synonyms_json = COALESCE(EXCLUDED.synonyms_json, words_master.synonyms_json)
    `, [
      wordId,
      lemma,
      entry.phonetic || `/${lemma}/`,
      entry.partOfSpeech || 'vocabulary',
      entry.translation || entry.defaultTranslationVi || '',
      entry.definitionEn || '',
      entry.exampleEn || '',
      JSON.stringify(Array.isArray(entry.synonyms) ? entry.synonyms : []),
      now
    ]);
    return this.findMasterWord(lemma);
  }

  async getUserLearningState(userId) {
    const res = await this.pool.query('SELECT state_json FROM user_learning_state WHERE user_id = $1 LIMIT 1', [userId]);
    if (!res.rows[0]?.state_json) return {};
    try {
      return JSON.parse(res.rows[0].state_json);
    } catch {
      return {};
    }
  }

  async saveUserLearningState(userId, patchState = {}) {
    const prev = await this.getUserLearningState(userId);
    const next = { ...prev, ...patchState, updatedAt: Date.now() };
    await this.pool.query(`
      INSERT INTO user_learning_state (user_id, state_json, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        state_json = EXCLUDED.state_json,
        updated_at = EXCLUDED.updated_at
    `, [userId, JSON.stringify(next), next.updatedAt]);
    return next;
  }

  async getAiUsageCount(userId, dateKey) {
    const id = `${userId}:${dateKey}`;
    const res = await this.pool.query('SELECT turns_count FROM user_ai_daily_usage WHERE id = $1 LIMIT 1', [id]);
    return Number(res.rows[0]?.turns_count || 0);
  }

  async incrementAiUsage(userId, dateKey) {
    const id = `${userId}:${dateKey}`;
    const res = await this.pool.query(`
      INSERT INTO user_ai_daily_usage (id, user_id, date_key, turns_count, updated_at)
      VALUES ($1, $2, $3, 1, $4)
      ON CONFLICT (id) DO UPDATE SET
        turns_count = user_ai_daily_usage.turns_count + 1,
        updated_at = EXCLUDED.updated_at
      RETURNING turns_count
    `, [id, userId, dateKey, Date.now()]);
    return Number(res.rows[0]?.turns_count || 1);
  }

  async close() {
    await this.pool.end();
  }
}

export async function createDbAdapter(options = {}) {
  const databaseUrl = options.databaseUrl ?? (options.dbPath ? null : process.env.DATABASE_URL);
  if (databaseUrl && !options.dbPath) {
    const pgAdapter = new PostgresDbAdapter(databaseUrl);
    await pgAdapter.init();
    return pgAdapter;
  }

  const defaultPath = path.join(__dirname, '..', 'data', 'aura_cloud_db.json');
  const resolvedPath = options.dbPath || process.env.AURA_DB_PATH || defaultPath;
  if (process.env.NODE_ENV === 'production' && !databaseUrl) {
    console.warn('[SECURITY/DATA WARNING] DATABASE_URL is not set in production! Falling back to local JSON storage which is ephemeral on Render free tier.');
  }
  const localAdapter = new LocalFileDbAdapter(resolvedPath);
  await localAdapter.init();
  return localAdapter;
}
