import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransferModal } from '../components/accounts/TransferModal';
import type { Account } from '../types';

describe('TransferModal Seam Tests', () => {
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
    {
      id: 'acc-2',
      name: 'Payment Card',
      icon: 'credit-card',
      color: '#3B82F6',
      initialBalance: 1200,
      isDefault: false,
      isDeleted: false,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
  ];

  it('renders modal, validates inputs, and submits transfer payload', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <TransferModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        accounts={mockAccounts}
        currency="$"
      />
    );

    // Verify modal title
    expect(screen.getByText(/Transfer Between Accounts/i)).toBeInTheDocument();

    // Fill amount
    const amountInput = screen.getByLabelText(/Transfer Amount/i);
    fireEvent.change(amountInput, { target: { value: '150' } });

    // Choose from and to accounts
    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    fireEvent.change(fromSelect, { target: { value: 'acc-2' } });
    fireEvent.change(toSelect, { target: { value: 'acc-1' } });

    // Optional note
    const noteInput = screen.getByPlaceholderText(/ATM withdrawal/i);
    fireEvent.change(noteInput, { target: { value: 'ATM Cash' } });

    // Click confirm transfer
    const submitBtn = screen.getByRole('button', { name: /Confirm Transfer/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith({
      amount: 150,
      accountId: 'acc-2',
      toAccountId: 'acc-1',
      note: 'ATM Cash',
      date: expect.any(String),
      type: 'transfer',
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it('validates transfer amounts, same accounts, clamps future dates, and handles closed state', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { rerender } = render(
      <TransferModal
        isOpen={false}
        onClose={handleClose}
        onSave={handleSave}
        accounts={mockAccounts}
        currency="$"
      />
    );
    expect(screen.queryByText(/Transfer Between Accounts/i)).not.toBeInTheDocument();

    rerender(
      <TransferModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        accounts={mockAccounts}
        currency="$"
      />
    );

    // Invalid amount alert
    const submitBtn = screen.getByRole('button', { name: /Confirm Transfer/i });
    fireEvent.submit(submitBtn.closest('form')!);
    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid transfer amount');

    // Same from and to accounts
    const amountInput = screen.getByLabelText(/Transfer Amount/i);
    fireEvent.change(amountInput, { target: { value: '50' } });

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    fireEvent.change(fromSelect, { target: { value: 'acc-1' } });
    fireEvent.change(toSelect, { target: { value: 'acc-1' } });

    fireEvent.submit(submitBtn.closest('form')!);
    expect(alertSpy).toHaveBeenCalledWith('Source and destination accounts must be different');

    // Future date clamping
    const dateInput = screen.getByLabelText(/Date/i);
    fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
    // Date clamped to today
    expect(dateInput).not.toHaveValue('2099-01-01');

    // Close button
    fireEvent.click(screen.getByLabelText(/Close/i));
    expect(handleClose).toHaveBeenCalled();
  });
});
