import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseBreakdownView } from '../components/analytics/ExpenseBreakdownView';
import type { Category, Transaction, Account } from '../types';

describe('ExpenseBreakdownView Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food',
      icon: 'utensils',
      color: '#FF6B6B',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'cat-bills',
      name: 'Bills',
      icon: 'zap',
      color: '#F15BB5',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'cat-travel',
      name: 'Travel',
      icon: 'plane',
      color: '#3A86FF',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'Cash',
      icon: 'banknote',
      color: '#10B981',
      initialBalance: 500,
      isDefault: true,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      accountId: 'acc-1',
      categoryId: 'cat-food',
      amount: 150,
      type: 'expense',
      note: 'Supermarket supplies',
      date: '2026-10-15T10:00:00.000Z',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      isDeleted: false,
    },
    {
      id: 'tx-2',
      accountId: 'acc-1',
      categoryId: 'cat-bills',
      amount: 450,
      type: 'expense',
      note: 'Electricity bill',
      date: '2026-10-14T10:00:00.000Z',
      createdAt: '2026-10-14T10:00:00.000Z',
      updatedAt: '2026-10-14T10:00:00.000Z',
      isDeleted: false,
    },
  ];

  it('ranks categories by total spend, displays percentage bars, and expands transactions on tap', () => {
    const handleSelectTx = vi.fn();

    render(
      <ExpenseBreakdownView
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        currency="$"
        onSelectTransaction={handleSelectTx}
      />
    );

    // Total expense is 150 + 450 = 600
    // Bills is 450 (75%) -> highest ranked
    // Food is 150 (25%) -> second ranked
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();

    // Verify ranked order: Bills appears before Food
    const rankedRows = screen.getAllByTestId('analytics-category-row');
    expect(rankedRows[0]).toHaveTextContent('Bills');
    expect(rankedRows[1]).toHaveTextContent('Food');

    // Tap on Bills row to expand contributing transactions
    fireEvent.click(rankedRows[0]);

    // Contributing transaction "Electricity bill" is visible
    expect(screen.getByText('Electricity bill')).toBeInTheDocument();

    // Tap the contributing transaction
    fireEvent.click(screen.getByText('Electricity bill'));
    expect(handleSelectTx).toHaveBeenCalledWith(mockTransactions[1]);

    // Tap Bills row again to collapse (line 72: toggleExpand)
    fireEvent.click(rankedRows[0]);
    expect(screen.queryByText('Electricity bill')).not.toBeInTheDocument();
  });

  it('renders empty state when no expenses exist for period', () => {
    render(
      <ExpenseBreakdownView
        transactions={[]}
        categories={mockCategories}
        accounts={mockAccounts}
        currency="$"
        periodLabel="October 2026"
        selectedAccountId={null}
      />
    );
    expect(screen.getByText(/No expenses recorded for this period/i)).toBeInTheDocument();
  });

  it('handles transactions with empty notes and unmapped accounts', () => {
    const txWithoutNote: Transaction = {
      id: 'tx-empty-note',
      accountId: 'unknown-acc-id',
      categoryId: 'cat-food',
      amount: 80,
      type: 'expense',
      note: '',
      date: '2026-10-15T12:00:00.000Z',
      createdAt: '2026-10-15T12:00:00.000Z',
      updatedAt: '2026-10-15T12:00:00.000Z',
      isDeleted: false,
    };

    render(
      <ExpenseBreakdownView
        transactions={[txWithoutNote]}
        categories={mockCategories}
        accounts={mockAccounts}
        currency="$"
      />
    );

    const row = screen.getByTestId('analytics-category-row');
    fireEvent.click(row);
    // Should fallback to category name Food and account Default (lines 307-310)
    expect(screen.getAllByText('Food').length).toBeGreaterThan(1);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });
});
