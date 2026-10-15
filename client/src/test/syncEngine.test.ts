import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { MonefyDatabase } from '../db/localDb';
import { SyncEngine } from '../db/syncEngine';

describe('Client Delta Sync Engine Seam Tests', () => {
  let db: MonefyDatabase;
  let syncEngine: SyncEngine;

  beforeEach(async () => {
    localStorage.clear();
    db = new MonefyDatabase(`test-sync-${Date.now()}`);
    await db.open();
    syncEngine = new SyncEngine('http://mock-api');
  });

  afterEach(async () => {
    await db.delete();
    vi.restoreAllMocks();
  });

  it('records offline mutations in syncQueue and pushes them upon sync', async () => {
    // Add transaction locally while offline
    const txId = await db.addTransaction({
      amount: 42,
      type: 'expense',
      categoryId: 'cat-test',
      accountId: 'acc-test',
      note: 'Offline coffee',
    });

    const queueItems = await db.syncQueue.toArray();
    expect(queueItems.length).toBeGreaterThan(0);
    expect(queueItems[0].entityId).toBe(txId);

    // Set auth token
    syncEngine.setAuthToken('mock-jwt-token');

    // Mock fetch
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

    // Queue should now be drained
    const remainingQueue = await db.syncQueue.toArray();
    expect(remainingQueue).toHaveLength(0);
  });

  it('resolves incoming remote changes using Last-Write-Wins', async () => {
    syncEngine.setAuthToken('mock-jwt-token');

    // Seed local transaction
    const initialDate = '2026-10-15T10:00:00Z';
    await db.transactions.add({
      id: 'tx-remote-1',
      amount: 20,
      type: 'expense',
      categoryId: 'cat-food',
      accountId: 'acc-cash',
      note: 'Initial Note',
      date: initialDate,
      createdAt: initialDate,
      updatedAt: initialDate,
      isDeleted: false,
    });

    // Mock pull returning a newer remote update (updatedAt 12:00:00Z)
    const remoteUpdateDate = '2026-10-15T12:00:00Z';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/sync/push')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', serverTime: remoteUpdateDate }),
        });
      }
      if (url.includes('/api/sync/pull')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [],
              categories: [],
              transactions: [
                {
                  id: 'tx-remote-1',
                  amount: 25,
                  type: 'expense',
                  categoryId: 'cat-food',
                  accountId: 'acc-cash',
                  note: 'Updated by cloud',
                  date: initialDate,
                  createdAt: initialDate,
                  updatedAt: remoteUpdateDate,
                  isDeleted: false,
                },
              ],
              budgets: [],
              serverTime: remoteUpdateDate,
            }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await syncEngine.sync(db);
    expect(result.pulled).toBe(1);

    const updatedLocal = await db.transactions.get('tx-remote-1');
    expect(updatedLocal?.amount).toBe(25);
    expect(updatedLocal?.note).toBe('Updated by cloud');
  });
});
