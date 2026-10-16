import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../components/settings/SettingsModal';
import { MonefyDatabase } from '../db/localDb';
import type { Category, Account, Transaction } from '../types';

describe('SettingsModal Seam Tests', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Food',
      icon: 'Utensils',
      color: '#FF6B6B',
      type: 'expense',
      isDefault: true,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
      isDeleted: false,
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'Cash',
      icon: 'Banknote',
      color: '#10B981',
      initialBalance: 100,
      isDefault: true,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
      isDeleted: false,
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      amount: 25,
      type: 'expense',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      note: 'Snack',
      date: '2026-10-15T12:00:00Z',
      createdAt: '2026-10-15T12:00:00Z',
      updatedAt: '2026-10-15T12:00:00Z',
      isDeleted: false,
    },
  ];

  beforeEach(() => {
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

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

  it('handles add custom category trigger, closed state, and close button', () => {
    const handleClose = vi.fn();
    const handleAddCategory = vi.fn();

    const { rerender } = render(
      <SettingsModal
        isOpen={false}
        onClose={handleClose}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onRestoreDatabase={vi.fn()}
      />
    );
    expect(screen.queryByText('Settings & Data')).not.toBeInTheDocument();

    rerender(
      <SettingsModal
        isOpen={true}
        onClose={handleClose}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onRestoreDatabase={vi.fn()}
        onAddCategory={handleAddCategory}
      />
    );

    // Click Add Custom category
    const addCatBtn = screen.getByTestId('btn-add-category-settings');
    fireEvent.click(addCatBtn);
    expect(handleAddCategory).toHaveBeenCalled();

    // Click close button
    fireEvent.click(screen.getByTestId('btn-close-settings'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('handles CSV import success without result and reader error', async () => {
    const handleImportCsv = vi.fn().mockResolvedValue(undefined);

    const { container } = render(
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

    // CSV input
    const csvInput = container.querySelector(
      'input[type="file"][accept*=".csv"]'
    ) as HTMLInputElement;
    expect(csvInput).toBeInTheDocument();

    const file = new File(['Date,Category,Amount\n2026-10-15,Food,20'], 'sample.csv', {
      type: 'text/csv',
    });
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Transactions CSV imported successfully!')).toBeInTheDocument();
    });

    // Test reader.onerror branch (lines 270-272)
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function (
      this: FileReader
    ) {
      if (this.onerror) {
        this.onerror(new ProgressEvent('error') as any);
      }
    });

    fireEvent.change(csvInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText('Error reading file.')).toBeInTheDocument();
    });
    readSpy.mockRestore();
  });

  it('handles onImportCSV returning full summary with detected currency and skipped duplicates', async () => {
    const handleSetCurrency = vi.fn();
    const handleImportCSV = vi.fn().mockResolvedValue({
      importedTransactionsCount: 5,
      createdCategoriesCount: 2,
      createdAccountsCount: 1,
      skippedDuplicatesCount: 2,
      detectedCurrency: 'EUR',
    });

    const { container } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={handleSetCurrency}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        onImportCSV={handleImportCSV}
      />
    );

    const csvInput = container.querySelector(
      'input[type="file"][accept*=".csv"]'
    ) as HTMLInputElement;
    const file = new File(['Date,Category,Amount\n2026-10-15,Food,20'], 'sample.csv', {
      type: 'text/csv',
    });
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleSetCurrency).toHaveBeenCalledWith('€');
      expect(screen.getByText(/Successfully imported 5 transactions/i)).toBeInTheDocument();
      expect(
        screen.getByText(/2 duplicates skipped, currency set to € \(EUR\)/i)
      ).toBeInTheDocument();
    });
  });

  it('imports CSV using fallback db prop when onImportCSV is not provided', async () => {
    const db = new MonefyDatabase('settings-test-import-db');
    const { container } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        db={db}
      />
    );

    const csvInput = container.querySelector(
      'input[type="file"][accept*=".csv"]'
    ) as HTMLInputElement;
    const csvContent = ['Date,Category,Account,Amount', '2026-10-15,Food,Cash,25'].join('\n');
    const file = new File([csvContent], 'monefy.csv', { type: 'text/csv' });
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 1 transactions/i)).toBeInTheDocument();
    });
  });

  it('handles JSON database restore success, db fallback, error handling, and reader errors', async () => {
    const handleRestoreDatabase = vi.fn().mockResolvedValue(undefined);
    const db = new MonefyDatabase('settings-test-restore-db');

    const { rerender } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        initialTab="data"
        onRestoreDatabase={handleRestoreDatabase}
      />
    );

    const jsonInput = screen.getByTestId('input-restore-file') as HTMLInputElement;

    // Trigger file change with no file (early return)
    fireEvent.change(jsonInput, { target: { files: [] } });
    expect(handleRestoreDatabase).not.toHaveBeenCalled();

    // Trigger file change with valid file and onRestoreDatabase
    const validJsonFile = new File([JSON.stringify({ version: 1 })], 'backup.json', {
      type: 'application/json',
    });
    fireEvent.change(jsonInput, { target: { files: [validJsonFile] } });
    await waitFor(() => {
      expect(handleRestoreDatabase).toHaveBeenCalled();
    });

    // Test JSON restore with db prop directly
    rerender(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        initialTab="data"
        db={db}
      />
    );
    const validBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: mockAccounts,
      categories: mockCategories,
      transactions: mockTransactions,
      budgets: [],
    };
    const backupFile = new File([JSON.stringify(validBackupData)], 'valid.json', {
      type: 'application/json',
    });
    fireEvent.change(jsonInput, { target: { files: [backupFile] } });
    await waitFor(() => {
      expect(screen.getByText(/Successfully restored 1 transactions/i)).toBeInTheDocument();
    });

    // Test JSON restore rejection
    const invalidFile = new File(['invalid json file'], 'invalid.json', {
      type: 'application/json',
    });
    fireEvent.change(jsonInput, { target: { files: [invalidFile] } });
    await waitFor(() => {
      expect(screen.getByText(/Restore failed:/i)).toBeInTheDocument();
    });

    // Test reader.onerror branch for JSON restore
    const readSpy = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function (
      this: FileReader
    ) {
      if (this.onerror) {
        this.onerror(new ProgressEvent('error') as any);
      }
    });
    fireEvent.change(jsonInput, { target: { files: [validJsonFile] } });
    await waitFor(() => {
      expect(screen.getByText('Error reading file.')).toBeInTheDocument();
    });
    readSpy.mockRestore();
  });

  it('handles CSV import rejection and empty file change', async () => {
    const handleImportCSV = vi.fn().mockRejectedValue(new Error('CSV parsing syntax failed'));
    const { container } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        initialTab="data"
        onImportCSV={handleImportCSV}
      />
    );

    const csvInput = container.querySelector(
      'input[type="file"][accept*=".csv"]'
    ) as HTMLInputElement;

    // Empty file change
    fireEvent.change(csvInput, { target: { files: [] } });
    expect(handleImportCSV).not.toHaveBeenCalled();

    // Rejected CSV file
    const file = new File(['bad csv'], 'bad.csv', { type: 'text/csv' });
    fireEvent.change(csvInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText('Import failed: CSV parsing syntax failed')).toBeInTheDocument();
    });
  });

  it('handles category scrolling, visibility toggling, reordering, and validation', async () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    const handleToggleVisibility = vi.fn();
    const handleReorder = vi.fn();

    const twoCategories: Category[] = [
      {
        id: 'cat-1',
        name: 'Food',
        icon: 'Utensils',
        color: '#f00',
        type: 'expense',
        isDefault: true,
        createdAt: '',
        updatedAt: '',
        isDeleted: false,
        displayOrder: 0,
        isVisible: true,
      },
      {
        id: 'cat-2',
        name: 'Transport',
        icon: 'Car',
        color: '#0f0',
        type: 'expense',
        isDefault: false,
        createdAt: '',
        updatedAt: '',
        isDeleted: false,
        displayOrder: 1,
        isVisible: true,
      },
    ];

    const { rerender } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={twoCategories}
        accounts={mockAccounts}
        initialTab="categories"
        onToggleCategoryVisibility={handleToggleVisibility}
        onReorderCategories={handleReorder}
      />
    );

    expect(scrollSpy).toHaveBeenCalled();

    // Reorder cat-1 down
    fireEvent.click(screen.getByTestId('category-move-down-cat-1'));
    expect(handleReorder).toHaveBeenCalledWith(['cat-2', 'cat-1']);

    // Reorder cat-2 up
    fireEvent.click(screen.getByTestId('category-move-up-cat-2'));
    expect(handleReorder).toHaveBeenCalledWith(['cat-2', 'cat-1']);

    // Toggle cat-1 visibility to false
    fireEvent.click(screen.getByTestId('category-toggle-cat-1'));
    expect(handleToggleVisibility).toHaveBeenCalledWith('cat-1', false);

    // Test last visible category safeguard
    const singleCat: Category[] = [
      {
        id: 'cat-1',
        name: 'Food',
        icon: 'Utensils',
        color: '#f00',
        type: 'expense',
        isDefault: true,
        createdAt: '',
        updatedAt: '',
        isDeleted: false,
        isVisible: true,
      },
    ];
    rerender(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={singleCat}
        accounts={mockAccounts}
        initialTab="categories"
        onToggleCategoryVisibility={handleToggleVisibility}
      />
    );
    fireEvent.click(screen.getByTestId('category-toggle-cat-1'));
    expect(
      screen.getByText(/At least one expense category must remain visible/i)
    ).toBeInTheDocument();
  });

  it('handles fallback CSV export and JSON backup without handler props', async () => {
    const db = new MonefyDatabase('settings-test-export-db');

    // 1. Without onExportCSV
    const { rerender } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        initialTab="data"
      />
    );
    fireEvent.click(screen.getByTestId('btn-export-csv'));
    expect(screen.getByText(/Exported 1 transactions as Monefy.Data/i)).toBeInTheDocument();

    // 2. Backup JSON without db -> error
    fireEvent.click(screen.getByTestId('btn-backup-json'));
    expect(screen.getByText('Database instance not available for backup.')).toBeInTheDocument();

    // 3. Backup JSON with db -> success
    rerender(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={mockTransactions}
        categories={mockCategories}
        accounts={mockAccounts}
        initialTab="data"
        db={db}
      />
    );
    fireEvent.click(screen.getByTestId('btn-backup-json'));
    await waitFor(() => {
      expect(screen.getByText('Full JSON backup created and downloaded!')).toBeInTheDocument();
    });

    // 4. Backup JSON with db error
    vi.spyOn(db.transactions, 'toArray').mockRejectedValueOnce(new Error('Disk failure'));
    fireEvent.click(screen.getByTestId('btn-backup-json'));
    await waitFor(() => {
      expect(screen.getByText(/Backup failed: Disk failure/i)).toBeInTheDocument();
    });
  });
});
