/**
 * Unit & Integration Test for downloadPrintPdf endpoint
 *
 * Runs with:
 *   npx ts-node src/controllers/tests/downloadPrintPdf.test.ts
 */

const db = require('../../config/database');
const orderController = require('../orderController');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`${label}: expected true, got false`);
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}\n     ${err.stack || err.message}`);
    failed++;
  }
}

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.headers = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  res.contentType = (type: string) => {
    res.headers['content-type'] = type;
    return res;
  };
  res.send = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function runDownloadPrintPdfTest() {
  console.log('Running downloadPrintPdf Unit & Integration Test...\n');

  // Create temporary test file if missing
  const dummyFilePath = path.join(__dirname, '../../../test_dummy.pdf');
  fs.writeFileSync(dummyFilePath, '%PDF-1.4 dummy pdf content');

  // Seed user, shop, order, file
  const testUserEmail = `download_test_user_${Date.now()}@test.com`;
  const [u] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Shop Owner', ?, 'pass', 'shop', 1)", [testUserEmail]);
  const userId = u.insertId || u.lastID;

  const [s] = await db.execute("INSERT INTO shops (user_id, shop_name, location) VALUES (?, 'Test Print Shop', 'Campus')", [userId]);
  const shopId = s.insertId || s.lastID;

  const orderHash = `TESTPRINT${Date.now()}`;
  const [o] = await db.execute(
    "INSERT INTO orders (order_hash, student_id, shop_id, status, payment_status, notes, pages_per_sheet) VALUES (?, ?, ?, 'confirmed', 'PAID', '[Format: A4, portrait, 1 pg/sheet]', 1)",
    [orderHash, userId, shopId]
  );
  const orderId = o.insertId || o.lastID;

  const [f] = await db.execute(
    "INSERT INTO order_files (order_id, original_name, stored_name, file_path, mime_type) VALUES (?, 'test.pdf', 'test.pdf', ?, 'application/pdf')",
    [orderId, dummyFilePath]
  );
  const fileId = f.insertId || f.lastID;

  await test('downloadPrintPdf executes without 500 error', async () => {
    const req: any = {
      params: { fileId: String(fileId) },
      user: { id: userId, role: 'shop' }
    };
    const res = mockRes();

    await orderController.downloadPrintPdf(req, res);

    assertEqual(res.statusCode, 200, 'HTTP status code should be 200');
    assert(res.body !== null, 'Response body should not be null');
    assert(res.statusCode !== 500, 'Response should not be status 500');
  });

  // Clean up
  try {
    fs.unlinkSync(dummyFilePath);
  } catch (e) {}

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runDownloadPrintPdfTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
