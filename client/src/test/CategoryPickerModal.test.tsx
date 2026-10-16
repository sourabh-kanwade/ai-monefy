import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CategoryPickerModal } from '../components/categories/CategoryPickerModal';
import type { Category } from '../types';

describe('CategoryPickerModal Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-bills',
      name: 'Bills',
      type: 'expense',
      icon: 'Receipt',
      color: '#EF4444',
      displayOrder: 2,
      isVisible: true,
      isDeleted: false,
      isDefault: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'cat-food',
      name: 'Food & Drinks',
      type: 'expense',
      icon: 'Utensils',
      color: '#F59E0B',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      isDefault: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'cat-hidden',
      name: 'Hidden Cat',
      type: 'expense',
      icon: 'Tag',
      color: '#888888',
      displayOrder: 3,
      isVisible: false,
      isDeleted: false,
      isDefault: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'cat-deleted',
      name: 'Deleted Cat',
      type: 'expense',
      icon: 'Trash',
      color: '#999999',
      displayOrder: 0,
      isVisible: true,
      isDeleted: true,
      isDefault: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'cat-salary',
      name: 'Salary',
      type: 'income',
      icon: 'Wallet',
      color: '#10B981',
      displayOrder: 1,
      isVisible: true,
      isDeleted: false,
      isDefault: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
  ];

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <CategoryPickerModal
        isOpen={false}
        onClose={vi.fn()}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders active and visible categories of the specified type sorted by displayOrder', () => {
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
        type="expense"
        categoryExpenses={{ 'cat-food': 45.5, 'cat-bills': 120.0 }}
        currency="$"
      />
    );

    // Dialog accessibility attributes
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Only active visible expense categories should appear
    expect(screen.getByText('Food & Drinks')).toBeInTheDocument();
    expect(screen.getByText('Bills')).toBeInTheDocument();
    expect(screen.queryByText('Hidden Cat')).not.toBeInTheDocument();
    expect(screen.queryByText('Deleted Cat')).not.toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();

    // Check display order: Food (displayOrder: 1) before Bills (displayOrder: 2)
    const categoryButtons = screen.getAllByRole('button', { name: /Food & Drinks|Bills/ });
    expect(categoryButtons[0]).toHaveTextContent('Food & Drinks');
    expect(categoryButtons[1]).toHaveTextContent('Bills');

    // Check spend amount rendering
    expect(screen.getByText('$45.50')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
  });

  it('renders income categories when type is income', () => {
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
        type="income"
      />
    );

    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.queryByText('Food & Drinks')).not.toBeInTheDocument();
  });

  it('triggers onSelectCategory when a category item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectCategory={handleSelect}
        categories={mockCategories}
        type="expense"
      />
    );

    const foodBtn = screen.getByTestId('category-picker-item-cat-food');
    fireEvent.click(foodBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cat-food', name: 'Food & Drinks' })
    );
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={handleClose}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
      />
    );

    const closeBtn = screen.getByLabelText(/close category picker/i);
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when backdrop overlay is clicked', () => {
    const handleClose = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={handleClose}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
      />
    );

    const overlay = screen.getByTestId('category-picker-overlay');
    fireEvent.click(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onClose when modal content is clicked', () => {
    const handleClose = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={handleClose}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('triggers onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={handleClose}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays budget overrun indicator when category spend exceeds budget', () => {
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
        type="expense"
        categoryExpenses={{ 'cat-food': 150 }}
        categoryBudgets={{ 'cat-food': 100 }}
      />
    );

    expect(screen.getByTestId('over-budget-cat-food')).toBeInTheDocument();
  });

  it('renders "+ Custom / New Category" button and fires onOpenCustomizer', () => {
    const handleOpenCustomizer = vi.fn();
    render(
      <CategoryPickerModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectCategory={vi.fn()}
        categories={mockCategories}
        onOpenCustomizer={handleOpenCustomizer}
      />
    );

    const customBtn = screen.getByTestId('btn-category-picker-custom');
    expect(customBtn).toBeInTheDocument();
    fireEvent.click(customBtn);

    expect(handleOpenCustomizer).toHaveBeenCalledTimes(1);
  });
});
