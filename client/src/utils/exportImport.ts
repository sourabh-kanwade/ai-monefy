import type { MonefyDatabase } from '../db/localDb';
import type { Transaction, Category, Account, Budget } from '../types';

export interface BackupData {
  version: number;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}

/**
 * Escapes a field according to RFC-4180 CSV standard.
 */
function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports transaction list to a standard CSV string.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  const headers = ['Date', 'Type', 'Category', 'Account', 'ToAccount', 'Amount', 'Note'];
  const rows = transactions.map((tx) => {
    const catName = catMap.get(tx.categoryId) || 'Unknown';
    const accName = accMap.get(tx.accountId) || 'Unknown';
    const toAccName = tx.toAccountId ? accMap.get(tx.toAccountId) || 'Unknown' : '';
    return [
      escapeCsvField(tx.date),
      escapeCsvField(tx.type),
      escapeCsvField(catName),
      escapeCsvField(accName),
      escapeCsvField(toAccName),
      escapeCsvField(tx.amount),
      escapeCsvField(tx.note || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Exports complete database to a serialized JSON string backup.
 */
export async function exportDatabaseToJSON(db: MonefyDatabase): Promise<string> {
  const [accounts, categories, transactions, budgets] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.budgets.toArray(),
  ]);

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    budgets,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Validates and restores complete database from a JSON backup string.
 */
export async function importDatabaseFromJSON(
  jsonString: string,
  db: MonefyDatabase
): Promise<{
  accountsCount: number;
  categoriesCount: number;
  transactionsCount: number;
  budgetsCount: number;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse backup JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup format: root must be an object.');
  }

  const data = parsed as Record<string, unknown>;

  if (
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.categories) ||
    !Array.isArray(data.transactions)
  ) {
    throw new Error(
      'Invalid backup format: accounts, categories, and transactions must be arrays.'
    );
  }

  const accounts = data.accounts as Account[];
  const categories = data.categories as Category[];
  const transactions = data.transactions as Transaction[];
  const budgets = Array.isArray(data.budgets) ? (data.budgets as Budget[]) : [];

  await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.budgets], async () => {
    // Clear and restore
    await Promise.all([
      db.accounts.clear(),
      db.categories.clear(),
      db.transactions.clear(),
      db.budgets.clear(),
    ]);

    await Promise.all([
      db.accounts.bulkAdd(accounts),
      db.categories.bulkAdd(categories),
      db.transactions.bulkAdd(transactions),
      budgets.length > 0 ? db.budgets.bulkAdd(budgets) : Promise.resolve(),
    ]);
  });

  return {
    accountsCount: accounts.length,
    categoriesCount: categories.length,
    transactionsCount: transactions.length,
    budgetsCount: budgets.length,
  };
}

/**
 * Triggers a browser download of a text blob.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
