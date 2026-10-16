import Dexie, { type Table } from 'dexie';
import type { Transaction, Category, Account, Budget, SyncQueueItem } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'Utensils', color: '#FF6B6B' },
  { name: 'Transport', icon: 'Car', color: '#4ECDC4' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#FFE66D' },
  { name: 'Entertainment', icon: 'Film', color: '#9B5DE5' },
  { name: 'Bills', icon: 'Zap', color: '#F15BB5' },
  { name: 'Health', icon: 'HeartPulse', color: '#00BBF9' },
  { name: 'Education', icon: 'GraduationCap', color: '#00F5D4' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#FF9F1C' },
  { name: 'Home', icon: 'Home', color: '#2EC4B6' },
  { name: 'Gifts', icon: 'Gift', color: '#E71D36' },
  { name: 'Travel', icon: 'Plane', color: '#3A86FF' },
  { name: 'Other', icon: 'MoreHorizontal', color: '#8338EC' },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#2ECC71' },
  { name: 'Freelance', icon: 'Award', color: '#27AE60' },
  { name: 'Investments', icon: 'TrendingUp', color: '#1ABC9C' },
  { name: 'Savings', icon: 'PiggyBank', color: '#16A085' },
];

export const DEFAULT_ACCOUNTS = [
  { name: 'Cash', icon: 'Wallet', color: '#2ECC71', initialBalance: 0 },
  { name: 'Payment Card', icon: 'CreditCard', color: '#3498DB', initialBalance: 0 },
  { name: 'Savings Account', icon: 'PiggyBank', color: '#9B59B6', initialBalance: 0 },
];

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class MonefyDatabase extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor(dbName = 'ai_monefy_db') {
    super(dbName);

    this.version(1).stores({
      transactions: 'id, accountId, categoryId, type, date, isDeleted, updatedAt',
      categories: 'id, type, isDeleted, isDefault, name',
      accounts: 'id, isDeleted, isDefault, name',
      budgets: 'id, categoryId',
      syncQueue: 'id, entityType, timestamp',
    });
  }

  private _initDefaultsPromise: Promise<void> | null = null;

  async initializeDefaults(): Promise<void> {
    if (this._initDefaultsPromise) {
      return this._initDefaultsPromise;
    }
    this._initDefaultsPromise = (async () => {
      await this.transaction('rw', [this.categories, this.accounts], async () => {
        const categoryCount = await this.categories.count();
        const now = new Date().toISOString();

        if (categoryCount === 0) {
          const initialCategories: Category[] = [
            ...DEFAULT_EXPENSE_CATEGORIES.map((cat, index) => ({
              id: generateUuid(),
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              type: 'expense' as const,
              isDefault: true,
              isDeleted: false,
              displayOrder: index,
              isVisible: true,
              createdAt: now,
              updatedAt: now,
            })),
            ...DEFAULT_INCOME_CATEGORIES.map((cat, index) => ({
              id: generateUuid(),
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              type: 'income' as const,
              isDefault: true,
              isDeleted: false,
              displayOrder: index,
              isVisible: true,
              createdAt: now,
              updatedAt: now,
            })),
          ];
          await this.categories.bulkAdd(initialCategories);
        } else {
          // Backfill missing displayOrder or isVisible on existing categories
          const allCats = await this.categories.toArray();
          const updates: Category[] = [];
          let expenseIdx = 0;
          let incomeIdx = 0;
          for (const cat of allCats) {
            let changed = false;
            let order = cat.displayOrder;
            let visible = cat.isVisible;
            if (order === undefined) {
              order = cat.type === 'expense' ? expenseIdx++ : incomeIdx++;
              changed = true;
            } else {
              if (cat.type === 'expense') expenseIdx = Math.max(expenseIdx, order + 1);
              else incomeIdx = Math.max(incomeIdx, order + 1);
            }
            if (visible === undefined) {
              visible = true;
              changed = true;
            }
            if (changed) {
              updates.push({ ...cat, displayOrder: order, isVisible: visible });
            }
          }
          if (updates.length > 0) {
            await this.categories.bulkPut(updates);
          }
        }

        const accountCount = await this.accounts.count();
        if (accountCount === 0) {
          const initialAccounts: Account[] = DEFAULT_ACCOUNTS.map((acc, index) => ({
            id: generateUuid(),
            name: acc.name,
            icon: acc.icon,
            color: acc.color,
            initialBalance: acc.initialBalance,
            isDefault: index === 0,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          }));
          await this.accounts.bulkAdd(initialAccounts);
        }
      });
    })().finally(() => {
      this._initDefaultsPromise = null;
    });
    return this._initDefaultsPromise;
  }

  async addTransaction(input: {
    amount: number;
    type: 'expense' | 'income' | 'transfer';
    categoryId: string;
    accountId: string;
    toAccountId?: string | null;
    note?: string;
    date?: string;
  }): Promise<string> {
    const id = generateUuid();
    const now = new Date().toISOString();
    const tx: Transaction = {
      id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      amount: Math.abs(input.amount),
      type: input.type,
      toAccountId: input.toAccountId || null,
      note: input.note?.trim() || '',
      date: input.date || now,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    await this.transactions.add(tx);

    // Enqueue for offline sync
    await this.syncQueue.add({
      id: generateUuid(),
      entityType: 'transaction',
      entityId: id,
      action: 'create',
      payload: tx,
      timestamp: now,
    });

    return id;
  }

  async calculateNetBalance(accountId?: string): Promise<number> {
    let query = this.transactions.filter((tx) => !tx.isDeleted);
    const txs = await query.toArray();

    let balance = 0;

    // Add initial balances of accounts
    const accounts = await this.accounts.filter((a) => !a.isDeleted).toArray();
    for (const acc of accounts) {
      if (!accountId || acc.id === accountId) {
        const initBal = Number(acc.initialBalance);
        balance += isNaN(initBal) ? 0 : initBal;
      }
    }

    for (const tx of txs) {
      const amount = Number(tx.amount);
      const safeAmount = isNaN(amount) ? 0 : amount;
      if (tx.type === 'expense') {
        if (!accountId || tx.accountId === accountId) {
          balance -= safeAmount;
        }
      } else if (tx.type === 'income') {
        if (!accountId || tx.accountId === accountId) {
          balance += safeAmount;
        }
      } else if (tx.type === 'transfer') {
        if (accountId) {
          if (tx.accountId === accountId) {
            balance -= safeAmount;
          }
          if (tx.toAccountId === accountId) {
            balance += safeAmount;
          }
        }
        // If no accountId is specified, transfer between own accounts leaves overall net balance unchanged!
      }
    }

    return isNaN(balance) ? 0 : Math.round(balance * 100) / 100;
  }

  async getRecentTransactions(limit = 100): Promise<Transaction[]> {
    const txs = await this.transactions.filter((tx) => !tx.isDeleted).toArray();
    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
  }
}

export const db = new MonefyDatabase();
