# A user thinks airlines hike prices because they searched again. As a software engineer, explain why the price actually changed.

**SIMPLE EXPLANATION — Read This First**

Short Answer: The price almost certainly didn't change *because* the user searched — that's a correlation/causation mistake born from anthropomorphizing the system. Flight prices are computed fresh on (or near) every search request by a pricing engine that's reacting to inventory state, time, and demand signals that are changing continuously and independently of any individual searcher — your search just happened to sample the price function at two different points in a constantly-moving timeline. As an engineer, the job is to explain the actual sources of that variance: cache TTL expiry, dynamic seat-class inventory shifts, real competitor/demand-based repricing, and (occasionally, legitimately) personalization — while being honest that "tracking you" is a much rarer and more narrowly regulated phenomenon than people assume.

- Source #1 — Prices are not static rows in a database, they're computed: Airline pricing runs through a revenue management system that recalculates fares based on remaining seats in each fare bucket, time-to-departure, historical booking curves, and competitor pricing feeds. This recalculation can happen many times per hour, independent of any specific user — you're not causing the change, you're sampling a moving target.
- Source #2 — Seat inventory buckets get consumed in real time: Airlines sell the same physical flight across multiple fare classes/buckets (e.g., 10 seats at $200, 10 at $250, 10 at $300...). Between your first search and second search, other customers (possibly thousands, on a popular route) may have booked into the cheapest bucket, which is now sold out — so the *next* search legitimately returns the next-cheapest bucket's price. This is inventory-driven, not user-targeted.
- Source #3 — Cache TTL and search-result staleness: The price shown on a search results page is often served from a cache with a TTL (e.g., 5–15 minutes) to avoid hammering the pricing engine on every page view. Your first search might have hit a slightly stale cached price; your second search (especially after some time, or from a different session/cache shard) might hit freshly computed inventory — producing an apparent "increase" that's actually just the cache catching up to reality.
- Source #4 — Distributed system inconsistency across search instances: At airline scale, search requests are load-balanced across many servers/regions, each potentially with slightly different cache state or even querying slightly different GDS (Global Distribution System) endpoints with propagation delay. Two searches seconds apart can hit different backend instances with different views of current inventory — an eventual-consistency artifact, not intent.
- What's actually rare (and the engineer's honest caveat): True "this specific user searched repeatedly so we'll raise the price for them" dynamic personalized markup is something airlines have repeatedly denied doing, is reputationally and (in some jurisdictions) legally risky, and is hard to even implement reliably given how pricing is architected around inventory buckets rather than per-user state. The much more mundane explanation (inventory + cache + time) accounts for the overwhelming majority of observed price changes, and a good engineer should say so rather than feeding the popular myth — that intellectual honesty is itself part of a strong interview answer.

**DEEP DIVE — Technical Architecture Below**

## Where the "Same Search, Different Price" Actually Comes From

```
┌─────────────────────────────────────────────────────────────────┐
│  Revenue Management System (offline/batch + real-time)             │
│   - Recomputes fare-bucket pricing based on:                        │
│     remaining inventory per bucket, time-to-departure curve,        │
│     historical demand patterns, competitor fare feeds                │
│   - Pushes updated bucket prices to the live pricing service         │
└───────────────────────────┬───────────────────────────────────────┘
                            │ periodic push / event-triggered update
┌───────────────────────────▼───────────────────────────────────────┐
│  Live Pricing Service                                                │
│   - Given (route, date, cabin), returns current lowest available     │
│     bucket price                                                      │
│   - Backed by a cache layer (TTL'd) to absorb search request volume  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│  Search API (load-balanced across many instances/regions)            │
│   Search #1 (10:00:00) → hits cache, bucket A ($200) still cached     │
│   [other customers book 6 seats in bucket A in the meantime]          │
│   Search #2 (10:04:30) → cache expired, refetch → bucket A sold out,  │
│                          bucket B ($260) is now the lowest available  │
│   → User sees a $60 increase. Root cause: inventory depletion +       │
│     cache expiry, not "the system saw I searched twice."             │
└──────────────────────────────────────────────────────────────────┘
```

## Fare Bucket Mechanics (Why Price ≠ a Single Number)

| Bucket | Seats allocated | Price | Status at Search #1 | Status at Search #2 |
| --- | --- | --- | --- | --- |
| A | 10 | $200 | 4 remaining → shown to user | 0 remaining (sold during interval) |
| B | 10 | $260 | 10 remaining | 10 remaining → now the cheapest, shown to user |
| C | 15 | $310 | 15 remaining | 15 remaining |

The "price the website shows" is just "the lowest-priced bucket with remaining inventory" — a derived value, recomputed on every query against live inventory state, not a stored price that something decided to "raise."

## Plausible Causes Ranked by Actual Frequency

| Cause | Frequency | User-targeted? |
| --- | --- | --- |
| Inventory bucket depletion (others booked the cheap seats) | Very common | No — purely inventory-driven |
| Cache TTL expiry between searches | Very common | No — purely time-driven |
| Revenue management batch repricing cycle | Common | No — driven by aggregate demand signals |
| Distributed cache/region inconsistency | Occasional | No — an eventual-consistency artifact |
| Currency/exchange-rate or tax recalculation (different time, different rate) | Occasional | No |
| True per-user personalized markup based on search history | Rare / disputed / reputationally risky | Yes, if it exists at all in a given system |

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: Search results are served from an AP-leaning architecture — the system favors availability (always return *a* price, fast) over strict consistency (always return the one true, fully up-to-date price across every region/cache simultaneously). The "price changed" experience is a direct, user-visible symptom of that AP choice: different searches can observe different, both-valid-at-the-time snapshots of inventory state.
- **PACELC**: Even with no partition, there's a deliberate latency-vs-consistency trade in the cache TTL choice — a longer TTL gives faster, cheaper responses (lower load on the pricing engine) at the cost of showing increasingly stale prices; a shorter TTL gives fresher prices at higher infrastructure cost and latency. The TTL value is a quantified version of exactly this trade-off, and a good engineer should be able to say what TTL the system likely uses and why.
- **Write Amplification**: Not a primary lens here, but relevant to the revenue management batch job — recalculating prices for every bucket across every route/date combination on a schedule is itself a large write workload; airlines optimize this by recomputing more frequently for high-demand, near-term routes and less frequently for low-demand, far-out dates, an explicit prioritization of where the "write" budget goes.
- **Read/Write Trade-off**: This system is overwhelmingly read-heavy (millions of searches per booked seat), which is exactly why the cache layer exists — the pricing engine's actual computation (the "write" of a new price) is amortized across a huge number of cache-served reads, and the staleness window is the deliberate cost of that read optimization.
- **Execution Trade-offs**: Real-time, synchronous repricing on every single search request (full inventory + revenue-management recalculation inline) would be accurate but prohibitively expensive at airline search volumes; the actual architecture uses asynchronous, periodic (or event-triggered) repricing decoupled from the read path, accepting a bounded staleness window in exchange for being able to serve search traffic cheaply and fast — the same execution trade-off pattern as feed pre-computation or any other read-heavy, eventually-consistent system.
