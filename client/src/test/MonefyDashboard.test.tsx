import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonefyDashboard } from '../components/dashboard/MonefyDashboard';
import { FinanceProvider } from '../context/FinanceContext';
import { MonefyDatabase } from '../db/localDb';
import { syncEngine } from '../db/syncEngine';
import * as nativePlatform from '../utils/nativePlatform';

describe('MonefyDashboard Comprehensive Unit & Integration Tests', () => {
  let db: MonefyDatabase;
  let backButtonListener: (() => boolean) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    syncEngine.logout();
    db = new MonefyDatabase(`test-dash-${Date.now()}-${Math.random()}`);
    await db.initializeDefaults();

    // Capture back button listener registration
    vi.spyOn(nativePlatform, 'registerBackButtonHandler').mockImplementation((handler) => {
      backButtonListener = handler;
      return () => {
        backButtonListener = null;
      };
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('toggles viewMode between wheel and analytics breakdown view', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Switch to Analytics mode
    const analyticsTab = screen.getByTestId('tab-analytics');
    fireEvent.click(analyticsTab);

    // ExpenseBreakdownView appears
    expect(await screen.findByText(/Total Period Expense/i)).toBeInTheDocument();

    // Switch back to Wheel mode
    const wheelTab = screen.getByTestId('tab-wheel');
    fireEvent.click(wheelTab);

    expect(
      await screen.findByText(/Tap slices or \+\/- to record transactions/i)
    ).toBeInTheDocument();
  });

  it('opens and closes keypad for expense, income, and category slice click', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Open Expense Keypad via CenterBalance '-' button and CategoryPicker
    const minusBtn = screen.getByTestId('btn-quick-expense');
    fireEvent.click(minusBtn);
    const allCats = await db.categories.toArray();
    const firstCat = allCats.find((c) => c.type === 'expense')!;
    const catItem = await screen.findByTestId(`category-picker-item-${firstCat.id}`);
    fireEvent.click(catItem);
    expect(await screen.findByTestId('btn-keypad-confirm')).toBeInTheDocument();

    // Close keypad via close button
    fireEvent.click(screen.getByLabelText('Close keypad'));
    await waitFor(() => {
      expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();
    });

    // Open Income Keypad via CenterBalance '+' button
    const plusBtn = screen.getByTestId('btn-quick-income');
    fireEvent.click(plusBtn);
    expect(await screen.findByTestId('btn-keypad-confirm')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close keypad'));
    await waitFor(() => {
      expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();
    });

    // Open Transfer Modal via CenterBalance 'Transfer' button
    const transferBtn = screen.getByTestId('btn-quick-transfer');
    fireEvent.click(transferBtn);
    expect(await screen.findByText(/Transfer Between Accounts/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    await waitFor(() => {
      expect(screen.queryByText(/Transfer Between Accounts/i)).not.toBeInTheDocument();
    });
  });

  it('handles hardware back button dismissal for every modal in sequence', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');
    expect(backButtonListener).not.toBeNull();

    // When no modal is open, back button returns false
    expect(backButtonListener!()).toBe(false);

    // 1. Category Picker Modal via '-' button
    fireEvent.click(screen.getByTestId('btn-quick-expense'));
    expect(
      await screen.findByRole('dialog', { name: /select expense category/i })
    ).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /select expense category/i })
      ).not.toBeInTheDocument();
    });

    // 2. Keypad Modal via direct category tap
    const allCats = await db.categories.toArray();
    const firstCat = allCats
      .filter((c) => c.type === 'expense' && !c.isDeleted && c.isVisible !== false)
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))[0];
    const catItem = await screen.findByTestId(`radial-category-${firstCat.id}`);
    fireEvent.click(catItem);
    expect(await screen.findByTestId('btn-keypad-confirm')).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();
    });

    // 3. Transfer Modal
    fireEvent.click(screen.getByTestId('btn-quick-transfer'));
    expect(await screen.findByText(/Transfer Between Accounts/i)).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText(/Transfer Between Accounts/i)).not.toBeInTheDocument();
    });

    // 3. Budgets Modal
    fireEvent.click(screen.getByTestId('btn-open-budgets'));
    expect(await screen.findByText('Category Budgets')).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Category Budgets')).not.toBeInTheDocument();
    });

    // 4. Accounts Manager Modal via AccountBar gear
    fireEvent.click(screen.getByLabelText('Manage Accounts'));
    expect(await screen.findByText('Manage Accounts')).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Manage Accounts')).not.toBeInTheDocument();
    });

    // 5. Settings Modal via Hamburger menu
    fireEvent.click(screen.getByTestId('btn-hamburger-menu'));
    fireEvent.click(await screen.findByTestId('btn-open-settings'));
    expect(await screen.findByText('Settings & Data')).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Settings & Data')).not.toBeInTheDocument();
    });

    // 6. Sync Modal via Hamburger menu
    fireEvent.click(screen.getByTestId('btn-hamburger-menu'));
    fireEvent.click(await screen.findByTestId('btn-open-sync'));
    expect(await screen.findByText('Cloud Sync')).toBeInTheDocument();
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Cloud Sync')).not.toBeInTheDocument();
    });
  });

  it('handles syncNow, login, register, and logout workflows from cloud sync modal', async () => {
    const syncSpy = vi
      .spyOn(syncEngine, 'sync')
      .mockResolvedValue({ status: 'success', pushed: 1, pulled: 1 });
    const loginSpy = vi
      .spyOn(syncEngine, 'login')
      .mockResolvedValue({ id: 'u1', email: 'test@cloud.com', name: 'User' });
    const regSpy = vi
      .spyOn(syncEngine, 'register')
      .mockResolvedValue({ id: 'u2', email: 'reg@cloud.com', name: 'Reg' });
    const logoutSpy = vi.spyOn(syncEngine, 'logout').mockReturnValue(undefined);

    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Open Sync Modal
    fireEvent.click(screen.getByTestId('btn-hamburger-menu'));
    fireEvent.click(await screen.findByTestId('btn-open-sync'));

    // Submit login form
    const emailInput = await screen.findByPlaceholderText(/you@domain.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@cloud.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Minimum 6 characters/i), {
      target: { value: 'Pass1234' },
    });
    fireEvent.click(screen.getByTestId('btn-submit-auth'));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalled();
    });

    // Test Sync Now when logged in
    const syncNowBtn = await screen.findByTestId('btn-sync-now');
    await waitFor(() => {
      expect(syncNowBtn).not.toBeDisabled();
    });
    fireEvent.click(syncNowBtn);
    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalled();
    });

    // Test sync error status branch
    await waitFor(() => {
      expect(syncNowBtn).not.toBeDisabled();
    });
    syncSpy.mockResolvedValueOnce({ status: 'error', pushed: 0, pulled: 0 });
    fireEvent.click(syncNowBtn);
    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledTimes(2);
    });

    // Test Logout
    const logoutBtn = await screen.findByTestId('btn-logout-cloud');
    fireEvent.click(logoutBtn);
    expect(logoutSpy).toHaveBeenCalled();

    // Switch to Register tab and submit
    fireEvent.click(await screen.findByTestId('tab-auth-register'));
    fireEvent.change(await screen.findByPlaceholderText(/you@domain.com/i), {
      target: { value: 'reg@cloud.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Minimum 6 characters/i), {
      target: { value: 'Pass1234' },
    });
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Reg User' } });
    fireEvent.click(screen.getByTestId('btn-submit-auth'));

    await waitFor(() => {
      expect(regSpy).toHaveBeenCalled();
    });
  });

  it('handles CSV import with currency mapping detection and category reordering in settings', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Open Settings Modal
    fireEvent.click(screen.getByTestId('btn-hamburger-menu'));
    fireEvent.click(await screen.findByTestId('btn-open-settings'));

    expect(await screen.findByText('Settings & Data')).toBeInTheDocument();

    // 1. Test onImportCSV with code-based currency mapping (EUR -> €) (lines 490-504, 509-510)
    const csvContentEUR = [
      'Date,Category,Account,Amount,Type,Currency',
      '2026-10-15,Food,Cash,150.00,expense,EUR',
    ].join('\n');
    const eurFile = new File([csvContentEUR], 'eur.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('input-import-csv') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [eurFile] } });
    await waitFor(
      () => {
        expect(screen.getByText(/currency set to €/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 2. Test onImportCSV with symbol currency fallback (CA$) (lines 505-507)
    const csvContentCAD = [
      'Date,Category,Account,Amount,Type,Currency',
      '2026-10-16,Food,Cash,50.00,expense,CA$',
    ].join('\n');
    const cadFile = new File([csvContentCAD], 'cad.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [cadFile] } });
    await waitFor(
      () => {
        expect(screen.getByText(/currency set to CA\$/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 3. Test onRestoreDatabase (lines 486-489)
    const jsonFileInput = screen.getByTestId('input-restore-file') as HTMLInputElement;
    const currentCats = await db.categories.toArray();
    const currentAccs = await db.accounts.toArray();
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: currentAccs,
      categories: currentCats,
      transactions: [
        {
          id: 'tx-restore-1',
          amount: 99,
          type: 'expense',
          categoryId: currentCats[0]?.id || 'cat-1',
          accountId: currentAccs[0]?.id || 'acc-1',
          date: '2026-10-15T12:00:00Z',
          isDeleted: false,
          createdAt: '2026-10-15T12:00:00Z',
          updatedAt: '2026-10-15T12:00:00Z',
        },
      ],
      budgets: [],
    };
    const jsonFile = new File([JSON.stringify(backupData)], 'backup.json', {
      type: 'application/json',
    });
    fireEvent.change(jsonFileInput, { target: { files: [jsonFile] } });
    await waitFor(async () => {
      const txs = await db.transactions.toArray();
      expect(txs.some((t) => t.id === 'tx-restore-1')).toBe(true);
    });

    // Toggle category visibility from Settings (lines 512-514)
    const toggleInputs = await screen.findAllByRole('checkbox');
    expect(toggleInputs.length).toBeGreaterThan(0);
    fireEvent.click(toggleInputs[0]);

    // Reorder category (lines 515-517)
    const moveDownButtons = screen.getAllByRole('button', { name: /Move .* down/i });
    const enabledMoveDown = moveDownButtons.find((b) => !b.hasAttribute('disabled'));
    expect(enabledMoveDown).toBeDefined();
    if (enabledMoveDown) {
      fireEvent.click(enabledMoveDown);
    }
  }, 20000);

  it('covers full dashboard workflows: adding tx, filtering accounts, transfer, custom categories, editing/deleting tx, and budgets', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // 1. Add Transaction via Keypad (lines 392-394)
    const [firstCatBtn] = await screen.findAllByTestId(/^radial-category-/);
    fireEvent.click(firstCatBtn);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByTestId('btn-keypad-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('center-balance-amount').textContent).toMatch(/25\.00/);
    });

    // 2. Account filter and lines 179-181
    const tx25 = (await db.transactions.toArray()).find((t) => t.amount === 25)!;
    const otherAccount = (await db.accounts.toArray()).find((a) => a.id !== tx25.accountId)!;
    fireEvent.click(screen.getByText(otherAccount.name));
    await waitFor(() => {
      expect(screen.getByTestId('center-balance-amount').textContent).toMatch(/0\.00/);
    });
    fireEvent.click(screen.getByText('All Accounts'));
    await waitFor(() => {
      expect(screen.getByTestId('center-balance-amount').textContent).toMatch(/25\.00/);
    });

    // 3. Transfer between accounts (lines 417-423)
    fireEvent.click(screen.getByTestId('btn-quick-transfer'));
    const amountInput = screen.getByLabelText('Transfer Amount');
    fireEvent.change(amountInput, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Transfer' }));
    await waitFor(async () => {
      const txs = await db.transactions.toArray();
      expect(txs.some((t) => t.type === 'transfer' && t.amount === 15)).toBe(true);
    });

    // 4. Custom Category modal and back button (lines 132-135, 405-407)
    fireEvent.click(screen.getByTestId('btn-add-category'));
    expect(await screen.findByText('Create Custom Category')).toBeInTheDocument();
    // Test back button for isCustomizerOpen
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Create Custom Category')).not.toBeInTheDocument();
    });
    // Open again to save
    fireEvent.click(screen.getByTestId('btn-add-category'));
    const catNameInput = screen.getByPlaceholderText(/Category Name/i);
    fireEvent.change(catNameInput, { target: { value: 'Gaming Fun' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Category' }));
    await waitFor(async () => {
      const cats = await db.categories.toArray();
      expect(cats.some((c) => c.name === 'Gaming Fun')).toBe(true);
    });

    // 5. Account Manager modal: add, update, delete account (lines 433-441)
    fireEvent.click(screen.getByLabelText('Manage Accounts'));
    expect(await screen.findByText('Manage Accounts')).toBeInTheDocument();
    // Add account
    fireEvent.click(screen.getByRole('button', { name: /Add Another Account/i }));
    const accNameInput = screen.getByPlaceholderText(/Crypto Wallet/i);
    fireEvent.change(accNameInput, { target: { value: 'Savings Pot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Account' }));
    await waitFor(async () => {
      const accs = await db.accounts.toArray();
      expect(accs.some((a) => a.name === 'Savings Pot')).toBe(true);
    });
    // Edit account - wait for it to appear in UI
    const editBtn = await screen.findByLabelText('Edit Savings Pot');
    fireEvent.click(editBtn);
    const editInput = screen.getByDisplayValue('Savings Pot');
    fireEvent.change(editInput, { target: { value: 'Savings Vault' } });
    fireEvent.click(screen.getByLabelText('Save name'));
    await waitFor(async () => {
      const accs = await db.accounts.toArray();
      expect(accs.some((a) => a.name === 'Savings Vault')).toBe(true);
    });
    // Delete account
    const delBtn = await screen.findByLabelText('Archive Savings Vault');
    fireEvent.click(delBtn);
    await waitFor(async () => {
      const accs = await db.accounts.toArray();
      const vault = accs.find((a) => a.name === 'Savings Vault');
      expect(vault?.isDeleted).toBe(true);
    });
    fireEvent.click(screen.getByLabelText('Close'));

    // 6. Edit & Delete Transaction from EditTransactionModal (lines 156-159, 383-385, 452-457)
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const tx = (await db.transactions.toArray()).find((t) => t.amount === 25)!;
    await waitFor(() => {
      const items = Array.from(document.querySelectorAll('.transaction-item'));
      expect(items.some((el) => el.textContent?.includes('25.00'))).toBe(true);
    });
    const getTxItem = () => {
      const items = Array.from(document.querySelectorAll('.transaction-item'));
      return items.find((el) => el.textContent?.includes('25.00')) as HTMLElement;
    };
    // Click transaction row in sheet to open EditTransactionModal
    fireEvent.click(getTxItem());
    expect(await screen.findByText('Edit Transaction')).toBeInTheDocument();
    // Test back button for editingTransaction
    expect(backButtonListener!()).toBe(true);
    await waitFor(() => {
      expect(screen.queryByText('Edit Transaction')).not.toBeInTheDocument();
    });
    // Open again to save update
    fireEvent.click(getTxItem());
    expect(await screen.findByText('Edit Transaction')).toBeInTheDocument();
    const noteInput = screen.getByLabelText('Note');
    fireEvent.change(noteInput, { target: { value: 'Updated note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(async () => {
      const updatedTx = await db.transactions.get(tx.id);
      expect(updatedTx?.note).toBe('Updated note');
    });
    // Open again to delete via EditTransactionModal (lines 455-457)
    await waitFor(() => {
      expect(getTxItem()).not.toBeUndefined();
    });
    fireEvent.click(getTxItem());
    expect(await screen.findByText('Edit Transaction')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(async () => {
      const delTx = await db.transactions.get(tx.id);
      expect(delTx?.isDeleted).toBe(true);
    });

    // Delete remaining transaction directly from sheet (lines 383-385)
    await waitFor(() => {
      expect(document.querySelector('.transaction-item')).not.toBeNull();
    });
    const sheetDeleteBtns = screen.getAllByTitle('Delete transaction');
    if (sheetDeleteBtns.length > 0) {
      fireEvent.click(sheetDeleteBtns[0]);
    }
    await waitFor(async () => {
      const remaining = (await db.transactions.toArray()).filter((t) => !t.isDeleted);
      expect(remaining.length).toBeLessThan(2);
    });

    // 7. Budget Modal: Set & Remove budget (lines 468-473)
    fireEvent.click(screen.getByTestId('btn-open-budgets'));
    expect(await screen.findByText('Category Budgets')).toBeInTheDocument();
    const setLimitBtns = screen.getAllByRole('button', { name: /Set budget for|Edit budget for/i });
    if (setLimitBtns.length > 0) {
      fireEvent.click(setLimitBtns[0]);
      const limitInput = screen.getByPlaceholderText(/Enter monthly limit/i);
      fireEvent.change(limitInput, { target: { value: '450' } });
      fireEvent.click(screen.getByLabelText('Save Budget'));
      await waitFor(async () => {
        const b = await db.budgets.toArray();
        expect(b.some((item) => item.monthlyLimit === 450)).toBe(true);
      });
      // Remove budget
      const removeBtn = await screen.findByTitle('Remove budget');
      fireEvent.click(removeBtn);
      await waitFor(async () => {
        const b = await db.budgets.toArray();
        expect(b.some((item) => item.monthlyLimit === 450)).toBe(false);
      });
    }
  }, 25000);
});
