import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { initDb, pool } from '../db/db.js';

describe('Backend Auth & Health Endpoints Seam Tests', () => {
  const testEmail = `user-${Date.now()}@monefy.test`;
  const testPassword = 'Password123!';
  let authToken = '';

  beforeAll(async () => {
    await initDb();
  });

  afterAll(async () => {
    // Cleanup created test user
    if (testEmail) {
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    }
    await pool.end();
  });

  it('GET /api/health returns database connectivity status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
    expect(res.body.timestamp).toBeDefined();
  });

  it('POST /api/auth/register creates user and returns signed JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Test Monefy User',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe('Test Monefy User');
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  it('POST /api/auth/register rejects duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('POST /api/auth/register rejects short passwords', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: `short-${Date.now()}@monefy.test`,
        password: '123',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 6 characters/i);
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/auth/login rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('GET /api/health/auth validates JWT token authorization', async () => {
    // Unauthenticated request
    const unauthRes = await request(app).get('/api/health/auth');
    expect(unauthRes.status).toBe(401);

    // Invalid token request
    const invalidRes = await request(app)
      .get('/api/health/auth')
      .set('Authorization', 'Bearer invalid-token');
    expect(invalidRes.status).toBe(401);

    // Authenticated request
    const authRes = await request(app)
      .get('/api/health/auth')
      .set('Authorization', `Bearer ${authToken}`);
    expect(authRes.status).toBe(200);
    expect(authRes.body.status).toBe('authenticated');
    expect(authRes.body.user.email).toBe(testEmail);
  });
});
