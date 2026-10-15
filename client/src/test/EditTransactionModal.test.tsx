import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditTransactionModal } from '../components/transactions/EditTransactionModal';
import type { Transaction, Category, Account } from '../types';

describe('EditTransactionModal Seam Tests', () => {
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
      name: 'Transport',
      icon: 'car',
      color: '#4ECDC4',
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

  const mockTx: Transaction = {
    id: 'tx-123',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    amount: 45,
    type: 'expense',
    note: 'Dinner with friends',
    date: '2026-10-15T18:00:00.000Z',
    createdAt: '2026-10-15T18:00:00.000Z',
    updatedAt: '2026-10-15T18:00:00.000Z',
    isDeleted: false,
  };

  it('allows modifying transaction amount, note, and submitting updates', () => {
    const handleSave = vi.fn();
    const handleDelete = vi.fn();
    const handleClose = vi.fn();

    render(
      <EditTransactionModal
        isOpen={true}
        transaction={mockTx}
        categories={mockCategories}
        accounts={mockAccounts}
        currency="$"
        onClose={handleClose}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText(/Edit Transaction/i)).toBeInTheDocument();

    // Modify amount
    const amountInput = screen.getByLabelText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: '55.5' } });

    // Modify note
    const noteInput = screen.getByLabelText(/Note/i);
    fireEvent.change(noteInput, { target: { value: 'Dinner and drinks' } });

    // Submit changes
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      'tx-123',
      expect.objectContaining({
        amount: 55.5,
        note: 'Dinner and drinks',
        categoryId: 'cat-1',
        accountId: 'acc-1',
        type: 'expense',
      })
    );
    expect(handleClose).toHaveBeenCalled();
  });
});
