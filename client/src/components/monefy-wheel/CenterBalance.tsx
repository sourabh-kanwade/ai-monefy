import React from 'react';
import { Plus, Minus, ArrowRightLeft } from 'lucide-react';

interface CenterBalanceProps {
  netBalance: number;
  totalIncome?: number;
  totalExpense?: number;
  currency?: string;
  onOpenExpenseKeypad: () => void;
  onOpenIncomeKeypad: () => void;
  onOpenTransferModal?: () => void;
}

export const CenterBalance: React.FC<CenterBalanceProps> = ({
  netBalance,
  totalIncome = 0,
  totalExpense = 0,
  currency = '$',
  onOpenExpenseKeypad,
  onOpenIncomeKeypad,
  onOpenTransferModal,
}) => {
  const isSurplus = netBalance >= 0;
  const state = isSurplus ? 'surplus' : 'deficit';
  const formattedAmount = `${netBalance < 0 ? '-' : ''}${currency}${Math.abs(netBalance).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div
      data-testid="center-balance-hub"
      data-state={state}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: isSurplus
          ? 'radial-gradient(circle, var(--color-surplus-glow) 0%, var(--bg-secondary) 75%)'
          : 'radial-gradient(circle, var(--color-deficit-glow) 0%, var(--bg-secondary) 75%)',
        border: `1.5px solid ${isSurplus ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
        boxShadow: isSurplus
          ? '0 0 24px rgba(16, 185, 129, 0.2), inset 0 0 16px rgba(16, 185, 129, 0.1)'
          : '0 0 24px rgba(239, 68, 68, 0.2), inset 0 0 16px rgba(239, 68, 68, 0.1)',
        padding: '12px',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          marginBottom: '2px',
        }}
      >
        Balance
      </span>

      <div
        data-testid="center-balance-amount"
        className="font-num"
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color: isSurplus ? 'var(--color-surplus)' : 'var(--color-deficit)',
          textShadow: isSurplus
            ? '0 0 16px var(--color-surplus-glow)'
            : '0 0 16px var(--color-deficit-glow)',
          lineHeight: 1.1,
        }}
      >
        {formattedAmount}
      </div>

      {/* Micro Income/Expense summary */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          fontSize: '10px',
          marginTop: '6px',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        <span style={{ color: 'var(--color-surplus)' }}>+{currency}{totalIncome.toFixed(0)}</span>
        <span>/</span>
        <span style={{ color: 'var(--color-deficit)' }}>-{currency}{totalExpense.toFixed(0)}</span>
      </div>

      {/* Quick Action Floating Action Triggers: [-] on left, [+] on right, [⇄] on bottom */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '10px',
        }}
      >
        {/* Quick Expense Button */}
        <button
          type="button"
          onClick={onOpenExpenseKeypad}
          data-testid="btn-quick-expense"
          aria-label="Add Expense"
          title="Add Expense"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            border: 'none',
          }}
        >
          <Minus size={18} strokeWidth={2.8} />
        </button>

        {/* Optional Transfer Button */}
        {onOpenTransferModal && (
          <button
            type="button"
            onClick={onOpenTransferModal}
            data-testid="btn-quick-transfer"
            aria-label="Transfer between accounts"
            title="Transfer"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <ArrowRightLeft size={13} />
          </button>
        )}

        {/* Quick Income Button */}
        <button
          type="button"
          onClick={onOpenIncomeKeypad}
          data-testid="btn-quick-income"
          aria-label="Add Income"
          title="Add Income"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
            border: 'none',
          }}
        >
          <Plus size={18} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  );
};
