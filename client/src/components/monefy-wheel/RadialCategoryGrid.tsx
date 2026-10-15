import React, { useState } from 'react';
import type { Category } from '../../types';
import { CategoryIcon } from '../categories/CategoryIcon';
import { MoreHorizontal, Plus, X } from 'lucide-react';

interface RadialCategoryGridProps {
  categories: Category[];
  categoryExpenses: Record<string, number>;
  currency?: string;
  onCategoryTap: (category: Category) => void;
  onOpenCustomizer?: () => void;
  maxPrimaryRing?: number;
}

export const RadialCategoryGrid: React.FC<RadialCategoryGridProps> = ({
  categories,
  categoryExpenses,
  currency = '$',
  onCategoryTap,
  onOpenCustomizer,
  maxPrimaryRing = 8,
}) => {
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'expense' && !c.isDeleted);
  const primaryCategories = expenseCategories.slice(0, maxPrimaryRing);
  const overflowCategories = expenseCategories.slice(maxPrimaryRing);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Primary Category Quick-Tap Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
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
                padding: '10px 4px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                transition: 'all var(--transition-fast)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: `${cat.color}20`,
                  border: `1.5px solid ${cat.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '6px',
                  boxShadow: `0 0 10px ${cat.color}25`,
                }}
              >
                <CategoryIcon name={cat.icon} size={18} color={cat.color} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  maxWidth: '90%',
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
                  fontSize: '10px',
                  color: spend > 0 ? 'var(--color-deficit)' : 'var(--text-muted)',
                  fontWeight: 600,
                  marginTop: '1px',
                }}
              >
                {currency}{spend.toFixed(2)}
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
              padding: '10px 4px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'var(--bg-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6px',
              }}
            >
              <MoreHorizontal size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>More...</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{overflowCategories.length}</span>
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
              padding: '10px 4px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--color-accent)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '6px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <Plus size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Custom</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>New</span>
          </button>
        )}
      </div>

      {/* Overflow Category Drawer Modal */}
      {isOverflowOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            background: 'rgba(5, 8, 14, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              maxHeight: '75vh',
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>All Categories</h3>
              <button
                onClick={() => setIsOverflowOpen(false)}
                aria-label="Close overflow"
                style={{ color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
                    }}
                  >
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
                    <span className="font-num" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {currency}{spend.toFixed(2)}
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
