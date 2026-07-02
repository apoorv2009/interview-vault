# System Design Calculations Cheat Sheet

*Last updated: July 2026*

---

## Table of Contents

1. [QPS Calculations](#1-qps-calculations)
2. [Storage Calculations](#2-storage-calculations) *(coming soon)*
3. [Bandwidth Calculations](#3-bandwidth-calculations) *(coming soon)*
4. [Database Capacity Calculations](#4-database-capacity-calculations) *(coming soon)*

---

## 1. QPS Calculations

### QPS Formula

**QPS = (DAU × Requests/day) ÷ 86,400 seconds/day**

Or for quick mental math:

**QPS ≈ (DAU × Requests/day) ÷ 100K** (approximate, ±15% error acceptable)

Then multiply by peak multiplier to get **Peak QPS**.

---

### Key Definitions

- **DAU** = Daily Active Users (users active today, not all-time)
- **Requests/day** = average requests per active user per day
- **Peak multiplier** = how many times normal during busiest hour (2X, 3X, 4X, 5X)
- **Average QPS** = spread across 24 hours
- **Peak QPS** = during busiest hour (what servers must handle)

---

### QPS Comparison Table — 15 Systems

| System | DAU (M) | Req/day | Peak Mult | Avg QPS | Peak QPS | Servers* | Design Approach |
|---|---:|---:|---:|---:|---:|---:|---|
| **Twitter** | 150 | 20 | 4X | 34,722 | 138,889 | 140 | Cache feed, sharding for writes |
| **YouTube** | 200 | 50 | 5X | 115,740 | 578,700 | 580 | CDN for videos, replicated metadata |
| **Instagram** | 300 | 100 | 4X | 347,222 | 1,388,889 | 1,389 | Photo storage + CDN, like/comment sharding |
| **WhatsApp** | 500 | 100 | 5X | 578,704 | 2,893,519 | 2,894 | Message queue, async delivery |
| **Uber** | 50 | 100 | 3X | 57,870 | 173,611 | 174 | Real-time location, event streaming |
| **Netflix** | 100 | 30 | 5X | 34,722 | 173,611 | 174 | CDN edge nodes, streaming metadata |
| **Slack** | 5 | 500 | 5X | 289,352 | 1,446,759 | 1,447 | Message queue, WebSocket connections |
| **Google Search** | 1000 | 3 | 2X | 34,722 | 69,444 | 70 | Distributed index, cache heavily |
| **Facebook** | 400 | 150 | 4X | 694,444 | 2,777,778 | 2,778 | Graph DB, feed ranking, full sharding |
| **LinkedIn** | 300 | 50 | 4X | 173,611 | 694,444 | 694 | Connection graph, recommendation engine |
| **Stripe** | 1** | 1000 | 2X | 11,574 | 23,148 | 23 | Payment processing, high consistency |
| **Banking App** | 5 | 100 | 6X | 5,787 | 34,722 | 35 | Multi-region, strong consistency, 99.99% |
| **Notification Service** | 50 | 5 | 3X | 1,736 | 5,208 | 6 | Simple queue, high delivery reliability |
| **E-commerce (Amazon-like)** | 100 | 200 | 4X | 231,481 | 925,926 | 926 | Product search + CDN, inventory sharding |
| **Weather App** | 300 | 10 | 3X | 34,722 | 104,167 | 104 | Cache weather heavily, CDN |

**\* Servers = Peak QPS ÷ 1K QPS per server (typical capacity)*
**\*\* Stripe DAU = business accounts, not end users*

---

### Step-by-Step Examples

#### Example 1: Twitter

**Inputs:**
```
DAU: 150 million
Requests per user per day: 20
Peak multiplier: 4X
```

**Step 1: Total requests per day**
```
150M × 20 = 3,000,000,000 requests/day = 3 billion
```

**Step 2: Convert to average QPS (exact)**
```
Seconds in day: 86,400
Average QPS = 3,000,000,000 ÷ 86,400 = 34,722 QPS
```

**Step 3: Convert to average QPS (quick math)**
```
Average QPS ≈ 3,000,000,000 ÷ 100,000 = 30,000 QPS
(±15% error, acceptable for interviews)
```

**Step 4: Calculate peak QPS**
```
Peak QPS = 34,722 × 4 = 138,889 QPS ≈ 140K QPS peak
```

**Step 5: Servers needed**
```
Typical server capacity: 1,000 QPS per server
Servers = 140K ÷ 1K = 140 servers

With 2X redundancy: 140 × 2 = 280 servers total
Cost: 280 × $5K/month = $1.4M/month
```

**Design Impact:**
```
At 140K QPS peak:
  ✓ Need load balancer (distribute across 140 servers)
  ✓ Need caching layer (Redis/Memcached)
  ✓ Need database read replicas
  ✓ Need sharding for write DB (tweets table)
  ✓ Need CDN for media (photos, videos)
  ✓ Complexity: MEDIUM-HIGH
```

---

#### Example 2: Notification Service

**Inputs:**
```
DAU: 50 million
Requests per user per day: 5 (check notifications 5 times)
Peak multiplier: 3X
```

**Step 1: Total requests per day**
```
50M × 5 = 250,000,000 = 250 million requests/day
```

**Step 2: Average QPS**
```
250M ÷ 86,400 = 2,894 QPS ≈ 3K QPS avg
(or 250M ÷ 100K = 2,500 QPS with quick math)
```

**Step 3: Peak QPS**
```
Peak QPS = 2,894 × 3 = 8,681 QPS ≈ 9K QPS peak
```

**Step 4: Servers needed**
```
Servers = 9K ÷ 1K = 9 servers
With 2X redundancy: 18 servers
Cost: 18 × $5K/month = $90K/month
```

**Design Impact:**
```
At 9K QPS peak:
  ✓ Simple architecture (single DB possible)
  ✓ Basic load balancer only
  ✓ Can use simple queue (RabbitMQ, Redis)
  ✓ No sharding needed yet
  ✓ Complexity: LOW
  ✓ 15X cheaper than Twitter
```

---

#### Example 3: YouTube

**Inputs:**
```
DAU: 200 million
Requests per user per day: 50
Peak multiplier: 5X
```

**Step 1: Total requests per day**
```
200M × 50 = 10,000,000,000 = 10 billion requests/day
```

**Step 2: Average QPS**
```
10B ÷ 86,400 = 115,740 QPS ≈ 116K QPS avg
(or 10B ÷ 100K = 100K QPS with quick math)
```

**Step 3: Peak QPS**
```
Peak QPS = 115,740 × 5 = 578,700 QPS ≈ 580K QPS peak
```

**Step 4: Servers needed**
```
Servers = 580K ÷ 1K = 580 servers
With 2X redundancy: 1,160 servers
Cost: 1,160 × $5K/month = $5.8M/month
```

**Design Impact:**
```
At 580K QPS peak:
  ✓ MASSIVE infrastructure needed
  ✓ Must use global CDN (serve videos from edge)
  ✓ Heavy sharding across regions
  ✓ Multiple datacenters required
  ✓ Complex cache strategy (LRU, tiered)
  ✓ Complexity: VERY HIGH
  ✓ Cost: $5.8M/month just for servers (+ storage, bandwidth)
```

---

### Quick Mental Math Tricks

**Convert DAU to QPS instantly:**

```
Rule: (DAU × Req/day) ÷ 100K = ballpark average QPS

Twitter:      (150M × 20) ÷ 100K = 30K QPS avg
YouTube:      (200M × 50) ÷ 100K = 100K QPS avg
Instagram:    (300M × 100) ÷ 100K = 300K QPS avg
WhatsApp:     (500M × 100) ÷ 100K = 500K QPS avg

Then multiply by peak multiplier (2X–6X) for peak QPS.
```

---

### Design Decision Matrix by QPS

| QPS Range | Servers | Architecture | Redundancy | Cost/month | Complexity |
|---|---|---|---|---|---|
| <1K | 1 | Single server | None | $5K | Very low |
| 1K–10K | 1–10 | Load balancer + 1 DB | 2X (active-passive) | $50K–100K | Low |
| 10K–100K | 10–100 | LB + cache + replicas | 2X (multi-AZ) | $100K–1M | Medium |
| 100K–1M | 100–1K | Sharding + CDN + mesh | 3X (multi-region) | $1M–10M | High |
| >1M | 1K+ | Global edge + event stream | 3X+ (full redundancy) | $10M+ | Very high |

---

## 2. Storage Calculations

*(Coming soon — we'll add this after QPS is solid)*

---

## 3. Bandwidth Calculations

*(Coming soon — we'll add this after Storage)*

---

## 4. Database Capacity Calculations

*(Coming soon — we'll add this after Bandwidth)*

---
