import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CircularChart } from '../components/monefy-wheel/CircularChart';
import type { Category } from '../types';

describe('CircularChart Component Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food',
      icon: 'Utensils',
      color: '#FF6B6B',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'cat-transport',
      name: 'Transport',
      icon: 'Car',
      color: '#4ECDC4',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('renders empty ring placeholder when there are zero expenses', () => {
    render(
      <CircularChart
        categories={mockCategories}
        categoryExpenses={{}}
        totalExpense={0}
        currency="$"
      />
    );

    expect(screen.getByTestId('empty-wheel-ring')).toBeInTheDocument();
  });

  it('renders proportional slices and displays category breakdown on slice click', () => {
    const handleSelectCategory = vi.fn();
    const categoryExpenses = {
      'cat-food': 60,
      'cat-transport': 40,
    };

    render(
      <CircularChart
        categories={mockCategories}
        categoryExpenses={categoryExpenses}
        totalExpense={100}
        currency="$"
        onSelectCategory={handleSelectCategory}
      />
    );

    // Verify slices exist for food (60%) and transport (40%)
    const foodSlice = screen.getByTestId('slice-cat-food');
    const transportSlice = screen.getByTestId('slice-cat-transport');
    expect(foodSlice).toBeInTheDocument();
    expect(transportSlice).toBeInTheDocument();

    // Clicking food slice triggers onSelectCategory and reveals slice details
    fireEvent.click(foodSlice);
    expect(handleSelectCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-food', name: 'Food' })
    );

    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/60%/)).toBeInTheDocument();
  });
});
