import { test as baseTest, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const test = baseTest.extend<{}>({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    try {
      const coverage = await page.evaluate(() => (window as any).__coverage__);
      if (coverage) {
        const nycOutputDir = path.resolve(process.cwd(), '.nyc_output');
        if (!fs.existsSync(nycOutputDir)) {
          fs.mkdirSync(nycOutputDir, { recursive: true });
        }
        const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-_]/g, '_');
        const filename = `coverage-${testInfo.testId}-${safeTitle}.json`;
        fs.writeFileSync(path.join(nycOutputDir, filename), JSON.stringify(coverage));
      }
    } catch {
      // In case the page was closed or navigated away abruptly
    }
  },
});

export { expect };
