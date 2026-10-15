import type { MonefyDatabase } from './localDb';
import type { Account, Category, Transaction, Budget } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface SyncResult {
  status: 'success' | 'offline' | 'error';
  pushed: number;
  pulled: number;
  error?: string;
}

export class SyncEngine {
  private apiUrl: string;
  private tokenKey = 'ai_monefy_auth_token';
  private userKey = 'ai_monefy_auth_user';
  private lastSyncKey = 'ai_monefy_last_sync';
  private guestMigratedKey = 'ai_monefy_guest_migrated';

  constructor(apiUrl = 'http://localhost:3001') {
    this.apiUrl = apiUrl;
  }

  getAuthToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.tokenKey);
  }

  setAuthToken(token: string | null): void {
    if (typeof localStorage === 'undefined') return;
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getAuthUser(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  setAuthUser(user: AuthUser | null): void {
    if (typeof localStorage === 'undefined') return;
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  getLastSyncTime(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.lastSyncKey);
  }

  setLastSyncTime(time: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.lastSyncKey, time);
  }

  isGuestMigrated(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(this.guestMigratedKey) === 'true';
  }

  setGuestMigrated(val: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.guestMigratedKey, val ? 'true' : 'false');
  }

  logout(): void {
    this.setAuthToken(null);
    this.setAuthUser(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.lastSyncKey);
      localStorage.removeItem(this.guestMigratedKey);
    }
  }

  async sync(db: MonefyDatabase): Promise<SyncResult> {
    const token = this.getAuthToken();
    if (!token) {
      return { status: 'offline', pushed: 0, pulled: 0 };
    }

    try {
      let pushedCount = 0;
      let pulledCount = 0;

      // STEP 1: PUSH
      const queue = await db.syncQueue.toArray();
      const needsMigration = !this.isGuestMigrated();

      let pushPayload: {
        accounts: Account[];
        categories: Category[];
        transactions: Transaction[];
        budgets: Budget[];
      };

      if (needsMigration) {
        // Full push of all existing local records (Guest migration)
        const [accs, cats, txs, budgets] = await Promise.all([
          db.accounts.toArray(),
          db.categories.toArray(),
          db.transactions.toArray(),
          db.budgets.toArray(),
        ]);
        pushPayload = {
          accounts: accs,
          categories: cats,
          transactions: txs,
          budgets,
        };
      } else {
        // Delta push based on syncQueue
        const accountsToPush: Account[] = [];
        const categoriesToPush: Category[] = [];
        const transactionsToPush: Transaction[] = [];
        const budgetsToPush: Budget[] = [];

        for (const item of queue) {
          if (item.entityType === 'transaction') {
            const tx = await db.transactions.get(item.entityId);
            if (tx) transactionsToPush.push(tx);
          } else if (item.entityType === 'category') {
            const cat = await db.categories.get(item.entityId);
            if (cat) categoriesToPush.push(cat);
          } else if (item.entityType === 'account') {
            const acc = await db.accounts.get(item.entityId);
            if (acc) accountsToPush.push(acc);
          } else if (item.entityType === 'budget') {
            const b = await db.budgets.get(item.entityId);
            if (b) budgetsToPush.push(b);
          }
        }

        pushPayload = {
          accounts: accountsToPush,
          categories: categoriesToPush,
          transactions: transactionsToPush,
          budgets: budgetsToPush,
        };
      }

      const hasItemsToPush =
        pushPayload.accounts.length > 0 ||
        pushPayload.categories.length > 0 ||
        pushPayload.transactions.length > 0 ||
        pushPayload.budgets.length > 0;

      if (hasItemsToPush) {
        const pushRes = await fetch(`${this.apiUrl}/api/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(pushPayload),
        });

        if (!pushRes.ok) {
          throw new Error(`Sync push failed with status ${pushRes.status}`);
        }

        pushedCount =
          pushPayload.accounts.length +
          pushPayload.categories.length +
          pushPayload.transactions.length +
          pushPayload.budgets.length;

        // Drain processed sync queue and mark migration done
        if (queue.length > 0) {
          const ids = queue.map((q) => q.id);
          await db.syncQueue.bulkDelete(ids);
        }
        this.setGuestMigrated(true);
      }

      // STEP 2: PULL
      const lastSync = this.getLastSyncTime();
      const pullUrl = `${this.apiUrl}/api/sync/pull${
        lastSync ? `?since=${encodeURIComponent(lastSync)}` : ''
      }`;

      const pullRes = await fetch(pullUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!pullRes.ok) {
        throw new Error(`Sync pull failed with status ${pullRes.status}`);
      }

      const pullData = await pullRes.json();
      const remoteAccounts = (pullData.accounts || []) as Account[];
      const remoteCategories = (pullData.categories || []) as Category[];
      const remoteTransactions = (pullData.transactions || []) as Transaction[];
      const remoteBudgets = (pullData.budgets || []) as Budget[];

      // Apply LWW for accounts
      for (const rAcc of remoteAccounts) {
        const initBal = Number(rAcc.initialBalance);
        const normalizedAcc: Account = {
          ...rAcc,
          initialBalance: isNaN(initBal) ? 0 : initBal,
        };
        const local = await db.accounts.get(normalizedAcc.id);
        if (!local || new Date(normalizedAcc.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
          await db.accounts.put(normalizedAcc);
          pulledCount++;
        }
      }

      // Apply LWW for categories
      for (const rCat of remoteCategories) {
        const local = await db.categories.get(rCat.id);
        if (!local || new Date(rCat.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
          await db.categories.put(rCat);
          pulledCount++;
        }
      }

      // Apply LWW for transactions
      for (const rTx of remoteTransactions) {
        const amount = Number(rTx.amount);
        const normalizedTx: Transaction = {
          ...rTx,
          amount: isNaN(amount) ? 0 : Math.abs(amount),
        };
        const local = await db.transactions.get(normalizedTx.id);
        if (!local || new Date(normalizedTx.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
          await db.transactions.put(normalizedTx);
          pulledCount++;
        }
      }

      // Apply LWW for budgets
      for (const rB of remoteBudgets) {
        const limit = Number(rB.monthlyLimit);
        const normalizedBudget: Budget = {
          ...rB,
          monthlyLimit: isNaN(limit) ? 0 : Math.max(0, limit),
        };
        const local = await db.budgets.get(normalizedBudget.id);
        if (!local || new Date(normalizedBudget.updatedAt).getTime() >= new Date(local.updatedAt).getTime()) {
          await db.budgets.put(normalizedBudget);
          pulledCount++;
        }
      }

      if (pullData.serverTime) {
        this.setLastSyncTime(pullData.serverTime);
      }

      return {
        status: 'success',
        pushed: pushedCount,
        pulled: pulledCount,
      };
    } catch (err) {
      console.error('SyncEngine error:', err);
      return {
        status: 'error',
        pushed: 0,
        pulled: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async register(
    email: string,
    password: string,
    name: string | undefined,
    db: MonefyDatabase
  ): Promise<AuthUser> {
    const res = await fetch(`${this.apiUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    this.setAuthToken(data.token);
    this.setAuthUser(data.user);
    this.setGuestMigrated(false); // Flag for immediate local migration on sync
    await this.sync(db);

    return data.user;
  }

  async login(email: string, password: string, db: MonefyDatabase): Promise<AuthUser> {
    const res = await fetch(`${this.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    this.setAuthToken(data.token);
    this.setAuthUser(data.user);
    this.setGuestMigrated(false); // Flag to ensure local records are pushed
    await this.sync(db);

    return data.user;
  }
}

export const syncEngine = new SyncEngine();
