# 01: Robust RFC-4180 CSV Parsing & Schema Detection

**What to build:** A resilient CSV parser capable of handling RFC-4180 escaping (quoted fields, commas inside quotes, escaped double quotes `""`, multiline notes), auto-detecting header schemas (AI Monefy native export, classic Monefy mobile format, and case-insensitive generic headers), parsing date strings (ISO, YYYY-MM-DD, DD/MM/YYYY) and numeric amounts (sanitizing currency symbols and negatives), and reporting descriptive row-level validation errors.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Character-level or regex-free streaming RFC-4180 CSV tokenizer accurately parses quoted fields, internal commas, quotes, and CRLF/LF newlines.
- [ ] Auto-detects AI Monefy export format (`Date,Type,Category,Account,ToAccount,Amount,Note`).
- [ ] Auto-detects and adapts classic Monefy mobile export format (`date,account,category,amount,currency,converted amount,currency,description`).
- [ ] Handles case-insensitive headers and common aliases (e.g., `Description` / `memo` for note).
- [ ] Validates dates and amounts, reporting row numbers and specific reasons for any unparseable rows.
