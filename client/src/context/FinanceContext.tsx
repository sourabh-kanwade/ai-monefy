import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { db, MonefyDatabase } from '../db/localDb';
import type { Transaction, Category, Account, Budget } from '../types';

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  netBalance: number;
  totalIncome: number;
  totalExpense: number;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;
  currency: string;
  setCurrency: (c: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
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
  const [currency, setCurrencyState] = useState<string>(() => {
    return localStorage.getItem('ai_monefy_currency') || '$';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ai_monefy_theme') as 'dark' | 'light') || 'dark';
  });

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

  const refreshData = useCallback(async () => {
    const [rawCats, rawAccs, allBudgets, rawTxs, balance] = await Promise.all([
      database.categories.toArray(),
      database.accounts.toArray(),
      database.budgets.toArray(),
      database.transactions.toArray(),
      database.calculateNetBalance(selectedAccountId || undefined),
    ]);

    const allCats = rawCats.filter((c) => !c.isDeleted);
    const allAccs = rawAccs.filter((a) => !a.isDeleted);
    const allTxs = rawTxs
      .filter((t) => !t.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setCategories(allCats);
    setAccounts(allAccs);
    setBudgets(allBudgets);
    setTransactions(allTxs);
    setNetBalance(balance);
  }, [database, selectedAccountId]);

  useEffect(() => {
    database.initializeDefaults().then(() => refreshData());
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
      const newCat: Category = {
        id,
        name: input.name,
        icon: input.icon,
        color: input.color,
        type: input.type,
        isDefault: false,
        isDeleted: false,
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
    [database, refreshData]
  );

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      if (selectedAccountId && tx.accountId !== selectedAccountId && tx.toAccountId !== selectedAccountId) {
        continue;
      }
      if (tx.type === 'income') {
        inc += tx.amount;
      } else if (tx.type === 'expense') {
        exp += tx.amount;
      }
    }
    return {
      totalIncome: Math.round(inc * 100) / 100,
      totalExpense: Math.round(exp * 100) / 100,
    };
  }, [transactions, selectedAccountId]);

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        categories,
        accounts,
        budgets,
        netBalance,
        totalIncome,
        totalExpense,
        selectedAccountId,
        setSelectedAccountId,
        currency,
        setCurrency,
        theme,
        toggleTheme,
        addTransaction,
        deleteTransaction,
        updateTransaction,
        addCategory,
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
