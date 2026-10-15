import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../components/settings/SettingsModal';
import type { Category, Account, Transaction } from '../types';

describe('SettingsModal CSV Import UI Seam Tests', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'Food', icon: 'Utensils', color: '#FF6B6B', type: 'expense', isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockAccounts: Account[] = [
    { id: 'acc-1', name: 'Cash', icon: 'Banknote', color: '#10B981', initialBalance: 100, isDefault: true, createdAt: '2026-10-15T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z', isDeleted: false },
  ];

  const mockTransactions: Transaction[] = [];

  it('renders CSV import button and triggers hidden file picker', () => {
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

    const importBtn = screen.getByTestId('btn-trigger-import-csv');
    expect(importBtn).toBeInTheDocument();
    expect(importBtn).toHaveTextContent(/import transactions/i);

    const fileInput = screen.getByTestId('input-import-csv') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toContain('.csv');
  });

  it('invokes onImportCSV callback and displays success banner upon valid file upload', async () => {
    const handleImportCsv = vi.fn().mockResolvedValue({
      importedTransactionsCount: 15,
      createdAccountsCount: 1,
      createdCategoriesCount: 2,
      skippedDuplicatesCount: 0,
      detectedFormat: 'monefy-export',
      errors: [],
    });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onImportCSV={handleImportCsv}
      />
    );

    const fileInput = screen.getByTestId('input-import-csv');
    const validCsv = 'Date,Type,Category,Account,ToAccount,Amount,Note\n2026-10-15,expense,Food,Cash,,25,Snack';
    const file = new File([validCsv], 'transactions.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleImportCsv).toHaveBeenCalledWith(validCsv);
    });

    await waitFor(() => {
      expect(screen.getByText(/successfully imported 15 transactions/i)).toBeInTheDocument();
    });
  });

  it('displays error notification banner if CSV import fails', async () => {
    const handleImportCsv = vi.fn().mockRejectedValue(new Error('Invalid CSV columns'));

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onImportCSV={handleImportCsv}
      />
    );

    const fileInput = screen.getByTestId('input-import-csv');
    const file = new File(['bad,csv'], 'bad.csv', { type: 'text/csv' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/import failed: invalid csv columns/i)).toBeInTheDocument();
    });
  });
});
