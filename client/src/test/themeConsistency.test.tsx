import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { SettingsModal } from '../components/settings/SettingsModal';
import { CloudSyncModal } from '../components/sync/CloudSyncModal';
import { CenterBalance } from '../components/monefy-wheel/CenterBalance';
import { MonefyDashboard } from '../components/dashboard/MonefyDashboard';
import { FinanceProvider } from '../context/FinanceContext';

describe('Theme Consistency Seam Tests', () => {
  it('ensures index.css defines --color-primary and --bg-surface for both dark and light modes', () => {
    const cssPath = path.resolve(__dirname, '../index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Both :root (dark) and [data-theme='light'] must define --color-primary and --bg-surface
    expect(cssContent).toMatch(/--color-primary:/);
    expect(cssContent).toMatch(/--bg-surface:/);

    // Verify inside [data-theme='light'] block
    const lightThemeBlock = cssContent.slice(cssContent.indexOf("[data-theme='light']"));
    expect(lightThemeBlock).toMatch(/--color-primary:/);
    expect(lightThemeBlock).toMatch(/--bg-surface:/);
  });

  it('ensures SettingsModal and CloudSyncModal use a valid surface/secondary background instead of undefined tokens', () => {
    const { container: settingsContainer } = render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currency="$"
        onSetCurrency={vi.fn()}
        transactions={[]}
        categories={[]}
        accounts={[]}
      />
    );

    const settingsPanel = settingsContainer.querySelector('.glass-panel') as HTMLElement;
    expect(settingsPanel).not.toBeNull();
    // Modal background should be var(--bg-secondary) or defined var(--bg-surface)
    expect(settingsPanel.style.background).toBe('var(--bg-secondary)');

    const { container: syncContainer } = render(
      <CloudSyncModal
        isOpen={true}
        onClose={vi.fn()}
        user={null}
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        onSyncNow={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    const syncPanel = syncContainer.querySelector('.glass-panel') as HTMLElement;
    expect(syncPanel).not.toBeNull();
    expect(syncPanel.style.background).toBe('var(--bg-secondary)');
  });

  it('ensures MonefyDashboard does not have hardcoded dark backgrounds on wheel card and view switcher', () => {
    const { container } = render(
      <FinanceProvider>
        <MonefyDashboard />
      </FinanceProvider>
    );

    // View switcher tab container should not have hardcoded dark slate rgba(22, 27, 39, 0.6)
    const wheelTab = screen.getByTestId('tab-wheel');
    const viewSwitcher = wheelTab.parentElement as HTMLElement;
    expect(viewSwitcher.style.background).not.toContain('rgba(22, 27, 39');
    expect(viewSwitcher.style.background).toContain('var(--bg-elevated)');

    // Signature Monefy Donut Wheel Card should use var(--bg-card) or theme tokens, not hardcoded dark gradient
    const wheelCard = container.querySelector(
      '.glass-panel[style*="linear-gradient"]'
    ) as HTMLElement | null;
    if (wheelCard) {
      expect(wheelCard.style.background).not.toContain('rgba(22, 27, 39');
      expect(wheelCard.style.background).not.toContain('rgba(14, 18, 27');
    }
  });

  it('ensures CenterBalance does not use hardcoded dark obsidian background rgba(18, 23, 34)', () => {
    render(
      <CenterBalance
        netBalance={100}
        totalIncome={150}
        totalExpense={50}
        currency="$"
        onOpenExpenseKeypad={vi.fn()}
        onOpenIncomeKeypad={vi.fn()}
      />
    );

    const hub = screen.getByTestId('center-balance-hub') as HTMLElement;
    expect(hub.style.background).not.toContain('rgba(18, 23, 34');
  });
});
