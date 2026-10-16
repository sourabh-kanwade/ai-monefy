import React, { useState } from 'react';
import type { Category } from '../../types';
import { CategoryIcon } from '../categories/CategoryIcon';
import { MoreHorizontal, Plus, X } from 'lucide-react';

interface RadialCategoryGridProps {
  categories: Category[];
  categoryExpenses: Record<string, number>;
  categoryBudgets?: Record<string, number>;
  currency?: string;
  onCategoryTap: (category: Category) => void;
  onOpenCustomizer?: () => void;
  maxPrimaryRing?: number;
}

export const RadialCategoryGrid: React.FC<RadialCategoryGridProps> = ({
  categories,
  categoryExpenses,
  categoryBudgets,
  currency = '$',
  onCategoryTap,
  onOpenCustomizer,
  maxPrimaryRing = 8,
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const expenseCategories = categories.filter(
    (c) => c.type === 'expense' && !c.isDeleted && c.isVisible !== false
  );
  const sortedExpenseCategories = [...expenseCategories].sort((a, b) => {
    const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
    const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
    if (orderA !== orderB) return orderA - orderB;
    const spendA = categoryExpenses[a.id] || 0;
    const spendB = categoryExpenses[b.id] || 0;
    if (spendA !== spendB) return spendB - spendA;
    const budgetA = categoryBudgets?.[a.id] ? 1 : 0;
    const budgetB = categoryBudgets?.[b.id] ? 1 : 0;
    if (budgetA !== budgetB) return budgetB - budgetA;
    return 0;
  });
  const primaryCategories = sortedExpenseCategories.slice(0, maxPrimaryRing);
  const overflowCategories = sortedExpenseCategories.slice(maxPrimaryRing);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Primary Category Quick-Tap Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'clamp(6px, 2vw, 10px)',
        }}
      >
        {primaryCategories.map((cat) => {
          const spend = categoryExpenses[cat.id] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              data-testid={`radial-category-${cat.id}`}
              onClick={() => onCategoryTap(cat)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(8px, 2vw, 10px) 4px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                transition: 'all var(--transition-fast)',
                position: 'relative',
                overflow: 'hidden',
                touchAction: 'manipulation',
              }}
            >
              {categoryBudgets && categoryBudgets[cat.id] && spend > categoryBudgets[cat.id] && (
                <div
                  title={`Over budget by ${currency}${(spend - categoryBudgets[cat.id]).toFixed(2)}`}
                  data-testid={`over-budget-${cat.id}`}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-deficit)',
                    boxShadow: '0 0 6px var(--color-deficit)',
                  }}
                />
              )}
              <div
                style={{
                  width: 'clamp(34px, 9vw, 38px)',
                  height: 'clamp(34px, 9vw, 38px)',
                  borderRadius: '50%',
                  background: `${cat.color}20`,
                  border: `1.5px solid ${cat.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '5px',
                  boxShadow: `0 0 10px ${cat.color}25`,
                }}
              >
                <CategoryIcon name={cat.icon} size={18} color={cat.color} />
              </div>
              <span
                style={{
                  fontSize: 'clamp(10px, 2.7vw, 11px)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  maxWidth: '92%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cat.name}
              </span>
              <span
                className="font-num"
                style={{
                  fontSize: 'clamp(9px, 2.4vw, 10px)',
                  color: spend > 0 ? 'var(--color-deficit)' : 'var(--text-muted)',
                  fontWeight: 600,
                  marginTop: '1px',
                }}
              >
                {currency}
                {spend.toFixed(2)}
              </span>
            </button>
          );
        })}

        {/* Overflow "More..." Button if there are additional categories */}
        {overflowCategories.length > 0 && (
          <button
            type="button"
            data-testid="btn-categories-overflow"
            onClick={() => setIsOverflowOpen(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(8px, 2vw, 10px) 4px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--text-secondary)',
              touchAction: 'manipulation',
            }}
          >
            <div
              style={{
                width: 'clamp(34px, 9vw, 38px)',
                height: 'clamp(34px, 9vw, 38px)',
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '5px',
              }}
            >
              <MoreHorizontal size={18} />
            </div>
            <span style={{ fontSize: 'clamp(10px, 2.7vw, 11px)', fontWeight: 600 }}>More...</span>
            <span style={{ fontSize: 'clamp(9px, 2.4vw, 10px)', color: 'var(--text-muted)' }}>
              +{overflowCategories.length}
            </span>
          </button>
        )}

        {/* Add Category Button */}
        {onOpenCustomizer && (
          <button
            type="button"
            data-testid="btn-add-category"
            onClick={onOpenCustomizer}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(8px, 2vw, 10px) 4px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--color-accent)',
              touchAction: 'manipulation',
            }}
          >
            <div
              style={{
                width: 'clamp(34px, 9vw, 38px)',
                height: 'clamp(34px, 9vw, 38px)',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '5px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <Plus size={18} />
            </div>
            <span style={{ fontSize: 'clamp(10px, 2.7vw, 11px)', fontWeight: 600 }}>Custom</span>
            <span style={{ fontSize: 'clamp(9px, 2.4vw, 10px)', color: 'var(--text-muted)' }}>
              New
            </span>
          </button>
        )}
      </div>

      {/* Overflow Category Drawer Modal */}
      {isOverflowOpen && (
        <div className="modal-overlay" onClick={() => setIsOverflowOpen(false)}>
          <div
            className="modal-sheet glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary)',
              padding: '16px 20px',
              gap: '14px',
            }}
          >
            <div className="modal-drag-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>All Categories</h3>
              <button
                onClick={() => setIsOverflowOpen(false)}
                aria-label="Close overflow"
                style={{ color: 'var(--text-muted)', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {expenseCategories.map((cat) => {
                const spend = categoryExpenses[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setIsOverflowOpen(false);
                      onCategoryTap(cat);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      position: 'relative',
                    }}
                  >
                    {categoryBudgets &&
                      categoryBudgets[cat.id] &&
                      spend > categoryBudgets[cat.id] && (
                        <div
                          title={`Over budget by ${currency}${(spend - categoryBudgets[cat.id]).toFixed(2)}`}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--color-deficit)',
                            boxShadow: '0 0 6px var(--color-deficit)',
                          }}
                        />
                      )}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: `${cat.color}20`,
                        border: `1.5px solid ${cat.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{cat.name}</span>
                    <span
                      className="font-num"
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      {currency}
                      {spend.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
