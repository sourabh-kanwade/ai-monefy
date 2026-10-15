# 11: Backend PostgreSQL Service & Auth Endpoints

**What to build:** A Node.js/Express service backed by PostgreSQL / Supabase schema (UUIDs, TIMESTAMPTZ, RLS policies, soft deletes) with JWT user registration and login endpoints.

**Blocked by:** 01: Walking Skeleton (Local Expense Entry & Storage)

**Status:** ready-for-agent

- [ ] Database schema deploys cleanly with tables for users, accounts, categories, transactions, and budgets with UUID primary keys and soft delete flags.
- [ ] User registration endpoint registers new credentials and returns a signed authentication token.
- [ ] User login endpoint authenticates valid credentials and rejects invalid requests with appropriate error codes.
- [ ] Authenticated health check endpoint verifies database connectivity and token authorization.
