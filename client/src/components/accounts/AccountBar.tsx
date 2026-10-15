import React from 'react';
import { Settings2, Wallet } from 'lucide-react';
import type { Account } from '../../types';

interface AccountBarProps {
  accounts: Account[];
  accountBalances: Record<string, number>;
  selectedAccountId: string | null;
  totalBalance: number;
  currency?: string;
  onSelectAccount: (id: string | null) => void;
  onOpenManager: () => void;
}

export const AccountBar: React.FC<AccountBarProps> = ({
  accounts,
  accountBalances,
  selectedAccountId,
  totalBalance,
  currency = '$',
  onSelectAccount,
  onOpenManager,
}) => {
  const activeAccounts = accounts.filter((a) => !a.isDeleted);

  const formatAmount = (val: number) => {
    return `${val < 0 ? '-' : ''}${currency}${Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        padding: '2px 0 6px',
        scrollbarWidth: 'none',
      }}
    >
      {/* "All Accounts" Filter Pill */}
      <button
        type="button"
        onClick={() => onSelectAccount(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          background: selectedAccountId === null ? 'var(--color-primary)' : 'var(--bg-elevated)',
          color: selectedAccountId === null ? '#ffffff' : 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: selectedAccountId === null ? '0 2px 10px rgba(79, 70, 229, 0.4)' : 'none',
          whiteSpace: 'nowrap',
          fontSize: '12px',
          fontWeight: 600,
          transition: 'all var(--transition-fast)',
        }}
      >
        <Wallet size={14} />
        <span>All Accounts</span>
        <span
          className="font-num"
          style={{
            fontSize: '11px',
            opacity: 0.9,
            paddingLeft: '4px',
            borderLeft: `1px solid ${selectedAccountId === null ? 'rgba(255,255,255,0.3)' : 'var(--border-subtle)'}`,
          }}
        >
          {formatAmount(totalBalance)}
        </span>
      </button>

      {/* Account Pills */}
      {activeAccounts.map((acc) => {
        const isSelected = selectedAccountId === acc.id;
        const bal = accountBalances[acc.id] ?? acc.initialBalance;

        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onSelectAccount(acc.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-full)',
              background: isSelected ? 'var(--color-primary)' : 'var(--bg-elevated)',
              color: isSelected ? '#ffffff' : 'var(--text-primary)',
              border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              boxShadow: isSelected ? '0 2px 10px rgba(79, 70, 229, 0.4)' : 'none',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all var(--transition-fast)',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: acc.color || '#3B82F6',
              }}
            />
            <span>{acc.name}</span>
            <span
              className="font-num"
              style={{
                fontSize: '11px',
                opacity: 0.9,
                paddingLeft: '4px',
                borderLeft: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'var(--border-subtle)'}`,
              }}
            >
              {formatAmount(bal)}
            </span>
          </button>
        );
      })}

      {/* Manage Accounts Gear Trigger */}
      <button
        type="button"
        aria-label="Manage Accounts"
        title="Manage Accounts"
        onClick={onOpenManager}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          gap: '6px',
        }}
      >
        <Settings2 size={14} />
      </button>
    </div>
  );
};
