# System Design Calculations Cheat Sheet

*Last updated: July 2026*

---

## QPS Formula

**Peak QPS = (DAU × Requests/day) ÷ 86,400 × Peak_multiplier**

Example: (150M × 20) ÷ 86,400 × 4 = **138,889 QPS peak**

---

## All Systems — QPS Calculations in One Table

| System | DAU (M) | Req/day | Calculation | Avg QPS | Peak Mult | Peak QPS | Servers* | Design Notes |
|---|---:|---:|---|---:|---:|---:|---:|---|
| **Twitter** | 150 | 20 | (150M×20)÷100K = 30K | 34,722 | 4X | 138,889 | 140 | Cache feed, write sharding |
| **YouTube** | 200 | 50 | (200M×50)÷100K = 100K | 115,740 | 5X | 578,700 | 580 | CDN videos, metadata replicas |
| **Instagram** | 300 | 100 | (300M×100)÷100K = 300K | 347,222 | 4X | 1,388,889 | 1,389 | Photo CDN, like sharding |
| **WhatsApp** | 500 | 100 | (500M×100)÷100K = 500K | 578,704 | 5X | 2,893,519 | 2,894 | Message queue, async |
| **Facebook** | 400 | 150 | (400M×150)÷100K = 600K | 694,444 | 4X | 2,777,778 | 2,778 | Graph DB, feed ranking |
| **Uber** | 50 | 100 | (50M×100)÷100K = 50K | 57,870 | 3X | 173,611 | 174 | Real-time location, events |
| **LinkedIn** | 300 | 50 | (300M×50)÷100K = 150K | 173,611 | 4X | 694,444 | 694 | Connection graph, ranking |
| **Slack** | 5 | 500 | (5M×500)÷100K = 25K | 289,352 | 5X | 1,446,759 | 1,447 | WebSocket, message queue |
| **Netflix** | 100 | 30 | (100M×30)÷100K = 30K | 34,722 | 5X | 173,611 | 174 | CDN edges, streaming data |
| **E-commerce** | 100 | 200 | (100M×200)÷100K = 200K | 231,481 | 4X | 925,926 | 926 | Search indexing, CDN |
| **Google Search** | 1000 | 3 | (1000M×3)÷100K = 30K | 34,722 | 2X | 69,444 | 70 | Distributed index, cache |
| **Banking App** | 5 | 100 | (5M×100)÷100K = 5K | 5,787 | 6X | 34,722 | 35 | Multi-region, 99.99% HA |
| **Notification** | 50 | 5 | (50M×5)÷100K = 2.5K | 2,894 | 3X | 8,681 | 9 | Simple queue, reliable |
| **Weather App** | 300 | 10 | (300M×10)÷100K = 30K | 34,722 | 3X | 104,167 | 104 | Heavy cache, CDN |
| **Stripe** | 1** | 1000 | (1M×1000)÷100K = 10K | 11,574 | 2X | 23,148 | 23 | Payment, high consistency |

**Column Explanations:**
- **DAU (M)** = Daily Active Users in millions
- **Req/day** = Average requests per user per day
- **Calculation** = Step-by-step math shown
- **Avg QPS** = Requests spread across 24 hours
- **Peak Mult** = Multiplier during busiest hour (2X, 3X, etc.)
- **Peak QPS** = What infrastructure must handle (Avg × Peak Mult)
- **Servers\*** = Peak QPS ÷ 1,000 (typical server capacity per QPS)
- **Design Notes** = Key architectural choices at this QPS

**\* Server count assumes 1,000 QPS capacity per server (typical). Add 2X for redundancy.**
**\*\* Stripe DAU = business accounts, not end users**

---

## 2. Storage Calculations

*(Coming soon)*

---

## 3. Bandwidth Calculations

*(Coming soon)*

---

## 4. Database Capacity Calculations

*(Coming soon)*

---
