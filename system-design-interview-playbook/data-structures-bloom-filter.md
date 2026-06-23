# How is Gmail username availability check instant?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Gmail uses a Bloom Filter — a tiny data structure that sits entirely in memory (RAM) and can answer "is this username taken?" in under 1 millisecond for most cases, without ever touching the database.

- The problem: Gmail has 1.8 billion accounts. Checking if "abcdef" is taken means finding it among 1.8 billion names. A normal database query takes 5–20ms. Multiply by millions of signups per day with multiple keystrokes each — that's billions of DB queries. The database would collapse.
- What is a Bloom Filter: Imagine a huge sheet of 8 billion light switches (all OFF). When someone creates username "alice", you flip ON exactly 3 specific switches (determined by hashing "alice" 3 times). Later, to check if "alice" is taken: hash it 3 times, check those same 3 switches. If ANY switch is OFF → definitely not taken. If ALL are ON → probably taken (confirm with DB).
- Why "probably" not "definitely"?: Different usernames might flip the same switches by coincidence. So "all switches ON" means "probably taken" not "certainly taken". This is a 1% false positive rate — 1% of "available" usernames will say "taken" and need a DB confirmation. No false negatives — it NEVER says "available" for a taken username.
- For 1.8 billion Gmail accounts: The Bloom filter fits in about 2.5 GB of RAM. Checking any username = 3 array lookups = under 1 millisecond. No database involved for 99% of checks.
- The other 1%: Goes to Redis cache (1–2ms). If not cached, hits the Accounts database (5–20ms). Result is cached in Redis so the next check for that popular username is fast.
- Debouncing: JavaScript waits 300ms after your last keystroke before sending the check. Typing "abcdef" (6 characters) fires only 1 API call, not 6.
- The final registration: The instant check is just for UX feedback. The real gate is the DB write with a unique constraint. Two users simultaneously seeing "available" for the same name: one succeeds, one gets a "try another" — handled gracefully.

**DEEP DIVE — Technical Architecture Below**

## Multi-Layer Lookup Architecture

```
  User types "abcdef" (after 300ms debounce)
        │
        ▼
  Layer 1: Bloom Filter  (<1ms, in RAM)
    hash1("abcdef") → bit[7] = 0  → DEFINITELY NOT TAKEN
    Return "available" immediately. DB never touched. ✓
```

```
  (If Bloom says "possibly taken"):
        │
        ▼
  Layer 2: Redis Cache  (1–2ms)
    GET username:cache:abcdef  → hit or miss
```

```
  (If cache miss):
        │
        ▼
  Layer 3: Accounts DB  (5–20ms)
    SELECT 1 FROM users WHERE username = "abcdef"
    → Cache result in Redis for 60 seconds
```

## How the Bloom Filter Works

```
  8 billion bits, all OFF at start
```

```
  INSERT "alice":
    hash1("alice") = 42   → flip bit[42] ON
    hash2("alice") = 891  → flip bit[891] ON
    hash3("alice") = 3    → flip bit[3] ON
```

```
  CHECK "abcdef":
    hash1("abcdef") = 7   → bit[7] = OFF → DEFINITELY NOT TAKEN ✓
    Return "available" without any DB call.
```

```
  CHECK "alice":
    All 3 bits are ON → "probably taken" → check DB to confirm
```

## Scale Numbers

| Metric | Value |
| --- | --- |
| Gmail accounts | ~1.8 billion |
| Bloom filter RAM size | ~2.5 GB |
| Check time | <1 ms |
| False positive rate | ~1% |
| DB queries eliminated | >99% |

## Theoretical Framework — Interview Talking Points

- Read/Write Trade-off: The Bloom filter is an extreme read optimization. At the cost of 2.5 GB RAM and async update writes, 99% of DB reads are eliminated. Username availability is checked billions of times per day, written orders of magnitude less. Classic read-heavy optimization.
- CAP Theorem: The check is AP: briefly says "available" for a username registered milliseconds ago (eventual consistency). The final registration DB write is CP: unique constraint enforces true consistency. Correct layering — use AP for responsive UX, CP for data integrity.
