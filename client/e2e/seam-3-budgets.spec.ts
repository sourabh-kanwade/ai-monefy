import { test, expect } from './fixtures';

test.describe('Seam 3: Category Budgets & Warnings', () => {
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

  test('user sets, tracks, exceeds, and removes category budgets', async ({ page }) => {
    // Wait for App to mount
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 1. Open Category Budgets modal
    await page.locator('[data-testid="btn-open-budgets"]').click();
    await expect(page.getByText('Category Budgets')).toBeVisible();

    // 2. Set monthly budget of $50 on Food
    await page.locator('button[aria-label="Set budget for Food"]').click();

    // 2a. Test invalid limit alert
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('valid monthly limit');
      await dialog.accept();
    });
    await page.locator('button[aria-label="Save Budget"]').click();

    // 2b. Test Cancel button
    await page.locator('.modal-sheet button', { hasText: 'Cancel' }).click();

    // Re-open and set valid $50 budget
    await page.locator('button[aria-label="Set budget for Food"]').click();
    await page.locator('input[placeholder="Enter monthly limit"]').fill('50');
    await page.locator('button[aria-label="Save Budget"]').click();

    // Verify progress meter shows normal state (0 / $50)
    const foodMeter = page.locator('[data-budget-state]').first();
    await expect(foodMeter).toBeVisible();
    await expect(foodMeter).toHaveAttribute('data-budget-state', 'normal');

    // Close Budget Modal
    await page.locator('.modal-sheet button[aria-label="Close"]').click();
    await expect(page.getByText('Category Budgets')).not.toBeVisible();

    // 3. Spend $40 on Food to trigger warning state (40/50 = 80% >= 70%)
    const foodBtn = page.locator('button', { hasText: 'Food' }).first();
    await foodBtn.click();

    await page.locator('button', { hasText: /^4$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // Reopen Budgets modal to inspect warning state
    await page.locator('[data-testid="btn-open-budgets"]').click();
    await expect(page.getByText('Category Budgets')).toBeVisible();
    await expect(foodMeter).toHaveAttribute('data-budget-state', 'warning');

    // Close Budget Modal
    await page.locator('.modal-sheet button[aria-label="Close"]').click();
    await expect(page.getByText('Category Budgets')).not.toBeVisible();

    // 4. Spend another $20 on Food to exceed the limit (total $60 > $50)
    await foodBtn.click();
    await page.locator('button', { hasText: /^2$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // In the radial category grid, verify over-budget indicator dot appears on Food
    const overBudgetDot = page.locator('[data-testid^="over-budget-"]').first();
    await expect(overBudgetDot).toBeVisible();

    // Reopen Budgets modal to verify exceeded state
    await page.locator('[data-testid="btn-open-budgets"]').click();
    await expect(page.getByText('Category Budgets')).toBeVisible();
    await expect(foodMeter).toHaveAttribute('data-budget-state', 'exceeded');

    // 4b. Update the existing budget limit to $100 (tests updating existing budget in database)
    await page.locator('button[aria-label="Edit budget for Food"]').click();
    await page.locator('input[placeholder="Enter monthly limit"]').fill('100');
    await page.locator('button[aria-label="Save Budget"]').click();
    await expect(foodMeter).toHaveAttribute('data-budget-state', 'normal');

    // 5. Remove the budget
    await page.locator('button[aria-label="Remove budget for Food"]').click();

    // Close Budget Modal
    await page.locator('.modal-sheet button[aria-label="Close"]').click();
    await expect(page.getByText('Category Budgets')).not.toBeVisible();

    // Verify over-budget dot is gone
    await expect(overBudgetDot).not.toBeVisible();
  });
});
