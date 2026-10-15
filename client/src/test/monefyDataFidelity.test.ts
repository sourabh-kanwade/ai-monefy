import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import fs from 'fs';
import path from 'path';
import { MonefyDatabase } from '../db/localDb';
import {
  parseTransactionsCsv,
  importTransactionsFromCSV,
  exportTransactionsToCSV,
} from '../utils/exportImport';

describe('Monefy CSV Format Real-World Data Fidelity (Monefy.Data.15-10-26.csv)', () => {
  let db: MonefyDatabase;
  const sampleFilePath = path.resolve(__dirname, '../../../Monefy.Data.15-10-26.csv');
  let rawCsvContent: string;

  beforeEach(async () => {
    db = new MonefyDatabase(`test-monefy-fidelity-${Date.now()}`);
    await db.open();
    rawCsvContent = fs.readFileSync(sampleFilePath, 'utf8');
  });

  afterEach(async () => {
    await db.delete();
  });

  it('parses Monefy.Data.15-10-26.csv with 100% accuracy, detecting INR currency and 130 valid rows', () => {
    const parseResult = parseTransactionsCsv(rawCsvContent);

    expect(parseResult.format).toBe('monefy-mobile');
    expect(parseResult.detectedCurrency).toBe('INR');
    expect(parseResult.errors).toHaveLength(0);
    expect(parseResult.rows).toHaveLength(130);

    // Verify first row (Food, -40, Dahi)
    const firstRow = parseResult.rows[0];
    expect(firstRow.accountName).toBe('Cash');
    expect(firstRow.categoryName).toBe('Food');
    expect(firstRow.amount).toBe(40);
    expect(firstRow.type).toBe('expense');
    expect(firstRow.note).toBe('Dahi');
    expect(firstRow.date).toBe('2026-08-16T12:00:00.000Z');

    // Verify income row (Salary, 1,80,000)
    const salaryRow = parseResult.rows[1];
    expect(salaryRow.categoryName).toBe('Salary');
    expect(salaryRow.amount).toBe(180000);
    expect(salaryRow.type).toBe('income');
    expect(salaryRow.note).toBeUndefined();

    // Verify fractional expense row (Health, "-5,101.3")
    const fractionalRow = parseResult.rows.find((r) => r.amount === 5101.3);
    expect(fractionalRow).toBeDefined();
    expect(fractionalRow?.type).toBe('expense');
    expect(fractionalRow?.categoryName).toBe('Health');
  });

  it('imports Monefy.Data.15-10-26.csv into database and assigns rich icons and colors to new categories', async () => {
    const result = await importTransactionsFromCSV(rawCsvContent, db, { skipDuplicates: true });

    expect(result.importedTransactionsCount).toBe(130);
    expect(result.skippedDuplicatesCount).toBe(0);
    expect(result.detectedCurrency).toBe('INR');
    expect(result.errors).toHaveLength(0);

    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();
    const transactions = await db.transactions.toArray();

    expect(transactions).toHaveLength(130);
    expect(accounts.some((a) => a.name === 'Cash')).toBe(true);

    // Verify specific Monefy categories have appropriate icons & colors assigned
    const carCat = categories.find((c) => c.name.toLowerCase() === 'car');
    expect(carCat).toBeDefined();
    expect(carCat?.icon).toBe('Car');
    expect(carCat?.color).toBe('#4ECDC4');

    const houseCat = categories.find((c) => c.name.toLowerCase() === 'house');
    expect(houseCat).toBeDefined();
    expect(houseCat?.icon).toBe('Home');

    const sportsCat = categories.find((c) => c.name.toLowerCase() === 'sports');
    expect(sportsCat).toBeDefined();
    expect(sportsCat?.icon).toBe('Award');

    const clothesCat = categories.find((c) => c.name.toLowerCase() === 'clothes');
    expect(clothesCat).toBeDefined();
    expect(clothesCat?.icon).toBe('Shirt');

    const eatingOutCat = categories.find((c) => c.name.toLowerCase() === 'eating out');
    expect(eatingOutCat).toBeDefined();
    expect(eatingOutCat?.icon).toBe('Utensils');
  });

  it('exports transactions back to Monefy format with exact line-by-line parity to Monefy.Data.15-10-26.csv', async () => {
    // 1. Import source file
    await importTransactionsFromCSV(rawCsvContent, db);

    const transactions = await db.transactions.toArray();
    const categories = await db.categories.toArray();
    const accounts = await db.accounts.toArray();

    // 2. Export back to CSV in Monefy format
    const exportedCsv = exportTransactionsToCSV(transactions, categories, accounts, 'INR');

    const originalLines = rawCsvContent.trim().split('\n');
    const generatedLines = exportedCsv.trim().split('\n');

    expect(generatedLines).toHaveLength(originalLines.length);
    expect(generatedLines[0]).toBe('date,account,category,amount,currency,converted amount,currency,description');

    // Verify every single data line from original file exists in the exported output
    const originalDataSet = new Set(originalLines.slice(1));
    const generatedDataSet = new Set(generatedLines.slice(1));

    expect(generatedDataSet.size).toBe(originalDataSet.size);

    for (const originalLine of originalLines.slice(1)) {
      expect(generatedDataSet.has(originalLine)).toBe(true);
    }
  });

  it('guarantees round-trip idempotency when re-importing exported Monefy CSV', async () => {
    // Import original
    await importTransactionsFromCSV(rawCsvContent, db);
    const initialTxs = await db.transactions.toArray();
    const initialCats = await db.categories.toArray();
    const initialAccs = await db.accounts.toArray();

    // Export to Monefy CSV
    const exportedCsv = exportTransactionsToCSV(initialTxs, initialCats, initialAccs, 'INR');

    // Create a new clean DB and import the exported CSV
    const db2 = new MonefyDatabase(`test-monefy-roundtrip-${Date.now()}`);
    await db2.open();

    const secondImportResult = await importTransactionsFromCSV(exportedCsv, db2);
    expect(secondImportResult.importedTransactionsCount).toBe(130);
    expect(secondImportResult.errors).toHaveLength(0);

    const reimportedTxs = await db2.transactions.toArray();
    expect(reimportedTxs).toHaveLength(130);

    const totalIncome = reimportedTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(totalIncome).toBe(180000);

    const totalExpense = reimportedTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(totalExpense).toBeGreaterThan(0);

    await db2.delete();
  });
});
