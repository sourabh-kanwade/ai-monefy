import { MonefyDatabase, generateUuid } from '../db/localDb';
import type { Transaction, Category, Account, Budget, SyncQueueItem } from '../types';
import { parseTransactionsCsv, type CsvFormatDetected, type CsvRowError } from './csvParser';
export * from './csvParser';

export interface BackupData {
  version: number;
  exportedAt: string;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
}

export interface CsvImportOptions {
  skipDuplicates?: boolean;
}

export interface CsvImportResult {
  importedTransactionsCount: number;
  skippedDuplicatesCount: number;
  createdAccountsCount: number;
  createdCategoriesCount: number;
  detectedFormat: CsvFormatDetected;
  errors: CsvRowError[];
}

/**
 * Parses and atomically imports transactions from a CSV string into the local database,
 * resolving/auto-creating accounts and categories, and populating the sync queue.
 */
export async function importTransactionsFromCSV(
  csvString: string,
  db: MonefyDatabase,
  options: CsvImportOptions = {}
): Promise<CsvImportResult> {
  const parseResult = parseTransactionsCsv(csvString);

  if (parseResult.rows.length === 0 && parseResult.errors.length > 0) {
    throw new Error(
      `Failed to parse CSV: ${parseResult.errors[0].reason} (Line ${parseResult.errors[0].rowNumber})`
    );
  }

  const [existingCategories, existingAccounts, existingTransactions] = await Promise.all([
    db.categories.toArray(),
    db.accounts.toArray(),
    options.skipDuplicates ? db.transactions.toArray() : Promise.resolve([]),
  ]);

  const catMap = new Map<string, Category>();
  for (const cat of existingCategories) {
    catMap.set(cat.name.trim().toLowerCase(), cat);
  }

  const accMap = new Map<string, Account>();
  for (const acc of existingAccounts) {
    accMap.set(acc.name.trim().toLowerCase(), acc);
  }

  const existingFingerprints = new Set<string>();
  if (options.skipDuplicates) {
    for (const tx of existingTransactions) {
      if (!tx.isDeleted) {
        existingFingerprints.add(`${tx.date}_${tx.amount}_${tx.accountId}_${tx.categoryId}_${tx.note || ''}`);
      }
    }
  }

  const now = new Date().toISOString();
  const newCategories: Category[] = [];
  const newAccounts: Account[] = [];
  const newTransactions: Transaction[] = [];
  const newSyncItems: SyncQueueItem[] = [];
  let skippedDuplicatesCount = 0;

  for (const row of parseResult.rows) {
    // 1. Resolve or create Category
    let categoryId = '';
    const catKey = row.categoryName.trim().toLowerCase();
    const existingCat = catMap.get(catKey);

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      categoryId = generateUuid();
      const isIncome = row.type === 'income';
      const createdCategory: Category = {
        id: categoryId,
        userId: null,
        name: row.categoryName.trim(),
        icon: isIncome ? 'TrendingUp' : 'Tag',
        color: isIncome ? '#10B981' : '#FF6B6B',
        type: isIncome ? 'income' : 'expense',
        isDefault: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      catMap.set(catKey, createdCategory);
      newCategories.push(createdCategory);
      newSyncItems.push({
        id: generateUuid(),
        entityType: 'category',
        entityId: categoryId,
        action: 'create',
        payload: createdCategory,
        timestamp: now,
      });
    }

    // 2. Resolve or create Source Account
    let accountId = '';
    const accKey = row.accountName.trim().toLowerCase();
    const existingAcc = accMap.get(accKey);

    if (existingAcc) {
      accountId = existingAcc.id;
    } else {
      accountId = generateUuid();
      const createdAccount: Account = {
        id: accountId,
        userId: null,
        name: row.accountName.trim(),
        icon: 'Wallet',
        color: '#3B82F6',
        initialBalance: 0,
        isDefault: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      accMap.set(accKey, createdAccount);
      newAccounts.push(createdAccount);
      newSyncItems.push({
        id: generateUuid(),
        entityType: 'account',
        entityId: accountId,
        action: 'create',
        payload: createdAccount,
        timestamp: now,
      });
    }

    // 3. Resolve or create Destination Account (if transfer)
    let toAccountId: string | null = null;
    if (row.type === 'transfer' && row.toAccountName) {
      const toAccKey = row.toAccountName.trim().toLowerCase();
      const existingToAcc = accMap.get(toAccKey);
      if (existingToAcc) {
        toAccountId = existingToAcc.id;
      } else {
        toAccountId = generateUuid();
        const createdToAccount: Account = {
          id: toAccountId,
          userId: null,
          name: row.toAccountName.trim(),
          icon: 'Wallet',
          color: '#8B5CF6',
          initialBalance: 0,
          isDefault: false,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };
        accMap.set(toAccKey, createdToAccount);
        newAccounts.push(createdToAccount);
        newSyncItems.push({
          id: generateUuid(),
          entityType: 'account',
          entityId: toAccountId,
          action: 'create',
          payload: createdToAccount,
          timestamp: now,
        });
      }
    }

    // 4. Duplicate Check
    if (options.skipDuplicates) {
      const fp = `${row.date}_${row.amount}_${accountId}_${categoryId}_${row.note || ''}`;
      if (existingFingerprints.has(fp)) {
        skippedDuplicatesCount++;
        continue;
      }
      existingFingerprints.add(fp);
    }

    // 5. Create Transaction
    const txId = generateUuid();
    const transaction: Transaction = {
      id: txId,
      userId: null,
      accountId,
      toAccountId,
      categoryId,
      amount: row.amount,
      type: row.type,
      note: row.note,
      date: row.date,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    newTransactions.push(transaction);
    newSyncItems.push({
      id: generateUuid(),
      entityType: 'transaction',
      entityId: txId,
      action: 'create',
      payload: transaction,
      timestamp: now,
    });
  }

  // Atomically commit to IndexedDB
  await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.syncQueue], async () => {
    if (newCategories.length > 0) {
      await db.categories.bulkAdd(newCategories);
    }
    if (newAccounts.length > 0) {
      await db.accounts.bulkAdd(newAccounts);
    }
    if (newTransactions.length > 0) {
      await db.transactions.bulkAdd(newTransactions);
    }
    if (newSyncItems.length > 0) {
      await db.syncQueue.bulkAdd(newSyncItems);
    }
  });

  return {
    importedTransactionsCount: newTransactions.length,
    skippedDuplicatesCount,
    createdAccountsCount: newAccounts.length,
    createdCategoriesCount: newCategories.length,
    detectedFormat: parseResult.format,
    errors: parseResult.errors,
  };
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
