export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  userId?: string | null;
  accountId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  toAccountId?: string | null;
  note?: string;
  date: string; // ISO 8601 string
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  isDefault: boolean;
  isDeleted: boolean;
  displayOrder?: number;
  isVisible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId?: string | null;
  name: string;
  icon: string;
  color: string;
  initialBalance: number;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  userId?: string | null;
  categoryId: string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'transaction' | 'category' | 'account' | 'budget';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
}

export type TimeInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

export interface DateFilterRange {
  startDate: string; // ISO or YYYY-MM-DD
  endDate: string;
  interval: TimeInterval;
  label: string;
}
