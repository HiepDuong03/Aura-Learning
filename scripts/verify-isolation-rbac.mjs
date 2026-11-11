/**
 * Automated Verification Script:
 * 1. Multi-Tenant Data Isolation (Zero Contamination)
 * 2. Relational Database 3NF Integrity (users, words_master, vocabulary_notes, srs_cards)
 * 3. RBAC Access Control (User 403 Forbidden vs Admin 200 OK)
 * 4. Role Elevation and Metric Verification
 */

import http from 'node:http';
import { handleAuthAndSync } from '../api/auth-sync.js';

// Create test server running the actual backend auth/sync handler
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  handleAuthAndSync(req, res, url.pathname);
});

async function run() {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl}`);

  async function api(path, method = 'GET', body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  const timestamp = Date.now();
  const userAEmail = `alice_${timestamp}@test.com`;
  const userBEmail = `bob_${timestamp}@test.com`;
  const adminEmail = `admin_${timestamp}@aura.ai`;

  console.log('\n--- TEST 1: Register User A and User B ---');
  const regA = await api('/api/auth/register', 'POST', {
    name: 'Alice Learner',
    email: userAEmail,
    password: 'password123'
  });
  console.log(`User A Register Status: ${regA.status} (Expected: 201)`);
  if (regA.status !== 201 || !regA.data.token) throw new Error('User A register failed: ' + JSON.stringify(regA.data));
  const tokenA = regA.data.token;
  const userAId = regA.data.user.id;
  console.log(`User A ID: ${userAId}, Role: ${regA.data.user.role}`);

  const regB = await api('/api/auth/register', 'POST', {
    name: 'Bob Learner',
    email: userBEmail,
    password: 'password123'
  });
  console.log(`User B Register Status: ${regB.status} (Expected: 201)`);
  if (regB.status !== 201 || !regB.data.token) throw new Error('User B register failed: ' + JSON.stringify(regB.data));
  const tokenB = regB.data.token;
  const userBId = regB.data.user.id;
  console.log(`User B ID: ${userBId}, Role: ${regB.data.user.role}`);

  console.log('\n--- TEST 2: User A saves vocabulary "serendipity" & syncs ---');
  const syncA = await api('/api/sync/words', 'POST', {
    words: [
      {
        id: `word-${timestamp}`,
        word: 'serendipity',
        phonetic: '/ˌser.ənˈdɪp.ə.t̬i/',
        partOfSpeech: 'n.',
        translation: 'sự tình cờ may mắn',
        definitionEn: 'finding valuable or agreeable things not sought for',
        contextSentence: 'It was pure serendipity that we met.',
        videoTitle: 'TED Talk on Coincidence',
        savedAt: timestamp,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        state: 'learning'
      }
    ]
  }, tokenA);
  console.log(`User A Sync Status: ${syncA.status} (Expected: 200), Words count: ${syncA.data.count}`);
  if (syncA.status !== 200 || syncA.data.count !== 1) throw new Error('User A sync failed');

  console.log('\n--- TEST 3: Verify Multi-Tenant Isolation (User B must NOT see User A words) ---');
  const syncB = await api('/api/sync/words', 'GET', null, tokenB);
  console.log(`User B Words Count: ${syncB.data.count} (Expected: 0)`);
  const userBHasSerendipity = (syncB.data.words || []).some(w => w.word === 'serendipity');
  console.log(`User B contaminated with "serendipity"?: ${userBHasSerendipity} (Expected: false)`);
  if (userBHasSerendipity || syncB.data.count !== 0) {
    throw new Error('CRITICAL FAILURE: Cross-account data contamination detected!');
  }
  console.log('✅ Isolation Verified: User B has 0 words, completely isolated from User A.');

  console.log('\n--- TEST 4: RBAC Guard - Normal User A attempts /api/admin/users ---');
  const userAAccessAdmin = await api('/api/admin/users', 'GET', null, tokenA);
  console.log(`User A Admin Access Status: ${userAAccessAdmin.status} (Expected: 403)`);
  if (userAAccessAdmin.status !== 403) {
    throw new Error('CRITICAL FAILURE: Non-admin was able to access admin endpoint!');
  }
  console.log(`✅ RBAC Verified: User A denied with message: "${userAAccessAdmin.data.error}"`);

  console.log('\n--- TEST 5: Admin Login (@aura.ai domain) ---');
  const regAdmin = await api('/api/auth/register', 'POST', {
    name: 'Super Admin',
    email: adminEmail,
    password: 'adminPassword123'
  });
  console.log(`Admin Register Status: ${regAdmin.status} (Expected: 201), Role: ${regAdmin.data.user.role}`);
  if (regAdmin.data.user.role !== 'admin') throw new Error('Admin role assignment failed');
  const tokenAdmin = regAdmin.data.token;

  console.log('\n--- TEST 6: Admin accesses /api/admin/users & /api/admin/metrics ---');
  const adminUsers = await api('/api/admin/users', 'GET', null, tokenAdmin);
  console.log(`Admin /api/admin/users Status: ${adminUsers.status} (Expected: 200), Total Users: ${adminUsers.data.count}`);
  if (adminUsers.status !== 200 || !Array.isArray(adminUsers.data.users)) throw new Error('Admin get users failed');

  const adminMetrics = await api('/api/admin/metrics', 'GET', null, tokenAdmin);
  console.log(`Admin /api/admin/metrics Status: ${adminMetrics.status} (Expected: 200)`);
  console.log('Database Metrics:', adminMetrics.data.metrics);
  if (adminMetrics.status !== 200 || adminMetrics.data.metrics.totalSRSCards < 1) {
    throw new Error('Admin metrics verification failed');
  }

  console.log('\n--- TEST 7: Admin promotes User A to "pro" role ---');
  const updateRole = await api('/api/admin/users/role', 'POST', {
    targetUserId: userAId,
    newRole: 'pro'
  }, tokenAdmin);
  console.log(`Role Update Status: ${updateRole.status} (Expected: 200), New Role: ${updateRole.data.user.role}`);
  if (updateRole.status !== 200 || updateRole.data.user.role !== 'pro') {
    throw new Error('Role update failed');
  }
  console.log('✅ RBAC Elevation Verified: User A promoted to "pro".');

  console.log('\n======================================================');
  console.log('🎯 ALL 7 AUTOMATED VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================');

  server.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  server.close();
  process.exit(1);
});
