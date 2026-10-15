import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceProvider } from '../context/FinanceContext';
import { MonefyDashboard } from '../components/dashboard/MonefyDashboard';
import { MonefyDatabase } from '../db/localDb';

describe('Category Budgets & Overspending Seam Integration Tests', () => {
  let testDb: MonefyDatabase;

  beforeEach(async () => {
    testDb = new MonefyDatabase(`test-budget-${Date.now()}-${Math.random()}`);
    await testDb.initializeDefaults();

    const accounts = await testDb.accounts.toArray();
    const categories = await testDb.categories.toArray();
    const foodCat = categories.find((c) => c.name === 'Food') || categories[0];

    // Seed $100 budget for Food
    await testDb.budgets.add({
      id: 'b-food',
      categoryId: foodCat.id,
      monthlyLimit: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add $150 expense for Food (150% over budget)
    await testDb.addTransaction({
      amount: 150,
      type: 'expense',
      categoryId: foodCat.id,
      accountId: accounts[0].id,
      note: 'Steakhouse dinner',
    });
  });

  it('displays overspending badge on category grid and opens budget modal with progress meter', async () => {
    render(
      <FinanceProvider database={testDb}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getAllByText('Food')[0]).toBeInTheDocument();
    });

    // Verify over-budget indicator on Food category
    const categories = await testDb.categories.toArray();
    const foodCat = categories.find((c) => c.name === 'Food') || categories[0];
    const overBadge = screen.getByTestId(`over-budget-${foodCat.id}`);
    expect(overBadge).toBeInTheDocument();

    // Click Monthly Budgets trigger
    const budgetsBtn = screen.getByTestId('btn-open-budgets');
    fireEvent.click(budgetsBtn);

    // Verify modal and meter
    expect(screen.getByText('Category Budgets')).toBeInTheDocument();
    expect(screen.getByText(/Over Budget/i)).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
  });
});
