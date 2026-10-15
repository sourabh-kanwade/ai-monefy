import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FinanceProvider } from '../context/FinanceContext';
import { WalkingSkeletonView } from '../components/skeleton/WalkingSkeletonView';
import { MonefyDatabase } from '../db/localDb';

describe('WalkingSkeletonView UI Component Tests', () => {
  let testDb: MonefyDatabase;

  beforeEach(async () => {
    testDb = new MonefyDatabase(`test_ui_${Date.now()}_${Math.random()}`);
    await testDb.initializeDefaults();
  });

  it('renders balance, allows entering an expense, and displays the transaction', async () => {
    render(
      <FinanceProvider database={testDb}>
        <WalkingSkeletonView />
      </FinanceProvider>
    );

    // Verify initial balance display exists and categories loaded
    expect(await screen.findByText('TOTAL BALANCE')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Food' })).toBeInTheDocument();

    // Enter amount
    const amountInput = screen.getByLabelText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: '35.00' } });

    // Enter note
    const noteInput = screen.getByPlaceholderText(/Lunch with team/i);
    fireEvent.change(noteInput, { target: { value: 'Coffee and snacks' } });

    // Click Save
    const saveButton = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(saveButton);

    // Verify transaction appears in the list
    await waitFor(() => {
      const txItem = document.querySelector('.transaction-item');
      expect(txItem).toBeInTheDocument();
      expect(txItem?.textContent).toContain('Coffee and snacks');
      expect(txItem?.textContent).toContain('35.00');
    });
  });
});
