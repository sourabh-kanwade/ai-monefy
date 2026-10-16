import { test, expect } from './fixtures';

test.describe('Seam 4: Period Navigation, Analytics Breakdown & Transaction History', () => {
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

  test('user navigates periods, analyzes spending breakdown, searches and edits/deletes transactions', async ({ page }) => {
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 1. Add Expense 1: Food $60 with note "Organic Grocery"
    const foodCat = page.locator('button', { hasText: 'Food' }).first();
    await foodCat.click();
    await page.locator('button', { hasText: /^6$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('input[placeholder="Add note (optional)..."]').fill('Organic Grocery');
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // 2. Add Expense 2: Transport $25 with note "Subway Pass"
    const transportCat = page.locator('button', { hasText: 'Transport' }).first();
    await transportCat.click();
    await page.locator('button', { hasText: /^2$/ }).click();
    await page.locator('button', { hasText: /^5$/ }).click();
    await page.locator('input[placeholder="Add note (optional)..."]').fill('Subway Pass');
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // 2b. Add Expense 3: Another Food $10 to have multiple contributing transactions in Food
    await foodCat.click();
    await page.locator('button', { hasText: /^1$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('input[placeholder="Add note (optional)..."]').fill('Snack');
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    const balanceAmount = page.locator('[data-testid="center-balance-amount"]');
    await expect(balanceAmount).toHaveText('-$95.00');

    // 3. Test Period Navigation & Intervals in Header
    // Switch to Day interval, step prev and next
    await page.locator('button', { hasText: /^Day$/ }).click();
    await page.locator('button[aria-label="Previous period"]').click();
    await page.locator('button[aria-label="Next period"]').click();

    // Switch to Week interval, step prev and next
    await page.locator('button', { hasText: /^Week$/ }).click();
    await page.locator('button[aria-label="Previous period"]').click();
    await page.locator('button[aria-label="Next period"]').click();

    // Switch to Year interval, step prev and next
    await page.locator('button', { hasText: /^Year$/ }).click();
    await page.locator('button[aria-label="Previous period"]').click();
    await page.locator('button[aria-label="Next period"]').click();

    // Switch to All interval
    await page.locator('button', { hasText: /^All$/ }).click();

    // Switch back to Month interval
    await page.locator('button', { hasText: /^Month$/ }).click();
    await expect(balanceAmount).toHaveText('-$95.00');

    // Navigate to previous month
    await page.locator('button[aria-label="Previous period"]').click();
    // In previous month there are 0 records
    await expect(page.getByText('0 records')).toBeVisible();

    // Navigate back to current month
    await page.locator('button[aria-label="Next period"]').click();
    await expect(page.getByText('3 records')).toBeVisible();

    // 4. Test Analytics View
    await page.locator('button', { hasText: 'Analytics' }).click();
    await expect(page.getByText('Spending Breakdown')).toBeVisible();
    await expect(page.getByText('Total Period Expense')).toBeVisible();

    // Verify ranked category rows exist
    const analyticsRows = page.locator('[data-testid="analytics-category-row"]');
    await expect(analyticsRows).toHaveCount(2);

    // Expand the top row (Food) and verify multiple contributing transactions are sorted
    await analyticsRows.first().click();
    await expect(page.getByText('Contributing Transactions (2)')).toBeVisible();

    // Click a contributing transaction from inside the accordion to edit it
    await page.locator('.glass-panel', { hasText: 'Contributing Transactions' }).getByText('Snack').first().click();
    await expect(page.getByText('Edit Transaction')).toBeVisible();
    // Test close button
    await page.locator('.modal-sheet button[aria-label="Close"]').click();
    await expect(page.getByText('Edit Transaction')).not.toBeVisible();

    // Switch back to Wheel view
    await page.locator('button', { hasText: 'Wheel' }).click();
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 5. Transaction History Sheet: Collapse/Expand and Search filtering
    await expect(page.getByText('3 records')).toBeVisible();

    // Toggle collapse and expand
    await page.locator('button[aria-label="Collapse transactions"]').click();
    await page.locator('button[aria-label="Expand transactions"]').click();

    const searchInput = page.locator('input[placeholder*="Search transactions"]');
    await searchInput.fill('Organic');
    await expect(page.getByText('1 records')).toBeVisible();
    await expect(page.getByText('Organic Grocery')).toBeVisible();
    await expect(page.getByText('Subway Pass')).not.toBeVisible();

    // Clear search
    await page.locator('button[aria-label="Clear search"]').click();
    await expect(page.getByText('3 records')).toBeVisible();

    // 6. Edit Transaction: Click "Organic Grocery"
    await page.locator('.transaction-item', { hasText: 'Organic Grocery' }).click();
    await expect(page.getByText('Edit Transaction')).toBeVisible();

    // Update account and date and amount
    const editAccountSelect = page.locator('select#edit-account');
    if (await editAccountSelect.isVisible()) {
      await editAccountSelect.selectOption({ index: 1 });
    }
    const editDateInput = page.locator('input#edit-date');
    if (await editDateInput.isVisible()) {
      await editDateInput.fill('2026-10-02');
    }

    const amountInput = page.locator('input[aria-label="Amount"]');
    await amountInput.fill('70');
    const noteInput = page.locator('input[aria-label="Note"]');
    await noteInput.fill('Weekly Grocery');

    await page.locator('button', { hasText: 'Save Changes' }).click();
    await expect(page.getByText('Edit Transaction')).not.toBeVisible();

    // Verify updated note
    await expect(page.getByText('Weekly Grocery')).toBeVisible();

    // 7. Delete Transaction directly via trash icon on "Snack" row
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.locator('.transaction-item', { hasText: 'Snack' }).locator('button[title="Delete transaction"]').click();

    // Verify deletion: 2 records left
    await expect(page.getByText('2 records')).toBeVisible();
  });
});
