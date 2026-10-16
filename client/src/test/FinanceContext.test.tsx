import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { FinanceProvider, useFinance } from '../context/FinanceContext';
import { MonefyDatabase } from '../db/localDb';

// Consumer component to expose context methods directly
let contextValues: ReturnType<typeof useFinance>;

const TestConsumer: React.FC = () => {
  contextValues = useFinance();
  return (
    <div>
      <span data-testid="total-balance">{contextValues.totalBalance}</span>
      <span data-testid="currency">{contextValues.currency}</span>
      <span data-testid="theme">{contextValues.theme}</span>
      <span data-testid="net-balance">{contextValues.netBalance}</span>
      <span data-testid="income">{contextValues.totalIncome}</span>
      <span data-testid="expense">{contextValues.totalExpense}</span>
      <span data-testid="period-label">{contextValues.periodLabel}</span>
    </div>
  );
};

describe('FinanceContext Unit Tests', () => {
  let testDb: MonefyDatabase;

  beforeEach(async () => {
    localStorage.clear();
    testDb = new MonefyDatabase(`test-finance-ctx-${Date.now()}-${Math.random()}`);
    await testDb.open();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error if useFinance is called outside FinanceProvider', () => {
    const ComponentOutside = () => {
      useFinance();
      return null;
    };
    expect(() => render(<ComponentOutside />)).toThrow(
      'useFinance must be used within a FinanceProvider'
    );
  });

  it('initializes defaults, handles currency, theme, and period stepping', async () => {
    render(
      <FinanceProvider database={testDb}>
        <TestConsumer />
      </FinanceProvider>
    );

    await waitFor(() => {
      expect(contextValues.accounts.length).toBeGreaterThan(0);
      expect(contextValues.categories.length).toBeGreaterThan(0);
    });

    // Test currency
    act(() => {
      contextValues.setCurrency('€');
    });
    expect(contextValues.currency).toBe('€');
    expect(localStorage.getItem('ai_monefy_currency')).toBe('€');

    // Test toggle theme
    act(() => {
      contextValues.toggleTheme();
    });
    expect(contextValues.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => {
      contextValues.toggleTheme();
    });
    expect(contextValues.theme).toBe('dark');

    // Test date & period navigation
    act(() => {
      contextValues.setInterval('MONTH');
    });
    expect(contextValues.interval).toBe('MONTH');

    act(() => {
      contextValues.stepPrevPeriod();
    });
    expect(contextValues.periodLabel).toBeTruthy();

    act(() => {
      contextValues.stepNextPeriod();
    });
    expect(contextValues.periodLabel).toBeTruthy();

    // Future date clamp test
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    act(() => {
      contextValues.setReferenceDate(futureDate);
    });
    // Reference date is clamped so it does not exceed end of today
    expect(contextValues.referenceDate.getFullYear()).toBeLessThanOrEqual(new Date().getFullYear());

    // stepNextPeriod when already at latest should no-op
    act(() => {
      contextValues.setReferenceDate(new Date());
    });
    const curDate = contextValues.referenceDate;
    act(() => {
      contextValues.stepNextPeriod();
    });
    expect(contextValues.referenceDate.getTime()).toBe(curDate.getTime());
  });

  it('executes transaction CRUD operations and updates balance calculations', async () => {
    render(
      <FinanceProvider database={testDb}>
        <TestConsumer />
      </FinanceProvider>
    );

    await waitFor(() => {
      expect(contextValues.accounts.length).toBeGreaterThan(0);
    });

    const acc1 = contextValues.accounts[0];
    const acc2 = contextValues.accounts[1] || contextValues.accounts[0];
    const cat = contextValues.categories[0];

    // Add expense transaction
    let expTxId = '';
    await act(async () => {
      expTxId = await contextValues.addTransaction({
        amount: 50,
        type: 'expense',
        categoryId: cat.id,
        accountId: acc1.id,
        note: 'Dinner test',
      });
    });
    expect(expTxId).toBeTruthy();
    expect(contextValues.transactions.some((t) => t.id === expTxId)).toBe(true);
    expect(contextValues.totalExpense).toBe(50);

    // Update transaction
    await act(async () => {
      await contextValues.updateTransaction(expTxId, { amount: 60, note: 'Fancy dinner' });
    });
    expect(contextValues.transactions.find((t) => t.id === expTxId)?.amount).toBe(60);
    expect(contextValues.totalExpense).toBe(60);

    // Add income transaction
    await act(async () => {
      await contextValues.addTransaction({
        amount: 200,
        type: 'income',
        categoryId: cat.id,
        accountId: acc1.id,
        note: 'Freelance test',
      });
    });
    expect(contextValues.totalIncome).toBe(200);

    // Add transfer transaction
    let transferTxId = '';
    await act(async () => {
      transferTxId = await contextValues.addTransaction({
        amount: 30,
        type: 'transfer',
        categoryId: cat.id,
        accountId: acc1.id,
        toAccountId: acc2.id,
        note: 'Transfer test',
      });
    });
    expect(transferTxId).toBeTruthy();

    // Test selectedAccountId filtering
    act(() => {
      contextValues.setSelectedAccountId(acc1.id);
    });
    expect(contextValues.selectedAccountId).toBe(acc1.id);

    // Filter by acc2 where incTxId (on acc1) does not belong -> triggers lines 516-517
    act(() => {
      contextValues.setSelectedAccountId(acc2.id);
    });
    expect(contextValues.selectedAccountId).toBe(acc2.id);
    expect(contextValues.totalIncome).toBe(0);

    // Delete transaction
    await act(async () => {
      await contextValues.deleteTransaction(expTxId);
    });
    expect(contextValues.transactions.some((t) => t.id === expTxId)).toBe(false);

    // Delete non-existent transaction should gracefully no-op
    await act(async () => {
      await contextValues.deleteTransaction('non-existent-id');
    });

    // Reset account filter
    act(() => {
      contextValues.setSelectedAccountId(null);
    });
  });

  it('executes category and account CRUD, reordering, and budget operations', async () => {
    render(
      <FinanceProvider database={testDb}>
        <TestConsumer />
      </FinanceProvider>
    );

    await waitFor(() => {
      expect(contextValues.categories.length).toBeGreaterThan(0);
    });

    // Add Category
    let newCatId = '';
    await act(async () => {
      newCatId = await contextValues.addCategory({
        name: 'Custom Groceries',
        icon: 'ShoppingCart',
        color: '#10B981',
        type: 'expense',
      });
    });
    expect(newCatId).toBeTruthy();
    expect(contextValues.categories.some((c) => c.id === newCatId)).toBe(true);

    // Update Category
    await act(async () => {
      await contextValues.updateCategory(newCatId, { name: 'Super Groceries' });
    });
    expect(contextValues.categories.find((c) => c.id === newCatId)?.name).toBe('Super Groceries');

    // Toggle Category Visibility
    await act(async () => {
      await contextValues.toggleCategoryVisibility(newCatId, false);
    });
    expect(contextValues.categories.find((c) => c.id === newCatId)?.isVisible).toBe(false);

    // Reorder Categories
    const allCatIds = contextValues.categories.map((c) => c.id);
    const reversedIds = [...allCatIds].reverse();
    await act(async () => {
      await contextValues.reorderCategories(reversedIds);
    });
    expect(contextValues.categories.length).toBe(allCatIds.length);

    // Delete Category
    await act(async () => {
      await contextValues.deleteCategory(newCatId);
    });
    expect(contextValues.categories.some((c) => c.id === newCatId)).toBe(false);

    // Add Account
    let newAccId = '';
    await act(async () => {
      newAccId = await contextValues.addAccount({
        name: 'Savings Stash',
        icon: 'Vault',
        color: '#8B5CF6',
        initialBalance: 1500,
      });
    });
    expect(newAccId).toBeTruthy();
    expect(contextValues.accounts.some((a) => a.id === newAccId)).toBe(true);

    // Update Account
    await act(async () => {
      await contextValues.updateAccount(newAccId, { name: 'High Yield Savings' });
    });
    expect(contextValues.accounts.find((a) => a.id === newAccId)?.name).toBe('High Yield Savings');

    // Select this account and then delete it
    act(() => {
      contextValues.setSelectedAccountId(newAccId);
    });
    expect(contextValues.selectedAccountId).toBe(newAccId);

    await act(async () => {
      await contextValues.deleteAccount(newAccId);
    });
    expect(contextValues.accounts.some((a) => a.id === newAccId)).toBe(false);
    expect(contextValues.selectedAccountId).toBeNull();

    // Budget: Create and Update
    const catId = contextValues.categories[0].id;
    await act(async () => {
      await contextValues.setBudget(catId, 500);
    });
    expect(contextValues.categoryBudgets[catId]).toBe(500);

    // Update existing budget
    await act(async () => {
      await contextValues.setBudget(catId, 600);
    });
    expect(contextValues.categoryBudgets[catId]).toBe(600);

    // Remove Budget
    await act(async () => {
      await contextValues.removeBudget(catId);
    });
    expect(contextValues.categoryBudgets[catId]).toBeUndefined();

    // Remove non-existent budget should no-op
    await act(async () => {
      await contextValues.removeBudget('fake-cat-id');
    });

    // Refresh Data
    await act(async () => {
      await contextValues.refreshData();
    });
    expect(contextValues.totalBalance).toBeDefined();
  });
});
