import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { MonefyDatabase } from '../db/localDb';
import { SyncEngine } from '../db/syncEngine';

describe('Local to Cloud Setup & Migration Seam Tests', () => {
  let db: MonefyDatabase;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    localStorage.clear();
    db = new MonefyDatabase(`test-migration-${Date.now()}`);
    await db.open();
    syncEngine = new SyncEngine('http://mock-cloud');
  });

  afterEach(async () => {
    await db.delete();
    vi.restoreAllMocks();
  });

  it('preserves valid numeric net balance and prevents NaN during local-to-cloud migration', async () => {
    const now = '2026-10-15T10:00:00Z';

    // Seed 4 accounts mimicking the Monefy setup (Cash + Card + Savings + Card 2)
    const accCash = {
      id: 'acc-cash',
      name: 'Cash',
      icon: 'Wallet',
      color: '#2ECC71',
      initialBalance: 85461.70,
      isDefault: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const accCard1 = {
      id: 'acc-card-1',
      name: 'Payment Card',
      icon: 'CreditCard',
      color: '#3498DB',
      initialBalance: 0,
      isDefault: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const accSavings = {
      id: 'acc-savings',
      name: 'Savings Account',
      icon: 'PiggyBank',
      color: '#9B59B6',
      initialBalance: 0,
      isDefault: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    const accCard2 = {
      id: 'acc-card-2',
      name: 'Payment Card',
      icon: 'CreditCard',
      color: '#3B82F6',
      initialBalance: 0,
      isDefault: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.accounts.bulkAdd([accCash, accCard1, accSavings, accCard2]);

    // Add expenses totaling 29816
    await db.transactions.bulkAdd([
      {
        id: 'tx-1',
        amount: 10000,
        type: 'expense',
        categoryId: 'cat-bills',
        accountId: 'acc-cash',
        note: 'Bills',
        date: now,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      },
      {
        id: 'tx-2',
        amount: 9790,
        type: 'expense',
        categoryId: 'cat-food',
        accountId: 'acc-cash',
        note: 'Food',
        date: now,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      },
      {
        id: 'tx-3',
        amount: 6600,
        type: 'expense',
        categoryId: 'cat-sports',
        accountId: 'acc-cash',
        note: 'Sports',
        date: now,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      },
      {
        id: 'tx-4',
        amount: 3426,
        type: 'expense',
        categoryId: 'cat-other',
        accountId: 'acc-cash',
        note: 'Other items',
        date: now,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
      },
    ]);

    // Local balance before moving to cloud
    const localBalanceBefore = await db.calculateNetBalance();
    expect(localBalanceBefore).toBe(55645.70);
    expect(isNaN(localBalanceBefore)).toBe(false);

    // Now connect to cloud (set token and initiate guest migration)
    syncEngine.setAuthToken('jwt-user-cloud-token');
    syncEngine.setGuestMigrated(false);

    let pushedPayload: any = null;

    // Mock fetch for push & pull
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/api/sync/push')) {
        pushedPayload = JSON.parse(init?.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', serverTime: '2026-10-15T12:00:00Z' }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        // Remote pull might return numbers or strings from PostgreSQL NUMERIC column
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [
                { ...accCash, initialBalance: '85461.70', updatedAt: '2026-10-15T12:00:00Z' },
                { ...accCard1, initialBalance: '0.00', updatedAt: '2026-10-15T12:00:00Z' },
                { ...accSavings, initialBalance: '0.00', updatedAt: '2026-10-15T12:00:00Z' },
                { ...accCard2, initialBalance: '0.00', updatedAt: '2026-10-15T12:00:00Z' },
              ],
              categories: [],
              transactions: [],
              budgets: [],
              serverTime: '2026-10-15T12:00:00Z',
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const syncResult = await syncEngine.sync(db);
    expect(syncResult.status).toBe('success');
    expect(pushedPayload.accounts).toHaveLength(4);

    // Verify pulled accounts are saved with numeric initialBalance
    const accountsAfter = await db.accounts.toArray();
    for (const acc of accountsAfter) {
      expect(typeof acc.initialBalance).toBe('number');
      expect(isNaN(acc.initialBalance)).toBe(false);
    }

    // Verify net balance after cloud sync: MUST NOT BE NaN
    const netBalanceAfter = await db.calculateNetBalance();
    expect(netBalanceAfter).toBe(55645.70);
    expect(isNaN(netBalanceAfter)).toBe(false);
  });

  it('handles existing corrupted Dexie accounts with string initialBalance without returning NaN', async () => {
    // Manually inject records as strings to simulate legacy/already synced Dexie state
    await db.accounts.bulkAdd([
      {
        id: 'acc-str-1',
        name: 'Card 1',
        icon: 'CreditCard',
        color: '#3498DB',
        initialBalance: '0.00' as any,
        isDefault: false,
        isDeleted: false,
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z',
      },
      {
        id: 'acc-str-2',
        name: 'Card 2',
        icon: 'CreditCard',
        color: '#3498DB',
        initialBalance: '0.00' as any,
        isDefault: false,
        isDeleted: false,
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z',
      },
      {
        id: 'acc-str-cash',
        name: 'Cash',
        icon: 'Wallet',
        color: '#2ECC71',
        initialBalance: '500.00' as any,
        isDefault: true,
        isDeleted: false,
        createdAt: '2026-10-15T10:00:00Z',
        updatedAt: '2026-10-15T10:00:00Z',
      },
    ]);

    await db.transactions.add({
      id: 'tx-coffee',
      amount: 45.50,
      type: 'expense',
      categoryId: 'cat-food',
      accountId: 'acc-str-cash',
      note: 'Coffee',
      date: '2026-10-15T10:00:00Z',
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
      isDeleted: false,
    });

    const netBal = await db.calculateNetBalance();
    expect(isNaN(netBal)).toBe(false);
    expect(netBal).toBe(454.50);
  });
});
