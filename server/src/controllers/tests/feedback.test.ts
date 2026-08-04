/**
 * Unit & Integration Tests for In-App Feedback System
 * 
 * Runs with:
 *   npx ts-node src/controllers/tests/feedback.test.ts
 */

const db = require('../../config/database');
const feedbackController = require('../feedbackController');

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
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function runFeedbackTests() {
  console.log('Running In-App Feedback System Unit & Integration Tests...\n');

  // Seed test users
  const testUserEmail = `feedback_user_${Date.now()}@test.com`;
  const testUser2Email = `feedback_user2_${Date.now()}@test.com`;

  const [u1] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Feedback User 1', ?, 'pass', 'student', 1)", [testUserEmail]);
  const [u2] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Feedback User 2', ?, 'pass', 'shop', 1)", [testUser2Email]);

  const user1 = { id: u1.insertId, role: 'student', email: testUserEmail, name: 'Feedback User 1' };
  const user2 = { id: u2.insertId, role: 'shop', email: testUser2Email, name: 'Feedback User 2' };

  let createdFeedbackId = '';

  try {
    // 1. Validation checks
    await test('Validation rejects invalid feedback category', async () => {
      const req = { user: user1, body: { category: 'Invalid Category', subject: 'Test', message: 'Test message' } };
      const res = mockRes();
      await feedbackController.submitFeedback(req, res);
      assertEqual(res.statusCode, 400, 'status');
      assert(res.body.error.includes('Invalid category'), 'error text');
    });

    await test('Validation rejects subject longer than 120 characters', async () => {
      const longSubject = 'A'.repeat(121);
      const req = { user: user1, body: { category: 'Bug Report', subject: longSubject, message: 'Valid message' } };
      const res = mockRes();
      await feedbackController.submitFeedback(req, res);
      assertEqual(res.statusCode, 400, 'status');
      assert(res.body.error.includes('120 characters'), 'error text');
    });

    await test('Validation rejects rating out of 1-5 range', async () => {
      const req = { user: user1, body: { category: 'Bug Report', subject: 'Valid', message: 'Valid', rating: 6 } };
      const res = mockRes();
      await feedbackController.submitFeedback(req, res);
      assertEqual(res.statusCode, 400, 'status');
      assert(res.body.error.includes('between 1 and 5'), 'error text');
    });

    // 2. Successful Submission
    await test('Successful feedback submission generates FB-XXXXXXXX ID', async () => {
      const req = {
        user: user1,
        body: {
          category: 'Bug Report',
          subject: 'Payment failed during checkout',
          message: 'Razorpay popup closed unexpectedly while printing single page.',
          rating: 4,
        }
      };
      const res = mockRes();
      await feedbackController.submitFeedback(req, res);
      assertEqual(res.statusCode, 201, 'status');
      assert(res.body.success === true, 'success');
      assert(typeof res.body.feedback_id === 'string' && res.body.feedback_id.startsWith('FB-'), 'feedback_id format');
      createdFeedbackId = res.body.feedback_id;
    });

    // 3. User History & Privacy Isolation
    await test('getMyFeedback returns submitted feedback for user 1', async () => {
      const req = { user: user1 };
      const res = mockRes();
      await feedbackController.getMyFeedback(req, res);
      assertEqual(res.statusCode, 200, 'status');
      assert(Array.isArray(res.body.feedback), 'feedback list array');
      assert(res.body.feedback.length >= 1, 'contains submission');
      assertEqual(res.body.feedback[0].feedback_id, createdFeedbackId, 'matched feedback_id');
    });

    await test('User 2 cannot see User 1 feedback via getMyFeedback', async () => {
      const req = { user: user2 };
      const res = mockRes();
      await feedbackController.getMyFeedback(req, res);
      assertEqual(res.statusCode, 200, 'status');
      assert(Array.isArray(res.body.feedback), 'feedback list array');
      const found = res.body.feedback.find((f: any) => f.feedback_id === createdFeedbackId);
      assertEqual(found, undefined, 'user 2 cannot view user 1 feedback');
    });

    // 4. Admin Search, Filter & Status Updates
    await test('Admin getAdminFeedback retrieves all submissions', async () => {
      const req = { query: {} };
      const res = mockRes();
      await feedbackController.getAdminFeedback(req, res);
      assertEqual(res.statusCode, 200, 'status');
      assert(Array.isArray(res.body.feedback), 'admin feedback list array');
      const item = res.body.feedback.find((f: any) => f.feedback_id === createdFeedbackId);
      assert(item !== undefined, 'admin found feedback');
      assertEqual(item.user_name, 'Feedback User 1', 'user_name');
    });

    await test('Admin filter by status and category', async () => {
      const req = { query: { status: 'New', category: 'Bug Report' } };
      const res = mockRes();
      await feedbackController.getAdminFeedback(req, res);
      assertEqual(res.statusCode, 200, 'status');
      assert(res.body.feedback.length >= 1, 'filtered list');
    });

    await test('Admin update status and admin_notes', async () => {
      const req = {
        params: { id: createdFeedbackId },
        body: { status: 'In Review', admin_notes: 'Investigating Razorpay gateway callback logs.' }
      };
      const res = mockRes();
      await feedbackController.updateFeedbackStatus(req, res);
      assertEqual(res.statusCode, 200, 'status');
      assertEqual(res.body.feedback.status, 'In Review', 'updated status');
      assertEqual(res.body.feedback.admin_notes, 'Investigating Razorpay gateway callback logs.', 'updated notes');
    });

  } finally {
    // Cleanup test data
    await db.execute('DELETE FROM feedback WHERE user_id IN (?, ?)', [user1.id, user2.id]);
    await db.execute('DELETE FROM users WHERE id IN (?, ?)', [user1.id, user2.id]);
  }

  setTimeout(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  }, 100);
}

runFeedbackTests();
