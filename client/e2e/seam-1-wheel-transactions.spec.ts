import { test, expect } from './fixtures';

test.describe('Seam 1: Transaction Lifecycle & Monefy Wheel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear indexedDB to ensure deterministic fresh start for this test
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('user records expense and income through center balance hub and keypad', async ({ page }) => {
    // Wait for core UI hub to mount
    const balanceHub = page.locator('[data-testid="center-balance-hub"]');
    await expect(balanceHub).toBeVisible();

    const balanceAmount = page.locator('[data-testid="center-balance-amount"]');
    await expect(balanceAmount).toHaveText('$0.00');

    // 1. Record an Expense of $45 using quick expense button
    await page.locator('[data-testid="btn-quick-expense"]').click();

    // Verify keypad modal is open
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).toBeVisible();

    // Enter arithmetic expression: 40 + 5
    await page.locator('button', { hasText: /^4$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('button', { hasText: /^\+$/ }).click();
    await page.locator('button', { hasText: /^5$/ }).click();

    // Check calculator subtotal evaluates to 45.00
    await expect(page.locator('[data-testid="calculator-subtotal"]')).toHaveText('=$45.00');

    // Add a note
    await page.locator('input[placeholder="Add note (optional)..."]').fill('Team lunch');

    // Confirm transaction
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // Verify balance shows -$45.00 with deficit indicator
    await expect(balanceAmount).toHaveText('-$45.00');
    await expect(balanceHub).toHaveAttribute('data-state', 'deficit');

    // 2. Record an Income of $100 using quick income button
    await page.locator('[data-testid="btn-quick-income"]').click();
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).toBeVisible();

    await page.locator('button', { hasText: /^1$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).first().click();
    await page.locator('button', { hasText: /^0$/ }).first().click();

    await expect(page.locator('[data-testid="calculator-subtotal"]')).toHaveText('=$100.00');
    await page.locator('[data-testid="btn-keypad-confirm"]').click();

    // Verify net balance: $100 - $45 = $55.00 with surplus indicator
    await expect(balanceAmount).toHaveText('$55.00');
    await expect(balanceHub).toHaveAttribute('data-state', 'surplus');

    // 3. Record an expense directly by tapping a radial category grid item
    const billsCategory = page.locator('[data-testid^="radial-category-"]').first();
    await expect(billsCategory).toBeVisible();
    await billsCategory.click();

    // Keypad opens: test backspace, decimal, operators and close
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).toBeVisible();
    await page.locator('button', { hasText: /^9$/ }).click();
    await page.locator('button', { hasText: /^9$/ }).click();
    // Backspace
    await page.locator('button[aria-label="Backspace"]').click();
    // Multiply by 2.5
    await page.locator('button', { hasText: /^\*$/ }).click();
    await page.locator('button', { hasText: /^2$/ }).click();
    await page.locator('button', { hasText: /^\.$/ }).click();
    await page.locator('button', { hasText: /^5$/ }).click();

    // Close keypad without saving
    await page.locator('button[aria-label="Close keypad"]').click();
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).not.toBeVisible();

    // 4. Click the wheel slice to open keypad with pre-selected category
    const chartSlice = page.locator('[data-testid^="slice-"]').first();
    await expect(chartSlice).toBeVisible();
    await chartSlice.dispatchEvent('click');
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).toBeVisible();

    // Enter 20 / 2 = 10
    await page.locator('button', { hasText: /^2$/ }).click();
    await page.locator('button', { hasText: /^0$/ }).click();
    await page.locator('button', { hasText: /^\/$/ }).click();
    await page.locator('button', { hasText: /^2$/ }).click();

    // Change account in keypad selector
    const accountSelect = page.locator('.modal-sheet select');
    await accountSelect.selectOption({ index: 1 });

    // Change date in keypad selector
    const dateInput = page.locator('.modal-sheet input[type="date"]');
    await dateInput.fill('2026-10-01');

    await page.locator('[data-testid="btn-keypad-confirm"]').click();
    await expect(page.locator('[data-testid="btn-keypad-confirm"]')).not.toBeVisible();

    // Balance should now be $55 - $10 = $45.00
    await expect(balanceAmount).toHaveText('$45.00');
  });
});
