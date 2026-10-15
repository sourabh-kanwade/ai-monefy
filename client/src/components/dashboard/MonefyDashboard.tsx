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
import type { Category, TransactionType } from '../../types';
import {
  Wallet,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

export const MonefyDashboard: React.FC = () => {
  const {
    periodTransactions,
    categories,
    accounts,
    accountBalances,
    totalBalance,
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
    deleteTransaction,
    selectedAccountId,
    setSelectedAccountId,
  } = useFinance();

  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
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

  const getCategoryName = (catId: string) => categories.find((c) => c.id === catId)?.name || 'General';
  const getAccountName = (accId: string) => accounts.find((a) => a.id === accId)?.name || 'Default';

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

      {/* Radial Category Grid Section */}
      <RadialCategoryGrid
        categories={categories}
        categoryExpenses={categoryExpenses}
        currency={currency}
        onCategoryTap={(cat) => handleOpenExpenseKeypad(cat)}
        onOpenCustomizer={() => setIsCustomizerOpen(true)}
      />

      {/* Recent Transactions Section */}
      <section className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Transactions</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{periodTransactions.length} records</span>
        </div>

        {periodTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
            <Wallet size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ fontSize: '13px' }}>No transactions recorded for this period.</p>
          </div>
        ) : (
          <div id="transaction-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {periodTransactions.slice(0, 15).map((tx) => {
              const isExp = tx.type === 'expense';
              return (
                <div
                  key={tx.id}
                  className="transaction-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isExp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isExp ? 'var(--color-deficit)' : 'var(--color-surplus)',
                      }}
                    >
                      {isExp ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                        {getCategoryName(tx.categoryId)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                        <span>{getAccountName(tx.accountId)}</span>
                        {tx.note && <span>• {tx.note}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div
                        className="font-num"
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color: isExp ? 'var(--color-deficit)' : 'var(--color-surplus)',
                        }}
                      >
                        {isExp ? '-' : '+'}{currency}{tx.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      title="Delete transaction"
                      aria-label="Delete transaction"
                      style={{ color: 'var(--text-muted)', padding: '2px 4px', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
    </div>
  );
};
