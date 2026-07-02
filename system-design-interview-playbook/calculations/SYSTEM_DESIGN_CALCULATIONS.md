# System Design Calculations Cheat Sheet

*Last updated: July 2026*

---

## QPS Formula

**Peak QPS = (DAU × Requests/day) ÷ 86,400 × Peak_multiplier**

Example: (150M × 20) ÷ 86,400 × 4 = **138,889 QPS peak**

---

## All Systems — QPS Calculations in One Table

| System | DAU (M) | Req/day | Calculation | Mental Math Avg QPS | Exact Avg QPS | Peak Mult | Mental Math Peak QPS | Exact Peak QPS | Servers* | Design Notes |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| **Twitter** | 150 | 20 | (150M×20)÷100K | 30,000 | 34,722 | 4X | 120,000 | 138,889 | 140 | Cache feed, write sharding |
| **YouTube** | 200 | 50 | (200M×50)÷100K | 100,000 | 115,740 | 5X | 500,000 | 578,700 | 580 | CDN videos, metadata replicas |
| **Instagram** | 300 | 100 | (300M×100)÷100K | 300,000 | 347,222 | 4X | 1,200,000 | 1,388,889 | 1,389 | Photo CDN, like sharding |
| **WhatsApp** | 500 | 100 | (500M×100)÷100K | 500,000 | 578,704 | 5X | 2,500,000 | 2,893,519 | 2,894 | Message queue, async |
| **Facebook** | 400 | 150 | (400M×150)÷100K | 600,000 | 694,444 | 4X | 2,400,000 | 2,777,778 | 2,778 | Graph DB, feed ranking |
| **Uber** | 50 | 100 | (50M×100)÷100K | 50,000 | 57,870 | 3X | 150,000 | 173,611 | 174 | Real-time location, events |
| **LinkedIn** | 300 | 50 | (300M×50)÷100K | 150,000 | 173,611 | 4X | 600,000 | 694,444 | 694 | Connection graph, ranking |
| **Slack** | 5 | 500 | (5M×500)÷100K | 25,000 | 289,352 | 5X | 125,000 | 1,446,759 | 1,447 | WebSocket, message queue |
| **Netflix** | 100 | 30 | (100M×30)÷100K | 30,000 | 34,722 | 5X | 150,000 | 173,611 | 174 | CDN edges, streaming data |
| **E-commerce** | 100 | 200 | (100M×200)÷100K | 200,000 | 231,481 | 4X | 800,000 | 925,926 | 926 | Search indexing, CDN |
| **Google Search** | 1000 | 3 | (1000M×3)÷100K | 30,000 | 34,722 | 2X | 60,000 | 69,444 | 70 | Distributed index, cache |
| **Banking App** | 5 | 100 | (5M×100)÷100K | 5,000 | 5,787 | 6X | 30,000 | 34,722 | 35 | Multi-region, 99.99% HA |
| **Notification** | 50 | 5 | (50M×5)÷100K | 2,500 | 2,894 | 3X | 7,500 | 8,681 | 9 | Simple queue, reliable |
| **Weather App** | 300 | 10 | (300M×10)÷100K | 30,000 | 34,722 | 3X | 90,000 | 104,167 | 104 | Heavy cache, CDN |
| **Stripe** | 1** | 1000 | (1M×1000)÷100K | 10,000 | 11,574 | 2X | 20,000 | 23,148 | 23 | Payment, high consistency |
| **Google Drive** | 500 | 30 | (500M×30)÷100K | 150,000 | 173,611 | 3X | 450,000 | 520,833 | 521 | File storage, sync |
| **Dropbox** | 300 | 25 | (300M×25)÷100K | 75,000 | 86,806 | 3X | 225,000 | 260,417 | 260 | File sync, block storage |
| **IRCTC** | 20 | 100 | (20M×100)÷100K | 20,000 | 23,148 | 6X | 120,000 | 138,889 | 139 | Ticketing, high peak |
| **Newsfeed** | 200 | 80 | (200M×80)÷100K | 160,000 | 185,185 | 2X | 320,000 | 370,370 | 370 | Feed ranking, aggregation |
| **Zerodha** | 5 | 500 | (5M×500)÷100K | 25,000 | 289,352 | 10X | 250,000 | 2,893,519 | 2,894 | Trading, ultra-high peak |
| **ICICI Bank** | 20 | 200 | (20M×200)÷100K | 40,000 | 46,296 | 3X | 120,000 | 138,889 | 139 | Banking, high consistency |
| **HDFC Bank** | 25 | 200 | (25M×200)÷100K | 50,000 | 57,870 | 3X | 150,000 | 173,611 | 174 | Banking, high consistency |
| **Google Maps** | 500 | 50 | (500M×50)÷100K | 250,000 | 289,352 | 3X | 750,000 | 868,056 | 868 | Real-time location, geo |
| **Spotify** | 300 | 200 | (300M×200)÷100K | 600,000 | 694,444 | 4X | 2,400,000 | 2,777,778 | 2,778 | Streaming, indexing |
| **Gaana** | 50 | 150 | (50M×150)÷100K | 75,000 | 86,806 | 4X | 300,000 | 347,222 | 347 | Music streaming, India |
| **Amazon** | 100 | 200 | (100M×200)÷100K | 200,000 | 231,481 | 4X | 800,000 | 925,926 | 926 | E-commerce, search |
| **Airbnb** | 10 | 50 | (10M×50)÷100K | 5,000 | 5,787 | 3X | 15,000 | 17,361 | 17 | Booking, search, map |
| **Rate Limiter** | 500 | 200 | (500M×200)÷100K | 1,000,000 | 1,157,407 | 5X | 5,000,000 | 5,787,037 | 5,787 | High-freq requests |

**Column Explanations:**
- **DAU (M)** = Daily Active Users in millions
- **Req/day** = Average requests per user per day
- **Calculation** = Formula shown (÷100K mental math)
- **Mental Math Avg QPS** = Quick average calculation for interviews (÷100K) — use in interviews
- **Exact Avg QPS** = Precise average calculation (÷86,400) — actual number for design
- **Peak Mult** = Multiplier during busiest hour (2X, 3X, etc.)
- **Mental Math Peak QPS** = Quick peak calculation (Mental Math Avg × Peak Mult)
- **Exact Peak QPS** = Precise peak calculation (Exact Avg × Peak Mult) — what infrastructure must handle
- **Servers\*** = Exact Peak QPS ÷ 1,000 (typical server capacity per QPS)
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
