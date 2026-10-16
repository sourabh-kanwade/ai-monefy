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

  it('validates amount on submit and opens calculator keypad to save transaction', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <FinanceProvider database={testDb}>
        <WalkingSkeletonView />
      </FinanceProvider>
    );

    await screen.findByText('TOTAL BALANCE');
    await screen.findByRole('option', { name: 'Food' });

    // Submit without amount
    const saveButton = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.submit(saveButton.closest('form')!);
    expect(alertSpy).toHaveBeenCalledWith('Please enter a valid amount');

    // Open calculator keypad
    const keypadBtn = screen.getByRole('button', { name: /Open Monefy Calculator Keypad/i });
    fireEvent.click(keypadBtn);

    // Keypad modal is open, click digit 5 and confirm
    const key5 = screen.getByRole('button', { name: '5' });
    fireEvent.click(key5);

    const confirmBtn = screen.getByTestId('btn-keypad-confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const items = document.querySelectorAll('.transaction-item');
      expect(items.length).toBeGreaterThan(0);
    });
  });
});
