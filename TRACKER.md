# AI Monefy - Task Tracker

> **Project**: AI Monefy (Web & Android Personal Expense Tracker)  
> **Architecture**: React 19 + TypeScript + Vite + Capacitor + PostgreSQL / Supabase Sync  
> **Specification**: [SPEC-01-AI-MONEFY.md](docs/specs/SPEC-01-AI-MONEFY.md) (`ready-for-agent`)  
> **Last Updated**: 2026-10-15  
> **Overall Progress**: 0% (0 / 27 Tasks Completed)

```
[░░░░░░░░░░░░░░░░░░░░] 0% Complete
```

---

## Task Summary Dashboard

| Phase | Description | Total Tasks | Completed | In Progress | Pending | Status |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Phase 1** | Project Scaffolding & Setup | 4 | 0 | 0 | 4 | ⏳ Pending |
| **Phase 2** | Design System & Core Shell | 3 | 0 | 0 | 3 | ⏳ Pending |
| **Phase 3** | Data Layer & Local-First IDB | 3 | 0 | 0 | 3 | ⏳ Pending |
| **Phase 4** | Iconic Monefy Wheel & Keypad | 4 | 0 | 0 | 4 | ⏳ Pending |
| **Phase 5** | Accounts, Transfers & History | 3 | 0 | 0 | 3 | ⏳ Pending |
| **Phase 6** | Budgets, Analytics & Settings | 4 | 0 | 0 | 4 | ⏳ Pending |
| **Phase 7** | Cloud Sync (PostgreSQL / Supabase) | 4 | 0 | 0 | 4 | ⏳ Pending |
| **Phase 8** | Android Build & Final Verification | 2 | 0 | 0 | 2 | ⏳ Pending |
| **Total** | | **27** | **0** | **0** | **27** | |

---

## Detailed Task Tracker

### Phase 1: Project Scaffolding & Setup
- [ ] **TASK-1.1**: Root Monorepo Configuration
  - **Status**: `PENDING`
  - **Deliverable**: `package.json`, root workspace scripts
  - **Dependencies**: None
  - **Verification**: `npm install` runs cleanly

- [ ] **TASK-1.2**: Client Application Scaffold (Vite + React 19 + TS)
  - **Status**: `PENDING`
  - **Deliverable**: `client/` directory with Vite & TS configuration
  - **Dependencies**: TASK-1.1
  - **Verification**: `npm run build` succeeds in `client/`

- [ ] **TASK-1.3**: Backend Server Scaffold (Node.js + Express + TS + PostgreSQL / Supabase ready)
  - **Status**: `PENDING`
  - **Deliverable**: `server/` directory with Express & PostgreSQL connection pool setup
  - **Dependencies**: TASK-1.1
  - **Verification**: Health endpoint `/api/health` responds

- [ ] **TASK-1.4**: Capacitor Android Integration
  - **Status**: `PENDING`
  - **Deliverable**: `capacitor.config.ts`, `client/android/` project scaffold
  - **Dependencies**: TASK-1.2
  - **Verification**: `npx cap sync android` runs successfully

---

### Phase 2: Design System & Core Shell
- [ ] **TASK-2.1**: Design System & Styling Engine (Dark/Light + Monefy Palette)
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/index.css`
  - **Dependencies**: TASK-1.2
  - **Verification**: Visual verification of dark/light themes and tokens

- [ ] **TASK-2.2**: Application Header & Time Interval Navigation
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/layout/Header.tsx`, `dateFilters.ts`
  - **Dependencies**: TASK-2.1
  - **Verification**: Arrow buttons shift period; tab clicks change interval

- [ ] **TASK-2.3**: Layout Framework & Navigation Dock
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/layout/AppLayout.tsx`, `NavigationDrawer.tsx`
  - **Dependencies**: TASK-2.2
  - **Verification**: Responsive rendering on mobile (375px) and desktop

---

### Phase 3: Data Layer & Local-First IndexedDB
- [ ] **TASK-3.1**: TypeScript Data Models & Types
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/types/index.ts`
  - **Dependencies**: TASK-1.2
  - **Verification**: Zero TypeScript compilation errors

- [ ] **TASK-3.2**: Dexie IndexedDB Store & Seed Data
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/db/localDb.ts`
  - **Dependencies**: TASK-3.1
  - **Verification**: DB opens in browser; seeded categories & accounts populate

- [ ] **TASK-3.3**: Finance Context & State Management
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/context/FinanceContext.tsx`
  - **Dependencies**: TASK-3.2
  - **Verification**: State updates reactively on CRUD operations

---

### Phase 4: Iconic Monefy Wheel & Keypad Experience
- [ ] **TASK-4.1**: Interactive Circular Donut Chart
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/monefy-wheel/CircularChart.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Slices render proportional to category spending

- [ ] **TASK-4.2**: Center Balance Hub & Quick Action Triggers
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/monefy-wheel/CenterBalance.tsx`
  - **Dependencies**: TASK-4.1
  - **Verification**: Balance updates dynamically; `+`/`-`/`⇄` buttons trigger actions

- [ ] **TASK-4.3**: Radial & Quick-Tap Category Grid
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/monefy-wheel/RadialCategoryGrid.tsx`
  - **Dependencies**: TASK-4.1
  - **Verification**: Direct tap opens keypad pre-selected with tapped category

- [ ] **TASK-4.4**: Monefy Numeric Calculator Keypad
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/keypad/NumericKeypadModal.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Math expressions compute inline; saves transaction with note/date

---

### Phase 5: Multi-Account Management, Transfers & History
- [ ] **TASK-5.1**: Transaction History Sheet & Search
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/transactions/TransactionList.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Search filters list; transactions can be edited or deleted

- [ ] **TASK-5.2**: Multi-Account Manager & Account Filter
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/accounts/AccountManager.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Selecting account filters all calculations to that account

- [ ] **TASK-5.3**: Account Transfer Modal
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/transactions/TransferModal.tsx`
  - **Dependencies**: TASK-5.2
  - **Verification**: Transfer adjusts balances between accounts without affecting net income

---

### Phase 6: Budgets, Analytics & Settings
- [ ] **TASK-6.1**: Category Budget Limits & Visual Progress
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/budgets/BudgetModal.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Progress meter warns when nearing or exceeding budget

- [ ] **TASK-6.2**: Expense Analytics & Category Breakdown View
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/analytics/ExpenseBreakdown.tsx`
  - **Dependencies**: TASK-4.1
  - **Verification**: Sorted category expense breakdown with percentage indicators

- [ ] **TASK-6.3**: Category Customizer & Currency Selector
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/components/settings/CategoryCustomizer.tsx`, `CurrencySelector.tsx`
  - **Dependencies**: TASK-3.3
  - **Verification**: Custom categories appear immediately; currency updates globally

- [ ] **TASK-6.4**: Data Export & Import (CSV / JSON)
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/utils/exportImport.ts`, `DataExportImport.tsx`
  - **Dependencies**: TASK-3.2
  - **Verification**: CSV export downloads correctly; JSON backup restores cleanly

---

### Phase 7: Cloud Synchronization Engine (PostgreSQL / Supabase)
- [ ] **TASK-7.1**: PostgreSQL Schema & Supabase DDL
  - **Status**: `PENDING`
  - **Deliverable**: `server/src/db.ts`, `server/src/db/schema.sql` (UUIDs, RLS, indexes)
  - **Dependencies**: TASK-1.3
  - **Verification**: Schema applies cleanly in PostgreSQL / Supabase SQL Editor

- [ ] **TASK-7.2**: Authentication API Endpoints
  - **Status**: `PENDING`
  - **Deliverable**: `server/src/routes/authRoutes.ts`
  - **Dependencies**: TASK-7.1
  - **Verification**: Register, login, and JWT token issuance tested

- [ ] **TASK-7.3**: Delta Sync API Endpoints (PostgreSQL)
  - **Status**: `PENDING`
  - **Deliverable**: `server/src/routes/syncRoutes.ts`
  - **Dependencies**: TASK-7.1
  - **Verification**: Pulls changes since timestamp; applies push batch upserts to Postgres

- [ ] **TASK-7.4**: Client Sync Engine Integration
  - **Status**: `PENDING`
  - **Deliverable**: `client/src/db/syncEngine.ts`, `SyncSettings.tsx`
  - **Dependencies**: TASK-7.3, TASK-3.2
  - **Verification**: Offline queue pushes changes when online; UI shows sync status

---

### Phase 8: Android Capacitor Build & Final Verification
- [ ] **TASK-8.1**: Capacitor Android Config & Sync
  - **Status**: `PENDING`
  - **Deliverable**: `client/capacitor.config.ts`, Android native sync
  - **Dependencies**: TASK-1.4, Phases 2-6
  - **Verification**: `npx cap sync android` syncs production build

- [ ] **TASK-8.2**: End-to-End System Testing & Browser Recording
  - **Status**: `PENDING`
  - **Deliverable**: Full browser validation report & recording
  - **Verification**: All core Monefy flows verified in mobile and desktop views

---

## Activity Log

| Timestamp | Task ID | Action | Notes |
|---|---|---|---|
| 2026-10-15 | - | Tracker Initialized | Created master plan & tracker files |
| 2026-10-15 | - | Architecture Update | Migrated backend DB from SQLite to PostgreSQL with Supabase compatibility (UUIDs, RLS) |
| 2026-10-15 | - | Spec Published | Synthesized & published [SPEC-01-AI-MONEFY.md](docs/specs/SPEC-01-AI-MONEFY.md) with `ready-for-agent` label |
