import type { TimeInterval, Transaction } from '../types';

export interface PeriodBounds {
  start: Date;
  end: Date;
  label: string;
}

export function getPeriodBounds(interval: TimeInterval, refDate: Date = new Date()): PeriodBounds {
  const d = new Date(refDate);

  if (interval === 'DAY') {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { start, end, label };
  }

  if (interval === 'WEEK') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { start, end, label: `${startLabel} - ${endLabel}` };
  }

  if (interval === 'MONTH') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { start, end, label };
  }

  if (interval === 'YEAR') {
    const start = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
    const label = String(d.getFullYear());
    return { start, end, label };
  }

  // ALL or CUSTOM
  const start = new Date(0);
  const end = new Date(8640000000000000);
  return { start, end, label: 'All Time' };
}

export function stepPeriod(interval: TimeInterval, refDate: Date, direction: 'prev' | 'next'): Date {
  const d = new Date(refDate);
  const modifier = direction === 'next' ? 1 : -1;

  if (interval === 'DAY') {
    d.setDate(d.getDate() + modifier);
    return d;
  }
  if (interval === 'WEEK') {
    d.setDate(d.getDate() + modifier * 7);
    return d;
  }
  if (interval === 'MONTH') {
    d.setMonth(d.getMonth() + modifier);
    return d;
  }
  if (interval === 'YEAR') {
    d.setFullYear(d.getFullYear() + modifier);
    return d;
  }
  return d;
}

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  interval: TimeInterval,
  refDate: Date
): Transaction[] {
  if (interval === 'ALL') {
    return transactions;
  }

  const { start, end } = getPeriodBounds(interval, refDate);
  const startTime = start.getTime();
  const endTime = end.getTime();

  return transactions.filter((tx) => {
    const txTime = new Date(tx.date).getTime();
    return txTime >= startTime && txTime <= endTime;
  });
}
