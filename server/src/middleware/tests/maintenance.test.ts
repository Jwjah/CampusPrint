/**
 * Integration & Unit Tests for Global Maintenance Mode
 * 
 * Runs with:
 *   npx ts-node src/middleware/tests/maintenance.test.ts
 */

const http = require('http');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../../config/database');
const { setMaintenanceMode, clearMaintenanceCache, isMaintenanceModeEnabled } = require('../../utils/maintenanceManager');
const maintenanceMiddleware = require('../maintenance');

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

function makeRequest(server: any, path: string, headers: any = {}): Promise<{ status: number, body: any }> {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const options = {
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method: 'GET',
      headers,
    };

    const req = http.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runMaintenanceTests() {
  console.log('Running Global Maintenance Mode Integration Tests...\n');

  // Setup test express app
  const app = express();
  app.use(express.json());
  app.use('/api', maintenanceMiddleware);

  // Mock routes
  app.get('/api/test-endpoint', (req: any, res: any) => {
    res.json({ success: true, message: 'Normal response' });
  });

  app.get('/api/auth/login', (req: any, res: any) => {
    res.json({ success: true, message: 'Login allowed' });
  });

  app.get('/api/auth/me', (req: any, res: any) => {
    res.json({ success: true, message: 'Me endpoint allowed' });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  // Seed test users in db
  const testAdminEmail = `admin_maint_${Date.now()}@test.com`;
  const testStudentEmail = `student_maint_${Date.now()}@test.com`;
  const testShopEmail = `shop_maint_${Date.now()}@test.com`;
  const testAgentEmail = `agent_maint_${Date.now()}@test.com`;

  const [adminRes] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Maint Admin', ?, 'pass', 'admin', 1)", [testAdminEmail]);
  const [studentRes] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Maint Student', ?, 'pass', 'student', 1)", [testStudentEmail]);
  const [shopRes] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Maint Shop', ?, 'pass', 'shop', 1)", [testShopEmail]);
  const [agentRes] = await db.execute("INSERT INTO users (name, email, password, role, is_verified) VALUES ('Maint Agent', ?, 'pass', 'agent', 1)", [testAgentEmail]);

  const adminId = adminRes.insertId;
  const studentId = studentRes.insertId;
  const shopId = shopRes.insertId;
  const agentId = agentRes.insertId;

  const secret = process.env.JWT_SECRET || 'dev_secret_key_123';
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = secret;

  const adminToken = jwt.sign({ id: adminId, role: 'admin' }, secret);
  const studentToken = jwt.sign({ id: studentId, role: 'student' }, secret);
  const shopToken = jwt.sign({ id: shopId, role: 'shop' }, secret);
  const agentToken = jwt.sign({ id: agentId, role: 'agent' }, secret);

  try {
    // 1. Maintenance OFF
    await setMaintenanceMode(false);
    await test('When Maintenance is OFF -> Guest request allowed (200)', async () => {
      const res = await makeRequest(server, '/api/test-endpoint');
      assertEqual(res.status, 200, 'HTTP status');
      assertEqual(res.body.success, true, 'response success');
    });

    await test('When Maintenance is OFF -> Student request allowed (200)', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${studentToken}` });
      assertEqual(res.status, 200, 'HTTP status');
    });

    // 2. Maintenance ON
    await setMaintenanceMode(true);
    assertEqual(await isMaintenanceModeEnabled(), true, 'Maintenance mode enabled state');

    await test('When Maintenance is ON -> Guest request blocked with HTTP 503', async () => {
      const res = await makeRequest(server, '/api/test-endpoint');
      assertEqual(res.status, 503, 'HTTP status');
      assertEqual(res.body.success, false, 'body success');
      assertEqual(res.body.message, 'CampusPrint is temporarily unavailable due to scheduled maintenance.', '503 message');
    });

    await test('When Maintenance is ON -> Student request blocked with HTTP 503', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${studentToken}` });
      assertEqual(res.status, 503, 'HTTP status');
    });

    await test('When Maintenance is ON -> Print Shop request blocked with HTTP 503', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${shopToken}` });
      assertEqual(res.status, 503, 'HTTP status');
    });

    await test('When Maintenance is ON -> Delivery Agent request blocked with HTTP 503', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${agentToken}` });
      assertEqual(res.status, 503, 'HTTP status');
    });

    await test('When Maintenance is ON -> Admin user request ALLOWED (200)', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${adminToken}` });
      assertEqual(res.status, 200, 'Admin HTTP status');
      assertEqual(res.body.success, true, 'Admin response body');
    });

    await test('When Maintenance is ON -> Auth login & me endpoints EXEMPT (200)', async () => {
      const resLogin = await makeRequest(server, '/api/auth/login');
      assertEqual(resLogin.status, 200, 'Login status');

      const resMe = await makeRequest(server, '/api/auth/me');
      assertEqual(resMe.status, 200, 'Me status');
    });

    // 3. Reset Maintenance to OFF
    await setMaintenanceMode(false);
    await test('Disabling Maintenance Mode restores normal traffic (200)', async () => {
      const res = await makeRequest(server, '/api/test-endpoint', { 'authorization': `Bearer ${studentToken}` });
      assertEqual(res.status, 200, 'Restored HTTP status');
    });

  } finally {
    server.close();
    // Cleanup seeded test users
    await db.execute('DELETE FROM users WHERE id IN (?, ?, ?, ?)', [adminId, studentId, shopId, agentId]);
    await setMaintenanceMode(false);
  }

  setTimeout(() => {
    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  }, 100);
}

runMaintenanceTests();
