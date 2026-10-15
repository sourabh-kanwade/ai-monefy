import { describe, it, expect } from 'vitest';
import {
  getPeriodBounds,
  stepPeriod,
  filterTransactionsByPeriod,
  canStepNextPeriod,
  isFutureDate,
  getLocalDateString,
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

  describe('canStepNextPeriod & Future Date Restrictions', () => {
    // Current date is 2026-10-15 (baseDate)
    const now = new Date('2026-10-15T12:00:00Z');

    it('limits DAY interval up to current day', () => {
      // Viewing past day (Oct 14) -> Can step to Oct 15 (current day)
      const pastDay = new Date('2026-10-14T10:00:00Z');
      expect(canStepNextPeriod('DAY', pastDay, now)).toBe(true);

      // Viewing current day (Oct 15) -> Cannot step to future day (Oct 16)
      const today = new Date('2026-10-15T10:00:00Z');
      expect(canStepNextPeriod('DAY', today, now)).toBe(false);

      // Viewing future day (Oct 16) -> Cannot step further
      const futureDay = new Date('2026-10-16T10:00:00Z');
      expect(canStepNextPeriod('DAY', futureDay, now)).toBe(false);
    });

    it('limits WEEK interval up to current week', () => {
      // Oct 15 2026 is a Thursday. Week is Oct 12 - Oct 18.
      // Past week (Oct 5 - Oct 11) -> Can step to current week
      const pastWeek = new Date('2026-10-06T10:00:00Z');
      expect(canStepNextPeriod('WEEK', pastWeek, now)).toBe(true);

      // Current week (contains Oct 15) -> Cannot step to next week (starts Oct 19)
      const currentWeek = new Date('2026-10-14T10:00:00Z');
      expect(canStepNextPeriod('WEEK', currentWeek, now)).toBe(false);
    });

    it('limits MONTH interval up to current month', () => {
      // September 2026 -> Can step to October 2026
      const pastMonth = new Date('2026-09-15T10:00:00Z');
      expect(canStepNextPeriod('MONTH', pastMonth, now)).toBe(true);

      // October 2026 (current month) -> Cannot step to November 2026
      const currentMonth = new Date('2026-10-01T10:00:00Z');
      expect(canStepNextPeriod('MONTH', currentMonth, now)).toBe(false);
    });

    it('limits YEAR interval up to current year', () => {
      // 2025 -> Can step to 2026
      const pastYear = new Date('2025-06-15T10:00:00Z');
      expect(canStepNextPeriod('YEAR', pastYear, now)).toBe(true);

      // 2026 (current year) -> Cannot step to 2027
      const currentYear = new Date('2026-01-01T10:00:00Z');
      expect(canStepNextPeriod('YEAR', currentYear, now)).toBe(false);
    });

    it('disallows ALL interval stepping next', () => {
      expect(canStepNextPeriod('ALL', baseDate, now)).toBe(false);
    });

    it('correctly identifies future dates with isFutureDate', () => {
      // Local timezone dates compared with now
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const future = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      expect(isFutureDate(past, now)).toBe(false);
      expect(isFutureDate(current, now)).toBe(false);
      expect(isFutureDate(future, now)).toBe(true);
    });

    it('formats local date string as YYYY-MM-DD', () => {
      const date = new Date(2026, 9, 15);
      expect(getLocalDateString(date)).toBe('2026-10-15');
    });
  });
});
