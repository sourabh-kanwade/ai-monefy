import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadialCategoryGrid } from '../components/monefy-wheel/RadialCategoryGrid';
import type { Category } from '../types';

describe('RadialCategoryGrid Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'c1',
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
      id: 'c2',
      name: 'Transport',
      icon: 'Car',
      color: '#4ECDC4',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c3',
      name: 'Bills',
      icon: 'Zap',
      color: '#F15BB5',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c4',
      name: 'Health',
      icon: 'HeartPulse',
      color: '#00BBF9',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c5',
      name: 'Groceries',
      icon: 'ShoppingCart',
      color: '#FF9F1C',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c6',
      name: 'Entertainment',
      icon: 'Film',
      color: '#9B5DE5',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c7',
      name: 'Pets',
      icon: 'Dog',
      color: '#E71D36',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c8',
      name: 'Education',
      icon: 'GraduationCap',
      color: '#00F5D4',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c9',
      name: 'Travel',
      icon: 'Plane',
      color: '#3A86FF',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'c10',
      name: 'Gifts',
      icon: 'Gift',
      color: '#FF0054',
      type: 'expense',
      isDefault: true,
      isDeleted: false,
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('renders primary radial categories and triggers keypad on 1-tap', () => {
    const handleTap = vi.fn();
    const expenses = { c1: 45.5, c2: 20 };

    render(
      <RadialCategoryGrid
        categories={mockCategories}
        categoryExpenses={expenses}
        currency="$"
        onCategoryTap={handleTap}
      />
    );

    // Verify category icon and spend are rendered
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('$45.50')).toBeInTheDocument();

    // 1-Tap on Food category triggers keypad modal
    const foodBtn = screen.getByTestId('radial-category-c1');
    fireEvent.click(foodBtn);
    expect(handleTap).toHaveBeenCalledWith(mockCategories[0]);
  });

  it('opens overflow category drawer for categories beyond primary ring', () => {
    const handleTap = vi.fn();
    render(
      <RadialCategoryGrid
        categories={mockCategories}
        categoryExpenses={{}}
        currency="$"
        onCategoryTap={handleTap}
        maxPrimaryRing={6}
      />
    );

    const overflowBtn = screen.getByTestId('btn-categories-overflow');
    fireEvent.click(overflowBtn);

    // Travel (c9) should now be visible in the overflow drawer
    expect(screen.getByText('Travel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Travel'));
    expect(handleTap).toHaveBeenCalledWith(mockCategories.find((c) => c.name === 'Travel'));
  });

  it('renders over-budget warning indicator when spend exceeds category budget', () => {
    const handleTap = vi.fn();
    const expenses = { c1: 150 };
    const budgets = { c1: 100 };

    render(
      <RadialCategoryGrid
        categories={mockCategories}
        categoryExpenses={expenses}
        categoryBudgets={budgets}
        currency="$"
        onCategoryTap={handleTap}
        maxPrimaryRing={6}
      />
    );

    const overflowBtn = screen.getByTestId('btn-categories-overflow');
    fireEvent.click(overflowBtn);

    // Over budget dot in overflow drawer
    expect(screen.getAllByTitle(/Over budget by \$50\.00/i)[0]).toBeInTheDocument();
  });
});
