import { test, expect } from './fixtures';

test.describe('Seam 6: Cloud Sync, Authentication & Offline Queue', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend API endpoints
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'jwt-test-token-12345',
          user: {
            id: 'user-cloud-1',
            email: 'jane@example.com',
            name: 'Jane Cloud',
          },
        }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.password === 'wrongpassword') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid email or password' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'jwt-test-token-12345',
            user: {
              id: 'user-cloud-1',
              email: 'jane@example.com',
              name: 'Jane Cloud',
            },
          }),
        });
      }
    });

    await page.route('**/api/sync/push', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.route('**/api/sync/pull*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          serverTime: new Date().toISOString(),
          accounts: [],
          categories: [],
          transactions: [],
          budgets: [],
        }),
      });
    });

    await page.goto('/');
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    });
    await page.reload();
  });

  test('user opens sync modal, registers account with cloud migration, tests manual sync, and logs out', async ({ page }) => {
    await expect(page.locator('[data-testid="center-balance-hub"]')).toBeVisible();

    // 1. Open Cloud Sync Modal via Header Menu
    await page.locator('[data-testid="btn-hamburger-menu"]').click();
    await page.locator('[data-testid="btn-open-sync"]').click();
    await expect(page.getByText('Multi-device synchronization')).toBeVisible();

    // 2. Verify Local Guest Mode message
    await expect(page.getByText('Local Guest Mode')).toBeVisible();

    // 3. Test Failed Login Attempt
    await page.locator('input[placeholder="you@domain.com"]').fill('jane@example.com');
    await page.locator('input[placeholder="Minimum 6 characters"]').fill('wrongpassword');
    await page.locator('[data-testid="btn-submit-auth"]').click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    // 4. Switch to Register Mode
    await page.locator('[data-testid="tab-auth-register"]').click();
    await expect(page.getByText('Create Account & Sync')).toBeVisible();

    await page.locator('input[placeholder="Your name"]').fill('Jane Cloud');
    await page.locator('input[placeholder="you@domain.com"]').fill('jane@example.com');
    await page.locator('input[placeholder="Minimum 6 characters"]').fill('secret123');
    await page.locator('[data-testid="btn-submit-auth"]').click();

    // 5. Verify Connected State
    await expect(page.getByText('Cloud Account Connected')).toBeVisible();
    await expect(page.getByText('Jane Cloud')).toBeVisible();
    await expect(page.getByText('jane@example.com')).toBeVisible();

    // 6. Test Manual Sync Now
    await page.locator('[data-testid="btn-sync-now"]').click();
    await expect(page.getByText('All records synchronized successfully with the cloud!')).toBeVisible();

    // 7. Log Out
    await page.locator('[data-testid="btn-logout-cloud"]').click();
    await expect(page.getByText('Local Guest Mode')).toBeVisible();

    // 8. Test Successful Login Flow
    await page.locator('[data-testid="tab-auth-login"]').click();
    await page.locator('input[placeholder="you@domain.com"]').fill('jane@example.com');
    await page.locator('input[placeholder="Minimum 6 characters"]').fill('secret123');
    await page.locator('[data-testid="btn-submit-auth"]').click();

    await expect(page.getByText('Cloud Account Connected')).toBeVisible();
    await expect(page.getByText('Jane Cloud')).toBeVisible();

    // 9. Log Out again and Close Modal
    await page.locator('[data-testid="btn-logout-cloud"]').click();
    await expect(page.getByText('Local Guest Mode')).toBeVisible();

    await page.locator('[data-testid="btn-close-cloud-sync"]').click();
    await expect(page.getByText('Multi-device synchronization')).not.toBeVisible();
  });
});
