import React, { useState } from 'react';
import type { Category } from '../../types';

interface CircularChartProps {
  categories: Category[];
  categoryExpenses: Record<string, number>;
  totalExpense: number;
  currency?: string;
  onSelectCategory?: (cat: Category) => void;
  selectedCategoryId?: string | null;
  children?: React.ReactNode;
}

export const CircularChart: React.FC<CircularChartProps> = ({
  categories,
  categoryExpenses,
  totalExpense,
  currency = '$',
  onSelectCategory,
  selectedCategoryId,
  children,
}) => {
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [clickedCatId, setClickedCatId] = useState<string | null>(null);

  // Active highlighted category is either hovered, clicked, or explicitly passed
  const activeCatId = hoveredCatId || clickedCatId || selectedCategoryId;
  const activeCategory = activeCatId ? categories.find((c) => c.id === activeCatId) : null;
  const activeSpend = activeCatId ? categoryExpenses[activeCatId] || 0 : 0;
  const activePercentage = totalExpense > 0 ? Math.round((activeSpend / totalExpense) * 100) : 0;

  // Filter categories that have expenses > 0
  const activeSlices = categories
    .filter((cat) => (categoryExpenses[cat.id] || 0) > 0)
    .map((cat) => ({
      category: cat,
      amount: categoryExpenses[cat.id] || 0,
      share: totalExpense > 0 ? (categoryExpenses[cat.id] || 0) / totalExpense : 0,
    }));

  const size = 320;
  const center = size / 2;
  const radius = 120;
  const strokeWidth = 24;

  let currentAngle = -90; // Start at 12 o'clock

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${size}px`,
        aspectRatio: '1/1',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{
          width: '100%',
          height: '100%',
          transform: 'rotate(0deg)',
          filter: 'drop-shadow(0 6px 16px rgba(0, 0, 0, 0.4))',
        }}
      >
        {/* Background track circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
          opacity={0.6}
        />

        {/* If no expenses, render placeholder empty ring */}
        {totalExpense <= 0 || activeSlices.length === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            strokeDasharray="4 6"
            data-testid="empty-wheel-ring"
          />
        ) : activeSlices.length === 1 ? (
          // Single slice full circle
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={activeSlices[0].category.color}
            strokeWidth={strokeWidth}
            data-testid={`slice-${activeSlices[0].category.id}`}
            style={{ cursor: 'pointer', transition: 'stroke-width 200ms ease' }}
            onClick={() => onSelectCategory?.(activeSlices[0].category)}
            onMouseEnter={() => setHoveredCatId(activeSlices[0].category.id)}
            onMouseLeave={() => setHoveredCatId(null)}
          />
        ) : (
          // Multiple slices with slight gap
          activeSlices.map((slice) => {
            const angleSpan = slice.share * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angleSpan;
            currentAngle += angleSpan;

            const isSelected = activeCatId === slice.category.id;
            const currentStrokeWidth = isSelected ? strokeWidth + 6 : strokeWidth;

            // Leave 2 degree gap between segments if angle is large enough
            const effectiveStart = angleSpan > 4 ? startAngle + 1 : startAngle;
            const effectiveEnd = angleSpan > 4 ? endAngle - 1 : endAngle;
            const pathData = describeArc(center, center, radius, effectiveStart, effectiveEnd);

            return (
              <path
                key={slice.category.id}
                d={pathData}
                fill="none"
                stroke={slice.category.color}
                strokeWidth={currentStrokeWidth}
                strokeLinecap="round"
                data-testid={`slice-${slice.category.id}`}
                style={{
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  opacity: activeCatId && !isSelected ? 0.45 : 1,
                  filter: isSelected ? `drop-shadow(0 0 8px ${slice.category.color})` : 'none',
                }}
                onClick={() => {
                  setClickedCatId(slice.category.id);
                  onSelectCategory?.(slice.category);
                }}
                onMouseEnter={() => setHoveredCatId(slice.category.id)}
                onMouseLeave={() => setHoveredCatId(null)}
              />
            );
          })
        )}
      </svg>

      {/* Floating Category Detail Pill when hovered or selected */}
      {activeCategory && activeSpend > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            background: 'var(--bg-elevated)',
            border: `1px solid ${activeCategory.color}`,
            boxShadow: `0 4px 14px rgba(0, 0, 0, 0.4), 0 0 12px ${activeCategory.color}40`,
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 10,
            animation: 'fadeIn 150ms ease forwards',
            maxWidth: '92%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: activeCategory.color,
            }}
          />
          <span>{activeCategory.name}:</span>
          <span className="font-num" style={{ color: 'var(--text-primary)' }}>
            {currency}
            {activeSpend.toFixed(2)}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            ({activePercentage}%)
          </span>
        </div>
      )}

      {/* Central Content (Center Balance Hub sits here) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}
