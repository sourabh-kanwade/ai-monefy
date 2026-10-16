import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountManagerModal } from '../components/accounts/AccountManagerModal';
import type { Account } from '../types';

describe('AccountManagerModal Seam Tests', () => {
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

  const mockBalances: Record<string, number> = {
    'acc-1': 500,
  };

  it('renders existing accounts and allows adding a new account', () => {
    const handleClose = vi.fn();
    const handleAddAccount = vi.fn();
    const handleUpdateAccount = vi.fn();
    const handleDeleteAccount = vi.fn();

    render(
      <AccountManagerModal
        isOpen={true}
        onClose={handleClose}
        accounts={mockAccounts}
        accountBalances={mockBalances}
        currency="$"
        onAddAccount={handleAddAccount}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    );

    expect(screen.getByText('Manage Accounts')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();

    // Click trigger to show form
    fireEvent.click(screen.getByRole('button', { name: /Add Another Account/i }));

    // Fill in new account form
    const nameInput = screen.getByPlaceholderText(/e.g. Crypto Wallet, Checking/i);
    fireEvent.change(nameInput, { target: { value: 'Savings Vault' } });

    const balanceInput = screen.getByLabelText(/Initial Balance/i);
    fireEvent.change(balanceInput, { target: { value: '2500' } });

    // Submit new account
    const createBtn = screen.getByRole('button', { name: /Add Account/i });
    fireEvent.click(createBtn);

    expect(handleAddAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Savings Vault',
        initialBalance: 2500,
      })
    );
  });

  it('handles empty name validation, editing account name, and archiving account', () => {
    const handleClose = vi.fn();
    const handleAddAccount = vi.fn();
    const handleUpdateAccount = vi.fn();
    const handleDeleteAccount = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

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
      <AccountManagerModal
        isOpen={false}
        onClose={handleClose}
        accounts={multiAccounts}
        accountBalances={mockBalances}
        currency="$"
        onAddAccount={handleAddAccount}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    );
    expect(screen.queryByText('Manage Accounts')).not.toBeInTheDocument();

    rerender(
      <AccountManagerModal
        isOpen={true}
        onClose={handleClose}
        accounts={multiAccounts}
        accountBalances={mockBalances}
        currency="$"
        onAddAccount={handleAddAccount}
        onUpdateAccount={handleUpdateAccount}
        onDeleteAccount={handleDeleteAccount}
      />
    );

    // Empty name alert
    fireEvent.click(screen.getByRole('button', { name: /Add Another Account/i }));
    const createBtn = screen.getByRole('button', { name: /Add Account/i });
    fireEvent.submit(createBtn.closest('form')!);
    expect(alertSpy).toHaveBeenCalledWith('Please enter an account name');

    // Edit account name
    const editBtn = screen.getByLabelText('Edit Cash');
    fireEvent.click(editBtn);

    const renameInput = screen.getByDisplayValue('Cash');
    fireEvent.change(renameInput, { target: { value: 'Pocket Cash' } });

    const saveRenameBtn = screen.getByLabelText('Save name');
    fireEvent.click(saveRenameBtn);
    expect(handleUpdateAccount).toHaveBeenCalledWith('acc-1', { name: 'Pocket Cash' });

    // Archive account
    const archiveBtn = screen.getByLabelText('Archive Card');
    fireEvent.click(archiveBtn);
    expect(confirmSpy).toHaveBeenCalledWith('Archive account "Card"?');
    expect(handleDeleteAccount).toHaveBeenCalledWith('acc-2');

    // Close button
    fireEvent.click(screen.getByLabelText('Close'));
    expect(handleClose).toHaveBeenCalled();
  });
});
