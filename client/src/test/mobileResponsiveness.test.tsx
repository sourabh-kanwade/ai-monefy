import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { Header } from '../components/layout/Header';
import { AccountBar } from '../components/accounts/AccountBar';
import { CenterBalance } from '../components/monefy-wheel/CenterBalance';

describe('Mobile Phone Responsiveness & Touch Optimization Seam Tests', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines safe area CSS insets and 100dvh viewport height for mobile devices', () => {
    expect(cssContent).toMatch(/--safe-top:\s*env\(safe-area-inset-top/);
    expect(cssContent).toMatch(/--safe-bottom:\s*env\(safe-area-inset-bottom/);
    expect(cssContent).toMatch(/--safe-left:\s*env\(safe-area-inset-left/);
    expect(cssContent).toMatch(/--safe-right:\s*env\(safe-area-inset-right/);
    expect(cssContent).toMatch(/min-height:\s*100dvh/);
  });

  it('configures touch-action manipulation and prevents iOS input auto-zoom', () => {
    expect(cssContent).toMatch(/touch-action:\s*manipulation/);
    expect(cssContent).toMatch(/font-size:\s*16px\s*!important/);
  });

  it('configures responsive modal-sheet bottom-sheet styling and safe-area padding', () => {
    expect(cssContent).toMatch(/\.modal-sheet\s*\{/);
    expect(cssContent).toMatch(/padding-bottom:\s*max\(20px,\s*var\(--safe-bottom\)\)/);
    expect(cssContent).toMatch(/\.modal-drag-handle/);
  });

  it('keeps web and desktop viewport scrolling unblocked without overscroll-behavior-y locking', () => {
    // overscroll-behavior-y: none on html, body locks wheel and trackpad scroll gestures in Chromium
    expect(cssContent).not.toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior-y:\s*none/);
  });

  it('renders Header with responsive top bar and stepper row classes', () => {
    const { container } = render(
      <Header
        currentInterval="MONTH"
        periodLabel="October 2026"
        theme="dark"
        onIntervalChange={() => {}}
        onStepPrev={() => {}}
        onStepNext={() => {}}
        onToggleTheme={() => {}}
      />
    );

    const topBar = container.querySelector('.header-top-bar');
    expect(topBar).not.toBeNull();
    const stepperRow = container.querySelector('.header-stepper-row');
    expect(stepperRow).not.toBeNull();
  });

  it('renders AccountBar with no-scrollbar class and momentum touch scroll properties', () => {
    const { container } = render(
      <AccountBar
        accounts={[
          {
            id: 'acc-1',
            name: 'Cash',
            icon: 'wallet',
            color: '#10B981',
            initialBalance: 100,
            isDefault: true,
            isDeleted: false,
            createdAt: '',
            updatedAt: '',
          },
        ]}
        accountBalances={{ 'acc-1': 100 }}
        selectedAccountId={null}
        totalBalance={100}
        currency="$"
        onSelectAccount={() => {}}
        onOpenManager={() => {}}
      />
    );

    const bar = container.querySelector('.no-scrollbar');
    expect(bar).not.toBeNull();
  });

  it('renders CenterBalance with fluid scaling clamp and touch manipulation targets', () => {
    render(
      <CenterBalance
        netBalance={250}
        totalIncome={300}
        totalExpense={50}
        currency="$"
        onOpenExpenseKeypad={() => {}}
        onOpenIncomeKeypad={() => {}}
      />
    );

    const hub = screen.getByTestId('center-balance-hub') as HTMLElement;
    expect(hub.style.width).toContain('clamp(');
    expect(hub.style.height).toContain('clamp(');

    const expenseBtn = screen.getByTestId('btn-quick-expense') as HTMLElement;
    expect(expenseBtn.style.touchAction).toBe('manipulation');
  });
});
