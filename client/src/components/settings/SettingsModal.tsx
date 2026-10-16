import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Globe,
  Download,
  Upload,
  FileText,
  Database,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  Plus,
} from 'lucide-react';
import type { Category, Account, Transaction } from '../../types';
import type { MonefyDatabase } from '../../db/localDb';
import { CategoryIcon } from '../categories/CategoryIcon';
import {
  exportTransactionsToCSV,
  exportDatabaseToJSON,
  importDatabaseFromJSON,
  importTransactionsFromCSV,
  triggerFileDownload,
  type CsvImportResult,
} from '../../utils/exportImport';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSetCurrency: (curr: string) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  db?: MonefyDatabase;
  onRestoreDatabase?: (jsonString: string) => Promise<void>;
  onImportCSV?: (csvString: string) => Promise<CsvImportResult | void>;
  onExportCSV?: () => void;
  onBackupJSON?: () => void;
  onToggleCategoryVisibility?: (id: string, isVisible: boolean) => Promise<void> | void;
  onReorderCategories?: (orderedIds: string[]) => Promise<void> | void;
  onAddCategory?: () => void;
  initialTab?: 'general' | 'categories' | 'data';
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSetCurrency,
  transactions,
  categories,
  accounts,
  db,
  onRestoreDatabase,
  onImportCSV,
  onExportCSV,
  onBackupJSON,
  onToggleCategoryVisibility,
  onReorderCategories,
  onAddCategory,
  initialTab = 'general',
}) => {
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const categoriesSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialTab === 'categories' && categoriesSectionRef.current) {
      categoriesSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialTab]);

  const activeCategories = categories
    .filter((c) => c.type === categoryTab && !c.isDeleted)
    .sort((a, b) => {
      const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : 999;
      const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : 999;
      return orderA - orderB;
    });

  const handleToggleVisibility = async (catId: string, nextVisible: boolean) => {
    if (!nextVisible) {
      const visibleCount = activeCategories.filter(
        (c) => c.isVisible !== false && c.id !== catId
      ).length;
      if (visibleCount === 0) {
        setStatusMessage({
          type: 'error',
          text: `At least one ${categoryTab} category must remain visible on the dashboard.`,
        });
        return;
      }
    }
    if (onToggleCategoryVisibility) {
      await onToggleCategoryVisibility(catId, nextVisible);
    }
  };

  const handleMoveCategory = async (currentIndex: number, direction: -1 | 1) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= activeCategories.length) return;

    const newOrder = [...activeCategories];
    const temp = newOrder[currentIndex];
    newOrder[currentIndex] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const orderedIds = newOrder.map((c) => c.id);
    if (onReorderCategories) {
      await onReorderCategories(orderedIds);
    }
  };

  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }
    const csvContent = exportTransactionsToCSV(transactions, categories, accounts, currency);
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year2 = String(now.getFullYear()).slice(-2);
    const filename = `Monefy.Data.${day}-${month}-${year2}.csv`;
    triggerFileDownload(csvContent, filename, 'text/csv');
    setStatusMessage({
      type: 'success',
      text: `Exported ${transactions.length} transactions as ${filename} in Monefy format!`,
    });
  };

  const handleBackupJSON = async () => {
    if (onBackupJSON) {
      onBackupJSON();
      return;
    }
    if (!db) {
      setStatusMessage({ type: 'error', text: 'Database instance not available for backup.' });
      return;
    }
    try {
      const jsonContent = await exportDatabaseToJSON(db);
      const dateStr = new Date().toISOString().split('T')[0];
      triggerFileDownload(jsonContent, `monefy-backup-${dateStr}.json`, 'application/json');
      setStatusMessage({ type: 'success', text: 'Full JSON backup created and downloaded!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: `Backup failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        if (onRestoreDatabase) {
          await onRestoreDatabase(content);
        } else if (db) {
          const res = await importDatabaseFromJSON(content, db);
          setStatusMessage({
            type: 'success',
            text: `Successfully restored ${res.transactionsCount} transactions and ${res.categoriesCount} categories!`,
          });
        }
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: 'Error reading file.' });
      setIsRestoring(false);
    };

    reader.readAsText(file);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCsv(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        let res: CsvImportResult | void = undefined;
        if (onImportCSV) {
          res = await onImportCSV(content);
        } else if (db) {
          res = await importTransactionsFromCSV(content, db, { skipDuplicates: true });
        }

        if (res && typeof res === 'object' && 'importedTransactionsCount' in res) {
          let currMsg = '';
          if (res.detectedCurrency) {
            const matched = CURRENCIES.find(
              (c) =>
                c.code.toLowerCase() === res.detectedCurrency?.toLowerCase() ||
                c.symbol === res.detectedCurrency
            );
            if (matched) {
              onSetCurrency(matched.symbol);
              currMsg = `, currency set to ${matched.symbol} (${matched.code})`;
            }
          }
          const dupMsg =
            res.skippedDuplicatesCount > 0
              ? `, ${res.skippedDuplicatesCount} duplicates skipped`
              : '';
          setStatusMessage({
            type: 'success',
            text: `Successfully imported ${res.importedTransactionsCount} transactions (${res.createdCategoriesCount} new categories, ${res.createdAccountsCount} new accounts${dupMsg}${currMsg})!`,
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Transactions CSV imported successfully!',
          });
        }
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: `Import failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setIsImportingCsv(false);
        if (csvInputRef.current) {
          csvInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      setStatusMessage({ type: 'error', text: 'Error reading file.' });
      setIsImportingCsv(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px',
          background: 'var(--bg-secondary)',
        }}
      >
        <div className="modal-drag-handle" />
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.2)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Globe size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Settings & Data</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Currency, backup, and restore
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-settings"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background:
                statusMessage.type === 'success'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              color:
                statusMessage.type === 'success' ? 'var(--color-surplus)' : 'var(--color-deficit)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Currency Settings Section */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Global Currency
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
                gap: '8px',
              }}
            >
              {CURRENCIES.map((curr) => {
                const isSelected = currency === curr.symbol;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    data-testid={`currency-btn-${curr.symbol}`}
                    onClick={() => onSetCurrency(curr.symbol)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-elevated)',
                      border: `1.5px solid ${isSelected ? '#6366F1' : 'var(--border-subtle)'}`,
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <span
                      className="font-num"
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: isSelected ? '#6366F1' : 'var(--text-primary)',
                      }}
                    >
                      {curr.symbol}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                      {curr.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories & Display Order Section */}
          <div ref={categoriesSectionRef}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Categories & Display Order
              </div>
              {onAddCategory && (
                <button
                  type="button"
                  data-testid="btn-add-category-settings"
                  onClick={onAddCategory}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} /> Add Custom
                </button>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Select which categories appear on the dashboard wheel/grid and arrange their display
              order.
            </div>

            {/* Expense / Income Filter Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '3px',
                gap: '4px',
                marginBottom: '10px',
              }}
            >
              <button
                type="button"
                data-testid="tab-categories-expense"
                onClick={() => setCategoryTab('expense')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: categoryTab === 'expense' ? 'var(--color-primary)' : 'transparent',
                  color: categoryTab === 'expense' ? '#FFFFFF' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Expense Categories
              </button>
              <button
                type="button"
                data-testid="tab-categories-income"
                onClick={() => setCategoryTab('income')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: categoryTab === 'income' ? 'var(--color-primary)' : 'transparent',
                  color: categoryTab === 'income' ? '#FFFFFF' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Income Categories
              </button>
            </div>

            {/* Categories List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '2px',
              }}
            >
              {activeCategories.map((cat, index) => {
                const isFirst = index === 0;
                const isLast = index === activeCategories.length - 1;
                const isVisible = cat.isVisible !== false;

                return (
                  <div
                    key={cat.id}
                    data-testid={`category-row-${cat.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      opacity: isVisible ? 1 : 0.5,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {/* Left: Checkbox & Category Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        data-testid={`category-toggle-${cat.id}`}
                        aria-label={`Toggle visibility of ${cat.name}`}
                        checked={isVisible}
                        onChange={(e) => handleToggleVisibility(cat.id, e.target.checked)}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: 'var(--color-primary)',
                          cursor: 'pointer',
                        }}
                      />
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: `${cat.color}25`,
                          border: `1.5px solid ${cat.color}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CategoryIcon name={cat.icon} size={15} color={cat.color} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {cat.name}
                        </span>
                        {cat.isDefault && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Default
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Reorder Up/Down buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        data-testid={`category-move-up-${cat.id}`}
                        aria-label={`Move ${cat.name} up`}
                        disabled={isFirst}
                        onClick={() => handleMoveCategory(index, -1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
                          opacity: isFirst ? 0.35 : 1,
                          cursor: isFirst ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        type="button"
                        data-testid={`category-move-down-${cat.id}`}
                        aria-label={`Move ${cat.name} down`}
                        disabled={isLast}
                        onClick={() => handleMoveCategory(index, 1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          color: isLast ? 'var(--text-muted)' : 'var(--text-primary)',
                          opacity: isLast ? 0.35 : 1,
                          cursor: isLast ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Export & Backup Section */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Export & Backup
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* CSV Export Button */}
              <button
                type="button"
                data-testid="btn-export-csv"
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} color="#10B981" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      Export Transactions (CSV)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Download spreadsheet compatible file
                    </div>
                  </div>
                </div>
                <Download size={16} color="var(--text-muted)" />
              </button>

              {/* JSON Full Backup Button */}
              <button
                type="button"
                data-testid="btn-backup-json"
                onClick={handleBackupJSON}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={18} color="#3B82F6" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      Full Database Backup (JSON)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Accounts, categories, transactions & budgets
                    </div>
                  </div>
                </div>
                <Download size={16} color="var(--text-muted)" />
              </button>
            </div>
          </div>

          {/* CSV Data Import Section */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Import Transactions
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px dashed rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Import transactions from a spreadsheet CSV file (AI Monefy, classic Monefy, or
                generic format). Missing categories and accounts will be created automatically.
              </div>

              <input
                type="file"
                ref={csvInputRef}
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                style={{ display: 'none' }}
                data-testid="input-import-csv"
              />

              <button
                type="button"
                data-testid="btn-trigger-import-csv"
                disabled={isImportingCsv}
                onClick={() => csvInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isImportingCsv ? 'not-allowed' : 'pointer',
                }}
              >
                <FileSpreadsheet size={16} color="#10B981" />
                {isImportingCsv ? 'Importing CSV...' : 'Import Transactions (CSV)'}
              </button>
            </div>
          </div>

          {/* Database Restore Section */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Restore Database
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px dashed rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Upload a valid Monefy JSON backup file. Note that restoring will overwrite current
                local data.
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                data-testid="input-restore-file"
              />

              <button
                type="button"
                data-testid="btn-trigger-restore"
                disabled={isRestoring}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isRestoring ? 'not-allowed' : 'pointer',
                }}
              >
                <Upload size={16} />
                {isRestoring ? 'Restoring Backup...' : 'Select JSON Backup File'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
