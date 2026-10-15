import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetModal } from '../components/budgets/BudgetModal';
import type { Category, Budget } from '../types';

describe('BudgetModal Seam Tests', () => {
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

  const mockBudgets: Budget[] = [
    {
      id: 'b-1',
      categoryId: 'cat-1',
      monthlyLimit: 250,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  const mockExpenses: Record<string, number> = {
    'cat-1': 180,
    'cat-2': 50,
  };

  it('renders category budgets and allows setting a monthly limit', () => {
    const handleSetBudget = vi.fn();
    const handleRemoveBudget = vi.fn();
    const handleClose = vi.fn();

    render(
      <BudgetModal
        isOpen={true}
        onClose={handleClose}
        categories={mockCategories}
        budgets={mockBudgets}
        categoryExpenses={mockExpenses}
        currency="$"
        onSetBudget={handleSetBudget}
        onRemoveBudget={handleRemoveBudget}
      />
    );

    expect(screen.getByText('Category Budgets')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();

    // Click edit budget on Transport
    const editTransportBtn = screen.getByLabelText(/Set budget for Transport/i);
    fireEvent.click(editTransportBtn);

    // Enter limit 300
    const limitInput = screen.getByPlaceholderText(/Enter monthly limit/i);
    fireEvent.change(limitInput, { target: { value: '300' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Budget/i });
    fireEvent.click(saveBtn);

    expect(handleSetBudget).toHaveBeenCalledWith('cat-2', 300);
  });
});
