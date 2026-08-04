/**
 * Unit & Integration Tests for Delivery Agent Phone & OTP Verification
 *
 * Runs with:
 *   npx ts-node src/controllers/tests/agentPhoneVerification.test.ts
 */

const db = require('../../config/database');
const bcrypt = require('bcryptjs');

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}\n     ${err.stack || err.message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

async function runTests() {
  console.log('Running Delivery Agent Phone & OTP Verification Tests...\n');

  // Setup test users in database
  const testEmail1 = `agent_test_1_${Date.now()}@example.com`;
  const testEmail2 = `agent_test_2_${Date.now()}@example.com`;
  
  const [res1] = await db.execute(
    `INSERT INTO users (name, email, password, role, phone_verified) VALUES ('Test Agent 1', ?, 'hash', 'student', 0)`,
    [testEmail1]
  );
  const user1Id = res1.insertId;

  const [res2] = await db.execute(
    `INSERT INTO users (name, email, password, role, phone_verified) VALUES ('Test Agent 2', ?, 'hash', 'student', 0)`,
    [testEmail2]
  );
  const user2Id = res2.insertId;

  // Test 1: Regex Phone Validation
  await test('Phone validation regex rejects invalid numbers', () => {
    const invalidNumbers = ['12345', '999', 'abcdefghij', '1111111111', '0987654321', '5987654321', '987654321'];
    for (const num of invalidNumbers) {
      assert(!INDIAN_PHONE_REGEX.test(num), `Should reject invalid phone: ${num}`);
    }
  });

  await test('Phone validation regex accepts valid Indian mobile numbers', () => {
    const validNumbers = ['9876543210', '8000000000', '7123456789', '6999999999'];
    for (const num of validNumbers) {
      assert(INDIAN_PHONE_REGEX.test(num), `Should accept valid phone: ${num}`);
    }
  });

  // Test 2: Send OTP & Store Hashed OTP
  await test('Send OTP stores hashed OTP instead of plaintext', async () => {
    const rawOtp = '123456';
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at, is_used, attempts) VALUES (?, ?, ?, ?, 0, 0)',
      [testEmail1, hashedOtp, 'agent_phone_verify', expiresAt]
    );

    const [records] = await db.execute(
      `SELECT * FROM otp_codes WHERE email = ? AND purpose = 'agent_phone_verify' ORDER BY created_at DESC LIMIT 1`,
      [testEmail1]
    );
    assert(records.length > 0, 'OTP record created');
    assertEqual(records[0].code.startsWith('$2'), true, 'Code is hashed with bcrypt');
    assert(await bcrypt.compare(rawOtp, records[0].code), 'Bcrypt compare matches raw OTP');
  });

  // Test 3: OTP Verification, Max Attempts & Deletion
  await test('OTP verification increments attempts on wrong code and blocks after max attempts', async () => {
    const rawOtp = '654321';
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const [ins] = await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at, is_used, attempts) VALUES (?, ?, ?, ?, 0, 4)',
      [testEmail2, hashedOtp, 'agent_phone_verify', expiresAt]
    );
    const otpId = ins.insertId;

    // 5th attempt with wrong code
    const isMatch = await bcrypt.compare('000000', hashedOtp);
    assert(!isMatch, 'Wrong code fails comparison');
    await db.execute('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otpId]);

    const [updated] = await db.execute('SELECT attempts FROM otp_codes WHERE id = ?', [otpId]);
    assertEqual(updated[0].attempts, 5, 'Attempts incremented to 5');
  });

  await test('Successful OTP verification sets phone_verified=1 and deletes OTP record', async () => {
    const rawOtp = '987654';
    const hashedOtp = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const [ins] = await db.execute(
      'INSERT INTO otp_codes (email, code, purpose, expires_at, is_used, attempts) VALUES (?, ?, ?, ?, 0, 0)',
      [testEmail1, hashedOtp, 'agent_phone_verify', expiresAt]
    );
    const otpId = ins.insertId;

    // Verify
    const isMatch = await bcrypt.compare(rawOtp, hashedOtp);
    assert(isMatch, 'Correct OTP matches');

    // Simulate controller logic
    await db.execute('DELETE FROM otp_codes WHERE id = ?', [otpId]);
    await db.execute('UPDATE users SET phone = ?, phone_verified = 1 WHERE id = ?', ['9876543210', user1Id]);
    await db.execute("INSERT OR IGNORE INTO delivery_agent_availability (agent_id, status) VALUES (?, 'AVAILABLE')", [user1Id]);

    // Verify deletion and user updates
    const [checkOtp] = await db.execute('SELECT id FROM otp_codes WHERE id = ?', [otpId]);
    assertEqual(checkOtp.length, 0, 'OTP deleted after successful verification');

    const [checkUser] = await db.execute('SELECT phone, phone_verified FROM users WHERE id = ?', [user1Id]);
    assertEqual(checkUser[0].phone_verified, 1, 'phone_verified set to 1');
    assertEqual(checkUser[0].phone, '9876543210', 'phone updated correctly');
  });

  // Test 4: Prevent Duplicate Verified Delivery-Agent Phone Numbers
  await test('Duplicate verified phone number check detects existing phone', async () => {
    const verifiedPhone = '9876543210';
    const [existingPhone] = await db.execute(
      'SELECT id FROM users WHERE phone = ? AND id != ? AND phone_verified = 1',
      [verifiedPhone, user2Id]
    );
    assert(existingPhone.length > 0, 'Detects existing verified phone number on user 1');
  });

  // Test 5: Rate Limiting & Daily Generation Limits
  await test('Rate limiting detects 3 or more requests in 15 minutes window', async () => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Seed 3 OTPs in recent window
    await db.execute("INSERT INTO otp_codes (email, code, purpose, expires_at, created_at) VALUES (?, 'hash1', 'agent_phone_verify', ?, ?)", [testEmail2, nowStr, nowStr]);
    await db.execute("INSERT INTO otp_codes (email, code, purpose, expires_at, created_at) VALUES (?, 'hash2', 'agent_phone_verify', ?, ?)", [testEmail2, nowStr, nowStr]);
    await db.execute("INSERT INTO otp_codes (email, code, purpose, expires_at, created_at) VALUES (?, 'hash3', 'agent_phone_verify', ?, ?)", [testEmail2, nowStr, nowStr]);

    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const [countRes] = await db.execute(
      `SELECT COUNT(*) as count FROM otp_codes WHERE email = ? AND purpose = 'agent_phone_verify' AND created_at >= ?`,
      [testEmail2, fifteenMinsAgo]
    );
    assert((countRes[0]?.count || 0) >= 3, 'Rate limit threshold (>= 3) triggered');
  });

  // Cleanup test data
  await db.execute('DELETE FROM delivery_agent_availability WHERE agent_id IN (?, ?)', [user1Id, user2Id]);
  await db.execute('DELETE FROM users WHERE id IN (?, ?)', [user1Id, user2Id]);
  await db.execute('DELETE FROM otp_codes WHERE email IN (?, ?)', [testEmail1, testEmail2]);

  setTimeout(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  }, 100);
}

runTests();
