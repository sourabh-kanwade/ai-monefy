import React from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon, Settings, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import type { TimeInterval } from '../../types';

interface HeaderProps {
  currentInterval: TimeInterval;
  periodLabel: string;
  theme: 'dark' | 'light';
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  onIntervalChange: (interval: TimeInterval) => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
  onOpenSync?: () => void;
}

const INTERVALS: { key: TimeInterval; label: string }[] = [
  { key: 'DAY', label: 'Day' },
  { key: 'WEEK', label: 'Week' },
  { key: 'MONTH', label: 'Month' },
  { key: 'YEAR', label: 'Year' },
  { key: 'ALL', label: 'All' },
];

export const Header: React.FC<HeaderProps> = ({
  currentInterval,
  periodLabel,
  theme,
  syncStatus = 'offline',
  onIntervalChange,
  onStepPrev,
  onStepNext,
  onToggleTheme,
  onOpenSettings,
  onOpenSync,
}) => {
  return (
    <header
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Top Bar: Brand, Stepper & Theme Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/favicon.svg"
            alt="AI Monefy Logo"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              display: 'block',
              filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))',
            }}
          />
          <h1
            style={{
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI Monefy
          </h1>
        </div>

        {/* Date Stepper Center */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-elevated)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            aria-label="Previous period"
            onClick={onStepPrev}
            disabled={currentInterval === 'ALL'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              color: currentInterval === 'ALL' ? 'var(--text-muted)' : 'var(--text-primary)',
              opacity: currentInterval === 'ALL' ? 0.4 : 1,
              transition: 'background var(--transition-fast)',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <span
            data-testid="period-label"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              minWidth: '90px',
              textAlign: 'center',
              userSelect: 'none',
            }}
          >
            {periodLabel}
          </span>

          <button
            type="button"
            aria-label="Next period"
            onClick={onStepNext}
            disabled={currentInterval === 'ALL'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              color: currentInterval === 'ALL' ? 'var(--text-muted)' : 'var(--text-primary)',
              opacity: currentInterval === 'ALL' ? 0.4 : 1,
              transition: 'background var(--transition-fast)',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Theme Toggle Button */}
          <button
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Settings / Data Management Button */}
          <button
            type="button"
            data-testid="btn-open-settings"
            aria-label="Open settings and data management"
            onClick={onOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Settings size={16} />
          </button>

          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            data-testid="btn-open-sync"
            aria-label={`Cloud sync status: ${syncStatus}`}
            onClick={onOpenSync}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-full)',
              background:
                syncStatus === 'synced'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : syncStatus === 'syncing'
                  ? 'rgba(59, 130, 246, 0.15)'
                  : 'var(--bg-elevated)',
              border: `1px solid ${
                syncStatus === 'synced'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : syncStatus === 'syncing'
                  ? 'rgba(59, 130, 246, 0.4)'
                  : 'var(--border-subtle)'
              }`,
              color:
                syncStatus === 'synced'
                  ? '#10B981'
                  : syncStatus === 'syncing'
                  ? '#3B82F6'
                  : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw size={15} />
            ) : syncStatus === 'synced' ? (
              <Cloud size={16} />
            ) : (
              <CloudOff size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Interval Switcher Tabs */}
      <nav
        aria-label="Time period intervals"
        style={{
          display: 'flex',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
          gap: '4px',
        }}
      >
        {INTERVALS.map((item) => {
          const isActive = currentInterval === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onIntervalChange(item.key)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none',
                transition: 'all var(--transition-fast)',
                textAlign: 'center',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
