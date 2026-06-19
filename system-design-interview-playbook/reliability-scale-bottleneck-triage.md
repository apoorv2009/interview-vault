# Your API works fine for 1,000 users but crashes at 100,000 users. What will you check first?

**SIMPLE EXPLANATION — Read This First**

Short Answer: There's no single answer because "crashes at scale" is a symptom, not a diagnosis — the right move is a systematic elimination pass through the layers most likely to break non-linearly, starting with the database connection pool, because it's the single most common cause of "fine at 1K, dead at 100K" and the cheapest thing to check first. You're looking for whatever resource doesn't scale linearly with users: connection pools, single-threaded bottlenecks, N+1 queries that were invisible at low volume, and memory leaks that only manifest under sustained load.

- Why 1,000 → 100,000 is a meaningful jump, not just "more": 100x traffic doesn't stress everything equally. CPU-bound code often degrades gracefully (just slower). What breaks catastrophically are *fixed-size resources* — a connection pool sized for 50 doesn't degrade gracefully at 100K concurrent requests, it just rejects connections once exhausted, and a thread-per-request server runs out of threads and the whole process can wedge.
- Check #1 — Database connection pool exhaustion: This is the single most common root cause. If your pool is sized for, say, 100 connections and you suddenly have thousands of concurrent requests each holding a connection (especially if any queries are slow), requests queue waiting for a connection, queue depth grows unbounded, and eventually the app server itself runs out of memory or threads holding queued requests. Check: pool size, checkout wait times, and whether connections are being returned promptly (a single un-closed connection in a code path is invisible at 1K req/s and catastrophic at 100K).
- Check #2 — N+1 queries and missing indexes: At 1K users, a query that does 1 extra DB round-trip per item in a list of 20 is annoying but survivable. At 100K users, that's potentially millions of extra queries per second hitting a database that was never designed for that query pattern — and a missing index that made a query "slow but tolerable" at low volume becomes a full table lock contention problem at high volume.
- Check #3 — Synchronous blocking I/O on a limited thread pool: If your app server uses a thread-per-request model with a fixed thread pool (common default: 200), and each request blocks on a slow downstream call (third-party API, slow query), you hit thread pool exhaustion — new requests queue or get rejected, even though CPU is mostly idle. This looks exactly like "the API crashes" but the actual root cause is concurrency model, not capacity.
- Check #4 — Memory leaks / unbounded in-memory caches: A cache with no eviction policy, or a per-request object that isn't garbage collected (a common culprit: accumulating data in a request-scoped list incorrectly stored at app scope) is invisible at low traffic because growth is slow, and becomes an OOM crash exactly when sustained high load accelerates the leak rate.
- Check #5 — A single point of serialization you didn't know about: A global lock, a singleton with synchronized methods, a rate limiter implemented with a single in-memory counter (not distributed) — anything that serializes concurrent requests through one chokepoint scales fine until concurrency exceeds what that one chokepoint can process, then it becomes the entire system's ceiling.

**DEEP DIVE — Technical Architecture Below**

## Triage Order (Cheapest Check → Most Likely Culprit First)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DB connection pool metrics                                      │
│    pool.active / pool.max, checkout wait time, connection leaks   │
│    → Most common cause. Check first, costs you 2 minutes.         │
├─────────────────────────────────────────────────────────────────┤
│ 2. Thread pool / event loop saturation                             │
│    active threads vs. max, queue depth, time-in-queue              │
│    → Second most common. Reveals blocking I/O on limited threads. │
├─────────────────────────────────────────────────────────────────┤
│ 3. Slow query log / APM trace at p99                               │
│    Which query/endpoint dominates latency under load?              │
│    → Reveals N+1 patterns and missing indexes invisible at low Q. │
├─────────────────────────────────────────────────────────────────┤
│ 4. Memory/GC metrics over the load window                          │
│    Heap growth slope, GC pause frequency, OOM kill logs            │
│    → Reveals leaks and unbounded caches.                            │
├─────────────────────────────────────────────────────────────────┤
│ 5. Any global lock / singleton / single-instance rate limiter      │
│    grep for synchronized, mutex, or "in-memory counter" patterns   │
│    → Reveals accidental serialization points.                      │
├─────────────────────────────────────────────────────────────────┤
│ 6. Downstream dependency capacity (cache, queue, third-party API)  │
│    Did Redis/Kafka/payment gateway also need to scale 100x?        │
│    → Reveals you scaled your service but not its dependencies.    │
└─────────────────────────────────────────────────────────────────┘
```

## Why Connection Pool Exhaustion Specifically Causes a "Crash" (Not Just Slowness)

```
Healthy:    [request] → [pool: 40/100 used] → [DB] → response, connection returned
Degrading:  [request] → [pool: 99/100 used] → queued requests pile up in app memory
Crash:      [request] → [pool: 100/100, queue depth: 50,000] →
            app server OOMs holding queued request objects, or
            request timeout cascades → client retries → MORE concurrent requests →
            death spiral (this is why crashes often happen suddenly, not gradually)
```

## Common Root Causes Ranked by Frequency (Real-World Postmortems)

| Root cause | Why it's invisible at 1K users | Why it's fatal at 100K |
| --- | --- | --- |
| DB connection pool too small / leaking | Pool never fills up | Pool exhausts, requests queue unboundedly |
| N+1 query pattern | Extra round-trips add ms, not noticeable | Extra round-trips multiply into millions of QPS the DB can't serve |
| Thread-per-request + blocking downstream call | Thread pool (e.g. 200) never saturates | Thread pool saturates, new requests rejected/queued |
| In-memory cache with no eviction | Grows slowly, never hits memory limit in dev/staging | OOM after sustained high-traffic growth |
| Single-instance rate limiter / counter | Never becomes the bottleneck at low concurrency | Becomes a serialization chokepoint, caps total throughput |
| Downstream dependency not scaled (Redis, third-party API) | Low call volume never approaches dependency's limits | Dependency's own connection/rate limits get hit, cascades back |
| Synchronous logging / metrics emission on hot path | Negligible overhead per request at low volume | Aggregate I/O overhead becomes significant fraction of request time |

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: A connection-pool-exhaustion crash is effectively a self-inflicted partition — the app server is "up" but functionally unreachable from the database's perspective because every connection slot is occupied. The system didn't choose to sacrifice availability, it was forced to by resource exhaustion; the fix (proper pooling, circuit breakers) is about making the trade-off deliberate (e.g., fail fast and shed load) rather than accidental (queue forever until OOM).
- **PACELC**: Under the "normal operation" branch, this incident reveals a hidden EL trade-off nobody made consciously — synchronous, blocking architecture optimizes for simplicity (E-C-like: every request gets a "consistent" full round-trip) at the cost of not degrading gracefully under load (poor E-L characteristics). An async/non-blocking architecture (event loop, reactive I/O) trades implementation complexity for much better latency behavior under load spikes.
- **Write Amplification**: If the N+1 pattern involves writes (e.g., updating a counter per item in a loop instead of a single batched update), the amplification is direct: 1 logical operation becomes N physical writes, and that multiplier is what turns "fine at 1K" into "the database's write throughput ceiling is now your application's ceiling" at 100K.
- **Read/Write Trade-off**: Diagnosing this incident requires knowing your read/write ratio under the failure condition — if reads dominate, the missing piece is almost always caching (a read-through cache absorbing repeated identical queries); if writes dominate, the missing piece is almost always batching or sharding the write path. Misdiagnosing which side of the ratio is failing leads to fixing the wrong layer (e.g., adding read replicas when the actual bottleneck is write-path lock contention).
- **Execution Trade-offs**: The deepest fix is often architectural: move from synchronous request-blocks-on-everything execution to a model where slow operations (third-party calls, heavy writes) are queued and processed asynchronously, with the API responding immediately with an acknowledgment. This fan-out/fan-in pattern decouples request-handling capacity from downstream processing capacity — exactly the kind of answer that signals Staff-level thinking versus "just add more servers."
