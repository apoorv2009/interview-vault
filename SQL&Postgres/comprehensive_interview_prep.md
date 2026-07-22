# SQL & PostgreSQL — Comprehensive Interview Prep

> **How this file works:** Each interview question is appended below the foundation notes with the ideal answer, edge cases, and optimization tips. By the end of the session this is a standalone cheat sheet.

---

## Index

- [Part 0 — Foundation Reference (Seed)](#part-0--foundation-reference-seed)
  - [0.1 Relational Database Fundamentals](#01-relational-database-fundamentals)
  - [0.2 Normalization](#02-normalization)
  - [0.3 ACID Properties](#03-acid-properties)
  - [0.4 Transaction Isolation Levels](#04-transaction-isolation-levels)
  - [0.5 SQL Command Categories](#05-sql-command-categories)
  - [0.6 JOINs](#06-joins)
  - [0.7 Aggregates, GROUP BY, HAVING](#07-aggregates-group-by-having)
  - [0.8 Subqueries vs CTEs vs Window Functions](#08-subqueries-vs-ctes-vs-window-functions)
  - [0.9 PostgreSQL Data Types (Key Ones)](#09-postgresql-data-types-key-ones)
  - [0.10 PostgreSQL Indexes](#010-postgresql-indexes)
  - [0.11 EXPLAIN / EXPLAIN ANALYZE](#011-explain--explain-analyze)
  - [0.12 MVCC — Multi-Version Concurrency Control](#012-mvcc--multi-version-concurrency-control)
  - [0.13 WAL — Write-Ahead Logging](#013-wal--write-ahead-logging)
  - [0.14 VACUUM and AUTOVACUUM](#014-vacuum-and-autovacuum)
  - [0.15 Partitioning](#015-partitioning)
  - [0.16 Views and Materialized Views](#016-views-and-materialized-views)
  - [0.17 Common Performance Patterns](#017-common-performance-patterns)
  - [0.18 Roles and Security](#018-roles-and-security)
  - [0.19 Useful PostgreSQL-Specific Features](#019-useful-postgresql-specific-features)
  - [0.20 Quick Formula Sheet](#020-quick-formula-sheet)
- [Part 1 — Interview Q&A](#part-1--interview-qa)
  - [Q1 — DELETE vs TRUNCATE vs DROP](#q1--delete-vs-truncate-vs-drop)
  - [Q2 — WHERE vs HAVING (Aggregate Filter Error)](#q2--where-vs-having-aggregate-filter-error)
  - [Q3 — LEFT JOIN with Aggregation (customers with no orders)](#q3--left-join-with-aggregation-customers-with-no-orders)
  - [Reference — All JOIN Types with MS SQL vs PostgreSQL Syntax](#reference--all-join-types-with-ms-sql-vs-postgresql-syntax)
    - [INNER JOIN — rows matching in both tables](#inner-join--rows-matching-in-both-tables)
    - [LEFT JOIN — all left rows + matching right (NULL if no match)](#left-join--all-left-rows--matching-right-null-if-no-match)
    - [RIGHT JOIN — all right rows + matching left](#right-join--all-right-rows--matching-left)
    - [FULL OUTER JOIN — all rows from both, NULLs where no match](#full-outer-join--all-rows-from-both-nulls-where-no-match)
    - [CROSS JOIN — cartesian product (every row × every row)](#cross-join--cartesian-product-every-row--every-row)
    - [SELF JOIN — table joined to itself](#self-join--table-joined-to-itself)
    - [NATURAL JOIN — auto-join on all same-named columns](#natural-join--auto-join-on-all-same-named-columns)
    - [LATERAL vs CROSS/OUTER APPLY — biggest syntax difference](#lateral-vs-crossouter-apply--biggest-syntax-difference)
    - [Complete Syntax Comparison Table](#complete-syntax-comparison-table)
  - [Q4 — ON vs WHERE filter in LEFT JOIN (classic trap)](#q4--on-vs-where-filter-in-left-join-classic-trap)
- [Part 2 — SQL Server Interview Questions (Capital Access Project Context)](#part-2--sql-server-interview-questions-capital-access-project-context)
  - [Q5 — Explain Normalization (1NF, 2NF, 3NF)](#q5--explain-normalization-1nf-2nf-3nf)
  - [Q6 — CHAR vs VARCHAR vs NCHAR vs NVARCHAR](#q6--char-vs-varchar-vs-nchar-vs-nvarchar)
  - [Q7 — Primary Key vs Unique Key](#q7--primary-key-vs-unique-key)
  - [Q8 — Indexes (Clustered vs Non-Clustered vs Covering)](#q8--indexes-clustered-vs-non-clustered-vs-covering)
  - [Q9 — Stored Procedures vs Functions](#q9--stored-procedures-vs-functions)
  - [Q10 — How to Improve Stored Procedure Performance](#q10--how-to-improve-stored-procedure-performance)
  - [Q11 — Triggers (AFTER vs INSTEAD OF)](#q11--triggers-after-vs-instead-of)
  - [Q12 — IDENTITY and Transactions](#q12--identity-and-transactions)
  - [Q13 — JOINs](#q13--joins)
  - [Q14 — UNION vs UNION ALL](#q14--union-vs-union-all)
  - [Q15 — Aggregate Functions, GROUP BY, HAVING](#q15--aggregate-functions-group-by-having)
  - [Q16 — NULL Handling](#q16--null-handling)
  - [Q17 — CASE Statement](#q17--case-statement)
  - [Q18 — Self-Referencing Tables and Self Join](#q18--self-referencing-tables-and-self-join)
  - [Q19 — Subqueries and Correlated Subqueries](#q19--subqueries-and-correlated-subqueries)
  - [Q20 — CTE (Common Table Expression) and Recursive CTE](#q20--cte-common-table-expression-and-recursive-cte)
  - [Q21 — Window Functions](#q21--window-functions)
  - [Q22 — Find Unique / Duplicate Records](#q22--find-unique--duplicate-records)
  - [Q23 — Delete Duplicate Records](#q23--delete-duplicate-records)
  - [Q24 — Employee / Manager Self-Join Problems](#q24--employee--manager-self-join-problems)
  - [Q25 — Improve Query Performance (Checklist + Real Diagnosis Story)](#q25--improve-query-performance-checklist--real-diagnosis-story)
  - [Q26 — Clustered vs Non-Clustered Index](#q26--clustered-vs-non-clustered-index)
  - [Q27 — Covering Index](#q27--covering-index)
  - [Q28 — CTE Inside a Stored Procedure](#q28--cte-inside-a-stored-procedure)
  - [Q29 — Temp Table vs Table Variable vs Global Temp Table (1M+ Row Stored Procedures)](#q29--temp-table-vs-table-variable-vs-global-temp-table-1m-row-stored-procedures)
  - [Q30 — ROW_NUMBER vs RANK vs DENSE_RANK](#q30--row_number-vs-rank-vs-dense_rank)
  - [Q31 — 2nd / Nth Highest Salary, Department-Wise](#q31--2nd--nth-highest-salary-department-wise)
  - [Q32 — Index Design Strategy on a Wide (30+ Column) Table](#q32--index-design-strategy-on-a-wide-30-column-table)
  - [Q33 — Types of Indexes in SQL Server](#q33--types-of-indexes-in-sql-server)
  - [Q34 — Reading an Execution Plan: Red Flags](#q34--reading-an-execution-plan-red-flags)
  - [Q35 — SQL Server Profiler, Extended Events, and Query Store](#q35--sql-server-profiler-extended-events-and-query-store)

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

### Q4 — ON vs WHERE filter in LEFT JOIN (classic trap)

**Question:** What is wrong with this query? Fix it.
```sql
SELECT c.name, o.total, o.status
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'pending';
```

**Problem:** `WHERE` runs *after* the JOIN. The LEFT JOIN produces NULLs for customers with no pending orders. Then `NULL = 'pending'` evaluates to `UNKNOWN` (not TRUE) → those rows are removed. LEFT JOIN silently becomes INNER JOIN.

**Fix — move filter to ON clause:**
```sql
SELECT c.name, o.total, o.status
FROM customers c
LEFT JOIN orders o
    ON o.customer_id = c.id
    AND o.status = 'pending';  -- applied during join, NULLs preserved
```

**Golden rule:**

| Filter location | Effect | Use when |
|----------------|--------|----------|
| `ON` clause | Applied during join — non-matching rows kept with NULLs | Filter right table, keep all left rows |
| `WHERE` clause | Applied after join — removes NULL rows → LEFT becomes INNER | Filter final result (both sides) |

**Edge Cases:**
- Any non-null check on right table in WHERE converts LEFT JOIN to INNER JOIN
- `WHERE o.id IS NOT NULL` → always INNER JOIN regardless of keyword used
- `COALESCE(o.status, '') = 'pending'` in WHERE also kills NULLs
- This trap applies to RIGHT JOIN too (filtering left table in WHERE)

**Optimization Tips:**
- Pushing filters into ON reduces rows joined early — better performance on large tables
- PostgreSQL's EXPLAIN will show the same plan for both in simple cases, but the result set differs

**SQL vs PostgreSQL:**

| Behaviour | Standard SQL | PostgreSQL | MS SQL |
|-----------|-------------|------------|--------|
| `ON` filter behaviour | ✅ Standard | ✅ | ✅ |
| `NULL = value` result | `UNKNOWN` → excluded | `UNKNOWN` → excluded | `UNKNOWN` → excluded |
| `IS NOT DISTINCT FROM` | Not standard | ✅ PG only — NULL-safe equality | ❌ Use `ISNULL(col, val)` |
| NULL-safe equal syntax | N/A | `a IS NOT DISTINCT FROM b` | `a IS NULL AND b IS NULL OR a = b` |

```sql
-- PostgreSQL NULL-safe equality (useful in ON clauses):
LEFT JOIN orders o
    ON o.customer_id IS NOT DISTINCT FROM c.id
    AND o.status IS NOT DISTINCT FROM 'pending';
```

---

---

## Part 2 — SQL Server Interview Questions (Capital Access Project Context)

> All examples reference the **Capital Access** platform at S&P Global:
> 7 microservices (Ownership, Profiles, Targeting, Contacts, Notifications, Report, Engagement/Activity),
> Azure SQL + Cosmos DB + Redis, Okta OIDC JWT, Azure Service Bus, Angular 18 + NgRx.

---

### Q5 — Explain Normalization (1NF, 2NF, 3NF)

**Goal:** eliminate redundancy and prevent update anomalies.

```
1NF — Atomic values: one value per cell, no comma-separated lists, all rows unique.
2NF — No partial dependency: every non-key column depends on the WHOLE composite PK.
3NF — No transitive dependency: non-key columns must depend on PK only, not on each other.
```

**1NF violation — comma-separated list in one cell:**
```sql
-- ❌ Violates 1NF: multiple attendees in one column
EngagementActivities(Id, TenantId, Attendees = 'alice@spg.com, bob@spg.com')

-- ✅ 1NF: separate table, one value per row
EngagementActivities(Id, TenantId)
EngagementAttendees(EngagementId, AttendeeEmail)
```

**2NF violation — partial dependency (composite PK only):**
```sql
-- ❌ Violates 2NF: TenantName depends on TenantId alone, not on (TenantId, CompanyId) PK
EngagementActivities(TenantId, CompanyId, TenantName, Status)
--                   ↑─────── composite PK ──────↑   └─ depends only on TenantId ❌

-- ✅ 2NF: move TenantName to its own table
Tenants(TenantId, TenantName)
EngagementActivities(TenantId, CompanyId, Status)
```

**3NF violation — transitive dependency:**
```sql
-- ❌ Violates 3NF: TenantName depends on TenantId, which depends on EngagementId (A→B→C)
EngagementActivities(EngagementId, TenantId, TenantName)
-- TenantName depends on TenantId, not directly on EngagementId ❌

-- ✅ 3NF: split transitive chain
EngagementActivities(EngagementId, TenantId)
Tenants(TenantId, TenantName)
```

**Denormalization** — intentional break of normal forms for read performance.
In Capital Access, the **CQRS read model** (Targeting service) stores pre-joined data in Redis.
Duplicated on write; <10ms reads. OLAP side of the system.

**OLTP vs OLAP:**

| Property | OLTP | OLAP |
|----------|------|------|
| Purpose | Transactional: read/write individual rows | Analytics: aggregate millions of rows |
| Normalization | Fully normalized (3NF) | Denormalized (star schema) |
| Query pattern | Point lookups, short transactions | Full scans, GROUP BY, aggregations |
| Example | Engagement writes (Azure SQL) | PDF reports (Report service + Azure Functions) |

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Normal form rules | Standard ANSI — identical | Same standard |
| Covering index for read-side denorm | `CREATE INDEX ... INCLUDE (col)` | `CREATE INDEX ... INCLUDE (col)` — PG 11+ |
| Partial / Filtered index | `CREATE INDEX ... WHERE Status = 'Active'` | `CREATE INDEX ... WHERE status = 'active'` — same syntax |

---

### Q6 — CHAR vs VARCHAR vs NCHAR vs NVARCHAR

| Type | Storage | Encoding | Padding | Use when |
|------|---------|----------|---------|----------|
| `CHAR(n)` | Fixed: n bytes | ASCII (1 byte/char) | Padded with spaces | Fixed-length codes: status flags, country codes |
| `VARCHAR(n)` | Variable: actual + 2 bytes | ASCII (1 byte/char) | No padding | Variable-length ASCII strings |
| `NCHAR(n)` | Fixed: 2n bytes | Unicode UTF-16 | Padded | Fixed-length Unicode |
| `NVARCHAR(n)` | Variable: 2×actual + 2 bytes | Unicode UTF-16 | No padding | Variable-length Unicode (names, addresses) |
| `NVARCHAR(MAX)` | Up to 2 GB | Unicode | No padding | Long text (notes, descriptions) |

**Capital Access:** `TenantId VARCHAR(50)`, `CompanyName NVARCHAR(200)` (supports Japanese/Chinese names), `Status CHAR(20)` (fixed enum values).

Always prefix Unicode literals: `WHERE CompanyName = N'Müller'`
Without `N` prefix SQL Server coerces to ASCII — special characters are lost.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Unicode type | `NVARCHAR` (UTF-16) | `TEXT` or `VARCHAR` — all strings are UTF-8 natively |
| Unlimited text | `NVARCHAR(MAX)` | `TEXT` — no size limit, no overhead |
| Unicode literal prefix | `N'value'` required | Not needed — all literals are UTF-8 |
| Prefer in practice | `NVARCHAR` for text | `TEXT` (PG docs recommend TEXT over VARCHAR(n)) |

---

### Q7 — Primary Key vs Unique Key

| Property | Primary Key | Unique Key |
|----------|------------|------------|
| NULLs allowed | ❌ Never | ✅ One NULL allowed (SQL Server) |
| Count per table | One only | Multiple |
| Clustered index | ✅ Created automatically | ❌ Non-clustered by default |
| Implicit index | ✅ Always | ✅ Always (UNIQUE constraint = index) |
| Purpose | Identifies each row | Enforces business uniqueness |

```sql
CREATE TABLE EngagementActivities (
    Id             INT          PRIMARY KEY IDENTITY(1,1),  -- PK: clustered, not null, auto-inc
    ExternalRefCode NVARCHAR(50) UNIQUE,                    -- unique but nullable, non-clustered
    TenantId       VARCHAR(50)  NOT NULL
);
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| NULL in UNIQUE | One NULL per column allowed | Multiple NULLs allowed (NULLs ≠ each other in PG) |
| PK → clustered | ✅ Auto-creates clustered index | ❌ PK creates B-tree; no heap-level clustering |
| UUID PK | `NEWID()` (random, causes page splits) or `NEWSEQUENTIALID()` | `gen_random_uuid()` PG 13+ |

---

### Q8 — Indexes (Clustered vs Non-Clustered vs Covering)

**Clustered Index:**
- **IS the table** — data pages physically sorted in clustered key order
- Leaf nodes = actual data rows
- **One per table** (one physical sort order)
- Default: created on PRIMARY KEY

**Non-Clustered Index:**
- Separate B-Tree alongside the table
- Leaf nodes = indexed columns + pointer (clustered key)
- Up to 999 per table
- Explicitly created (except UNIQUE constraint)

```
Clustered (EngagementId):      Non-Clustered (TenantId):
      [1000-2000]                    [hfrg-002]
      /          \                   /         \
 [1000-1500]  [1501-2000]      [hfrg-002]   [spg-001]
    |                |            |                |
[actual rows]  [actual rows]  [TenantId + EngId]  [TenantId + EngId]
                                     ↓ Key Lookup ↓
                                 clustered index
                                 (fetch missing columns)
```

**Key Lookup** — most common execution plan bottleneck. Fix with INCLUDE (covering index):
```sql
-- ❌ Non-clustered without INCLUDE → Key Lookup for every row
CREATE NONCLUSTERED INDEX IX_Tenant ON EngagementActivities(TenantId);

-- ✅ Covering index: all needed columns in leaf node → zero table access
CREATE NONCLUSTERED INDEX IX_Tenant_Covering
ON EngagementActivities(TenantId)
INCLUDE (Status, ScheduledAt, CompanyId);
-- Query: SELECT Status, ScheduledAt FROM EngagementActivities WHERE TenantId = 'spg-001'
-- Result: Index Only Scan — never touches the table ✅
```

**Index Seek vs Index Scan:**

| | Index Seek | Index Scan |
|---|-----------|-----------|
| Reads | Only matching branch | Entire index |
| Complexity | O(log n) | O(n) |
| Triggered by | SARGable predicates | Non-SARGable predicates |

**SARGable — enables Seek:**
```sql
WHERE TenantId = 'spg-001'                                       -- ✅ Seek
WHERE ScheduledAt >= '2025-01-01' AND ScheduledAt < '2026-01-01' -- ✅ Seek
WHERE TenantId LIKE 'spg%'                                       -- ✅ Seek (leading wildcard fixed)
```

**Non-SARGable — forces Scan:**
```sql
WHERE YEAR(ScheduledAt) = 2025    -- ❌ function wraps column → fix with date range
WHERE LOWER(Status) = 'completed' -- ❌ function wraps column → store consistently
WHERE TenantId LIKE '%001'        -- ❌ leading wildcard
```

**Composite index — left-most prefix rule:**
```sql
CREATE INDEX IX ON EngagementActivities(TenantId, Status, ScheduledAt);
-- Uses index: WHERE TenantId = ?                              ✅
-- Uses index: WHERE TenantId = ? AND Status = ?              ✅
-- Skips index: WHERE Status = ?                              ❌ no left prefix
```

**GUID vs INT as clustered key:**
`NEWID()` (random GUID) → random page insertions → page splits → fragmentation.
Fix: `NEWSEQUENTIALID()` — monotonically increasing GUIDs.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Clustered index | Reorders heap physically | No native concept — `CLUSTER` reorders once but drift resumes |
| INCLUDE covering | `CREATE INDEX ... INCLUDE (cols)` | `CREATE INDEX ... INCLUDE (cols)` — PG 11+ |
| FK auto-index | ❌ Not automatic | ❌ Not automatic — same |
| Expression index | Computed column workaround | `CREATE INDEX ON t(lower(col))` — native |
| Hash index | ❌ Not available | ✅ `USING HASH` — equality-only, fast |
| GIN / GiST | ❌ (use full-text index) | ✅ GIN for jsonb/arrays, GiST for geometric/range |

---

### Q9 — Stored Procedures vs Functions

| Property | Stored Procedure | Function |
|----------|-----------------|----------|
| Return value | Optional (OUTPUT param or result sets) | Must return a value |
| Use in SELECT | ❌ Cannot | ✅ Scalar UDF can appear in SELECT |
| DML (INSERT/UPDATE/DELETE) | ✅ Allowed | ❌ Not allowed |
| Transaction control | ✅ BEGIN TRAN / ROLLBACK | ❌ |
| Multiple result sets | ✅ Can return many | ❌ Returns one value or table |
| Call syntax | `EXEC dbo.sp_Name @param` | `SELECT dbo.fn_Name(@param)` |

**Capital Access:** `sp_CreateEngagement` is a stored procedure (inserts + publishes Service Bus event). `fn_GetTenantDisplayName(@TenantId)` is a scalar function — used only in SELECT, never in WHERE (per-row execution cost).

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Stored Procedure | `CREATE PROCEDURE` | `CREATE PROCEDURE` (PG 11+) or `CREATE FUNCTION ... RETURNS VOID` |
| Call syntax | `EXEC sp_Name @p` | `CALL proc_name(val)` |
| Scalar function | `CREATE FUNCTION ... RETURNS type` | `CREATE FUNCTION ... RETURNS type LANGUAGE plpgsql` |

---

### Q10 — How to Improve Stored Procedure Performance

**① SET NOCOUNT ON — always first line:**
```sql
CREATE PROCEDURE sp_GetEngagements @TenantId VARCHAR(50)
AS BEGIN
    SET NOCOUNT ON;  -- eliminates "X rows affected" network message per statement ✅
```

**② Parameter Sniffing — biggest hidden killer:**
SQL Server caches the execution plan from the first call. If first run had atypical data, all subsequent calls use that bad plan.
```sql
-- Fix A: OPTION(RECOMPILE) — fresh plan per execution (preferred, statement-level)
SELECT * FROM EngagementActivities WHERE TenantId = @TenantId OPTION (RECOMPILE);

-- Fix B: WITH RECOMPILE on SP — recompiles entire SP each call
CREATE PROCEDURE sp_GetEngagements @TenantId VARCHAR(50) WITH RECOMPILE AS ...

-- Fix C: local variable — optimizer cannot peek at value, uses average estimate
DECLARE @LocalId VARCHAR(50) = @TenantId;
SELECT * FROM EngagementActivities WHERE TenantId = @LocalId;

-- Fix D: OPTIMIZE FOR — plan for the most common value
SELECT * FROM EngagementActivities WHERE TenantId = @TenantId
OPTION (OPTIMIZE FOR (@TenantId = 'spg-001'));
```

**③ Avoid non-SARGable predicates:**
```sql
WHERE YEAR(ScheduledAt) = 2025                                     -- ❌ full scan
WHERE ScheduledAt >= '2025-01-01' AND ScheduledAt < '2026-01-01'  -- ✅ index seek
```

**④ SELECT only needed columns — never SELECT \***

**⑤ Replace cursors with set-based operations:**
```sql
-- ❌ Cursor: one UPDATE per row — 50,000 iterations for 50,000 rows
-- ✅ Set-based: one UPDATE for all matching rows — SQL Server optimizes the whole set
UPDATE cp SET cp.LastEngagedAt = GETUTCDATE()
FROM   CompanyProfiles cp
WHERE  cp.Id IN (SELECT DISTINCT CompanyId FROM EngagementActivities WHERE TenantId = @TenantId);
```

**⑥ Avoid scalar UDFs in SELECT/WHERE** — execute once per row (same problem as cursors).

**⑦ Keep transactions short** — all preparation outside BEGIN TRAN; only writes inside.

**⑧ EXISTS not COUNT(\*) for existence checks:**
```sql
-- ❌ COUNT: scans all matching rows
IF (SELECT COUNT(*) FROM EngagementActivities WHERE CompanyId = @Id) > 0
-- ✅ EXISTS: stops at first match ✅
IF EXISTS (SELECT 1 FROM EngagementActivities WHERE CompanyId = @Id)
```

**⑨ Schema-qualify all objects:** `dbo.EngagementActivities` not `EngagementActivities`

**⑩ sp_executesql for dynamic SQL — parameterized, cached, safe:**
```sql
DECLARE @SQL NVARCHAR(MAX) = N'SELECT * FROM dbo.EngagementActivities WHERE TenantId = @TenantId';
EXEC sp_executesql @SQL, N'@TenantId VARCHAR(50)', @TenantId = @TenantId;
```

**⑪ Temp tables for large intermediate results used multiple times:**
```sql
CREATE TABLE #ActiveTenants (TenantId VARCHAR(50) PRIMARY KEY);
INSERT INTO #ActiveTenants SELECT DISTINCT TenantId FROM EngagementActivities
WHERE ScheduledAt > DATEADD(MONTH, -3, GETUTCDATE());
-- Use #ActiveTenants twice — computed once, indexed, statistics built ✅
DROP TABLE #ActiveTenants;
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Parameter sniffing fix | `OPTION(RECOMPILE)` | `EXECUTE format(...) USING val` in PL/pgSQL avoids caching |
| SET NOCOUNT equivalent | `SET NOCOUNT ON` | Not needed — PG doesn't send per-statement row counts same way |
| Dynamic SQL | `sp_executesql @sql, @paramdef, @val` | `EXECUTE format('...', val)` in PL/pgSQL |
| Temp tables | `#local` (session), `##global` (all sessions) — tempdb | `CREATE TEMP TABLE` — session-scoped, auto-dropped at session end |

---

### Q11 — Triggers (AFTER vs INSTEAD OF)

**AFTER trigger** — fires after DML completes. Audit logs, cascading updates.
```sql
CREATE TRIGGER trg_EngagementAudit
ON EngagementActivities
AFTER UPDATE
AS BEGIN
    SET NOCOUNT ON;
    INSERT INTO EngagementAuditLog (EngagementId, OldStatus, NewStatus, ChangedAt)
    SELECT d.Id, d.Status, i.Status, GETUTCDATE()
    FROM INSERTED i               -- virtual table: NEW values after update
    JOIN DELETED  d ON d.Id = i.Id  -- virtual table: OLD values before update
    WHERE d.Status <> i.Status;   -- log only actual status changes
END;
```

**INSTEAD OF trigger** — replaces the DML. Used on views or to prevent invalid actions.
```sql
CREATE TRIGGER trg_PreventDeleteCompleted
ON EngagementActivities
INSTEAD OF DELETE
AS BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM DELETED WHERE Status = 'Completed')
    BEGIN
        RAISERROR('Cannot delete completed engagements.', 16, 1);
        RETURN;
    END;
    DELETE FROM EngagementActivities WHERE Id IN (SELECT Id FROM DELETED);
END;
```

**INSERTED / DELETED virtual tables:**

| Trigger Event | INSERTED | DELETED |
|--------------|----------|---------|
| INSERT | New rows | Empty |
| DELETE | Empty | Old rows (before delete) |
| UPDATE | New values | Old values |

**Trigger types:** DML (INSERT/UPDATE/DELETE), DDL (ALTER/DROP TABLE), Logon

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Trigger body | Inline in `CREATE TRIGGER ... AS BEGIN ... END` | Separate function: `CREATE FUNCTION fn() RETURNS trigger ... CREATE TRIGGER ... EXECUTE FUNCTION fn()` |
| Row vs statement | Statement-level (INSERTED/DELETED = all rows) | `FOR EACH ROW` or `FOR EACH STATEMENT` — explicit |
| NEW / OLD access | `INSERTED` (new), `DELETED` (old) | `NEW` (new row), `OLD` (old row) in FOR EACH ROW |
| INSTEAD OF on table | ✅ Supported | ❌ Use BEFORE trigger to achieve same effect |

---

### Q12 — IDENTITY and Transactions

**IDENTITY:**
```sql
CREATE TABLE EngagementActivities (
    Id INT IDENTITY(1, 1) PRIMARY KEY   -- seed=1, increment=1
);

INSERT INTO EngagementActivities(TenantId) VALUES('spg-001');
SELECT SCOPE_IDENTITY();   -- ✅ last Id in current scope (safe with triggers)
-- @@IDENTITY: last Id in session — dangerous if trigger inserts into another identity table
```

**Transactions + ACID:**
```sql
BEGIN TRANSACTION;
BEGIN TRY
    UPDATE InvestorProfiles SET AumUsd += 1000000 WHERE Id = @InvestorId;
    INSERT INTO EngagementActivities(TenantId, CompanyId, Status)
    VALUES (@TenantId, @CompanyId, 'Pending');
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
```

| ACID | Meaning |
|------|---------|
| Atomicity | All or nothing — ROLLBACK undoes partial work |
| Consistency | Constraints (FK, CHECK, NOT NULL) enforced at commit |
| Isolation | Concurrent transactions don't see each other's uncommitted data |
| Durability | WAL flushed to disk before COMMIT returns |

**Isolation Levels:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-------|-----------|---------------------|--------------|
| READ UNCOMMITTED | ✅ possible | ✅ | ✅ |
| READ COMMITTED *(default)* | ❌ | ✅ | ✅ |
| REPEATABLE READ | ❌ | ❌ | ✅ |
| SERIALIZABLE | ❌ | ❌ | ❌ |
| SNAPSHOT | ❌ | ❌ | ❌ (row versioning — no locks) |

**Azure SQL has `READ_COMMITTED_SNAPSHOT ON` by default** — readers use row versions, not locks. Report generation doesn't block engagement writes in Capital Access.

**Deadlock** — circular lock dependency. SQL Server kills one transaction automatically.
Prevention: consistent lock order, short transactions, SNAPSHOT isolation.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Default isolation | READ COMMITTED | READ COMMITTED |
| SNAPSHOT isolation | `SET TRANSACTION ISOLATION LEVEL SNAPSHOT` | All transactions use MVCC — no dirty reads possible at any level |
| Dirty reads | Possible at READ UNCOMMITTED / `WITH (NOLOCK)` | Not possible — MVCC prevents them |
| SCOPE_IDENTITY equivalent | `SCOPE_IDENTITY()` | `INSERT ... RETURNING id` (preferred) or `lastval()` |

---

### Q13 — JOINs

**INNER JOIN** — only rows matching in both tables:
```sql
SELECT e.Id, e.Status, p.InvestorName
FROM   EngagementActivities e
INNER JOIN InvestorProfiles p ON p.InvestorId = e.InvestorId;
-- Engagements with no InvestorProfiles match → excluded ✅
```

**LEFT JOIN** — ALL from left + matching from right (NULLs where no match):
```sql
SELECT e.Id, e.Status, p.InvestorName   -- NULL where profile missing ✅
FROM   EngagementActivities e
LEFT JOIN InvestorProfiles p ON p.InvestorId = e.InvestorId;

-- ⚠️ Classic trap: WHERE on right-table column silently turns LEFT into INNER JOIN
WHERE p.InvestorName = 'BlackRock'    -- ❌ excludes NULL rows → now INNER
-- ✅ Fix: filter in ON clause
LEFT JOIN InvestorProfiles p
    ON p.InvestorId = e.InvestorId AND p.InvestorName = 'BlackRock'
```

**LEFT vs RIGHT table — purely positional:**
- Table after `FROM` = **LEFT**
- Table after `JOIN` keyword = **RIGHT**
- `LEFT JOIN` keeps ALL rows from the FROM table

**RIGHT JOIN** — ALL from right table + matching from left (rare, rewrite as LEFT JOIN).

**FULL OUTER JOIN** — ALL rows from both tables, NULLs on non-matching side.

**CROSS JOIN** — Cartesian product (m × n rows), no ON clause:
```sql
SELECT r.ReportType, t.TenantId
FROM   ReportTypes r CROSS JOIN Tenants t;
-- 5 report types × 20 tenants = 100 rows — generate all combinations ✅
```

**Self Join** — table joined to itself using two aliases:
```sql
SELECT e.Name AS Employee, m.Name AS Manager
FROM   Employees e
JOIN   Employees m ON m.EmployeeId = e.ManagerId
WHERE  e.Salary > m.Salary;   -- employees earning more than their manager
```

**SQL vs PostgreSQL:**

| JOIN Type | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| INNER / LEFT / RIGHT / FULL OUTER / CROSS | ✅ Identical | ✅ Identical |
| `CROSS APPLY` | ✅ = INNER JOIN LATERAL | ❌ Use `JOIN LATERAL ON true` |
| `OUTER APPLY` | ✅ = LEFT JOIN LATERAL | ❌ Use `LEFT JOIN LATERAL ON true` |
| `WITH (NOLOCK)` | ✅ dirty read hint | ❌ Not needed — MVCC prevents dirty reads |
| `NATURAL JOIN` | ❌ | ✅ Supported (avoid in production — fragile) |

---

### Q14 — UNION vs UNION ALL

```sql
-- UNION: removes duplicates (sorts to find them — slower)
SELECT TenantId FROM EngagementActivities
UNION
SELECT TenantId FROM EngagementHistory;
-- spg-001 in both → appears once ✅

-- UNION ALL: keeps all rows including duplicates (faster — no sort/dedup)
SELECT TenantId FROM EngagementActivities
UNION ALL
SELECT TenantId FROM EngagementHistory;
-- spg-001 in both → appears twice

-- Rules: same column count in both SELECT, compatible data types
-- Column names come from first SELECT
```

**Capital Access:** activity feed uses `UNION ALL` — events from different source tables are distinct by source system, no duplicates possible → no need to pay dedup cost.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| `UNION` / `UNION ALL` | ✅ Standard | ✅ Identical |
| `EXCEPT` | ✅ | ✅ |
| `INTERSECT` | ✅ | ✅ |
| `MINUS` | ❌ (use EXCEPT) | ❌ (use EXCEPT) |

---

### Q15 — Aggregate Functions, GROUP BY, HAVING

```sql
SELECT
    TenantId,
    COUNT(*)                           AS TotalEngagements,   -- includes NULLs
    COUNT(AttendeeEmail)               AS WithAttendees,       -- skips NULLs
    COUNT(DISTINCT CompanyId)          AS UniqueCompanies,
    SUM(AttendeeCount)                 AS TotalAttendees,
    AVG(CAST(AttendeeCount AS FLOAT))  AS AvgAttendees,
    MIN(ScheduledAt)                   AS FirstEngagement,
    MAX(ScheduledAt)                   AS LastEngagement,
    STRING_AGG(Status, ', ')           AS AllStatuses
FROM EngagementActivities
WHERE ScheduledAt >= '2025-01-01'    -- WHERE runs BEFORE GROUP BY → filters rows
GROUP BY TenantId
HAVING COUNT(*) > 10                 -- HAVING runs AFTER GROUP BY → filters groups
ORDER BY TotalEngagements DESC;
```

**SQL Execution Order:**
```
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → TOP/OFFSET
```

| Clause | Filters | Aggregates allowed? |
|--------|---------|---------------------|
| `WHERE` | Individual rows (before grouping) | ❌ No |
| `HAVING` | Groups (after aggregation) | ✅ Yes |

**NULL behavior in aggregates:** SUM / AVG / MIN / MAX / COUNT(col) all **skip NULLs**. Only COUNT(*) includes them.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| `STRING_AGG` | SQL Server 2017+ | PG 9.0+, same syntax |
| `GROUP BY` with PK | Must list all non-agg SELECT cols | `GROUP BY id` infers functional dependency — other cols of same table implied (PG 9.1+) |
| Conditional aggregate | `SUM(CASE WHEN status='Active' THEN 1 END)` | Same + `COUNT(*) FILTER (WHERE status = 'active')` — cleaner PG syntax |

---

### Q16 — NULL Handling

```sql
WHERE ManagerId IS NULL        -- ✅ correct NULL check
WHERE ManagerId = NULL         -- ❌ always UNKNOWN (never TRUE)

-- ISNULL(expr, replacement) — SQL Server only
SELECT ISNULL(AttendeeCount, 0)

-- COALESCE(a, b, c) — ANSI standard, returns first non-NULL
SELECT COALESCE(MobilePhone, OfficePhone, 'No phone')

-- NULLIF(a, b) — returns NULL if a = b, else returns a
SELECT NULLIF(Status, 'Unknown')   -- 'Unknown' → NULL; anything else → itself

-- NULL in JOIN: NULL ≠ NULL → rows with NULL join column are always excluded
```

---

### Q17 — CASE Statement

```sql
-- Searched CASE (any condition)
SELECT
    CASE
        WHEN AttendeeCount >= 50 THEN 'Large'
        WHEN AttendeeCount >= 10 THEN 'Medium'
        WHEN AttendeeCount >= 1  THEN 'Small'
        ELSE                          'Virtual Only'
    END AS EventSize,
    -- CASE in ORDER BY — custom sort
    CASE Status WHEN 'Pending' THEN 1 WHEN 'Completed' THEN 2 ELSE 3 END AS SortOrder
FROM EngagementActivities
ORDER BY SortOrder;

-- Conditional aggregate using CASE
SELECT
    COUNT(CASE WHEN Status = 'Completed' THEN 1 END) AS Completed,
    COUNT(CASE WHEN Status = 'Pending'   THEN 1 END) AS Pending
FROM EngagementActivities;
```

---

### Q18 — Self-Referencing Tables and Self Join

**Self-referencing table** — FK pointing to the same table (hierarchy):
```sql
CREATE TABLE Employees (
    EmployeeId INT PRIMARY KEY,
    Name       NVARCHAR(100),
    Salary     DECIMAL(18,2),
    ManagerId  INT NULL REFERENCES Employees(EmployeeId)   -- FK to self ✅
);
```

**Self join** — two aliases on the same table to read related rows simultaneously:
```sql
-- Employees earning more than their manager
SELECT e.Name AS Employee, e.Salary, m.Name AS Manager, m.Salary AS ManagerSalary
FROM   Employees e
JOIN   Employees m ON m.EmployeeId = e.ManagerId
WHERE  e.Salary > m.Salary;

-- No manager (top of hierarchy)
SELECT * FROM Employees WHERE ManagerId IS NULL;

-- Who is a manager (has at least one direct report)
SELECT DISTINCT m.EmployeeId, m.Name
FROM Employees e JOIN Employees m ON m.EmployeeId = e.ManagerId;

-- Highest paid per department using DENSE_RANK
WITH Ranked AS (
    SELECT *, DENSE_RANK() OVER (PARTITION BY Department ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 1;
```

---

### Q19 — Subqueries and Correlated Subqueries

**Regular subquery** — runs once, result used by outer query:
```sql
SELECT * FROM EngagementActivities
WHERE CompanyId IN (
    SELECT Id FROM Companies WHERE Sector = 'Finance'   -- runs ONCE ✅
);
```

**Correlated subquery** — references outer column, runs **once per outer row** (O(n²)):
```sql
-- ❌ Correlated — runs per EngagementActivity row
SELECT e.Id,
    (SELECT COUNT(*) FROM Attendees WHERE EngagementId = e.Id) AS AttendeeCount
FROM EngagementActivities e;

-- ✅ Rewrite as JOIN — runs once as a set
SELECT e.Id, COUNT(a.Email) AS AttendeeCount
FROM   EngagementActivities e
LEFT JOIN EngagementAttendees a ON a.EngagementId = e.Id
GROUP BY e.Id;
```

**EXISTS vs IN:**
```sql
-- EXISTS — short-circuits at first match ✅ (faster for large datasets)
WHERE EXISTS (SELECT 1 FROM Attendees WHERE EngagementId = e.Id)

-- IN — collects all values first; NULL in subquery can cause unexpected exclusions
-- NULL IN (1, NULL) = UNKNOWN → row excluded
WHERE Id IN (SELECT EngagementId FROM Attendees)   -- safe only if no NULLs in subquery
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Correlated subquery | Supported | Supported |
| `LATERAL` subquery | `CROSS APPLY` / `OUTER APPLY` | `JOIN LATERAL ON true` / `LEFT JOIN LATERAL ON true` |
| `IN` with NULLs | NULL causes row exclusion | Same — identical NULL semantics |

---

### Q20 — CTE (Common Table Expression) and Recursive CTE

Named temporary result set, scoped to **one statement**:
```sql
WITH ActiveEngagements AS (
    SELECT * FROM EngagementActivities WHERE Status = 'Pending'
),
TenantSummary AS (
    SELECT TenantId, COUNT(*) AS Total FROM ActiveEngagements GROUP BY TenantId
)
SELECT * FROM TenantSummary WHERE Total > 5;

-- DELETE / UPDATE through CTE modifies the base table physically
WITH ToDelete AS (
    SELECT TOP 100 * FROM EngagementActivities WHERE Status = 'Cancelled'
)
DELETE FROM ToDelete;   -- actual rows deleted from EngagementActivities ✅
```

**Recursive CTE — org chart / hierarchy:**
```sql
WITH OrgChart AS (
    -- Anchor: top of hierarchy
    SELECT EmployeeId, Name, ManagerId, 0 AS Level, CAST(Name AS NVARCHAR(MAX)) AS Path
    FROM   Employees WHERE ManagerId IS NULL

    UNION ALL   -- must be UNION ALL, not UNION

    -- Recursive: join each employee to their found parent
    SELECT e.EmployeeId, e.Name, e.ManagerId, h.Level + 1, h.Path + ' > ' + e.Name
    FROM   Employees e JOIN OrgChart h ON h.EmployeeId = e.ManagerId
)
SELECT Level, Path, Name FROM OrgChart ORDER BY Level, Name;
OPTION (MAXRECURSION 0);   -- default limit 100; 0 = unlimited
```

**CTE vs Temp Table:**

| Property | CTE | Temp Table (`#`) |
|----------|-----|-----------------|
| Storage | None — may re-evaluate | tempdb — computed once |
| Scope | One statement | Session |
| Index | ❌ Cannot | ✅ Can add indexes |
| Statistics | ❌ None | ✅ SQL Server builds stats |
| Recursive | ✅ | ❌ |
| Large dataset reused | ❌ May re-evaluate each reference | ✅ Computed once |
| Best for | Single use, clean syntax, recursion | Large result used multiple times |

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| CTE syntax | `WITH name AS (...)` | Identical |
| CTE DELETE | `DELETE FROM CTE WHERE rn > 1` — base table modified | PG: CTE is read-only in DML — must `DELETE FROM table WHERE id IN (SELECT id FROM cte WHERE rn > 1)` |
| CTE materialization | Optimizer may re-evaluate | PG 12+: optimizer decides; pre-PG12 CTEs were always optimization fences |
| Recursive CTE max | `OPTION (MAXRECURSION n)` | No limit by default |

---

### Q21 — Window Functions

Execute a calculation across related rows **without collapsing them**.

```sql
SELECT TenantId, CompanyId, AttendeeCount, ScheduledAt,

    -- Ranking
    ROW_NUMBER()   OVER (PARTITION BY TenantId ORDER BY ScheduledAt DESC) AS RowNum,
    RANK()         OVER (PARTITION BY TenantId ORDER BY AttendeeCount DESC) AS Rnk,
    DENSE_RANK()   OVER (PARTITION BY TenantId ORDER BY AttendeeCount DESC) AS DenseRnk,
    NTILE(4)       OVER (PARTITION BY TenantId ORDER BY AttendeeCount DESC) AS Quartile,

    -- Analytic (neighbouring rows)
    LAG(ScheduledAt, 1)  OVER (PARTITION BY TenantId ORDER BY ScheduledAt) AS PrevDate,
    LEAD(ScheduledAt, 1) OVER (PARTITION BY TenantId ORDER BY ScheduledAt) AS NextDate,

    -- Aggregate as window function
    COUNT(*)       OVER (PARTITION BY TenantId)                               AS TotalForTenant,
    SUM(AttendeeCount) OVER (PARTITION BY TenantId ORDER BY ScheduledAt)      AS RunningTotal,
    AVG(AttendeeCount) OVER (PARTITION BY TenantId)                           AS AvgForTenant

FROM EngagementActivities;
-- ALL rows returned — nothing collapsed ✅
```

**PARTITION BY vs GROUP BY:**

| | GROUP BY | PARTITION BY |
|---|----------|-------------|
| Output rows | One per group | All original rows kept |
| Row detail | Lost | Preserved alongside aggregate |
| Use when | "Total per group?" | "Each row WITH its group's stats?" |

```sql
-- GROUP BY: 2 rows for 2 tenants — individual engagement data gone ❌
SELECT TenantId, COUNT(*) AS Total FROM EngagementActivities GROUP BY TenantId;

-- PARTITION BY: all rows, tenant total stamped on each ✅
SELECT TenantId, CompanyId, Status,
    COUNT(*) OVER (PARTITION BY TenantId) AS TenantTotal
FROM EngagementActivities;
```

**RANK vs DENSE_RANK:**
```
Data: AttendeeCount = 50, 40, 40, 30
RANK:       1, 2, 2, 4   ← gap (3 skipped — two people shared 2nd) ❌
DENSE_RANK: 1, 2, 2, 3   ← no gap ✅
ROW_NUMBER: 1, 2, 3, 4   ← always unique, ignores ties
```

For "Nth highest" queries → always use DENSE_RANK (no gap means Nth rank always exists).

**Nth highest salary pattern:**
```sql
WITH Ranked AS (
    SELECT *, DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 2;   -- 2nd highest, all ties included ✅
```

**Most recent engagement per tenant-company pair:**
```sql
WITH Latest AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY TenantId, CompanyId ORDER BY ScheduledAt DESC) AS rn
    FROM EngagementActivities
)
SELECT TenantId, CompanyId, Status, ScheduledAt FROM Latest WHERE rn = 1;
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Window function syntax | `OVER (PARTITION BY ... ORDER BY ...)` | Identical |
| `ROW_NUMBER` / `RANK` / `DENSE_RANK` / `LAG` / `LEAD` | ✅ | ✅ Identical |
| `FILTER` on window aggregate | ❌ | ✅ `SUM(val) FILTER (WHERE cond) OVER (...)` |
| `DISTINCT ON` (first row per group) | ❌ — use ROW_NUMBER CTE | ✅ `SELECT DISTINCT ON (tenant_id) * FROM ... ORDER BY tenant_id, date DESC` |

---

### Q22 — Find Unique / Duplicate Records

```sql
-- DISTINCT: remove visual duplicates from output
SELECT DISTINCT TenantId, CompanyId, Status FROM EngagementActivities;

-- Truly unique rows (appear ONCE — no duplicate at all)
SELECT TenantId, CompanyId, Status, ScheduledAt
FROM   EngagementActivities
GROUP BY TenantId, CompanyId, Status, ScheduledAt
HAVING COUNT(*) = 1;

-- Duplicate rows (appear MORE than once)
SELECT TenantId, CompanyId, Status, ScheduledAt, COUNT(*) AS Occurrences
FROM   EngagementActivities
GROUP BY TenantId, CompanyId, Status, ScheduledAt
HAVING COUNT(*) > 1;
```

---

### Q23 — Delete Duplicate Records

**Method 1 — With Id (keep lowest Id):**
```sql
DELETE FROM EngagementActivities
WHERE Id NOT IN (
    SELECT MIN(Id)
    FROM   EngagementActivities
    GROUP BY TenantId, CompanyId, Status, ScheduledAt
);

-- OR: self-join approach
DELETE e1
FROM   EngagementActivities e1
JOIN   EngagementActivities e2
    ON  e1.TenantId = e2.TenantId AND e1.CompanyId = e2.CompanyId
    AND e1.Status = e2.Status AND e1.ScheduledAt = e2.ScheduledAt
    AND e1.Id > e2.Id;   -- keep lower Id, delete higher ✅
```

**Method 2 — Without Id (add temp identity column):**
```sql
ALTER TABLE EngagementActivities ADD TempRowId INT IDENTITY(1,1);
DELETE FROM EngagementActivities
WHERE TempRowId NOT IN (
    SELECT MIN(TempRowId) FROM EngagementActivities
    GROUP BY TenantId, CompanyId, Status, ScheduledAt
);
ALTER TABLE EngagementActivities DROP COLUMN TempRowId;
```

**Method 3 — CTE (cleanest, interview preferred):**
```sql
-- Preview first:
WITH DuplicateCTE AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY TenantId, CompanyId, Status, ScheduledAt
            ORDER BY Id   -- keep lowest Id
        ) AS rn
    FROM EngagementActivities
)
SELECT * FROM DuplicateCTE WHERE rn > 1;  -- verify what will be deleted ✅
-- Then:
DELETE FROM DuplicateCTE WHERE rn > 1;    -- change SELECT to DELETE ✅
```

**Method 4 — Millions of rows without performance impact:**
```sql
-- One DELETE of 10M rows: fills transaction log, locks table for minutes ❌
-- Batch approach: delete in small chunks, release locks between batches ✅

DECLARE @BatchSize INT = 5000;
DECLARE @DeletedCount INT = 1;

WHILE @DeletedCount > 0
BEGIN
    WITH DuplicateCTE AS (
        SELECT TOP (@BatchSize) *,
            ROW_NUMBER() OVER (
                PARTITION BY TenantId, CompanyId, Status, ScheduledAt
                ORDER BY Id
            ) AS rn
        FROM EngagementActivities
    )
    DELETE FROM DuplicateCTE WHERE rn > 1;

    SET @DeletedCount = @@ROWCOUNT;
    RAISERROR('Batch: %d rows deleted', 0, 1, @DeletedCount) WITH NOWAIT;

    IF @DeletedCount > 0
        WAITFOR DELAY '00:00:01';  -- 1-second pause: lets other queries run ✅
END;

-- Alternative: staging table swap (near-zero downtime for very large tables)
SELECT * INTO EngagementActivities_Clean
FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY TenantId, CompanyId, Status, ScheduledAt ORDER BY Id) AS rn
    FROM EngagementActivities
) t WHERE rn = 1;

EXEC sp_rename 'EngagementActivities',       'EngagementActivities_Old';
EXEC sp_rename 'EngagementActivities_Clean', 'EngagementActivities';
-- Verify, then: DROP TABLE EngagementActivities_Old;
```

**Why batching works:**
```
5,000 rows deleted → small transaction → minimal log growth ✅
Transaction commits → log space released, locks freed ✅
1-second pause → other queries can run between batches ✅
10M rows / 5,000 per batch = 2,000 batches ≈ 33 minutes — server stays responsive ✅
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| CTE DELETE | `DELETE FROM CTE WHERE rn > 1` — modifies base table | PG CTEs are read-only in DML: `DELETE FROM t WHERE id IN (SELECT id FROM cte WHERE rn > 1)` |
| Batch delete loop | `WHILE @count > 0 DELETE TOP(@n) ...` | `DO $$ LOOP DELETE ... LIMIT n; EXIT WHEN n = 0; END LOOP; $$ LANGUAGE plpgsql` |
| `@@ROWCOUNT` | `@@ROWCOUNT` after DML | `GET DIAGNOSTICS count = ROW_COUNT` in PL/pgSQL |

---

### Q24 — Employee / Manager Self-Join Problems

```sql
-- Employees earning MORE than their manager
SELECT e.Name AS Employee, e.Salary, m.Name AS Manager, m.Salary AS ManagerSalary
FROM   Employees e
JOIN   Employees m ON m.EmployeeId = e.ManagerId
WHERE  e.Salary > m.Salary;

-- No manager (CEO / top of org chart)
SELECT * FROM Employees WHERE ManagerId IS NULL;

-- Who is a manager (has at least one direct report)
SELECT DISTINCT m.EmployeeId, m.Name
FROM Employees e JOIN Employees m ON m.EmployeeId = e.ManagerId;

-- Highest paid per department
WITH Ranked AS (
    SELECT *, DENSE_RANK() OVER (PARTITION BY Department ORDER BY Salary DESC) AS Rnk
    FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 1;

-- Full org hierarchy with level and path
WITH OrgChart AS (
    SELECT EmployeeId, Name, ManagerId, 0 AS Level, CAST(Name AS NVARCHAR(MAX)) AS Path
    FROM   Employees WHERE ManagerId IS NULL
    UNION ALL
    SELECT e.EmployeeId, e.Name, e.ManagerId, h.Level + 1, h.Path + ' > ' + e.Name
    FROM   Employees e JOIN OrgChart h ON h.EmployeeId = e.ManagerId
)
SELECT Level, Path, Name FROM OrgChart ORDER BY Level, Name;
```

---

### Q25 — Improve Query Performance (Checklist + Real Diagnosis Story)

**Checklist**: analyze the execution plan first; add covering indexes for hot WHERE/JOIN/ORDER BY columns; avoid `SELECT *`; keep WHERE clauses SARGable (no function wrapping an indexed column); eliminate N+1 via JOINs/eager loading; paginate large result sets (`OFFSET`/`FETCH`); consider indexed views or CTEs for repeated aggregation.

**Real diagnosis** (Entity Management System dashboard, ~8s → ~420ms): Application Insights showed 92% of request time inside the SQL dependency. SQL Server Profiler confirmed the app was issuing ~100 individual `SELECT`s per page load — one per entity to compute shareholding % (classic N+1), each fast (<50ms) but summing to several seconds plus network round-trip overhead.

```sql
-- BEFORE — one query per entity, called in a loop from the app (N+1)
SELECT SUM(SharePercent) FROM ShareholderMap WHERE EntityID = @entityId;  -- × ~100

-- AFTER — one CTE pre-aggregates, then a single join back to the entity list
WITH EntityShareholding AS (
    SELECT EntityID, SUM(SharePercent) AS TotalShare
    FROM   ShareholderMap
    GROUP BY EntityID
)
SELECT e.EntityID, e.Name, es.TotalShare
FROM   Entity e
JOIN   EntityShareholding es ON es.EntityID = e.EntityID;
```

Execution plan changed from ~100× Index Seek + Key Lookup to a single Hash Match (Aggregate) + Clustered Index Scan. Verified before/after with `SET STATISTICS TIME ON` and cross-checked against Application Insights response time — ~95% improvement.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Pagination | `OFFSET x ROWS FETCH NEXT y ROWS ONLY` | `LIMIT y OFFSET x` |
| Query timing | `SET STATISTICS TIME ON` | `EXPLAIN ANALYZE` reports planning/execution time directly |
| Stats refresh | `UPDATE STATISTICS table` | `ANALYZE table` |

---

### Q26 — Clustered vs Non-Clustered Index

**Clustered**: physically sorts and stores the table's rows by the index key — the table *is* the index. Only one per table (usually the PK). Range scans are fast because data is already in order.

**Non-Clustered**: a separate B-tree of key columns + a pointer back to the base row (RID or clustered key). Multiple allowed per table — ideal for columns frequently used in `WHERE`/`JOIN`/`ORDER BY` that aren't the clustering key.

```sql
CREATE CLUSTERED INDEX PK_Entity ON Entity(EntityId);           -- usually the PK
CREATE NONCLUSTERED INDEX IX_Entity_Status ON Entity(Status);   -- search column
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Clustered index | Explicit `CLUSTERED` keyword; table storage order = index order, kept in sync automatically | No true clustered index — `CLUSTER table USING index` physically reorders rows **once**; new inserts do NOT stay clustered |
| Default index type | B-tree, clustered or non-clustered | B-tree only by default (also supports Hash, GiST, GIN, BRIN) |
| One-per-table rule | Only 1 clustered index per table | N/A — no clustered concept, `CLUSTER` can target any index |

---

### Q27 — Covering Index

A non-clustered index that includes **every** column a query needs, via the `INCLUDE` clause, so SQL Server never has to jump back to the base table (a "Key Lookup") to fetch the remaining columns — the query is fully satisfied from the index itself.

```sql
CREATE NONCLUSTERED INDEX IX_Entity_Status
ON Entity(Status)
INCLUDE (Name, CreatedAt);

-- This query never touches the base table — Status is the seek key,
-- Name/CreatedAt come straight from the index leaf pages
SELECT Name, CreatedAt FROM Entity WHERE Status = 'Active';
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Covering index syntax | `INCLUDE (col1, col2)` on a non-clustered index | `INCLUDE (col1, col2)` on a B-tree index (PG 11+) — same idea |
| Equivalent without INCLUDE | Key Lookup back to clustered index | Heap fetch back to the table (unless using an Index-Only Scan) |
| Visibility check | N/A | Index-Only Scan still needs the visibility map to be up to date (`VACUUM`) to fully avoid heap access |

---

### Q28 — CTE Inside a Stored Procedure

A Common Table Expression is a named, temporary result set scoped to a single query — yes, it's routinely used inside stored procedures for recursive hierarchies, ranking, and readability (breaking a complex query into named steps).

```sql
CREATE PROCEDURE GetSecondHighestSalaryPerDept
AS
BEGIN
    WITH RankedEmp AS (
        SELECT e.EmployeeID, e.Salary, d.DepartmentName,
               DENSE_RANK() OVER (PARTITION BY e.DepartmentID ORDER BY e.Salary DESC) AS rnk
        FROM Employee e
        JOIN Department d ON e.DepartmentID = d.DepartmentID
    )
    SELECT EmployeeID, Salary, DepartmentName
    FROM RankedEmp
    WHERE rnk = 2;
END
```

Important caveat for large data (1M+ rows) inside a stored procedure: a CTE is **inlined** and re-evaluated each time it's referenced, not materialized. For heavy multi-step calculations, a `#temp` table (materialized once, indexable, reusable across multiple steps) usually outperforms a CTE referenced multiple times.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| CTE materialization | Always inlined/re-evaluated (pre-2022); SQL Server 2022+ can also inline more aggressively | PG ≤11 always materializes a CTE (like an optimization fence); PG 12+ defaults to inlining unless `MATERIALIZED` is specified |
| Force materialization | No direct hint; use `#temp` instead | `WITH cte AS MATERIALIZED (...)` |
| Recursive CTE syntax | `WITH cte AS (... UNION ALL ...)` | Identical, `WITH RECURSIVE cte AS (...)` required keyword differs |

---

### Q29 — Temp Table vs Table Variable vs Global Temp Table (1M+ Row Stored Procedures)

| | `#temp` (local temp table) | `@table` (table variable) | `##temp` (global temp) |
|---|---|---|---|
| Storage | tempdb | tempdb (but simpler) | tempdb, session-shared |
| Statistics | Yes — optimizer can use them | No — optimizer assumes ~1 row | Yes |
| Indexable | Yes, including non-clustered | Only PK/unique constraints (pre-2014); limited | Yes |
| Scope | Current session + child scopes (nested SPs) | Current batch only | **All** sessions until creator disconnects |
| Best for | Large datasets, multi-step SPs needing indexes | Small lookup sets, table-valued params | Rare — concurrency risk in multi-user SPs, generally avoided |

For a 1M+ row stored procedure doing multi-step calculations, prefer `#temp` — it gets real statistics, can be indexed mid-procedure, and is visible to nested procedure calls. `@table` variables silently degrade the optimizer's row estimates on large data.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Local temp table | `#temp` (session-scoped, in tempdb) | `CREATE TEMP TABLE temp (...)` (session-scoped by default) |
| Global temp | `##temp` (visible to all sessions) | No true equivalent — PG temp tables are always session-local; use `UNLOGGED` regular tables for a cross-session scratch table instead |
| Table variable | `@table` (no real stats) | No direct equivalent — PL/pgSQL uses arrays/records or a regular temp table |

---

### Q30 — ROW_NUMBER vs RANK vs DENSE_RANK

```
Data: AttendeeCount = 50, 40, 40, 30
ROW_NUMBER: 1, 2, 3, 4   ← always unique, ignores ties entirely
RANK:       1, 2, 2, 4   ← ties share a rank, but a gap follows (3 is skipped)
DENSE_RANK: 1, 2, 2, 3   ← ties share a rank, NO gap
```

For any "Nth highest" query, use `DENSE_RANK` — because it never skips a rank, the Nth rank is guaranteed to exist even when ties occur above it. `RANK` can make "Nth highest" return zero rows if enough ties pushed the target rank number past the end of the gapped sequence.

```sql
WITH Ranked AS (
    SELECT *, DENSE_RANK() OVER (ORDER BY Salary DESC) AS Rnk FROM Employees
)
SELECT * FROM Ranked WHERE Rnk = 2;  -- 2nd highest, all ties included
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| `ROW_NUMBER`/`RANK`/`DENSE_RANK` | ✅ Identical syntax | ✅ Identical syntax |
| `OVER (PARTITION BY ... ORDER BY ...)` | ✅ | ✅ Identical |
| `DISTINCT ON` shortcut for "top-1 per group" | ❌ Not supported — must use a ranking CTE | ✅ `SELECT DISTINCT ON (dept_id) * FROM employees ORDER BY dept_id, salary DESC` |

---

### Q31 — 2nd / Nth Highest Salary, Department-Wise

```sql
WITH RankedEmp AS (
    SELECT e.EmployeeID, e.Salary, d.DepartmentName,
           DENSE_RANK() OVER (PARTITION BY e.DepartmentID ORDER BY e.Salary DESC) AS rnk
    FROM Employee e
    JOIN Department d ON e.DepartmentID = d.DepartmentID
)
SELECT EmployeeID, Salary, DepartmentName
FROM RankedEmp
WHERE rnk = 2;   -- change to N for Nth highest
```

`PARTITION BY DepartmentID` resets the ranking per department, so "2nd highest" is evaluated independently within each department rather than across the whole company.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Query | Identical | Identical — window functions are ANSI-standard here |
| Performance note | Add a composite index `(DepartmentID, Salary DESC)` to avoid a sort | Same — a matching B-tree index avoids the `Sort` node in `EXPLAIN` |

---

### Q32 — Index Design Strategy on a Wide (30+ Column) Table

Approach: analyze actual `WHERE`, `JOIN`, and `ORDER BY` columns from real query patterns (not every column). Prioritize **high-selectivity** columns (many distinct values) — indexing a boolean or a 3-value status column rarely helps and adds write overhead for little benefit. Build composite indexes matching the query's column order (leftmost-prefix rule), and add non-key columns via `INCLUDE` to create covering indexes. Continuously monitor with DMVs rather than guessing.

```sql
-- Composite index — column order matches typical filter+sort pattern
CREATE INDEX IX_Emp_Dept_Salary ON Employee(DeptId, Salary DESC);

-- Find missing indexes SQL Server has detected from actual query workload
SELECT * FROM sys.dm_db_missing_index_details;

-- Find indexes that exist but are never used (candidates for removal)
SELECT * FROM sys.dm_db_index_usage_stats WHERE user_seeks = 0 AND user_scans = 0;
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Missing index suggestions | `sys.dm_db_missing_index_details` (built-in) | No built-in equivalent — use `pg_stat_statements` + manual analysis, or third-party tools |
| Unused index detection | `sys.dm_db_index_usage_stats` | `pg_stat_user_indexes` (`idx_scan = 0`) |
| Leftmost-prefix rule for composite index | Same | Same — identical B-tree behaviour |

---

### Q33 — Types of Indexes in SQL Server

Clustered, Non-Clustered, Unique (auto-created by a `UNIQUE` constraint), Full-Text (text search), Spatial (geography/geometry), XML, Filtered (partial index with a `WHERE` clause), Columnstore (clustered or non-clustered — column-oriented, for analytics/reporting), and Hash (In-Memory OLTP tables only). Most production OLTP schemas mainly use Clustered + Non-Clustered; Columnstore shows up specifically for reporting/analytics tables.

```sql
CREATE UNIQUE INDEX UX_User_Email ON [User](Email);
CREATE INDEX IX_Active_Entities ON Entity(Name) WHERE IsDeleted = 0;   -- filtered index
CREATE COLUMNSTORE INDEX CX_Sales ON SalesFact(...);                   -- analytics
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Default index type | B-tree | B-tree |
| Filtered/partial index | `CREATE INDEX ... WHERE condition` | Identical syntax — `CREATE INDEX ... WHERE condition` |
| Full-text | Full-Text Index + `CONTAINS`/`FREETEXT` | GIN/GiST index + `tsvector`/`tsquery` |
| Columnstore (analytics) | Native Columnstore index | No native columnstore — use extensions (Citus/columnar) or a separate OLAP store |
| Spatial | Spatial index (geography/geometry types) | PostGIS extension + GiST index |
| Hash index | Only for In-Memory OLTP tables | Native `HASH` index type (general purpose, though B-tree usually still preferred) |

---

### Q34 — Reading an Execution Plan: Red Flags

1. **Table Scan / Index Scan instead of Index Seek** — reading every row instead of jumping straight to matches. Usually means a missing index, or a non-SARGable predicate (e.g., `WHERE LOWER(Name) = 'x'` prevents seeking on an index over `Name`).
2. **Key Lookup (Nested Loop)** — the non-clustered index found the row pointer but had to go back to the clustered index for extra columns. Fix: add those columns via `INCLUDE` (covering index).
3. **Thick arrows** between operators — the estimated row count is large; often caused by stale statistics. Fix: `UPDATE STATISTICS table`.
4. **High-cost Sort operator** — usually a missing index aligned with the query's `ORDER BY`.
5. **Nested Loops with a large outer input** — O(N×M) cost; consider whether a Hash Match/Merge Join would be cheaper (usually resolved by an index change, not a query hint).
6. **Estimated vs actual row counts diverging by >10×** — stale statistics or a parameter-sniffing issue; fix with `UPDATE STATISTICS` or `OPTION (OPTIMIZE FOR UNKNOWN)`.

```sql
SET STATISTICS TIME ON; SET STATISTICS IO ON;
-- run the query, then read:
-- CPU time = 1234 ms, elapsed time = 1456 ms
-- Table 'Entity'. Scan count 1, logical reads 8   (vs. logical reads 8000 before an index fix)
```

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| View plan | `Ctrl+M` (Actual Plan) in SSMS, or `SET SHOWPLAN_XML ON` | `EXPLAIN ANALYZE` |
| Row estimate vs actual | Shown in plan tooltip (Estimated/Actual rows) | `EXPLAIN ANALYZE` prints both directly in the text output |
| Stats refresh | `UPDATE STATISTICS table` | `ANALYZE table` |
| I/O detail | `SET STATISTICS IO ON` (logical reads) | `EXPLAIN (ANALYZE, BUFFERS)` (shared hit/read blocks) |

---

### Q35 — SQL Server Profiler, Extended Events, and Query Store

**Profiler**: legacy GUI trace tool. Use the "Tuning" template (captures `SQL:BatchCompleted`/`RPC:Completed` with Duration/Reads/Writes/CPU), filtered to `Duration > 1000ms` to avoid noise, then reproduce the slow operation in the app to capture the exact SQL with parameter values. Discouraged in production due to overhead.

**What to look for**: high logical reads → full scans, needs an index; high duration with low CPU → I/O-bound (missing index/scan); high CPU with moderate reads → expensive computation (sort/hash join/bad plan); the *same* query repeated in a tight loop → classic N+1, fix at the application/ORM level, not the database.

**Extended Events / Query Store** (modern, low-overhead alternatives): Query Store (SQL Server 2016+) tracks query performance over time and flags plan regressions with no Profiler-style overhead; `sys.dm_exec_query_stats` gives top CPU/IO consumers via a plain query, no tool setup required.

**SQL vs PostgreSQL:**

| Behaviour | SQL Server | PostgreSQL |
|-----------|-----------|------------|
| Live trace tool | SQL Server Profiler (legacy) / Extended Events (modern) | `pg_stat_activity` (live) + `log_min_duration_statement` (logs slow queries) |
| Historical plan/performance tracking | Query Store | `pg_stat_statements` extension (aggregated stats, no plan history built in) |
| Low-overhead production monitoring | Extended Events | `pg_stat_statements` (low overhead) or `auto_explain` module for periodic plan capture |

---

*(Further questions will be appended as new topics are covered.)*

---
