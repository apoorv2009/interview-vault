# System Design — Facebook

*Part of the System Design Interview Playbook*

---

## Table of Contents

1. [Core Features](#1-core-features)
2. [The 6 Core Concepts](#2-the-6-core-concepts)
3. [News Feed — The Hardest Problem](#3-news-feed--the-hardest-problem)
4. [Key Solutions Per Problem](#4-key-solutions-per-problem)

---

## 1. Core Features

Profile · Friends (mutual) · Posts/Photos/Videos · News Feed · Likes & Comments · Notifications · Messages · Search

---

## 2. The 6 Core Concepts

| Concept            | What it does                             | Analogy                                           |
|--------------------|------------------------------------------|---------------------------------------------------|
| **Load Balancer**  | Spreads traffic across many servers      | Supermarket directing customers to shortest queue |
| **Sharding**       | Splits data across multiple databases    | Library rooms A-H, I-P, Q-Z                      |
| **Cache**          | Hot data in memory, skip DB              | Brain remembering capital of France               |
| **CDN**            | Files from nearest server worldwide      | Flipkart warehouse in every city                  |
| **Message Queue**  | Async background jobs                    | Restaurant ticket rail                            |
| **Pre-computation**| Do hard work in advance, serve instantly | Pre-building your inbox overnight                 |

---

## 3. News Feed — The Hardest Problem

```
Naive Pull Model (doesn't scale):
  User opens app → query 500 friends → 500 DB queries → sort → show
  At 3B users = billions of queries/second → database dies ❌

Facebook's Push Model (Fan-out on Write):
  Friend posts → immediately pushed to YOUR feed queue in background
  You open app → read pre-built feed → milliseconds ✅

Celebrity Problem (Cristiano Ronaldo, 500M followers):
  Cannot push to 500M feeds in real time
  HYBRID SOLUTION:
    Normal users (< 10K followers) → Push model
    Celebrities (millions)          → Pull model (fetch at read time)
    Your feed = pre-built (normal friends) + pulled celebrity posts
```

---

## 4. Key Solutions Per Problem

| Problem                          | Solution                                   |
|----------------------------------|--------------------------------------------|
| One server overloaded            | Load Balancer + multiple servers           |
| One DB can't handle 3B users     | Sharding + separate DBs per data type      |
| Photos/videos too big for DB     | Blob Storage (S3) + CDN                    |
| Same post read millions of times | Cache (Redis)                              |
| Real-time notifications          | WebSockets — persistent two-way connection |
| Search 3B users                  | Elasticsearch — pre-built inverted index   |

---

*See also: [twitter-system-design.md](twitter-system-design.md) for a direct comparison.*
