import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumericKeypadModal } from '../components/keypad/NumericKeypadModal';
import type { Category, Account } from '../types';

describe('NumericKeypadModal Seam Tests', () => {
  const mockCategory: Category = {
    id: 'cat-food',
    name: 'Food & Drinks',
    icon: 'Utensils',
    color: '#FF6B6B',
    type: 'expense',
    isDefault: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAccounts: Account[] = [
    {
      id: 'acc-cash',
      name: 'Cash Wallet',
      icon: 'Wallet',
      color: '#2ECC71',
      initialBalance: 100,
      isDefault: true,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc-card',
      name: 'Payment Card',
      icon: 'CreditCard',
      color: '#3498DB',
      initialBalance: 500,
      isDefault: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('enters arithmetic expression, shows evaluated preview, and confirms transaction', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <NumericKeypadModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialCategory={mockCategory}
        accounts={mockAccounts}
        currency="$"
        type="expense"
      />
    );

    // Verify modal header displays category name
    expect(screen.getByText('Food & Drinks')).toBeInTheDocument();

    // Start with operator when empty (noop)
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    // Tap keys: 1, 5, -, + (replaces -), 4, ., 5, . (ignored duplicate), Backspace, 5
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '-' }));
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '.' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Backspace' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));

    // Verify live evaluated subtotal preview shows $19.50
    expect(screen.getByTestId('calculator-subtotal')).toHaveTextContent('=$19.50');

    // Add note
    const noteInput = screen.getByPlaceholderText(/Add note/i);
    fireEvent.change(noteInput, { target: { value: 'Lunch with colleagues' } });

    // Click Confirm button
    const confirmButton = screen.getByTestId('btn-keypad-confirm');
    fireEvent.click(confirmButton);

    // Verify onSave was called with calculated 19.50 amount and note
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 19.5,
        type: 'expense',
        categoryId: 'cat-food',
        accountId: 'acc-cash',
        note: 'Lunch with colleagues',
      })
    );
  });

  it('validates amount, category presence, clamps future dates, and handles closed state', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { rerender, container } = render(
      <NumericKeypadModal
        isOpen={false}
        onClose={handleClose}
        onSave={handleSave}
        initialCategory={mockCategory}
        accounts={mockAccounts}
        currency="$"
        type="expense"
      />
    );
    expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();

    rerender(
      <NumericKeypadModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        initialCategory={null}
        accounts={mockAccounts}
        currency="$"
        type="expense"
      />
    );

    // Confirm without entering amount
    const confirmButton = screen.getByTestId('btn-keypad-confirm');
    fireEvent.click(confirmButton);
    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid amount greater than 0');

    // Enter amount 10 with null initialCategory
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));
    fireEvent.click(confirmButton);
    expect(alertSpy).toHaveBeenCalledWith('Please select a category');

    // Future date clamping
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
    expect(dateInput).not.toHaveValue('2099-01-01');

    // Clear expression by clicking display
    fireEvent.click(screen.getByTestId('calculator-expression'));
    expect(screen.getByTestId('calculator-expression')).toHaveTextContent('0');

    // Close button
    fireEvent.click(screen.getByLabelText('Close keypad'));
    expect(handleClose).toHaveBeenCalled();
  });
});
