import type { TransactionType } from '../types';

export interface ParsedCsvRow {
  rowNumber: number;
  date: string; // ISO 8601 string
  type: TransactionType;
  categoryName: string;
  accountName: string;
  toAccountName?: string | null;
  amount: number;
  note?: string;
  raw: Record<string, string>;
}

export interface CsvRowError {
  rowNumber: number;
  reason: string;
  rawContent?: string;
}

export type CsvFormatDetected = 'monefy-export' | 'monefy-mobile' | 'generic' | 'unknown';

export interface CsvParseResult {
  format: CsvFormatDetected;
  rows: ParsedCsvRow[];
  errors: CsvRowError[];
  totalLines: number;
}

/**
 * Character-level RFC-4180 compliant CSV tokenizer.
 * Properly processes escaped quotes (""), commas inside quotes, multiline cells, and CRLF line breaks.
 */
export function tokenizeCsv(csvString: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = csvString.length;

  while (i < len) {
    const char = csvString[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && csvString[i + 1] === '"') {
          // Escaped double quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        currentRow.push(currentField);
        currentField = '';
        if (i + 1 < len && csvString[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
        rows.push(currentRow);
        currentRow = [];
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push remainder
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out trailing blank rows
  while (rows.length > 0 && rows[rows.length - 1].every((col) => col.trim() === '')) {
    rows.pop();
  }

  return rows;
}

/**
 * Normalizes varied date formats (ISO, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY) to an ISO 8601 string.
 */
function parseDateToISO(rawDate: string): string | null {
  if (!rawDate || !rawDate.trim()) return null;
  const str = rawDate.trim();

  // Try direct standard Date parse first (for ISO strings like 2026-10-15T12:00:00Z or 2026-10-15)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // Check DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

    const d = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const fallback = new Date(str);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return null;
}

/**
 * Normalizes numeric amount strings by stripping currency symbols, handling signs, and trimming.
 */
function parseAmount(rawAmount: string): { amount: number; isNegative: boolean } | null {
  if (!rawAmount || !rawAmount.trim()) return null;

  // Clean currency symbols and spaces: $, €, £, ₹, ¥
  let cleaned = rawAmount.trim().replace(/[$€£₹¥]/g, '').trim();

  // Handle commas as thousands separators (e.g. "1,250.50")
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/,/g, '');
  }

  const val = parseFloat(cleaned);
  if (isNaN(val) || !isFinite(val)) {
    return null;
  }

  return {
    amount: Math.abs(val),
    isNegative: val < 0,
  };
}

/**
 * Identifies the column indices from headers.
 */
function findColumnIndex(headers: string[], names: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const name of names) {
    const idx = normalized.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parses CSV text, auto-detects schema, validates rows, and returns normalized transaction candidates.
 */
export function parseTransactionsCsv(csvString: string): CsvParseResult {
  if (!csvString || !csvString.trim()) {
    throw new Error('CSV content is empty.');
  }

  const grid = tokenizeCsv(csvString);
  if (grid.length < 1) {
    throw new Error('CSV contains no rows.');
  }

  const headers = grid[0].map((h) => h.trim());
  const headerRowLower = headers.map((h) => h.toLowerCase());

  // Determine format
  let format: CsvFormatDetected = 'unknown';

  const isMonefyNative =
    headerRowLower.includes('date') &&
    headerRowLower.includes('type') &&
    headerRowLower.includes('category') &&
    headerRowLower.includes('account') &&
    headerRowLower.includes('amount');

  const isMonefyMobile =
    headerRowLower.includes('date') &&
    headerRowLower.includes('account') &&
    headerRowLower.includes('category') &&
    headerRowLower.includes('converted amount');

  if (isMonefyNative) {
    format = 'monefy-export';
  } else if (isMonefyMobile) {
    format = 'monefy-mobile';
  } else {
    // Check if at least date, amount, category or account exist
    const hasDate = findColumnIndex(headers, ['date', 'timestamp', 'time']) !== -1;
    const hasAmount = findColumnIndex(headers, ['amount', 'sum', 'value']) !== -1;
    if (hasDate && hasAmount) {
      format = 'generic';
    }
  }

  // Column mapping
  const dateCol = findColumnIndex(headers, ['date', 'timestamp', 'time']);
  const typeCol = findColumnIndex(headers, ['type', 'transaction type']);
  const catCol = findColumnIndex(headers, ['category', 'category name']);
  const accCol = findColumnIndex(headers, ['account', 'source account', 'account name']);
  const toAccCol = findColumnIndex(headers, ['toaccount', 'to account', 'destination account']);
  const amountCol = findColumnIndex(headers, ['amount', 'converted amount', 'sum', 'value']);
  const noteCol = findColumnIndex(headers, ['note', 'description', 'memo', 'comment']);

  const rows: ParsedCsvRow[] = [];
  const errors: CsvRowError[] = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    const rowNumber = r + 1; // 1-indexed including header
    const rawRecord: Record<string, string> = {};
    headers.forEach((h, i) => {
      rawRecord[h] = row[i] || '';
    });

    // Skip empty lines
    if (row.every((val) => val.trim() === '')) {
      continue;
    }

    // Date validation
    const rawDate = dateCol !== -1 ? row[dateCol] : '';
    const parsedDate = parseDateToISO(rawDate);
    if (!parsedDate) {
      errors.push({
        rowNumber,
        reason: `Invalid or missing date: "${rawDate || ''}"`,
        rawContent: row.join(','),
      });
      continue;
    }

    // Amount validation
    const rawAmount = amountCol !== -1 ? row[amountCol] : '';
    const parsedAmountResult = parseAmount(rawAmount);
    if (!parsedAmountResult) {
      errors.push({
        rowNumber,
        reason: `Invalid or non-numeric amount: "${rawAmount || ''}"`,
        rawContent: row.join(','),
      });
      continue;
    }
    if (parsedAmountResult.amount <= 0) {
      errors.push({
        rowNumber,
        reason: `Amount must be greater than 0: "${rawAmount || ''}"`,
        rawContent: row.join(','),
      });
      continue;
    }

    // Category
    let rawCategory = catCol !== -1 ? (row[catCol] || '').trim() : '';
    // Account
    let rawAccount = accCol !== -1 ? (row[accCol] || '').trim() : '';
    let rawToAccount = toAccCol !== -1 ? (row[toAccCol] || '').trim() : '';
    const rawNote = noteCol !== -1 ? (row[noteCol] || '').trim() : '';

    // Transaction Type determination
    let determinedType: TransactionType = 'expense';

    if (format === 'monefy-export' && typeCol !== -1) {
      const explicitType = (row[typeCol] || '').trim().toLowerCase();
      if (explicitType === 'income') {
        determinedType = 'income';
      } else if (explicitType === 'transfer') {
        determinedType = 'transfer';
      } else {
        determinedType = 'expense';
      }
    } else if (format === 'monefy-mobile') {
      // Classic Monefy export:
      // Transfers have category formatted as: "Payment -> <Account>" or "Transfer -> <Account>"
      const transferMatch = rawCategory.match(/^(?:Payment|Transfer)\s*->\s*(.+)$/i);
      if (transferMatch) {
        determinedType = 'transfer';
        rawToAccount = transferMatch[1].trim();
        rawCategory = 'Transfer';
      } else if (parsedAmountResult.isNegative) {
        determinedType = 'expense';
      } else {
        determinedType = 'income';
      }
    } else {
      // Generic format
      if (typeCol !== -1) {
        const t = (row[typeCol] || '').trim().toLowerCase();
        if (t === 'income') determinedType = 'income';
        else if (t === 'transfer') determinedType = 'transfer';
        else determinedType = 'expense';
      } else if (parsedAmountResult.isNegative) {
        determinedType = 'expense';
      } else {
        determinedType = 'expense';
      }
    }

    // Require Category for income and expense
    if (determinedType !== 'transfer' && !rawCategory) {
      errors.push({
        rowNumber,
        reason: `Category is required for transaction type "${determinedType}"`,
        rawContent: row.join(','),
      });
      continue;
    }

    // Default account if missing
    if (!rawAccount) {
      rawAccount = 'Cash';
    }

    rows.push({
      rowNumber,
      date: parsedDate,
      type: determinedType,
      categoryName: rawCategory || 'General',
      accountName: rawAccount,
      toAccountName: rawToAccount || null,
      amount: parsedAmountResult.amount,
      note: rawNote || undefined,
      raw: rawRecord,
    });
  }

  return {
    format,
    rows,
    errors,
    totalLines: grid.length - 1,
  };
}
