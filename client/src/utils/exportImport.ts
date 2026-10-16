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

export interface CsvExportOptions {
  format?: 'monefy' | 'standard';
  currency?: string;
}

export interface CsvImportResult {
  importedTransactionsCount: number;
  skippedDuplicatesCount: number;
  createdAccountsCount: number;
  createdCategoriesCount: number;
  detectedFormat: CsvFormatDetected;
  detectedCurrency?: string;
  errors: CsvRowError[];
}

export const MONEFY_CATEGORY_DEFAULTS: Record<string, { icon: string; color: string }> = {
  food: { icon: 'Utensils', color: '#FF6B6B' },
  'food & dining': { icon: 'Utensils', color: '#FF6B6B' },
  'eating out': { icon: 'Utensils', color: '#E67E22' },
  car: { icon: 'Car', color: '#4ECDC4' },
  transport: { icon: 'Car', color: '#4ECDC4' },
  taxi: { icon: 'Car', color: '#F1C40F' },
  bills: { icon: 'Zap', color: '#F15BB5' },
  health: { icon: 'HeartPulse', color: '#00BBF9' },
  house: { icon: 'Home', color: '#2EC4B6' },
  home: { icon: 'Home', color: '#2EC4B6' },
  gifts: { icon: 'Gift', color: '#E71D36' },
  toiletry: { icon: 'Smile', color: '#00BBF9' },
  clothes: { icon: 'Shirt', color: '#9B5DE5' },
  sports: { icon: 'Award', color: '#FF9F1C' },
  communications: { icon: 'Smartphone', color: '#3A86FF' },
  entertainment: { icon: 'Film', color: '#9B5DE5' },
  shopping: { icon: 'ShoppingBag', color: '#FFE66D' },
  groceries: { icon: 'ShoppingCart', color: '#FF9F1C' },
  salary: { icon: 'Briefcase', color: '#2ECC71' },
  savings: { icon: 'PiggyBank', color: '#16A085' },
  deposits: { icon: 'TrendingUp', color: '#1ABC9C' },
  investments: { icon: 'TrendingUp', color: '#1ABC9C' },
  freelance: { icon: 'Award', color: '#27AE60' },
  education: { icon: 'GraduationCap', color: '#00F5D4' },
  travel: { icon: 'Plane', color: '#3A86FF' },
  pets: { icon: 'Smile', color: '#E67E22' },
  other: { icon: 'MoreHorizontal', color: '#8338EC' },
};

/**
 * Maps currency symbols or 3-letter codes to standard 3-letter currency codes.
 */
export function resolveCurrencyCode(currency: string = '$'): string {
  const map: Record<string, string> = {
    '₹': 'INR',
    $: 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    CA$: 'CAD',
    AU$: 'AUD',
  };
  if (map[currency]) return map[currency];
  if (/^[A-Z]{3}$/i.test(currency)) return currency.toUpperCase();
  return 'INR';
}

/**
 * Normalizes ISO date string or YYYY-MM-DD into DD/MM/YYYY format used by Monefy exports.
 */
export function formatDateToMonefy(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formats a transaction amount with proper sign and locale-based thousands separators (e.g. "-1,000", "1,80,000", "-40").
 */
export function formatMonefyAmount(
  amount: number,
  isNegative: boolean,
  currencyCode: string = 'INR'
): string {
  const sign = isNegative ? -1 : 1;
  const signedVal = sign * Math.abs(amount);
  const localeMap: Record<string, string> = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    CAD: 'en-CA',
    AUD: 'en-AU',
  };
  const locale = localeMap[currencyCode.toUpperCase()] || 'en-IN';
  return signedVal.toLocaleString(locale, { maximumFractionDigits: 2 });
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
        existingFingerprints.add(
          `${tx.date}_${tx.amount}_${tx.accountId}_${tx.categoryId}_${tx.note || ''}`
        );
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
    let categoryId: string;
    const catKey = row.categoryName.trim().toLowerCase();
    const existingCat = catMap.get(catKey);

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      categoryId = generateUuid();
      const isIncome = row.type === 'income';
      const knownDef = MONEFY_CATEGORY_DEFAULTS[catKey];
      const icon = knownDef ? knownDef.icon : isIncome ? 'TrendingUp' : 'Tag';
      const color = knownDef ? knownDef.color : isIncome ? '#10B981' : '#FF6B6B';
      const createdCategory: Category = {
        id: categoryId,
        userId: null,
        name: row.categoryName.trim(),
        icon,
        color,
        type: isIncome ? 'income' : 'expense',
        isDefault: false,
        isDeleted: false,
        displayOrder: 999,
        isVisible: true,
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
    let accountId: string;
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
  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.transactions, db.syncQueue],
    async () => {
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
    }
  );

  return {
    importedTransactionsCount: newTransactions.length,
    skippedDuplicatesCount,
    createdAccountsCount: newAccounts.length,
    createdCategoriesCount: newCategories.length,
    detectedFormat: parseResult.format,
    detectedCurrency: parseResult.detectedCurrency,
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
 * Exports transaction list to a CSV string.
 * Defaults to Monefy format: date,account,category,amount,currency,converted amount,currency,description
 * Supports legacy format if format: 'standard' is specified.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  currencyOrOptions?: string | CsvExportOptions
): string {
  let format: 'monefy' | 'standard' = 'monefy';
  let currencyCode = 'INR';

  if (typeof currencyOrOptions === 'string') {
    currencyCode = resolveCurrencyCode(currencyOrOptions);
  } else if (currencyOrOptions && typeof currencyOrOptions === 'object') {
    if (currencyOrOptions.format) format = currencyOrOptions.format;
    if (currencyOrOptions.currency) currencyCode = resolveCurrencyCode(currencyOrOptions.currency);
  }

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));

  // Sort chronologically ascending
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (format === 'standard') {
    const headers = ['Date', 'Type', 'Category', 'Account', 'ToAccount', 'Amount', 'Note'];
    const rows = sortedTxs.map((tx) => {
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

  // Native Monefy export format:
  // date,account,category,amount,currency,converted amount,currency,description
  const headers = [
    'date',
    'account',
    'category',
    'amount',
    'currency',
    'converted amount',
    'currency',
    'description',
  ];

  const rows = sortedTxs.map((tx) => {
    const dStr = formatDateToMonefy(tx.date);
    const accName = accMap.get(tx.accountId) || 'Cash';
    let catName = catMap.get(tx.categoryId) || 'General';
    if (tx.type === 'transfer' && tx.toAccountId) {
      catName = `Payment -> ${accMap.get(tx.toAccountId) || 'Unknown'}`;
    }
    const isNegative = tx.type === 'expense' || tx.type === 'transfer';
    const formattedAmt = escapeCsvField(formatMonefyAmount(tx.amount, isNegative, currencyCode));
    const desc = escapeCsvField(tx.note || '');

    return [
      dStr,
      escapeCsvField(accName),
      escapeCsvField(catName),
      formattedAmt,
      currencyCode,
      formattedAmt,
      currencyCode,
      desc,
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
    throw new Error(
      `Failed to parse backup JSON: ${err instanceof Error ? err.message : String(err)}`,
      {
        cause: err,
      }
    );
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

  await db.transaction(
    'rw',
    [db.accounts, db.categories, db.transactions, db.budgets],
    async () => {
      // Clear and restore
      await Promise.all([
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.budgets.clear(),
      ]);

      const normalizedCategories: Category[] = categories.map((cat, idx) => ({
        ...cat,
        displayOrder: typeof cat.displayOrder === 'number' ? cat.displayOrder : idx,
        isVisible: cat.isVisible !== false,
      }));

      await Promise.all([
        db.accounts.bulkAdd(accounts),
        db.categories.bulkAdd(normalizedCategories),
        db.transactions.bulkAdd(transactions),
        budgets.length > 0 ? db.budgets.bulkAdd(budgets) : Promise.resolve(),
      ]);
    }
  );

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
