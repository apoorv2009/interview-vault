# SQL & PostgreSQL — Comprehensive Interview Prep

> **How this file works:** Each interview question is appended below the foundation notes with the ideal answer, edge cases, and optimization tips. By the end of the session this is a standalone cheat sheet.

---

## Part 0 — Foundation Reference (Seed)

---

### 0.1 Relational Database Fundamentals

**RDBMS** — Relational Database Management System. Stores data in tables (relations) with rows (tuples) and columns (attributes). Tables relate to each other via keys.

**Keys**

| Key Type      | Purpose |
|---------------|---------|
| Primary Key   | Uniquely identifies each row. Cannot be NULL. One per table. |
| Foreign Key   | Column that references a PK in another table. Enforces referential integrity. |
| Unique Key    | Guarantees uniqueness but allows one NULL. |
| Composite Key | PK/UK made of multiple columns. |
| Surrogate Key | System-generated identifier (serial, UUID). No business meaning. |
| Natural Key   | Derived from real-world data (email, SSN). Has business meaning. |

**Constraints** — `NOT NULL`, `UNIQUE`, `CHECK`, `DEFAULT`, `FOREIGN KEY`, `PRIMARY KEY`

---

### 0.2 Normalization

Goal: eliminate redundancy and update anomalies.

| Normal Form | Rule |
|-------------|------|
| **1NF** | No repeating groups; every column is atomic; each row is unique. |
| **2NF** | 1NF + no partial dependency (every non-key column depends on the *whole* PK). Only matters for composite PKs. |
| **3NF** | 2NF + no transitive dependency (non-key columns depend only on the PK, not on other non-key columns). |
| **BCNF** | Stricter 3NF — every determinant is a candidate key. |
| **4NF** | BCNF + no multi-valued dependencies. |

**Denormalization** — intentionally breaking normal forms for read performance (e.g., storing pre-computed totals). Common in OLAP/data warehouses.

---

### 0.3 ACID Properties

| Property    | Meaning |
|-------------|---------|
| **Atomicity** | Transaction is all-or-nothing. Either every operation commits or none do. |
| **Consistency** | Database moves from one valid state to another. Constraints are never violated. |
| **Isolation** | Concurrent transactions behave as if they run serially. |
| **Durability** | Committed transactions survive crashes (persisted to disk via WAL). |

---

### 0.4 Transaction Isolation Levels

Ordered from least to most strict:

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-----------|---------------------|--------------|
| **Read Uncommitted** | ✅ possible | ✅ possible | ✅ possible |
| **Read Committed** *(PG default)* | ❌ prevented | ✅ possible | ✅ possible |
| **Repeatable Read** | ❌ | ❌ | ✅ possible (prevented in PG) |
| **Serializable** | ❌ | ❌ | ❌ |

PostgreSQL's `REPEATABLE READ` also prevents phantom reads (unlike the SQL standard).

---

### 0.5 SQL Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **DDL** | CREATE, ALTER, DROP, TRUNCATE, RENAME | Define schema structure |
| **DML** | SELECT, INSERT, UPDATE, DELETE | Manipulate data |
| **DCL** | GRANT, REVOKE | Control permissions |
| **TCL** | BEGIN, COMMIT, ROLLBACK, SAVEPOINT | Manage transactions |

---

### 0.6 JOINs

```sql
-- INNER JOIN: only matching rows from both tables
SELECT * FROM orders o INNER JOIN customers c ON o.customer_id = c.id;

-- LEFT JOIN: all rows from left + matching from right (NULL if no match)
SELECT * FROM customers c LEFT JOIN orders o ON c.id = o.customer_id;

-- RIGHT JOIN: all rows from right + matching from left
-- FULL OUTER JOIN: all rows from both, NULL where no match
-- CROSS JOIN: cartesian product (every row x every row)
-- SELF JOIN: table joined to itself (e.g., employee → manager)
```

**Key interview trap:** `LEFT JOIN` with a `WHERE` on the right table turns it into an `INNER JOIN`.

---

### 0.7 Aggregates, GROUP BY, HAVING

```sql
SELECT department, COUNT(*), AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000;
```

- `WHERE` filters *before* aggregation (on rows).
- `HAVING` filters *after* aggregation (on groups).
- Every column in `SELECT` that is not aggregated must appear in `GROUP BY`.

---

### 0.8 Subqueries vs CTEs vs Window Functions

**Subquery** — query nested inside another. Can be correlated (references outer query) or non-correlated.

**CTE (Common Table Expression)** — named temporary result set defined with `WITH`. Improves readability. In PostgreSQL, CTEs are sometimes optimization fences (prior to PG 12).

```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT * FROM ranked WHERE rn = 1;
```

**Window Functions** — compute over a set of rows related to the current row without collapsing them.

```sql
-- Syntax: function() OVER (PARTITION BY ... ORDER BY ... ROWS/RANGE ...)
ROW_NUMBER()   -- unique sequential integer per partition
RANK()         -- gaps on ties
DENSE_RANK()   -- no gaps on ties
LAG(col, n)    -- value n rows before current
LEAD(col, n)   -- value n rows after current
SUM() OVER ()  -- running total
NTILE(n)       -- divide rows into n buckets
```

---

### 0.9 PostgreSQL Data Types (Key Ones)

| Category | Types |
|----------|-------|
| **Integer** | `smallint` (2B), `integer`/`int` (4B), `bigint` (8B), `serial`/`bigserial` (auto-increment) |
| **Decimal** | `numeric(p,s)` (exact), `real` (4B float), `double precision` (8B float) |
| **Text** | `char(n)` (padded), `varchar(n)` (limited), `text` (unlimited) — prefer `text` in PG |
| **Date/Time** | `date`, `time`, `timestamp`, `timestamptz` (with timezone), `interval` |
| **Boolean** | `boolean` (`true`/`false`/`null`) |
| **JSON** | `json` (stores as-is), `jsonb` (binary, indexed, faster queries) — **prefer `jsonb`** |
| **UUID** | `uuid` — 128-bit unique identifier |
| **Array** | `int[]`, `text[]` — native array columns |
| **Network** | `inet`, `cidr`, `macaddr` |
| **Geometric** | `point`, `line`, `polygon`, `circle` |

---

### 0.10 PostgreSQL Indexes

| Index Type | Algorithm | Best For |
|------------|-----------|----------|
| **B-tree** | Balanced tree | Default. Equality, range, ORDER BY, LIKE 'foo%' |
| **Hash** | Hash table | Equality only (`=`). Faster than B-tree for pure equality in PG 10+ |
| **GIN** | Inverted index | `jsonb`, arrays, full-text search (`tsvector`) |
| **GiST** | Generalized search tree | Geometric data, full-text, range types |
| **BRIN** | Block range index | Very large tables with naturally ordered data (timestamps, sequential IDs) |
| **SP-GiST** | Space-partitioned GiST | Non-balanced structures: quadtrees, k-d trees |

**Index tips:**
- Partial index: `CREATE INDEX ON orders(customer_id) WHERE status = 'pending';`
- Expression index: `CREATE INDEX ON users(lower(email));`
- Covering index (index-only scan): `CREATE INDEX ON orders(customer_id) INCLUDE (total);`
- Too many indexes slow down writes (every INSERT/UPDATE/DELETE must update indexes).

---

### 0.11 EXPLAIN / EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
```

- `EXPLAIN` — shows the *planned* execution plan (estimated costs).
- `EXPLAIN ANALYZE` — *executes* the query and shows *actual* timings.
- `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` — most detailed output.

**Key nodes to recognize:**

| Node | Meaning |
|------|---------|
| `Seq Scan` | Full table scan — check if an index would help |
| `Index Scan` | Uses index, fetches heap rows |
| `Index Only Scan` | All data in index — no heap access (fastest) |
| `Bitmap Heap Scan` | Combines multiple indexes, then fetches rows |
| `Hash Join` | Best for large unsorted tables |
| `Nested Loop` | Best when inner side is small or indexed |
| `Merge Join` | Best when both sides are sorted |

**Cost format:** `cost=startup..total` — optimizer estimates, not ms.

---

### 0.12 MVCC — Multi-Version Concurrency Control

PostgreSQL does not use read locks. Instead, each row has:
- `xmin` — transaction ID that created the row
- `xmax` — transaction ID that deleted/updated the row (0 if still live)

Each transaction sees a *snapshot* of the database. Readers never block writers and writers never block readers. Old row versions must be cleaned up by `VACUUM`.

---

### 0.13 WAL — Write-Ahead Logging

Before any data change hits the heap files, it is written to the WAL (a sequential log). On crash, PostgreSQL replays the WAL to recover. Also the foundation of:
- **Streaming replication** — standby servers replay WAL in near real-time.
- **Logical replication** — decode WAL to row-level changes for selective replication.
- **Point-in-time recovery (PITR)** — restore to any moment by replaying WAL.

---

### 0.14 VACUUM and AUTOVACUUM

`VACUUM` reclaims storage occupied by dead tuples (old row versions from MVCC). `AUTOVACUUM` runs it automatically.

- `VACUUM` — marks dead tuples as reusable (doesn't always return space to OS).
- `VACUUM FULL` — rewrites entire table, returns space to OS. Locks table. Avoid in production.
- `ANALYZE` — updates table statistics used by the query planner.
- `VACUUM ANALYZE` — does both.

---

### 0.15 Partitioning

Split one logical table into physical sub-tables for performance and manageability.

```sql
-- Range partitioning (common for time-series)
CREATE TABLE orders (id bigint, created_at date, total numeric)
PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024 PARTITION OF orders
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

Types: **Range**, **List**, **Hash**

Benefits: partition pruning (query only relevant partitions), faster vacuuming, easier data archival (drop partition vs DELETE).

---

### 0.16 Views and Materialized Views

```sql
-- View: stored query, always fresh, no storage
CREATE VIEW active_users AS
SELECT * FROM users WHERE active = true;

-- Materialized view: stores result, must be refreshed manually
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT date_trunc('month', created_at), SUM(total) FROM orders GROUP BY 1;

REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;
```

`CONCURRENTLY` allows reads during refresh but requires a unique index.

---

### 0.17 Common Performance Patterns

| Problem | Fix |
|---------|-----|
| Seq scan on large table | Add index on filter/join column |
| N+1 queries | Use JOIN or batch fetch |
| Slow COUNT(*) | Use `pg_stat_user_tables` for estimates; partial count with condition |
| Slow JOIN | Ensure join columns are indexed; check statistics with ANALYZE |
| Lock contention | Use `SELECT ... FOR UPDATE SKIP LOCKED` for queues; short transactions |
| Bloat | Run VACUUM; tune autovacuum thresholds |
| Large result sets | Use pagination (`LIMIT/OFFSET` or keyset pagination) |

---

### 0.18 Roles and Security

```sql
CREATE ROLE readonly;
GRANT CONNECT ON DATABASE mydb TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

CREATE USER analyst WITH PASSWORD 'secret';
GRANT readonly TO analyst;
```

**Row-Level Security (RLS):**
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_orders ON orders
  USING (user_id = current_setting('app.current_user_id')::int);
```

---

### 0.19 Useful PostgreSQL-Specific Features

| Feature | Description |
|---------|-------------|
| `ON CONFLICT` (upsert) | `INSERT ... ON CONFLICT (col) DO UPDATE SET ...` |
| `RETURNING` | `INSERT/UPDATE/DELETE ... RETURNING id, name` |
| `LATERAL` | Subquery that references columns from preceding FROM items |
| `GENERATE_SERIES` | Generate sequences of numbers/timestamps |
| `UNNEST` | Expand arrays into rows |
| `COALESCE` | Return first non-null value |
| `NULLIF` | Return NULL if two values are equal |
| `DISTINCT ON` | Keep first row per group (PostgreSQL-only) |
| `pg_stat_*` views | Live performance and activity statistics |

---

### 0.20 Quick Formula Sheet

```
SELECT execution order:
  FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT

Index selectivity: high cardinality = good candidate (user_id), low cardinality = bad (boolean)

Keyset pagination (fast):        vs    OFFSET pagination (slow):
  WHERE id > :last_seen_id              OFFSET 10000 LIMIT 20
  ORDER BY id LIMIT 20                  (must scan and skip 10k rows)
```

---

## Part 1 — Interview Q&A

### Q1 — DELETE vs TRUNCATE vs DROP

**Question:** You need to remove all rows from a `logs` table. What is the difference between `DELETE FROM logs`, `TRUNCATE logs`, and `DROP TABLE logs`? Which would you choose?

**Ideal Answer:**

| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Removes rows | Yes (filtered or all) | All rows | All rows + table structure |
| Removes structure | No | No | Yes |
| Transactional in PostgreSQL | ✅ Yes | ✅ Yes (unlike MySQL) | ❌ No |
| WAL / logging | Every row logged individually | Deallocates pages — minimal WAL | Minimal |
| Fires row-level triggers | Yes | No | No |
| Resets identity/sequences | No | Yes (`RESTART IDENTITY`) | Yes |
| Respects FK constraints | Yes | ❌ Fails if FK exists (need `CASCADE`) | ❌ Fails similarly |
| Speed on large table | Slow | Very fast | Instant |

**For removing ALL rows from `logs`:** use `TRUNCATE logs` — it deallocates data pages instead of logging each row deletion, making it orders of magnitude faster on large tables.

**Use DELETE when:**
- Removing specific rows with a `WHERE` clause
- You need row-level triggers to fire
- The table is small enough that performance is not a concern

**Use TRUNCATE when:**
- Removing all rows from a large table
- Resetting a staging/log table between runs
- You do NOT need triggers to fire

**Use DROP when:**
- Removing the table entirely (structure + data)
- Part of a schema migration cleanup

**Edge Cases:**
- `TRUNCATE` in PostgreSQL IS transactional — you can roll it back inside a transaction block (unlike MySQL where it causes an implicit commit)
- `TRUNCATE logs CASCADE` will also truncate child tables that have FK references to `logs`
- `TRUNCATE` resets sequences if `RESTART IDENTITY` is specified: `TRUNCATE logs RESTART IDENTITY`
- `DELETE` without `WHERE` still produces WAL bloat and leaves dead tuples requiring `VACUUM`
- A `DELETE` inside a transaction that is later rolled back leaves no trace; a `TRUNCATE` rolled back similarly leaves no trace

**Optimization Tips:**
- After a large `DELETE`, run `VACUUM ANALYZE` to reclaim space and update statistics
- If you need to delete millions of rows matching a condition, batch them: `DELETE FROM logs WHERE id IN (SELECT id FROM logs WHERE ... LIMIT 10000)` in a loop — avoids long-running transactions and lock buildup
- For archival patterns: copy rows to an archive table first, then `DELETE` or `TRUNCATE`

**SQL vs PostgreSQL:**

| Behaviour | Standard SQL | PostgreSQL |
|-----------|-------------|------------|
| `TRUNCATE` transactional | ❌ Implicit commit (MySQL) — cannot rollback | ✅ Fully transactional — can rollback inside `BEGIN` |
| `TRUNCATE` multiple tables | Syntax varies | `TRUNCATE table1, table2 CASCADE` |
| Reset sequence on truncate | Not standard | `TRUNCATE logs RESTART IDENTITY` |
| `DELETE` returning deleted rows | Not standard | `DELETE FROM logs WHERE id=1 RETURNING *` — PostgreSQL only |
| `DROP TABLE IF EXISTS` | SQL:2003+ standard | ✅ Supported |

---

### Q2 — WHERE vs HAVING (Aggregate Filter Error)

**Question:** The following query throws an error — why, and how do you fix it?
```sql
SELECT department, AVG(salary)
FROM employees
WHERE AVG(salary) > 70000
GROUP BY department;
```

**Ideal Answer:**

`WHERE` cannot contain aggregate functions. SQL executes `WHERE` **before** `GROUP BY`, so the groups don't exist yet — there is no `AVG` to compare against. PostgreSQL error:
```
ERROR: aggregate functions are not allowed in WHERE
```

**Fix — use `HAVING` instead:**
```sql
SELECT department, AVG(salary)
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000;
```

**SQL Execution Order (must memorize):**
```
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

| Clause | Filters | Runs | Aggregates allowed? |
|--------|---------|------|---------------------|
| `WHERE` | Individual rows | Before GROUP BY | ❌ No |
| `HAVING` | Groups | After GROUP BY | ✅ Yes |

**Using both together:**
```sql
SELECT department, AVG(salary)
FROM employees
WHERE status = 'active'       -- removes inactive rows before grouping
GROUP BY department
HAVING AVG(salary) > 70000;  -- filters groups after aggregation
```

**Edge Cases:**
- You CAN reference a `SELECT` alias in `ORDER BY` but NOT in `WHERE` or `HAVING` (in standard SQL — PostgreSQL extends this slightly for `HAVING` in some cases)
- `HAVING` without `GROUP BY` treats the entire result as one group
- Filtering in `WHERE` before `GROUP BY` is faster — it reduces rows before aggregation; always push non-aggregate conditions to `WHERE`

**Optimization Tips:**
- Always prefer `WHERE` over `HAVING` for non-aggregate conditions — it reduces the data set earlier in the pipeline
- `HAVING COUNT(*) = 1` is a common pattern to find duplicates or singletons after grouping

**SQL vs PostgreSQL:**

| Behaviour | Standard SQL | PostgreSQL |
|-----------|-------------|------------|
| `HAVING` without `GROUP BY` | Treats whole result as one group — standard | ✅ Same behaviour |
| Column alias in `HAVING` | ❌ Not allowed (alias defined in SELECT, which runs later) | ❌ Also not allowed — must repeat expression |
| Column alias in `ORDER BY` | ❌ Not standard | ✅ PostgreSQL allows it as an extension |
| `FILTER` clause on aggregates | SQL:2003 standard | ✅ Supported: `COUNT(*) FILTER (WHERE status='active')` — cleaner than `SUM(CASE WHEN ...)` |

PostgreSQL-only shortcut:
```sql
-- Instead of CASE WHEN in aggregate:
SELECT COUNT(*) FILTER (WHERE status = 'active') AS active_count,
       COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_count
FROM employees;
```

---

### Q3 — LEFT JOIN with Aggregation (customers with no orders)

**Question:** Return all customers (including those with no orders) with their total order count and total spend. Customers with no orders should show `0`, not `NULL`.

**Common wrong answer:**
```sql
SELECT * FROM customers c
INNER JOIN order ON o.id = c.id  -- 4 mistakes
```
Mistakes: INNER JOIN excludes non-matching rows · `order` is reserved keyword (use `orders`) · wrong join condition (`o.id` should be `o.customer_id`) · no aggregation

**Ideal Answer:**
```sql
SELECT
    c.name,
    COUNT(o.id)               AS order_count,
    COALESCE(SUM(o.total), 0) AS total_spend
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

**Why each piece:**
- `LEFT JOIN` — preserves customers with no orders (NULLs on right side)
- `COUNT(o.id)` — counts non-NULL values; NULL order ids count as 0 automatically
- `COALESCE(SUM(o.total), 0)` — SUM of NULLs returns NULL; COALESCE converts to 0
- `GROUP BY c.id, c.name` — one summary row per customer

**Edge Cases:**
- `COUNT(*)` would return 1 for Dave (counts the NULL row from LEFT JOIN) — always use `COUNT(col)` on the nullable side
- If a customer had orders with NULL totals, `SUM` would still be NULL — consider `COALESCE(SUM(COALESCE(o.total, 0)), 0)` for extra safety
- `INNER JOIN` silently drops unmatched rows — easy bug to miss in production

**Optimization Tips:**
- Index `orders.customer_id` — it's the join column and will be scanned for every customer
- For large datasets, consider a pre-aggregated subquery to avoid per-row COALESCE overhead:
```sql
SELECT c.name,
       COALESCE(agg.order_count, 0),
       COALESCE(agg.total_spend, 0)
FROM customers c
LEFT JOIN (
    SELECT customer_id, COUNT(*) AS order_count, SUM(total) AS total_spend
    FROM orders
    GROUP BY customer_id
) agg ON agg.customer_id = c.id;
```

**SQL vs PostgreSQL:**

| Behaviour | Standard SQL | PostgreSQL |
|-----------|-------------|------------|
| `COALESCE` | ✅ Standard | ✅ Supported |
| `COUNT(col)` skips NULLs | ✅ Standard | ✅ Same |
| `GROUP BY` non-aggregate columns | Must list all non-aggregate SELECT cols | PG allows `GROUP BY c.id` when `id` is PK — other columns of same table are inferred as functionally dependent (PG 9.1+) |
| `FILTER` on aggregates | Not standard | `COUNT(o.id) FILTER (WHERE o.total > 100)` — PostgreSQL-only, cleaner than CASE WHEN |
| `RETURNING` on JOIN-based DELETE | Not standard | PostgreSQL supports `RETURNING` on single-table DML |

---

### Reference — All JOIN Types with MS SQL vs PostgreSQL Syntax

**Sample data used:**
```
customers: id | name          (Alice=1, Bob=2, Carol=3, Dave=4 — Dave has no orders)
orders:    id | customer_id | total   (order 4 has customer_id=99 — no matching customer)
```

#### INNER JOIN — rows matching in both tables
```sql
-- Identical in both
SELECT c.name, o.total FROM customers c INNER JOIN orders o ON o.customer_id = c.id;
-- Excludes Dave (no orders) and orphan order 4 (no customer)
```

#### LEFT JOIN — all left rows + matching right (NULL if no match)
```sql
-- Identical in both (OUTER keyword optional in both)
SELECT c.name, o.total FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;
-- Dave appears with NULL total
```

#### RIGHT JOIN — all right rows + matching left
```sql
-- Identical in both
SELECT c.name, o.total FROM customers c RIGHT JOIN orders o ON o.customer_id = c.id;
-- Orphan order 4 appears with NULL name
```

#### FULL OUTER JOIN — all rows from both, NULLs where no match
```sql
-- Identical in both
SELECT c.name, o.total FROM customers c FULL OUTER JOIN orders o ON o.customer_id = c.id;
```

#### CROSS JOIN — cartesian product (every row × every row)
```sql
-- Identical in both. No ON clause.
SELECT c.name, o.total FROM customers c CROSS JOIN orders o;  -- 4 × 4 = 16 rows
```

#### SELF JOIN — table joined to itself
```sql
-- Identical in both
SELECT e.name AS employee, m.name AS manager
FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;
```

#### NATURAL JOIN — auto-join on all same-named columns
```sql
-- PostgreSQL only ✅
SELECT * FROM customers NATURAL JOIN orders;
-- MS SQL: ❌ NOT SUPPORTED
-- Avoid in production — fragile, breaks on column renames
```

#### LATERAL vs CROSS/OUTER APPLY — biggest syntax difference

```sql
-- PostgreSQL: LATERAL (row-by-row correlated subquery)
SELECT c.name, o.total FROM customers c
LEFT JOIN LATERAL (
    SELECT id, total FROM orders WHERE customer_id = c.id
    ORDER BY id DESC LIMIT 2
) o ON true;

-- MS SQL equivalent:
-- CROSS APPLY = INNER JOIN LATERAL (drops non-matching rows)
SELECT c.name, o.total FROM customers c
CROSS APPLY (
    SELECT TOP 2 id, total FROM orders WHERE customer_id = c.id ORDER BY id DESC
) o;

-- OUTER APPLY = LEFT JOIN LATERAL (keeps non-matching rows with NULLs)
SELECT c.name, o.total FROM customers c
OUTER APPLY (
    SELECT TOP 2 id, total FROM orders WHERE customer_id = c.id ORDER BY id DESC
) o;
```

#### Complete Syntax Comparison Table

| JOIN Type | PostgreSQL | MS SQL | Notes |
|-----------|-----------|--------|-------|
| `INNER JOIN` | ✅ | ✅ | Identical |
| `LEFT [OUTER] JOIN` | ✅ | ✅ | Identical |
| `RIGHT [OUTER] JOIN` | ✅ | ✅ | Identical |
| `FULL OUTER JOIN` | ✅ | ✅ | Identical |
| `CROSS JOIN` | ✅ | ✅ | Identical |
| `SELF JOIN` | ✅ | ✅ | Identical (use aliases) |
| `NATURAL JOIN` | ✅ | ❌ | Avoid in production |
| `JOIN LATERAL` | ✅ | ❌ | Use `CROSS/OUTER APPLY` in MS SQL |
| `CROSS APPLY` | ❌ | ✅ | Use `JOIN LATERAL ON true` in PG |
| `OUTER APPLY` | ❌ | ✅ | Use `LEFT JOIN LATERAL ON true` in PG |
| `WITH (NOLOCK)` | ❌ not needed | ✅ | PG uses MVCC — no dirty reads possible |
| `TOP N` inside subquery | ❌ use `LIMIT` | ✅ | Critical inside APPLY subqueries |
| Old `*=` / `=*` syntax | ❌ | ⚠️ deprecated | Recognise, never write |

---

*(Further questions and answers will be appended here as the session progresses.)*

---
