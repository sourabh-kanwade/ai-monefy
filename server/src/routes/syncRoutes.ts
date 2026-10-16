import { Router } from 'express';
import { query, pool } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

export const syncRouter = Router();

interface SyncPushBody {
  accounts?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    initialBalance?: number;
    initial_balance?: number;
    isDefault?: boolean;
    is_default?: boolean;
    isDeleted?: boolean;
    is_deleted?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>;
  categories?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'expense' | 'income';
    isDefault?: boolean;
    is_default?: boolean;
    isDeleted?: boolean;
    is_deleted?: boolean;
    displayOrder?: number;
    display_order?: number;
    isVisible?: boolean;
    is_visible?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>;
  transactions?: Array<{
    id: string;
    amount: number;
    type: 'expense' | 'income' | 'transfer';
    categoryId?: string;
    category_id?: string;
    accountId?: string;
    account_id?: string;
    toAccountId?: string | null;
    to_account_id?: string | null;
    note?: string | null;
    date: string;
    isDeleted?: boolean;
    is_deleted?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>;
  budgets?: Array<{
    id: string;
    categoryId?: string;
    category_id?: string;
    monthlyLimit?: number;
    monthly_limit?: number;
    isDeleted?: boolean;
    is_deleted?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>;
}

// POST /api/sync/push - Batch upsert client changes with Last-Write-Wins (LWW)
syncRouter.post('/push', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user!.userId;
    const { accounts = [], categories = [], transactions = [], budgets = [] }: SyncPushBody =
      req.body || {};

    await client.query('BEGIN');

    // 1. Upsert Accounts
    for (const acc of accounts) {
      const now = new Date().toISOString();
      const initialBal = Number(acc.initialBalance ?? acc.initial_balance ?? 0) || 0;
      const isDef = acc.isDefault ?? acc.is_default ?? false;
      const isDel = acc.isDeleted ?? acc.is_deleted ?? false;
      const createdAt = acc.createdAt ?? acc.created_at ?? now;
      const updatedAt = acc.updatedAt ?? acc.updated_at ?? now;

      await client.query(
        `INSERT INTO accounts (id, user_id, name, icon, color, initial_balance, is_default, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           color = EXCLUDED.color,
           initial_balance = EXCLUDED.initial_balance,
           is_default = EXCLUDED.is_default,
           is_deleted = EXCLUDED.is_deleted,
           updated_at = EXCLUDED.updated_at
         WHERE EXCLUDED.updated_at >= accounts.updated_at AND accounts.user_id = $2`,
        [acc.id, userId, acc.name, acc.icon, acc.color, initialBal, isDef, isDel, createdAt, updatedAt]
      );
    }

    // 2. Upsert Categories
    for (const cat of categories) {
      const now = new Date().toISOString();
      const isDef = cat.isDefault ?? cat.is_default ?? false;
      const isDel = cat.isDeleted ?? cat.is_deleted ?? false;
      const displayOrder = Number(cat.displayOrder ?? cat.display_order ?? 0) || 0;
      const isVisible = cat.isVisible ?? cat.is_visible ?? true;
      const createdAt = cat.createdAt ?? cat.created_at ?? now;
      const updatedAt = cat.updatedAt ?? cat.updated_at ?? now;

      await client.query(
        `INSERT INTO categories (id, user_id, name, icon, color, type, is_default, is_deleted, display_order, is_visible, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           icon = EXCLUDED.icon,
           color = EXCLUDED.color,
           type = EXCLUDED.type,
           is_default = EXCLUDED.is_default,
           is_deleted = EXCLUDED.is_deleted,
           display_order = EXCLUDED.display_order,
           is_visible = EXCLUDED.is_visible,
           updated_at = EXCLUDED.updated_at
         WHERE EXCLUDED.updated_at >= categories.updated_at AND categories.user_id = $2`,
        [cat.id, userId, cat.name, cat.icon, cat.color, cat.type, isDef, isDel, displayOrder, isVisible, createdAt, updatedAt]
      );
    }

    // 3. Upsert Transactions
    for (const tx of transactions) {
      const now = new Date().toISOString();
      const catId = tx.categoryId ?? tx.category_id;
      const accId = tx.accountId ?? tx.account_id;
      const toAccId = tx.toAccountId ?? tx.to_account_id ?? null;
      const isDel = tx.isDeleted ?? tx.is_deleted ?? false;
      const createdAt = tx.createdAt ?? tx.created_at ?? now;
      const updatedAt = tx.updatedAt ?? tx.updated_at ?? now;

      await client.query(
        `INSERT INTO transactions (id, user_id, amount, type, category_id, account_id, to_account_id, note, date, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           amount = EXCLUDED.amount,
           type = EXCLUDED.type,
           category_id = EXCLUDED.category_id,
           account_id = EXCLUDED.account_id,
           to_account_id = EXCLUDED.to_account_id,
           note = EXCLUDED.note,
           date = EXCLUDED.date,
           is_deleted = EXCLUDED.is_deleted,
           updated_at = EXCLUDED.updated_at
         WHERE EXCLUDED.updated_at >= transactions.updated_at AND transactions.user_id = $2`,
        [tx.id, userId, tx.amount, tx.type, catId, accId, toAccId, tx.note || null, tx.date, isDel, createdAt, updatedAt]
      );
    }

    // 4. Upsert Budgets
    for (const b of budgets) {
      const now = new Date().toISOString();
      const catId = b.categoryId ?? b.category_id;
      const limit = b.monthlyLimit ?? b.monthly_limit ?? 0;
      const isDel = b.isDeleted ?? b.is_deleted ?? false;
      const createdAt = b.createdAt ?? b.created_at ?? now;
      const updatedAt = b.updatedAt ?? b.updated_at ?? now;

      await client.query(
        `INSERT INTO budgets (id, user_id, category_id, monthly_limit, is_deleted, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           category_id = EXCLUDED.category_id,
           monthly_limit = EXCLUDED.monthly_limit,
           is_deleted = EXCLUDED.is_deleted,
           updated_at = EXCLUDED.updated_at
         WHERE EXCLUDED.updated_at >= budgets.updated_at AND budgets.user_id = $2`,
        [b.id, userId, catId, limit, isDel, createdAt, updatedAt]
      );
    }

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync push error:', err);
    res.status(500).json({ error: 'Failed to apply delta sync push' });
  } finally {
    client.release();
  }
});

// GET /api/sync/pull?since=<ISO_TIMESTAMP> - Pull server changes since timestamp
syncRouter.get('/pull', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const since = req.query.since ? String(req.query.since) : null;

    const [accResult, catResult, txResult, budgetResult] = await Promise.all([
      query(
        `SELECT id, name, icon, color, initial_balance::float AS "initialBalance", is_default AS "isDefault", is_deleted AS "isDeleted", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM accounts
         WHERE user_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)`,
        [userId, since]
      ),
      query(
        `SELECT id, name, icon, color, type, is_default AS "isDefault", is_deleted AS "isDeleted", display_order AS "displayOrder", is_visible AS "isVisible", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM categories
         WHERE user_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)`,
        [userId, since]
      ),
      query(
        `SELECT id, amount::float, type, category_id AS "categoryId", account_id AS "accountId", to_account_id AS "toAccountId", note, date, is_deleted AS "isDeleted", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM transactions
         WHERE user_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)`,
        [userId, since]
      ),
      query(
        `SELECT id, category_id AS "categoryId", monthly_limit::float AS "monthlyLimit", is_deleted AS "isDeleted", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM budgets
         WHERE user_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)`,
        [userId, since]
      ),
    ]);

    res.status(200).json({
      accounts: accResult.rows,
      categories: catResult.rows,
      transactions: txResult.rows,
      budgets: budgetResult.rows,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sync pull error:', err);
    res.status(500).json({ error: 'Failed to retrieve delta sync pull' });
  }
});
