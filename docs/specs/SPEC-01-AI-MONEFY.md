<!-- triage: ready-for-agent -->
# Spec: AI Monefy - Personal Expense Tracker (Web & Android)

## Problem Statement

Users need an effortless, zero-friction way to record daily expenses and incomes on both web and mobile devices without mandatory login screens, slow network roundtrips, or cluttered, spreadsheet-like interfaces. Most personal finance tools require upfront account registration, depend entirely on constant cloud connectivity, and lack intuitive visual spending distribution at a glance.

## Solution

AI Monefy delivers a high-performance, local-first personal finance application inspired by Monefy's iconic circular donut chart, radial categories, and inline calculator keypad. The application runs immediately in offline Guest Mode on Web (PWA) and Android (Capacitor), storing data locally in IndexedDB. Users can seamlessly link a cloud account to synchronize data across multiple devices via a lightweight Node.js/Express delta-sync engine backed by PostgreSQL (fully compatible with Supabase).

## User Stories

1. As a new user, I want to open the app and immediately start recording transactions without creating an account or signing in, so that I experience zero friction when tracking money.
2. As a user, I want to see a central donut chart showing my expense distribution by category with percentage slices, so that I can immediately understand where my money went.
3. As a user, I want to see my net balance in the center of the wheel with clear visual distinction (green for surplus, red for deficit), so that I know my overall financial standing.
4. As a user, I want to tap on any radial category icon around the chart to instantly open the entry keypad with that category pre-selected, so that recording takes fewer than two taps.
5. As a user, I want quick '+' (Income) and '-' (Expense) buttons at the center hub, so that I can record a transaction by choosing the category after entering the amount.
6. As a user, I want a built-in numeric keypad with inline arithmetic operators (+, -, *, /), so that I can calculate split receipts or subtotals directly inside the app without switching to an external calculator.
7. As a user, I want to attach optional text notes and custom transaction dates to each entry, so that I have clear context when reviewing records later.
8. As a user, I want to switch time intervals between Day, Week, Month, Year, All Time, or a custom interval using navigation tabs and left/right arrows, so that I can analyze expenses over specific periods.
9. As a user, I want to manage multiple financial accounts (Cash, Bank Card, Savings) and view individual and combined balances, so that I can track money across all payment methods.
10. As a user, I want to filter the entire dashboard and wheel to a specific account or view all accounts combined, so that I can see spending isolated to a single payment method.
11. As a user, I want to transfer funds between accounts (e.g. ATM withdrawal from Card to Cash), so that account balances update accurately without recording a false income or expense.
12. As a user, I want a collapsible transaction history sheet grouped by date with real-time search, so that I can find, inspect, edit, or delete previous entries.
13. As a user, I want to set monthly budget limits per expense category with visual progress meters (green, amber, red warnings), so that I avoid overspending.
14. As a user, I want a dedicated expense analytics view ranking categories by total spend and percentage, so that I can identify my biggest cost drivers.
15. As a user, I want to create and customize categories with custom icons and colors, so that the tracker reflects my unique lifestyle.
16. As a user, I want to select my preferred global currency (USD, EUR, GBP, INR, etc.), so that all monetary values display in my local denomination.
17. As a user, I want to export my transaction data to CSV and create full JSON database backups, so that I have complete control and ownership over my financial records.
18. As a user, I want to restore my database from a JSON backup file, so that I can recover data if I switch devices.
19. As a user, I want to toggle between dark theme (Obsidian Slate) and light theme, so that the app is comfortable to use in any lighting condition.
20. As a user, I want all my data stored locally on my device first, so that the application is fully functional with zero latency even when offline or in airplane mode.
21. As a user, I want to optionally create a cloud account and have my local data automatically uploaded and synchronized, so that I never lose data when upgrading devices.
22. As a user with multiple devices, I want changes made offline on any device to automatically synchronize when reconnecting, so that my balance remains consistent everywhere.
23. As a mobile user, I want an installable Android APK and PWA with native haptics, smooth gesture interactions, and a clean mobile viewport layout, so that it feels like a native mobile app.

## Implementation Decisions

- **Architectural Paradigm**: Local-First architecture using client-side IndexedDB as the primary source of truth, complemented by an offline change queue that asynchronously syncs with a PostgreSQL backend.
- **Client Technology**: Single codebase built with React 19, TypeScript, and Vite, packaged for Android using Capacitor.
- **Backend Service**: Independent Node.js / Express service providing JSON REST endpoints for authentication and delta synchronization.
- **Database & Storage Compatibility**: PostgreSQL schema using standard UUID primary keys, UTC timestamps (`TIMESTAMPTZ`), soft deletes (`is_deleted`), and Row-Level Security (RLS) compatible with both self-hosted PostgreSQL and managed Supabase instances.
- **Guest-to-Cloud Migration**: Guest Mode assigns a local client UUID to records. Upon account registration, the sync engine claims and associates all local records with the authenticated user ID.
- **Monefy Wheel Topography**: Adaptive radial ring placing the top 12–16 active categories evenly around the circular donut chart, with an integrated overflow drawer for additional categories to ensure touch-target ergonomics on mobile (375px) viewports.
- **Keypad Evaluator**: Deterministic arithmetic parser embedded in the numeric keypad supporting addition, subtraction, multiplication, and division with standard operator precedence.
- **Conflict Resolution**: Deterministic Last-Write-Wins (LWW) resolution based on UTC modification timestamps (`updated_at`) with UUID tie-breaking. Deletions are propagated via soft-delete flags.
- **Currency Model**: Single global display currency configured in settings for v1, ensuring instant client-side balance aggregation without foreign exchange rate network dependencies.

## Testing Decisions

- **Testing Principles**: Test purely through external interfaces (seams), validating inputs against observed domain outcomes without asserting on private internal state or mock calls.
- **Client Seam Testing**: Exercise the `FinanceEngine` interface across all transaction types (incomes, expenses, transfers), timeframe filter ranges, budget threshold crossings, and offline queue mutations using in-memory IndexedDB adapters.
- **Sync Seam Testing**: Exercise HTTP endpoints (`/api/sync/push`, `/api/sync/pull`) against a test PostgreSQL instance, validating authorization boundaries, timestamp delta retrieval, soft-delete propagation, and concurrent LWW updates.
- **UI / E2E Testing**: Automated viewport testing validating donut chart rendering, radial icon clicks, keypad math calculations, and theme toggling across 375px mobile and 1280px desktop viewports.

## Out of Scope

- Multi-currency accounts requiring real-time automated foreign exchange rate conversion.
- Automated bank account scraping / Plaid / Open Banking API synchronization.
- Multi-user shared/joint budgets with real-time operational transformation.
- Native iOS Xcode project build (Capacitor Android and Web PWA are the target deployment platforms).

## Further Notes

- The system tracker (`TRACKER.md`) reflects 8 independent implementation phases across 27 tasks.
- The schema migration file (`schema.sql`) will be maintained as pure ANSI SQL with Supabase-compatible RLS definitions so it can be deployed directly into Supabase SQL Editor or executed in a local PostgreSQL container.
