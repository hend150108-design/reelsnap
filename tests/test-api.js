/**
 * ReelSnap - Automated Test Suite
 * Validates security, SSRF filters, URL parsers, and Express endpoints.
 */

const assert = require('assert');
const { extractInstagramInfo } = require('../server/middleware/validator');
const { validateMediaUrl, isPrivateIp } = require('../server/middleware/ssrfProtection');
const app = require('../server/server');

let serverInstance;
const TEST_PORT = 3188;

async function runTests() {
  console.log('🧪 Starting ReelSnap Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function testAsync(description, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // --- 1. URL Validator Tests ---
  console.log('--- 1. Testing URL Validator ---');
  test('Valid reel URL extracts shortcode correctly', () => {
    const res = extractInstagramInfo('https://www.instagram.com/reel/C3bVqj_P2mF/?igsh=xyz');
    assert(res !== null, 'Should parse valid reel');
    assert.strictEqual(res.shortcode, 'C3bVqj_P2mF');
    assert.strictEqual(res.type, 'reel');
  });

  test('Valid post URL extracts shortcode correctly', () => {
    const res = extractInstagramInfo('https://instagram.com/p/DOvzTywjPGN/');
    assert(res !== null, 'Should parse valid post');
    assert.strictEqual(res.shortcode, 'DOvzTywjPGN');
  });

  test('Rejects non-Instagram host (SSRF prevention)', () => {
    const res = extractInstagramInfo('https://evil-site.com/reel/C3bVqj_P2mF/');
    assert.strictEqual(res, null, 'Should reject unknown host');
  });

  test('Rejects localhost or IP in URL', () => {
    const res = extractInstagramInfo('http://localhost:3000/reel/C3bVqj_P2mF/');
    assert.strictEqual(res, null, 'Should reject localhost');
  });

  // --- 2. SSRF Protection Tests ---
  console.log('\n--- 2. Testing SSRF Protection ---');
  test('Identifies private IPv4 addresses correctly', () => {
    assert.strictEqual(isPrivateIp('127.0.0.1'), true);
    assert.strictEqual(isPrivateIp('10.0.0.5'), true);
    assert.strictEqual(isPrivateIp('192.168.1.1'), true);
    assert.strictEqual(isPrivateIp('172.16.0.1'), true);
    assert.strictEqual(isPrivateIp('169.254.169.254'), true);
  });

  test('Identifies public IP address as safe', () => {
    assert.strictEqual(isPrivateIp('8.8.8.8'), false);
  });

  await testAsync('Blocks non-HTTPS media URL', async () => {
    const res = await validateMediaUrl('http://scontent.cdninstagram.com/v/test.mp4');
    assert.strictEqual(res.valid, false);
  });

  await testAsync('Blocks media URL from unauthorized domain', async () => {
    const res = await validateMediaUrl('https://evil-attacker.com/video.mp4');
    assert.strictEqual(res.valid, false);
  });

  await testAsync('Blocks localhost media URL', async () => {
    const res = await validateMediaUrl('https://localhost/video.mp4');
    assert.strictEqual(res.valid, false);
  });

  // --- 3. Express Endpoint Integration Tests ---
  console.log('\n--- 3. Testing Express Endpoints ---');
  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  await testAsync('GET /api/health returns 200 and healthy status', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.status, 'healthy');
  });

  await testAsync('POST /api/reels/info with empty body returns 400', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/reels/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.code, 'EMPTY_URL');
  });

  await testAsync('POST /api/reels/info with invalid domain returns 400', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/reels/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://youtube.com/watch?v=123' }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.code, 'INVALID_INSTAGRAM_URL');
  });

  await testAsync('GET /api/reels/download with SSRF attempt returns 403', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/reels/download?url=https://127.0.0.1/video.mp4`);
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.code, 'SSRF_BLOCKED');
  });

  await testAsync('GET / returns 200 and serves HTML', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert(html.includes('ReelSnap'), 'Index HTML should contain ReelSnap');
    assert(html.includes('Download Instagram Reels'), 'Index HTML should contain headline');
  });

  // Cleanup
  if (serverInstance) {
    serverInstance.close();
  }

  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
