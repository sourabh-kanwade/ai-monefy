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

    // Open hamburger menu and click theme toggle
    const hamburgerBtn = screen.getByTestId('btn-hamburger-menu');
    fireEvent.click(hamburgerBtn);

    const themeBtn = screen.getByLabelText(/theme/i);
    fireEvent.click(themeBtn);
    expect(handleToggleTheme).toHaveBeenCalled();
  });

  it('opens and closes hamburger menu with navigation actions and backdrop click', () => {
    const handleOpenSettings = vi.fn();
    const handleOpenSync = vi.fn();
    const handleOpenAccounts = vi.fn();
    const handleOpenBudgets = vi.fn();
    const handleOpenCategories = vi.fn();

    const { rerender } = render(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="dark"
        syncStatus="synced"
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={vi.fn()}
        onToggleTheme={vi.fn()}
        onOpenSettings={handleOpenSettings}
        onOpenSync={handleOpenSync}
        onOpenAccounts={handleOpenAccounts}
        onOpenBudgets={handleOpenBudgets}
        onOpenCategories={handleOpenCategories}
      />
    );

    // Initially dropdown menu is not present
    expect(screen.queryByTestId('hamburger-dropdown-menu')).not.toBeInTheDocument();

    // Open hamburger menu
    const menuBtn = screen.getByTestId('btn-hamburger-menu');
    fireEvent.click(menuBtn);

    expect(screen.getByTestId('hamburger-dropdown-menu')).toBeInTheDocument();
    expect(screen.getByText('SYNCED')).toBeInTheDocument();

    // Verify background blur and high z-index
    const backdropEl = screen.getByTestId('menu-backdrop');
    expect(backdropEl.style.backdropFilter).toContain('blur');
    expect(backdropEl.style.zIndex).toBe('2001');

    const dropdownMenuEl = screen.getByTestId('hamburger-dropdown-menu');
    expect(dropdownMenuEl.style.zIndex).toBe('2003');

    const headerEl = screen.getByTestId('app-header');
    expect(headerEl.style.zIndex).toBe('2000');

    // Click settings item
    const settingsItem = screen.getByTestId('btn-open-settings');
    fireEvent.click(settingsItem);
    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('hamburger-dropdown-menu')).not.toBeInTheDocument();

    // Reopen menu and test sync item
    fireEvent.click(menuBtn);
    const syncItem = screen.getByTestId('btn-open-sync');
    fireEvent.click(syncItem);
    expect(handleOpenSync).toHaveBeenCalledTimes(1);

    // Reopen and test quick navigation shortcuts
    fireEvent.click(menuBtn);
    fireEvent.click(screen.getByTestId('btn-menu-accounts'));
    expect(handleOpenAccounts).toHaveBeenCalledTimes(1);

    fireEvent.click(menuBtn);
    fireEvent.click(screen.getByTestId('btn-menu-budgets'));
    expect(handleOpenBudgets).toHaveBeenCalledTimes(1);

    fireEvent.click(menuBtn);
    fireEvent.click(screen.getByTestId('btn-menu-categories'));
    expect(handleOpenCategories).toHaveBeenCalledTimes(1);

    // Reopen and test closing with backdrop click
    fireEvent.click(menuBtn);
    expect(screen.getByTestId('hamburger-dropdown-menu')).toBeInTheDocument();
    const backdrop = screen.getByTestId('menu-backdrop');
    fireEvent.click(backdrop);
    expect(screen.queryByTestId('hamburger-dropdown-menu')).not.toBeInTheDocument();

    // Reopen and test closing with Escape key
    fireEvent.click(menuBtn);
    expect(screen.getByTestId('hamburger-dropdown-menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('hamburger-dropdown-menu')).not.toBeInTheDocument();

    // Reopen with theme='light' to test light mode dropdown styling (line 334)
    rerender(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="light"
        syncStatus="synced"
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={vi.fn()}
        onToggleTheme={vi.fn()}
        onOpenSettings={handleOpenSettings}
        onOpenSync={handleOpenSync}
        onOpenAccounts={handleOpenAccounts}
        onOpenBudgets={handleOpenBudgets}
        onOpenCategories={handleOpenCategories}
      />
    );
    fireEvent.click(menuBtn);
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });

  it('disables the Next period button when canStepNext is false or interval is ALL', () => {
    const handleStepNext = vi.fn();

    const { rerender } = render(
      <Header
        currentInterval="DAY"
        periodLabel="Today"
        theme="dark"
        canStepNext={false}
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={handleStepNext}
        onToggleTheme={vi.fn()}
      />
    );

    const nextBtn = screen.getByLabelText('Next period');
    expect(nextBtn).toBeDisabled();
    expect(nextBtn.style.cursor).toBe('not-allowed');

    fireEvent.click(nextBtn);
    expect(handleStepNext).not.toHaveBeenCalled();

    // When canStepNext is true (e.g. past day)
    rerender(
      <Header
        currentInterval="DAY"
        periodLabel="Yesterday"
        theme="dark"
        canStepNext={true}
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={handleStepNext}
        onToggleTheme={vi.fn()}
      />
    );

    expect(nextBtn).toBeEnabled();
    expect(nextBtn.style.cursor).toBe('pointer');

    fireEvent.click(nextBtn);
    expect(handleStepNext).toHaveBeenCalledTimes(1);

    // When interval is ALL, Next is always disabled regardless of canStepNext
    rerender(
      <Header
        currentInterval="ALL"
        periodLabel="All Time"
        theme="dark"
        canStepNext={true}
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={handleStepNext}
        onToggleTheme={vi.fn()}
      />
    );
    expect(nextBtn).toBeDisabled();
  });

  it('renders syncing and error status badges in hamburger menu', () => {
    const { rerender } = render(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="dark"
        syncStatus="syncing"
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={vi.fn()}
        onToggleTheme={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('btn-hamburger-menu'));
    expect(screen.getByText('SYNCING')).toBeInTheDocument();

    rerender(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="dark"
        syncStatus="error"
        onIntervalChange={vi.fn()}
        onStepPrev={vi.fn()}
        onStepNext={vi.fn()}
        onToggleTheme={vi.fn()}
      />
    );
    expect(screen.getByText('ERROR')).toBeInTheDocument();
  });
});
