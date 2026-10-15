# 03: Settings CSV Import UI & Reactive Dashboard Updates

**What to build:** An intuitive user interface inside the Settings & Data Management modal allowing users to trigger a file selector for `.csv` files, view progress while parsing and importing, see descriptive success or error alert banners, and reactively update the dashboard (wheel chart, account balances, history sheet) upon import completion.

**Blocked by:** 02: CSV Database Import & Entity Resolution Engine

**Status:** ready-for-agent

- [ ] "Import Transactions (CSV)" card and action button in `SettingsModal` adjacent to JSON backup/restore.
- [ ] Hidden file input supporting `.csv` and `text/csv` with clear accessibility labels and test IDs.
- [ ] Loading indicator while parsing and executing database transaction.
- [ ] High-contrast status banner displaying import results (e.g. number of transactions imported, new accounts/categories created, or detailed error if invalid).
- [ ] Integrates with `MonefyDashboard` to invoke `refreshData()` so the donut chart, net balance, account list, and transaction history update immediately.
- [ ] Component unit tests verifying file upload, success feedback, and error reporting.
