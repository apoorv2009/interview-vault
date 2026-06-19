# Two threads update the same data simultaneously. How do you prevent a race condition?

*Related but distinct from "Two users hit the same API at the exact same millisecond..." — that file covers cross-request/cross-process duplicate writes (idempotency, unique constraints). This file covers the general concurrency-control toolkit for any two writers racing on shared state, in-process or distributed.*

**SIMPLE EXPLANATION — Read This First**

Short Answer: A race condition happens when the outcome depends on timing — two threads read a value, both compute a new value based on the stale read, and whichever writes last wins, silently discarding the other's update ("lost update"). The fix is always some form of serialization: make the read-modify-write sequence atomic, either by locking around it (pessimistic), by detecting conflicts after the fact and retrying (optimistic), or by using a hardware-level atomic instruction that does read-modify-write in one uninterruptible step.

- The canonical example: `balance = balance + 100`. This is actually three operations — read balance, add 100, write balance. If two threads interleave between the read and the write, one update is lost. This is the textbook "lost update" anomaly.
- Pessimistic locking (mutex/lock): Thread A acquires a lock before touching the data; Thread B blocks until A releases it. Correct, simple, but threads waiting on the lock do no useful work — throughput suffers under contention.
- Optimistic locking (version/CAS): Don't lock anything. Read the value AND its version number. Write back only if the version hasn't changed (`UPDATE ... WHERE version = 5`); if it has, someone else won the race — retry. Better throughput when conflicts are rare, but wasted work (and retries) when conflicts are frequent.
- Atomic instructions (lock-free): Modern CPUs offer instructions like Compare-And-Swap (CAS) and atomic increment that perform read-modify-write as a single uninterruptible hardware operation. No OS-level lock needed — used inside language runtimes (`AtomicInteger`, `std::atomic`) for simple counters.
- Which to pick: High contention, simple critical section → mutex. Low contention, need throughput → optimistic/CAS. Distributed (multiple processes/machines, not just threads) → distributed lock (Redis/Zookeeper) or database-level optimistic concurrency (version column), never an in-process mutex (it only protects one process's memory).

**DEEP DIVE — Technical Architecture Below**

## The Lost Update, Visualized

```
Thread A          Thread B          balance (shared)
read  100  ───────────────────────► sees 100
                  read  100 ───────► sees 100  (still 100! A hasn't written yet)
compute 100+50=150
                  compute 100+30=130
write 150  ──────────────────────────────────► balance = 150
                  write 130 ────────────────────► balance = 130  ← A's +50 is LOST
```

## Pessimistic Locking (Mutex) — Correct but Serializes

```
Thread A: lock.acquire() ─► read 100 ─► write 150 ─► lock.release()
Thread B:                                              lock.acquire() ─► read 150 ─► write 180 ─► release()
                                                        ▲
                                          B blocks here until A releases — no lost update,
                                          but B does zero useful work while waiting.
```

## Optimistic Locking (Version Column / CAS) — Throughput-Favoring

```
Thread A: read (value=100, version=5)
Thread B: read (value=100, version=5)
Thread A: UPDATE SET value=150, version=6 WHERE version=5  → 1 row affected, COMMIT
Thread B: UPDATE SET value=130, version=6 WHERE version=5  → 0 rows affected (version is now 6)
                                                            → B detects conflict, RETRIES:
                                                              read (value=150, version=6)
                                                              UPDATE SET value=180, version=7 WHERE version=6 → success
```

## Concurrency Control Mechanisms Compared

| Mechanism | Granularity | Blocking? | Best for | Failure mode if misused |
| --- | --- | --- | --- | --- |
| Mutex / synchronized block | In-process, any critical section | Yes | High-contention, short critical sections | Deadlock if lock ordering is inconsistent across threads |
| Read-write lock | In-process | Writers block readers and each other; readers don't block readers | Read-heavy shared state | Writer starvation if reads never stop arriving |
| Optimistic locking (DB version column) | Single row / aggregate | No (retry instead) | Low-conflict-probability updates (e.g., user profile edits) | Retry storms under high contention — degrades to worse-than-pessimistic |
| Compare-And-Swap (CAS) / atomics | Single word/variable | No | Counters, flags, lock-free data structure internals | ABA problem — value changed and changed back between read and CAS, CAS succeeds incorrectly |
| Distributed lock (Redis/Zookeeper) | Cross-process, cross-machine | Yes | Multi-service coordination on a shared resource | Lock held past TTL after holder crash → must fence with monotonic tokens |
| Database transaction + row lock (`SELECT ... FOR UPDATE`) | Row-level, cross-process | Yes | Multi-step read-modify-write spanning a transaction | Long transactions holding locks → blocks unrelated readers/writers, risk of deadlock with other transactions |

## The ABA Problem (Why CAS Isn't Always Enough)

```
Thread A reads value = X (pointer to node "1")
Thread B: pops "1", pushes "2", pushes "1" again (same address, reused memory)
Thread A: CAS(expected=X, new=Y) → succeeds, because the address matches —
          but the underlying node has changed identity. Silent corruption.
```
Fix: tagged pointers / version stamps alongside the value, or hazard pointers in lock-free data structure design — relevant if you're asked to go deeper than "just use CAS."

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: In a distributed extension of this problem (the "two threads" become "two nodes"), a distributed lock is a CP mechanism — it sacrifices availability (the second node must wait or fail) to guarantee consistency (no concurrent write). An AP alternative would let both writes through and reconcile later with a CRDT or last-writer-wins policy, accepting the lost-update risk as a designed trade-off rather than a bug.
- **PACELC**: Under normal operation, pessimistic locks impose a latency cost (E-L: waiting for the lock) in exchange for guaranteed consistency. Optimistic locking imposes a *variable* latency cost — usually near-zero, but with retry storms under contention, making the E-L trade-off probabilistic rather than fixed. This is the deciding factor for choosing optimistic vs pessimistic: estimate conflict probability and pick the strategy whose tail latency you can tolerate.
- **Write Amplification**: Optimistic locking causes wasted writes under contention — every losing thread did a full read-modify-write cycle that gets discarded and retried, effectively doubling (or worse) the write work compared to a pessimistic lock that simply serializes without wasted attempts. This is the classic throughput-vs-wasted-work trade-off in compare-and-retry schemes, directly analogous to optimistic concurrency control discussions in LSM-tree write paths.
- **Read/Write Trade-off**: Read-write locks exploit the common case that most shared state is read far more often than written — letting unlimited concurrent readers through while still serializing writers. Choosing this primitive over a plain mutex is itself a read/write workload analysis decision, and naming that analysis is what separates a Staff-level answer from a junior one.
- **Execution Trade-offs**: Lock-free (CAS-based) data structures trade implementation complexity for the elimination of context-switch overhead and the impossibility of priority inversion / deadlock — appropriate for very hot, very short critical sections (counters, queue head/tail pointers) where lock overhead would dominate. For anything beyond a single word of state, the complexity cost of getting lock-free code provably correct usually outweighs the throughput gain, and a well-scoped mutex is the better engineering trade-off.
