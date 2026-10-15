import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountBar } from '../components/accounts/AccountBar';
import type { Account } from '../types';

describe('AccountBar Seam Tests', () => {
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

  const mockBalances: Record<string, number> = {
    'acc-1': 450,
    'acc-2': 1100,
  };

  it('renders all accounts and handles account selection and manage trigger', () => {
    const handleSelectAccount = vi.fn();
    const handleOpenManager = vi.fn();

    render(
      <AccountBar
        accounts={mockAccounts}
        accountBalances={mockBalances}
        selectedAccountId={null}
        totalBalance={1550}
        currency="$"
        onSelectAccount={handleSelectAccount}
        onOpenManager={handleOpenManager}
      />
    );

    // Verify All Accounts pill exists and shows total balance
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
    expect(screen.getByText('$1,550.00')).toBeInTheDocument();

    // Verify Cash and Payment Card pills
    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('$450.00')).toBeInTheDocument();
    expect(screen.getByText('Payment Card')).toBeInTheDocument();
    expect(screen.getByText('$1,100.00')).toBeInTheDocument();

    // Click Cash account
    fireEvent.click(screen.getByText('Cash'));
    expect(handleSelectAccount).toHaveBeenCalledWith('acc-1');

    // Click manage accounts
    const manageBtn = screen.getByLabelText(/Manage Accounts/i);
    fireEvent.click(manageBtn);
    expect(handleOpenManager).toHaveBeenCalled();
  });
});
