import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryCustomizerModal } from '../components/categories/CategoryCustomizerModal';
import { AVAILABLE_ICONS, MONEFY_PALETTE } from '../components/categories/CategoryIcon';

describe('CategoryCustomizerModal Seam Tests', () => {
  it('creates a custom category with title, icon, and color', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <CategoryCustomizerModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // Enter name
    const nameInput = screen.getByPlaceholderText(/Category Name/i);
    fireEvent.change(nameInput, { target: { value: 'Gaming' } });

    // Choose type
    const expenseBtn = screen.getByRole('button', { name: /Expense/i });
    fireEvent.click(expenseBtn);

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /Save Category/i });
    fireEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Gaming',
        type: 'expense',
      })
    );
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders visible icons for non-selected category icon options', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    render(
      <CategoryCustomizerModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    // First icon (AVAILABLE_ICONS[0] = 'Utensils') is selected by default
    const defaultSelectedIcon = AVAILABLE_ICONS[0];
    const defaultColor = MONEFY_PALETTE[0];

    const selectedBtn = screen.getByRole('button', { name: `Select ${defaultSelectedIcon} icon` });
    const selectedSvg = selectedBtn.querySelector('svg');
    expect(selectedSvg).toBeInTheDocument();
    expect(selectedSvg?.getAttribute('stroke')).toBe(defaultColor);

    // All other icons must be visible and have stroke="currentColor" instead of "inherit"
    // stroke="inherit" in SVG inherits from parent button's stroke (which is "none"), rendering icons invisible
    const nonSelectedIcons = AVAILABLE_ICONS.slice(1);
    expect(nonSelectedIcons.length).toBe(23);

    nonSelectedIcons.forEach((iconName) => {
      const btn = screen.getByRole('button', { name: `Select ${iconName} icon` });
      const svg = btn.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.getAttribute('stroke')).toBe('currentColor');
      expect(svg?.getAttribute('stroke')).not.toBe('inherit');
      expect(svg?.getAttribute('stroke')).not.toBe('none');
    });

    // Selecting a different icon updates strokes accordingly
    const newSelectedIcon = AVAILABLE_ICONS[1]; // 'Car'
    const newSelectedBtn = screen.getByRole('button', { name: `Select ${newSelectedIcon} icon` });
    fireEvent.click(newSelectedBtn);

    // Now 'Car' is selected and has the theme color stroke
    const updatedNewSelectedSvg = newSelectedBtn.querySelector('svg');
    expect(updatedNewSelectedSvg?.getAttribute('stroke')).toBe(defaultColor);

    // The previously selected icon ('Utensils') now reverts to 'currentColor'
    const prevSelectedSvg = selectedBtn.querySelector('svg');
    expect(prevSelectedSvg?.getAttribute('stroke')).toBe('currentColor');
  });
});
