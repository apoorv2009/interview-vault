# Your Database Has Grown from 10 Million to 1 Billion Records. Queries That Took 50ms Now Take 10 Seconds. How Do You Fix It, Without Replacing the Database?

*Interview Question #72. Tests systematic query optimization, indexing strategy, partitioning, and read-path architecture at scale.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Diagnose Before You Fix

A principal engineer never jumps to "add an index." The correct first move is to **profile the slow queries** with a structured hypothesis:

```sql
-- PostgreSQL: find the worst offenders
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- EXPLAIN ANALYZE the specific slow query
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

Look for:
- **Sequential scans** on large tables (no index, or index not used)
- **Nested loop joins** on unindexed foreign keys at 1B rows
- **Hash joins spilling to disk** (work_mem too low)
- **Index bloat** — index exists but is fragmented or stale
- **Lock contention** — queries blocked on row locks

---

## 2. Fix Hierarchy — In Order of Impact

### 2.1 Index Optimization (Immediate, Zero Downtime)

The most common cause of 50ms → 10s at 100x data growth: the query plan switched from **index scan** to **sequential scan** because the query planner's cost estimate said the index was no longer selective enough.

```sql
-- Check if your index is being used
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'pending';
-- If you see "Seq Scan" on a 1B row table → add composite index

CREATE INDEX CONCURRENTLY idx_orders_user_status
ON orders(user_id, status)
WHERE status = 'pending';  -- Partial index: only index 'pending' rows (10% of data)
```

**Composite index column order matters:**
- Put the highest-cardinality column first (user_id) unless you always filter by both
- If you always filter `status = 'pending'` first → put status first for better selectivity

**Index types for 1B rows:**
| Index Type | Best For | Notes |
|---|---|---|
| B-tree | Equality + range queries (default) | Works for most cases |
| Partial index | Queries filtering on a common predicate | 10x smaller; faster maintenance |
| Covering index (`INCLUDE`) | Avoid heap fetches entirely | Include columns in SELECT to make it index-only scan |
| BRIN | Monotonically increasing columns (created_at, order_id) | Tiny size; very fast for range scans on time-series data |
| Hash index | Pure equality (=) only | Faster than B-tree for equality; no range |

---

### 2.2 Table Partitioning (Medium Effort, High Impact)

At 1B rows, even indexed queries must scan too many index pages. **Partition the table** so each query only touches a fraction of the data.

```sql
-- Partition orders by created_at (monthly)
CREATE TABLE orders (
    id BIGINT,
    user_id BIGINT,
    status VARCHAR,
    created_at TIMESTAMPTZ,
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- Each partition: ~8M rows (1B / ~120 months)
```

**Partition pruning:** A query `WHERE created_at > NOW() - INTERVAL '30 days'` only touches the last 1–2 partitions (16M rows) instead of scanning all 1B rows. Query time drops proportionally.

**Partition strategies:**
| Strategy | Use When | Prune Key |
|---|---|---|
| Range (time) | Time-series data, append-heavy | created_at, order_date |
| List (region) | Multi-tenant / geo-sharded | country_code, tenant_id |
| Hash | Even distribution, no natural range | user_id % N |

---

### 2.3 Query Rewrite and N+1 Elimination

At scale, bad query patterns become catastrophic:

```sql
-- BAD: N+1 — 1B rows means N can be millions
for user_id in user_ids:
    SELECT * FROM orders WHERE user_id = ?  -- separate query per user

-- GOOD: Single batched query
SELECT * FROM orders WHERE user_id = ANY(ARRAY[1,2,3,...,1000])

-- BAD: SELECT * fetches all columns including large JSONB/TEXT blobs
SELECT * FROM products WHERE category = 'electronics'

-- GOOD: Project only needed columns → smaller rows → more rows per page → fewer I/O
SELECT id, name, price FROM products WHERE category = 'electronics'
```

---

### 2.4 Read Replicas and CQRS

At 1B rows, reads and writes compete for the same I/O. Separate them:

```
Write path → Primary DB (strong consistency, row locks)
Read path  → Read Replica(s) (async replication, acceptable lag for reads)
           → Or: Materialized views for pre-aggregated reports
           → Or: Dedicated OLAP store (ClickHouse/BigQuery) for analytics
```

**Materialized views** for expensive aggregations:

```sql
CREATE MATERIALIZED VIEW daily_order_summary AS
SELECT DATE(created_at) as date, status, COUNT(*) as cnt, SUM(amount) as total
FROM orders
GROUP BY DATE(created_at), status;

REFRESH MATERIALIZED VIEW CONCURRENTLY daily_order_summary;  -- Schedule hourly
```

---

### 2.5 Caching Layer

Add Redis/Memcached in front of frequent read patterns:

- **User order history:** Cache for 60s (tolerate slight staleness for read-heavy dashboards)
- **Product catalog:** Cache for 5 minutes (rarely changes)
- **Aggregates (total orders today):** Cache for 30s; recompute async

---

### 2.6 Archival — Reduce Live Table Size

If 80% of your 1B rows are orders from 3+ years ago that are rarely queried:

- **Archive to cold storage:** Move old rows to a separate `orders_archive` table or S3 (via pg_partman or custom scripts)
- **Live table stays small:** 200M recent rows → all original query performance restored without changing the schema
- **Access pattern:** Queries on recent data hit the live table; historical queries hit the archive or a data warehouse

---

## 3. Systematic Fix Sequence

```
Step 1: EXPLAIN ANALYZE → identify bottleneck (seq scan? lock? join?)
Step 2: Add/fix indexes (CONCURRENTLY — no downtime)
Step 3: Rewrite bad queries (N+1, SELECT *, missing predicates)
Step 4: Add read replicas → route read traffic off primary
Step 5: Partition table → partition pruning on key query patterns
Step 6: Archive old data → shrink live table
Step 7: Materialized views → pre-aggregate expensive reports
Step 8: Caching layer → eliminate DB hits for hot reads
```

---

## 4. Theoretical Frameworks

### CAP Theorem

Read replicas introduce **eventual consistency** (AP). The primary is CP. Route consistency-sensitive reads (checkout stock check) to primary; route tolerant reads (order history, reports) to replicas. Never send everything to primary — at 1B rows this is the most common scaling mistake.

### PACELC — Latency vs Consistency

- **EC (Consistency):** Read from primary always. Strong consistency but primary becomes the bottleneck at 1B rows.
- **EL (Latency):** Read from replica. Accept up to replication lag (typically < 100ms, spikeable to seconds). For most user-facing reads (order history, product listing), this is acceptable.

**Design rule:** Define acceptable staleness per query type, not globally.

### Write Amplification

Indexes are write amplification: every `INSERT` / `UPDATE` / `DELETE` must also update all indexes on the table. At 1B rows with 8 indexes, each write touches 8+ B-tree nodes. The fix: drop unused indexes (`pg_stat_user_indexes` → `idx_scan = 0` for 30+ days → drop it). Keep only the indexes that are actually used.

### Read/Write Trade-off

Partitioning, materialized views, and caching are all **read-path investments that increase write complexity**:
- Partitioned table: INSERT must route to correct partition (handled transparently by DB, but adds overhead)
- Materialized views: Must be refreshed (scheduled write) after source changes
- Cache: Must be invalidated on write

At 1B rows, the **read-to-write ratio is typically 100:1 or higher** — optimizing the read path at the cost of slightly more write overhead is always the right trade-off.

---

## 5. Interview-Ready Priority Matrix

| Fix | Time to Implement | Downtime Required | Expected Impact |
|---|---|---|---|
| EXPLAIN + add missing index | Hours | None (CONCURRENTLY) | **10x–100x** for specific queries |
| Rewrite N+1 / SELECT * queries | Days | None | **5x–50x** |
| Read replicas | Days | None | **2x–5x** throughput |
| Partial/covering/BRIN indexes | Days | None | **2x–10x** for specific patterns |
| Table partitioning | Weeks | Minimal (online) | **10x–100x** for range queries |
| Archival | Weeks | None | Reduces table size; restores original performance |
| Materialized views | Days | None | Eliminates expensive aggregations entirely |
