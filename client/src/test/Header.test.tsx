import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../components/layout/Header';

describe('Header & Interval Navigation Seam Tests', () => {
  it('renders intervals, displays current label, and handles navigation steps', () => {
    const handleIntervalChange = vi.fn();
    const handleStepPrev = vi.fn();
    const handleStepNext = vi.fn();
    const handleToggleTheme = vi.fn();

    render(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="dark"
        onIntervalChange={handleIntervalChange}
        onStepPrev={handleStepPrev}
        onStepNext={handleStepNext}
        onToggleTheme={handleToggleTheme}
      />
    );

    // Assert period label is rendered
    expect(screen.getByText('October 2026')).toBeInTheDocument();

    // Assert tabs are present
    expect(screen.getByRole('button', { name: /^Day$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Month$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Year$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All$/i })).toBeInTheDocument();

    // Click Day tab
    fireEvent.click(screen.getByRole('button', { name: /^Day$/i }));
    expect(handleIntervalChange).toHaveBeenCalledWith('DAY');

    // Click stepping buttons
    const prevBtn = screen.getByLabelText('Previous period');
    fireEvent.click(prevBtn);
    expect(handleStepPrev).toHaveBeenCalled();

    const nextBtn = screen.getByLabelText('Next period');
    fireEvent.click(nextBtn);
    expect(handleStepNext).toHaveBeenCalled();

    // Click theme toggle
    const themeBtn = screen.getByLabelText(/theme/i);
    fireEvent.click(themeBtn);
    expect(handleToggleTheme).toHaveBeenCalled();
  });
});
