import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Menu,
  X,
  Wallet,
  Target,
  Tags,
} from 'lucide-react';
import type { TimeInterval } from '../../types';

export interface HeaderProps {
  currentInterval: TimeInterval;
  periodLabel: string;
  theme: 'dark' | 'light';
  syncStatus?: 'synced' | 'syncing' | 'offline' | 'error';
  canStepNext?: boolean;
  onIntervalChange: (interval: TimeInterval) => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  onToggleTheme: () => void;
  onOpenSettings?: () => void;
  onOpenSync?: () => void;
  onOpenAccounts?: () => void;
  onOpenBudgets?: () => void;
  onOpenCategories?: () => void;
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
  canStepNext,
  onIntervalChange,
  onStepPrev,
  onStepNext,
  onToggleTheme,
  onOpenSettings,
  onOpenSync,
  onOpenAccounts,
  onOpenBudgets,
  onOpenCategories,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isNextDisabled = currentInterval === 'ALL' || canStepNext === false;

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  return (
    <header
      className="glass-panel"
      data-testid="app-header"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        zIndex: isMenuOpen ? 2000 : 10,
      }}
    >
      {/* Top Bar: Brand, Stepper & Hamburger Menu */}
      <div className="header-top-bar">
        <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
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
        <div className="header-stepper-row">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              background: 'var(--bg-elevated)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              minWidth: '150px',
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
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                color: currentInterval === 'ALL' ? 'var(--text-muted)' : 'var(--text-primary)',
                opacity: currentInterval === 'ALL' ? 0.35 : 1,
                cursor: currentInterval === 'ALL' ? 'not-allowed' : 'pointer',
                transition: 'background var(--transition-fast), opacity var(--transition-fast)',
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <span
              data-testid="period-label"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                minWidth: '84px',
                textAlign: 'center',
                userSelect: 'none',
                padding: '0 4px',
              }}
            >
              {periodLabel}
            </span>

            <button
              type="button"
              aria-label="Next period"
              onClick={onStepNext}
              disabled={isNextDisabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                color: isNextDisabled ? 'var(--text-muted)' : 'var(--text-primary)',
                opacity: isNextDisabled ? 0.35 : 1,
                cursor: isNextDisabled ? 'not-allowed' : 'pointer',
                transition: 'background var(--transition-fast), opacity var(--transition-fast)',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Hamburger Menu Trigger & Dropdown Container */}
        <div
          className="header-menu-container"
          style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: isMenuOpen ? 2002 : 'auto' }}
        >
          <button
            type="button"
            data-testid="btn-hamburger-menu"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            style={{
              position: 'relative',
              zIndex: isMenuOpen ? 2002 : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-full)',
              background: isMenuOpen ? 'var(--color-primary)' : 'var(--bg-elevated)',
              border: `1px solid ${isMenuOpen ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
              color: isMenuOpen ? '#ffffff' : 'var(--text-primary)',
              cursor: 'pointer',
              touchAction: 'manipulation',
              transition: 'all var(--transition-fast)',
              boxShadow: isMenuOpen ? '0 0 16px rgba(99, 102, 241, 0.5)' : 'none',
            }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}

            {/* Quick Cloud Sync status dot indicator */}
            {!isMenuOpen && syncStatus && syncStatus !== 'offline' && (
              <span
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor:
                    syncStatus === 'synced'
                      ? '#10b981'
                      : syncStatus === 'syncing'
                      ? '#3b82f6'
                      : '#ef4444',
                  boxShadow:
                    syncStatus === 'synced'
                      ? '0 0 6px rgba(16, 185, 129, 0.8)'
                      : syncStatus === 'syncing'
                      ? '0 0 6px rgba(59, 130, 246, 0.8)'
                      : '0 0 6px rgba(239, 68, 68, 0.8)',
                }}
              />
            )}
          </button>

          {/* Dropdown Menu Modal / Sheet */}
          {isMenuOpen && (
            <>
              {/* Tap Outside Fullscreen Blurred Backdrop */}
              <div
                data-testid="menu-backdrop"
                onClick={() => setIsMenuOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 2001,
                  background: theme === 'dark' ? 'rgba(5, 9, 18, 0.72)' : 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  transition: 'opacity var(--transition-normal)',
                }}
              />

              {/* Menu Panel */}
              <div
                role="menu"
                data-testid="hamburger-dropdown-menu"
                className="animate-fade-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  zIndex: 2003,
                  width: '280px',
                  maxWidth: 'calc(100vw - 32px)',
                  background: theme === 'dark' ? 'rgba(22, 27, 39, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {/* Theme Toggle Item */}
                <button
                  type="button"
                  role="menuitem"
                  data-testid="btn-toggle-theme"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  onClick={onToggleTheme}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    touchAction: 'manipulation',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background:
                          theme === 'dark'
                            ? 'rgba(251, 191, 36, 0.15)'
                            : 'rgba(99, 102, 241, 0.15)',
                        color: theme === 'dark' ? '#fbbf24' : '#6366f1',
                      }}
                    >
                      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Theme</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                {/* Cloud Sync Status & Modal Item */}
                <button
                  type="button"
                  role="menuitem"
                  data-testid="btn-open-sync"
                  aria-label={`Cloud sync status: ${syncStatus}`}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSync?.();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    touchAction: 'manipulation',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background:
                          syncStatus === 'synced'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : syncStatus === 'syncing'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'var(--bg-elevated)',
                        color:
                          syncStatus === 'synced'
                            ? '#10b981'
                            : syncStatus === 'syncing'
                            ? '#3b82f6'
                            : 'var(--text-muted)',
                      }}
                    >
                      {syncStatus === 'syncing' ? (
                        <RefreshCw size={17} style={{ animation: 'spin 1.5s linear infinite' }} />
                      ) : syncStatus === 'synced' ? (
                        <Cloud size={17} />
                      ) : (
                        <CloudOff size={17} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Cloud Sync</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {syncStatus === 'synced'
                          ? 'Realtime Synced'
                          : syncStatus === 'syncing'
                          ? 'Syncing changes...'
                          : syncStatus === 'error'
                          ? 'Sync Error'
                          : 'Local / Offline'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background:
                        syncStatus === 'synced'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : syncStatus === 'syncing'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : syncStatus === 'error'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'var(--bg-elevated)',
                      color:
                        syncStatus === 'synced'
                          ? '#10b981'
                          : syncStatus === 'syncing'
                          ? '#3b82f6'
                          : syncStatus === 'error'
                          ? '#ef4444'
                          : 'var(--text-muted)',
                      border: `1px solid ${
                        syncStatus === 'synced'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : syncStatus === 'syncing'
                          ? 'rgba(59, 130, 246, 0.3)'
                          : syncStatus === 'error'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'var(--border-subtle)'
                      }`,
                    }}
                  >
                    {syncStatus.toUpperCase()}
                  </span>
                </button>

                {/* Settings & Data Management Item */}
                <button
                  type="button"
                  role="menuitem"
                  data-testid="btn-open-settings"
                  aria-label="Open settings and data management"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    touchAction: 'manipulation',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <Settings size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Settings & Data</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        CSV Import/Export, Currency
                      </div>
                    </div>
                  </div>
                </button>

                {/* Quick Navigation Items */}
                {(onOpenAccounts || onOpenBudgets || onOpenCategories) && (
                  <div
                    style={{
                      height: '1px',
                      background: 'var(--border-subtle)',
                      margin: '4px 6px',
                    }}
                  />
                )}

                {onOpenAccounts && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="btn-menu-accounts"
                    aria-label="Manage accounts"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAccounts();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      touchAction: 'manipulation',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                      }}
                    >
                      <Wallet size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Accounts</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Manage wallets & cards
                      </div>
                    </div>
                  </button>
                )}

                {onOpenBudgets && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="btn-menu-budgets"
                    aria-label="Budget planner"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenBudgets();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      touchAction: 'manipulation',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                      }}
                    >
                      <Target size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Budgets</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Spending limits & meters
                      </div>
                    </div>
                  </button>
                )}

                {onOpenCategories && (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="btn-menu-categories"
                    aria-label="Manage categories"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCategories();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      touchAction: 'manipulation',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                      }}
                    >
                      <Tags size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Categories</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Customize icons & types
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </>
          )}
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
          width: '100%',
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
                padding: '8px 0',
                minHeight: '34px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
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
