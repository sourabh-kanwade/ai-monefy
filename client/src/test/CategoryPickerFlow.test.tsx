import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonefyDashboard } from '../components/dashboard/MonefyDashboard';
import { FinanceProvider } from '../context/FinanceContext';
import { MonefyDatabase } from '../db/localDb';
import * as nativePlatform from '../utils/nativePlatform';

describe('Category Picker Flow Seam Tests in MonefyDashboard', () => {
  let db: MonefyDatabase;
  let backButtonListener: (() => boolean) | null = null;

  beforeEach(async () => {
    localStorage.clear();
    db = new MonefyDatabase(`test-picker-flow-${Date.now()}-${Math.random()}`);
    await db.initializeDefaults();

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

  it('opens CategoryPickerModal when tapping central Add Expense button (-)', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Tap central Add Expense button
    const minusBtn = screen.getByTestId('btn-quick-expense');
    fireEvent.click(minusBtn);

    // CategoryPickerModal should be open with title "Select Expense Category"
    expect(
      await screen.findByRole('dialog', { name: /select expense category/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();
  });

  it('transitions to NumericKeypadModal with chosen category when category is picked', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    const allCats = await db.categories.toArray();
    const bills = allCats.find((c) => c.name === 'Bills')!;
    expect(bills).toBeDefined();

    // Tap Add Expense
    fireEvent.click(screen.getByTestId('btn-quick-expense'));

    // Pick 'Bills' category from picker
    const billsItem = await screen.findByTestId(`category-picker-item-${bills.id}`);
    fireEvent.click(billsItem);

    // Keypad modal should now be open with 'Bills'
    expect(await screen.findByTestId('btn-keypad-confirm')).toBeInTheDocument();
    expect(screen.getAllByText('Bills').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole('dialog', { name: /select expense category/i })
    ).not.toBeInTheDocument();
  });

  it('closes CategoryPickerModal cleanly without opening keypad when cancelled', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    // Open picker
    fireEvent.click(screen.getByTestId('btn-quick-expense'));
    expect(
      await screen.findByRole('dialog', { name: /select expense category/i })
    ).toBeInTheDocument();

    // Close via close button
    fireEvent.click(screen.getByLabelText(/close category picker/i));

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /select expense category/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-keypad-confirm')).not.toBeInTheDocument();
    });
  });

  it('closes CategoryPickerModal on Android hardware back button', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    fireEvent.click(screen.getByTestId('btn-quick-expense'));
    expect(
      await screen.findByRole('dialog', { name: /select expense category/i })
    ).toBeInTheDocument();

    expect(backButtonListener).not.toBeNull();
    const handled = backButtonListener!();
    expect(handled).toBe(true);

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /select expense category/i })
      ).not.toBeInTheDocument();
    });
  });

  it('opens NumericKeypadModal directly when tapping a radial category grid item', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    const allCats = await db.categories.toArray();
    const bills = allCats.find((c) => c.name === 'Bills')!;

    // Tap a category directly on radial grid
    const billsBtn = await screen.findByTestId(`radial-category-${bills.id}`);
    fireEvent.click(billsBtn);

    // Keypad opens directly without category picker
    expect(await screen.findByTestId('btn-keypad-confirm')).toBeInTheDocument();
    expect(screen.getAllByText('Bills').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.queryByRole('dialog', { name: /select expense category/i })
    ).not.toBeInTheDocument();
  });

  it('opens CategoryCustomizerModal from category picker custom button', async () => {
    render(
      <FinanceProvider database={db}>
        <MonefyDashboard />
      </FinanceProvider>
    );

    await screen.findByText('AI Monefy');

    fireEvent.click(screen.getByTestId('btn-quick-expense'));
    const customBtn = await screen.findByTestId('btn-category-picker-custom');
    fireEvent.click(customBtn);

    // CategoryCustomizerModal should open and picker should close
    expect(await screen.findByText(/Create Custom Category/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: /select expense category/i })
    ).not.toBeInTheDocument();
  });
});
