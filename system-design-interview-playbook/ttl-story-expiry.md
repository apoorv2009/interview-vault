# Instagram Stories expire after exactly 24 hours. What mechanism tracks and enforces that?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Instagram does NOT run a timer per story. Instead, every story has an "expires_at" timestamp stored in the database. When you request stories, the server simply filters out anything with expires_at in the past.

- Simple analogy: Think of a grocery store checking expiry dates on milk. The store doesn't watch each carton 24/7. When you pick one up, the cashier checks the date. If it's past today, you can't buy it. Stories work the same way — checked at read time.
- At story creation: Instagram stores: expires_at = now + 86400 seconds. That's it — a single timestamp column.
- At story fetch: Every query automatically adds: WHERE expires_at > NOW(). Stories past their time are simply never returned. This is instant and costs almost nothing.
- Background cleanup (physical deletion): A background worker runs every 30 seconds, finds all stories past their expiry using a Redis sorted set, and marks them for deletion. This is separate from hiding — the story is hidden immediately, deleted later.
- The cache layer: Stories stored in Redis cache get an expiry time too (EX = seconds until expiry). They auto-delete from cache at the right moment — even if the background worker is slow.
- Why not a cron job?: A cron job scanning millions of stories every minute would be extremely slow. The sorted set approach fetches only expired stories in one fast query — like finding all items in a sorted list before a certain score.

**DEEP DIVE — Technical Architecture Below**

## The Two Phases

| Phase | What Happens | When | Mechanism |
| --- | --- | --- | --- |
| Logical Expiry | Story disappears for viewers | Exactly at T+24h | expires_at > NOW() in every query |
| Physical Deletion | Data removed from DB, cache, S3 | Minutes/hours after T+24h | Redis sorted set + delayed job |

## Full Architecture

```
  WRITE (story posted):
  ┌─────────────────────────────────────────────────────────┐
  │  DB:    INSERT story { expires_at = NOW()+86400 }       │
  │  Redis: ZADD stories:expiry <unix_expiry> <story_id>   │
  │  Queue: enqueue(delete_job, delay=86400s)               │
  └─────────────────────────────────────────────────────────┘
```

```
  READ (fetching stories):
  ┌─────────────────────────────────────────────────────────┐
  │  SELECT * FROM stories                                   │
  │  WHERE user_id = X AND expires_at > NOW()              │
  │  ← expired stories are simply invisible                  │
  └─────────────────────────────────────────────────────────┘
```

```
  BACKGROUND (every 30 seconds):
  ┌─────────────────────────────────────────────────────────┐
  │  ZRANGEBYSCORE stories:expiry 0 <current_time>          │
  │  → gets all expired story IDs in one fast query         │
  │  → soft-delete in DB, evict from cache                  │
  └─────────────────────────────────────────────────────────┘
```

## Why Redis Sorted Set for Background Cleanup?

A sorted set stores story IDs sorted by their expiry timestamp (the score). Finding all expired stories = one range query: "Give me all items with score less than NOW." This is O(log N + M) — extremely fast regardless of how many stories exist.

```
# Redis sorted set: score = expiry unix timestamp
ZADD stories:expiry  1704067200  story:abc   ← expires at this time
ZADD stories:expiry  1704067230  story:def
```

```
# Every 30s: get ALL expired stories in one call
ZRANGEBYSCORE stories:expiry 0 <current_unix_time>
→ returns [story:abc, story:def] instantly
```

## Theoretical Framework — Interview Talking Points

- CAP Theorem: The expiry system is AP. During a Redis partition, the DB read path (expires_at > NOW()) continues independently. Background cleanup may lag, but users never see expired stories. Physical deletion consistency is sacrificed — stories may linger in storage for minutes/hours, which is fine.
- Read/Write Trade-off: The system is deliberately read-optimized. The read path is just one indexed column check (O(1)). All cleanup complexity happens asynchronously on the write path. Correct trade-off since stories are read 100x more than they expire.
- Write Amplification: Deleting one expired story involves writes to: DB (soft-delete), Redis cache (DEL), CDN (purge), S3 (delete). Event-driven approach distributes this load uniformly. A naive cron DELETE-WHERE creates thundering-herd write spikes on every run.
