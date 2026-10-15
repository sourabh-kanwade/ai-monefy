import { describe, it, expect } from 'vitest';
import {
  getPeriodBounds,
  stepPeriod,
  filterTransactionsByPeriod,
} from '../utils/dateFilters';
import type { Transaction } from '../types';

describe('Date Filters & Period Navigation Seam Tests', () => {
  const baseDate = new Date('2026-10-15T12:00:00Z');

  describe('getPeriodBounds', () => {
    it('calculates bounds for DAY', () => {
      const { start, end, label } = getPeriodBounds('DAY', baseDate);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(9); // October
      expect(start.getDate()).toBe(15);
      expect(start.getHours()).toBe(0);
      expect(end.getDate()).toBe(15);
      expect(end.getHours()).toBe(23);
      expect(label).toContain('Oct 15, 2026');
    });

    it('calculates bounds for MONTH', () => {
      const { start, end, label } = getPeriodBounds('MONTH', baseDate);
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(9);
      expect(label).toBe('October 2026');
    });

    it('calculates bounds for YEAR', () => {
      const { start, end, label } = getPeriodBounds('YEAR', baseDate);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(11);
      expect(label).toBe('2026');
    });

    it('calculates bounds for ALL', () => {
      const { label } = getPeriodBounds('ALL', baseDate);
      expect(label).toBe('All Time');
    });
  });

  describe('stepPeriod', () => {
    it('steps forward and backward by DAY', () => {
      const prevDay = stepPeriod('DAY', baseDate, 'prev');
      expect(prevDay.getDate()).toBe(14);

      const nextDay = stepPeriod('DAY', baseDate, 'next');
      expect(nextDay.getDate()).toBe(16);
    });

    it('steps forward and backward by MONTH', () => {
      const prevMonth = stepPeriod('MONTH', baseDate, 'prev');
      expect(prevMonth.getMonth()).toBe(8); // September

      const nextMonth = stepPeriod('MONTH', baseDate, 'next');
      expect(nextMonth.getMonth()).toBe(10); // November
    });

    it('steps forward and backward by YEAR', () => {
      const prevYear = stepPeriod('YEAR', baseDate, 'prev');
      expect(prevYear.getFullYear()).toBe(2025);

      const nextYear = stepPeriod('YEAR', baseDate, 'next');
      expect(nextYear.getFullYear()).toBe(2027);
    });
  });

  describe('filterTransactionsByPeriod', () => {
    const mockTxs: Transaction[] = [
      {
        id: 'tx-1',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: 25,
        type: 'expense',
        date: '2026-10-15T10:00:00.000Z',
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T10:00:00.000Z',
        isDeleted: false,
      },
      {
        id: 'tx-2',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: 50,
        type: 'expense',
        date: '2026-09-10T10:00:00.000Z',
        createdAt: '2026-09-10T10:00:00.000Z',
        updatedAt: '2026-09-10T10:00:00.000Z',
        isDeleted: false,
      },
      {
        id: 'tx-3',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        amount: 100,
        type: 'expense',
        date: '2025-05-01T10:00:00.000Z',
        createdAt: '2025-05-01T10:00:00.000Z',
        updatedAt: '2025-05-01T10:00:00.000Z',
        isDeleted: false,
      },
    ];

    it('filters transactions for MONTH', () => {
      const filtered = filterTransactionsByPeriod(mockTxs, 'MONTH', baseDate);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('tx-1');
    });

    it('filters transactions for YEAR', () => {
      const filtered = filterTransactionsByPeriod(mockTxs, 'YEAR', baseDate);
      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(['tx-1', 'tx-2']);
    });

    it('returns all transactions for ALL', () => {
      const filtered = filterTransactionsByPeriod(mockTxs, 'ALL', baseDate);
      expect(filtered).toHaveLength(3);
    });
  });
});
