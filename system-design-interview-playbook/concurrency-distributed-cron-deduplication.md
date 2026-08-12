# You Have 3 Servers. Each Runs the Same Midnight Cron Job. Now Every Email is Sent 3 Times. Fix It.

*Tests distributed systems fundamentals: leader election, distributed locking, idempotency, and exactly-once guarantees in a multi-node environment.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Problem Framing

Three servers running the same cron job is a horizontal scaling anti-pattern: the job was designed for a single-server world, but the infrastructure scaled out without updating the execution model. The root cause isn't "too many servers" — it's **missing deduplication and coordination**.

There are three distinct layers to fix, depending on what guarantees you need:

| Approach | Guarantee | Complexity |
|---|---|---|
| Distributed lock (advisory) | At-most-once execution (risk: job skipped if lock holder crashes) | Low |
| Leader election | Exactly-one execution owner at a time | Medium |
| Idempotent job + dedup table | At-least-once execution with idempotent effects | Medium-High |
| Queue-based scheduling | Exactly-once (best effort) | High |

---

## 2. Solution 1: Distributed Lock with Redis (Fast Fix)

```python
import redis
import hashlib
from datetime import datetime

r = redis.Redis(host='redis', port=6379)

def run_midnight_job():
    # Lock key includes the run date — ensures lock is unique per job execution
    today = datetime.utcnow().strftime('%Y-%m-%d')
    lock_key = f"cron_lock:midnight_email:{today}"
    
    # SET NX EX — set if not exists, expire in 10 minutes
    # Only ONE server wins this; others get None
    acquired = r.set(lock_key, 'running', nx=True, ex=600)
    
    if not acquired:
        print(f"Lock not acquired for {today}, skipping")
        return
    
    try:
        send_emails()
    finally:
        # Release only if we still own it (prevent releasing someone else's lock)
        r.delete(lock_key)
```

**Trade-offs:**
- If the lock holder crashes mid-job, the lock expires after 10 minutes → job doesn't re-run until next day (at-most-once, not at-least-once)
- Use `ex=<max_job_duration * 2>` — if TTL is too short, the lock expires while the job is still running and a second server picks it up → duplicate runs

**When to use:** Low-stakes jobs (cache warming, analytics aggregation) where skipping one run is acceptable.

---

## 3. Solution 2: Database-Level Advisory Lock

```sql
-- PostgreSQL advisory locks: session-scoped, released on disconnect
-- pg_try_advisory_lock returns TRUE if acquired, FALSE if already held

SELECT pg_try_advisory_lock(hashtext('midnight_email_job_2026-08-12'));
-- Returns: t (acquired) or f (already held by another session)
```

```python
def run_midnight_job_with_db_lock():
    lock_id = int(hashlib.md5(
        f"midnight_email:{datetime.utcnow().date()}".encode()
    ).hexdigest()[:16], 16) % (2**31)
    
    with db.transaction():
        acquired = db.execute(
            "SELECT pg_try_advisory_lock(%s)", (lock_id,)
        ).scalar()
        
        if not acquired:
            return  # Another server already running this job
        
        send_emails()
        # Lock auto-released when transaction ends
```

**Advantage over Redis:** The lock is automatically released if the DB connection drops (server crash) — no orphaned locks. Durability matches your database's own guarantees.

---

## 4. Solution 3: Leader Election (Proper Fix for Critical Jobs)

For jobs that must run exactly once and cannot be skipped, implement leader election. Only the **elected leader** runs scheduled jobs.

### With ZooKeeper / etcd Leases:

```python
import etcd3

etcd = etcd3.client(host='etcd', port=2379)

def try_become_leader(service_id: str) -> bool:
    """Acquire a 30-second lease. Renew in background if elected."""
    lease = etcd.lease(30)  # 30-second TTL
    success, _ = etcd.transaction(
        compare=[etcd.transactions.version('/cron/leader') == 0],
        success=[etcd.transactions.put('/cron/leader', service_id, lease=lease)],
        failure=[]
    )
    if success:
        # Start background heartbeat to keep lease alive
        lease.refresh_in_background()
    return success

def run_midnight_job():
    service_id = f"server-{os.getenv('HOSTNAME')}"
    if try_become_leader(service_id):
        send_emails()
```

### With Kubernetes (built-in):
```yaml
# Leader election via Kubernetes Lease object
# Use controller-runtime's leaderelection package
# Only the pod holding the Lease runs scheduled work
```

**Leader election vs. distributed lock:**
- Lock: each server competes per job run
- Leader election: one server is permanently the leader; leader runs all cron jobs; other servers are on hot standby

---

## 5. Solution 4: Idempotent Job + Deduplication Table (Best for Critical Emails)

Even with a distributed lock, the lock holder could crash after partially sending emails. Fix this at the **application level** — make the job idempotent regardless of how many times it runs:

```sql
-- Track which emails have been sent for each scheduled run
CREATE TABLE email_send_log (
    job_run_id VARCHAR(64) NOT NULL,  -- e.g., 'midnight_email:2026-08-12'
    recipient_id BIGINT NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending',
    PRIMARY KEY (job_run_id, recipient_id)
);
```

```python
def send_midnight_emails_idempotent():
    run_id = f"midnight_email:{datetime.utcnow().date()}"
    
    # Find users who haven't received this run's email yet
    pending = db.query("""
        SELECT u.id, u.email FROM users u
        LEFT JOIN email_send_log l 
          ON l.recipient_id = u.id AND l.job_run_id = %s
        WHERE l.recipient_id IS NULL
          AND u.opted_in = TRUE
    """, (run_id,))
    
    for user in pending:
        try:
            send_email(user.email)  # idempotent at SMTP level? No → use dedup
            db.execute("""
                INSERT INTO email_send_log (job_run_id, recipient_id, sent_at, status)
                VALUES (%s, %s, NOW(), 'sent')
                ON CONFLICT DO NOTHING  -- safe if 3 servers race to send to same user
            """, (run_id, user.id))
        except Exception as e:
            log_failure(run_id, user.id, e)
```

**How this prevents duplicates even with 3 servers running:**
1. All 3 servers query `pending` — they all see the same `recipient_id` rows
2. All 3 race to insert into `email_send_log` — the `ON CONFLICT DO NOTHING` (or UNIQUE constraint) means only one succeeds
3. The email itself is sent before the dedup record is written → if server crashes after sending but before writing, a retry will attempt to send again — use email provider's own idempotency key to handle this edge case

---

## 6. Solution 5: Move Cron to a Queue (Production Architecture)

The cleanest fix: **don't run cron on multiple servers at all**. Instead, have cron emit a job to a message queue, and workers process it exactly once.

```
Cron scheduler (single node or elected leader):
  → Enqueue job message to SQS/RabbitMQ/Kafka

Workers (any number of servers):
  → Dequeue message (SQS visibility timeout = job duration)
  → Process exactly once (message deleted on success)
  → If worker crashes → message reappears after timeout → reprocessed
```

**SQS with visibility timeout:**
```python
sqs = boto3.client('sqs')

# Worker picks up message
response = sqs.receive_message(
    QueueUrl=QUEUE_URL,
    MaxNumberOfMessages=1,
    VisibilityTimeout=600  # 10 min — other workers won't see this message
)

if response.get('Messages'):
    message = response['Messages'][0]
    receipt_handle = message['ReceiptHandle']
    
    # Process job
    send_emails()
    
    # Delete message only on success → prevents duplicate processing
    sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt_handle)
    # If we crash before delete → message reappears → at-least-once delivery
```

**For exactly-once:** combine SQS + deduplication table (Solution 4). SQS gives you at-least-once; the dedup table converts it to idempotent-once.

---

## 7. Decision Framework

```
Is the job idempotent already (safe to run multiple times)?
  → Yes: Still add distributed lock to save resources. Use Redis NX lock.
  → No: Must add deduplication.

Can you skip a run if the lock holder crashes?
  → Yes (cache warming, analytics): Redis lock with TTL.
  → No (billing emails, payment processing): Leader election + dedup table.

Is this a greenfield system?
  → Yes: Move scheduled jobs to a queue (SQS/Kafka). Separate scheduling from execution.
  → No: Add Redis lock as a fast fix; plan migration to queue-based architecture.
```

---

## 8. Theoretical Frameworks

### CAP Theorem

The distributed lock approach is **CP**: Redis (in cluster mode) or the DB advisory lock provides consistency (only one leader) at the cost of availability (if the lock service is unreachable, no server runs the job). For the idempotent dedup approach, the system is **AP**: all servers can attempt the job, and the dedup table ensures consistency through application-level coordination rather than preventing concurrent execution.

### PACELC — Latency vs. Consistency

- **EL (Latency):** Skip locking entirely. Accept duplicate emails. Zero overhead.
- **EC (Consistency):** Distributed lock or leader election. Adds 5–20ms per job start for lock acquisition/election. For a once-per-day midnight job, this latency cost is completely irrelevant.

For batch jobs, **always favor EC** — latency overhead is negligible, consistency cost is user-facing (duplicate emails are visible, missing emails are catastrophic).

### Write Amplification

The dedup table approach introduces write amplification: for N emails sent per job run, the system now writes N + 1 records (N dedup entries + 1 job_run record). This is acceptable — the alternative (sending N duplicate emails to all users) has a much higher operational cost.

### Read/Write Trade-off

The idempotent query (`LEFT JOIN email_send_log`) is a read-heavy pattern — it must read the entire dedup table for the current run before writing any records. Optimize with a covering index:

```sql
CREATE INDEX idx_email_log_job_run ON email_send_log(job_run_id, recipient_id);
```

This converts the query from a sequential scan to an index-only scan — O(1) per user check instead of O(N).

### Execution Trade-offs (Sync vs. Async)

| Pattern | Guarantee | Failure Mode |
|---|---|---|
| All 3 servers run the job | At-least-3x execution | Duplicate emails; resource waste |
| Distributed lock (Redis NX) | At-most-once | Skips run if lock holder crashes |
| Leader election (etcd) | Exactly-once (while leader lives) | Leader failover gap (seconds) |
| Queue-based (SQS + dedup) | At-least-once + idempotent | Safest; slightly more complex |

---

## 9. Interview-Ready One-Liner

> "The root fix is in two layers: coordination (only one server should run the job) and idempotency (even if two servers race, effects should be deduplicated). Short-term: Redis `SET NX EX` with a date-scoped key — the first server to acquire it runs the job, others skip. Long-term: move cron emission to a single scheduler node (or elected leader), enqueue to SQS with visibility timeout, and use a dedup table with `ON CONFLICT DO NOTHING` to make the job idempotent regardless of how many times the message is delivered."
