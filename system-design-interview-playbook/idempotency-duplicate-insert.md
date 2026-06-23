# Two users hit the same API at the exact same millisecond, both pass validation, and both try to insert the same record. Now you have duplicate data in production. What's your fix?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Validation happens before the insert, so "check, then act" leaves a gap. Both requests check "does this record exist?", both get "no," and both proceed to insert. The fix is to stop relying on application-level checks and make the database itself reject the second write — with a unique constraint, an idempotency key, or a distributed lock — so the race can never produce two rows.

- The bug, precisely: "check-then-act" is not atomic. Between the `SELECT` (does it exist?) and the `INSERT`, another request can interleave. This is a classic TOCTOU (time-of-check to time-of-use) race, not a logic bug — your validation code is "correct," the timing is what's wrong.
- Why "add more validation" doesn't fix it: Adding another `if not exists` check just makes the race window smaller, not zero. You cannot out-code a race condition in application logic alone; you need a primitive that is atomic at the storage layer.
- The real fix, layered:
  - Unique constraint at the database (cheapest, always-on safety net): `UNIQUE(user_id, order_ref)`. The second `INSERT` fails with a constraint violation instead of succeeding — guaranteed atomic because the database enforces it during the write, not before it.
  - Idempotency key (client-supplied, for APIs that retry): Client sends `Idempotency-Key: <uuid>` with the request. Server stores `(key → result)`. If the same key arrives again (duplicate click, retried request, or this exact race), return the cached result instead of re-executing the write.
  - Distributed lock (when the operation is multi-step, not a single insert): Acquire a lock on a derived key (`lock:order:user123:skuABC`) via Redis `SET NX EX` before doing the check-then-act sequence. Only the lock holder proceeds.
- Which one to actually use: Unique constraint is non-negotiable — always have it, even if you also do the others, because it's your last line of defense if the lock or idempotency layer has a bug. Idempotency keys are the right fix when the client can retry (payments, order creation). Distributed locks are the right fix when you need to serialize a multi-statement transaction, not just a single insert.

**DEEP DIVE — Technical Architecture Below**

## The Race, Visualized

```
Time →
Request A:  SELECT exists?  ──(false)──  INSERT row  ──► success
Request B:        SELECT exists?  ──(false)──  INSERT row  ──► success (DUPLICATE!)
                   ▲
                   Both SELECTs run before either INSERT commits.
                   Neither request "sees" the other's write.
```

```
Fixed with a unique constraint:
Request A:  SELECT exists?  ──(false)──  INSERT row  ──► commits, row exists
Request B:        SELECT exists?  ──(false)──  INSERT row  ──► constraint violation, 409 returned
                                                           ▲
                                              DB enforces uniqueness atomically
                                              at write time — race window closed.
```

## Defense Layers, End to End

```
┌─────────────────────────────────────────────────────────────────┐
│ Client                                                            │
│   Generates Idempotency-Key once per logical operation,           │
│   reuses it on retry (network timeout, double-click, etc.)        │
└───────────────────────────┬───────────────────────────────────────┘
                            │ POST /orders  Idempotency-Key: 8f3a...
┌───────────────────────────▼───────────────────────────────────────┐
│ API Gateway / Service Layer                                       │
│   1. Look up Idempotency-Key in idempotency_store                 │
│      HIT  → return cached (status, body) immediately, no re-exec  │
│      MISS → proceed, write a "pending" row for this key first     │
│   2. Optional: acquire distributed lock for multi-step writes     │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│ Database                                                           │
│   UNIQUE(user_id, order_ref) — final, unconditional backstop      │
│   Second concurrent INSERT → 23505 unique_violation → mapped to    │
│   idempotent "already exists" response, not a 500 error           │
└──────────────────────────────────────────────────────────────────┘
```

## Idempotency Key Table Design

| Column | Purpose |
| --- | --- |
| `idempotency_key` (PK) | Client-supplied UUID, scoped per user/endpoint |
| `request_hash` | Hash of request body — detect key reuse with a *different* payload (reject as a client error, don't silently return the old result) |
| `status` | `pending` / `completed` / `failed` |
| `response_body`, `response_code` | Cached so retries return the exact same response without re-executing side effects |
| `created_at`, `expires_at` | TTL — idempotency keys are not kept forever (typically 24h) |

A subtlety worth stating out loud in an interview: writing the `pending` row for the idempotency key must itself be atomic against the same race — so the idempotency table also needs a unique constraint on `idempotency_key`, turning the meta-problem into the same primitive that fixes the original problem.

## Distributed Lock — Correctness Pitfalls

A naive `SET lock:x NX` is not enough for production:

| Pitfall | Fix |
| --- | --- |
| Holder crashes without releasing | Always set with `EX` (TTL) — never an unbounded lock |
| Holder's operation outlives the TTL, another node grabs the lock, both now run concurrently | Use a fencing token: lock holder gets a monotonically increasing token, downstream writes include `WHERE token >= current_token` so a "zombie" holder's late write is rejected |
| Releasing someone else's lock (after your TTL expired and someone else acquired it) | Release only if the stored value matches your own random token (`SET lock:x token NX` → `DEL` only if `GET lock:x == token`, via a Lua script for atomicity) |

This is precisely why "just use Redis as a lock" is a Senior-level red flag if stated without the fencing-token caveat — single-instance Redis locks (and even Redlock across multiple instances) have known correctness gaps under GC pauses, network partitions, and clock drift (Martin Kleppmann's critique of Redlock is the standard citation here).

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: The unique constraint is a CP choice at the storage layer — the database refuses to let the second write succeed (sacrificing "availability" of that specific write) in order to guarantee consistency (no duplicate row), even during a race that looks like a network partition between the two requests' causal ordering.
- **PACELC**: Under normal operation (no partition), enforcing the unique constraint costs a few extra microseconds of index lookup on every insert — a small latency tax (the "L" in PACELC) paid in exchange for consistency (the "C"). This is the right trade for financial/order data; for low-stakes idempotent telemetry writes, you might accept occasional duplicates and dedupe downstream instead (an EL choice).
- **Write Amplification**: The unique index itself is the amplification cost — every insert now also writes to a B-tree index entry, and on conflict, the database does extra work (constraint check, rollback of the partial insert, error generation) compared to an unconstrained table. This is the acceptable cost of correctness; the alternative (cleaning up duplicate rows after the fact, e.g., a nightly dedup job) is far more write-amplifying and operationally riskier.
- **Read/Write Trade-off**: Idempotency keys add a read (cache lookup) before every write. For high-throughput write paths, this read must hit a fast store (Redis or an indexed Postgres table) — if the idempotency check itself becomes the bottleneck, you've traded one correctness problem for a new latency problem.
- **Execution Trade-offs**: Synchronous constraint enforcement (unique index) is the correct execution model for this problem — you cannot fix a write-time race with an asynchronous reconciliation job, because by the time the job runs, the duplicate has already been served to two different downstream consumers (e.g., two shipping confirmations sent to a warehouse system). Async dedup is acceptable only for purely internal, non-externally-visible side effects.
