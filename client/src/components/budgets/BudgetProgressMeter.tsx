import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface BudgetProgressMeterProps {
  spent: number;
  limit: number;
  currency?: string;
  categoryName?: string;
  showLabels?: boolean;
}

export const BudgetProgressMeter: React.FC<BudgetProgressMeterProps> = ({
  spent,
  limit,
  currency = '$',
  categoryName,
  showLabels = true,
}) => {
  if (limit <= 0) return null;

  const percentage = Math.round((spent / limit) * 100);
  const isExceeded = spent > limit;
  const isWarning = !isExceeded && percentage >= 70;

  const state: 'normal' | 'warning' | 'exceeded' = isExceeded
    ? 'exceeded'
    : isWarning
      ? 'warning'
      : 'normal';

  const barColor = isExceeded
    ? 'var(--color-deficit)'
    : isWarning
      ? '#F59E0B'
      : 'var(--color-surplus)';

  const overAmount = isExceeded ? spent - limit : 0;

  return (
    <div
      data-budget-state={state}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
      }}
    >
      {showLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {categoryName || 'Budget'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isExceeded && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-deficit)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <AlertTriangle size={12} />
                Over Budget (+{currency}
                {overAmount.toFixed(2)})
              </span>
            )}
            <span
              className="font-num"
              style={{
                fontWeight: 700,
                color: barColor,
              }}
            >
              {percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: '6px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(percentage, 100)}%`,
            background: barColor,
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-normal), background-color var(--transition-normal)',
            boxShadow: isExceeded
              ? '0 0 8px rgba(239, 68, 68, 0.6)'
              : isWarning
                ? '0 0 8px rgba(245, 158, 11, 0.6)'
                : 'none',
          }}
        />
      </div>

      {showLabels && (
        <div
          className="font-num"
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Spent: {currency}
            {spent.toFixed(2)}
          </span>
          <span>
            Limit: {currency}
            {limit.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
};
