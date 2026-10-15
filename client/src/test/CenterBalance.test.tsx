import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CenterBalance } from '../components/monefy-wheel/CenterBalance';

describe('CenterBalance Component Seam Tests', () => {
  it('displays surplus balance and triggers income/expense keypads', () => {
    const handleOpenExpense = vi.fn();
    const handleOpenIncome = vi.fn();

    render(
      <CenterBalance
        netBalance={350.5}
        totalIncome={500}
        totalExpense={149.5}
        currency="$"
        onOpenExpenseKeypad={handleOpenExpense}
        onOpenIncomeKeypad={handleOpenIncome}
      />
    );

    // Balance text
    expect(screen.getByTestId('center-balance-amount')).toHaveTextContent('$350.50');
    expect(screen.getByTestId('center-balance-hub')).toHaveAttribute('data-state', 'surplus');

    // Click Minus button -> triggers expense keypad
    const minusBtn = screen.getByTestId('btn-quick-expense');
    fireEvent.click(minusBtn);
    expect(handleOpenExpense).toHaveBeenCalledTimes(1);

    // Click Plus button -> triggers income keypad
    const plusBtn = screen.getByTestId('btn-quick-income');
    fireEvent.click(plusBtn);
    expect(handleOpenIncome).toHaveBeenCalledTimes(1);
  });

  it('displays deficit state correctly when net balance is negative', () => {
    render(
      <CenterBalance
        netBalance={-85.2}
        totalIncome={100}
        totalExpense={185.2}
        currency="$"
        onOpenExpenseKeypad={() => {}}
        onOpenIncomeKeypad={() => {}}
      />
    );

    expect(screen.getByTestId('center-balance-amount')).toHaveTextContent('-$85.20');
    expect(screen.getByTestId('center-balance-hub')).toHaveAttribute('data-state', 'deficit');
  });

  it('safely handles NaN or undefined balance without crashing or rendering NaN', () => {
    render(
      <CenterBalance
        netBalance={NaN}
        totalIncome={NaN}
        totalExpense={NaN}
        currency="₹"
        onOpenExpenseKeypad={() => {}}
        onOpenIncomeKeypad={() => {}}
      />
    );

    expect(screen.getByTestId('center-balance-amount')).toHaveTextContent('₹0.00');
    expect(screen.getByTestId('center-balance-amount')).not.toHaveTextContent('NaN');
  });
});
