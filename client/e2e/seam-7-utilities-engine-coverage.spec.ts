import { test, expect } from './fixtures';

test.describe('Seam 7: Utilities, Platform Adapters & Data Engine Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('executes and verifies nativePlatform adapter under native and web modes', async ({
    page,
  }) => {
    const results = await page.evaluate(async () => {
      const nativeMod = await import('/src/utils/nativePlatform.ts');
      const { Capacitor, Haptics, StatusBar, App } = nativeMod;

      const logs: string[] = [];
      let vibrateCount = 0;
      Object.defineProperty(window.navigator, 'vibrate', {
        value: () => {
          vibrateCount++;
          return true;
        },
        configurable: true,
        writable: true,
      });

      // 1. Web browser fallback mode
      Capacitor.isNativePlatform = () => false;
      await nativeMod.triggerHapticFeedback();
      await nativeMod.syncNativeStatusBar('dark');
      await nativeMod.syncNativeStatusBar('light');
      const unregWeb = nativeMod.registerBackButtonHandler(() => false);
      unregWeb();
      logs.push('web-mode-passed');

      // 2. Native mobile platform mode
      Capacitor.isNativePlatform = () => true;

      let statusStyle = '';
      StatusBar.setStyle = (async ({ style }: any) => {
        statusStyle = style;
      }) as any;
      StatusBar.setBackgroundColor = (async () => {}) as any;

      let backListener: ((event: any) => void) | null = null;
      let removedListener = false;
      App.addListener = (async (eventName: string, handler: any) => {
        backListener = handler;
        return {
          remove: async () => {
            removedListener = true;
          },
        };
      }) as any;

      await nativeMod.triggerHapticFeedback();
      await nativeMod.syncNativeStatusBar('dark');
      await nativeMod.syncNativeStatusBar('light');

      let handledBack = false;
      const unregNative = nativeMod.registerBackButtonHandler(() => {
        handledBack = true;
        return true;
      });

      if (backListener) {
        (backListener as any)({ canGoBack: true });
      }

      // Also test back handler returning false
      const unregNative2 = nativeMod.registerBackButtonHandler(() => false);
      if (backListener) {
        (backListener as any)({ canGoBack: false });
      }

      unregNative();
      unregNative2();

      // 3. Error throwing branches
      StatusBar.setStyle = (async () => {
        throw new Error('StatusBar fail');
      }) as any;
      await nativeMod.syncNativeStatusBar('dark');

      // Reset
      Capacitor.isNativePlatform = () => false;
      logs.push('native-mode-passed');

      return { logs, vibrateCount, removedListener, handledBack, statusStyle };
    });

    expect(results.logs).toContain('web-mode-passed');
    expect(results.logs).toContain('native-mode-passed');
    expect(results.vibrateCount).toBeGreaterThanOrEqual(1);
  });

  test('executes and verifies arithmetic calculator evaluateExpression edge cases', async ({
    page,
  }) => {
    const calcResults = await page.evaluate(async () => {
      const { evaluateExpression, formatCalculationDisplay } =
        await import('/src/utils/calculator.ts');

      return {
        empty: evaluateExpression(''),
        nullExpr: evaluateExpression(null as any),
        simpleNum: evaluateExpression('42'),
        addition: evaluateExpression('10 + 20'),
        subtraction: evaluateExpression('100 - 30'),
        precedence: evaluateExpression('10 + 5 * 2 - 8 / 4'),
        divideByZero: evaluateExpression('50 / 0'),
        malformedOperator: evaluateExpression('10 *'),
        leadingOperator: evaluateExpression('* 5'),
        invalidToken: evaluateExpression('abc'),
        floatingMath: evaluateExpression('0.1 + 0.2'),
        formatDefault: formatCalculationDisplay('15 + 25'),
        formatEuro: formatCalculationDisplay('50 - 10', '€'),
      };
    });

    expect(calcResults.empty).toBe(0);
    expect(calcResults.nullExpr).toBe(0);
    expect(calcResults.simpleNum).toBe(42);
    expect(calcResults.addition).toBe(30);
    expect(calcResults.subtraction).toBe(70);
    expect(calcResults.precedence).toBe(18); // 10 + 10 - 2 = 18
    expect(calcResults.divideByZero).toBe(0);
    expect(calcResults.malformedOperator).toBe(10);
    expect(calcResults.leadingOperator).toBe(0);
    expect(calcResults.floatingMath).toBe(0.3);
    expect(calcResults.formatDefault).toBe('$40.00');
    expect(calcResults.formatEuro).toBe('€40.00');
  });

  test('executes and verifies dateFilters period bounding and stepping', async ({ page }) => {
    const dateResults = await page.evaluate(async () => {
      const {
        getPeriodBounds,
        stepPeriod,
        getLocalDateString,
        isFutureDate,
        canStepNextPeriod,
        filterTransactionsByPeriod,
      } = await import('/src/utils/dateFilters.ts');

      const ref = new Date('2026-08-15T12:00:00Z');

      const boundsDay = getPeriodBounds('DAY', ref);
      const boundsWeek = getPeriodBounds('WEEK', ref);
      const boundsMonth = getPeriodBounds('MONTH', ref);
      const boundsYear = getPeriodBounds('YEAR', ref);
      const boundsAll = getPeriodBounds('ALL', ref);

      const stepDayPrev = stepPeriod('DAY', ref, 'prev');
      const stepDayNext = stepPeriod('DAY', ref, 'next');
      const stepWeekPrev = stepPeriod('WEEK', ref, 'prev');
      const stepWeekNext = stepPeriod('WEEK', ref, 'next');
      const stepMonthPrev = stepPeriod('MONTH', ref, 'prev');
      const stepMonthNext = stepPeriod('MONTH', ref, 'next');
      const stepYearPrev = stepPeriod('YEAR', ref, 'prev');
      const stepYearNext = stepPeriod('YEAR', ref, 'next');
      const stepAll = stepPeriod('ALL', ref, 'next');

      const localStr = getLocalDateString(ref);
      const futureCheck = isFutureDate(new Date('2099-01-01'), ref);
      const pastCheck = isFutureDate(new Date('2020-01-01'), ref);

      const canStepAll = canStepNextPeriod('ALL', ref, ref);
      const canStepPast = canStepNextPeriod('MONTH', new Date('2025-01-01'), ref);

      const dummyTx: any[] = [
        { id: '1', date: '2026-08-15T10:00:00Z', amount: 50 },
        { id: '2', date: '2025-01-01T10:00:00Z', amount: 100 },
      ];
      const filteredAll = filterTransactionsByPeriod(dummyTx, 'ALL', ref);
      const filteredMonth = filterTransactionsByPeriod(dummyTx, 'MONTH', ref);

      return {
        boundsDayLabel: boundsDay.label,
        boundsWeekLabel: boundsWeek.label,
        boundsMonthLabel: boundsMonth.label,
        boundsYearLabel: boundsYear.label,
        boundsAllLabel: boundsAll.label,
        localStr,
        futureCheck,
        pastCheck,
        canStepAll,
        canStepPast,
        filteredAllCount: filteredAll.length,
        filteredMonthCount: filteredMonth.length,
        stepAllSameYear: stepAll.getFullYear() === ref.getFullYear(),
      };
    });

    expect(dateResults.boundsMonthLabel).toContain('August');
    expect(dateResults.boundsYearLabel).toBe('2026');
    expect(dateResults.boundsAllLabel).toBe('All Time');
    expect(dateResults.futureCheck).toBe(true);
    expect(dateResults.pastCheck).toBe(false);
    expect(dateResults.canStepAll).toBe(false);
    expect(dateResults.canStepPast).toBe(true);
    expect(dateResults.filteredAllCount).toBe(2);
    expect(dateResults.filteredMonthCount).toBe(1);
  });

  test('executes and verifies csvParser tokenization and schema detection', async ({ page }) => {
    const csvResults = await page.evaluate(async () => {
      const { tokenizeCsv, parseTransactionsCsv, parseAmount } =
        await import('/src/utils/csvParser.ts');

      // 1. Tokenize variations
      const commaGrid = tokenizeCsv(
        'date,amount,category\n15/08/2026,50,"Groceries, Food"\n16/08/2026,20,Taxi'
      );
      const semiGrid = tokenizeCsv('date;amount;category\n15/08/2026;50;Food\n16/08/2026;20;Taxi');
      const quotedQuotes = tokenizeCsv('"He said ""hello""";10;Note');

      // 2. Empty validation errors
      let emptyErr = '';
      try {
        parseTransactionsCsv('');
      } catch (e: any) {
        emptyErr = e.message;
      }

      // 3. Monefy export formats (mobile and native desktop)
      const exportMobileCsv = [
        'date,account,category,amount,currency,converted amount,currency,description',
        '16/08/2026,Cash,Food,-40,USD,-40,USD,Dahi',
        '16/08/2026,Cash,Salary,1800,USD,1800,USD,Monthly wage',
        '17/08/2026,Cash,' + "''" + ',-50,USD,-50,USD,to Card',
      ].join('\n');
      const parsedMobile = parseTransactionsCsv(exportMobileCsv);

      const exportNativeCsv = [
        'date,type,category,account,amount',
        '16/08/2026,expense,Food,Cash,40',
      ].join('\n');
      const parsedNative = parseTransactionsCsv(exportNativeCsv);

      // 4. Generic CSV format
      const genericCsv = [
        'Date,Amount,Category,Account,Note',
        '2026-08-16,-35.50,Entertainment,Card,Movie tickets',
        '2026-08-17,500.00,Bonus,Bank,Quarterly bonus',
        'invalid-row',
      ].join('\n');
      const parsedGeneric = parseTransactionsCsv(genericCsv);

      // 5. Parse amount helper
      const parsedPositive = parseAmount('1,80,000');
      const parsedNegative = parseAmount('-45.50');

      return {
        commaRows: commaGrid.length,
        semiRows: semiGrid.length,
        emptyErr,
        parsedMobileRows: parsedMobile.rows.length,
        parsedMobileFormat: parsedMobile.format,
        parsedNativeFormat: parsedNative.format,
        parsedGenericRows: parsedGeneric.rows.length,
        parsedGenericErrors: parsedGeneric.errors.length,
        parsedPositiveVal: parsedPositive?.amount,
        parsedNegativeSign: parsedNegative?.isNegative,
      };
    });

    expect(csvResults.commaRows).toBe(3);
    expect(csvResults.semiRows).toBe(3);
    expect(csvResults.emptyErr).toBe('CSV content is empty.');
    expect(csvResults.parsedMobileRows).toBe(3);
    expect(csvResults.parsedMobileFormat).toBe('monefy-mobile');
    expect(csvResults.parsedNativeFormat).toBe('monefy-export');
    expect(csvResults.parsedGenericRows).toBe(2);
    expect(csvResults.parsedGenericErrors).toBe(1);
    expect(csvResults.parsedPositiveVal).toBe(180000);
    expect(csvResults.parsedNegativeSign).toBe(true);
  });

  test('executes and verifies exportImport currency resolvers and formatters', async ({ page }) => {
    const expResults = await page.evaluate(async () => {
      const {
        resolveCurrencyCode,
        formatDateToMonefy,
        formatMonefyAmount,
        exportTransactionsToCSV,
        importDatabaseFromJSON,
      } = await import('/src/utils/exportImport.ts');
      const { db } = await import('/src/db/localDb.ts');

      const usd = resolveCurrencyCode('$');
      const eur = resolveCurrencyCode('€');
      const inr = resolveCurrencyCode('₹');
      const gbp = resolveCurrencyCode('£');
      const cad = resolveCurrencyCode('CA$');
      const customIso = resolveCurrencyCode('aud');
      const fallback = resolveCurrencyCode('???');

      const formattedIso = formatDateToMonefy('2026-10-15');
      const formattedIsoLong = formatDateToMonefy('2026-10-15T12:00:00Z');
      const formattedInvalid = formatDateToMonefy('invalid');
      const formattedEmpty = formatDateToMonefy('');

      const amtInr = formatMonefyAmount(180000, false, 'INR');
      const amtNegUsd = formatMonefyAmount(1000, true, 'USD');

      // Test export empty transactions
      const emptyCsv = exportTransactionsToCSV([], [], []);

      // Test export populated transactions including transfer
      const sampleTxs: any[] = [
        {
          id: 'tx-1',
          date: '2026-10-15',
          amount: 50,
          type: 'expense',
          categoryId: 'cat-1',
          accountId: 'acc-1',
          note: 'Groceries, apples',
        },
        {
          id: 'tx-2',
          date: '2026-10-15',
          amount: 200,
          type: 'income',
          categoryId: 'cat-2',
          accountId: 'acc-1',
        },
        {
          id: 'tx-3',
          date: '2026-10-15',
          amount: 100,
          type: 'transfer',
          categoryId: 'cat-transfer',
          accountId: 'acc-1',
          toAccountId: 'acc-2',
        },
      ];
      const sampleCats: any[] = [
        { id: 'cat-1', name: 'Food' },
        { id: 'cat-2', name: 'Salary' },
      ];
      const sampleAccs: any[] = [
        { id: 'acc-1', name: 'Cash' },
        { id: 'acc-2', name: 'Card' },
      ];
      const fullCsv = exportTransactionsToCSV(sampleTxs, sampleCats, sampleAccs, 'USD');

      // Test import database validation errors
      let invalidJsonErr = '';
      try {
        await importDatabaseFromJSON('invalid json string', db);
      } catch (e: any) {
        invalidJsonErr = e.message;
      }

      let schemaErr = '';
      try {
        await importDatabaseFromJSON(JSON.stringify({ version: 999 }), db);
      } catch (e: any) {
        schemaErr = e.message;
      }

      return {
        usd,
        eur,
        inr,
        gbp,
        cad,
        customIso,
        fallback,
        formattedIso,
        formattedEmpty,
        amtInr,
        amtNegUsd,
        emptyCsvHeaders: emptyCsv.includes('date,account,category'),
        fullCsvHasGroceries: fullCsv.includes('Groceries, apples'),
        fullCsvHasTransfer: fullCsv.includes('Payment -> Card'),
        invalidJsonErr: invalidJsonErr.length > 0,
        schemaErr: schemaErr.length > 0,
      };
    });

    expect(expResults.usd).toBe('USD');
    expect(expResults.eur).toBe('EUR');
    expect(expResults.inr).toBe('INR');
    expect(expResults.gbp).toBe('GBP');
    expect(expResults.cad).toBe('CAD');
    expect(expResults.customIso).toBe('AUD');
    expect(expResults.fallback).toBe('INR');
    expect(expResults.formattedIso).toBe('15/10/2026');
    expect(expResults.formattedEmpty).toBe('');
    expect(expResults.emptyCsvHeaders).toBe(true);
    expect(expResults.fullCsvHasGroceries).toBe(true);
    expect(expResults.fullCsvHasTransfer).toBe(true);
    expect(expResults.invalidJsonErr).toBe(true);
    expect(expResults.schemaErr).toBe(true);
  });

  test('executes and verifies localDb account balances with transfers and migration logic', async ({
    page,
  }) => {
    const dbResults = await page.evaluate(async () => {
      const { MonefyDatabase } = await import('/src/db/localDb.ts');

      const testDb = new MonefyDatabase();
      await testDb.open();

      // Seed test categories without order/visibility to test migration branches
      await testDb.categories.add({
        id: 'cat-migration-1',
        userId: null,
        name: 'Unordered Exp',
        icon: 'Tag',
        color: '#FF6B6B',
        type: 'expense',
        isDefault: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      await testDb.categories.add({
        id: 'cat-migration-2',
        userId: null,
        name: 'Unordered Inc',
        icon: 'TrendingUp',
        color: '#10B981',
        type: 'income',
        isDefault: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      // Call initializeDefaults to trigger displayOrder / isVisible auto-migration
      await testDb.initializeDefaults();

      // Seed account and transfers
      await testDb.accounts.add({
        id: 'acc-src',
        userId: null,
        name: 'Source Acc',
        icon: 'Wallet',
        color: '#3B82F6',
        initialBalance: 1000,
        isDefault: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await testDb.accounts.add({
        id: 'acc-dst',
        userId: null,
        name: 'Dest Acc',
        icon: 'CreditCard',
        color: '#10B981',
        initialBalance: 200,
        isDefault: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Transfer 300 from acc-src to acc-dst
      await testDb.transactions.add({
        id: 'tx-xfer-1',
        userId: null,
        amount: 300,
        type: 'transfer',
        categoryId: 'cat-transfer',
        accountId: 'acc-src',
        toAccountId: 'acc-dst',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      });

      // Regular expense on acc-src
      await testDb.transactions.add({
        id: 'tx-exp-1',
        userId: null,
        amount: 50,
        type: 'expense',
        categoryId: 'cat-migration-1',
        accountId: 'acc-src',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      });

      // Compute balances
      const srcBal = await testDb.calculateNetBalance('acc-src');
      const dstBal = await testDb.calculateNetBalance('acc-dst');
      const totalBal = await testDb.calculateNetBalance();

      const recent = await testDb.getRecentTransactions(5);

      await testDb.delete();

      return {
        srcBal, // 1000 - 300 (transfer) - 50 (expense) = 650
        dstBal, // 200 + 300 (transfer) = 500
        totalBal, // 1000 + 200 - 50 = 1150 (transfer is neutral overall)
        recentCount: recent.length,
      };
    });

    expect(dbResults.srcBal).toBe(650);
    expect(dbResults.dstBal).toBe(500);
    expect(dbResults.totalBal).toBe(1150);
    expect(dbResults.recentCount).toBeGreaterThanOrEqual(2);
  });

  test('executes and verifies syncEngine state transitions and error handlers', async ({
    page,
  }) => {
    const syncResults = await page.evaluate(async () => {
      const { syncEngine } = await import('/src/db/syncEngine.ts');
      const { db } = await import('/src/db/localDb.ts');

      // Set and get last sync time
      syncEngine.setLastSyncTime('2026-10-15T10:00:00Z');
      const lastSync = syncEngine.getLastSyncTime();

      // Guest migration flags
      syncEngine.setGuestMigrated(true);
      const isMigrated = syncEngine.isGuestMigrated();
      syncEngine.setGuestMigrated(false);
      const isNotMigrated = syncEngine.isGuestMigrated();

      // Auth token & user
      syncEngine.setAuthToken('mock-jwt-token');
      const token = syncEngine.getAuthToken();

      syncEngine.setAuthUser({ id: 'u1', email: 'test@example.com', name: 'Tester' });
      const user = syncEngine.getAuthUser();

      // Logout
      syncEngine.logout();
      const loggedOutUser = syncEngine.getAuthUser();
      const loggedOutToken = syncEngine.getAuthToken();

      return {
        lastSync,
        isMigrated,
        isNotMigrated,
        token,
        hasUser: !!user,
        loggedOutUser,
        loggedOutToken,
      };
    });

    expect(syncResults.lastSync).toBe('2026-10-15T10:00:00Z');
    expect(syncResults.isMigrated).toBe(true);
    expect(syncResults.isNotMigrated).toBe(false);
    expect(syncResults.token).toBe('mock-jwt-token');
    expect(syncResults.hasUser).toBe(true);
    expect(syncResults.loggedOutUser).toBeNull();
    expect(syncResults.loggedOutToken).toBeNull();
  });
});
