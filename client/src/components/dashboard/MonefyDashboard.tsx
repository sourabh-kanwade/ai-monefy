import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { CircularChart } from '../monefy-wheel/CircularChart';
import { CenterBalance } from '../monefy-wheel/CenterBalance';
import { RadialCategoryGrid } from '../monefy-wheel/RadialCategoryGrid';
import { CategoryCustomizerModal } from '../categories/CategoryCustomizerModal';
import { NumericKeypadModal } from '../keypad/NumericKeypadModal';
import type { Category, TransactionType } from '../../types';
import {
  Sun,
  Moon,
  Wallet,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

export const MonefyDashboard: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    netBalance,
    totalIncome,
    totalExpense,
    currency,
    theme,
    toggleTheme,
    addTransaction,
    addCategory,
    deleteTransaction,
    selectedAccountId,
  } = useFinance();

  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [keypadType, setKeypadType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Compute category expense breakdown for the donut chart
  const categoryExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    for (const tx of transactions) {
      if (selectedAccountId && tx.accountId !== selectedAccountId && tx.toAccountId !== selectedAccountId) {
        continue;
      }
      if (tx.type === 'expense') {
        expenses[tx.categoryId] = (expenses[tx.categoryId] || 0) + tx.amount;
      }
    }
    return expenses;
  }, [transactions, selectedAccountId]);

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
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 4px',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', fontWeight: 700 }}>
            AI Monefy
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Overview</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={toggleTheme}
            className="btn-icon"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
            id="btn-theme-toggle"
          >
            {theme === 'dark' ? <Sun size={18} color="#FFE66D" /> : <Moon size={18} color="#38bdf8" />}
          </button>
        </div>
      </header>

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
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-muted)' }}>
            <Wallet size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
            <p style={{ fontSize: '13px' }}>No transactions recorded yet.</p>
          </div>
        ) : (
          <div id="transaction-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.slice(0, 15).map((tx) => {
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
    </div>
  );
};
