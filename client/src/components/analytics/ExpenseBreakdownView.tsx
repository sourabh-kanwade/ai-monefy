import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, BarChart3, PieChart, ArrowUpRight } from 'lucide-react';
import type { Category, Transaction, Account } from '../../types';
import { CategoryIcon } from '../categories/CategoryIcon';

interface ExpenseBreakdownViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  currency?: string;
  onSelectTransaction?: (tx: Transaction) => void;
}

interface RankedCategory {
  category: Category;
  total: number;
  percentage: number;
  transactions: Transaction[];
}

export const ExpenseBreakdownView: React.FC<ExpenseBreakdownViewProps> = ({
  transactions,
  categories,
  accounts,
  currency = '$',
  onSelectTransaction,
}) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  // Filter only expenses and group by category
  const { rankedCategories, totalExpense } = useMemo(() => {
    const expenseTxs = transactions.filter((t) => t.type === 'expense' && !t.isDeleted);
    const totalExp = expenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const map = new Map<string, { total: number; transactions: Transaction[] }>();
    for (const tx of expenseTxs) {
      if (!map.has(tx.categoryId)) {
        map.set(tx.categoryId, { total: 0, transactions: [] });
      }
      const entry = map.get(tx.categoryId)!;
      entry.total += tx.amount;
      entry.transactions.push(tx);
    }

    const list: RankedCategory[] = [];
    for (const [catId, data] of map.entries()) {
      const category = categories.find((c) => c.id === catId);
      if (category) {
        list.push({
          category,
          total: data.total,
          percentage: totalExp > 0 ? Math.round((data.total / totalExp) * 1000) / 10 : 0,
          transactions: data.transactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        });
      }
    }

    // Rank from highest spending to lowest
    list.sort((a, b) => b.total - a.total);

    return {
      rankedCategories: list,
      totalExpense: totalExp,
    };
  }, [transactions, categories]);

  const toggleExpand = (catId: string) => {
    setExpandedCategoryId((prev) => (prev === catId ? null : catId));
  };

  const formatAmount = (val: number) => {
    return `${currency}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        gap: '16px',
        width: '100%',
      }}
    >
      {/* Analytics Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Spending Breakdown</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Ranked category share
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>
            Total Period Expense
          </span>
          <span
            className="font-num"
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: 'var(--color-deficit)',
            }}
          >
            {formatAmount(totalExpense)}
          </span>
        </div>
      </div>

      {/* Ranked Category List */}
      {rankedCategories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
          <PieChart size={36} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
          <p style={{ fontSize: '13px' }}>No expenses recorded for this period.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rankedCategories.map((item, index) => {
            const isExpanded = expandedCategoryId === item.category.id;

            return (
              <div
                key={item.category.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  transition: 'background var(--transition-fast)',
                }}
              >
                {/* Main Category Row */}
                <div
                  data-testid="analytics-category-row"
                  onClick={() => toggleExpand(item.category.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 14px',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          width: '18px',
                        }}
                      >
                        #{index + 1}
                      </span>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: `${item.category.color}25`,
                          border: `1.5px solid ${item.category.color}`,
                          color: item.category.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CategoryIcon name={item.category.icon} size={16} color={item.category.color} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {item.category.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.transactions.length} transactions
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          className="font-num"
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {formatAmount(item.total)}
                        </div>
                        <div
                          className="font-num"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: item.category.color,
                          }}
                        >
                          {item.percentage}%
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Proportional Bar */}
                  <div
                    style={{
                      width: '100%',
                      height: '6px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(item.percentage, 100)}%`,
                        height: '100%',
                        borderRadius: 'var(--radius-full)',
                        background: item.category.color,
                        transition: 'width var(--transition-normal)',
                      }}
                    />
                  </div>
                </div>

                {/* Drill-down: Contributing Transactions Accordion */}
                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px 14px 12px',
                      background: 'var(--bg-card)',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      Contributing Transactions ({item.transactions.length})
                    </div>

                    {item.transactions.map((tx) => {
                      const acc = getAccount(tx.accountId);

                      return (
                        <div
                          key={tx.id}
                          onClick={() => onSelectTransaction?.(tx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-elevated)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {tx.note || item.category.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                              <span>{acc?.name || 'Default'}</span>
                              <span>•</span>
                              <span>{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>

                          <div
                            className="font-num"
                            style={{
                              fontWeight: 700,
                              color: 'var(--color-deficit)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            -{formatAmount(tx.amount)}
                            <ArrowUpRight size={13} style={{ opacity: 0.6 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
