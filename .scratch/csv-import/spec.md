<!-- triage: done -->
# Spec: CSV Data Import for Transactions, Accounts, and Categories

**Status:** resolved


## Problem Statement

Users who track expenses across multiple tools, spreadsheets, or the original Monefy mobile application cannot easily migrate or bring their historical transaction records into AI Monefy. Currently, the application supports exporting transactions to CSV and full backup/restore via JSON, but lacks a mechanism to import data from a CSV spreadsheet. Users need an intuitive, resilient way to upload CSV transaction files directly from Settings so they can populate their dashboard, category distributions, and account balances without manual re-entry or data loss.

## Solution

AI Monefy will introduce a dedicated CSV Import capability within the Settings & Data Management surface. Users can select any standard CSV file containing transaction records (including AI Monefy's own exported CSV format as well as third-party / original Monefy export formats). The system parses the CSV with RFC-4180 compliance, validates columns, maps categories and accounts (auto-creating non-existent categories or accounts with sensible defaults if necessary), calculates balances, and commits the records to IndexedDB in an atomic batch. If cloud sync is active or enabled later, imported transactions are automatically queued in the sync engine. Real-time feedback with row counts and error diagnostics ensures complete transparency.

## User Stories

1. As an expense tracking user, I want an "Import Transactions (CSV)" button in Settings, so that I can easily bring external transaction history into the app.
2. As a user with an exported AI Monefy CSV file, I want to import it directly, so that all my previous dates, categories, accounts, amounts, and notes are restored without manual configuration.
3. As a user switching from the original Monefy mobile application, I want the importer to recognize standard Monefy export CSV column names, so that I don't have to manually edit headers in a spreadsheet editor.
4. As a user with diverse spreadsheet files, I want flexible, case-insensitive header detection (e.g., "Date", "date", "Category", "category", "Amount", "amount", "Note", "note", "Description", "description"), so that subtle capitalization differences don't fail the import.
5. As a user importing transactions with new categories not currently in my app, I want the importer to automatically create those categories with appropriate type and default styling, so that none of my historical transactions lose category association.
6. As a user importing transactions with new account names, I want the importer to automatically create those accounts, so that balances and payment methods remain cleanly segregated.
7. As a user importing transfers between accounts, I want the importer to recognize source and destination accounts, so that transfers are recorded correctly without distorting income/expense totals.
8. As a user with formatted currency amounts (e.g. "$1,250.50" or positive/negative expense indications), I want the parser to sanitize and extract correct decimal numbers, so that monetary calculations are accurate.
9. As a user with varied date formats (ISO-8601, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY), I want the parser to parse them reliably into valid transaction timestamps, so that interval filtering and charts remain chronologically coherent.
10. As a user importing multiline notes or notes containing commas and quotes, I want the CSV parser to respect RFC-4180 escaping rules, so that note content is not truncated or misparsed into adjacent columns.
11. As a user selecting a file, I want to see an immediate pre-import summary (total rows found, detected format, accounts and categories affected, and any invalid rows), so that I can verify the data before committing changes.
12. As a user importing transactions, I want the option to prevent or skip duplicate transactions (matching date, amount, account, category, note), so that re-importing the same export does not duplicate my spending records.
13. As a user importing transactions, I want the import operation to execute in an atomic transaction, so that if an unrecoverable database error occurs, my existing data remains uncorrupted.
14. As an offline user who later connects to cloud sync, I want imported records to be registered in the local sync queue, so that they automatically synchronize to my PostgreSQL/Supabase account.
15. As a user who imports a CSV containing malformed or unparseable rows, I want detailed line-by-line error feedback highlighting why specific rows failed, so that I can easily fix them in my spreadsheet.
16. As a user, after an import completes, I want my wheel chart, category totals, account balances, and transaction history to update immediately without requiring a manual page refresh.
17. As a keyboard and accessibility user, I want clear file-input states, disabled buttons during active parsing, and high-contrast status banners, so that the import flow is accessible and transparent.

## Implementation Decisions

- **The modules that will be built/modified**:
  - Extend `client/src/utils/exportImport.ts` with CSV parsing, schema normalization, entity resolution, and database import execution.
  - Update `client/src/components/settings/SettingsModal.tsx` with a dedicated CSV import trigger, file selector (`.csv, text/csv`), and progress/error notifications.
  - Integrate with `client/src/components/dashboard/MonefyDashboard.tsx` to pass the import handler and invoke `refreshData()` upon completion.

- **The interfaces of those modules that will be modified**:
  - The `exportImport` module will expose two cohesive functions:
    1. A pure CSV parsing and validation function: accepts a CSV string and parsing options, parses RFC-4180 tokens, detects column schemas (native Monefy vs classic mobile vs generic), validates rows, and returns parsed candidate rows alongside row-level error diagnostics.
    2. An atomic CSV import execution function: accepts a CSV string, a `MonefyDatabase` instance, and import options (such as duplicate-skipping), performs atomic IndexedDB updates across categories, accounts, transactions, and the sync queue, and returns an import summary (number of transactions imported, duplicates skipped, new accounts created, new categories created).

- **Architectural & Schema Decisions**:
  - **Single Seam Principle**: Core domain logic lives entirely within `exportImport` as a deep module (simple two-function interface hiding extensive RFC-4180 tokenization, header normalization, and transaction atomicity).
  - **No Database Schema Alterations**: The existing IndexedDB schema and TypeScript types (`Transaction`, `Category`, `Account`, `SyncQueueItem`) fully support the imported data.
  - **Entity Auto-Generation Strategy**: If a category or account referenced in the CSV does not exist locally (checked case-insensitively), create it with standard default icons (`Tag` / `Wallet`), consistent palette colors, and default flags.
  - **Cloud Sync Guarantee**: Every imported transaction and auto-created entity will insert a corresponding `SyncQueueItem` in IndexedDB, guaranteeing that guest-to-cloud sync pushes newly imported records to the remote PostgreSQL/Supabase database.

- **Specific Interactions**:
  - Inside SettingsModal, an "Import Transactions (CSV)" button with a file input will allow picking `.csv` files.
  - While processing, button displays loading state.
  - Upon success, a green notification banner reports: "Successfully imported X transactions (created Y accounts, Z categories)".
  - On failure, a red notification banner displays the specific parsing or database error message.

## Testing Decisions

- **What makes a good test**: Tests must verify observable system behavior through external seams, rather than asserting on internal regex matches, loop counters, or private component state. Valid CSV inputs should produce predictable records, balances, and sync queues in the database; invalid CSV inputs should result in clear, well-structured error reports without mutating the database.
- **Which modules will be tested**:
  - **Primary Domain Seam**: The CSV import functions in `exportImport` will be tested using `fake-indexeddb` in Vitest.
  - **Settings UI Seam**: `SettingsModal` will be tested using `@testing-library/react` to verify file picker interaction, loading states, and notification rendering.
- **Proposed Testing Seam**:
  - A single primary domain seam at `importTransactionsFromCSV(csvString, db, options)`. Exercising this seam tests the end-to-end pipeline (RFC-4180 parsing, column matching, category/account creation, duplicate filtering, IndexedDB writes, and sync queue population) with zero UI flakiness and high execution speed.
- **Prior art for the tests**:
  - `client/src/test/exportImport.test.ts` (existing tests for `exportTransactionsToCSV`, `exportDatabaseToJSON`, and `importDatabaseFromJSON`).
  - `client/src/test/SettingsModal.test.tsx` (existing tests for modal interactions, file upload mocking, and notification banners).

## Out of Scope

- Direct binary parsing of proprietary banking formats (e.g., OFX, QIF, PDF bank statements).
- Interactive drag-and-drop column mapping wizard (handled instead via intelligent automatic header detection and standard column aliases).
- Automated live currency conversion for CSVs with multiple mixed foreign currencies.
- Deleting or overwriting existing database records (unlike JSON database restore, CSV import is additive/append-based).

## Further Notes

- The import format fully supports round-trip fidelity with AI Monefy's own CSV exports (`exportTransactionsToCSV`).
- All dates will be parsed and stored as standard ISO-8601 UTC strings.
- Implementation tasks can be tracked as discrete tickets in `.scratch/csv-import/issues/`.
