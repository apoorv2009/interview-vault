# System Design Interview Playbook
Concise, interview-ready deep-dives on system design, distributed systems, and engineering fundamentals. Every file covers one question end-to-end.
---
## Table of Contents
### Auth
- [JWT token exists but API still returns 401 Unauthorized. Why, and how do you debug it?](auth-jwt-401-debugging.md)
- [An OTP is valid for only 30 seconds and is not stored on the server. How can the server still verify it?](auth-totp-verification.md)

### Caching
- [Design a cache that never slows down no matter how many items you store. What data structure?](caching-lru-design.md)

### Concurrency
- [Two threads update the same data simultaneously. How do you prevent a race condition?](concurrency-race-condition.md)
- [Two users hit the same API at the exact same millisecond, both pass validation, and both try to insert the same record. Now you have duplicate data in production. What's your fix?](idempotency-duplicate-insert.md)

### DRM
- [You try to screen record Netflix but only get a black screen. Why?](drm-screen-recording-block.md)

### Data Structures
- [How is Gmail username availability check instant?](data-structures-bloom-filter.md)

### Git Workflow
- [Your branch is 200 commits behind main. What will you do — merge or rebase?](git-merge-vs-rebase.md)

### Incident Response
- [Your CTO calls at 3 AM. Your entire S3 bucket just got encrypted. Ransom note in metadata. First 15 minutes?](incident-s3-ransomware-response.md)
- [SSL cert just expired on Sunday morning. Site is down. What do you do in the next 10 minutes?](incident-ssl-cert-expiry.md)

### Microservices
- [What Microservice Architecture Do Companies Actually Use in Real Projects?**](microservices-real-world-patterns.md)

### Payments
- [A passenger swipes their card on a flight with no internet and the bank cannot be contacted. How do you approve the payment without a balance check and prevent fraud in an offline payment system?](payments-offline-approval.md)

### Pricing
- [A user thinks airlines hike prices because they searched again. As a software engineer, explain why the price actually changed.](pricing-dynamic-airline.md)

### Principal Engineer / Architecture
- [Principal Engineer / Solution Architect — Enterprise Architecture Interview Bank (JPMC-style)](principal-engineer-architecture-questions.md)

### RAG
- [Your client gives you 5000 PDFs with text, tables, charts and scanned images. Build a RAG chatbot that answers accurately.](rag-pdf-ingestion-pipeline.md)
- [Your RAG retrieves top-5 chunks, but the correct answer lives in chunk #12. Increasing top-K to 20 blows the context window. How do you fix it?](rag-retrieval-reranking.md)
- [Your RAG data changes every hour. How do you manage versioning without breaking the system?](rag-versioning-strategy.md)

### Reliability
- [Your API works fine for 1,000 users but crashes at 100,000 users. What will you check first?](reliability-scale-bottleneck-triage.md)

### Scaling
- [How can 3 billion Instagram users keep scrolling forever? If every user fetched 1,000 posts at once, the servers would melt down — so how does Instagram know exactly which posts to send next?](scaling-feed-pagination.md)

### Security
- [What Measures Would You Take to Protect APIs from Unauthorized Access in a Microservices Architecture?](security-api-zero-trust.md)

### Streaming
- [How does Netflix switch subtitles instantly mid-movie without reloading?](streaming-subtitle-switching.md)

### TTL & Expiry
- [Instagram Stories expire after exactly 24 hours. What mechanism tracks and enforces that?](ttl-story-expiry.md)

### Vector DB
- [Our vector database costs are increasing rapidly. How would you optimize and reduce them?](vectordb-cost-optimization.md)

### Video Streaming
- [YouTube has the same video in 1080p and 144p. Does the server store separate files for each quality?](video-adaptive-bitrate-storage.md)

---
## Structure
Files follow a `<topic>-<slug>.md` naming convention so a flat directory listing clusters naturally by topic:

| Prefix | Topic |
|--------|-------|
| `auth` | Auth |
| `caching` | Caching |
| `idempotency` | Concurrency |
| `drm` | DRM |
| `data-structures` | Data Structures |
| `git` | Git Workflow |
| `incident` | Incident Response |
| `microservices` | Microservices |
| `payments` | Payments |
| `pricing` | Pricing |
| `principal-engineer` | Principal Engineer / Architecture |
| `rag` | RAG |
| `reliability` | Reliability |
| `scaling` | Scaling |
| `security` | Security |
| `streaming` | Streaming |
| `ttl` | TTL & Expiry |
| `vectordb` | Vector DB |
| `video` | Video Streaming |

> **After renaming or adding files**, rerun `python generate_toc.py` from inside this folder to keep the README in sync.
