# System Design — Twitter

*Part of the System Design Interview Playbook*

---

## Table of Contents

1. [Core Differences from Facebook](#1-core-differences-from-facebook)
2. [Hybrid Fan-out — Celebrity Problem](#2-hybrid-fan-out--celebrity-problem)
3. [Trending Topics — Unique to Twitter](#3-trending-topics--unique-to-twitter)
4. [Why Cassandra (Not SQL) for Tweets](#4-why-cassandra-not-sql-for-tweets)
5. [What's New vs Facebook](#5-whats-new-vs-facebook)
6. [The One Sentence Difference](#6-the-one-sentence-difference)

---

## 1. Core Differences from Facebook

|                   | Facebook                  | Twitter                                 |
|-------------------|---------------------------|-----------------------------------------|
| Connection        | Mutual (friend both ways) | One-way (follow)                        |
| Feed order        | Algorithm ranked          | Chronological (newest first)            |
| Write volume      | Medium                    | 500M tweets/day — extreme               |
| Public by default | No                        | Yes                                     |
| Trending topics   | No                        | Core feature                            |
| Real-time search  | No                        | Critical (tweets searchable in seconds) |

---

## 2. Hybrid Fan-out — Celebrity Problem

```
Normal users (< 10K followers) → fan-out on write → push to followers' cache
Celebrities (millions)         → fan-out on read  → pull when timeline opened
Your timeline = cache (normal friends) + pulled celebrity tweets (merged chronologically)
```

---

## 3. Trending Topics — Unique to Twitter

```
Every tweet arrives → extract hashtags → increment counter in Redis (cache)

Every 30 seconds: sort hashtags by count → top 10 = Trending

Key: Trending = SPIKE detection, not just total count.
  #Cricket always mentioned → not trending
  #Cricket spikes 10K/hr → 500K/hr → something big happened → TRENDING

Tools: Kafka + Apache Flink (stream processing)
```

---

## 4. Why Cassandra (Not SQL) for Tweets

| SQL Database                          | Cassandra (NoSQL)                   |
|---------------------------------------|-------------------------------------|
| Hard to scale writes horizontally     | Built for massive write throughput  |
| Struggles at 6,000 tweets/second      | Handles millions of writes/second   |
| ACID transactions                     | Eventual consistency                |

---

## 5. What's New vs Facebook

```
SAME: Load Balancer, CDN, Cache (Redis), Sharded DBs,
      Blob Storage, WebSockets, Search Index, Message Queues

NEW/DIFFERENT:
  Cassandra for tweet storage (write-heavy)
  Hybrid fan-out service (worse celebrity problem)
  Timeline cache per user (chronological not ranked)
  Stream Processing (Kafka + Flink) for trending
  Real-time search indexing (seconds not hours)
  Trending Topics Service (spike detection)
```

---

## 6. The One Sentence Difference

> **Facebook** = social network. Connections between people. Sharing life moments with friends.
> **Twitter** = public broadcast platform. Sharing information with the world in real time.
>
> Same building blocks. Assembled differently because the problems are different.

---

*See also: [facebook-system-design.md](facebook-system-design.md) for the base system design.*
