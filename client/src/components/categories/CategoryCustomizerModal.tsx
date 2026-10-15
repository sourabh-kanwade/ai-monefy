import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { CategoryIcon, AVAILABLE_ICONS, MONEFY_PALETTE } from './CategoryIcon';
import type { Category } from '../../types';

interface CategoryCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (categoryData: {
    name: string;
    icon: string;
    color: string;
    type: 'expense' | 'income';
  }) => void;
  editingCategory?: Category | null;
}

export const CategoryCustomizerModal: React.FC<CategoryCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCategory,
}) => {
  const [name, setName] = useState(editingCategory?.name || '');
  const [icon, setIcon] = useState(editingCategory?.icon || AVAILABLE_ICONS[0]);
  const [color, setColor] = useState(editingCategory?.color || MONEFY_PALETTE[0]);
  const [type, setType] = useState<'expense' | 'income'>(editingCategory?.type || 'expense');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a category title');
      return;
    }

    onSave({
      name: name.trim(),
      icon,
      color,
      type,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>
            {editingCategory ? 'Edit Category' : 'Create Custom Category'}
          </h3>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Category Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${color}40`,
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: `${color}25`,
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 16px ${color}30`,
              }}
            >
              <CategoryIcon name={icon} size={24} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {name || 'Category Name'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {type} Category
              </div>
            </div>
          </div>

          {/* Type Toggle: Expense / Income */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setType('expense')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '13px',
                background: type === 'expense' ? 'var(--color-deficit)' : 'transparent',
                color: type === 'expense' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '13px',
                background: type === 'income' ? 'var(--color-surplus)' : 'transparent',
                color: type === 'income' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Income
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
              Category Name
            </label>
            <input
              type="text"
              required
              aria-label="Category Name"
              placeholder="Category Name (e.g. Subscriptions, Gaming)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Color Palette Selector */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              Choose Color
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
              {MONEFY_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid #ffffff' : '1px solid rgba(0,0,0,0.2)',
                    boxShadow: color === c ? `0 0 10px ${c}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {color === c && <Check size={14} color="#ffffff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector Grid */}
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
              Choose Icon
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px',
                maxHeight: '140px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    background: icon === iconName ? `${color}30` : 'var(--bg-elevated)',
                    border: `1px solid ${icon === iconName ? color : 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: icon === iconName ? color : 'var(--text-secondary)',
                  }}
                >
                  <CategoryIcon name={iconName} size={20} color={icon === iconName ? color : 'inherit'} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '8px' }}
          >
            Save Category
          </button>
        </form>
      </div>
    </div>
  );
};
