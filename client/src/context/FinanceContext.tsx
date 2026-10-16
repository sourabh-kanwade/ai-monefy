import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { db, MonefyDatabase } from '../db/localDb';
import type { Transaction, Category, Account, Budget, TimeInterval } from '../types';
import { getPeriodBounds, stepPeriod, filterTransactionsByPeriod, canStepNextPeriod } from '../utils/dateFilters';

interface FinanceContextType {
  transactions: Transaction[];
  periodTransactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  accountBalances: Record<string, number>;
  totalBalance: number;
  budgets: Budget[];
  categoryBudgets: Record<string, number>;
  netBalance: number;
  totalIncome: number;
  totalExpense: number;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  currency: string;
  setCurrency: (c: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  interval: TimeInterval;
  setInterval: (i: TimeInterval) => void;
  referenceDate: Date;
  setReferenceDate: (d: Date) => void;
  periodLabel: string;
  canStepNext: boolean;
  stepPrevPeriod: () => void;
  stepNextPeriod: () => void;
  addTransaction: (input: {
    amount: number;
    type: 'expense' | 'income' | 'transfer';
    categoryId: string;
    accountId: string;
    toAccountId?: string | null;
    note?: string;
    date?: string;
  }) => Promise<string>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  addCategory: (input: {
    name: string;
    icon: string;
    color: string;
    type: 'expense' | 'income';
  }) => Promise<string>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  toggleCategoryVisibility: (id: string, isVisible: boolean) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addAccount: (input: {
    name: string;
    icon: string;
    color: string;
    initialBalance: number;
  }) => Promise<string>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setBudget: (categoryId: string, monthlyLimit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  dbInstance: MonefyDatabase;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode; database?: MonefyDatabase }> = ({
  children,
  database = db,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [netBalance, setNetBalance] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [interval, setInterval] = useState<TimeInterval>('MONTH');
  const [referenceDate, setReferenceDateState] = useState<Date>(() => new Date());
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('ai_monefy_currency') || '$';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ai_monefy_theme') as 'dark' | 'light') || 'dark';
  });

  const setReferenceDate = useCallback((d: Date) => {
    const today = new Date();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    setReferenceDateState(d.getTime() > endOfToday.getTime() ? today : d);
  }, []);

  const canStepNext = useMemo(() => {
    return canStepNextPeriod(interval, referenceDate);
  }, [interval, referenceDate]);

  const stepPrevPeriod = useCallback(() => {
    setReferenceDateState((prev) => stepPeriod(interval, prev, 'prev'));
  }, [interval]);

  const stepNextPeriod = useCallback(() => {
    if (!canStepNextPeriod(interval, referenceDate)) {
      return;
    }
    setReferenceDateState((prev) => stepPeriod(interval, prev, 'next'));
  }, [interval, referenceDate]);

  const periodLabel = useMemo(() => {
    return getPeriodBounds(interval, referenceDate).label;
  }, [interval, referenceDate]);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    localStorage.setItem('ai_monefy_currency', c);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ai_monefy_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshData = useCallback(async () => {
    const [rawCats, rawAccs, allBudgets, rawTxs, balance] = await Promise.all([
      database.categories.toArray(),
      database.accounts.toArray(),
      database.budgets.toArray(),
      database.transactions.toArray(),
      database.calculateNetBalance(selectedAccountId || undefined),
    ]);

    if (!isMountedRef.current) return;

    const allCats = rawCats.filter((c) => !c.isDeleted);
    const allAccs = rawAccs.filter((a) => !a.isDeleted);
    const allTxs = rawTxs
      .filter((t) => !t.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setCategories(allCats);
    setAccounts(allAccs);
    setBudgets(allBudgets);
    setTransactions(allTxs);
    setNetBalance(typeof balance === 'number' && !isNaN(balance) ? balance : 0);
  }, [database, selectedAccountId]);

  useEffect(() => {
    let isMounted = true;
    database.initializeDefaults().then(() => {
      if (isMounted) {
        refreshData();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [database, refreshData]);

  const addTransaction = useCallback(
    async (input: {
      amount: number;
      type: 'expense' | 'income' | 'transfer';
      categoryId: string;
      accountId: string;
      toAccountId?: string | null;
      note?: string;
      date?: string;
    }) => {
      const id = await database.addTransaction(input);
      await refreshData();
      return id;
    },
    [database, refreshData]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const tx = await database.transactions.get(id);
      if (tx) {
        const now = new Date().toISOString();
        await database.transactions.update(id, { isDeleted: true, updatedAt: now });
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'transaction',
          entityId: id,
          action: 'delete',
          payload: { id },
          timestamp: now,
        });
        await refreshData();
      }
    },
    [database, refreshData]
  );

  const updateTransaction = useCallback(
    async (id: string, updates: Partial<Transaction>) => {
      const now = new Date().toISOString();
      await database.transactions.update(id, { ...updates, updatedAt: now });
      const updatedTx = await database.transactions.get(id);
      if (updatedTx) {
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'transaction',
          entityId: id,
          action: 'update',
          payload: updatedTx,
          timestamp: now,
        });
      }
      await refreshData();
    },
    [database, refreshData]
  );

  const addCategory = useCallback(
    async (input: {
      name: string;
      icon: string;
      color: string;
      type: 'expense' | 'income';
    }) => {
      const id = crypto.randomUUID?.() || String(Date.now());
      const now = new Date().toISOString();
      const countOfType = categories.filter((c) => c.type === input.type && !c.isDeleted).length;
      const newCat: Category = {
        id,
        name: input.name,
        icon: input.icon,
        color: input.color,
        type: input.type,
        isDefault: false,
        isDeleted: false,
        displayOrder: countOfType,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      };
      await database.categories.add(newCat);
      await database.syncQueue.add({
        id: crypto.randomUUID?.() || String(Date.now()),
        entityType: 'category',
        entityId: id,
        action: 'create',
        payload: newCat,
        timestamp: now,
      });
      await refreshData();
      return id;
    },
    [database, refreshData, categories]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<Category>) => {
      const now = new Date().toISOString();
      await database.categories.update(id, { ...updates, updatedAt: now });
      const updated = await database.categories.get(id);
      if (updated) {
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'category',
          entityId: id,
          action: 'update',
          payload: updated,
          timestamp: now,
        });
      }
      await refreshData();
    },
    [database, refreshData]
  );

  const toggleCategoryVisibility = useCallback(
    async (id: string, isVisible: boolean) => {
      await updateCategory(id, { isVisible });
    },
    [updateCategory]
  );

  const reorderCategories = useCallback(
    async (orderedIds: string[]) => {
      const now = new Date().toISOString();
      for (let i = 0; i < orderedIds.length; i++) {
        const catId = orderedIds[i];
        await database.categories.update(catId, { displayOrder: i, updatedAt: now });
        const updated = await database.categories.get(catId);
        if (updated) {
          await database.syncQueue.add({
            id: crypto.randomUUID?.() || String(Date.now()),
            entityType: 'category',
            entityId: catId,
            action: 'update',
            payload: updated,
            timestamp: now,
          });
        }
      }
      await refreshData();
    },
    [database, refreshData]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      await database.categories.update(id, { isDeleted: true, updatedAt: now });
      await database.syncQueue.add({
        id: crypto.randomUUID?.() || String(Date.now()),
        entityType: 'category',
        entityId: id,
        action: 'delete',
        payload: { id },
        timestamp: now,
      });
      await refreshData();
    },
    [database, refreshData]
  );

  const addAccount = useCallback(
    async (input: { name: string; icon: string; color: string; initialBalance: number }) => {
      const id = crypto.randomUUID?.() || String(Date.now());
      const now = new Date().toISOString();
      const newAcc: Account = {
        id,
        name: input.name,
        icon: input.icon,
        color: input.color,
        initialBalance: input.initialBalance,
        isDefault: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      await database.accounts.add(newAcc);
      await database.syncQueue.add({
        id: crypto.randomUUID?.() || String(Date.now()),
        entityType: 'account',
        entityId: id,
        action: 'create',
        payload: newAcc,
        timestamp: now,
      });
      await refreshData();
      return id;
    },
    [database, refreshData]
  );

  const updateAccount = useCallback(
    async (id: string, updates: Partial<Account>) => {
      const now = new Date().toISOString();
      await database.accounts.update(id, { ...updates, updatedAt: now });
      const updatedAcc = await database.accounts.get(id);
      if (updatedAcc) {
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'account',
          entityId: id,
          action: 'update',
          payload: updatedAcc,
          timestamp: now,
        });
      }
      await refreshData();
    },
    [database, refreshData]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      await database.accounts.update(id, { isDeleted: true, updatedAt: now });
      await database.syncQueue.add({
        id: crypto.randomUUID?.() || String(Date.now()),
        entityType: 'account',
        entityId: id,
        action: 'delete',
        payload: { id },
        timestamp: now,
      });
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
      }
      await refreshData();
    },
    [database, refreshData, selectedAccountId]
  );

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    for (const acc of accounts) {
      const initBal = Number(acc.initialBalance);
      balances[acc.id] = isNaN(initBal) ? 0 : initBal;
    }
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const safeAmount = isNaN(amount) ? 0 : amount;
      if (tx.type === 'expense' && balances[tx.accountId] !== undefined) {
        balances[tx.accountId] -= safeAmount;
      } else if (tx.type === 'income' && balances[tx.accountId] !== undefined) {
        balances[tx.accountId] += safeAmount;
      } else if (tx.type === 'transfer') {
        if (balances[tx.accountId] !== undefined) {
          balances[tx.accountId] -= safeAmount;
        }
        if (tx.toAccountId && balances[tx.toAccountId] !== undefined) {
          balances[tx.toAccountId] += safeAmount;
        }
      }
    }
    for (const id of Object.keys(balances)) {
      const b = balances[id];
      balances[id] = isNaN(b) ? 0 : Math.round(b * 100) / 100;
    }
    return balances;
  }, [accounts, transactions]);

  const setBudget = useCallback(
    async (categoryId: string, monthlyLimit: number) => {
      const existing = await database.budgets.where('categoryId').equals(categoryId).first();
      const now = new Date().toISOString();
      if (existing) {
        await database.budgets.update(existing.id, { monthlyLimit, updatedAt: now });
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'budget',
          entityId: existing.id,
          action: 'update',
          payload: { ...existing, monthlyLimit, updatedAt: now },
          timestamp: now,
        });
      } else {
        const id = crypto.randomUUID?.() || String(Date.now());
        const newBudget: Budget = {
          id,
          categoryId,
          monthlyLimit,
          createdAt: now,
          updatedAt: now,
        };
        await database.budgets.add(newBudget);
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'budget',
          entityId: id,
          action: 'create',
          payload: newBudget,
          timestamp: now,
        });
      }
      await refreshData();
    },
    [database, refreshData]
  );

  const removeBudget = useCallback(
    async (categoryId: string) => {
      const existing = await database.budgets.where('categoryId').equals(categoryId).first();
      if (existing) {
        const now = new Date().toISOString();
        await database.budgets.delete(existing.id);
        await database.syncQueue.add({
          id: crypto.randomUUID?.() || String(Date.now()),
          entityType: 'budget',
          entityId: existing.id,
          action: 'delete',
          payload: { id: existing.id },
          timestamp: now,
        });
        await refreshData();
      }
    },
    [database, refreshData]
  );

  const categoryBudgets = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of budgets) {
      map[b.categoryId] = b.monthlyLimit;
    }
    return map;
  }, [budgets]);

  const totalBalance = useMemo(() => {
    const sum = Object.values(accountBalances).reduce((a, b) => a + (Number(b) || 0), 0);
    return isNaN(sum) ? 0 : Math.round(sum * 100) / 100;
  }, [accountBalances]);

  const periodTransactions = useMemo(() => {
    return filterTransactionsByPeriod(transactions, interval, referenceDate);
  }, [transactions, interval, referenceDate]);

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of periodTransactions) {
      if (selectedAccountId && tx.accountId !== selectedAccountId && tx.toAccountId !== selectedAccountId) {
        continue;
      }
      const amount = Number(tx.amount);
      const safeAmount = isNaN(amount) ? 0 : amount;
      if (tx.type === 'income') {
        inc += safeAmount;
      } else if (tx.type === 'expense') {
        exp += safeAmount;
      }
    }
    return {
      totalIncome: isNaN(inc) ? 0 : Math.round(inc * 100) / 100,
      totalExpense: isNaN(exp) ? 0 : Math.round(exp * 100) / 100,
    };
  }, [periodTransactions, selectedAccountId]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        periodTransactions,
        categories,
        accounts,
        accountBalances,
        totalBalance,
        budgets,
        categoryBudgets,
        netBalance,
        totalIncome,
        totalExpense,
        selectedAccountId,
        setSelectedAccountId,
        currency,
        setCurrency,
        theme,
        toggleTheme,
        interval,
        setInterval,
        referenceDate,
        setReferenceDate,
        periodLabel,
        canStepNext,
        stepPrevPeriod,
        stepNextPeriod,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addCategory,
        updateCategory,
        toggleCategoryVisibility,
        reorderCategories,
        deleteCategory,
        addAccount,
        updateAccount,
        deleteAccount,
        setBudget,
        removeBudget,
        refreshData,
        dbInstance: database,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
