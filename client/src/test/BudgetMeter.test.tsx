import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetProgressMeter } from '../components/budgets/BudgetProgressMeter';

describe('BudgetProgressMeter Seam Tests', () => {
  it('renders green state when consumption is below 70%', () => {
    const { container } = render(
      <BudgetProgressMeter
        spent={50}
        limit={100}
        currency="$"
        categoryName="Food"
      />
    );

    const meter = container.querySelector('[data-budget-state]');
    expect(meter).toHaveAttribute('data-budget-state', 'normal'); // green (<70%)
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText(/Over Budget/i)).not.toBeInTheDocument();
  });

  it('renders amber warning state when consumption is between 70% and 100%', () => {
    const { container } = render(
      <BudgetProgressMeter
        spent={85}
        limit={100}
        currency="$"
        categoryName="Bills"
      />
    );

    const meter = container.querySelector('[data-budget-state]');
    expect(meter).toHaveAttribute('data-budget-state', 'warning'); // amber (70-100%)
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders red danger state and overspending badge when consumption exceeds 100%', () => {
    const { container } = render(
      <BudgetProgressMeter
        spent={130}
        limit={100}
        currency="$"
        categoryName="Entertainment"
      />
    );

    const meter = container.querySelector('[data-budget-state]');
    expect(meter).toHaveAttribute('data-budget-state', 'exceeded'); // red (>100%)
    expect(screen.getByText(/Over Budget/i)).toBeInTheDocument();
    expect(screen.getByText(/130%/)).toBeInTheDocument();
  });

  it('returns null when limit is 0 or negative', () => {
    const { container } = render(<BudgetProgressMeter spent={50} limit={0} />);
    expect(container.firstChild).toBeNull();
    const { container: negContainer } = render(<BudgetProgressMeter spent={50} limit={-10} />);
    expect(negContainer.firstChild).toBeNull();
  });
});
