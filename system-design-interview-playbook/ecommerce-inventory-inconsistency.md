# Customers Report Your E-Commerce Site Shows Products as 'In Stock' — But at Checkout They're Suddenly Unavailable. How Would You Debug and Fix This?

*Interview Question #70. Tests debugging methodology, distributed consistency reasoning, and pragmatic fix prioritisation.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Problem Framing — All Root Causes First

A principal-level answer diagnoses the full space before proposing a fix. This is a classic **eventual consistency bug** — the product listing reads stale state while checkout enforces real-time truth.

| Root Cause | Mechanism | Likelihood |
|---|---|---|
| **Stale cache** | Listing reads from Redis/CDN with a long TTL (e.g. 10 min). Item sold out; cache not invalidated. | High (most common) |
| **Read replica lag** | Listing page reads from a read replica. Replication lag (10ms–2s, spikeable to seconds under load) = stale quantity. | Medium |
| **CQRS read model delay** | If CQRS is used, the read model (Elasticsearch / Postgres read DB) is updated asynchronously. Event lag = stale listing. | Medium |
| **Race condition at checkout** | Two users hit checkout simultaneously for the last unit. Both read qty=1, both decrement — one succeeds, one finds 0. | High (concurrent users) |
| **Non-atomic read-modify-write** | Inventory decrement done with SELECT then UPDATE (no lock). TOCTOU window allows oversell. | High |
| **Warehouse / WMS sync delay** | Inventory sourced from WMS via batch sync or webhook; batch runs every 15 min, webhooks delayed. | Medium (multi-channel retail) |

---

## 2. Debugging Playbook — Hypothesis-Driven

A principal engineer structures the debug as a hypothesis-driven investigation, not random log grepping.

### Step 1 — Map the Data Flow

```
[Product Listing Page]
     │
     ├──► Redis Cache (L2) ──miss──► Product DB Read Replica (L3)
     │
[Checkout Service]
     │
     └──► Inventory DB (Primary, row-level lock) ──► Decrement qty
```

The inconsistency lives in the **gap** between the listing's read path and checkout's write path.

### Step 2 — Instrument and Observe

- **Check cache TTL:** `TTL sku:<id>:qty` in Redis on a recently sold-out SKU. If TTL is minutes → primary suspect.
- **Check replication lag:** `SHOW SLAVE STATUS` on the read replica. Look for `Seconds_Behind_Master` during peak traffic.
- **Add structured checkout logging:** `{ sku, qty_seen_at_reserve, qty_after_decrement, user_id, timestamp }` — did two users both see qty=1?
- **Distributed trace:** Pull a Jaeger/Datadog trace for a failed checkout. Delta between product view (cache read) and checkout attempt — if > cache TTL, cache freshness is the culprit.
- **Concurrent checkout scan:** Query checkout service logs for the same SKU within a 1-second window during the incident. Two concurrent reservations for qty=1 = race condition confirmed.

### Step 3 — Reproduce in Staging

- **Race condition:** k6 / JMeter — 50 concurrent users hitting the same last-unit SKU. Exactly 1 should succeed if locking is correct.
- **Cache staleness:** Artificially extend TTL and replay. If the symptom reproduces → root cause confirmed.

---

## 3. Fix Strategies by Root Cause

### 3.1 Cache Staleness

**Reduce TTL** to 30–60 seconds for inventory counts (not product descriptions).

**Cache invalidation on write:** When inventory is decremented at checkout, publish an `InventoryUpdated` event. A cache-invalidation worker calls `DEL sku:<id>:qty` in Redis. Near-zero staleness.

**Soft display:** Show "Only 3 left" (from live count) rather than binary In Stock/Out of Stock — reduces UX impact of stale reads.

### 3.2 Race Condition — Atomic Inventory Reservation

The most critical fix. Three options in increasing robustness:

| Strategy | Implementation | When to Use |
|---|---|---|
| **Optimistic locking** | `UPDATE inventory SET qty=qty-1, version=version+1 WHERE sku_id=X AND version=<read_version>`. Retry on 0 rows updated. | Low-contention SKUs (general catalog) |
| **Pessimistic locking** | `SELECT qty FROM inventory WHERE sku_id=X FOR UPDATE`. Locks row for transaction duration. | High-value / low-stock items (luxury, limited editions) |
| **Redis atomic DECRBY** | `DECRBY sku:qty 1` — if result < 0, `INCRBY` back and reject. Atomic. Async sync to DB. | Flash sales / high-concurrency SKUs |
| **Cart reservation** | Soft-reserve on "Add to Cart" for N minutes. `available = total - reserved`. Convert to sale on payment. | Best UX; prevents checkout-time surprise |

### 3.3 Read Replica Lag

- **Route inventory qty reads to primary** for the checkout path (read-your-writes consistency). Read replicas only for non-inventory fields (images, descriptions).
- **Connection pool routing by query tag** — MySQL: `/* FORCE_MASTER */` hint; Postgres: PgBouncer routing policy.
- **Alert:** Fire when `Seconds_Behind_Master` > 1s on inventory tables.

### 3.4 Warehouse / WMS Sync Delay

- Replace batch sync (polling every 15 min) with **event-driven sync**: WMS publishes `StockLevelChanged` via webhook or Kafka connector → Inventory Service updates in near-real time.
- **Nightly reconciliation job:** Diff WMS source-of-truth vs application DB. Catch drift from missed events.

---

## 4. Target Architecture

```
  ┌──────────────────────────────────────────────────────────┐
  │               PRODUCT LISTING (read path)                │
  │  Redis Cache (TTL=30s, invalidated on InventoryUpdated)  │
  │  ──miss──► Product Read Replica (descriptions, images)   │
  │  ──inventory qty──► Primary DB / Redis DECRBY counter    │
  └──────────────────────────────────────────────────────────┘
                          │
               InventoryUpdated events (Kafka)
                          │
  ┌──────────────────────────────────────────────────────────┐
  │                   CHECKOUT (write path)                   │
  │  1. Validate stock: SELECT qty FOR UPDATE (primary DB)   │
  │     OR: Redis DECRBY sku:qty 1 (atomic, high concurrency)│
  │  2. Reserve unit: INSERT INTO reservations (TTL=15 min)  │
  │  3. On payment confirm: DELETE reservation, persist sale │
  │  4. Publish InventoryUpdated event → cache invalidation  │
  └──────────────────────────────────────────────────────────┘
                          │
  ┌──────────────────────────────────────────────────────────┐
  │               WAREHOUSE SYNC (event-driven)               │
  │  WMS ──webhook──► Inventory Service ──► DB + Cache update│
  │  Nightly reconciliation: WMS vs App DB diff              │
  └──────────────────────────────────────────────────────────┘
```

---

## 5. Theoretical Frameworks

### CAP Theorem

The listing page and checkout service access different nodes (cache, replica, primary). This is a deliberate CAP trade-off **per tier**:

- **AP (listing):** Reads from cache/replica. Accepts stale reads. Higher availability, lower latency.
- **CP (checkout):** Reads from primary with row-level lock. Guarantees no oversell. Lower throughput, higher latency.

**Interview insight:** The bug is applying AP semantics end-to-end to a domain that requires CP correctness at the checkout boundary. The fix is applying two-tier consistency, not one-size-fits-all.

### PACELC

Under normal operation (no partition), this is a pure **Latency vs Consistency** trade-off:

- **EC (Consistency):** Read inventory from primary for every listing page load. Strongly consistent; doubles DB read load. Untenable at millions of RPS.
- **EL (Latency):** Read from cache/replica for listing (fast, cheap); reserve from primary at checkout (consistent). Accept the UX inconsistency window.

**Optimal design:** EL for listing display, EC for the checkout reserve step. The UX mitigation is soft reservation at cart-add time — shrinks the EC/EL divergence window before the user reaches checkout.

### Write Amplification

Every inventory decrement triggers: Primary DB write → Outbox write → Kafka publish → Redis DEL → Read model update. **5x write amplification per unit sold.** At 10K orders/minute (flash sale), that's 50K writes/minute on the write path — size Kafka and Redis accordingly; batch non-critical writes.

### Read/Write Trade-off

Browse:buy ratio is typically **1000:1** in e-commerce. Optimize the read path aggressively:

- Serve 99.9% of reads from cache. Only checkout reservation touches primary.
- Denormalize `quantity_display` for listing (acceptable stale); maintain `quantity_available` in primary for checkout (always fresh).
- Write path is intentionally constrained (locking, saga steps) to guarantee correctness — acceptable since checkout is rare relative to browsing.

### Optimistic vs Pessimistic Locking — Execution Trade-off

| Model | Throughput | Correctness | Best For |
|---|---|---|---|
| Optimistic locking | High (under low contention) | Correct if retried properly | General catalog |
| Pessimistic (SELECT FOR UPDATE) | Serialised (bottleneck) | Guaranteed | High-value / limited editions |
| Redis DECRBY | Highest (atomic, in-memory) | Correct; needs async DB sync | Flash sales |

**Recommendation:** Layer by SKU type — Redis counter for flash-sale items, optimistic locking for general catalog, pessimistic for high-value/low-stock.

---

## 6. Fix Priority Matrix

| Fix | Impact | Effort | Priority |
|---|---|---|---|
| Atomic reserve (SELECT FOR UPDATE / Redis DECRBY) | Eliminates oversell completely | Low (1–2 days) | **P0 — deploy immediately** |
| Cache TTL reduction + invalidation on event | Eliminates stale listing display | Medium (3–5 days) | P1 — sprint 1 |
| Inventory reads routed to primary for checkout | Eliminates replica lag bug | Low (config change) | P1 — sprint 1 |
| Cart reservation (soft-hold on add-to-cart) | Best UX — user informed early | High (2–3 weeks) | P2 — sprint 2–3 |
| WMS event-driven sync (replace batch) | Eliminates warehouse sync delay | High (3–4 weeks) | P2 — sprint 3–4 |
