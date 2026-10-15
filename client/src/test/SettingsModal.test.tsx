import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '../components/settings/SettingsModal';
import type { Category, Account, Transaction } from '../types';

describe('SettingsModal Seam Tests', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Food', icon: 'Utensils', color: '#FF6B6B', type: 'expense', isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Cash', icon: 'Banknote', color: '#10B981', initialBalance: 100, isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockTransactions: Transaction[] = [
    { id: 'tx-1', amount: 25, type: 'expense', categoryId: 'cat-1', accountId: 'acc-1', note: 'Snack', date: '2026-10-15T12:00:00Z', createdAt: '2026-10-15T12:00:00Z', updatedAt: '2026-10-15T12:00:00Z', isDeleted: false },
  ];

  it('renders currency selection and switches global currency', () => {
    const handleSetCurrency = vi.fn();
    const handleClose = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={handleClose}
        currency="$"
        onSetCurrency={handleSetCurrency}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onRestoreDatabase={vi.fn()}
      />
    );

    expect(screen.getByText('Settings & Data')).toBeInTheDocument();
    expect(screen.getByText('Global Currency')).toBeInTheDocument();

    // Select EUR (€)
    const eurButton = screen.getByTestId('currency-btn-€');
    expect(eurButton).toBeInTheDocument();
    fireEvent.click(eurButton);

    expect(handleSetCurrency).toHaveBeenCalledWith('€');
  });

  it('provides triggers for CSV export and JSON backup', () => {
    const handleExportCSV = vi.fn();
    const handleBackupJSON = vi.fn();

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onRestoreDatabase={vi.fn()}
        onExportCSV={handleExportCSV}
        onBackupJSON={handleBackupJSON}
      />
    );

    const btnCsv = screen.getByTestId('btn-export-csv');
    fireEvent.click(btnCsv);
    expect(handleExportCSV).toHaveBeenCalledTimes(1);

    const btnJson = screen.getByTestId('btn-backup-json');
    fireEvent.click(btnJson);
    expect(handleBackupJSON).toHaveBeenCalledTimes(1);
  });
});
