import React, { useState } from 'react';
import { X, Target, Trash2 } from 'lucide-react';
import type { Category, Budget } from '../../types';
import { CategoryIcon } from '../categories/CategoryIcon';
import { BudgetProgressMeter } from './BudgetProgressMeter';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  budgets: Budget[];
  categoryExpenses: Record<string, number>;
  currency?: string;
  onSetBudget: (categoryId: string, monthlyLimit: number) => void;
  onRemoveBudget: (categoryId: string) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  categories,
  budgets,
  categoryExpenses,
  currency = '$',
  onSetBudget,
  onRemoveBudget,
}) => {
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [inputLimit, setInputLimit] = useState<string>('');

  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.isDeleted);
  const budgetMap = new Map<string, Budget>();
  for (const b of budgets) {
    budgetMap.set(b.categoryId, b);
  }

  const handleStartEdit = (catId: string, currentLimit?: number) => {
    setEditingCategoryId(catId);
    setInputLimit(currentLimit ? String(currentLimit) : '');
  };

  const handleSave = (catId: string) => {
    const parsed = parseFloat(inputLimit);
    if (isNaN(parsed) || parsed <= 0) {
      alert('Please enter a valid monthly limit');
      return;
    }
    onSetBudget(catId, parsed);
    setEditingCategoryId(null);
    setInputLimit('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          background: 'var(--bg-secondary)',
          padding: '16px 20px',
          gap: '16px',
        }}
      >
        <div className="modal-drag-handle" />
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={18} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Category Budgets</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories Budget List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {expenseCategories.map((cat) => {
            const budget = budgetMap.get(cat.id);
            const spent = categoryExpenses[cat.id] || 0;
            const isEditing = editingCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-md)',
                        background: `${cat.color}20`,
                        color: cat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{cat.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {budget && !isEditing && (
                      <button
                        type="button"
                        aria-label={`Remove budget for ${cat.name}`}
                        title="Remove budget"
                        onClick={() => onRemoveBudget(cat.id)}
                        style={{ color: 'var(--color-deficit)', opacity: 0.7, padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        aria-label={`Set budget for ${cat.name}`}
                        onClick={() => handleStartEdit(cat.id, budget?.monthlyLimit)}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          background: 'rgba(79, 70, 229, 0.15)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {budget ? 'Edit Limit' : 'Set Limit'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Meter or Edit Form */}
                {isEditing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      placeholder="Enter monthly limit"
                      value={inputLimit}
                      onChange={(e) => setInputLimit(e.target.value)}
                      className="font-num"
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Save Budget"
                      onClick={() => handleSave(cat.id)}
                      className="btn btn-primary"
                      style={{ padding: '8px 12px', fontSize: '12px', fontWeight: 700 }}
                    >
                      Save Budget
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      style={{
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : budget ? (
                  <BudgetProgressMeter
                    spent={spent}
                    limit={budget.monthlyLimit}
                    currency={currency}
                    showLabels={true}
                  />
                ) : (
                  <div className="font-num" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Spent this period: {currency}{spent.toFixed(2)} (No limit set)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
