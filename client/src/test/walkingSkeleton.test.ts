import { describe, it, expect, beforeEach } from 'vitest';
import { MonefyDatabase, generateUuid } from '../db/localDb';

describe('Ticket 01: Walking Skeleton Seam Tests', () => {
  let db: MonefyDatabase;

  beforeEach(async () => {
    // Generate unique database name for test isolation
    const dbName = `test_monefy_${Date.now()}_${Math.random()}`;
    db = new MonefyDatabase(dbName);
    await db.initializeDefaults();
  });

  it('initializes default system categories and accounts automatically on first run', async () => {
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();

    expect(categories.length).toBeGreaterThan(0);
    expect(accounts.length).toBeGreaterThan(0);

    const foodCategory = categories.find((c) => c.name.toLowerCase() === 'food');
    const salaryCategory = categories.find((c) => c.name.toLowerCase() === 'salary');
    const cashAccount = accounts.find((a) => a.name.toLowerCase() === 'cash');

    expect(foodCategory).toBeDefined();
    expect(foodCategory?.type).toBe('expense');
    expect(salaryCategory).toBeDefined();
    expect(salaryCategory?.type).toBe('income');
    expect(cashAccount).toBeDefined();
  });

  it('persists entered transaction and calculates net balance', async () => {
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();
    const cashAccount = accounts[0];
    const foodCat = categories.find((c) => c.type === 'expense')!;

    const txId = await db.addTransaction({
      amount: 45.5,
      type: 'expense',
      categoryId: foodCat.id,
      accountId: cashAccount.id,
      note: 'Grocery haul',
      date: new Date().toISOString(),
    });

    const tx = await db.transactions.get(txId);
    expect(tx).toBeDefined();
    expect(tx?.amount).toBe(45.5);
    expect(tx?.note).toBe('Grocery haul');

    const netBalance = await db.calculateNetBalance();
    expect(netBalance).toBe(-45.5);
  });

  it('reloads saved transactions and balance after re-opening database', async () => {
    const dbName = db.name;
    const accounts = await db.accounts.toArray();
    const categories = await db.categories.toArray();

    await db.addTransaction({
      amount: 1200,
      type: 'income',
      categoryId: categories.find((c) => c.type === 'income')!.id,
      accountId: accounts[0].id,
      note: 'Monthly paycheck',
      date: new Date().toISOString(),
    });

    await db.addTransaction({
      amount: 50,
      type: 'expense',
      categoryId: categories.find((c) => c.type === 'expense')!.id,
      accountId: accounts[0].id,
      note: 'Fuel',
      date: new Date().toISOString(),
    });

    // Close and reopen database with same name to simulate reload
    db.close();
    const reloadedDb = new MonefyDatabase(dbName);

    const transactions = await reloadedDb.getRecentTransactions();
    expect(transactions.length).toBe(2);

    const balance = await reloadedDb.calculateNetBalance();
    expect(balance).toBe(1150);
    reloadedDb.close();
  });

  it('migrates legacy categories without displayOrder or isVisible on initializeDefaults', async () => {
    const legacyDb = new MonefyDatabase(`test_legacy_${Date.now()}`);
    await legacyDb.open();
    await legacyDb.categories.add({
      id: 'legacy-cat-1',
      name: 'Legacy Cat',
      icon: 'Tag',
      color: '#fff',
      type: 'expense',
      isDefault: false,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    } as any);

    await legacyDb.initializeDefaults();

    const migrated = await legacyDb.categories.get('legacy-cat-1');
    expect(migrated?.displayOrder).toBeDefined();
    expect(migrated?.isVisible).toBe(true);
    await legacyDb.delete();
  });

  it('falls back to regex uuid generation when crypto.randomUUID is unavailable', () => {
    const origCrypto = globalThis.crypto;
    delete (globalThis as any).crypto;
    try {
      const id = generateUuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    } finally {
      (globalThis as any).crypto = origCrypto;
    }
  });
});
