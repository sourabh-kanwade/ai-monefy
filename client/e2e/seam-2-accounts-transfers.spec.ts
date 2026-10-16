import { test, expect } from './fixtures';

test.describe('Seam 2: Multi-Account Management & Transfers', () => {
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

  test('user manages accounts and transfers funds between accounts', async ({ page }) => {
    // Wait for App to mount
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 1. Open Account Manager Modal
    await page.locator('button[aria-label="Manage Accounts"]').click();
    await expect(page.getByText('Manage Accounts')).toBeVisible();

    // 2. Click "Add Another Account"
    await page.locator('button', { hasText: 'Add Another Account' }).click();

    // Fill in Account Name and Initial Balance
    await page.locator('input[placeholder="e.g. Crypto Wallet, Checking"]').fill('Crypto Wallet');
    await page.locator('input[aria-label="Initial Balance"]').fill('500');
    await page.locator('button[type="submit"]', { hasText: 'Add Account' }).click();

    // Verify Crypto Wallet is listed in manager modal
    await expect(page.locator('.modal-sheet').getByText('Crypto Wallet').first()).toBeVisible();
    await expect(page.locator('.modal-sheet').getByText('Current: $500.00')).toBeVisible();

    // Rename Crypto Wallet to Emergency Fund
    await page.locator('button[aria-label="Edit Crypto Wallet"]').click();
    const editNameInput = page.locator('.modal-sheet input[type="text"]').last();
    await editNameInput.fill('Emergency Fund');
    await page.locator('button[aria-label="Save name"]').click();
    await expect(page.locator('.modal-sheet').getByText('Emergency Fund').first()).toBeVisible();

    // Archive Payment Card
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.locator('button[aria-label="Archive Payment Card"]').click();
    await expect(page.locator('.modal-sheet').getByText('Payment Card')).not.toBeVisible();

    // Close Account Manager
    await page.locator('button[aria-label="Close"]').click();
    await expect(page.getByText('Manage Accounts')).not.toBeVisible();

    // Verify Emergency Fund pill is rendered in the AccountBar
    const emergencyPill = page.locator('button', { hasText: 'Emergency Fund' }).first();
    await expect(emergencyPill).toBeVisible();

    // 3. Filter by the new account
    await emergencyPill.click();
    // Re-click "All Accounts"
    await page.locator('button', { hasText: 'All Accounts' }).first().click();

    // 4. Open Transfer Modal
    await page.locator('[data-testid="btn-quick-transfer"]').click();
    await expect(page.getByText('Transfer Between Accounts')).toBeVisible();

    // Enter transfer amount: $75
    await page.locator('input[aria-label="Transfer Amount"]').fill('75');
    await page.locator('input#transfer-note').fill('Move to savings');

    // Submit transfer
    await page.locator('button[type="submit"]', { hasText: 'Confirm Transfer' }).click();
    await expect(page.getByText('Transfer Between Accounts')).not.toBeVisible();

    // Check that Net Balance remains $500.00 because transfer between accounts is neutral
    const balanceAmount = page.locator('[data-testid="center-balance-amount"]');
    await expect(balanceAmount).toHaveText('$500.00');

    // Verify transfer record is visible in the Transaction History Sheet
    await expect(page.getByText('Transfer').first()).toBeVisible();
    await expect(page.getByText('Move to savings')).toBeVisible();
  });
});
