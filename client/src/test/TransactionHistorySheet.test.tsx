import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionHistorySheet } from '../components/transactions/TransactionHistorySheet';
import type { Transaction, Category, Account } from '../types';

describe('TransactionHistorySheet Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
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
      id: 'cat-2',
      name: 'Salary',
      icon: 'briefcase',
      color: '#10B981',
      type: 'income',
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
      categoryId: 'cat-1',
      amount: 32.5,
      type: 'expense',
      note: 'Grocery store sushi',
      date: '2026-10-15T14:30:00.000Z',
      createdAt: '2026-10-15T14:30:00.000Z',
      updatedAt: '2026-10-15T14:30:00.000Z',
      isDeleted: false,
    },
    {
      id: 'tx-2',
      accountId: 'acc-1',
      categoryId: 'cat-2',
      amount: 3500,
      type: 'income',
      note: 'Tech company bi-weekly paycheck',
      date: '2026-10-14T09:00:00.000Z',
      createdAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:00:00.000Z',
      isDeleted: false,
    },
  ];

  it('renders date grouped transactions and allows real-time search filtering', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TransactionHistorySheet
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        currency="$"
        onEditTransaction={handleEdit}
        onDeleteTransaction={handleDelete}
      />
    );

    // Verify both items rendered
    expect(screen.getByText(/Grocery store sushi/i)).toBeInTheDocument();
    expect(screen.getByText(/Tech company bi-weekly paycheck/i)).toBeInTheDocument();

    // Type in search bar to filter by "sushi"
    const searchInput = screen.getByPlaceholderText(/Search transactions/i);
    fireEvent.change(searchInput, { target: { value: 'sushi' } });

    // "Grocery store sushi" matches, "paycheck" filtered out
    expect(screen.getByText(/Grocery store sushi/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tech company bi-weekly paycheck/i)).not.toBeInTheDocument();

    // Click item to edit
    fireEvent.click(screen.getByText(/Grocery store sushi/i));
    expect(handleEdit).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('renders transfer transactions, handles transaction deletion, and displays empty state', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const transferTx: Transaction = {
      id: 'tx-transfer',
      accountId: 'acc-1',
      toAccountId: 'acc-2',
      categoryId: 'cat-1',
      amount: 100,
      type: 'transfer',
      note: 'ATM Transfer',
      date: '2026-10-15T10:00:00.000Z',
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      isDeleted: false,
    };

    const multiAccounts: Account[] = [
      ...mockAccounts,
      {
        id: 'acc-2',
        name: 'Card',
        icon: 'credit-card',
        color: '#3B82F6',
        initialBalance: 1000,
        isDefault: false,
        isDeleted: false,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const { rerender } = render(
      <TransactionHistorySheet
        transactions={[transferTx]}
        categories={mockCategories}
        accounts={multiAccounts}
        currency="$"
        onEditTransaction={handleEdit}
        onDeleteTransaction={handleDelete}
      />
    );

    // Assert transfer header
    expect(screen.getByText('Transfer: Cash → Card')).toBeInTheDocument();
    expect(screen.getByText('⇄ $100.00')).toBeInTheDocument();

    // Click delete transaction button
    const deleteBtn = screen.getByTitle('Delete transaction');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('tx-transfer');

    // Empty state
    rerender(
      <TransactionHistorySheet
        transactions={[]}
        categories={mockCategories}
        accounts={multiAccounts}
        currency="$"
        onEditTransaction={handleEdit}
        onDeleteTransaction={handleDelete}
      />
    );
    expect(screen.getByText(/No transactions recorded yet/i)).toBeInTheDocument();
  });
});
