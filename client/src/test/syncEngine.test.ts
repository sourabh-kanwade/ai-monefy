import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { MonefyDatabase } from '../db/localDb';
import { SyncEngine, syncEngine as defaultSyncEngine } from '../db/syncEngine';

describe('Client Delta Sync Engine Unit Tests', () => {
  let db: MonefyDatabase;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    localStorage.clear();
    db = new MonefyDatabase(`test-sync-${Date.now()}-${Math.random()}`);
    await db.open();
    syncEngine = new SyncEngine('http://mock-api');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles auth token, user state, and last sync getters/setters', () => {
    expect(syncEngine.getAuthToken()).toBeNull();
    syncEngine.setAuthToken('token-123');
    expect(syncEngine.getAuthToken()).toBe('token-123');
    syncEngine.setAuthToken(null);
    expect(syncEngine.getAuthToken()).toBeNull();

    expect(syncEngine.getAuthUser()).toBeNull();
    syncEngine.setAuthUser({ id: 'u1', email: 'test@user.com', name: 'Tester' });
    expect(syncEngine.getAuthUser()?.email).toBe('test@user.com');

    // Test malformed auth user JSON in storage
    localStorage.setItem('ai_monefy_auth_user', 'invalid-json{');
    expect(syncEngine.getAuthUser()).toBeNull();

    syncEngine.setAuthUser(null);
    expect(syncEngine.getAuthUser()).toBeNull();

    expect(syncEngine.getLastSyncTime()).toBeNull();
    syncEngine.setLastSyncTime('2026-10-15T12:00:00Z');
    expect(syncEngine.getLastSyncTime()).toBe('2026-10-15T12:00:00Z');

    expect(syncEngine.isGuestMigrated()).toBe(false);
    syncEngine.setGuestMigrated(true);
    expect(syncEngine.isGuestMigrated()).toBe(true);

    syncEngine.logout();
    expect(syncEngine.getAuthToken()).toBeNull();
    expect(syncEngine.getAuthUser()).toBeNull();
    expect(syncEngine.getLastSyncTime()).toBeNull();

    expect(defaultSyncEngine).toBeInstanceOf(SyncEngine);
  });

  it('returns offline status when no auth token is set', async () => {
    const res = await syncEngine.sync(db);
    expect(res.status).toBe('offline');
    expect(res.pushed).toBe(0);
    expect(res.pulled).toBe(0);
  });

  it('handles guest migration full push and drains syncQueue', async () => {
    syncEngine.setAuthToken('token-xyz');
    syncEngine.setGuestMigrated(false);

    await db.initializeDefaults();

    // Add local transaction
    const txId = await db.addTransaction({
      amount: 42,
      type: 'expense',
      categoryId: 'cat-test',
      accountId: 'acc-test',
      note: 'Offline coffee',
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', serverTime: '2026-10-15T15:00:00Z' }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [],
              categories: [],
              transactions: [],
              budgets: [],
              serverTime: '2026-10-15T15:00:00Z',
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    globalThis.fetch = mockFetch;

    const result = await syncEngine.sync(db);
    expect(result.status).toBe('success');
    expect(result.pushed).toBeGreaterThan(0);
    expect(syncEngine.isGuestMigrated()).toBe(true);

    const remainingQueue = await db.syncQueue.toArray();
    expect(remainingQueue).toHaveLength(0);
  });

  it('handles incremental queue push and server-side errors', async () => {
    syncEngine.setAuthToken('token-xyz');
    syncEngine.setGuestMigrated(true);

    await db.accounts.add({
      id: 'acc-1',
      name: 'Cash',
      icon: 'cash',
      color: '#fff',
      initialBalance: 100,
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    await db.syncQueue.add({
      id: 'q-1',
      entityType: 'account',
      entityId: 'acc-1',
      action: 'create',
      payload: { id: 'acc-1', name: 'Cash' },
      timestamp: '2026-10-15T10:00:00Z',
    });

    await db.budgets.add({
      id: 'b-sync-1',
      categoryId: 'cat-1',
      monthlyLimit: 500,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    await db.syncQueue.add({
      id: 'q-b1',
      entityType: 'budget',
      entityId: 'b-sync-1',
      action: 'create',
      payload: { id: 'b-sync-1' },
      timestamp: '2026-10-15T10:00:00Z',
    });

    await db.categories.add({
      id: 'cat-sync-1',
      name: 'Groceries',
      icon: 'cart',
      color: '#00f',
      type: 'expense',
      isDefault: false,
      isDeleted: false,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    await db.syncQueue.add({
      id: 'q-c1',
      entityType: 'category',
      entityId: 'cat-sync-1',
      action: 'create',
      payload: { id: 'cat-sync-1' },
      timestamp: '2026-10-15T10:00:00Z',
    });

    await db.transactions.add({
      id: 'tx-sync-1',
      amount: 42,
      type: 'expense',
      categoryId: 'cat-sync-1',
      accountId: 'acc-1',
      date: '2026-10-15T10:00:00Z',
      isDeleted: false,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    });
    await db.syncQueue.add({
      id: 'q-t1',
      entityType: 'transaction',
      entityId: 'tx-sync-1',
      action: 'create',
      payload: { id: 'tx-sync-1' },
      timestamp: '2026-10-15T10:00:00Z',
    });

    // Mock push error
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server push rejected' }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await syncEngine.sync(db);
    expect(result.status).toBe('error');
    expect(result.error).toMatch(/Sync push failed with status 500/);

    // Mock pull error (line 204-205)
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ pushed: 1 }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server pull error' }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const pullErrResult = await syncEngine.sync(db);
    expect(pullErrResult.status).toBe('error');
    expect(pullErrResult.error).toMatch(/Sync pull failed with status 500/);

    // Mock network fetch throw
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));
    const netErrResult = await syncEngine.sync(db);
    expect(netErrResult.status).toBe('error');
    expect(netErrResult.error).toMatch(/Network unreachable/);
  });

  it('pulls remote accounts, categories, transactions, and budgets with Last-Write-Wins', async () => {
    syncEngine.setAuthToken('token-xyz');
    syncEngine.setGuestMigrated(true);

    // Seed local items
    const oldTime = '2026-10-15T10:00:00Z';
    const newerTime = '2026-10-15T12:00:00Z';
    const futureTime = '2026-10-15T14:00:00Z';

    await db.accounts.add({
      id: 'acc-pull-1',
      name: 'Old Checking',
      icon: 'bank',
      color: '#111',
      initialBalance: 50,
      isDefault: true,
      isDeleted: false,
      createdAt: oldTime,
      updatedAt: newerTime,
    });

    await db.categories.add({
      id: 'cat-pull-1',
      name: 'Old Food',
      icon: 'food',
      color: '#222',
      type: 'expense',
      isDefault: false,
      isDeleted: false,
      displayOrder: 0,
      isVisible: true,
      createdAt: oldTime,
      updatedAt: oldTime,
    });

    await db.budgets.add({
      id: 'budget-pull-1',
      categoryId: 'cat-pull-1',
      monthlyLimit: 100,
      createdAt: oldTime,
      updatedAt: oldTime,
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success' }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [
                {
                  id: 'acc-pull-1',
                  name: 'Ignored Older Remote',
                  icon: 'bank',
                  color: '#111',
                  initialBalance: 50,
                  isDefault: true,
                  isDeleted: false,
                  createdAt: oldTime,
                  updatedAt: oldTime, // Older than local newerTime -> ignored
                },
                {
                  id: 'acc-pull-2',
                  name: 'New Cloud Account',
                  icon: 'card',
                  color: '#333',
                  initialBalance: 200,
                  isDefault: false,
                  isDeleted: false,
                  createdAt: newerTime,
                  updatedAt: newerTime,
                },
              ],
              categories: [
                {
                  id: 'cat-pull-1',
                  name: 'Newer Remote Food',
                  icon: 'food',
                  color: '#444',
                  type: 'expense',
                  isDefault: false,
                  isDeleted: false,
                  createdAt: oldTime,
                  updatedAt: newerTime,
                },
              ],
              transactions: [
                {
                  id: 'tx-pull-1',
                  amount: 88,
                  type: 'expense',
                  categoryId: 'cat-pull-1',
                  accountId: 'acc-pull-1',
                  note: 'Remote lunch',
                  date: newerTime,
                  createdAt: newerTime,
                  updatedAt: newerTime,
                  isDeleted: false,
                },
              ],
              budgets: [
                {
                  id: 'budget-pull-1',
                  categoryId: 'cat-pull-1',
                  monthlyLimit: 250,
                  createdAt: oldTime,
                  updatedAt: futureTime,
                },
              ],
              serverTime: futureTime,
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const res = await syncEngine.sync(db);
    expect(res.status).toBe('success');
    expect(res.pulled).toBeGreaterThan(0);

    // acc-pull-1 should retain local newer name
    const acc1 = await db.accounts.get('acc-pull-1');
    expect(acc1?.name).toBe('Old Checking');

    // acc-pull-2 should be added
    const acc2 = await db.accounts.get('acc-pull-2');
    expect(acc2?.name).toBe('New Cloud Account');

    // cat-pull-1 should be updated
    const cat1 = await db.categories.get('cat-pull-1');
    expect(cat1?.name).toBe('Newer Remote Food');

    // budget-pull-1 should be updated
    const b1 = await db.budgets.get('budget-pull-1');
    expect(b1?.monthlyLimit).toBe(250);
  });

  it('performs register and login successfully and catches errors', async () => {
    // Mock successful register
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              token: 'reg-token-123',
              user: { id: 'u-reg', email: 'reg@test.com', name: 'Reg User' },
            }),
        });
      }
      if (url.includes('/api/sync/push') || url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [], categories: [], transactions: [], budgets: [] }),
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    const registeredUser = await syncEngine.register('reg@test.com', 'Pass1234', 'Reg User', db);
    expect(registeredUser.email).toBe('reg@test.com');
    expect(syncEngine.getAuthToken()).toBe('reg-token-123');

    // Mock register failure
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Email already registered' }),
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    await expect(syncEngine.register('reg@test.com', 'Pass1234', 'Reg User', db)).rejects.toThrow(
      'Email already registered'
    );

    // Mock successful login
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              token: 'login-token-456',
              user: { id: 'u-login', email: 'login@test.com', name: 'Login User' },
            }),
        });
      }
      if (url.includes('/api/sync/push') || url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ accounts: [], categories: [], transactions: [], budgets: [] }),
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    const loggedInUser = await syncEngine.login('login@test.com', 'Pass1234', db);
    expect(loggedInUser.email).toBe('login@test.com');
    expect(syncEngine.getAuthToken()).toBe('login-token-456');

    // Mock login failure
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid email or password' }),
        });
      }
      return Promise.reject(new Error('Unknown'));
    });

    await expect(syncEngine.login('bad@test.com', 'wrong', db)).rejects.toThrow(
      'Invalid email or password'
    );
  });
});
