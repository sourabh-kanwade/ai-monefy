import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, Wallet } from 'lucide-react';
import type { Account } from '../../types';
import { MONEFY_PALETTE } from '../categories/CategoryIcon';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  accountBalances: Record<string, number>;
  currency?: string;
  onAddAccount: (input: {
    name: string;
    icon: string;
    color: string;
    initialBalance: number;
  }) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  accountBalances,
  currency = '$',
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // New account form state
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newColor, setNewColor] = useState(MONEFY_PALETTE[1]); // Blue by default

  if (!isOpen) return null;

  const activeAccounts = accounts.filter((a) => !a.isDeleted);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Please enter an account name');
      return;
    }
    const initialBal = parseFloat(newBalance) || 0;

    onAddAccount({
      name: newName.trim(),
      icon: 'wallet',
      color: newColor,
      initialBalance: initialBal,
    });

    setNewName('');
    setNewBalance('');
    setIsAdding(false);
  };

  const handleSaveRename = (id: string) => {
    if (!editName.trim()) return;
    onUpdateAccount(id, { name: editName.trim() });
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
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
                background: 'rgba(79, 70, 229, 0.2)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={18} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Manage Accounts</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing Accounts List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeAccounts.map((acc) => {
            const isEditing = editingId === acc.id;
            const bal = accountBalances[acc.id] ?? acc.initialBalance;

            return (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: acc.color,
                      flexShrink: 0,
                    }}
                  />
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        aria-label="Save name"
                        onClick={() => handleSaveRename(acc.id)}
                        style={{ color: 'var(--color-surplus)', padding: '4px' }}
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {acc.name}
                      </div>
                      <div className="font-num" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Current: {currency}{bal.toFixed(2)} (Initial: {currency}{acc.initialBalance.toFixed(2)})
                      </div>
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      aria-label={`Edit ${acc.name}`}
                      onClick={() => {
                        setEditingId(acc.id);
                        setEditName(acc.name);
                      }}
                      style={{ color: 'var(--text-muted)', padding: '4px' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    {activeAccounts.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Archive ${acc.name}`}
                        onClick={() => {
                          if (confirm(`Archive account "${acc.name}"?`)) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                        style={{ color: 'var(--color-deficit)', padding: '4px', opacity: 0.8 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Account Section */}
        {isAdding ? (
          <form
            onSubmit={handleCreateSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>New Account</h4>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                Account Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Crypto Wallet, Checking"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="new-account-balance"
                style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}
              >
                Initial Balance ({currency})
              </label>
              <input
                id="new-account-balance"
                aria-label="Initial Balance"
                type="number"
                step="any"
                placeholder="0.00"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="font-num"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                Color
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {MONEFY_PALETTE.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: c,
                      border: newColor === c ? '2px solid #ffffff' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700 }}
              >
                Add Account
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--color-primary)',
              fontWeight: 600,
              fontSize: '13px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Plus size={16} />
            Add Another Account
          </button>
        )}
      </div>
    </div>
  );
};
