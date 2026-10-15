# 02: CSV Database Import & Entity Resolution Engine

**What to build:** An atomic database import engine taking parsed CSV rows and a `MonefyDatabase` instance, matching or auto-creating categories (with default icon and colors) and accounts (with default balance 0), generating unique transactions, optionally skipping duplicate transactions, persisting in an atomic Dexie transaction, and inserting `syncQueue` entries for cloud synchronization.

**Blocked by:** 01: Robust RFC-4180 CSV Parsing & Schema Detection

**Status:** resolved

- [x] Resolves accounts and categories case-insensitively against existing IndexedDB records.
- [x] Auto-creates missing categories and accounts with standard styling defaults so no transaction is orphaned.
- [x] Accurately interprets transaction types (expense, income, transfer) and positive/negative amounts.
- [x] Commits all entities atomically within a Dexie transaction so partial failures leave no corrupted state.
- [x] Populates `syncQueue` table for all created entities to guarantee cloud sync compatibility.
- [x] Returns summary metadata: count of imported transactions, created categories, created accounts, and skipped duplicates.

## Comments
- Implemented `importTransactionsFromCSV` in `client/src/utils/exportImport.ts`.
- Handles case-insensitive category and account lookup, auto-creates missing entities with proper defaults, handles transfer destination accounts, and deduplicates identical records when `skipDuplicates: true`.
- Atomically writes to Dexie IndexedDB and queues `syncQueue` items for cloud synchronization.
- Verified with 5 comprehensive integration tests in `client/src/test/csvImportEngine.test.ts` and confirmed existing export/import tests pass.

