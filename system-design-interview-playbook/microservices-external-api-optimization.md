# A Microservice Is Very Slow Because of External API Calls — How Will You Optimize It?

*Tests knowledge of latency optimization patterns: caching, circuit breakers, async processing, connection pooling, request coalescing, and fault isolation.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Diagnose First — Profile the Latency

Before optimizing, classify the problem precisely:

```
External API call latency profile:
  ┌─────────────────────────────────────────────────────────┐
  │ DNS resolution     │ TCP handshake │ TLS handshake       │
  │ (1–50ms)           │ (1–100ms)     │ (10–250ms)          │
  ├────────────────────┴───────────────┴─────────────────────┤
  │ Request send       │ Server processing │ Response recv   │
  │ (< 1ms)            │ (the variable)    │ (network RTT)   │
  └─────────────────────────────────────────────────────────┘
```

Measure each component:
```python
import httpx
import time

with httpx.Client() as client:
    start = time.perf_counter()
    response = client.get(external_api_url)
    total = time.perf_counter() - start
    
    # httpx exposes timing internals
    elapsed = response.elapsed.total_seconds()
    print(f"Total: {total:.3f}s, Transfer: {elapsed:.3f}s")
```

**Root cause taxonomy:**

| Problem | Signal | Fix |
|---|---|---|
| Connection overhead | High TLS/TCP time on each request | Connection pooling + keep-alive |
| No caching | Same request repeated within seconds | Cache responses in Redis/local |
| Serial blocking calls | Service is single-threaded on awaits | Async/parallel execution |
| External API slow | Consistently high server processing time | Circuit breaker + timeout + fallback |
| N+1 to external API | Calls in a loop per item | Batch API (if supported) or local aggregation |
| No retry on transient errors | Occasional 5xx causes user-visible failures | Exponential backoff + jitter |

---

## 2. Fix 1: Caching (Biggest Impact First)

Most external API calls are for reference data that changes rarely (exchange rates, user profile from auth service, product catalog from 3rd party):

```python
import redis
import json
from functools import wraps
from typing import Optional

r = redis.Redis(host='redis', port=6379, decode_responses=True)

def cached(key_fn, ttl_seconds: int = 60):
    """Cache decorator for external API calls."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = key_fn(*args, **kwargs)
            cached_val = r.get(cache_key)
            if cached_val:
                return json.loads(cached_val)
            
            result = await func(*args, **kwargs)
            r.setex(cache_key, ttl_seconds, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached(key_fn=lambda user_id: f"user_profile:{user_id}", ttl_seconds=300)
async def get_user_profile(user_id: str) -> dict:
    response = await external_auth_api.get(f"/users/{user_id}")
    return response.json()
```

**Cache TTL strategy by data volatility:**
| Data Type | TTL | Invalidation |
|---|---|---|
| Exchange rates | 60s | Time-based only |
| User profile | 5 min | Event-driven (profile update event → invalidate) |
| Product catalog | 15 min | Webhook from provider → invalidate specific keys |
| Static reference data (country codes) | 24h | Manual or on deploy |

---

## 3. Fix 2: Connection Pooling + HTTP Keep-Alive

By default, many HTTP clients open a new TCP+TLS connection per request. At 1,000 RPS, this is 1,000 TLS handshakes/second (each ~150ms) → connection overhead dominates.

```python
# BAD: new connection per request
async def get_data(item_id: str):
    async with httpx.AsyncClient() as client:  # creates new connection
        return await client.get(f"{API_BASE}/items/{item_id}")

# GOOD: shared client with connection pool (singleton at startup)
_client: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            limits=httpx.Limits(
                max_connections=100,       # pool size
                max_keepalive_connections=20,
                keepalive_expiry=30        # seconds
            ),
            timeout=httpx.Timeout(connect=2.0, read=10.0, write=5.0)
        )
    return _client

async def get_data(item_id: str):
    client = get_http_client()
    return await client.get(f"{API_BASE}/items/{item_id}")
    # Reuses existing TCP+TLS connection → ~150ms → ~5ms
```

---

## 4. Fix 3: Parallel / Async Fan-out

If your service makes 5 sequential external API calls (each 200ms) → 1,000ms total. Execute them in parallel:

```python
import asyncio

# BAD: serial (200ms × 5 = 1000ms)
async def get_order_details_serial(order_id: str):
    user = await get_user(order_id)          # 200ms
    product = await get_product(order_id)    # 200ms
    pricing = await get_pricing(order_id)    # 200ms
    inventory = await get_inventory(order_id) # 200ms
    shipping = await get_shipping(order_id)   # 200ms
    return merge(user, product, pricing, inventory, shipping)

# GOOD: parallel (max(200ms, 200ms, ...) = 200ms)
async def get_order_details_parallel(order_id: str):
    user, product, pricing, inventory, shipping = await asyncio.gather(
        get_user(order_id),
        get_product(order_id),
        get_pricing(order_id),
        get_inventory(order_id),
        get_shipping(order_id),
        return_exceptions=True  # don't fail entire gather if one fails
    )
    # Handle individual failures
    if isinstance(user, Exception):
        user = get_cached_user(order_id)  # fallback
    return merge(user, product, pricing, inventory, shipping)
```

**Timeout per call** is critical when running in parallel — one slow API can't block all others if each has its own timeout.

---

## 5. Fix 4: Request Coalescing (Deduplication of In-Flight Requests)

Under high concurrency, multiple requests for the same data arrive simultaneously, all missing cache:

```
T=0ms: Request A for user_id=42 → cache miss → starts external API call
T=1ms: Request B for user_id=42 → cache miss → starts another external API call
T=2ms: Request C for user_id=42 → cache miss → starts another external API call
Result: 3 identical calls to external API for the same data
```

Fix with request coalescing (also called "thundering herd prevention"):

```python
import asyncio
from typing import Dict

_in_flight: Dict[str, asyncio.Future] = {}

async def get_user_coalesced(user_id: str) -> dict:
    # If a request for this user_id is already in-flight, wait for it
    if user_id in _in_flight:
        return await _in_flight[user_id]
    
    loop = asyncio.get_event_loop()
    future = loop.create_future()
    _in_flight[user_id] = future
    
    try:
        result = await external_api.get_user(user_id)
        future.set_result(result)
        return result
    except Exception as e:
        future.set_exception(e)
        raise
    finally:
        del _in_flight[user_id]
```

In Python production: use `aiocache` with the `coalescing=True` option. In Node.js: `dataloader` (Facebook's BatchLoader). In Go: `singleflight.Group`.

---

## 6. Fix 5: Circuit Breaker (Prevent Cascade Failures)

When the external API is slow/down, your service should fail fast rather than accumulating threads blocked on timed-out connections:

```python
from pybreaker import CircuitBreaker

# Open circuit after 5 consecutive failures; try again after 30s
breaker = CircuitBreaker(fail_max=5, reset_timeout=30)

@breaker
async def call_external_api(endpoint: str):
    return await http_client.get(endpoint, timeout=5.0)

async def get_product_with_fallback(product_id: str):
    try:
        return await call_external_api(f"/products/{product_id}")
    except CircuitBreakerError:
        # Circuit is OPEN — external API is known-bad; fail fast
        return get_cached_or_default_product(product_id)
    except httpx.TimeoutException:
        return get_cached_or_default_product(product_id)
```

**Circuit breaker states:**
```
CLOSED (normal)
  → N failures within window
    → OPEN (fail fast, no external calls)
      → After reset_timeout
        → HALF-OPEN (try 1 probe request)
          → Success → CLOSED
          → Failure → OPEN again
```

Production libraries: `resilience4j` (Java), `pybreaker` (Python), `opossum` (Node.js), `go-resiliency` (Go).

---

## 7. Fix 6: Async / Offline Processing for Non-Critical Calls

If the external API call doesn't need to be in the critical path of the user's request, defer it:

```python
# BAD: User waits for external analytics API on every checkout
async def checkout(order: Order):
    result = await process_payment(order)
    await external_analytics_api.track_purchase(order)  # 800ms — user waits
    return result

# GOOD: Emit event, return immediately; worker processes async
async def checkout(order: Order):
    result = await process_payment(order)
    await kafka.produce('purchase_events', order.dict())  # 5ms
    return result  # User gets response in 5ms, not 805ms

# Background worker consumes 'purchase_events' and calls analytics API
```

This is the **Async Write-Behind** pattern — synchronous user path is fast; external API call happens offline with retries.

---

## 8. Fix 7: Batching (If External API Supports It)

Instead of N individual calls, batch into fewer larger calls:

```python
# BAD: N calls to pricing API (one per product)
prices = [await pricing_api.get_price(pid) for pid in product_ids]  # N×200ms

# GOOD: Single batch call
response = await pricing_api.get_prices_batch(product_ids)  # 1×200ms
prices = {item['id']: item['price'] for item in response['prices']}
```

If the external API doesn't support batching: use a **micro-batching window** (collect requests for 10ms, send one batch) — same pattern as Kafka's `linger.ms`.

---

## 9. Production Architecture: All Layers Combined

```
Inbound request
      │
      ▼
[Cache check: Redis]
      │ miss
      ▼
[Request coalescing: singleflight] ← dedup in-flight requests
      │
      ▼
[Circuit breaker check] ─ OPEN → [Fallback / stale cache]
      │ CLOSED
      ▼
[HTTP client with connection pool] → External API
      │
[Timeout: 5s per call]             [Retry: 3x with exp backoff + jitter]
      │
      ▼
[Cache write: Redis TTL=60s]
      │
      ▼
Response
```

---

## 10. Theoretical Frameworks

### CAP Theorem

The caching + fallback strategy is an explicit **AP** trade-off: when the external API is partitioned (down), the service returns stale cached data (available but not fully consistent). For non-critical data (product descriptions, recommendation scores), this is correct. For consistency-critical data (account balance, inventory), the right answer is to return a degraded experience or error, not stale data.

### PACELC — Latency vs Consistency

- **EL (Latency favored):** Serve from cache, accept TTL-based staleness. Latency: ~1ms (Redis). Consistency: potentially stale by TTL.
- **EC (Consistency favored):** Always call external API for fresh data. Latency: 50–500ms. Consistency: always current.

The TTL value is your PACELC tuning knob — shorter TTL = more consistent, higher latency burden.

### Write Amplification

The async/offline fix (Kafka fan-out) is a classic write amplification trade-off: instead of 1 synchronous external call in the user path, you now have 1 Kafka write (low cost, fast) + 1 async external call from the worker. Total operations increased, but the critical path latency collapsed.

### Read/Write Trade-off

The request coalescing pattern is read-path optimization at the cost of coordination overhead. For read-heavy workloads (product catalog lookups, user profile fetches), it eliminates N-1 redundant external calls when N requests arrive simultaneously for the same resource — a massive win when N is large.

---

## 11. Interview-Ready Priority Matrix

| Fix | P50 Latency Reduction | Implementation Effort | Production Risk |
|---|---|---|---|
| Redis caching (TTL-based) | 90–99% (cache hit) | Low | Low |
| Connection pooling | 50–70% (eliminate TLS per req) | Low | Very Low |
| Parallel async fan-out | `N×serial → max(parallel)` | Medium | Medium (error handling) |
| Request coalescing | Up to 10x under high concurrency | Medium | Low |
| Circuit breaker | Prevents cascades (not latency fix) | Medium | Low |
| Batch API calls | 80–90% (N calls → 1) | Medium-High | Low |
| Async / offline processing | 100% for non-critical path | High | Medium (eventual consistency) |

---

## 12. Interview-Ready One-Liner

> "Optimize in layers: (1) Cache at Redis for reference data with appropriate TTL — eliminates 90%+ of external calls; (2) HTTP connection pool with keep-alive — eliminates TLS handshake overhead; (3) async fan-out for independent calls — collapses N×serial latency to max(parallel); (4) circuit breaker with stale-cache fallback — prevents the slow external API from taking down your service; (5) defer non-critical calls to Kafka + async worker — removes them from the user's request path entirely."
