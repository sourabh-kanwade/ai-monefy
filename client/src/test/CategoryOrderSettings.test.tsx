import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadialCategoryGrid } from '../components/monefy-wheel/RadialCategoryGrid';
import { SettingsModal } from '../components/settings/SettingsModal';
import type { Category, Account, Transaction } from '../types';

describe('Category Order and Visibility Seam Tests', () => {
  const mockCategories: Category[] = [
    { id: 'c1', name: 'Food', icon: 'Utensils', color: '#FF6B6B', type: 'expense', isDefault: true, isDeleted: false, displayOrder: 0, isVisible: true, createdAt: '', updatedAt: '' },
    { id: 'c2', name: 'Transport', icon: 'Car', color: '#4ECDC4', type: 'expense', isDefault: true, isDeleted: false, displayOrder: 1, isVisible: true, createdAt: '', updatedAt: '' },
    { id: 'c3', name: 'Shopping', icon: 'ShoppingBag', color: '#FFE66D', type: 'expense', isDefault: true, isDeleted: false, displayOrder: 2, isVisible: false, createdAt: '', updatedAt: '' },
    { id: 'c4', name: 'Entertainment', icon: 'Film', color: '#9B5DE5', type: 'expense', isDefault: true, isDeleted: false, displayOrder: 3, isVisible: true, createdAt: '', updatedAt: '' },
    { id: 'c5', name: 'Salary', icon: 'Briefcase', color: '#2ECC71', type: 'income', isDefault: true, isDeleted: false, displayOrder: 0, isVisible: true, createdAt: '', updatedAt: '' },
  ];

  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Cash', icon: 'Banknote', color: '#10B981', initialBalance: 100, isDefault: true, createdAt: '', updatedAt: '', isDeleted: false },
  ];

  const mockTransactions: Transaction[] = [];

  describe('RadialCategoryGrid Display Order & Visibility', () => {
    it('does not render categories that have isVisible set to false', () => {
      render(
        <RadialCategoryGrid
          categories={mockCategories}
          categoryExpenses={{}}
          currency="$"
          onCategoryTap={vi.fn()}
        />
      );

      // 'Food', 'Transport', 'Entertainment' should be present
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
      expect(screen.getByText('Entertainment')).toBeInTheDocument();

      // 'Shopping' has isVisible: false, so it must NOT be in the quick-tap grid
      expect(screen.queryByText('Shopping')).not.toBeInTheDocument();
    });

    it('renders categories in displayOrder sequence', () => {
      // Reorder: Entertainment (displayOrder: 0), Transport (displayOrder: 1), Food (displayOrder: 2)
      const reorderedCategories: Category[] = [
        { ...mockCategories[0], displayOrder: 2 }, // Food
        { ...mockCategories[1], displayOrder: 1 }, // Transport
        { ...mockCategories[3], displayOrder: 0 }, // Entertainment
      ];

      render(
        <RadialCategoryGrid
          categories={reorderedCategories}
          categoryExpenses={{ c1: 100, c2: 200, c4: 5 }} // Even if Food/Transport have higher expenses, displayOrder rules
          currency="$"
          onCategoryTap={vi.fn()}
        />
      );

      const buttons = screen.getAllByRole('button');
      const categoryNames = buttons.map(b => b.textContent).filter(Boolean);

      // Entertainment should come before Transport, and Transport before Food
      const entIndex = categoryNames.findIndex(t => t?.includes('Entertainment'));
      const transIndex = categoryNames.findIndex(t => t?.includes('Transport'));
      const foodIndex = categoryNames.findIndex(t => t?.includes('Food'));

      expect(entIndex).toBeLessThan(transIndex);
      expect(transIndex).toBeLessThan(foodIndex);
    });
  });

  describe('SettingsModal Category Selection & Reordering', () => {
    it('renders category management with visibility toggles and reordering controls', () => {
      const handleToggleVisibility = vi.fn();
      const handleReorder = vi.fn();

      render(
        <SettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currency="$"
          onSetCurrency={vi.fn()}
          transactions={mockTransactions}
          categories={mockCategories}
          accounts={mockAccounts}
          onToggleCategoryVisibility={handleToggleVisibility}
          onReorderCategories={handleReorder}
        />
      );

      // Check section header
      expect(screen.getByText(/Categories & Display Order/i)).toBeInTheDocument();

      // Check categories are displayed in settings
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();

      // Toggle visibility checkbox for Food
      const foodCheckbox = screen.getByTestId('category-toggle-c1') as HTMLInputElement;
      expect(foodCheckbox.checked).toBe(true);
      fireEvent.click(foodCheckbox);
      expect(handleToggleVisibility).toHaveBeenCalledWith('c1', false);

      // Move Down button for Food (c1) should move it down
      const moveDownBtn = screen.getByTestId('category-move-down-c1');
      fireEvent.click(moveDownBtn);
      expect(handleReorder).toHaveBeenCalled();
    });

    it('switches between Expense and Income categories in settings', () => {
      render(
        <SettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currency="$"
          onSetCurrency={vi.fn()}
          transactions={mockTransactions}
          categories={mockCategories}
          accounts={mockAccounts}
        />
      );

      // Initially shows Expense categories
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.queryByText('Salary')).not.toBeInTheDocument();

      // Switch to Income tab
      const incomeTab = screen.getByTestId('tab-categories-income');
      fireEvent.click(incomeTab);

      // Now Income category 'Salary' should be displayed
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.queryByText('Food')).not.toBeInTheDocument();
    });
  });
});
