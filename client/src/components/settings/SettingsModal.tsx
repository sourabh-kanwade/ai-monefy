import React, { useState, useRef } from 'react';
import { X, Globe, Download, Upload, FileText, Database, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import type { Category, Account, Transaction } from '../../types';
import type { MonefyDatabase } from '../../db/localDb';
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
}) => {
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

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
          const dupMsg = res.skippedDuplicatesCount > 0 ? `, ${res.skippedDuplicatesCount} duplicates skipped` : '';
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
                statusMessage.type === 'success'
                  ? 'var(--color-surplus)'
                  : 'var(--color-deficit)',
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
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.2)'
                        : 'var(--bg-elevated)',
                      border: `1.5px solid ${
                        isSelected ? '#6366F1' : 'var(--border-subtle)'
                      }`,
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
                Import transactions from a spreadsheet CSV file (AI Monefy, classic Monefy, or generic format). Missing categories and accounts will be created automatically.
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
