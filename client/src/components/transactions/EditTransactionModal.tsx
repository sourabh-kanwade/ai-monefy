import React, { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import type { Transaction, Category, Account, TransactionType } from '../../types';

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  accounts: Account[];
  currency?: string;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  categories,
  accounts,
  currency = '$',
  onClose,
  onSave,
  onDelete,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId);
      setToAccountId(transaction.toAccountId || '');
      setNote(transaction.note || '');
      setDate(transaction.date ? transaction.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const activeCategories = categories.filter((c) => !c.isDeleted);
  const activeAccounts = accounts.filter((a) => !a.isDeleted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    onSave(transaction.id, {
      amount: parsedAmount,
      type,
      categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : null,
      note: note.trim() || undefined,
      date: new Date(date).toISOString(),
    });

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(5, 8, 14, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Edit Transaction</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Amount Input */}
          <div>
            <label
              htmlFor="edit-amount"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Amount ({currency})
            </label>
            <input
              id="edit-amount"
              aria-label="Amount"
              type="number"
              step="any"
              required
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-num"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '20px',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          </div>

          {/* Type Toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              gap: '4px',
            }}
          >
            {(['expense', 'income', 'transfer'] as const).map((t) => {
              const isActive = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'capitalize',
                    background: isActive
                      ? t === 'expense'
                        ? 'var(--color-deficit)'
                        : t === 'income'
                        ? 'var(--color-surplus)'
                        : '#3B82F6'
                      : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Category & Account Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="edit-category"
                style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
              >
                Category
              </label>
              <select
                id="edit-category"
                aria-label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
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
              <label
                htmlFor="edit-account"
                style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
              >
                Account
              </label>
              <select
                id="edit-account"
                aria-label="Account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="edit-date"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Date
            </label>
            <input
              id="edit-date"
              aria-label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Note Input */}
          <div>
            <label
              htmlFor="edit-note"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Note
            </label>
            <input
              id="edit-note"
              aria-label="Note"
              type="text"
              placeholder="e.g. Grocery, Lunch, Coffee"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Buttons: Save & Delete */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              Save Changes
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this transaction?')) {
                  onDelete(transaction.id);
                  onClose();
                }
              }}
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-deficit)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
