import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MonefyDatabase } from '../db/localDb';
import {
  exportTransactionsToCSV,
  exportDatabaseToJSON,
  importDatabaseFromJSON,
} from '../utils/exportImport';
import type { Category, Account, Transaction } from '../types';

describe('Data Export and Import Utilities', () => {
  let db: MonefyDatabase;

  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Food & Dining', icon: 'Utensils', color: '#FF6B6B', type: 'expense', isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
    { id: 'cat-2', name: 'Salary', icon: 'Briefcase', color: '#10B981', type: 'income', isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Cash', icon: 'Banknote', color: '#10B981', initialBalance: 500, isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
    { id: 'acc-2', name: 'Bank Card', icon: 'CreditCard', color: '#3B82F6', initialBalance: 1200, isDefault: false, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      amount: 45.5,
      type: 'expense',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      note: 'Lunch, with coffee "special"',
      date: '2026-10-15T12:00:00Z',
      createdAt: '2026-10-15T12:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
      isDeleted: false,
    },
    {
      id: 'tx-2',
      amount: 3000,
      type: 'income',
      categoryId: 'cat-2',
      accountId: 'acc-2',
      note: 'October paycheck',
      date: '2026-10-14T09:00:00Z',
      createdAt: '2026-10-14T09:00:00Z',
      updatedAt: '2026-10-14T09:00:00Z',
      isDeleted: false,
    },
    {
      id: 'tx-3',
      amount: 200,
      type: 'transfer',
      categoryId: 'cat-1',
      accountId: 'acc-2',
      toAccountId: 'acc-1',
      note: 'ATM withdrawal',
      date: '2026-10-15T10:00:00Z',
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
      isDeleted: false,
    },
  ];

  beforeEach(async () => {
    db = new MonefyDatabase(`test-export-import-${Date.now()}`);
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('exports transactions to Monefy CSV format by default', () => {
    const csv = exportTransactionsToCSV(mockTransactions, mockCategories, mockAccounts, 'INR');
    expect(csv).toContain('date,account,category,amount,currency,converted amount,currency,description');
    expect(csv).toContain('Cash,Food & Dining,-45.5,INR,-45.5,INR,"Lunch, with coffee ""special"""');
    expect(csv).toContain('Bank Card,Salary,"3,000",INR,"3,000",INR,October paycheck');
    expect(csv).toContain('Payment -> Cash');
    expect(csv).toContain('15/10/2026');
  });

  it('exports transactions to standard CSV format when requested', () => {
    const csv = exportTransactionsToCSV(mockTransactions, mockCategories, mockAccounts, {
      format: 'standard',
    });
    expect(csv).toContain('Date,Type,Category,Account,ToAccount,Amount,Note');
    expect(csv).toContain('Food & Dining');
    expect(csv).toContain('Salary');
    expect(csv).toContain('"Lunch, with coffee ""special"""');
    expect(csv).toContain('45.5');
    expect(csv).toContain('3000');
    expect(csv).toContain('ATM withdrawal');
  });

  it('exports full database to valid JSON backup structure', async () => {
    await db.categories.bulkAdd(mockCategories);
    await db.accounts.bulkAdd(mockAccounts);
    await db.transactions.bulkAdd(mockTransactions);
    await db.budgets.add({
      id: 'b-1',
      categoryId: 'cat-1',
      monthlyLimit: 300,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    });

    const jsonString = await exportDatabaseToJSON(db);
    const parsed = JSON.parse(jsonString);

    expect(parsed.version).toBe(1);
    expect(parsed.accounts).toHaveLength(2);
    expect(parsed.categories).toHaveLength(2);
    expect(parsed.transactions).toHaveLength(3);
    expect(parsed.budgets).toHaveLength(1);
  });

  it('restores database from valid JSON backup and rejects corrupted JSON', async () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: mockAccounts,
      categories: mockCategories,
      transactions: mockTransactions,
      budgets: [
        {
          id: 'b-100',
          categoryId: 'cat-1',
          monthlyLimit: 600,
          createdAt: '2026-10-15T00:00:00Z',
          updatedAt: '2026-10-15T00:00:00Z',
        },
      ],
    };

    const result = await importDatabaseFromJSON(JSON.stringify(backupData), db);
    expect(result.accountsCount).toBe(2);
    expect(result.categoriesCount).toBe(2);
    expect(result.transactionsCount).toBe(3);
    expect(result.budgetsCount).toBe(1);

    const storedAccs = await db.accounts.toArray();
    const storedCats = await db.categories.toArray();
    const storedTxs = await db.transactions.toArray();
    expect(storedAccs).toHaveLength(2);
    expect(storedCats).toHaveLength(2);
    expect(storedTxs).toHaveLength(3);

    // Invalid JSON error check
    await expect(importDatabaseFromJSON('{ "version": 2, invalid }', db)).rejects.toThrow();
    // Missing required arrays check
    await expect(importDatabaseFromJSON('{"version": 1, "accounts": []}', db)).rejects.toThrow(
      /Invalid backup format/
    );
  });
});
