/**
 * Automated Security, Multi-Tenant Isolation & RBAC Verification Suite
 * Runs completely isolated in os.tmpdir() without polluting data/aura_cloud_db.json.
 */

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createAuthAndSyncHandler } from '../api/auth-sync.js';
import youtubeCaptionHandler from '../api/youtube-captions.js';

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-security-test-'));
const testDbPath = path.join(testDir, 'test_db.json');

// Inject deterministic test Google verifier that rejects unverified/fake credentials
async function mockVerifyGoogle({ credential, accessToken }) {
  if (credential === 'VALID_GOOGLE_ADMIN_CREDENTIAL') {
    return {
      email: 'admin@aura-learning.com',
      emailVerified: true,
      name: 'Official Google Admin',
      avatar: 'https://example.com/admin.png',
      googleId: 'g-admin-1'
    };
  }
  if (accessToken === 'VALID_GOOGLE_USER_TOKEN') {
    return {
      email: 'google.learner@gmail.com',
      emailVerified: true,
      name: 'Google Learner',
      avatar: 'https://example.com/user.png',
      googleId: 'g-user-1'
    };
  }
  const err = new Error('Google Token không hợp lệ hoặc bị từ chối.');
  err.statusCode = 401;
  throw err;
}

process.env.ADMIN_EMAIL = 'admin@aura-learning.com';

let upstreamDictHits = 0;
const authModule = createAuthAndSyncHandler({
  dbPath: testDbPath,
  jwtSecret: 'test-only-super-secret-key-at-least-32-chars',
  verifyGoogleCredentials: mockVerifyGoogle,
  authRateLimitMax: 200,
  dictRateLimitMax: 200,
  fetchDictionaryEntry: async (word) => {
    upstreamDictHits += 1;
    const isPhrase = word.includes(' ');
    return {
      word,
      phonetic: isPhrase ? '' : `/${word}/`,
      partOfSpeech: isPhrase ? 'cụm từ (phrase)' : 'tính từ (adj)',
      translation: isPhrase ? 'coi điều gì là hiển nhiên' : 'phổ biến khắp nơi',
      definitionEn: isPhrase
        ? 'to fail to properly appreciate someone or something'
        : 'present, appearing, or found everywhere',
      exampleEn: isPhrase
        ? 'Never take it for granted when someone helps you.'
        : 'Smartphones have become ubiquitous.',
      synonyms: isPhrase ? [] : ['omnipresent', 'pervasive']
    };
  },
  fetchBatchTranslation: async (texts) => texts.map(t => `[VI] ${t}`),
  aiResponder: async ({ personaId, userMessage }) => ({
    reply: `[MockGemini:${personaId}] Thanks for saying: ${userMessage}`,
    nativeRephrase: `Could you clarify "${userMessage}"?`,
    grammarTip: 'Dùng cấu trúc lịch sự sẽ tự nhiên hơn.'
  }),
  aiExplainResponder: async ({ phrase, sentence }) => ({
    meaningVi: `Nghĩa ngữ cảnh của "${phrase}"`,
    nuance: `Diễn đạt tự nhiên trong câu: ${sentence}`,
    grammarNote: 'Cụm từ cố định (idiom/collocation).',
    examples: [
      { en: `Don't ${phrase}.`, vi: 'Đừng coi điều đó là hiển nhiên.' }
    ]
  }),
  aiQuizResponder: async ({ subtitles }) =>
    Array.from({ length: 5 }, (_, idx) => ({
      id: `mock-quiz-${idx + 1}`,
      question: `Question ${idx + 1} based on: ${subtitles[idx % subtitles.length].text}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: idx % 4,
      explanation: `Giải thích câu ${idx + 1}`
    })),
  aiScenarioResponder: async ({ topic, level, category }) => ({
    id: `mock-sc-${Date.now()}`,
    level,
    title: topic,
    category,
    description: `Mock scenario for ${topic}`,
    icon: '🎯',
    targetGoal: `Discuss ${topic} fluently at ${level}`,
    turns: Array.from({ length: 6 }, (_, idx) => ({
      id: `mt-${idx + 1}`,
      speaker: idx % 2 === 0 ? 'AI' : 'User',
      speakerName: idx % 2 === 0 ? 'Alex' : 'Bạn',
      avatar: 'https://example.com/avatar.png',
      text: `Turn ${idx + 1} about ${topic}`,
      translation: `Lượt ${idx + 1} về ${topic}`,
      hintPrompt: idx % 2 === 1 ? `Trả lời lượt ${idx + 1}` : undefined,
      expectedKeywords: ['turn', 'topic']
    }))
  })
});

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/youtube-captions')) {
    return youtubeCaptionHandler(req, res);
  }
  return authModule.handler(req, res, url.pathname);
});

async function run() {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[TEST SERVER] Running isolated in ${testDir} on ${baseUrl}`);

  async function api(route, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  const ts = Date.now();
  const userAEmail = `alice_${ts}@test.com`;
  const userBEmail = `bob_${ts}@test.com`;
  const attackerAuraEmail = `attacker_${ts}@aura.ai`;

  // 1. Register User A and User B
  const regA = await api('/api/auth/register', 'POST', { name: 'Alice', email: userAEmail, password: 'password123' });
  assert.equal(regA.status, 201);
  assert.equal(regA.data.user.role, 'user');
  const tokenA = regA.data.token;
  const userAId = regA.data.user.id;
  console.log('✅ TEST 1 PASSED: User A registered as standard user');

  const regB = await api('/api/auth/register', 'POST', { name: 'Bob', email: userBEmail, password: 'password123' });
  assert.equal(regB.status, 201);
  const tokenB = regB.data.token;

  // 2. User A saves two words & syncs
  const syncA = await api('/api/sync/words', 'POST', {
    words: [
      { id: `word-1-${ts}`, word: 'serendipity', translation: 'sự tình cờ may mắn', usn: 1 },
      { id: `word-2-${ts}`, word: 'ephemeral', translation: 'ngắn ngủi', usn: 1 }
    ]
  }, tokenA);
  assert.equal(syncA.status, 200);
  assert.equal(syncA.data.count, 2);
  console.log('✅ TEST 2 PASSED: User A synced 2 words');

  // 3. Multi-tenant Isolation: User B sees 0 words
  const syncB = await api('/api/sync/words', 'GET', null, tokenB);
  assert.equal(syncB.status, 200);
  assert.equal(syncB.data.count, 0);
  console.log('✅ TEST 3 PASSED: User B strictly isolated (0 words)');

  // 4. Delete Word Sync Persistence (anti-resurrection)
  const delA = await api('/api/sync/words', 'POST', {
    words: syncA.data.words.filter(w => w.word !== 'ephemeral'),
    deletedWords: [{ id: `word-2-${ts}`, word: 'ephemeral' }]
  }, tokenA);
  assert.equal(delA.status, 200);
  assert.equal(delA.data.count, 1);
  const verifyAfterDel = await api('/api/sync/words', 'GET', null, tokenA);
  assert.equal(verifyAfterDel.data.count, 1);
  assert.equal(verifyAfterDel.data.words[0].word, 'serendipity');
  console.log('✅ TEST 4 PASSED: Deleted word "ephemeral" removed permanently on cloud sync');

  // 5. Review log & Custom Lesson Sync
  const revRes = await api('/api/sync/reviews', 'POST', {
    review: { wordId: verifyAfterDel.data.words[0].id, word: 'serendipity', rating: 3, interval: 6, lastInterval: 1, easeFactor: 2.5 }
  }, tokenA);
  assert.equal(revRes.status, 200);
  assert.equal(revRes.data.recorded, 1);

  const lessonRes = await api('/api/sync/lessons', 'POST', {
    lessons: [{ id: `lesson-custom-${ts}`, youtubeId: 'dQw4w9WgXcQ', title: 'Custom Lesson A', subtitles: [] }]
  }, tokenA);
  assert.equal(lessonRes.status, 200);
  assert.equal(lessonRes.data.count, 1);
  const lessonGetB = await api('/api/sync/lessons', 'GET', null, tokenB);
  assert.equal(lessonGetB.data.count, 0);
  console.log('✅ TEST 5 PASSED: Review logs & Custom Lessons synced and isolated per user');

  // 6. Security: @aura.ai email registration must NOT escalate to admin
  const regAttacker = await api('/api/auth/register', 'POST', { name: 'Attacker', email: attackerAuraEmail, password: 'password123' });
  assert.equal(regAttacker.status, 201);
  assert.equal(regAttacker.data.user.role, 'user', 'Registering with @aura.ai must NOT grant admin');
  const attackerAdminTry = await api('/api/admin/users', 'GET', null, regAttacker.data.token);
  assert.equal(attackerAdminTry.status, 403);
  console.log('✅ TEST 6 PASSED: @aura.ai domain auto-admin privilege escalation blocked');

  // 7. Security: Spoofed Google email without token & unsigned fake JWT MUST fail
  const spoofEmailRes = await api('/api/auth/google', 'POST', { email: 'admin@aura-learning.com', name: 'Fake Admin' });
  assert.equal(spoofEmailRes.status, 401);
  const fakeJwtPayload = Buffer.from(JSON.stringify({ email: 'admin@aura-learning.com', email_verified: true })).toString('base64url');
  const spoofJwtRes = await api('/api/auth/google', 'POST', { credential: `eyJhbGciOiJSUzI1NiJ9.${fakeJwtPayload}.invalidsig` });
  assert.equal(spoofJwtRes.status, 401);
  console.log('✅ TEST 7 PASSED: Spoofed Google email and forged JWT rejected with 401');

  // 8. Verified Google Admin login & Metrics contract check
  const adminLogin = await api('/api/auth/google', 'POST', { credential: 'VALID_GOOGLE_ADMIN_CREDENTIAL' });
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.data.user.role, 'admin');
  const tokenAdmin = adminLogin.data.token;

  const metricsRes = await api('/api/admin/metrics', 'GET', null, tokenAdmin);
  assert.equal(metricsRes.status, 200);
  assert.equal(typeof metricsRes.data.metrics.totalVocabularyNotes, 'number');
  assert.equal(metricsRes.data.metrics.totalVocabularyNotes, 1);
  assert.equal(metricsRes.data.metrics.totalReviewLogs, 1);

  const usersRes = await api('/api/admin/users', 'GET', null, tokenAdmin);
  assert.equal(usersRes.status, 200);
  assert.ok('cardCount' in usersRes.data.users[0]);
  console.log('✅ TEST 8 PASSED: Verified Admin Google auth, RBAC users & totalVocabularyNotes/cardCount contracts verified');

  // 9. Role update bumps tokenVersion -> old user token invalidated; Logout revokes token
  const promoteRes = await api('/api/admin/users/role', 'POST', { targetUserId: userAId, newRole: 'pro' }, tokenAdmin);
  assert.equal(promoteRes.status, 200);
  assert.equal(promoteRes.data.user.role, 'pro');

  const staleTokenMe = await api('/api/auth/me', 'GET', null, tokenA);
  assert.equal(staleTokenMe.status, 401, 'Token minted before role change must be revoked');

  const reLoginA = await api('/api/auth/login', 'POST', { email: userAEmail, password: 'password123' });
  assert.equal(reLoginA.status, 200);
  assert.equal(reLoginA.data.user.role, 'pro');
  const logoutRes = await api('/api/auth/logout', 'POST', {}, reLoginA.data.token);
  assert.equal(logoutRes.status, 200);
  const afterLogoutMe = await api('/api/auth/me', 'GET', null, reLoginA.data.token);
  assert.equal(afterLogoutMe.status, 401, 'Token must be revoked on server after logout');
  console.log('✅ TEST 9 PASSED: Server-side token revocation on logout & role change verified');

  // 10. YouTube Caption SSRF / videoId validation
  const badYt = await api('/api/youtube-captions?v=invalid../ssrf');
  assert.equal(badYt.status, 400);
  console.log('✅ TEST 10 PASSED: Malformed/SSRF YouTube videoId rejected with 400');

  // 11. RBAC Lesson Quota Enforcement (User <= 5 custom lessons vs Pro unlimited)
  const sixLessons = Array.from({ length: 6 }, (_, i) => ({
    id: `lesson-custom-q-${i}`,
    youtubeId: 'dQw4w9WgXcQ',
    title: `Lesson ${i}`,
    subtitles: []
  }));
  const quotaBlockB = await api('/api/sync/lessons', 'POST', { lessons: sixLessons }, tokenB);
  assert.equal(quotaBlockB.status, 403, 'Standard user exceeding 5 custom lessons must get 403');
  const fiveOkB = await api('/api/sync/lessons', 'POST', { lessons: sixLessons.slice(0, 5) }, tokenB);
  assert.equal(fiveOkB.status, 200);

  const loginProA = await api('/api/auth/login', 'POST', { email: userAEmail, password: 'password123' });
  const tokenProA = loginProA.data.token;
  const proOkA = await api('/api/sync/lessons', 'POST', { lessons: sixLessons }, tokenProA);
  assert.equal(proOkA.status, 200);
  assert.equal(proOkA.data.count, 7);
  console.log('✅ TEST 11 PASSED: RBAC custom lesson quota enforced (User 5 max -> 403, Pro unlimited -> 200)');

  // 12. AI Roleplay Endpoint & Shared Daily Quota (Guest 401, User 20 turns -> 21st 429, Pro unlimited)
  const guestAi = await api('/api/ai/roleplay', 'POST', { personaId: 'cafe-barista', userMessage: 'Hi' });
  assert.equal(guestAi.status, 401);
  for (let i = 0; i < 20; i++) {
    const turnRes = await api('/api/ai/roleplay', 'POST', {
      personaId: 'cafe-barista',
      userMessage: `Turn ${i + 1}`
    }, tokenB);
    assert.equal(turnRes.status, 200);
    assert.equal(turnRes.data.source, 'gemini');
    assert.equal(turnRes.data.quota.used, i + 1);
    assert.equal(turnRes.data.quota.limit, 20);
  }
  const twentyFirstUserTurn = await api('/api/ai/roleplay', 'POST', {
    personaId: 'cafe-barista',
    userMessage: 'Turn 21'
  }, tokenB);
  assert.equal(twentyFirstUserTurn.status, 429, 'Standard user must hit shared daily AI limit at turn 21');
  const proAiTurn = await api('/api/ai/roleplay', 'POST', {
    personaId: 'tech-interviewer',
    userMessage: 'Walk me through system design'
  }, tokenProA);
  assert.equal(proAiTurn.status, 200);
  assert.equal(proAiTurn.data.quota.unlimited, true);
  console.log('✅ TEST 12 PASSED: AI Roleplay auth, live responder & 20/day shared quota verified');

  // 13. Master Dictionary Cache (`words_master`) & Batch Translation
  const dict1 = await api('/api/dict/lookup?w=Ubiquitous');
  assert.equal(dict1.status, 200);
  assert.equal(dict1.data.source, 'upstream');
  assert.equal(upstreamDictHits, 1);

  const dict2 = await api('/api/dict/lookup?w=ubiquitous');
  assert.equal(dict2.status, 200);
  assert.equal(dict2.data.source, 'db_cache');
  assert.equal(upstreamDictHits, 1, 'Second lookup must be served directly from words_master DB cache');

  const batchTrans = await api('/api/dict/translate-batch', 'POST', { texts: ['Hello world', 'Good morning'] });
  assert.equal(batchTrans.status, 200);
  assert.deepEqual(batchTrans.data.translations, ['[VI] Hello world', '[VI] Good morning']);
  console.log('✅ TEST 13 PASSED: Cached words_master lookup & batch translation verified');

  // 14. Full Learning State Sync Isolation (Scenarios, Streak, Shorts)
  const postStateA = await api('/api/sync/state', 'POST', {
    state: {
      streakDays: 21,
      scenarios: [{ id: 'custom-sc-1', title: 'Coffee Negotiation' }],
      shortsOffsets: { 'short-1': 0.3 }
    }
  }, tokenProA);
  assert.equal(postStateA.status, 200);
  const getStateA = await api('/api/sync/state', 'GET', null, tokenProA);
  assert.equal(getStateA.data.state.streakDays, 21);
  assert.equal(getStateA.data.state.scenarios[0].id, 'custom-sc-1');

  const getStateB = await api('/api/sync/state', 'GET', null, tokenB);
  assert.deepEqual(getStateB.data.state, {});
  console.log('✅ TEST 14 PASSED: Full learning state sync verified and isolated between users');

  // 15. Multi-word Phrase Lookup & words_master Caching
  const hitsBeforePhrase = upstreamDictHits;
  const phrase1 = await api('/api/dict/lookup?w=Take%20It%20For%20Granted');
  assert.equal(phrase1.status, 200);
  assert.equal(phrase1.data.word, 'take it for granted');
  assert.equal(phrase1.data.source, 'upstream');
  assert.equal(upstreamDictHits, hitsBeforePhrase + 1);

  const phrase2 = await api('/api/dict/lookup?w=take%20it%20for%20granted');
  assert.equal(phrase2.status, 200);
  assert.equal(phrase2.data.source, 'db_cache');
  assert.equal(upstreamDictHits, hitsBeforePhrase + 1, 'Second phrase lookup must hit words_master cache');
  console.log('✅ TEST 15 PASSED: Multi-word phrase lookup & DB cache verified');

  // 16. AI Contextual Explanation Endpoint (Guest 401, Quota-exhausted User 429, Pro 200)
  const guestExplain = await api('/api/ai/explain', 'POST', {
    phrase: 'take it for granted',
    sentence: 'Never take it for granted when someone helps you.'
  });
  assert.equal(guestExplain.status, 401);

  const exhaustedUserExplain = await api('/api/ai/explain', 'POST', {
    phrase: 'take it for granted',
    sentence: 'Never take it for granted.'
  }, tokenB);
  assert.equal(exhaustedUserExplain.status, 429, 'Shared 20/day AI quota must apply across /api/ai/explain too');

  const proExplain = await api('/api/ai/explain', 'POST', {
    phrase: 'take it for granted',
    sentence: 'Never take it for granted when someone helps you.',
    videoTitle: 'Life Lessons'
  }, tokenProA);
  assert.equal(proExplain.status, 200);
  assert.equal(proExplain.data.source, 'gemini');
  assert.ok(proExplain.data.meaningVi.includes('take it for granted'));
  assert.ok(Array.isArray(proExplain.data.examples) && proExplain.data.examples.length >= 1);
  console.log('✅ TEST 16 PASSED: AI Contextual Explanation auth, shared quota & payload verified');

  // 17. AI Auto-Quiz Generator & AI Speaking Scenario Generator
  const quizRes = await api('/api/ai/generate-quiz', 'POST', {
    title: 'Steve Jobs Stanford Speech',
    subtitles: [
      { text: 'I am honored to be with you today at your commencement.', translation: 'Tôi vinh dự có mặt.' },
      { text: 'You cannot connect the dots looking forward.', translation: 'Không thể nối các điểm về phía trước.' },
      { text: 'Stay hungry, stay foolish in everything you pursue.', translation: 'Hãy luôn khát khao, hãy luôn dại khờ.' }
    ]
  }, tokenProA);
  assert.equal(quizRes.status, 200);
  assert.equal(quizRes.data.quizzes.length, 5);
  assert.equal(quizRes.data.quizzes[0].options.length, 4);

  const scenarioRes = await api('/api/ai/generate-scenario', 'POST', {
    topic: 'Salary Negotiation',
    level: 'B2',
    category: 'Công sở'
  }, tokenProA);
  assert.equal(scenarioRes.status, 200);
  assert.equal(scenarioRes.data.scenario.level, 'B2');
  assert.equal(scenarioRes.data.scenario.turns.length, 6);
  console.log('✅ TEST 17 PASSED: AI Auto-Quiz (5 questions) & AI Speaking Scenario (6 turns) verified');

  // 18. Source Video Metadata & Timestamp Round-Trip Persistence on Saved Words
  const syncWordWithTimestamp = await api('/api/sync/words', 'POST', {
    words: [
      {
        id: 'word-ts-1',
        word: 'take it for granted',
        translation: 'coi là hiển nhiên',
        contextSentence: 'Never take it for granted.',
        videoTitle: 'Stanford Commencement',
        sourceLessonId: 'lesson-steve-jobs',
        sourceYoutubeId: 'UF8uR6Z6KLc',
        sourceTimestampSec: 142.5,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        lapses: 0,
        state: 'learning',
        dueAt: Date.now() + 86400000,
        usn: 2
      }
    ],
    deletedWords: []
  }, tokenProA);
  assert.equal(syncWordWithTimestamp.status, 200);

  const fetchWordsA = await api('/api/sync/words', 'GET', null, tokenProA);
  assert.equal(fetchWordsA.status, 200);
  const tsWord = fetchWordsA.data.words.find((w) => w.word === 'take it for granted');
  assert.ok(tsWord, 'Saved multi-word phrase must be returned from sync');
  assert.equal(tsWord.sourceLessonId, 'lesson-steve-jobs');
  assert.equal(tsWord.sourceYoutubeId, 'UF8uR6Z6KLc');
  assert.equal(tsWord.sourceTimestampSec, 142.5);
  assert.equal(tsWord.videoTitle, 'Stanford Commencement');
  console.log('✅ TEST 18 PASSED: SavedWord sourceLessonId, sourceYoutubeId & sourceTimestampSec persisted');

  console.log('\n🎯 ALL 18 SECURITY, RBAC, AI, CACHE, PHRASE & SYNC TESTS PASSED!');
}

try {
  await run();
  await authModule.close();
  server.close();
  fs.rmSync(testDir, { recursive: true, force: true });
  process.exit(0);
} catch (err) {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  await authModule.close().catch(() => {});
  server.close();
  fs.rmSync(testDir, { recursive: true, force: true });
  process.exit(1);
}
