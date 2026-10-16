import React, { useEffect } from 'react';
import type { Category, TransactionType } from '../../types';
import { CategoryIcon } from './CategoryIcon';
import { triggerHapticFeedback } from '../../utils/nativePlatform';
import { X, Plus } from 'lucide-react';

export interface CategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: Category) => void;
  categories: Category[];
  type?: TransactionType;
  categoryExpenses?: Record<string, number>;
  categoryBudgets?: Record<string, number>;
  currency?: string;
  onOpenCustomizer?: () => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
  categories,
  type = 'expense',
  categoryExpenses = {},
  categoryBudgets = {},
  currency = '$',
  onOpenCustomizer,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter active, visible categories of the specified transaction type
  const availableCategories = categories.filter(
    (c) => c.type === type && !c.isDeleted && c.isVisible !== false
  );

  // Sort by user's displayOrder, fallback to spend descending, then budget existence
  const sortedCategories = [...availableCategories].sort((a, b) => {
    const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
    const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
    if (orderA !== orderB) return orderA - orderB;
    const spendA = categoryExpenses[a.id] || 0;
    const spendB = categoryExpenses[b.id] || 0;
    if (spendA !== spendB) return spendB - spendA;
    const budgetA = categoryBudgets[a.id] ? 1 : 0;
    const budgetB = categoryBudgets[b.id] ? 1 : 0;
    if (budgetA !== budgetB) return budgetB - budgetA;
    return a.name.localeCompare(b.name);
  });

  const isExpense = type === 'expense';
  const modalTitle = isExpense ? 'Select Expense Category' : 'Select Income Category';

  return (
    <div className="modal-overlay" data-testid="category-picker-overlay" onClick={onClose}>
      <div
        className="modal-sheet glass-panel"
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          maxHeight: '90dvh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
        }}
      >
        <div className="modal-drag-handle" />

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {modalTitle}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: isExpense ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isExpense ? 'var(--color-deficit)' : 'var(--color-surplus)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {type}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close category picker"
            style={{
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Category Grid */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: '12px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {sortedCategories.map((cat) => {
            const spend = categoryExpenses[cat.id] || 0;
            const budget = categoryBudgets[cat.id];
            const isOverBudget = isExpense && budget !== undefined && spend > budget;

            return (
              <button
                key={cat.id}
                type="button"
                data-testid={`category-picker-item-${cat.id}`}
                onClick={() => {
                  triggerHapticFeedback();
                  onSelectCategory(cat);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px 6px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  touchAction: 'manipulation',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Over Budget Indicator */}
                {isOverBudget && (
                  <div
                    title={`Over budget by ${currency}${(spend - budget).toFixed(2)}`}
                    data-testid={`over-budget-${cat.id}`}
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

                {/* Category Icon Avatar */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: `${cat.color}20`,
                    border: `1.5px solid ${cat.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '6px',
                    boxShadow: `0 0 10px ${cat.color}20`,
                  }}
                >
                  <CategoryIcon name={cat.icon} size={20} color={cat.color} />
                </div>

                {/* Category Name */}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textAlign: 'center',
                  }}
                >
                  {cat.name}
                </span>

                {/* Spend/Income Amount */}
                <span
                  className="font-num"
                  style={{
                    fontSize: '10px',
                    color:
                      spend > 0
                        ? isExpense
                          ? 'var(--color-deficit)'
                          : 'var(--color-surplus)'
                        : 'var(--text-muted)',
                    fontWeight: 600,
                    marginTop: '2px',
                  }}
                >
                  {currency}
                  {spend.toFixed(2)}
                </span>
              </button>
            );
          })}

          {/* New / Custom Category Button */}
          {onOpenCustomizer && (
            <button
              type="button"
              data-testid="btn-category-picker-custom"
              onClick={() => {
                triggerHapticFeedback();
                onOpenCustomizer();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 6px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--color-accent)',
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <Plus size={20} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Custom</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>New Category</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
