import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { PlusCircle, MinusCircle, Wallet, Tag, ArrowUpRight, ArrowDownLeft, Sun, Moon } from 'lucide-react';

export const WalkingSkeletonView: React.FC = () => {
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
    deleteTransaction,
  } = useFinance();

  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default account and category if not selected
  const activeCategories = categories.filter((c) => c.type === type);
  const selectedCatId = categoryId || (activeCategories[0]?.id ?? '');
  const selectedAccId = accountId || (accounts[0]?.id ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        amount,
        type,
        categoryId: selectedCatId,
        accountId: selectedAccId,
        note,
        date: new Date().toISOString(),
      });
      setAmountStr('');
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryName = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || 'General';
  };

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Default';
  };

  return (
    <div className="app-container" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
            AI Monefy v1.0
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>Personal Finance</h1>
        </div>
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
          id="btn-theme-toggle"
        >
          {theme === 'dark' ? <Sun size={20} color="#FFE66D" /> : <Moon size={20} color="#38bdf8" />}
        </button>
      </header>

      {/* Center Net Balance Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          textAlign: 'center',
          background: netBalance >= 0
            ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(22, 27, 39, 0.8) 100%)'
            : 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(22, 27, 39, 0.8) 100%)',
          border: `1px solid ${netBalance >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.05em' }}>
          TOTAL BALANCE
        </span>
        <div
          id="net-balance-display"
          className="font-num"
          style={{
            fontSize: '38px',
            fontWeight: 800,
            color: netBalance >= 0 ? 'var(--color-surplus)' : 'var(--color-deficit)',
            marginTop: '4px',
            textShadow: netBalance >= 0 ? '0 0 20px var(--color-surplus-glow)' : '0 0 20px var(--color-deficit-glow)',
          }}
        >
          {currency}{Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {netBalance < 0 && <span style={{ fontSize: '20px', marginLeft: '4px' }}>-</span>}
        </div>

        {/* Income & Expense Subtotals */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', padding: '6px' }}>
              <ArrowDownLeft size={16} color="var(--color-surplus)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Income</div>
              <div className="font-num" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-surplus)' }}>
                +{currency}{totalIncome.toFixed(2)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderRadius: '50%', padding: '6px' }}>
              <ArrowUpRight size={16} color="var(--color-deficit)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expense</div>
              <div className="font-num" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-deficit)' }}>
                -{currency}{totalExpense.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Entry Form (Walking Skeleton) */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Quick Log Transaction</h3>

        {/* Type Toggle: Expense / Income */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setType('expense')}
            id="btn-select-expense"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: type === 'expense' ? 'var(--color-deficit)' : 'transparent',
              color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <MinusCircle size={16} /> Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            id="btn-select-income"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: type === 'income' ? 'var(--color-surplus)' : 'transparent',
              color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <PlusCircle size={16} /> Income
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="input-tx-amount" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            Amount ({currency})
          </label>
          <input
            id="input-tx-amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '22px',
              fontWeight: 700,
              fontFamily: 'var(--font-display)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Category & Account Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label htmlFor="select-tx-category" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={13} /> Category
            </label>
            <select
              id="select-tx-category"
              value={selectedCatId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="select-tx-account" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wallet size={13} /> Account
            </label>
            <select
              id="select-tx-account"
              value={selectedAccId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Note input */}
        <div>
          <label htmlFor="input-tx-note" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
            Note (Optional)
          </label>
          <input
            id="input-tx-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Lunch with team, Groceries, Fuel"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          id="btn-save-transaction"
          disabled={isSubmitting}
          className={type === 'expense' ? 'btn-danger' : 'btn-primary'}
          style={{ width: '100%', padding: '14px', marginTop: '6px' }}
        >
          {type === 'expense' ? `Save Expense (${currency}${amountStr || '0.00'})` : `Save Income (${currency}${amountStr || '0.00'})`}
        </button>
      </form>

      {/* Transaction History Section */}
      <section className="glass-panel" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Transactions</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <Wallet size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: '14px' }}>No transactions recorded yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Log your first expense or income above!</p>
          </div>
        ) : (
          <div id="transaction-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transactions.map((tx) => {
              const isExp = tx.type === 'expense';
              return (
                <div
                  key={tx.id}
                  className="transaction-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isExp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isExp ? 'var(--color-deficit)' : 'var(--color-surplus)',
                      }}
                    >
                      {isExp ? <MinusCircle size={20} /> : <PlusCircle size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {getCategoryName(tx.categoryId)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <span>{getAccountName(tx.accountId)}</span>
                        {tx.note && <span>• {tx.note}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div
                        className="font-num"
                        style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          color: isExp ? 'var(--color-deficit)' : 'var(--color-surplus)',
                        }}
                      >
                        {isExp ? '-' : '+'}{currency}{tx.amount.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      title="Delete transaction"
                      aria-label="Delete transaction"
                      style={{
                        color: 'var(--text-muted)',
                        padding: '4px',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
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
    </div>
  );
};
