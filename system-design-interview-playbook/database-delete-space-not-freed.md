# You DELETE a Million Rows, But the Database Size Doesn't Shrink. Where Did the Space Go?

*Tests deep understanding of MVCC, dead tuple accumulation, vacuuming, and storage engine internals.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Direct Answer

**The space isn't freed because `DELETE` in PostgreSQL (and most MVCC databases) doesn't physically remove rows — it marks them as "dead tuples."** The storage pages still exist on disk, still occupied, still counted in table size. The rows are invisible to new transactions but the bytes remain.

This is by design. Understanding why requires understanding MVCC.

---

## 2. Why: MVCC (Multi-Version Concurrency Control)

PostgreSQL implements isolation using **MVCC**: every row has `xmin` (transaction that created it) and `xmax` (transaction that deleted it). When you `DELETE`, PostgreSQL sets `xmax = current_txn_id` on each row. The row is now **logically deleted** but physically still on the page.

```
Before DELETE:
┌─────────┬──────┬──────┬─────────────────────┐
│ xmin    │ xmax │ ctid │ data                │
├─────────┼──────┼──────┼─────────────────────┤
│ 100     │ 0    │(0,1) │ user_id=42, name=X  │ ← live row
│ 101     │ 0    │(0,2) │ user_id=43, name=Y  │ ← live row
└─────────┴──────┴──────┴─────────────────────┘

After DELETE WHERE user_id=42:
┌─────────┬──────┬──────┬─────────────────────┐
│ xmin    │ xmax │ ctid │ data                │
├─────────┼──────┼──────┼─────────────────────┤
│ 100     │ 500  │(0,1) │ user_id=42, name=X  │ ← dead tuple (xmax set)
│ 101     │ 0    │(0,2) │ user_id=43, name=Y  │ ← still live
└─────────┴──────┴──────┴─────────────────────┘
```

**Why keep dead tuples at all?** Long-running transactions that started before your DELETE still need to see the old version of those rows (snapshot isolation). Physically removing them would violate MVCC consistency guarantees.

---

## 3. What Reclaims the Space? VACUUM

`VACUUM` is PostgreSQL's garbage collector. It:
1. Scans the table for dead tuples where `xmax < oldest active transaction` (safe to remove)
2. Marks those page slots as reusable (free space map updated)
3. **Does NOT return space to the OS** — pages are kept for future inserts

```sql
-- Run manually (non-blocking, marks space as reusable)
VACUUM orders;

-- Check dead tuple count before/after
SELECT n_dead_tup, n_live_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'orders';
```

**VACUUM vs VACUUM FULL:**

| Operation | What It Does | Downtime? | Returns Space to OS? |
|---|---|---|---|
| `VACUUM` | Marks dead slots reusable | None (concurrent) | **No** — space stays in table file |
| `VACUUM FULL` | Rewrites entire table compactly | **Full table lock** | **Yes** — shrinks file on disk |
| `CLUSTER` | Rewrites + sorts by index | **Full table lock** | Yes |
| `pg_repack` | Rewrites without full lock | Minimal | Yes (online) |

---

## 4. Why Didn't Autovacuum Handle It?

PostgreSQL's `autovacuum` daemon runs automatically, but it may be too slow or misconfigured for bulk deletes:

```sql
-- Default autovacuum triggers when dead tuples > max(
--   autovacuum_vacuum_threshold (50) + autovacuum_vacuum_scale_factor (0.2) * n_live_tup
-- )
-- At 1M rows live: triggers after 200,050 dead tuples
-- After deleting 1M rows: autovacuum should trigger (eventually)
-- But if autovacuum is disabled, or vacuum_cost_delay is too high, it lags
```

**Causes of autovacuum lag after bulk delete:**
- `autovacuum = off` (don't disable this)
- `vacuum_cost_delay` too high → autovacuum throttles itself to avoid I/O impact
- Long-running transactions hold back the xmin horizon → dead tuples can't be removed yet even after VACUUM
- Table has `fillfactor = 100` → no free space in existing pages → new inserts can't reuse space

---

## 5. The xmin Horizon Problem

Even after VACUUM runs, dead tuples from your DELETE cannot be removed if there is **any active transaction older than the DELETE**:

```
Transaction A: BEGIN at 9:00am (long-running analytics query, still open at 11pm)
Transaction B: DELETE 1M rows at 11pm

VACUUM at 11:05pm:
  → Oldest active transaction = Transaction A (started at 9am)
  → xmax of deleted rows = 500 (your DELETE txn)
  → Transaction A's snapshot ID < 500? Yes → it could still see those rows
  → VACUUM cannot remove them. Dead tuples persist.
```

**Fix:** Identify and kill long-running transactions that hold back xmin:

```sql
SELECT pid, age(backend_xid), query, state, query_start
FROM pg_stat_activity
WHERE backend_xid IS NOT NULL
ORDER BY age(backend_xid) DESC;

-- If safe, terminate the blocker:
SELECT pg_terminate_backend(pid);
```

---

## 6. Index Bloat: The Hidden Cost

DELETE doesn't just create dead tuples in the heap — it also creates dead entries in every B-tree index on the table. Index bloat from 1M deleted rows:

```sql
-- Check index bloat
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as idx_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND relname = 'orders';

-- VACUUM ANALYZE reclaims index dead entries too
VACUUM ANALYZE orders;

-- For severe index bloat, REINDEX CONCURRENTLY rebuilds without locking
REINDEX INDEX CONCURRENTLY idx_orders_user_status;
```

---

## 7. Production Playbook: Safe Space Reclamation

```
Step 1: VACUUM ANALYZE <table>
        → Marks dead slots reusable, updates statistics
        → No lock, no OS space return — but future inserts reuse space

Step 2: Monitor pg_stat_user_tables → n_dead_tup should drop to ~0
        If it doesn't → check for xmin horizon blocker (long-running txn)

Step 3: If table file must shrink on disk (e.g., autovacuum lag caused disk full):
        Option A: pg_repack (online, minimal lock) — preferred in production
        Option B: VACUUM FULL (offline, full lock) — only for maintenance windows

Step 4: If indexes bloated:
        REINDEX CONCURRENTLY idx_<name>

Step 5: Tune autovacuum for tables with frequent bulk deletes:
        ALTER TABLE orders SET (
          autovacuum_vacuum_scale_factor = 0.01,  -- vacuum after 1% dead (not 20%)
          autovacuum_vacuum_cost_delay = 2         -- less throttling
        );
```

---

## 8. MySQL (InnoDB) Comparison

MySQL's InnoDB has the same concept but different mechanics:
- **Undo log:** Deleted rows are moved to the undo log (instead of staying in-page like PostgreSQL)
- **Purge thread:** Background purge thread cleans undo log asynchronously
- `ibdata1` or undo tablespace can grow large if purge lags behind long transactions
- `innodb_purge_threads` controls parallelism of space reclamation

---

## 9. Theoretical Frameworks

### Write Amplification

Every `DELETE` of 1M rows generates:
- 1M dead tuple markers in the heap (xmax set on each row)
- Dead index entries across all N indexes (N × 1M entries)
- Undo/WAL records for the transaction log

Total write amplification = `(1 + N_indexes)` × rows deleted. For a table with 5 indexes, deleting 1M rows writes 6M records worth of data. This is why **bulk deletes are expensive** even though they "logically" just remove data.

### PACELC — Latency vs Consistency in MVCC

MVCC trades write-path simplicity (EL: just set xmax, no blocking) for read-path cleanup cost (EC: VACUUM must run to maintain storage consistency). The latency benefit is that DELETE never blocks concurrent reads — it always completes immediately. The consistency cost is eventual space reclamation, not immediate.

### CAP Applied to Long-Running Transactions

A long-running analytics transaction that holds the xmin horizon is a CAP consistency blocker — it forces the system to maintain consistency of old row versions for the transaction's snapshot, which prevents partition (physical reclamation) of that data. The fix (killing the transaction) is a forced availability-vs-consistency trade-off.

---

## 10. Interview-Ready One-Liner

> "DELETE sets xmax on rows (MVCC) — they become dead tuples, invisible to new transactions but still physically on disk. `VACUUM` reclaims the space within the table file for reuse; `VACUUM FULL` or `pg_repack` return it to the OS. The most common blocker is a long-running transaction holding the xmin horizon, which prevents VACUUM from removing the dead tuples even if it runs."
