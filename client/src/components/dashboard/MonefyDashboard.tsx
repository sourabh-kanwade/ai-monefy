import React, { useState, useMemo } from 'react';
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
import type { Category, Transaction, TransactionType } from '../../types';

export const MonefyDashboard: React.FC = () => {
  const {
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
    theme,
    toggleTheme,
    interval,
    setInterval,
    periodLabel,
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
  } = useFinance();

  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [keypadType, setKeypadType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

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
    <div className="app-container" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Period Navigation Header */}
      <Header
        currentInterval={interval}
        periodLabel={periodLabel}
        theme={theme}
        onIntervalChange={setInterval}
        onStepPrev={stepPrevPeriod}
        onStepNext={stepNextPeriod}
        onToggleTheme={toggleTheme}
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

      {/* Signature Monefy Donut Wheel Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(22, 27, 39, 0.85) 0%, rgba(14, 18, 27, 0.95) 100%)',
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
    </div>
  );
};
