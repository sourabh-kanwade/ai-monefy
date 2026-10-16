import { test, expect } from './fixtures';
import * as path from 'path';

test.describe('Seam 5: Header Menu, Settings, Custom Categories & CSV Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('user toggles theme, customizes currency, manages category order/visibility, creates custom category, and exports/imports CSV', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 1. Open Hamburger Menu
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    const menu = page.locator('[data-testid="hamburger-dropdown-menu"]');
    await expect(menu).toBeVisible();

    // 2. Toggle Theme (Dark <-> Light)
    const toggleThemeBtn = page.locator('[data-testid="btn-toggle-theme"]');
    await toggleThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Toggle back to Dark
    await toggleThemeBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // 3. Open Settings Modal
    await page.locator('[data-testid="btn-open-settings"]').click();
    await expect(page.getByText('Settings & Data')).toBeVisible();

    // 4. Change Currency to Euro (€)
    await page.locator('[data-testid="currency-btn-€"]').click();
    // Close Settings to verify currency updated on dashboard
    await page.locator('[data-testid="btn-close-settings"]').click();
    await expect(page.locator('[data-testid="center-balance-amount"]')).toHaveText('€0.00');

    // Reopen Settings
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-open-settings"]').click();
    await expect(page.getByText('Settings & Data')).toBeVisible();

    // 5. Category Visibility & Reordering
    // Toggle visibility of Food category off
    const foodToggle = page.locator('input[aria-label="Toggle visibility of Food"]');
    await expect(foodToggle).toBeChecked();
    await foodToggle.click();
    await expect(foodToggle).not.toBeChecked();

    // Reorder: Move Transport down, then move it up
    const transportMoveDown = page.locator('button[aria-label="Move Transport down"]');
    await transportMoveDown.click();
    const transportMoveUp = page.locator('button[aria-label="Move Transport up"]');
    if (await transportMoveUp.isVisible()) {
      await transportMoveUp.click();
    }

    // 6. Create Custom Category via CategoryCustomizerModal
    await page.locator('[data-testid="btn-add-category-settings"]').click();
    await expect(page.getByText('Create Custom Category')).toBeVisible();

    // 6a. Test empty title alert validation
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('enter a category title');
      await dialog.accept();
    });
    await page.locator('button', { hasText: 'Save Category' }).click();

    // 6b. Toggle type to Income and back to Expense
    await page.locator('.modal-sheet button', { hasText: 'Income' }).click();
    await page.locator('.modal-sheet button', { hasText: 'Expense' }).click();

    // 6c. Select a color from palette
    const paletteBtns = page.locator(
      '.modal-sheet button[type="button"][style*="border-radius: 50%"]'
    );
    if ((await paletteBtns.count()) > 0) {
      await paletteBtns.first().click();
    }

    await page.locator('input[aria-label="Category Name"]').fill('Gaming');
    // Select Coffee icon
    await page.locator('button[aria-label="Select Coffee icon"]').click();
    // Submit
    await page.locator('button', { hasText: 'Save Category' }).click();
    await expect(page.getByText('Create Custom Category')).not.toBeVisible();

    // Verify "Gaming" is now listed in SettingsModal categories
    await expect(page.getByText('Gaming')).toBeVisible();

    // Close Settings modal to record a transaction
    await page.locator('[data-testid="btn-close-settings"]').click();

    // Add a quick expense for Gaming so transactions exist for export
    await page.locator('[data-testid="btn-quick-expense"]').click();
    await page.locator('button', { hasText: /^3$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('input[placeholder="Add note (optional)..."]').fill('Steam game');
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // Reopen settings
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-open-settings"]').click();

    // 7. CSV Export & JSON Backup (with transactions present)
    await page.locator('[data-testid="btn-export-csv"]').click();
    await expect(page.getByText(/Exported \d+ transactions as .* in Monefy format!/)).toBeVisible();

    await page.locator('[data-testid="btn-backup-json"]').click();
    await expect(page.getByText('Full JSON backup created and downloaded!')).toBeVisible();

    // Test import CSV trigger button click
    const triggerCsvBtn = page.locator('[data-testid="btn-trigger-import-csv"]');
    if (await triggerCsvBtn.isVisible()) {
      await triggerCsvBtn.click();
    }

    // 8. Import CSV Data
    const csvFilePath = path.resolve(process.cwd(), '../Monefy.Data.15-10-26.csv');
    await page.locator('[data-testid="input-import-csv"]').setInputFiles(csvFilePath);

    // Verify import success message
    await expect(page.getByText(/Successfully imported \d+ transactions/)).toBeVisible();

    // 9. Switch to Income Categories tab
    await page.locator('[data-testid="tab-categories-income"]').click();
    await expect(page.getByText('Salary')).toBeVisible();

    // 10. Test JSON Restore
    const backupJson = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: [
        {
          id: 'acc-restored',
          name: 'Restored Vault',
          icon: 'Wallet',
          color: '#10B981',
          initialBalance: 1200,
          isDefault: true,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      categories: [
        {
          id: 'cat-restored',
          name: 'Restored Groceries',
          icon: 'ShoppingCart',
          color: '#FF6B6B',
          type: 'expense',
          isDefault: true,
          isDeleted: false,
          displayOrder: 0,
          isVisible: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      transactions: [],
      budgets: [],
    });
    await page.locator('[data-testid="input-restore-file"]').setInputFiles({
      name: 'monefy-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupJson),
    });
    // Close Settings modal
    await page.locator('[data-testid="btn-close-settings"]').click();
    await expect(page.locator('[data-testid="btn-close-settings"]')).not.toBeVisible();

    // Verify restored data appears on dashboard
    await expect(page.getByText('Restored Vault')).toBeVisible();
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 11. Test Header Menu Quick Shortcuts
    // Open Accounts via menu
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-menu-accounts"]').click();
    await expect(page.getByText('Manage Accounts')).toBeVisible();
    await page.locator('.modal-sheet button[aria-label="Close"]').click();

    // Open Budgets via menu
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-menu-budgets"]').click();
    await expect(page.getByText('Category Budgets')).toBeVisible();
    await page.locator('.modal-sheet button[aria-label="Close"]').click();

    // Open Categories via menu
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-menu-categories"]').click();
    await expect(page.getByText('Settings & Data')).toBeVisible();
    await page.locator('[data-testid="btn-close-settings"]').click();
  });
});
