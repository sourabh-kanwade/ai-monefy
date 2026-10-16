import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MonefyDatabase } from '../db/localDb';
import { importTransactionsFromCSV, exportTransactionsToCSV } from '../utils/exportImport';
import type { Category, Account } from '../types';

describe('CSV Database Import & Entity Resolution Engine', () => {
  let db: MonefyDatabase;

  const initialCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food & Dining',
      icon: 'Utensils',
      color: '#FF6B6B',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'cat-salary',
      name: 'Salary',
      icon: 'Briefcase',
      color: '#10B981',
      type: 'income',
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
  ];

  const initialAccounts: Account[] = [
    {
      id: 'acc-cash',
      name: 'Cash',
      icon: 'Banknote',
      color: '#10B981',
      initialBalance: 500,
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'acc-card',
      name: 'Bank Card',
      icon: 'CreditCard',
      color: '#3B82F6',
      initialBalance: 1200,
      isDefault: false,
      isDeleted: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    db = new MonefyDatabase(`test-csv-engine-${Date.now()}`);
    await db.open();
    await db.categories.bulkAdd(initialCategories);
    await db.accounts.bulkAdd(initialAccounts);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('imports native Monefy export CSV and links to existing accounts & categories', async () => {
    const csv = [
      'Date,Type,Category,Account,ToAccount,Amount,Note',
      '2026-10-15T12:00:00Z,expense,Food & Dining,Cash,,45.5,"Lunch special"',
      '2026-10-14T09:00:00Z,income,Salary,Bank Card,,3200,Monthly salary',
      '2026-10-15T14:00:00Z,transfer,Food & Dining,Bank Card,Cash,150,ATM cash withdrawal',
    ].join('\n');

    const result = await importTransactionsFromCSV(csv, db);

    expect(result.importedTransactionsCount).toBe(3);
    expect(result.createdAccountsCount).toBe(0);
    expect(result.createdCategoriesCount).toBe(0);
    expect(result.skippedDuplicatesCount).toBe(0);

    const storedTxs = await db.transactions.toArray();
    expect(storedTxs).toHaveLength(3);

    const expenseTx = storedTxs.find((t) => t.type === 'expense');
    expect(expenseTx).toBeDefined();
    expect(expenseTx?.accountId).toBe('acc-cash');
    expect(expenseTx?.categoryId).toBe('cat-food');
    expect(expenseTx?.amount).toBe(45.5);
    expect(expenseTx?.note).toBe('Lunch special');

    const transferTx = storedTxs.find((t) => t.type === 'transfer');
    expect(transferTx).toBeDefined();
    expect(transferTx?.accountId).toBe('acc-card');
    expect(transferTx?.toAccountId).toBe('acc-cash');
    expect(transferTx?.amount).toBe(150);

    // Verify syncQueue entries were registered for cloud sync
    const syncItems = await db.syncQueue.toArray();
    expect(syncItems.length).toBeGreaterThanOrEqual(3);
    expect(syncItems.every((s) => s.entityType === 'transaction')).toBe(true);
  });

  it('auto-creates missing categories and accounts with standard defaults', async () => {
    const csv = [
      'Date,Type,Category,Account,ToAccount,Amount,Note',
      '2026-10-15T12:00:00Z,expense,Pets,Crypto Wallet,,85.00,Vet visit',
      '2026-10-15T13:00:00Z,income,Dividends,Brokerage Account,,120.50,Tech stocks',
    ].join('\n');

    const result = await importTransactionsFromCSV(csv, db);

    expect(result.importedTransactionsCount).toBe(2);
    expect(result.createdCategoriesCount).toBe(2);
    expect(result.createdAccountsCount).toBe(2);

    // Verify new categories exist in DB
    const petsCat = await db.categories.where('name').equalsIgnoreCase('Pets').first();
    expect(petsCat).toBeDefined();
    expect(petsCat?.type).toBe('expense');
    expect(petsCat?.icon).toBeTruthy();

    const divCat = await db.categories.where('name').equalsIgnoreCase('Dividends').first();
    expect(divCat).toBeDefined();
    expect(divCat?.type).toBe('income');

    // Verify new accounts exist in DB
    const cryptoAcc = await db.accounts.where('name').equalsIgnoreCase('Crypto Wallet').first();
    expect(cryptoAcc).toBeDefined();
    expect(cryptoAcc?.initialBalance).toBe(0);

    const brokerAcc = await db.accounts.where('name').equalsIgnoreCase('Brokerage Account').first();
    expect(brokerAcc).toBeDefined();

    // Verify sync items were queued for both categories, accounts, and transactions
    const syncItems = await db.syncQueue.toArray();
    const catSyncs = syncItems.filter((s) => s.entityType === 'category');
    const accSyncs = syncItems.filter((s) => s.entityType === 'account');
    const txSyncs = syncItems.filter((s) => s.entityType === 'transaction');

    expect(catSyncs).toHaveLength(2);
    expect(accSyncs).toHaveLength(2);
    expect(txSyncs).toHaveLength(2);
  });

  it('skips duplicate transactions when skipDuplicates is enabled', async () => {
    const csv = [
      'Date,Type,Category,Account,ToAccount,Amount,Note',
      '2026-10-15T12:00:00Z,expense,Food & Dining,Cash,,45.5,"Lunch special"',
      '2026-10-15T18:00:00Z,expense,Food & Dining,Cash,,20.0,"Coffee"',
    ].join('\n');

    // First import
    const firstResult = await importTransactionsFromCSV(csv, db, { skipDuplicates: true });
    expect(firstResult.importedTransactionsCount).toBe(2);
    expect(firstResult.skippedDuplicatesCount).toBe(0);

    // Second import of the identical file
    const secondResult = await importTransactionsFromCSV(csv, db, { skipDuplicates: true });
    expect(secondResult.importedTransactionsCount).toBe(0);
    expect(secondResult.skippedDuplicatesCount).toBe(2);

    const totalTxs = await db.transactions.count();
    expect(totalTxs).toBe(2);
  });

  it('imports classic Monefy mobile Android format correctly', async () => {
    const classicCsv = [
      'date,account,category,amount,currency,converted amount,currency,description',
      '15/10/2026,Cash,Food & Dining,-18.50,$,-18.50,$,Sandwich',
      '14/10/2026,Bank Card,Salary,4000,$,4000,$,Monthly paycheck',
      '15/10/2026,Bank Card,Payment -> Cash,100,$,100,$,ATM withdraw',
    ].join('\n');

    const result = await importTransactionsFromCSV(classicCsv, db);
    expect(result.importedTransactionsCount).toBe(3);

    const txs = await db.transactions.toArray();
    const expense = txs.find((t) => t.type === 'expense');
    const income = txs.find((t) => t.type === 'income');
    const transfer = txs.find((t) => t.type === 'transfer');

    expect(expense?.amount).toBe(18.5);
    expect(income?.amount).toBe(4000);
    expect(transfer?.amount).toBe(100);
    expect(transfer?.accountId).toBe('acc-card');
    expect(transfer?.toAccountId).toBe('acc-cash');
  });

  it('preserves full export-import round-trip fidelity', async () => {
    // 1. Fetch current data
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    const initialTxs = [
      {
        id: 'tx-1',
        amount: 55,
        type: 'expense' as const,
        categoryId: 'cat-food',
        accountId: 'acc-cash',
        note: 'Dinner with friends',
        date: '2026-10-15T20:00:00.000Z',
        createdAt: '2026-10-15T20:00:00.000Z',
        updatedAt: '2026-10-15T20:00:00.000Z',
        isDeleted: false,
      },
    ];
    await db.transactions.bulkAdd(initialTxs);

    // 2. Export to CSV
    const exportedCsv = exportTransactionsToCSV(initialTxs, categories, accounts);

    // 3. Clear transactions and re-import
    await db.transactions.clear();
    await db.syncQueue.clear();

    const importResult = await importTransactionsFromCSV(exportedCsv, db);
    expect(importResult.importedTransactionsCount).toBe(1);

    const importedTxs = await db.transactions.toArray();
    expect(importedTxs).toHaveLength(1);
    expect(importedTxs[0].amount).toBe(55);
    expect(importedTxs[0].categoryId).toBe('cat-food');
    expect(importedTxs[0].accountId).toBe('acc-cash');
    expect(importedTxs[0].note).toBe('Dinner with friends');
    expect(importedTxs[0].date).toContain('2026-10-15');
  });

  it('preserves exact ISO timestamp fidelity with standard CSV format', async () => {
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    const initialTxs = [
      {
        id: 'tx-std',
        amount: 88,
        type: 'expense' as const,
        categoryId: 'cat-food',
        accountId: 'acc-cash',
        note: 'Coffee meeting',
        date: '2026-10-15T18:45:00.000Z',
        createdAt: '2026-10-15T18:45:00.000Z',
        updatedAt: '2026-10-15T18:45:00.000Z',
        isDeleted: false,
      },
    ];

    const standardCsv = exportTransactionsToCSV(initialTxs, categories, accounts, {
      format: 'standard',
    });

    await db.transactions.clear();
    const res = await importTransactionsFromCSV(standardCsv, db);
    expect(res.importedTransactionsCount).toBe(1);

    const imported = await db.transactions.toArray();
    expect(imported[0].date).toBe('2026-10-15T18:45:00.000Z');
  });
});
