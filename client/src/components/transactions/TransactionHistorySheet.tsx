import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronUp, Trash2, Wallet, ArrowRightLeft } from 'lucide-react';
import type { Transaction, Category, Account } from '../../types';
import { CategoryIcon } from '../categories/CategoryIcon';

interface TransactionHistorySheetProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currency?: string;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

interface DateGroup {
  dateKey: string;
  displayDate: string;
  totalIncome: number;
  totalExpense: number;
  items: Transaction[];
}

export const TransactionHistorySheet: React.FC<TransactionHistorySheetProps> = ({
  transactions,
  categories,
  accounts,
  currency = '$',
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getCategory = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  );
  const getAccount = useCallback((id: string) => accounts.find((a) => a.id === id), [accounts]);

  // Filter transactions by real-time search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase();

    return transactions.filter((tx) => {
      const cat = getCategory(tx.categoryId);
      const acc = getAccount(tx.accountId);
      const toAcc = tx.toAccountId ? getAccount(tx.toAccountId) : null;

      const catMatch = cat?.name.toLowerCase().includes(q) ?? false;
      const noteMatch = tx.note?.toLowerCase().includes(q) ?? false;
      const accMatch = acc?.name.toLowerCase().includes(q) ?? false;
      const toAccMatch = toAcc?.name.toLowerCase().includes(q) ?? false;
      const amountMatch = String(tx.amount).includes(q);

      return catMatch || noteMatch || accMatch || toAccMatch || amountMatch;
    });
  }, [transactions, searchQuery, getCategory, getAccount]);

  // Group transactions in reverse-chronological order by day
  const groupedTransactions = useMemo(() => {
    const groupsMap = new Map<string, DateGroup>();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    for (const tx of filteredTransactions) {
      const dateKey = tx.date ? tx.date.slice(0, 10) : 'Unknown';
      if (!groupsMap.has(dateKey)) {
        let displayDate = dateKey;
        if (dateKey === todayStr) {
          displayDate = 'Today';
        } else if (dateKey === yesterdayStr) {
          displayDate = 'Yesterday';
        } else if (dateKey !== 'Unknown') {
          const d = new Date(tx.date);
          displayDate = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
        }

        groupsMap.set(dateKey, {
          dateKey,
          displayDate,
          totalIncome: 0,
          totalExpense: 0,
          items: [],
        });
      }

      const group = groupsMap.get(dateKey)!;
      group.items.push(tx);
      if (tx.type === 'income') {
        group.totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        group.totalExpense += tx.amount;
      }
    }

    return Array.from(groupsMap.values());
  }, [filteredTransactions]);

  const formatAmount = (amount: number) => {
    return `${currency}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <section
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        gap: '12px',
        flex: 1,
      }}
    >
      {/* Top Header & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Transaction History</h3>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              {filteredTransactions.length} records
            </span>
          </div>

          <button
            type="button"
            aria-label={isCollapsed ? 'Expand transactions' : 'Collapse transactions'}
            onClick={() => setIsCollapsed((prev) => !prev)}
            style={{ color: 'var(--text-secondary)', padding: '4px' }}
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        {/* Real-time Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-elevated)',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search transactions by note, category, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              style={{
                color: 'var(--text-muted)',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupedTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              <Wallet size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <p style={{ fontSize: '13px' }}>
                {searchQuery
                  ? `No transactions matching "${searchQuery}"`
                  : 'No transactions recorded yet'}
              </p>
            </div>
          ) : (
            groupedTransactions.map((group) => {
              const netDay = group.totalIncome - group.totalExpense;
              return (
                <div
                  key={group.dateKey}
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {/* Date Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span>{group.displayDate}</span>
                    <span
                      className="font-num"
                      style={{
                        fontSize: '11px',
                        color: netDay >= 0 ? 'var(--color-surplus)' : 'var(--color-deficit)',
                      }}
                    >
                      {netDay >= 0 ? '+' : '-'}
                      {formatAmount(Math.abs(netDay))}
                    </span>
                  </div>

                  {/* List of Transactions for this day */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {group.items.map((tx) => {
                      const cat = getCategory(tx.categoryId);
                      const acc = getAccount(tx.accountId);
                      const toAcc = tx.toAccountId ? getAccount(tx.toAccountId) : null;
                      const isExp = tx.type === 'expense';
                      const isTransfer = tx.type === 'transfer';

                      return (
                        <div
                          key={tx.id}
                          className="transaction-item"
                          onClick={() => onEditTransaction(tx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            touchAction: 'manipulation',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: cat?.color
                                  ? `${cat.color}20`
                                  : 'rgba(255, 255, 255, 0.05)',
                                color: cat?.color || 'var(--text-primary)',
                                flexShrink: 0,
                              }}
                            >
                              {isTransfer ? (
                                <ArrowRightLeft size={18} />
                              ) : (
                                <CategoryIcon
                                  name={cat?.icon || 'circle'}
                                  size={18}
                                  color={cat?.color}
                                />
                              )}
                            </div>

                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {isTransfer
                                  ? `Transfer: ${acc?.name || 'Account'} → ${toAcc?.name || 'Account'}`
                                  : cat?.name || 'General'}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  marginTop: '2px',
                                }}
                              >
                                {!isTransfer && <span>{acc?.name || 'Default'}</span>}
                                {tx.note && <span>• {tx.note}</span>}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div
                                className="font-num"
                                style={{
                                  fontWeight: 700,
                                  fontSize: '14px',
                                  color: isTransfer
                                    ? '#3B82F6'
                                    : isExp
                                      ? 'var(--color-deficit)'
                                      : 'var(--color-surplus)',
                                }}
                              >
                                {isTransfer ? '⇄ ' : isExp ? '-' : '+'}
                                {formatAmount(tx.amount)}
                              </div>
                            </div>

                            <button
                              type="button"
                              aria-label={`Delete ${tx.note || cat?.name || 'transaction'}`}
                              title="Delete transaction"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTransaction(tx.id);
                              }}
                              style={{
                                color: 'var(--text-muted)',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm)',
                                opacity: 0.7,
                                touchAction: 'manipulation',
                                transition: 'opacity var(--transition-fast)',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};
