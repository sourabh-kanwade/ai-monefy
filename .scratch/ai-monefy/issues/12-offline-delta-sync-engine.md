# 12: Offline Delta Sync Engine & Guest Migration

**What to build:** Two-way delta synchronization between client IndexedDB and PostgreSQL backend with offline queueing, conflict resolution, and automatic guest data migration upon account creation.

**Blocked by:** 06: Multi-Account Management & Account Transfers, 11: Backend PostgreSQL Service & Auth Endpoints

**Status:** ready-for-agent

- [ ] Local mutations made while offline are recorded in a client change queue.
- [ ] Reconnecting or triggering sync pushes pending client changes to the server and pulls remote updates using timestamp deltas.
- [ ] Concurrent edits resolve deterministically using Last-Write-Wins based on modification timestamps.
- [ ] When a guest user registers or logs into a cloud account, all existing local transactions and categories are claimed by and associated with that user account.
- [ ] A sync indicator shows current synchronization status (synced, syncing, offline/error).
