import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryCustomizerModal } from '../components/categories/CategoryCustomizerModal';

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
});
