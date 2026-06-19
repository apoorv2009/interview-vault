# How can 3 billion Instagram users keep scrolling forever? If every user fetched 1,000 posts at once, the servers would melt down — so how does Instagram know exactly which posts to send next?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Instagram never fetches "the feed" — it fetches a small page (10–20 posts) at a time, using a cursor that encodes exactly where you left off, and a ranking service that has already pre-computed (or computes just-in-time) which posts are worth showing you next. Infinite scroll isn't infinite data — it's a small, repeatedly-refilled buffer plus a pointer that remembers position, paired with a recommendation system that decides ordering, not just pagination that decides position.

- The naive (broken) approach: `OFFSET 1000 LIMIT 20` — ask the database for posts 1000–1020. This degrades badly: the database still has to scan and discard the first 1000 rows on every request, gets slower the deeper you scroll, and falls apart entirely on a feed that's being inserted into constantly (new posts shift everyone's offsets).
- The actual approach — cursor-based pagination: Instead of "give me page 51," the client says "give me posts after the one with this opaque cursor token." The cursor encodes a position (commonly a timestamp + post ID, or a rank score + ID, base64-encoded) that the server can seek to directly via an index, without scanning anything before it. This is O(1) relative to scroll depth — page 1 and page 5,000 cost the same.
- Why ranking, not just chronological order: Instagram's feed isn't "everything from people you follow, newest first" — it's algorithmically ranked by a model predicting engagement likelihood. The "which post comes next" decision is made by a candidate-generation + ranking pipeline that runs ahead of your scroll, not by the database deciding order.
- Pre-computed vs. just-in-time: For most users, a feed-generation service periodically (or on a trigger) computes a ranked candidate list and writes it to a fast store (Redis/in-memory) keyed by user — this is the "fan-out on write" model. When you scroll, the API mostly just reads the next slice of that pre-computed list and refills it asynchronously as you approach the end — it does NOT re-run the full ranking model on every single scroll request, which would be far too slow and expensive at 3 billion users.
- Why this scales: The expensive work (candidate generation, ML ranking) happens once per refresh cycle per user, amortized over many scroll requests, not once per request. Your scrolling is cheap; the system's intelligence is expensive but infrequent.

**DEEP DIVE — Technical Architecture Below**

## End-to-End Feed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  CANDIDATE GENERATION (runs periodically / event-triggered)        │
│   - Pull candidates from: people you follow, suggested/explore,     │
│     ads inventory, recently active accounts                         │
│   - Output: a few thousand candidate post IDs per user              │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  RANKING SERVICE (ML model — engagement prediction)                  │
│   - Scores each candidate: P(like), P(comment), P(watch-time),       │
│     P(share), recency decay, author relationship strength            │
│   - Output: ranked list of post IDs, sorted by predicted score        │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  FEED CACHE (Redis / per-user ranked list, "fan-out on write")       │
│   - Stores the ranked list per user, refreshed periodically and      │
│     incrementally extended as new candidates arrive                  │
└───────────────────────────┬───────────────────────────────────────┘
                            │ GET /feed?cursor=<opaque_token>&limit=20
┌───────────────────────────▼───────────────────────────────────────┐
│  FEED API                                                            │
│   - Decodes cursor → position in the ranked list                     │
│   - Returns next 20 post IDs + new cursor pointing past them         │
│   - Hydrates post IDs into full post objects (media URLs, captions,  │
│     like counts) via a separate post-metadata service/cache           │
└──────────────────────────────────────────────────────────────────┘
```

## Cursor Anatomy

```
Cursor (opaque to client, base64-encoded internally):
  {
    "rank_score": 0.8421,
    "post_id": "3F9A2C...",
    "generated_at": "2026-06-18T10:32:00Z"
  }
  → client just passes this back verbatim on the next request
  → server decodes it, seeks directly to that position in the
    ranked list (or re-derives position via index on rank_score+id)
  → NO re-scanning of already-served posts, regardless of scroll depth
```

## Offset Pagination vs. Cursor Pagination

| | Offset (`LIMIT 20 OFFSET 1000`) | Cursor-based |
| --- | --- | --- |
| Cost at deep scroll | Grows with offset — DB must scan/skip prior rows | Constant — direct seek via index |
| Behavior under concurrent inserts | Items can shift, causing duplicates/skips as new posts insert before your offset | Stable — cursor is relative to a specific item, immune to insertions elsewhere |
| Supports algorithmic (non-chronological) ranking | Awkward — "offset" implies a fixed total order | Natural — cursor encodes rank position directly |
| Implementation complexity | Trivial | Requires careful cursor design and index support |

## Fan-out Models for Feed Generation

| Model | How it works | Best for |
| --- | --- | --- |
| Fan-out on write (push) | When a post is created, immediately push it into every follower's pre-computed feed list | Users with normal-sized follower graphs — keeps reads cheap |
| Fan-out on read (pull) | Feed is assembled at request time by querying recent posts from followed accounts and ranking on the fly | Celebrity/high-fan-out accounts — pushing to millions of feeds on every post would be prohibitively expensive |
| Hybrid (what Instagram/Twitter actually use) | Fan-out on write for most accounts; fan-out on read (merged in at request time) for accounts above a follower threshold | Production systems at this scale — avoids the "celebrity write storm" problem while keeping normal-user reads fast |

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: The feed is an AP system by design — when a partition or replica lag occurs, Instagram would rather show you a slightly stale or slightly out-of-order feed (availability) than make you wait or show an error (consistency). Nobody notices if a post that was liked 2 seconds ago shows an updated like-count 2 seconds late; everybody notices if scrolling hangs.
- **PACELC**: Under normal operation (no partition), there's still a latency-vs-consistency choice in how fresh the pre-computed feed cache is allowed to be. Refreshing the ranked candidate list more often gives fresher (more "consistent" with the latest posts) results but costs more compute and cache-invalidation traffic; refreshing less often is cheaper and faster to serve but staler. Instagram's actual choice (periodic refresh + incremental extension, not real-time re-ranking per scroll) is explicitly choosing L over C for this workload.
- **Write Amplification**: Fan-out-on-write is, by definition, a write amplification strategy — one post creation event becomes N writes (one per follower's feed cache). This is exactly why celebrity accounts get the hybrid treatment: fanning out one post to 100 million followers as 100 million individual cache writes would be catastrophic write amplification, so it's deferred to read-time merge instead.
- **Read/Write Trade-off**: This entire architecture is a read-heavy optimization — scrolling (reads) vastly outnumbers posting (writes) for any given user, so the system pays the cost of ranking and fan-out at write/refresh time specifically to make the much-more-frequent read (scroll) operation cheap. This is the canonical justification for "do the expensive work once, serve it many times" caching architecture.
- **Execution Trade-offs**: Candidate generation and ranking run asynchronously, ahead of the user's actual scroll — by the time you've scrolled to position 980, the system has likely already asynchronously extended your ranked list past 1,000 in the background (prefetch-ahead pattern), so the synchronous, latency-sensitive path (the actual API response to your scroll) only ever does cheap cursor-seek + hydration, never the expensive ranking computation inline.
