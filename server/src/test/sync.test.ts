import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { initDb, pool } from '../db/db.js';

describe('Delta Synchronization Endpoints Seam Tests', () => {
  const userAEmail = `synca-${Date.now()}@monefy.test`;
  const userBEmail = `syncb-${Date.now()}@monefy.test`;
  const password = 'Password123!';
  let tokenA = '';
  let tokenB = '';

  const sampleAccountId = '11111111-1111-4111-8111-111111111111';
  const sampleCategoryId = '22222222-2222-4222-8222-222222222222';
  const sampleTxId = '33333333-3333-4333-8333-333333333333';

  beforeAll(async () => {
    await initDb();

    // Register User A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ email: userAEmail, password, name: 'User A' });
    tokenA = resA.body.token;

    // Register User B
    const resB = await request(app)
      .post('/api/auth/register')
      .send({ email: userBEmail, password, name: 'User B' });
    tokenB = resB.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [userAEmail, userBEmail]);
    await pool.end();
  });

  it('POST /api/sync/push saves local client records and GET /api/sync/pull retrieves them', async () => {
    const pushPayload = {
      accounts: [
        {
          id: sampleAccountId,
          name: 'Main Checking',
          icon: 'CreditCard',
          color: '#3B82F6',
          initialBalance: 1000,
          isDefault: true,
          isDeleted: false,
          createdAt: '2026-10-15T10:00:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
        },
      ],
      categories: [
        {
          id: sampleCategoryId,
          name: 'Coffee',
          icon: 'Coffee',
          color: '#D97706',
          type: 'expense' as const,
          isDefault: false,
          isDeleted: false,
          createdAt: '2026-10-15T10:00:00Z',
          updatedAt: '2026-10-15T10:00:00Z',
        },
      ],
      transactions: [
        {
          id: sampleTxId,
          amount: 5.5,
          type: 'expense' as const,
          categoryId: sampleCategoryId,
          accountId: sampleAccountId,
          note: 'Latte',
          date: '2026-10-15T10:30:00Z',
          isDeleted: false,
          createdAt: '2026-10-15T10:30:00Z',
          updatedAt: '2026-10-15T10:30:00Z',
        },
      ],
    };

    const pushRes = await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(pushPayload);

    expect(pushRes.status).toBe(200);
    expect(pushRes.body.status).toBe('success');
    expect(pushRes.body.serverTime).toBeDefined();

    // Pull for User A
    const pullResA = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(pullResA.status).toBe(200);
    expect(pullResA.body.accounts).toHaveLength(1);
    expect(pullResA.body.accounts[0].name).toBe('Main Checking');
    expect(pullResA.body.categories).toHaveLength(1);
    expect(pullResA.body.categories[0].name).toBe('Coffee');
    expect(pullResA.body.transactions).toHaveLength(1);
    expect(pullResA.body.transactions[0].amount).toBe(5.5);

    // Verify User B receives empty (tenant isolation)
    const pullResB = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(pullResB.status).toBe(200);
    expect(pullResB.body.accounts).toHaveLength(0);
    expect(pullResB.body.categories).toHaveLength(0);
  });

  it('resolves concurrent conflicts deterministically via Last-Write-Wins (LWW)', async () => {
    // 1. Send update with newer timestamp: should update
    const newerUpdate = {
      transactions: [
        {
          id: sampleTxId,
          amount: 8.0,
          type: 'expense' as const,
          categoryId: sampleCategoryId,
          accountId: sampleAccountId,
          note: 'Latte Grande',
          date: '2026-10-15T10:30:00Z',
          isDeleted: false,
          updatedAt: '2026-10-15T11:00:00Z',
        },
      ],
    };

    await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(newerUpdate);

    let pullRes = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(pullRes.body.transactions[0].amount).toBe(8.0);
    expect(pullRes.body.transactions[0].note).toBe('Latte Grande');

    // 2. Send update with older timestamp (stale edit): should be ignored by LWW
    const staleUpdate = {
      transactions: [
        {
          id: sampleTxId,
          amount: 3.0,
          type: 'expense' as const,
          categoryId: sampleCategoryId,
          accountId: sampleAccountId,
          note: 'Old Stale Note',
          date: '2026-10-15T10:30:00Z',
          isDeleted: false,
          updatedAt: '2026-10-15T09:00:00Z', // older than 11:00:00Z
        },
      ],
    };

    await request(app)
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(staleUpdate);

    pullRes = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', `Bearer ${tokenA}`);

    // Stale edit was rejected; newer edit persists!
    expect(pullRes.body.transactions[0].amount).toBe(8.0);
    expect(pullRes.body.transactions[0].note).toBe('Latte Grande');
  });

  it('GET /api/sync/pull filters delta by since timestamp', async () => {
    const pullSinceRes = await request(app)
      .get('/api/sync/pull?since=2026-10-15T12:00:00Z')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(pullSinceRes.status).toBe(200);
    // Nothing modified after 12:00:00Z
    expect(pullSinceRes.body.transactions).toHaveLength(0);
  });
});
