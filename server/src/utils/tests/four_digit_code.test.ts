/**
 * Automated Test Suite for 4-Digit Verification Codes & Security Protections
 *
 * Runs with:
 *   DB_MODE=sqlite npx ts-node src/utils/tests/four_digit_code.test.ts
 */

const db = require('../../config/database');
const { generate4DigitCode } = require('../helpers');

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

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// In-memory Rate Limiter matching Controller Logic for testing
const rateLimitTestMap = new Map();
const MAX_ATTEMPTS = 5;

function isLocked(orderId: number) {
  const attempt = rateLimitTestMap.get(orderId);
  return attempt && attempt.count >= MAX_ATTEMPTS;
}

function recordFailed(orderId: number) {
  const attempt = rateLimitTestMap.get(orderId) || { count: 0 };
  attempt.count += 1;
  rateLimitTestMap.set(orderId, attempt);
}

function clearLimit(orderId: number) {
  rateLimitTestMap.delete(orderId);
}

async function verifyDeliveryControllerSimulation(agentId: number, orderId: number, code: string) {
  if (isLocked(orderId)) {
    return { status: 429, error: 'Too many failed verification attempts. Please wait 15 minutes before trying again.' };
  }

  const [anyOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!anyOrder.length) {
    recordFailed(orderId);
    return { status: 400, error: 'Invalid verification code or unauthorized request.' };
  }
  const order = anyOrder[0];

  if (order.agent_id !== agentId || order.status !== 'out_for_delivery') {
    recordFailed(orderId);
    return { status: 400, error: 'Invalid verification code or unauthorized request.' };
  }

  const suppliedCode = (code || '').trim();
  let success = false;
  try {
    await db.transaction(async (conn: any) => {
      const [res] = await conn.execute(
        "UPDATE orders SET status = 'delivered', delivery_code = NULL, delivery_verified_by = ?, delivery_verified_at = CURRENT_TIMESTAMP, delivered_at = CURRENT_TIMESTAMP WHERE id = ? AND agent_id = ? AND status = 'out_for_delivery' AND (delivery_code = ? OR UPPER(delivery_code) = UPPER(?))",
        [agentId, orderId, agentId, suppliedCode, suppliedCode]
      );
      if (res.affectedRows > 0) {
        success = true;
      }
    });
  } catch (e) {
    success = false;
  }

  if (success) {
    clearLimit(orderId);
    return { status: 200, message: 'Delivery verified!' };
  } else {
    recordFailed(orderId);
    return { status: 400, error: 'Invalid verification code or unauthorized request.' };
  }
}

async function runTests() {
  console.log('Running 4-Digit Delivery Code & Security Verification Tests...\n');

  // Test 1: Code Generation Format (100 iterations)
  await test('New codes are exactly 4 digits (0000-9999) with preserved leading zeros and numeric-only characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generate4DigitCode();
      assertEqual(code.length, 4, `Iteration ${i}: length must be 4`);
      assert(/^\d{4}$/.test(code), `Iteration ${i}: code "${code}" must be exactly 4 numeric digits`);
    }
  });

  // Test 2: Leading zeros preservation check
  await test('Leading zeros are preserved correctly in formatting', () => {
    // Generate many codes until we encounter codes starting with 0
    let foundZeroPrefix = false;
    for (let i = 0; i < 500; i++) {
      const code = generate4DigitCode();
      if (code.startsWith('0')) {
        foundZeroPrefix = true;
        assertEqual(code.length, 4, `Code "${code}" with leading zero must retain 4 digits`);
      }
    }
    assert(foundZeroPrefix, 'CSPRNG generated code with leading zeros');
  });

  // Test 3: Correct Code Succeeds
  await test('Correct 4-digit code succeeds for assigned agent on out_for_delivery order', async () => {
    const code = '0047';
    const agentId = 801;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_1_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', code, 100.00]
    );
    const orderId = res.insertId;

    const result = await verifyDeliveryControllerSimulation(agentId, orderId, code);
    assertEqual(result.status, 200, 'Correct 4-digit code must succeed');

    const [orders] = await db.execute('SELECT status, delivery_code FROM orders WHERE id = ?', [orderId]);
    assertEqual(orders[0].status, 'delivered', 'Order status updated to delivered');
    assertEqual(orders[0].delivery_code, null, 'delivery_code cleared after consumption');
  });

  // Test 4: Wrong Code Rejected
  await test('Wrong 4-digit code is rejected without modifying order state', async () => {
    const correctCode = '5832';
    const wrongCode = '9999';
    const agentId = 802;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_2_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', correctCode, 100.00]
    );
    const orderId = res.insertId;

    const result = await verifyDeliveryControllerSimulation(agentId, orderId, wrongCode);
    assertEqual(result.status, 400, 'Wrong code must return HTTP 400');

    const [orders] = await db.execute('SELECT status, delivery_code FROM orders WHERE id = ?', [orderId]);
    assertEqual(orders[0].status, 'out_for_delivery', 'Order status must remain out_for_delivery');
    assertEqual(orders[0].delivery_code, correctCode, 'delivery_code must remain intact');
  });

  // Test 5: Wrong Agent Rejected
  await test('Wrong agent trying to verify correct code is rejected', async () => {
    const code = '1234';
    const assignedAgentId = 803;
    const wrongAgentId = 999;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_3_${Date.now()}`, 10, 20, assignedAgentId, 'out_for_delivery', 'hostel', code, 100.00]
    );
    const orderId = res.insertId;

    const result = await verifyDeliveryControllerSimulation(wrongAgentId, orderId, code);
    assertEqual(result.status, 400, 'Wrong agent must be rejected');
  });

  // Test 6: Wrong Order Rejected
  await test('Wrong order ID with correct code is rejected', async () => {
    const code = '4321';
    const agentId = 804;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_4_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', code, 100.00]
    );
    const validOrderId = res.insertId;
    const invalidOrderId = validOrderId + 99999;

    const result = await verifyDeliveryControllerSimulation(agentId, invalidOrderId, code);
    assertEqual(result.status, 400, 'Wrong order ID must be rejected');
  });

  // Test 7: Replay Rejected
  await test('Reusing a consumed code (replay attack) is rejected', async () => {
    const code = '7777';
    const agentId = 805;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_5_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', code, 100.00]
    );
    const orderId = res.insertId;

    const r1 = await verifyDeliveryControllerSimulation(agentId, orderId, code);
    assertEqual(r1.status, 200, 'First attempt succeeds');

    const r2 = await verifyDeliveryControllerSimulation(agentId, orderId, code);
    assertEqual(r2.status, 400, 'Reused consumed code fails');
  });

  // Test 8: Two Simultaneous Correct Requests (Concurrency)
  await test('Two simultaneous correct requests result in EXACTLY ONE success', async () => {
    const code = '8888';
    const agentId = 806;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_6_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', code, 100.00]
    );
    const orderId = res.insertId;

    const [res1, res2] = await Promise.all([
      verifyDeliveryControllerSimulation(agentId, orderId, code),
      verifyDeliveryControllerSimulation(agentId, orderId, code),
    ]);

    const successCount = (res1.status === 200 ? 1 : 0) + (res2.status === 200 ? 1 : 0);
    const failCount = (res1.status === 400 ? 1 : 0) + (res2.status === 400 ? 1 : 0);

    assertEqual(successCount, 1, 'Exactly ONE request succeeds');
    assertEqual(failCount, 1, 'Exactly ONE request fails');
  });

  // Test 9: Brute-Force Rate Limiting Protection (5 failed attempts)
  await test('Brute-force protection: 5 wrong attempts lock out the order verification', async () => {
    const correctCode = '3344';
    const wrongCode = '0000';
    const agentId = 807;
    const [res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_7_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', correctCode, 100.00]
    );
    const orderId = res.insertId;

    // Fail 5 times
    for (let attempt = 1; attempt <= 5; attempt++) {
      await verifyDeliveryControllerSimulation(agentId, orderId, wrongCode);
    }

    // 6th attempt with CORRECT code should now be LOCKED OUT (HTTP 429)
    const result = await verifyDeliveryControllerSimulation(agentId, orderId, correctCode);
    assertEqual(result.status, 429, '6th attempt after 5 wrong tries must return HTTP 429 Rate Limited');
  });

  // Test 10: Backward Compatibility with Existing Legacy Long-Format Codes
  await test('Backward Compatibility: Existing legacy delivery codes (e.g. CP4B2CFC69 or 6-digit codes) still work', async () => {
    const legacyCode = 'CP4B2CFC69';
    const legacyOtp = '987654';
    const agentId = 808;

    // Legacy hex code
    const [res1] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_LEGACY_1_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', legacyCode, 100.00]
    );
    const order1Id = res1.insertId;
    const r1 = await verifyDeliveryControllerSimulation(agentId, order1Id, legacyCode);
    assertEqual(r1.status, 200, 'Legacy alphanumeric code CP... succeeds');

    // Legacy 6-digit OTP
    const [res2] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_4D_LEGACY_2_${Date.now()}`, 10, 20, agentId, 'out_for_delivery', 'hostel', legacyOtp, 100.00]
    );
    const order2Id = res2.insertId;
    const r2 = await verifyDeliveryControllerSimulation(agentId, order2Id, legacyOtp);
    assertEqual(r2.status, 200, 'Legacy 6-digit code succeeds');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
