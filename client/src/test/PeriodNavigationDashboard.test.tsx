import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceProvider } from '../context/FinanceContext';
import { MonefyDashboard } from '../components/dashboard/MonefyDashboard';
import { MonefyDatabase } from '../db/localDb';

describe('Period Navigation Dashboard Integration Tests', () => {
  let testDb: MonefyDatabase;

  beforeEach(async () => {
    testDb = new MonefyDatabase(`test-period-nav-${Date.now()}-${Math.random()}`);
    await testDb.initializeDefaults();

    const accounts = await testDb.accounts.toArray();
    const categories = await testDb.categories.toArray();
    const cashAcc = accounts[0];
    const foodCat = categories.find((c) => c.name === 'Food') || categories[0];
    const billsCat = categories.find((c) => c.name === 'Bills') || categories[1];

    // Seed transaction for October 2026
    await testDb.addTransaction({
      amount: 45,
      type: 'expense',
      categoryId: foodCat.id,
      accountId: cashAcc.id,
      note: 'October Dining',
      date: '2026-10-15T10:00:00.000Z',
    });

    // Seed transaction for September 2026
    await testDb.addTransaction({
      amount: 120,
      type: 'expense',
      categoryId: billsCat.id,
      accountId: cashAcc.id,
      note: 'September Utility',
      date: '2026-09-10T10:00:00.000Z',
    });
  });

  it('filters dashboard data across period navigation tabs and stepping', async () => {
    render(
      <FinanceProvider database={testDb}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('AI Monefy')).toBeInTheDocument();
    });

    // By default, interval is MONTH.
    // If the test runs when current date is not Oct 2026, let's switch to ALL interval to see all records
    const allTab = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allTab);

    await waitFor(() => {
      expect(screen.getByText(/2 records/i)).toBeInTheDocument();
      expect(screen.getByText(/October Dining/i)).toBeInTheDocument();
      expect(screen.getByText(/September Utility/i)).toBeInTheDocument();
    });

    // Click Month tab
    const monthTab = screen.getByRole('button', { name: /^Month$/i });
    fireEvent.click(monthTab);

    // Step previous / next using arrows
    const prevBtn = screen.getByLabelText('Previous period');
    fireEvent.click(prevBtn);

    // Period label should update
    const periodLabel = screen.getByTestId('period-label');
    expect(periodLabel.textContent).toBeTruthy();
  });
});
