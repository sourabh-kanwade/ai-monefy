# 04: Monefy CSV Format Export & Import Fidelity

**What to build:** Native Monefy CSV format (`Monefy.Data.<DD-MM-YY>.csv`) export and import fidelity.
- Format specification: `date,account,category,amount,currency,converted amount,currency,description`
- Export transactions chronologically formatted with `DD/MM/YYYY`, signed amounts with locale thousands separators, account names, transfer syntax (`Payment -> <Account>`), currency code, and descriptions.
- Auto-detect currency on import and update active app currency (`INR` -> `₹`).
- High-fidelity category mappings for classic Monefy categories (e.g. Car, Eating out, House, Clothes, Sports, Communications, Toiletry).
- 100% round-trip fidelity verified against `Monefy.Data.15-10-26.csv`.

**Blocked by:** 01, 02, 03

**Status:** resolved

- [x] Export transactions in `Monefy.Data.<DD-MM-YY>.csv` format with RFC-4180 escaping and locale separators.
- [x] Support both `'monefy'` (default) and `'standard'` formats in `exportTransactionsToCSV`.
- [x] Auto-assign authentic icons and palette colors for newly created Monefy categories on import.
- [x] Propagate detected currency (`detectedCurrency`) through `importTransactionsFromCSV` and auto-set app currency.
- [x] Verify complete 130-row round-trip match against `Monefy.Data.15-10-26.csv`.
- [x] Update `SettingsModal` and `MonefyDashboard` to export with native filename and reactively sync detected currency.

## Comments
- Implemented `exportTransactionsToCSV` supporting Monefy export format (`date,account,category,amount,currency,converted amount,currency,description`) as the default export format.
- Implemented date formatting to `DD/MM/YYYY` and signed amount formatting with locale grouping (`en-IN` for INR, `en-US` for USD, etc.) matching Monefy numbers like `"-1,000"`, `"1,80,000"`, `-40`, and `"-5,101.3"`.
- Added `MONEFY_CATEGORY_DEFAULTS` to map classic Monefy categories (Car, Eating out, House, Clothes, Sports, Communications, Toiletry, etc.) to authentic Lucide icons and vibrant palette colors during import.
- Added `detectedCurrency` propagation to `importTransactionsFromCSV`, `SettingsModal`, and `MonefyDashboard` to automatically switch global currency to the imported file's currency (e.g. `INR` -> `₹`).
- Updated export filename generator in `SettingsModal` to follow Monefy's native naming: `Monefy.Data.<DD-MM-YY>.csv`.
- Verified with comprehensive test suite `monefyDataFidelity.test.ts` achieving 100% line-by-line parity against `Monefy.Data.15-10-26.csv` across all 130 rows.
