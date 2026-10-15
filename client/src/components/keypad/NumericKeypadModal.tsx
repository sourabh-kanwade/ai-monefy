import React, { useState, useEffect } from 'react';
import type { Category, Account, TransactionType } from '../../types';
import { evaluateExpression } from '../../utils/calculator';
import { triggerHapticFeedback } from '../../utils/nativePlatform';
import { X, Check, Delete, Calendar, Wallet } from 'lucide-react';

interface NumericKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    accountId: string;
    note?: string;
    date: string;
  }) => void;
  initialCategory?: Category | null;
  accounts: Account[];
  currency?: string;
  type?: 'expense' | 'income';
}

export const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCategory,
  accounts,
  currency = '$',
  type = 'expense',
}) => {
  const [expression, setExpression] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Set default account when accounts change
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
      setSelectedAccountId(defaultAcc.id);
    }
  }, [accounts, selectedAccountId]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setExpression('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentResult = evaluateExpression(expression);

  const handleKeyPress = (val: string) => {
    triggerHapticFeedback();
    if (val === 'backspace') {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (val === 'clear') {
      setExpression('');
      return;
    }

    // Prevent duplicate operators (e.g. "++" or "+*")
    const operators = ['+', '-', '*', '/'];
    if (operators.includes(val)) {
      if (!expression) return; // Cannot start with operator
      const lastChar = expression.trim().slice(-1);
      if (operators.includes(lastChar)) {
        setExpression((prev) => prev.trim().slice(0, -1) + ' ' + val + ' ');
        return;
      }
      setExpression((prev) => prev + ' ' + val + ' ');
      return;
    }

    // Handle decimal point
    if (val === '.') {
      const segments = expression.split(/[\+\-\*\/]/);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment.includes('.')) return; // No multiple decimals in same number
      setExpression((prev) => prev + '.');
      return;
    }

    // Digit entered
    setExpression((prev) => prev + val);
  };

  const handleConfirm = () => {
    const finalAmount = evaluateExpression(expression);
    if (finalAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!initialCategory?.id) {
      alert('Please select a category');
      return;
    }

    triggerHapticFeedback();
    onSave({
      amount: finalAmount,
      type,
      categoryId: initialCategory.id,
      accountId: selectedAccountId || accounts[0]?.id || '',
      note: note.trim() || undefined,
      date: new Date(date).toISOString(),
    });

    onClose();
  };

  const isExpense = type === 'expense';
  const categoryColor = initialCategory?.color || (isExpense ? 'var(--color-deficit)' : 'var(--color-surplus)');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary)',
          maxHeight: '94dvh',
        }}
      >
        <div className="modal-drag-handle" />

        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: categoryColor,
                boxShadow: `0 0 10px ${categoryColor}`,
              }}
            />
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {initialCategory?.name || (isExpense ? 'New Expense' : 'New Income')}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: isExpense ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isExpense ? 'var(--color-deficit)' : 'var(--color-surplus)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {type}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close keypad"
            style={{ color: 'var(--text-muted)', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Display Area (Expression & Result) */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--bg-primary)',
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '80px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="font-num"
            style={{
              fontSize: 'clamp(26px, 7.5vw, 34px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
              minHeight: '36px',
            }}
          >
            {expression || '0'}
          </div>

          <div
            data-testid="calculator-subtotal"
            className="font-num"
            style={{
              fontSize: 'clamp(15px, 4.5vw, 18px)',
              fontWeight: 600,
              color: isExpense ? 'var(--color-deficit)' : 'var(--color-surplus)',
              marginTop: '2px',
            }}
          >
            ={currency}{currentResult.toFixed(2)}
          </div>
        </div>

        {/* Controls: Account, Date, Note */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Account Selector */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0 10px', border: '1px solid var(--border-subtle)', minHeight: '42px' }}>
              <Wallet size={16} color="var(--text-muted)" style={{ marginRight: '6px', flexShrink: 0 }} />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0 10px', border: '1px solid var(--border-subtle)', minHeight: '42px' }}>
              <Calendar size={16} color="var(--text-muted)" style={{ marginRight: '6px', flexShrink: 0 }} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Note Input */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add note (optional)..."
            style={{
              width: '100%',
              padding: '10px 14px',
              minHeight: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>

        {/* Numeric Keypad Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            padding: '12px 18px max(20px, var(--safe-bottom))',
            background: 'var(--bg-secondary)',
          }}
        >
          {['7', '8', '9', '+'].map((key) => renderKey(key, handleKeyPress))}
          {['4', '5', '6', '-'].map((key) => renderKey(key, handleKeyPress))}
          {['1', '2', '3', '*'].map((key) => renderKey(key, handleKeyPress))}
          {['.', '0', 'backspace', '/'].map((key) => renderKey(key, handleKeyPress))}

          {/* Bottom Confirmation Bar */}
          <button
            onClick={handleConfirm}
            data-testid="btn-keypad-confirm"
            aria-label="Confirm transaction"
            className={isExpense ? 'btn-danger' : 'btn-primary'}
            style={{
              gridColumn: 'span 4',
              padding: 'clamp(13px, 2vh, 16px)',
              minHeight: '50px',
              marginTop: '4px',
              fontSize: 'clamp(15px, 4.2vw, 17px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: 'var(--radius-md)',
              touchAction: 'manipulation',
            }}
          >
            <Check size={20} />
            <span>Confirm {currency}{currentResult.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function renderKey(key: string, onKeyPress: (k: string) => void) {
  const isOperator = ['+', '-', '*', '/'].includes(key);
  const isBackspace = key === 'backspace';

  return (
    <button
      key={key}
      type="button"
      onClick={() => onKeyPress(key)}
      aria-label={isBackspace ? 'Backspace' : key}
      style={{
        padding: 'clamp(11px, 2vh, 16px) 0',
        minHeight: '46px',
        borderRadius: 'var(--radius-md)',
        background: isOperator ? 'var(--bg-card-hover)' : 'var(--bg-elevated)',
        color: isOperator ? 'var(--color-accent)' : 'var(--text-primary)',
        fontSize: 'clamp(20px, 5.5vw, 24px)',
        fontWeight: isOperator ? 700 : 600,
        fontFamily: 'var(--font-display)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'manipulation',
        userSelect: 'none',
        transition: 'transform 100ms ease, background 150ms ease',
      }}
    >
      {isBackspace ? <Delete size={22} /> : key}
    </button>
  );
}
