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
    const label = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
    const endLabel = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

export function stepPeriod(
  interval: TimeInterval,
  refDate: Date,
  direction: 'prev' | 'next'
): Date {
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

/**
 * Formats a Date object into YYYY-MM-DD using local calendar day.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a given date is strictly in the future compared to the current day.
 */
export function isFutureDate(date: Date, now: Date = new Date()): boolean {
  const startOfDayDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return startOfDayDate.getTime() > startOfToday.getTime();
}

/**
 * Determines whether stepping to the next period is permitted.
 * Future dates are not allowed; period navigation is limited up to the current day.
 * Returns false if interval is 'ALL', or if the next period starts strictly after today.
 */
export function canStepNextPeriod(
  interval: TimeInterval,
  refDate: Date = new Date(),
  now: Date = new Date()
): boolean {
  if (interval === 'ALL') {
    return false;
  }

  const nextDate = stepPeriod(interval, refDate, 'next');
  const nextBounds = getPeriodBounds(interval, nextDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Stepping to next period is permitted only if the start of that period is on or before today
  return nextBounds.start.getTime() <= startOfToday.getTime();
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
