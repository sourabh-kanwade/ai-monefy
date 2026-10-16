import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { getLocalDateString } from '../../utils/dateFilters';
import type { Account } from '../../types';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    amount: number;
    accountId: string;
    toAccountId: string;
    note?: string;
    date: string;
    type: 'transfer';
  }) => void;
  accounts: Account[];
  currency?: string;
  defaultAccountId?: string | null;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  accounts,
  currency = '$',
  defaultAccountId,
}) => {
  const activeAccounts = accounts.filter((a) => !a.isDeleted);
  const initialFrom = defaultAccountId || activeAccounts[0]?.id || '';
  const initialTo = activeAccounts.find((a) => a.id !== initialFrom)?.id || '';

  const todayStr = getLocalDateString();
  const [fromAccountId, setFromAccountId] = useState<string>(initialFrom);
  const [toAccountId, setToAccountId] = useState<string>(initialTo);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => getLocalDateString());

  useEffect(() => {
    if (isOpen) {
      const active = accounts.filter((a) => !a.isDeleted);
      const from = (defaultAccountId && active.some(a => a.id === defaultAccountId)) ? defaultAccountId : (active[0]?.id || '');
      const to = active.find((a) => a.id !== from)?.id || '';
      setFromAccountId(from);
      setToAccountId(to);
      setAmount('');
      setNote('');
      setDate(getLocalDateString());
    }
  }, [isOpen, defaultAccountId, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      alert('Source and destination accounts must be different');
      return;
    }

    onSave({
      amount: parsedAmount,
      accountId: fromAccountId,
      toAccountId,
      note: note.trim() || undefined,
      date: new Date(date).toISOString(),
      type: 'transfer',
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '440px',
          background: 'var(--bg-secondary)',
          padding: '16px 20px',
          gap: '16px',
        }}
      >
        <div className="modal-drag-handle" />
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowRightLeft size={18} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Transfer Between Accounts</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Amount Input */}
          <div>
            <label
              htmlFor="transfer-amount"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Transfer Amount ({currency})
            </label>
            <input
              id="transfer-amount"
              aria-label="Transfer Amount"
              type="number"
              step="any"
              required
              min="0.01"
              placeholder="0.00"
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

          {/* Accounts Grid (From -> To) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="from-account-select"
                style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
              >
                From Account
              </label>
              <select
                id="from-account-select"
                aria-label="From Account"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
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
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === toAccountId}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="to-account-select"
                style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
              >
                To Account
              </label>
              <select
                id="to-account-select"
                aria-label="To Account"
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
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
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label
              htmlFor="transfer-date"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Date
            </label>
            <input
              id="transfer-date"
              type="date"
              max={todayStr}
              value={date}
              onChange={(e) => {
                const val = e.target.value;
                setDate(val > todayStr ? todayStr : val);
              }}
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
              htmlFor="transfer-note"
              style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}
            >
              Note (Optional)
            </label>
            <input
              id="transfer-note"
              type="text"
              placeholder="e.g. ATM withdrawal, Card payment"
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

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '15px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <ArrowRightLeft size={16} />
            Confirm Transfer
          </button>
        </form>
      </div>
    </div>
  );
};
