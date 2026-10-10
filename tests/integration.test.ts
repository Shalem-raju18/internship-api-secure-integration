/**
 * EdVyro Task 04: Secure Application Integration Test Suite
 * Tests end-to-end functionality, security headers, validation, rate limiting, and SQLite persistence.
 */

import { app } from '../src/server/app.ts';
import { db, initDatabase, getApplications } from '../src/server/db.ts';
import type { Server } from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];
let server: Server;
let BASE_URL = 'http://127.0.0.1:3999';

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ name, passed: true, durationMs });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ name, passed: false, details: err.message, durationMs });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms): ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function startTestServer(): Promise<void> {
  await initDatabase();
  return new Promise((resolve) => {
    server = app.listen(3999, '127.0.0.1', () => {
      resolve();
    });
  });
}

async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function main() {
  console.log('====================================================');
  console.log('EdVyro Task 04: Secure Application Integration Tests');
  console.log('====================================================\n');

  await startTestServer();

  try {
    // 1. Health and Database Connection
    await runTest('GET /api/health returns 200 and healthy SQLite status', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.success === true, 'Expected success: true');
      assert(data.database === 'connected', 'Expected database: connected');
      assert(data.security.sqlParameterized === true, 'Expected sqlParameterized: true');
    });

    // 2. Fetch Internships from SQLite
    await runTest('GET /api/internships returns array of seeded internships', async () => {
      const res = await fetch(`${BASE_URL}/api/internships`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.success === true, 'Expected success: true');
      assert(Array.isArray(data.data), 'Expected data to be an array');
      assert(data.data.length >= 6, `Expected at least 6 internships, found ${data.data.length}`);
      assert(data.data[0].title !== undefined, 'Expected internship record to have a title');
      assert(data.data[0].company !== undefined, 'Expected internship record to have a company');
    });

    // 3. Internship Filtering
    await runTest('GET /api/internships?category=Software+Engineering filters correctly', async () => {
      const res = await fetch(`${BASE_URL}/api/internships?category=Software%20Engineering`);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert(data.success === true, 'Expected success: true');
      assert(data.data.every((i: any) => i.category === 'Software Engineering'), 'All filtered items must match category');
    });

    // 4. Successful Application Submission (POST /api/applications)
    const testEmail = `tester_${Date.now()}@university.edu`;
    let createdApplicationId = '';

    await runTest('POST /api/applications creates valid record and returns 201', async () => {
      const payload = {
        internship_id: 'int-001',
        name: 'Jordan Lee',
        email: testEmail,
        message: 'I have 2 years of experience with React and TypeScript and would love to join your team.'
      };

      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert(res.status === 201, `Expected 201 Created, got ${res.status}`);
      const data = await res.json();
      assert(data.success === true, 'Expected success: true');
      assert(data.data.name === 'Jordan Lee', 'Applicant name mismatch');
      assert(data.data.email === testEmail.toLowerCase(), 'Applicant email mismatch');
      assert(data.data.status === 'submitted', 'Default status must be submitted');
      createdApplicationId = data.data.id;
    });

    // 5. Database Persistence Verification
    await runTest('Verify application persistence directly in SQLite database', async () => {
      assert(createdApplicationId !== '', 'Previous test must have created an ID');
      const apps = await getApplications(testEmail);
      assert(apps.length === 1, `Expected 1 application in SQLite, found ${apps.length}`);
      assert(apps[0].id === createdApplicationId, 'Application ID does not match database record');
      assert(apps[0].internship_id === 'int-001', 'Internship ID does not match database record');
    });

    // 6. Duplicate Submission Rejection
    await runTest('Duplicate application submission rejects with 409 Conflict', async () => {
      const duplicatePayload = {
        internship_id: 'int-001',
        name: 'Jordan Lee',
        email: testEmail,
        message: 'Second attempt applying for the exact same position.'
      };

      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatePayload)
      });

      assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
      const data = await res.json();
      assert(data.success === false, 'Expected success: false');
      assert(data.error.includes('already submitted'), 'Expected duplicate error message');
    });

    // 7. Validation - Missing Required Fields
    await runTest('POST /api/applications with empty fields returns 400 Bad Request', async () => {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
      const data = await res.json();
      assert(data.success === false, 'Expected success: false');
      assert(data.details.internship_id !== undefined, 'Missing internship_id error');
      assert(data.details.name !== undefined, 'Missing name error');
      assert(data.details.email !== undefined, 'Missing email error');
      assert(data.details.message !== undefined, 'Missing message error');
    });

    // 8. Validation - Invalid Email Format
    await runTest('POST /api/applications with invalid email format returns 400', async () => {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internship_id: 'int-001',
          name: 'Jane Doe',
          email: 'not-an-email',
          message: 'Valid statement explaining interest in this company.'
        })
      });

      assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
      const data = await res.json();
      assert(data.details.email !== undefined, 'Expected email validation error');
      assert(data.details.email.includes('valid email'), 'Expected valid email error message');
    });

    // 9. Validation - Message Too Short
    await runTest('POST /api/applications with short message (<10 chars) returns 400', async () => {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internship_id: 'int-001',
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Hi'
        })
      });

      assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
      const data = await res.json();
      assert(data.details.message !== undefined, 'Expected message length error');
    });

    // 10. Validation - Nonexistent Internship ID
    await runTest('POST /api/applications with invalid internship_id returns 400', async () => {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internship_id: 'non-existent-999',
          name: 'Jane Doe',
          email: 'jane@example.com',
          message: 'Valid statement explaining interest in this company.'
        })
      });

      assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
      const data = await res.json();
      assert(data.details.internship_id.includes('does not exist'), 'Expected non-existent internship error');
    });

    // 11. Security - Helmet HTTP Headers
    await runTest('Verify Helmet security headers are present in response', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert(res.headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options: nosniff');
      assert(res.headers.get('strict-transport-security') !== null, 'Missing Strict-Transport-Security');
      assert(res.headers.get('x-download-options') === 'noopen', 'Missing X-Download-Options');
    });

    // 12. Security - Rate Limiting Headers
    await runTest('Verify express-rate-limit headers on /api endpoints', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      const limit = res.headers.get('ratelimit-limit');
      const remaining = res.headers.get('ratelimit-remaining');
      assert(limit !== null, 'Expected RateLimit-Limit header');
      assert(remaining !== null, 'Expected RateLimit-Remaining header');
    });

    // 13. Security - Request Body Size Limit (>10KB rejected)
    await runTest('Payload exceeding 10KB is rejected with 413 Payload Too Large', async () => {
      const largePayload = {
        internship_id: 'int-001',
        name: 'Jane Doe',
        email: 'jane@example.com',
        message: 'A'.repeat(15000) // 15KB string
      };

      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });

      assert(res.status === 413, `Expected 413 Payload Too Large, got ${res.status}`);
    });

  } finally {
    await stopTestServer();
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedCount} Passed, ${failedCount} Failed (Total: ${results.length})`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
