import React, { useState, useMemo, useEffect } from 'react';
import { syncNativeStatusBar, registerBackButtonHandler } from '../../utils/nativePlatform';
import { useFinance } from '../../context/FinanceContext';
import { CircularChart } from '../monefy-wheel/CircularChart';
import { CenterBalance } from '../monefy-wheel/CenterBalance';
import { RadialCategoryGrid } from '../monefy-wheel/RadialCategoryGrid';
import { CategoryCustomizerModal } from '../categories/CategoryCustomizerModal';
import { NumericKeypadModal } from '../keypad/NumericKeypadModal';
import { Header } from '../layout/Header';
import { AccountBar } from '../accounts/AccountBar';
import { TransferModal } from '../accounts/TransferModal';
import { AccountManagerModal } from '../accounts/AccountManagerModal';
import { TransactionHistorySheet } from '../transactions/TransactionHistorySheet';
import { EditTransactionModal } from '../transactions/EditTransactionModal';
import { BudgetModal } from '../budgets/BudgetModal';
import { ExpenseBreakdownView } from '../analytics/ExpenseBreakdownView';
import { SettingsModal } from '../settings/SettingsModal';
import { CloudSyncModal } from '../sync/CloudSyncModal';
import { syncEngine, type AuthUser } from '../../db/syncEngine';
import { importDatabaseFromJSON, importTransactionsFromCSV } from '../../utils/exportImport';
import { PieChart, BarChart3 } from 'lucide-react';
import type { Category, Transaction, TransactionType } from '../../types';

export const MonefyDashboard: React.FC = () => {
  const {
    transactions,
    periodTransactions,
    categories,
    accounts,
    accountBalances,
    totalBalance,
    budgets,
    categoryBudgets,
    netBalance,
    totalIncome,
    totalExpense,
    currency,
    setCurrency,
    theme,
    toggleTheme,
    interval,
    setInterval,
    periodLabel,
    canStepNext,
    stepPrevPeriod,
    stepNextPeriod,
    addTransaction,
    addCategory,
    addAccount,
    updateAccount,
    deleteAccount,
    updateTransaction,
    deleteTransaction,
    setBudget,
    removeBudget,
    selectedAccountId,
    setSelectedAccountId,
    refreshData,
    dbInstance,
  } = useFinance();

  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => syncEngine.getAuthUser());
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>(() =>
    syncEngine.getAuthToken() ? 'synced' : 'offline'
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() =>
    syncEngine.getLastSyncTime()
  );
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [keypadType, setKeypadType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [viewMode, setViewMode] = useState<'wheel' | 'analytics'>('wheel');

  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    const res = await syncEngine.sync(dbInstance);
    if (res.status === 'success') {
      setSyncStatus('synced');
      setLastSyncTime(syncEngine.getLastSyncTime());
      await refreshData();
    } else {
      setSyncStatus('error');
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    setSyncStatus('syncing');
    const user = await syncEngine.login(email, pass, dbInstance);
    setAuthUser(user);
    setSyncStatus('synced');
    setLastSyncTime(syncEngine.getLastSyncTime());
    await refreshData();
  };

  const handleRegister = async (email: string, pass: string, name?: string) => {
    setSyncStatus('syncing');
    const user = await syncEngine.register(email, pass, name, dbInstance);
    setAuthUser(user);
    setSyncStatus('synced');
    setLastSyncTime(syncEngine.getLastSyncTime());
    await refreshData();
  };

  const handleLogout = () => {
    syncEngine.logout();
    setAuthUser(null);
    setSyncStatus('offline');
    setLastSyncTime(null);
  };

  // Sync native mobile status bar with active theme
  useEffect(() => {
    syncNativeStatusBar(theme);
  }, [theme]);

  // Handle hardware back-button on mobile devices gracefully
  useEffect(() => {
    const unregister = registerBackButtonHandler(() => {
      if (isKeypadOpen) {
        setIsKeypadOpen(false);
        return true;
      }
      if (isCustomizerOpen) {
        setIsCustomizerOpen(false);
        return true;
      }
      if (isTransferOpen) {
        setIsTransferOpen(false);
        return true;
      }
      if (isAccountManagerOpen) {
        setIsAccountManagerOpen(false);
        return true;
      }
      if (isBudgetModalOpen) {
        setIsBudgetModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return true;
      }
      if (editingTransaction) {
        setEditingTransaction(null);
        return true;
      }
      return false;
    });

    return () => unregister();
  }, [
    isKeypadOpen,
    isCustomizerOpen,
    isTransferOpen,
    isAccountManagerOpen,
    isBudgetModalOpen,
    isSettingsOpen,
    isSyncModalOpen,
    editingTransaction,
  ]);

  // Compute category expense breakdown for the donut chart using the current period transactions
  const categoryExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    for (const tx of periodTransactions) {
      if (selectedAccountId && tx.accountId !== selectedAccountId && tx.toAccountId !== selectedAccountId) {
        continue;
      }
      if (tx.type === 'expense') {
        expenses[tx.categoryId] = (expenses[tx.categoryId] || 0) + tx.amount;
      }
    }
    return expenses;
  }, [periodTransactions, selectedAccountId]);

  const handleOpenExpenseKeypad = (category?: Category) => {
    setKeypadType('expense');
    setSelectedCategory(category || categories.find((c) => c.type === 'expense') || null);
    setIsKeypadOpen(true);
  };

  const handleOpenIncomeKeypad = (category?: Category) => {
    setKeypadType('income');
    setSelectedCategory(category || categories.find((c) => c.type === 'income') || null);
    setIsKeypadOpen(true);
  };

  return (
    <div className="app-container">
      {/* Period Navigation Header */}
      <Header
        currentInterval={interval}
        periodLabel={periodLabel}
        theme={theme}
        canStepNext={canStepNext}
        onIntervalChange={setInterval}
        onStepPrev={stepPrevPeriod}
        onStepNext={stepNextPeriod}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        syncStatus={syncStatus}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenAccounts={() => setIsAccountManagerOpen(true)}
        onOpenBudgets={() => setIsBudgetModalOpen(true)}
        onOpenCategories={() => setIsCustomizerOpen(true)}
      />

      {/* Account Breakdown Bar */}
      <AccountBar
        accounts={accounts}
        accountBalances={accountBalances}
        selectedAccountId={selectedAccountId}
        totalBalance={totalBalance}
        currency={currency}
        onSelectAccount={setSelectedAccountId}
        onOpenManager={() => setIsAccountManagerOpen(true)}
      />

      {/* View Switcher: Donut Wheel vs Analytics */}
      <div
        style={{
          display: 'flex',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-full)',
          padding: '3px',
          alignSelf: 'center',
          gap: '4px',
        }}
      >
        <button
          type="button"
          data-testid="tab-wheel"
          onClick={() => setViewMode('wheel')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 700,
            background: viewMode === 'wheel' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'wheel' ? '#FFFFFF' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
            transition: 'all var(--transition-fast)',
          }}
        >
          <PieChart size={15} /> Wheel
        </button>
        <button
          type="button"
          data-testid="tab-analytics"
          onClick={() => setViewMode('analytics')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 700,
            background: viewMode === 'analytics' ? 'var(--color-primary)' : 'transparent',
            color: viewMode === 'analytics' ? '#FFFFFF' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
            transition: 'all var(--transition-fast)',
          }}
        >
          <BarChart3 size={15} /> Analytics
        </button>
      </div>

      {viewMode === 'wheel' ? (
        <>
          {/* Signature Monefy Donut Wheel Card */}
          <div
            className="glass-panel"
            style={{
              padding: 'clamp(14px, 3.5vw, 24px) clamp(10px, 2.5vw, 16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-card)',
              position: 'relative',
            }}
          >
            <CircularChart
              categories={categories}
              categoryExpenses={categoryExpenses}
              totalExpense={totalExpense}
              currency={currency}
              selectedCategoryId={selectedCategory?.id}
              onSelectCategory={(cat) => handleOpenExpenseKeypad(cat)}
            >
              <CenterBalance
                netBalance={netBalance}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                currency={currency}
                onOpenExpenseKeypad={() => handleOpenExpenseKeypad()}
                onOpenIncomeKeypad={() => handleOpenIncomeKeypad()}
                onOpenTransferModal={() => setIsTransferOpen(true)}
              />
            </CircularChart>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Tap slices or +/- to record transactions
            </div>
          </div>

          {/* Radial Category Grid Section with Budgets Trigger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Categories
              </span>
              <button
                type="button"
                data-testid="btn-open-budgets"
                onClick={() => setIsBudgetModalOpen(true)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#F59E0B',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🎯 Monthly Budgets
              </button>
            </div>

            <RadialCategoryGrid
              categories={categories}
              categoryExpenses={categoryExpenses}
              categoryBudgets={categoryBudgets}
              currency={currency}
              onCategoryTap={(cat) => handleOpenExpenseKeypad(cat)}
              onOpenCustomizer={() => setIsCustomizerOpen(true)}
            />
          </div>
        </>
      ) : (
        <ExpenseBreakdownView
          transactions={periodTransactions}
          categories={categories}
          accounts={accounts}
          currency={currency}
          onSelectTransaction={(tx) => setEditingTransaction(tx)}
        />
      )}

      {/* Transaction History Sheet with Real-time Search */}
      <TransactionHistorySheet
        transactions={periodTransactions}
        categories={categories}
        accounts={accounts}
        currency={currency}
        onEditTransaction={(tx) => setEditingTransaction(tx)}
        onDeleteTransaction={async (id) => {
          await deleteTransaction(id);
        }}
      />

      {/* Monefy Calculator Keypad Modal */}
      <NumericKeypadModal
        isOpen={isKeypadOpen}
        onClose={() => setIsKeypadOpen(false)}
        onSave={async (txData) => {
          await addTransaction(txData);
        }}
        initialCategory={selectedCategory}
        accounts={accounts}
        currency={currency}
        type={keypadType as 'expense' | 'income'}
      />

      {/* Category Customizer Modal */}
      <CategoryCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onSave={async (catData) => {
          await addCategory(catData);
        }}
      />

      {/* Account Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        currency={currency}
        defaultAccountId={selectedAccountId}
        onSave={async (transferData) => {
          const generalCat = categories[0]?.id || 'cat-transfer';
          await addTransaction({
            ...transferData,
            categoryId: generalCat,
          });
        }}
      />

      {/* Account Manager Modal */}
      <AccountManagerModal
        isOpen={isAccountManagerOpen}
        onClose={() => setIsAccountManagerOpen(false)}
        accounts={accounts}
        accountBalances={accountBalances}
        currency={currency}
        onAddAccount={async (accData) => {
          await addAccount(accData);
        }}
        onUpdateAccount={async (id, updates) => {
          await updateAccount(id, updates);
        }}
        onDeleteAccount={async (id) => {
          await deleteAccount(id);
        }}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        categories={categories}
        accounts={accounts}
        currency={currency}
        onClose={() => setEditingTransaction(null)}
        onSave={async (id, updates) => {
          await updateTransaction(id, updates);
        }}
        onDelete={async (id) => {
          await deleteTransaction(id);
        }}
      />

      {/* Category Budgets Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        categories={categories}
        budgets={budgets}
        categoryExpenses={categoryExpenses}
        currency={currency}
        onSetBudget={async (catId, limit) => {
          await setBudget(catId, limit);
        }}
        onRemoveBudget={async (catId) => {
          await removeBudget(catId);
        }}
      />

      {/* Settings & Data Management Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currency={currency}
        onSetCurrency={setCurrency}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        db={dbInstance}
        onRestoreDatabase={async (json) => {
          await importDatabaseFromJSON(json, dbInstance);
          await refreshData();
        }}
        onImportCSV={async (csv) => {
          const res = await importTransactionsFromCSV(csv, dbInstance, { skipDuplicates: true });
          if (res.detectedCurrency) {
            const currencyMap: Record<string, string> = {
              INR: '₹',
              USD: '$',
              EUR: '€',
              GBP: '£',
              JPY: '¥',
              CAD: 'CA$',
              AUD: 'AU$',
            };
            const upper = res.detectedCurrency.toUpperCase();
            if (currencyMap[upper]) {
              setCurrency(currencyMap[upper]);
            } else if (['$', '€', '£', '₹', '¥', 'CA$', 'AU$'].includes(res.detectedCurrency)) {
              setCurrency(res.detectedCurrency);
            }
          }
          await refreshData();
          return res;
        }}
      />


      {/* Cloud Sync & Migration Modal */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        user={authUser}
        lastSyncTime={lastSyncTime}
        onSyncNow={handleSyncNow}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
      />
    </div>
  );
};
