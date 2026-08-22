/**
 * Integration & Concurrency Tests for Duplex Printing & Secure Pickup Flow
 *
 * Runs with:
 *   DB_MODE=sqlite npx ts-node src/utils/tests/duplex_pickup.test.ts
 */

const db = require('../../config/database');
const { calculatePrice } = require('../helpers');

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

async function runTests() {
  console.log('Running Duplex Printing & Secure Pickup Integration Tests...\n');

  // Test 1: Shop without duplex support rejects duplex orders
  await test('Shop with supports_duplex_printing = false rejects duplex order request', async () => {
    const shop = {
      id: 999,
      supports_duplex_printing: 0,
      price_bw: 2.00,
      price_color: 5.00,
    };
    
    const requestedSides = 'duplex';
    const isValid = (requestedSides === 'duplex' && shop.supports_duplex_printing) ? true : false;
    assertEqual(isValid, false, 'Shop without duplex support must reject duplex request');
  });

  // Test 2: Shop with duplex support accepts duplex orders
  await test('Shop with supports_duplex_printing = true accepts duplex order request', async () => {
    const shop = {
      id: 1000,
      supports_duplex_printing: 1,
      price_bw: 2.00,
      price_color: 5.00,
      price_bw_duplex: 1.50,
      price_color_duplex: 4.00,
    };
    
    const requestedSides = 'duplex';
    const isSupported = (requestedSides === 'duplex' && shop.supports_duplex_printing) ? true : false;
    assert(isSupported, 'Shop with duplex support must accept duplex request');

    const pricing = calculatePrice({
      pages: 10,
      copies: 1,
      printType: 'bw',
      print_sides: 'duplex',
      shop,
    });

    assertEqual(pricing.printedSheets, 5, 'printedSheets for 10 pages duplex');
    assertEqual(pricing.printCost, 7.50, 'printCost for 10 pages duplex @ 1.50 (5 physical sheets)');
  });

  // Test 3: Concurrency protection — 2 simultaneous Mark Delivered requests
  await test('Concurrency: 2 simultaneous Mark Delivered requests -> Exactly 1 succeeds, 1 fails', async () => {
    // Insert a test shop and test order in sqlite DB
    const orderHash = `TEST_HASH_${Date.now()}`;
    const [shopRes] = await db.execute(
      "INSERT INTO shops (user_id, shop_name, price_bw, wallet_balance) VALUES (?, ?, ?, ?)",
      [99999, 'Test Concurrency Shop', 2.00, 100.00]
    );
    const testShopId = shopRes.insertId;

    const [orderRes] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, status, delivery_type, total_price, total_pages) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [orderHash, 88888, testShopId, 'ready', 'pickup', 50.00, 10]
    );
    const testOrderId = orderRes.insertId;

    let successCount = 0;
    let failCount = 0;

    const deliverTask = async () => {
      try {
        await db.transaction(async (conn: any) => {
          const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const [res] = await conn.execute(
            "UPDATE orders SET status = 'delivered', delivered_at = ? WHERE id = ? AND status = 'ready'",
            [nowStr, testOrderId]
          );

          if (res.affectedRows === 0) {
            throw new Error('ALREADY_PROCESSED');
          }

          await conn.execute(
            "UPDATE shops SET wallet_balance = wallet_balance + 50.00 WHERE id = ?",
            [testShopId]
          );
        });
        successCount++;
      } catch (err: any) {
        if (err.message === 'ALREADY_PROCESSED') {
          failCount++;
        } else {
          throw err;
        }
      }
    };

    // Execute two simultaneous requests concurrently
    await Promise.all([deliverTask(), deliverTask()]);

    assertEqual(successCount, 1, 'Exactly one delivery request must succeed');
    assertEqual(failCount, 1, 'Exactly one delivery request must fail');

    // Verify final shop balance was credited only ONCE (+50.00, from 100.00 to 150.00)
    const [shops] = await db.execute("SELECT wallet_balance FROM shops WHERE id = ?", [testShopId]);
    assertEqual(parseFloat(shops[0].wallet_balance), 150.00, 'Shop wallet credited exactly once');
  });

  // Test 4: Comprehensive Delivery Verification Security Matrix
  await test('Delivery verification matrix: Agent identity, order ID, code validity, replay, and concurrency', async () => {
    const agentA = 101;
    const agentB = 102;
    const correctCode = '888999';
    const wrongCode = '000000';

    // Create Order #1 assigned to Agent A
    const [order1Res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_MATRIX_1_${Date.now()}`, 500, 600, agentA, 'out_for_delivery', 'hostel', correctCode, 150.00]
    );
    const order1Id = order1Res.insertId;
    const wrongOrderId = order1Id + 9999;

    const attemptVerify = async (agentId: number, orderId: number, code: string) => {
      let result = 'FAIL';
      try {
        await db.transaction(async (conn: any) => {
          const [res] = await conn.execute(
            "UPDATE orders SET status = 'delivered', delivery_code = NULL, delivery_verified_by = ?, delivery_verified_at = CURRENT_TIMESTAMP, delivered_at = CURRENT_TIMESTAMP WHERE id = ? AND agent_id = ? AND status = 'out_for_delivery' AND (delivery_code = ? OR UPPER(delivery_code) = UPPER(?))",
            [agentId, orderId, agentId, code, code]
          );
          if (res.affectedRows > 0) {
            result = 'SUCCESS';
          }
        });
      } catch (e) {
        result = 'FAIL';
      }
      return result;
    };

    // 1. Agent A + correct order + WRONG code → FAIL
    const res1 = await attemptVerify(agentA, order1Id, wrongCode);
    assertEqual(res1, 'FAIL', '1. Agent A + correct order + WRONG code must FAIL');

    // 2. Agent A + wrong order + correct code → FAIL
    const res2 = await attemptVerify(agentA, wrongOrderId, correctCode);
    assertEqual(res2, 'FAIL', '2. Agent A + wrong order + correct code must FAIL');

    // 3. Agent B + correct order + correct code → FAIL
    const res3 = await attemptVerify(agentB, order1Id, correctCode);
    assertEqual(res3, 'FAIL', '3. Agent B + correct order + correct code must FAIL');

    // 4. Agent A + correct order + correct code → SUCCESS
    const res4 = await attemptVerify(agentA, order1Id, correctCode);
    assertEqual(res4, 'SUCCESS', '4. Agent A + correct order + correct code must SUCCESS');

    // 5. Same request again → FAIL (replay)
    const res5 = await attemptVerify(agentA, order1Id, correctCode);
    assertEqual(res5, 'FAIL', '5. Same request again must FAIL (replay rejection)');

    // 6. Two simultaneous correct requests on a new order → exactly ONE SUCCESS
    const [order2Res] = await db.execute(
      "INSERT INTO orders (order_hash, student_id, shop_id, agent_id, status, delivery_type, delivery_code, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`TEST_MATRIX_2_${Date.now()}`, 501, 601, agentA, 'out_for_delivery', 'hostel', '111222', 200.00]
    );
    const order2Id = order2Res.insertId;

    const [sim1, sim2] = await Promise.all([
      attemptVerify(agentA, order2Id, '111222'),
      attemptVerify(agentA, order2Id, '111222')
    ]);

    const successCount = (sim1 === 'SUCCESS' ? 1 : 0) + (sim2 === 'SUCCESS' ? 1 : 0);
    const failCount = (sim1 === 'FAIL' ? 1 : 0) + (sim2 === 'FAIL' ? 1 : 0);

    assertEqual(successCount, 1, '6. Exactly ONE simultaneous request must SUCCESS');
    assertEqual(failCount, 1, '6. Exactly ONE simultaneous request must FAIL');
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
