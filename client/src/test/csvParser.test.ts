import { describe, it, expect } from 'vitest';
import { parseTransactionsCsv, tokenizeCsv, parseAmount } from '../utils/csvParser';

describe('CSV Tokenizer (RFC-4180 Compliance)', () => {
  it('parses simple unquoted comma-separated rows', () => {
    const csv = 'Date,Type,Amount\n2026-10-15,expense,25.50\n2026-10-16,income,100';
    const grid = tokenizeCsv(csv);
    expect(grid).toEqual([
      ['Date', 'Type', 'Amount'],
      ['2026-10-15', 'expense', '25.50'],
      ['2026-10-16', 'income', '100'],
    ]);
  });

  it('handles quotes with internal commas and escaped double quotes', () => {
    const csv = 'Header1,Header2\n"Hello, world","Say ""cheese"""\n"Line with\nnewline",simple';
    const grid = tokenizeCsv(csv);
    expect(grid).toEqual([
      ['Header1', 'Header2'],
      ['Hello, world', 'Say "cheese"'],
      ['Line with\nnewline', 'simple'],
    ]);
  });

  it('handles CRLF and trailing empty lines gracefully', () => {
    const csv = 'A,B\r\n1,2\r\n3,4\r\n\r\n';
    const grid = tokenizeCsv(csv);
    expect(grid).toEqual([
      ['A', 'B'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});

describe('parseTransactionsCsv (Schema Detection & Row Normalization)', () => {
  it('parses AI Monefy native exported CSV format', () => {
    const nativeCsv = [
      'Date,Type,Category,Account,ToAccount,Amount,Note',
      '2026-10-15T12:00:00Z,expense,Food & Dining,Cash,,45.5,"Lunch, with coffee ""special"""',
      '2026-10-14T09:00:00Z,income,Salary,Bank Card,,3000,October paycheck',
      '2026-10-15T10:00:00Z,transfer,Food & Dining,Bank Card,Cash,200,ATM withdrawal',
    ].join('\n');

    const result = parseTransactionsCsv(nativeCsv);
    expect(result.format).toBe('monefy-export');
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);

    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      type: 'expense',
      categoryName: 'Food & Dining',
      accountName: 'Cash',
      amount: 45.5,
      note: 'Lunch, with coffee "special"',
    });

    expect(result.rows[2]).toMatchObject({
      rowNumber: 4,
      type: 'transfer',
      accountName: 'Bank Card',
      toAccountName: 'Cash',
      amount: 200,
      note: 'ATM withdrawal',
    });
  });

  it('detects and parses classic Monefy mobile export format', () => {
    // Monefy Android classic export format:
    // date,account,category,amount,currency,converted amount,currency,description
    // Expenses typically have negative amounts or standard positive amounts
    const classicCsv = [
      'date,account,category,amount,currency,converted amount,currency,description',
      '15/10/2026,Cash,Groceries,-35.50,$,-35.50,$,Supermarket run',
      '14/10/2026,Bank Card,Salary,2500,$,2500,$,Monthly wage',
      '15/10/2026,Bank Card,' + 'Payment -> Cash' + ',200,$,200,$,ATM withdraw',
    ].join('\n');

    const result = parseTransactionsCsv(classicCsv);
    expect(result.format).toBe('monefy-mobile');
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);

    // Negative amount interpreted as expense with positive amount value
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[0].amount).toBe(35.5);
    expect(result.rows[0].categoryName).toBe('Groceries');
    expect(result.rows[0].accountName).toBe('Cash');

    // Positive amount without transfer indicator interpreted as income
    expect(result.rows[1].type).toBe('income');
    expect(result.rows[1].amount).toBe(2500);

    // Transfer syntax in classic Monefy
    expect(result.rows[2].type).toBe('transfer');
    expect(result.rows[2].accountName).toBe('Bank Card');
    expect(result.rows[2].toAccountName).toBe('Cash');
    expect(result.rows[2].amount).toBe(200);
  });

  it('parses generic CSV with case-insensitive headers and common aliases', () => {
    const genericCsv = [
      'DATE,CATEGORY,ACCOUNT,AMOUNT,TYPE,MEMO',
      '2026-10-12,Utilities,Checking,$120.75,expense,Electricity bill',
      '2026-10-13,Dividends,Brokerage,50.00,income,Quarterly payout',
    ].join('\n');

    const result = parseTransactionsCsv(genericCsv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].amount).toBe(120.75);
    expect(result.rows[0].note).toBe('Electricity bill');
    expect(result.rows[0].type).toBe('expense');
  });

  it('handles generic format with unassigned type, negative amount, and missing account', () => {
    const csv = [
      'Date,Category,Amount,Type',
      '2026-10-12,Food,30.00,Debit', // typeCol provided, value != income/transfer -> expense (line 392)
      '2026-10-13,Transport,-15.50,', // empty type, negative amount -> expense
    ].join('\n');

    const result = parseTransactionsCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].type).toBe('expense');
    expect(result.rows[0].accountName).toBe('Cash'); // default account
    expect(result.rows[1].type).toBe('expense');
    expect(result.rows[1].amount).toBe(15.5);

    // Test line 333-334 (amount empty but converted amount present)
    // and line 394 (no Type column at all, negative amount -> expense)
    const convertedCsv = [
      'Date,Category,Amount,Converted amount',
      '2026-10-14,Food,,75.00',
      '2026-10-15,Bills,-40.00,',
    ].join('\n');
    const convertedResult = parseTransactionsCsv(convertedCsv);
    expect(convertedResult.errors).toHaveLength(0);
    expect(convertedResult.rows[0].amount).toBe(75);
    expect(convertedResult.rows[1].type).toBe('expense');
    expect(convertedResult.rows[1].amount).toBe(40);
  });

  it('collects detailed row-level errors for malformed or missing required data', () => {
    const invalidCsv = [
      'Date,Category,Account,Amount',
      'not-a-valid-date,Food,Cash,25',
      '2026-10-15,Food,Cash,invalid-amount',
      '2026-10-16,Food,Cash,0',
      '2026-10-17,,Cash,15',
    ].join('\n');

    const result = parseTransactionsCsv(invalidCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors.some((e) => e.rowNumber === 2 && e.reason.includes('date'))).toBe(true);
    expect(result.errors.some((e) => e.rowNumber === 3 && e.reason.includes('amount'))).toBe(true);
    expect(
      result.errors.some((e) => e.rowNumber === 4 && e.reason.includes('greater than 0'))
    ).toBe(true);
    expect(result.errors.some((e) => e.rowNumber === 5 && e.reason.includes('Category'))).toBe(
      true
    );
  });

  it('rejects completely empty or headerless content', () => {
    expect(() => parseTransactionsCsv('')).toThrow(/empty/i);
    expect(() => parseTransactionsCsv('   \n  \n')).toThrow(/empty/i);
    expect(() => parseTransactionsCsv(',,\n,,')).toThrow(/CSV contains no rows/i);
  });

  it('supports isolated carriage returns, empty row skipping, 2-digit years, and fallback dates', () => {
    const macCsv = 'A,B\r1,2';
    expect(tokenizeCsv(macCsv)).toEqual([
      ['A', 'B'],
      ['1', '2'],
    ]);

    const mixedCsv = [
      'Date,Category,Account,Amount',
      '15/10/26,Food,Cash,25',
      '',
      '15/10/99,Drinks,Cash,15',
      'October 15 2026,Snacks,Cash,10',
    ].join('\n');

    const result = parseTransactionsCsv(mixedCsv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].date).toContain('2026');
    expect(result.rows[1].date).toContain('1999');
    expect(result.rows[2].date).toContain('2026');
  });

  it('parses diverse international amount formats and accounting notations', () => {
    expect(parseAmount('(500)')).toEqual({ amount: 500, isNegative: true });
    expect(parseAmount('1.250,50')).toEqual({ amount: 1250.5, isNegative: false });
    expect(parseAmount('1,80,000.50')).toEqual({ amount: 180000.5, isNegative: false });
    expect(parseAmount('12,50')).toEqual({ amount: 12.5, isNegative: false });
    expect(parseAmount('1,234,567')).toEqual({ amount: 1234567, isNegative: false });
    expect(parseAmount('99,999')).toEqual({ amount: 99999, isNegative: false });
    expect(parseAmount('12,1234')).toEqual({ amount: 121234, isNegative: false });
  });
});
