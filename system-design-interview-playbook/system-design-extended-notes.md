# System Design — Extended Notes & Reference

Merged reference material that doesn't fit the one-file-per-interview-question format used elsewhere in this playbook: full system-design walkthroughs, a microservices patterns deep-dive, fundamentals, and back-of-the-envelope calculation tables. Previously scattered across `Design-a-system/`, `microservice/`, `systemdesign/`, and `calculations/` subfolders (invisible to the top-level README's auto-generated TOC, which only scans this directory's flat file list).

---

## Table of Contents

1. [How would you design Facebook end-to-end — the 6 core concepts, news feed fan-out, and the celebrity problem?](#1-how-would-you-design-facebook-end-to-end--the-6-core-concepts-news-feed-fan-out-and-the-celebrity-problem)
2. [How does Twitter's system design differ from Facebook's — hybrid fan-out, trending topics, and Cassandra?](#2-how-does-twitters-system-design-differ-from-facebooks--hybrid-fan-out-trending-topics-and-cassandra)
3. [How would you design a chat-only RAG + agentic assistant for a place of worship — scripture Q&A, ceremony booking, and donations?](#3-how-would-you-design-a-chat-only-rag--agentic-assistant-for-a-place-of-worship--scripture-qa-ceremony-booking-and-donations)
4. [What are the core microservices patterns — decomposition, communication, Kafka, circuit breaker, SAGA, CQRS, BFF — and how do you explain them in an interview?](#4-what-are-the-core-microservices-patterns--decomposition-communication-kafka-circuit-breaker-saga-cqrs-bff--and-how-do-you-explain-them-in-an-interview)
5. [What is availability in system design — the Nines, causes of downtime, and how do you achieve each tier?](#5-what-is-availability-in-system-design--the-nines-causes-of-downtime-and-how-do-you-achieve-each-tier)
6. [How do you do back-of-the-envelope system design calculations — QPS, storage, bandwidth, database, cache?](#6-how-do-you-do-back-of-the-envelope-system-design-calculations--qps-storage-bandwidth-database-cache)
7. [What do the handwritten system design fundamentals notes cover (Grokking the System Design Interview)?](#7-what-do-the-handwritten-system-design-fundamentals-notes-cover-grokking-the-system-design-interview)

---

## 1. How would you design Facebook end-to-end — the 6 core concepts, news feed fan-out, and the celebrity problem?

### 1. Core Features

Profile · Friends (mutual) · Posts/Photos/Videos · News Feed · Likes & Comments · Notifications · Messages · Search

---

### 2. The 6 Core Concepts

| Concept            | What it does                             | Analogy                                           |
|--------------------|------------------------------------------|---------------------------------------------------|
| **Load Balancer**  | Spreads traffic across many servers      | Supermarket directing customers to shortest queue |
| **Sharding**       | Splits data across multiple databases    | Library rooms A-H, I-P, Q-Z                      |
| **Cache**          | Hot data in memory, skip DB              | Brain remembering capital of France               |
| **CDN**            | Files from nearest server worldwide      | Flipkart warehouse in every city                  |
| **Message Queue**  | Async background jobs                    | Restaurant ticket rail                            |
| **Pre-computation**| Do hard work in advance, serve instantly | Pre-building your inbox overnight                 |

---

### 3. News Feed — The Hardest Problem

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

### 4. Key Solutions Per Problem

| Problem                          | Solution                                   |
|----------------------------------|--------------------------------------------|
| One server overloaded            | Load Balancer + multiple servers           |
| One DB can't handle 3B users     | Sharding + separate DBs per data type      |
| Photos/videos too big for DB     | Blob Storage (S3) + CDN                    |
| Same post read millions of times | Cache (Redis)                              |
| Real-time notifications          | WebSockets — persistent two-way connection |
| Search 3B users                  | Elasticsearch — pre-built inverted index   |

---

*See also: [How does Twitter's system design differ from Facebook's?](#2-how-does-twitters-system-design-differ-from-facebooks--hybrid-fan-out-trending-topics-and-cassandra) for a direct comparison.*


---

## 2. How does Twitter's system design differ from Facebook's — hybrid fan-out, trending topics, and Cassandra?

### 1. Core Differences from Facebook

|                   | Facebook                  | Twitter                                 |
|-------------------|---------------------------|-----------------------------------------|
| Connection        | Mutual (friend both ways) | One-way (follow)                        |
| Feed order        | Algorithm ranked          | Chronological (newest first)            |
| Write volume      | Medium                    | 500M tweets/day — extreme               |
| Public by default | No                        | Yes                                     |
| Trending topics   | No                        | Core feature                            |
| Real-time search  | No                        | Critical (tweets searchable in seconds) |

---

### 2. Hybrid Fan-out — Celebrity Problem

```
Normal users (< 10K followers) → fan-out on write → push to followers' cache
Celebrities (millions)         → fan-out on read  → pull when timeline opened
Your timeline = cache (normal friends) + pulled celebrity tweets (merged chronologically)
```

---

### 3. Trending Topics — Unique to Twitter

```
Every tweet arrives → extract hashtags → increment counter in Redis (cache)

Every 30 seconds: sort hashtags by count → top 10 = Trending

Key: Trending = SPIKE detection, not just total count.
  #Cricket always mentioned → not trending
  #Cricket spikes 10K/hr → 500K/hr → something big happened → TRENDING

Tools: Kafka + Apache Flink (stream processing)
```

---

### 4. Why Cassandra (Not SQL) for Tweets

| SQL Database                          | Cassandra (NoSQL)                   |
|---------------------------------------|-------------------------------------|
| Hard to scale writes horizontally     | Built for massive write throughput  |
| Struggles at 6,000 tweets/second      | Handles millions of writes/second   |
| ACID transactions                     | Eventual consistency                |

---

### 5. What's New vs Facebook

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

### 6. The One Sentence Difference

> **Facebook** = social network. Connections between people. Sharing life moments with friends.
> **Twitter** = public broadcast platform. Sharing information with the world in real time.
>
> Same building blocks. Assembled differently because the problems are different.

---

*See also: [How would you design Facebook end-to-end?](#1-how-would-you-design-facebook-end-to-end--the-6-core-concepts-news-feed-fan-out-and-the-celebrity-problem) for the base system design.*


---

## 3. How would you design a chat-only RAG + agentic assistant for a place of worship — scripture Q&A, ceremony booking, and donations?

> A chat-only RAG + agentic assistant for a place of worship: scripture Q&A grounded in retrieval, ceremony-slot booking, and donations — all through natural-language chat, no separate UI actions. (Modeled on a real Jain-temple assistant; renamed and de-jargoned here so the design reads clearly to any interviewer, regardless of background.)

---


### 1. Functional Requirements

1. Ingestion pipeline should be able to read PDFs and text documents.
2. Extracted text should be chunked, embedded, and stored in a vector DB.
3. User should be able to submit natural-language chat in a textbox.
4. User can ask questions about scripture, answered from retrieved source text.
5. User can write a prompt to book a ceremony slot in the chat box.
6. User can donate by writing in the chatbox.
7. User should get notified when an event is about to take place.
8. User can see a list of events happening at the temple.
9. For payment handling, there must be a human in the loop before the transaction executes.
10. Scripture answers must decline or hedge when retrieval confidence is below a defined threshold, rather than hallucinate.
11. If the LLM/agent layer is degraded or unavailable, a small set of high-value read queries (e.g. "my bookings," temple timings) should still be answerable via a lightweight fallback path — since chat is the only entry point, this is the only way those reads survive an LLM outage.

**Scope note:** chat is the only entry point (chatbox only, no separate UI actions/forms). A messaging-platform channel (e.g. WhatsApp) is a future extension, deferred for now.

---

### 2. Non-Functional Requirements

1. System should be highly available — targeting 99.99% for the booking/donation path; 99.9% acceptable for the chat/RAG path, since an LLM vendor outage shouldn't take down transactions.
2. System should have low latency — chat/RAG p99 ≤ 3s; transactional (booking, donation, event listing) p99 ≤ 300ms.
3. System should have strong consistency on the booking system — locking on slot inventory to prevent double-booking; at-least-once with an idempotency key on payment (retries must be safe, not blocked); eventual consistency acceptable for chat history and audit logs.
4. System should be able to handle concurrency for the booking system — optimistic locking (version column, retry-on-conflict) on slot inventory by default; a short-lived distributed lock only if a small number of slots see disproportionate contention.
5. System should be secure enough — input guardrails (prompt injection/jailbreak detection) before any LLM call, RBAC before tool dispatch, and output guardrails + PII-masked audit logging on every response.
6. Data isolation — four separate stores: booking DB, donation/payment DB, chat/context history DB, and the vector DB. No shared schema or instance.
7. Payments must handle idempotency — every payment request carries a server-issued idempotency key with a TTL, checked before the payment gateway call executes.
8. System should be scalable enough — orchestration/API tier is stateless and horizontally scalable; vector DB and payment DB scale independently of chat traffic.
9. System should be cost-effective — LLM and vector DB calls are the dominant marginal cost, not compute; mitigate with caching on repeated queries and a smaller/cheaper model for intent classification vs. a larger model only for generation.
10. Observability for every agent and every flow in the system — structured, PII-masked audit log per tool invocation; distributed tracing across the orchestration → agent → service hops.

---

### 3. Back-of-the-Envelope Math

**Traffic**
- Population: 40M in the target community. Realistic adoption for estimation → DAU = 4M (10%), not 100%.
- 100 req/day/user → Total = 4M × 100 = 400M req/day.
- Avg QPS = 400M / 86,400 ≈ 4,630 QPS.
- Peak (×4 for evening prayer-time concentration) ≈ 18,500 QPS.

Since chat is the only entry point, every request passes through the orchestration/LLM hop — no per-feature traffic split.

**Sizing the orchestration/LLM tier — Little's Law**
- A chat turn holds ~2.5s end-to-end (embedding + vector retrieval + LLM generation).
- `L = λ × W` → Concurrent in-flight requests at peak = 18,500 × 2.5 ≈ 46,000 concurrent requests.
- Reality check: managed LLM APIs cap out far below this in requests/minute on a given tier — **the real ceiling is third-party rate limits (LLM provider, vector DB), not your own server count.** Options: self-hosted inference, multi-vendor fallback, aggressive caching, or a phased rollout instead of provisioning for 100% adoption on day one.

**Downstream tool execution (qualitative — cost diverges after the LLM picks a tool)**
- Booking: needs locking to prevent double-booking under concurrent requests.
- Donation: needs idempotency key + external payment-gateway round trip + human confirmation step.
- Scripture / event listing: cache-friendly, cheap once intent is classified.
- At ~1,000 QPS/server for lightweight CRUD, the post-agent execution layer needs only a handful of servers even at peak — the bottleneck stays the orchestration/LLM hop above, not this tier.

**Storage**
- Corpus: 100K source documents, ~100K chars/doc extractable text → ~1×10¹⁰ chars total.
- At ~2.5 bytes/char (non-Latin script in UTF-8, not 1 byte/char ASCII) → **~25GB raw text.**
- Chunking: 800-char chunks, 100 overlap → stride 700 → ~143 chunks/doc × 100K docs ≈ **14.3M chunks.**
- Vector storage: 14.3M × 8KB (2048-dim float32 vector) ≈ 114GB + ~14GB metadata ≈ 128GB, × 1.5 index overhead (HNSW) ≈ **~190GB vector index.**

---

### 4. Architecture Diagram

```mermaid
flowchart TD
    subgraph ING["Ingestion Pipeline (offline / batch)"]
        direction LR
        Extract["Extract PDF"] --> Chunk["Chunking"] --> Embed["Embeddings"] --> Meta["Metadata enrichment"] --> LLME["LLM enrichment"] --> VDB["Vector DB"]
    end

    subgraph RUN["Runtime — Agentic Serving (per user turn)"]
        direction TD
        UP["User Prompt (chatbox)"]
        CDN["CDN (static app assets)"]
        UP --> GW["API Gateway"]
        CDN --> GW
        GW --> QGD["Input Guardrail<br/>prompt injection / jailbreak detect"]
        QGD --> LOG["Logging / Observability"]
        QGD --> RLI["Rate limit / Idempotency key / Correlation ID"]
        QGD --> ORCH["Orchestration<br/>FastAPI + LLM Agent"]
        ORCH <-. retrieval .-> CACHE["Cache (Redis)<br/>hot queries"]
        CACHE <-. miss .-> VDB
        ORCH --> RBAC["RBAC Check<br/>role-scoped tool access"]
        RBAC --> BA["Ceremony Booking Agent"]
        RBAC --> DA["Donation Agent"]
        RBAC --> EA["Event Agent"]
        BA --> BS["Ceremony Booking Service<br/>optimistic lock on slot"]
        DA --> DS["Donation Service<br/>idempotency key + human confirm"]
        EA --> ER["Events Resource"]
        ER -. async .-> NOTIF["Notification Service"]
        NOTIF -. push .-> PUSH["Push (FCM / APNS)"]
        BS --> ORCH2["Orchestration<br/>response synthesis"]
        DS --> ORCH2
        ER --> ORCH2
        ORCH2 --> OGA["Output Guardrail + Audit Log<br/>PII-masked, per request"]
        OGA -. response .-> UP
    end

    classDef guard fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef async fill:#065A82,color:#fff,stroke:#044268
    class QGD,RLI,RBAC,OGA guard
    class NOTIF,PUSH async
```

**Key design decisions reflected above:**
- **Input guardrail** right after the gateway (catches injection/jailbreak before any LLM call), separate from **RBAC check** before tool dispatch (role-scoped access), separate again from **output guardrail + audit log** after the orchestration layer composes its final reply.
- **Notification Service** is an async fan-out from `Events Resource` — event alerts are a proactive push, not a chat response, so they don't sit inside the request/response loop.
- **Cache** in front of the vector DB for repeated/hot queries, directly supporting the cost-effectiveness NFR.
- The full agent loop is drawn explicitly: services return to `Orchestration`, which synthesizes the final reply before the output guardrail runs — not left as an implicit return path.


---

## 4. What are the core microservices patterns — decomposition, communication, Kafka, circuit breaker, SAGA, CQRS, BFF — and how do you explain them in an interview?

### 1. Microservices — What & Why

Microservices is an architectural style where a large application is broken into small, independent services. Each service owns one thing completely — its data, its logic, its deployment.

#### Monolith vs Microservices

```
Monolith:                          Microservices:
┌─────────────────────┐            ┌──────────┐  ┌──────────┐
│  Everything in one  │            │  Orders  │  │ Payments │
│  codebase           │     vs     └──────────┘  └──────────┘
│  One deploy         │            ┌──────────┐  ┌──────────┐
│  One database       │            │Inventory │  │  Users   │
└─────────────────────┘            └──────────┘  └──────────┘
```

#### Core Principle

> **High Cohesion, Low Coupling** — A service owns one thing completely. Other services can change independently without affecting yours. If two services always deploy together — they are probably one service.

#### When NOT to use Microservices

- Small team, small project — operational overhead not justified
- Domain boundaries not yet clear — start with modular monolith first
- Simple CRUD application — no need for distributed complexity

> 🗣️ **Capital Access — How to explain in interview:**
> "Capital Access is decomposed into six microservices — Ownership, Profiles, Targeting, Contacts, Notifications, and Reports. Each owns a distinct business capability and its own database. For example, the Ownership Service is completely independent of the Notifications Service — if Notifications goes down, ownership data still works perfectly. Each service deploys independently, scales independently, and can be built with the most appropriate technology for its domain. That's the core benefit we get from microservices in Capital Access."

---

### 2. Service Decomposition Strategies

> **The Hierarchy — Apply in This Order:** DDD Bounded Contexts → Business Capability → Data Ownership → Change Rate → Strangler Fig (legacy only) → Core/Supporting/Generic

#### Strategy 1 — DDD Bounded Contexts

Find where the same word means different things — that is your boundary.

```
Example: "Product" in Flipkart means different things:
  Catalogue  → name, description, images, SEO tags
  Inventory  → SKU, stock count, warehouse location
  Pricing    → price, discounts, promotions
  Orders     → snapshot of price at time of purchase
  Reviews    → something customers rate
  Search     → a document with relevance scores

Each is a separate bounded context → separate service.
```

**Use when:** Complex domain with rich business logic. Same word means different things in different parts of the system.

#### Strategy 2 — Business Capability

One service per thing the business does. Most universally applicable — always the starting point.

| Business Capability | Service           |
|---------------------|-------------------|
| Browse products     | Catalogue Service |
| Know stock levels   | Inventory Service |
| Set prices          | Pricing Service   |
| Place orders        | Order Service     |
| Process payments    | Payment Service   |
| Ship items          | Fulfilment Service|

#### Strategy 3 — Data Ownership (Validation Test)

Each service owns its own database. No other service can touch it directly.

> **If two services share a database table — they are not truly separate services.** The boundary is wrong. Go back and redesign.

#### Strategy 4 — Change Rate / Team Ownership

Things that change together for the same reason belong together. Things that change independently belong apart. Design your system to match your team structure (Conway's Law).

#### Strategy 5 — Core / Supporting / Generic

| Type           | What it is                          | Action                      |
|----------------|-------------------------------------|-----------------------------|
| **Core**       | Your competitive advantage          | Build, invest heavily       |
| **Supporting** | Necessary but not differentiating   | Build simply                |
| **Generic**    | Commodity (auth, email, payments)   | Buy / use third party       |

#### Strategy 6 — Strangler Fig (Legacy Only)

For decomposing existing monoliths. Put an API Gateway in front. Extract one service at a time. Monolith shrinks gradually. Never rewrite everything at once.

#### The Distributed Monolith Anti-Pattern

> **Warning signs:** Services share a database · Services always deploy together · One change requires updates in 5 services · Decomposed by technical layer not business domain

#### Boundary Decision — 5 Questions

1. Does it have a distinct business capability?
2. Does it have its own data no one else should own?
3. Does it change independently of adjacent services?
4. Can a single team own it end-to-end?
5. Would splitting require constant cross-service coordination? (If yes → wrong boundary)

---

### 3. Communication Patterns — Overview

> 🗣️ **Capital Access — Service-to-Service Communication Map:**
>
> **Pattern 1 — REST (synchronous):** Angular SPA → APIM Gateway → any microservice. Used whenever the UI needs data immediately to render the page. For example, user opens the investor targeting page → Angular calls APIM → APIM routes to Targeting Service → returns targeting scores.
>
> **Pattern 2 — Service Bus Pub/Sub (async, one event → many consumers):**
> - Ownership Service publishes "OwnershipChanged" event to Service Bus Topic when S&P data feed updates ownership data
> - Targeting Service **subscribes** → recalculates investor scores for that company
> - Notifications Service **subscribes** → sends email or in-app alerts to users who set up ownership alerts
> - Ownership Service has zero knowledge of Targeting or Notifications — it just publishes the event
>
> **Pattern 3 — Service Bus Queue (async, one job → one worker):**
> - User requests a report → Reports Service puts a job message on Service Bus Queue → immediately returns a job ID to the user
> - Azure Function picks up the message → calls Ownership, Profiles, Targeting, and Contacts directly via REST to aggregate data → generates PDF → stores in Blob Storage → publishes "ReportReady" event → Notifications Service alerts the user
>
> **Why direct REST inside the Report Worker?** The Function already has full context (tenant, jobId, which company) and needs answers immediately from four services to assemble one report. Pub/Sub is for reactions to a state change — not for "I need data right now."
>
> **One-liner:** "SPA to services is always REST through APIM. Service-to-service state changes go through Service Bus Topics. Long-running jobs go through Service Bus Queue to Azure Functions."

> 🗣️ **Capital Access — How to explain in interview:**
> "In Capital Access we have three distinct communication patterns and we chose each one deliberately. When the Angular SPA needs data to render a page — like loading investor targeting scores — it makes a synchronous REST call through APIM to the Targeting Service and waits for the response. When ownership data changes and multiple services need to react — Targeting needs to recalculate scores and Notifications needs to send alerts — we publish an OwnershipChanged event to Azure Service Bus Topics. Both services get their own independent copy and react without knowing about each other. And for report generation — which is a long-running job meant for exactly one worker — we use a Service Bus Queue. One message, one Azure Function picks it up, generates the PDF. The question I always ask to choose the pattern is: does the caller need the result right now? If yes, REST. If no, queue or pub/sub. And if multiple services react to the same event, pub/sub. If only one should handle it, queue."

#### The Three-Question Decision Framework

```
Question 1: Does the caller need the result to proceed?
  YES → Synchronous (REST, gRPC, GraphQL)
  NO  → Asynchronous (Queue, Pub/Sub, Kafka)

Question 2: If async — does one service handle it or many?
  ONE service   → Message Queue (point-to-point)
  MANY services → Pub/Sub (topic/event)

Question 3: Is reliability critical — can we afford to lose this message?
  YES → Use Outbox Pattern on publisher side
  NO  → Direct publish is fine
```

#### Full Pattern Map

```
SYNCHRONOUS (caller waits)
├── REST over HTTP
├── gRPC
├── GraphQL
└── API Gateway (sits in front of all)

ASYNCHRONOUS (caller moves on)
├── Simple Messaging
│   ├── Message Queue (Point-to-Point)
│   └── Pub/Sub (Publish-Subscribe)
├── Advanced Messaging
│   ├── Event Streaming (Kafka)
│   └── Request-Reply over Messaging
└── Reliability Patterns
    ├── Outbox Pattern
    ├── Saga Pattern
    └── Circuit Breaker
```

#### Master Decision Table

| Scenario                                   | Pattern         |
|--------------------------------------------|-----------------|
| UI needs data to render                    | REST            |
| High-frequency internal calls              | gRPC            |
| Mobile + web with different data needs     | GraphQL BFF     |
| Send email after order                     | Message Queue   |
| Multiple services react to one event       | Pub/Sub         |
| Replay, audit, analytics, high volume      | Kafka           |
| All external client traffic                | API Gateway     |
| Downstream service is flaky                | Circuit Breaker |
| Operation spans multiple services          | Saga            |
| Critical event cannot be lost              | Outbox Pattern  |

---

### 4. Synchronous Patterns

#### REST over HTTP

Service A calls Service B's HTTP endpoint and waits for a response. Most common pattern.

| Verb   | Meaning                        |
|--------|--------------------------------|
| GET    | Read data, no side effects     |
| POST   | Create new resource            |
| PUT    | Replace resource entirely      |
| PATCH  | Update part of resource        |
| DELETE | Remove resource                |

**Use REST when:** UI needs data immediately · Simple reads/queries · External clients · Response needed before proceeding

**Don't use when:** Chaining 5+ synchronous calls · Caller doesn't need to wait · Downstream is unreliable

---

#### gRPC

Binary Protocol Buffers over HTTP/2. Strongly typed contracts via `.proto` files. Much faster than REST. Supports server streaming, client streaming, and bidirectional streaming.

**Use gRPC when:** High-frequency internal service calls · Performance critical · Streaming needed · Both sides under your control

**Don't use when:** External/browser clients · Low-frequency calls

---

#### GraphQL

Client specifies exactly what fields it needs. One endpoint. Three operations: Query (read), Mutation (write), Subscription (real-time).

**Use GraphQL when:** Multiple clients with different data needs · Mobile bandwidth matters · BFF aggregation layer

**Don't use when:** Simple stable APIs · Service-to-service calls

---

### 5. Asynchronous Patterns

#### Message Queue (Point-to-Point)

Producer drops a message. Exactly ONE consumer picks it up. Producer moves on immediately. Message deleted after consumer acknowledges (ACK).

```
Order Service ──▶ [Email Queue] ──▶ Notification Service
Dead Letter Queue (DLQ): message fails N times → moved to DLQ for investigation
```

**Use when:** Fire-and-forget jobs · Emails, PDFs, image processing · Exactly ONE service should handle each message

---

#### Pub/Sub (Publish-Subscribe)

Producer publishes event to a topic. EVERY subscriber gets their own independent copy. Publisher has no knowledge of who's listening.

```
Order Service ──▶ [OrderPlaced Topic]
                   ├──▶ Inventory Service  (own copy)
                   ├──▶ Fulfilment Service (own copy)
                   └──▶ Notification       (own copy)
```

**Use when:** Multiple services react to one event · Domain events · Add subscribers without touching publisher

---

#### Outbox Pattern

Guarantees DB write and message publish are atomic. Solves dual-write problem.

```
WITHOUT Outbox:
  INSERT INTO orders ✅  →  publish to broker ❌ (broker down) → message LOST

WITH Outbox:
  BEGIN TRANSACTION
    INSERT INTO orders ...
    INSERT INTO outbox (event='OrderPlaced', status='PENDING')
  COMMIT  ← atomic

Relay Process (runs every second):
  SELECT from outbox WHERE status='PENDING'
  → publish to broker (retries until success)
  → UPDATE status='SENT'
```

**Always use when:** Publishing critical events (orders, payments) that cannot be lost

#### Outbox Pattern — Capital Access C# Implementation

```csharp
// OutboxMessage table — same Azure SQL DB as the entity
public class OutboxMessage
{
    public Guid      Id          { get; set; } = Guid.NewGuid();
    public string    EventType   { get; set; } = "";
    public string    Payload     { get; set; } = "";
    public DateTime  CreatedAt   { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}

// Step 1: Save entity + outbox message in ONE atomic transaction
public class CreateEngagementHandler : IRequestHandler<CreateEngagementCommand, Guid>
{
    public async Task<Guid> Handle(CreateEngagementCommand cmd, CancellationToken ct)
    {
        var activity = EngagementActivity.Create(cmd.TenantId, cmd.CompanyId, cmd.Type);

        _context.EngagementActivities.Add(activity);
        _context.OutboxMessages.Add(new OutboxMessage   // same DbContext = same transaction ✅
        {
            EventType = nameof(EngagementCreatedEvent),
            Payload   = JsonSerializer.Serialize(new EngagementCreatedEvent(
                activity.Id, activity.TenantId, activity.CompanyId))
        });

        await _context.SaveChangesAsync(ct); // ONE commit — both or neither ✅
        return activity.Id;
    }
}

// Step 2: Background relay — reads outbox, publishes to Service Bus, marks sent
public class OutboxRelayService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var pending = await _context.OutboxMessages
                .Where(m => m.ProcessedAt == null)
                .OrderBy(m => m.CreatedAt)
                .Take(100)
                .ToListAsync(ct);

            foreach (var msg in pending)
            {
                try
                {
                    var sender = _busClient.CreateSender(msg.EventType);
                    await sender.SendMessageAsync(new ServiceBusMessage(msg.Payload), ct);
                    msg.ProcessedAt = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to publish outbox message {Id}", msg.Id);
                    // leave ProcessedAt null → will retry next poll ✅
                }
            }

            await _context.SaveChangesAsync(ct);
            await Task.Delay(TimeSpan.FromSeconds(5), ct);
        }
    }
}
```

**Failure guarantees:**
```
DB fails          → outbox not written → nothing published ✅ (no partial state)
Service Bus fails → outbox not marked sent → retried on next poll ✅
App crashes       → relay restarts, picks up unpublished rows from outbox ✅
```

---

#### Request-Reply over Messaging

Async but still returns a response. Caller sends message with `replyTo` address + `correlationId`. Consumer processes and replies. Use when you need a response but operation is slow (seconds).

---

### 6. Queue vs Pub/Sub — The Key Difference

| | Queue | Pub/Sub |
|---|---|---|
| Message goes to | Exactly ONE consumer | ALL subscribers |
| Message after read | Deleted | Deleted after all read |
| Competing consumers | Yes — share the work | No — each gets own copy |
| Add new consumer | Must change producer | Just add subscription |
| Think of it as | Task / job | Event / announcement |

**Queue = Restaurant Kitchen** — Tickets on a rail. One chef picks each ticket. Cooks it. Ticket gone. Other chefs never see it. *One message → One worker → Done*

**Pub/Sub = Newspaper** — One edition printed. All subscribers get their own copy. One slow reader doesn't affect others. *One message → Every subscriber → All independent*

#### The One Question That Always Gives the Answer

> **"Would it be a problem if TWO services both processed this same message?"**
> YES → Queue. Only one worker should handle it.
> NO, you WANT both to process it → Pub/Sub.

#### Why Not Just Use Multiple Queues Instead of Pub/Sub?

```
Multiple Queues — grows painful:
  Order Service ──▶ [Email Queue]   → must modify Order Service for every new service
  Order Service ──▶ [Invoice Queue] → tight coupling, Order Service knows everyone

Pub/Sub — stays clean forever:
  Order Service ──▶ [OrderPlaced Topic]
                        ├──▶ Notification (existing)
                        └──▶ Fraud        (NEW — zero changes to Order Service)

Key insight:
  Multiple Queues → PRODUCER is in charge, manages all connections
  Pub/Sub         → CONSUMERS are in charge, subscribe themselves
```

#### Bottom Line

> Queue = work distribution. One job to one worker.
> Pub/Sub = event broadcasting. Everyone who cares hears it independently.
>
> **"Send this email"** = task = Queue | **"Order was placed"** = event = Pub/Sub

---

### 7. Kafka Deep Dive

#### Why Kafka Exists

- Messages gone after processing — new service has no historical data
- One slow consumer blocks others in a shared queue
- Cannot handle millions of events/second with RabbitMQ

#### The Mental Model — A Library Archive

```
Kafka = library that keeps every book ever written, in order, forever.

The Archive (Kafka Topic):
  Page 1  Page 2  Page 3  ...  Page 50,000

Reader A: bookmark at page 45,000 (slow)
Reader B: bookmark at page 49,900 (nearly real-time)
Reader C: bookmark at page 1     (new, reading from beginning)

C starting from page 1 has ZERO impact on A or B.
Reading does NOT delete the pages.
```

#### Core Concepts

| Concept            | What it is                                                                              |
|--------------------|-----------------------------------------------------------------------------------------|
| **Topic**          | Named log. Append-only. Messages never modified, only added.                           |
| **Partition**      | Topic split for parallelism. Same key → same partition → ordering guaranteed.          |
| **Offset**         | Consumer's bookmark/position. Can be rewound to replay history.                        |
| **Consumer Group** | Service instances sharing partitions. Different groups = completely independent.        |
| **Retention**      | How long messages are kept. NOT deleted after reading.                                 |

#### How "Done" Works — Offset Commit

```
Queue/Pub/Sub: Consumer reads → ACK → broker DELETES → gone forever ❌

Kafka: Consumer reads offset 5 → commits offset 5 (moves bookmark)
       Message at offset 5 STILL THERE ✅ Only bookmark moved.

Crash recovery:
  Consumer crashes at offset 4 (not committed)
  Restarts → asks Kafka "where did I leave off?" → offset 3
  Re-reads from offset 4 → no message lost ✅

Who owns state?
  Queue/Pub/Sub: BROKER owns state (deletes on ACK)
  Kafka:         CONSUMER owns state (manages own offset, can replay)
```

**Use Kafka when:** Need event replay · Extremely high throughput · Audit trail / compliance · Event sourcing · Multiple consumers at different speeds · New services need historical data

**Don't use when:** Simple pub/sub needs · Low event volume · Team without Kafka ops experience

---

### 8. Kafka vs RabbitMQ vs Queue vs Pub/Sub

#### RabbitMQ — The Smart Post Office

A broker supporting multiple patterns via exchanges. Smart routing — reads message label and decides where to send.

| Exchange Type | Behaviour                                       |
|---------------|-------------------------------------------------|
| Direct        | Route by exact key → queue behaviour            |
| Fanout        | Copy to ALL bound queues → pub/sub behaviour    |
| Topic         | Route by pattern (e.g. `order.*.uk`) → selective pub/sub |

**RabbitMQ — Smart Broker, Dumb Consumer**
- Broker does intelligent routing
- Push-based (broker pushes to consumers)
- Message deleted after delivery
- Rich routing rules, DLQ, priority queues built in

**Kafka — Dumb Broker, Smart Consumer**
- Broker just stores messages in order
- Pull-based (consumers pull at own pace)
- Message kept after reading
- Consumer manages its own offset, can replay

#### Full Comparison

|                         | Queue          | Pub/Sub        | RabbitMQ       | Kafka              |
|-------------------------|----------------|----------------|----------------|--------------------|
| One consumer per message| ✅             | ❌             | ✅ queue mode  | ✅ within group    |
| All consumers get copy  | ❌             | ✅             | ✅ fanout      | ✅ across groups   |
| Message replay          | ❌             | ❌             | ❌             | ✅                 |
| Deleted after read      | ✅             | ✅             | ✅             | ❌                 |
| High throughput         | ❌             | Medium         | Medium         | ✅                 |
| Complex routing         | ❌             | ❌             | ✅             | ❌                 |
| Operational complexity  | Low            | Low            | Medium         | High               |

#### One Line Each

> **Queue** — Task board. One person picks each task. Gone when done.
> **Pub/Sub** — Group announcement. Everyone hears it right now.
> **RabbitMQ** — Smart post office. Routes messages by rules.
> **Kafka** — Library archive. Everything stored. Anyone reads anytime. Reading doesn't delete.

---

### 9. API Gateway & Bypass Security

> 🗣️ **Capital Access — How to explain in interview:**
> "In Capital Access, Azure API Management is our single entry point for all SPA traffic. The Angular app never talks directly to any microservice — every request goes through APIM. The gateway does three things: it validates the JWT token against Okta's public keys cached from the JWKS endpoint, it checks the tenant ID and role claims so one client can never access another client's data, and it applies rate limiting per tenant. Then it routes the request to the correct downstream microservice. The microservices themselves are in a private subnet with no public IP — they cannot be reached from the internet directly. So even if someone knew the internal URL of the Targeting Service, they couldn't hit it. Network isolation is the first and most important layer of gateway bypass protection."

#### What API Gateway Does

- **Authentication** — validate JWT once, not in every service
- **Routing** — `/orders/*` → Order Service, `/products/*` → Catalogue
- **Rate limiting** — 1000 calls/minute per client
- **SSL termination** — HTTPS at edge, plain HTTP internally
- **Load balancing** — distribute across service instances

#### Preventing Gateway Bypass — Defence in Depth

| Layer             | Mechanism                                          | What it stops                       |
|-------------------|----------------------------------------------------|-------------------------------------|
| 1 (most important)| **Network isolation** — private subnet, no public IP | All external internet bypass      |
| 2                 | **mTLS** — both sides present certificates         | Any caller without valid cert       |
| 3                 | **Shared secret header** — X-Internal-Secret       | Simple internal bypass              |
| 4                 | **JWT validation** at service level                | Unauthenticated requests            |
| 5                 | **Service mesh** (Istio) — policy per service      | Policy-based zero trust             |

> **Defence in Depth:** Layer them all. Network → mTLS → JWT → Authorisation scope. Attacker must breach all layers simultaneously.

> **Interview answer:** "Network isolation first — private subnet, no public IP. mTLS for internal threats. JWT for application-layer enforcement. Service mesh (Istio) codifies all of this as policy automatically."

---

### 10. Circuit Breaker Pattern

> 🗣️ **Capital Access — How to explain in interview:**
> "In Capital Access, the Report Worker is an Azure Function that calls four microservices synchronously — Ownership, Profiles, Targeting, and Contacts — to aggregate data for a report. If the Targeting Service is slow or down, without a circuit breaker the Report Worker would keep sending requests and waiting, eventually exhausting its connections and failing all reports. We wrap each service client with Polly's circuit breaker — after five consecutive failures, the circuit opens and we instantly return a cached fallback or a partial report rather than waiting. After 30 seconds the circuit goes half-open, sends one test request, and if it succeeds the circuit closes again. This protects the report pipeline from a single slow downstream service bringing down the entire flow."

#### The Problem — Cascading Failure

Review Service goes slow. 1000 users open product page. All 1000 requests stuck waiting 10 seconds. Product Page runs out of threads. Product Page crashes too. One slow service killed the whole website.

#### Analogy — Home Fuse Box

Too many appliances running → fuse trips → cuts electricity → protects the rest of the house. After some time you reset it.

#### Three States

```
CLOSED (normal — requests flowing)
  → Silently counting failures in background
  → 5 consecutive failures...

OPEN (tripped — blocking all requests)
  → Instant fallback returned ("Reviews unavailable")
  → Review Service gets zero traffic — time to recover
  → Wait 30 seconds...

HALF-OPEN (testing recovery)
  → One test request sent through
  → Fails   → back to OPEN (wait again)
  → Succeeds → back to CLOSED ✅
```

#### Friend Analogy

Friend not answering. After 5 unanswered calls → stop calling 2 hours (OPEN). After 2 hours → try once (HALF-OPEN). Answers → resume calling (CLOSED).

**Use when:** Any sync call to a non-critical service · Want graceful degradation · Downstream is unreliable

**Tools:** Polly (.NET), Hystrix / Resilience4j (Java)

#### Circuit Breaker — Capital Access C# Implementation (Polly)

```csharp
// Program.cs — wrap Ownership Service client with circuit breaker + retry
builder.Services.AddHttpClient<IOwnershipServiceClient, OwnershipServiceClient>()
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy() =>
    HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
            onRetry: (outcome, delay, attempt, _) =>
                Log.Warning("Retry {Attempt} after {Delay}ms: {Reason}",
                    attempt, delay.TotalMilliseconds, outcome.Exception?.Message));

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy() =>
    HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak:    (outcome, duration) =>
                Log.Warning("Circuit OPEN for {Sec}s — {Reason}", duration.TotalSeconds,
                    outcome.Exception?.Message ?? outcome.Result?.StatusCode.ToString()),
            onReset:    () => Log.Information("Circuit CLOSED — Ownership service recovered"),
            onHalfOpen: () => Log.Information("Circuit HALF-OPEN — sending probe request"));

// Ownership Service call — policy applied automatically via HttpClient pipeline
public class OwnershipServiceClient : IOwnershipServiceClient
{
    private readonly HttpClient _http;

    public async Task<OwnershipData?> GetPortfolioAsync(string portfolioId)
    {
        try
        {
            return await _http.GetFromJsonAsync<OwnershipData>($"/api/portfolios/{portfolioId}");
        }
        catch (BrokenCircuitException)
        {
            // Circuit is OPEN — return cached fallback instead of throwing ✅
            return _cache.GetCachedPortfolio(portfolioId);
        }
    }
}
```

**Why Circuit Breaker + Retry must be ordered correctly:**
```
WRONG: Retry wraps Circuit Breaker
  → retry exhausted before circuit opens → cascades

CORRECT: Circuit Breaker wraps Retry  (outermost = evaluated first)
  → 5 failures → circuit OPENS → retries immediately stopped ✅
  → rest of platform gets instant fallback, not 3× slow retries
```

---

### 11. SAGA Pattern

> 🗣️ **Capital Access — How to explain in interview:**
> "Report generation in Capital Access is a classic Saga scenario — it spans four services, each with its own database, and there's no single transaction that can cover all of them. The steps are: create the report job record, fetch ownership data, fetch targeting data, generate the PDF and store it in Blob Storage. We use Azure Durable Functions as the Saga orchestrator — it coordinates each step and if anything fails it runs compensating transactions in reverse order. For example if PDF generation fails after ownership and targeting data were already fetched, the orchestrator deletes the report job record so the user doesn't see a permanently stuck job. The reason we chose orchestration over choreography here is that the flow has four steps with complex failure handling — having one place where you can see the full state of any report job is essential for debugging and support."

#### The Problem

In microservices, each service has its own database. No single transaction spans them all. You cannot ROLLBACK across three separate systems.

#### What Saga Does

Chain of local transactions. Each step publishes an event. If any step fails, compensating transactions undo previous steps in reverse order.

#### Happy Path vs Failure Path

```
HAPPY PATH:
  Step 1: Order Service    → creates order (PENDING) → publishes OrderCreated
  Step 2: Inventory Service → reserves stock          → publishes StockReserved
  Step 3: Payment Service  → charges card             → publishes PaymentProcessed
  Step 4: Order confirmed ✅

FAILURE — Payment fails at Step 3:
  Payment publishes "PaymentFailed"
  ├──▶ Inventory Service → RELEASES reserved stock ↩️
  └──▶ Order Service     → marks order CANCELLED ↩️

COMPENSATION ALWAYS IN REVERSE ORDER:
  Forward:  Order(1) → Inventory(2) → Payment(3)
  Backward: Payment(3) → Inventory(2) → Order(1)
  Always remove from top first — like unstacking plates.
```

#### Compensating Transaction

> NOT a magical undo. A NEW ACTION that reverses the effect of a previous step.
> Original:     Reserve 2 iPhones in stock
> Compensating: Release 2 iPhones back to stock

**Use when:** Business operation spans multiple services · Each service has its own DB · Eventual consistency is acceptable

#### SAGA — Capital Access C# Implementation (Azure Durable Functions)

In Capital Access, generating a report spans 4 services. Durable Functions acts as the Saga orchestrator.

```csharp
// Durable Functions orchestrator — the Saga coordinator
[FunctionName("ReportSagaOrchestrator")]
public static async Task RunOrchestrator(
    [OrchestrationTrigger] IDurableOrchestrationContext context,
    ILogger log)
{
    var input     = context.GetInput<ReportSagaInput>();
    var completed = new List<string>();

    try
    {
        // Step 1: Create report job record
        var jobId = await context.CallActivityAsync<Guid>("CreateReportJob", input);
        completed.Add("CreateReportJob");

        // Step 2 + 3: Fetch data from two services in parallel (fan-out)
        var ownershipTask = context.CallActivityAsync<OwnershipData>("FetchOwnershipData", input.PortfolioId);
        var targetingTask = context.CallActivityAsync<TargetingData>("FetchTargetingData", input.Filters);
        await Task.WhenAll(ownershipTask, targetingTask);
        completed.Add("FetchOwnershipData");
        completed.Add("FetchTargetingData");

        // Step 4: Generate and store report
        await context.CallActivityAsync("GenerateAndStoreReport",
            new ReportGenInput(jobId, ownershipTask.Result, targetingTask.Result));
        completed.Add("GenerateAndStoreReport");
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Saga failed at step after: {Steps}", string.Join(", ", completed));

        // Run compensating transactions in REVERSE ORDER
        foreach (var step in Enumerable.Reverse(completed))
        {
            try { await context.CallActivityAsync($"Compensate_{step}", input); }
            catch (Exception compEx)
            { log.LogError(compEx, "Compensation failed for {Step}", step); }
        }
    }
}

// Each activity is one step — and has a compensating pair
[FunctionName("CreateReportJob")]
public static async Task<Guid> CreateReportJob(
    [ActivityTrigger] ReportSagaInput input, ILogger log)
{
    var jobId = Guid.NewGuid();
    await _reportRepo.CreateJobAsync(jobId, input.TenantId, "Queued");
    log.LogInformation("Report job {JobId} created", jobId);
    return jobId;
}

[FunctionName("Compensate_CreateReportJob")]
public static async Task CompensateCreateJob(
    [ActivityTrigger] ReportSagaInput input, ILogger log)
{
    await _reportRepo.DeletePendingJobAsync(input.TenantId);
    log.LogInformation("Compensated: deleted pending report job for {TenantId}", input.TenantId);
}
```

**Why Durable Functions for Saga orchestration:**
```
State persisted automatically  → app restart doesn't lose saga progress ✅
Retry built-in                 → transient failures handled without code ✅
Fan-out/fan-in built-in        → Task.WhenAll works across activities ✅
Full history queryable         → can inspect saga state at any point ✅
Timer support                  → timeout and escalation without polling ✅
```

---

### 11a. Fan-out / Fan-in

**Fan-out** means splitting one task into multiple parallel sub-tasks that all run at the same time.

**Fan-in** means waiting for all those parallel sub-tasks to complete and combining their results back into one before proceeding.

#### The Mental Model — Manager Delegating Work

Instead of asking one person to do four things one after another, you give all four people their tasks simultaneously and wait for everyone to finish before the team moves forward. That's fan-out/fan-in.

#### Sequential vs Parallel

```
WITHOUT fan-out (sequential):
  Call Ownership  → wait 500ms
  Call Profiles   → wait 400ms
  Call Targeting  → wait 300ms
  Call Contacts   → wait 200ms
  Total: 1,400ms ❌

WITH fan-out/fan-in (parallel):
  Call all four simultaneously → wait for slowest (500ms)
  Total: 500ms ✅  (nearly 3× faster)
```

#### Key Points

- **Fan-out** = fire all calls at the same time
- **Fan-in** = the wait point — you don't proceed until ALL parallel branches return
- If any branch fails, the fan-in fails — the SAGA then handles compensation
- The total time is determined by the **slowest** parallel call, not the sum

#### When to Use

**Use fan-out/fan-in when:**
- Multiple independent data sources are needed for one response
- Each call does not depend on the result of another
- Reducing latency matters — sequential calls add up

**Don't use when:**
- Calls depend on each other (Call B needs the result of Call A first — must be sequential)
- One slow downstream service would always be the bottleneck regardless

> 🗣️ **Capital Access — How to explain in interview:**
> "In report generation, the Azure Function needs data from four services — Ownership, Profiles, Targeting, and Contacts. These four calls are completely independent of each other — none of them needs the result of another to proceed. So instead of calling them sequentially, which would take 1,400ms total, we fan-out — fire all four calls simultaneously — and fan-in when all four respond. Total time drops to 500ms, the slowest single call. Azure Durable Functions has this built in — you start all four activity calls and await them together. The fan-in point is where the orchestrator holds until every branch is back, then moves to the PDF generation step. If any one of the four fails, the fan-in fails and the SAGA runs compensation."

---

### 12. Choreography vs Orchestration

> **Neither is automatic or built-in.** Both require explicitly writing every listener, publisher, failure handler, and compensating transaction.

**Choreography — Relay Race**
No central coordinator. Services react to events. Logic spread across all services.
- Cannot see full flow in one place
- Hard to track "where is this order now?"
- Adding a step touches multiple services
- Becomes event spaghetti at scale

**Orchestration — Orchestra Conductor**
Central Saga Orchestrator directs every step and handles all failures.
- Full flow visible in one place
- Easy to see current step of any order
- Adding a step = change one file
- Easier to debug and support

#### When to Use Which

| Choreography                  | Orchestration                          |
|-------------------------------|----------------------------------------|
| Simple flow, 2-3 steps        | Complex flow, 4+ steps                |
| Steps rarely change           | Business rules evolve frequently       |
| Teams fully independent       | Need visibility across full flow       |
| Startup / early stage         | Scale / mature system                  |

> **Real world:** Most teams start with choreography. As system grows they hit event spaghetti and migrate to orchestration. Netflix, Uber, Amazon all use orchestration for core transactional flows.

---

### 13. CQRS Pattern

> 🗣️ **Capital Access — How to explain in interview:**
> "We use CQRS in the Engagement Service in Capital Access. The write side handles commands like creating an engagement, completing it, or rescheduling it — with full business rule validation and ACID transactions in Azure SQL. When a command succeeds, it publishes a domain event. The read side has a separate denormalized database view — the EngagementSummaries table — which the event handler keeps up to date. When the Angular dashboard loads, it hits the read side, which returns pre-shaped data with company names already joined in, no complex queries needed. The benefit is that our dashboard reads are extremely fast because the read model is already shaped exactly for what the UI needs. The trade-off is eventual consistency — there's a very short window, typically milliseconds, where the write is committed but the read model hasn't updated yet. For an investor relations dashboard that's completely acceptable."

#### The Problem

One database handles both reads and writes. They fight each other.

- **Writes** need strong consistency, complex validation, normalized data
- **Reads** need speed, denormalized views, different indexes per use case
- At scale, heavy reads slow down writes and vice versa — same DB, different needs

#### What CQRS Does

**Command Query Responsibility Segregation** — split the write model (Commands) from the read model (Queries). Each side is optimized independently. Commands change state. Queries never change state.

#### The Mental Model — Bank Teller vs ATM Screen

```
Teller (Command side):
  Processes transactions, enforces rules, updates the ledger.
  Needs accuracy. Can be slower.

ATM display (Query side):
  Shows your balance instantly.
  Doesn't process anything — just reads a pre-built view.
  Can show data that's a few seconds old. That's fine.
```

#### Architecture Flow

```
CLIENT
  │
  ├──▶ COMMAND (write intent: PlaceOrder, CancelOrder)
  │       └──▶ Command Handler
  │                 └──▶ validates business rules
  │                 └──▶ writes to Write DB (normalized, ACID)
  │                 └──▶ publishes Domain Event (OrderPlaced)
  │                               └──▶ Event Handler
  │                                         └──▶ updates Read DB (denormalized)
  │
  └──▶ QUERY (read request: GetOrderStatus, GetUserOrders)
          └──▶ Query Handler
                    └──▶ reads from Read DB (optimized for this exact query)
                    └──▶ returns response instantly
```

#### Commands vs Queries

| | Command | Query |
|---|---|---|
| Intent | Change state | Read state |
| Returns | Acknowledgement / void | Data |
| Example | `PlaceOrder`, `CancelOrder` | `GetOrderStatus`, `GetUserOrders` |
| Database | Write DB (normalized) | Read DB (denormalized) |
| Consistency | Strong | Eventual |

#### Consistency Trade-off

```
User places order (Command) → Write DB updated immediately ✅
                            → Event published → Read DB updated ~100ms later

User checks order status (Query) → might see old status for 100ms
                                 → then sees correct status ✅

This is EVENTUAL CONSISTENCY. Acceptable for most use cases.
If you need "read your own writes" immediately → cache the command result client-side.
```

#### CQRS + Event Sourcing (Common Pairing)

CQRS often pairs with Event Sourcing. The write side stores events (not state). The read side replays events to build optimized views.

```
Without Event Sourcing:  store current state → overwrite on update → history lost
With Event Sourcing:     store every event   → current state = replay all events

Orders (Event Sourcing write side):
  event: OrderPlaced  {orderId: 1, item: iPhone, qty: 2}  at 10:05
  event: ItemAdded    {orderId: 1, item: Case,   qty: 1}  at 10:06
  event: OrderPaid    {orderId: 1, amount: $1200}         at 10:07

Read model (rebuilt from events):
  orderId: 1, items: [iPhone x2, Case x1], status: Paid, total: $1200

Benefits: full audit trail · time travel · replay events to rebuild any view
```

#### When to Use / Not Use

**Use CQRS when:**
- Read and write performance needs are very different
- Many different read views of the same data (dashboard, mobile, reporting)
- High read:write ratio — reads dominate
- Audit trail required — pair with Event Sourcing
- Scale reads and writes independently

**Don't use CQRS when:**
- Simple CRUD — massively overengineered
- Team not familiar with eventual consistency
- Small domain with few read patterns

#### Comparison with Related Patterns

| Pattern | What it solves | Key idea |
|---------|----------------|----------|
| **CQRS** | Read/write contention | Separate models for reads and writes |
| **Saga** | Distributed transactions | Chain of compensating steps |
| **Outbox** | Dual-write reliability | Atomic DB write + event publish |
| **Event Sourcing** | Audit trail / time travel | Store events not state |

#### CQRS — Capital Access C# Implementation (MediatR)

```csharp
// COMMAND side — write, validate, publish domain event
public record CreateEngagementCommand(
    string TenantId, string CompanyId, ActivityType Type, DateTime ScheduledAt)
    : IRequest<Guid>;

public class CreateEngagementHandler : IRequestHandler<CreateEngagementCommand, Guid>
{
    private readonly IEngagementRepository _repo;
    private readonly IPublisher            _publisher;

    public async Task<Guid> Handle(CreateEngagementCommand cmd, CancellationToken ct)
    {
        // Business rule enforced on the WRITE side only
        if (await _repo.HasActiveEngagementAsync(cmd.CompanyId, cmd.TenantId))
            throw new DuplicateEngagementException(cmd.CompanyId);

        var activity = EngagementActivity.Create(
            cmd.TenantId, cmd.CompanyId, cmd.Type, cmd.ScheduledAt);
        await _repo.AddAsync(activity);
        await _repo.SaveAsync();

        // Publish domain event → read model will update itself
        await _publisher.Publish(
            new EngagementCreatedEvent(activity.Id, activity.TenantId, activity.CompanyId), ct);
        return activity.Id;
    }
}

// QUERY side — read, no business logic, no domain model
public record GetEngagementDashboardQuery(string TenantId, int PageSize = 20)
    : IRequest<DashboardDto>;

public class GetDashboardHandler : IRequestHandler<GetEngagementDashboardQuery, DashboardDto>
{
    private readonly EngagementReadDbContext _readCtx; // separate read context ✅

    public async Task<DashboardDto> Handle(GetEngagementDashboardQuery q, CancellationToken ct)
    {
        // AsNoTracking — no EF change tracking needed for reads ✅
        var engagements = await _readCtx.EngagementSummaries  // denormalized view
            .AsNoTracking()
            .Where(e => e.TenantId == q.TenantId)
            .OrderByDescending(e => e.ScheduledAt)
            .Take(q.PageSize)
            .Select(e => new EngagementCardDto
            {
                Id          = e.Id,
                CompanyName = e.CompanyName,   // already joined — read model carries it ✅
                Status      = e.Status,
                ScheduledAt = e.ScheduledAt
            })
            .ToListAsync(ct);

        return new DashboardDto
        {
            Engagements = engagements,
            TotalCount  = await _readCtx.EngagementSummaries
                .CountAsync(e => e.TenantId == q.TenantId, ct)
        };
    }
}

// Read model update — consumes domain event, updates denormalized view
public class UpdateEngagementSummaryOnCreate
    : INotificationHandler<EngagementCreatedEvent>
{
    public async Task Handle(EngagementCreatedEvent e, CancellationToken ct)
    {
        var company = await _companiesCtx.Companies.FindAsync(e.CompanyId);
        _readCtx.EngagementSummaries.Add(new EngagementSummary
        {
            Id          = e.ActivityId,
            TenantId    = e.TenantId,
            CompanyName = company!.Name,   // denormalized join stored here ✅
            Status      = "Pending"
        });
        await _readCtx.SaveChangesAsync(ct);
    }
}
```

**Capital Access mapping:**
```
Commands: CreateEngagement, CompleteEngagement, RescheduleEngagement, CancelEngagement
Queries:  GetDashboard, GetEngagementById, GetEngagementHistory, GetOverdueEngagements

Write DB: EngagementActivities (normalized, EF Core with change tracking, ACID)
Read DB:  EngagementSummaries  (denormalized view, AsNoTracking, fast SELECT)
```

#### Interview Answer

> "CQRS separates the write model from the read model. The command side handles all state changes with strong consistency. The query side handles reads from a denormalized, eventually-consistent view. The write side publishes domain events; the read side consumes them to update its read models. This lets you scale reads and writes independently and optimize each side for its access pattern. The main cost is eventual consistency and the overhead of maintaining two databases."

---

#### CQRS on Azure — Capital Access Ownership Data Story

> 🗣️ **How to explain in interview (AWS diagram → Azure redesign):**
> "If someone shows me a CQRS diagram built on AWS — Kafka, SQS, Lambda — I can map it directly to Azure. Azure Event Hubs is Kafka-compatible, Azure Service Bus replaces SQS, Azure Functions replace Lambda, and Cosmos DB gives us the schemaless, regionally-distributed Read DB. The pattern is identical; the services are Azure-native."

![CQRS Azure Architecture](microservice/cqrs-azure-architecture.svg)

##### The Problem CQRS Solves in Capital Access — Ownership Data

At quarter-end, Capital Access ingests bulk ownership data from regulatory filings (13-F, EDGAR). This produces a write storm — thousands of `UpdateOwnership` commands per minute. Meanwhile, institutional clients are hitting the Ownership Dashboard for real-time reads.

**Without CQRS:** both workloads hit the same Azure SQL database. Quarter-end bulk writes create lock contention that makes every dashboard read slow or timeout.

**With CQRS:** the write side absorbs the ingestion burst into Azure SQL. Azure Functions project the changes asynchronously into Cosmos DB. Dashboard reads never touch Azure SQL.

##### Azure Service Mapping (AWS → Azure)

```
AWS Service                   →  Azure Equivalent
──────────────────────────────────────────────────────────────────
Apache Kafka (Event Broker)   →  Azure Event Hubs  (Kafka-compatible)
Command Handler pods          →  AKS microservice pods
Write DB (event store)        →  Azure SQL  (normalized, ACID)
Event Processor (Lambda)      →  Azure Functions  (event-triggered)
SQS Queue (UpdateReadDB)      →  Azure Service Bus Queue
Read DB Updater (Lambda)      →  Azure Functions  (Service Bus trigger)
Read DB (denormalized)        →  Azure Cosmos DB  (NoSQL, sub-10ms reads)
Query Handler pods            →  AKS microservice pods + MediatR
```

##### Architecture Flow — Capital Access Ownership

```
WRITE SIDE (quarter-end bulk ingestion):
─────────────────────────────────────────────────────────────────────────
  AKS pod (Ownership ingestor)
    │
    ├──▶ Command: UpdateOwnership { tenantId, companyId, shareholderData, filingDate }
    │
    │  [Azure Event Hubs — Kafka-compatible broker]
    │       Partitioned by tenantId → ordered delivery per tenant
    │
    ▼
  AKS pod (Command Handler)
    │  ① Validates: is this filing date newer than what we have? (idempotency)
    │  ② Writes to Azure SQL Write DB — append-only OwnershipEvents table
    │  ③ Publishes OwnershipUpdatedEvent to Azure Service Bus Topic
    │
    └──▶ [Azure Service Bus Queue: UpdateReadDB-ownership]

READ MODEL UPDATE (asynchronous, ~100–500ms lag):
─────────────────────────────────────────────────────────────────────────
  [Azure Functions — Service Bus trigger]
    │  ① Reads OwnershipUpdatedEvent from queue
    │  ② Fetches company profile from Companies service (cached)
    │  ③ Projects into Cosmos DB document (UI-optimized shape):
    │     {
    │       id: "spg-001_AAPL",     // partitionKey: tenantId
    │       tenantId: "SPG-001",
    │       companyName: "Apple Inc.",
    │       totalShares: 1_500_000,
    │       topShareholders: [...], // pre-sorted
    │       lastUpdated: "2026-03-31T10:45:00Z"
    │     }
    │
    └──▶ [Azure Cosmos DB — Read DB]

READ SIDE (real-time dashboard):
─────────────────────────────────────────────────────────────────────────
  Angular dashboard → HTTP → AKS pod (Query Handler)
    │
    └──▶ GetOwnershipDashboardQuery { tenantId: "SPG-001" }
              │
              └──▶ Cosmos DB point-read by partitionKey=tenantId
                        → returns pre-shaped document instantly (sub-10ms)
                        → no joins, no Azure SQL contention

DISASTER RECOVERY — Recreate Read DB:
─────────────────────────────────────────────────────────────────────────
  If Cosmos DB is corrupted/lost → replay all events from Azure SQL OwnershipEvents
  → Azure Function replays history → Cosmos DB rebuilt to current state
  (This is the dashed "Recreate Read DB" arrow on the diagram)
```

##### Capital Access Commands and Queries

```
COMMANDS (write side → Azure SQL):
  UpdateOwnership   { tenantId, companyId, shareholderData, filingDate }
  CreateEngagement  { tenantId, companyId, type, scheduledAt }
  AddToTargetingList{ tenantId, companyId, listId, addedBy }

QUERIES (read side → Cosmos DB):
  GetOwnershipDashboard { tenantId }            → pre-shaped ownership view
  GetEngagementReport   { tenantId, dateRange } → engagement summary view
  GetTargetingList      { tenantId, listId }    → targeting members view
```

##### Eventual Consistency — How We Handle It

```
Quarter-end scenario:
  10:00:00 — UpdateOwnership command committed to Azure SQL ✅
  10:00:00 — Event published to Service Bus
  10:00:00.3 — Azure Function picks up event (~300ms lag)
  10:00:00.8 — Cosmos DB document updated ✅

  If dashboard is loaded at 10:00:00.2 → user sees previous ownership data
  The UI shows a "Last updated: 10:00:00" timestamp → transparency, not a bug.
  At 10:00:00.9 → UI auto-refreshes → correct data appears.

For audit/compliance: always read from Azure SQL Write DB (strong consistency).
For dashboard/reporting: read from Cosmos DB (eventual, fast).
```

##### Why Cosmos DB for the Read Side?

```
Azure SQL (Write DB):        Normalized, relational, ACID, EF Core change tracking
Azure Cosmos DB (Read DB):   Document, schemaless, RU-based, 10ms p99 globally

Cosmos DB partition key = tenantId → all reads for a tenant are one partition lookup.
Pre-shaped documents mean zero joins at query time.
Global replication → dashboard reads served from nearest region.
```

##### Full MediatR Flow (Azure Functions integration)

```csharp
// Azure Function — triggered by Service Bus message
[FunctionName("UpdateOwnershipReadModel")]
public async Task Run(
    [ServiceBusTrigger("ownership-events", Connection = "ServiceBus")] string message,
    ILogger log)
{
    var evt = JsonSerializer.Deserialize<OwnershipUpdatedEvent>(message);

    // Build Cosmos DB document (UI-optimized shape)
    var doc = new OwnershipView
    {
        Id             = $"{evt.TenantId}_{evt.CompanyId}",
        TenantId       = evt.TenantId,  // partition key
        CompanyName    = await _companyCache.GetNameAsync(evt.CompanyId),
        TotalShares    = evt.TotalShares,
        TopShareholders = evt.Shareholders
                              .OrderByDescending(s => s.ShareCount)
                              .Take(10)
                              .ToList(),
        LastUpdated    = evt.FilingDate
    };

    await _container.UpsertItemAsync(doc, new PartitionKey(evt.TenantId));
}

// MediatR Query Handler — reads from Cosmos DB
public class GetOwnershipDashboardHandler
    : IRequestHandler<GetOwnershipDashboardQuery, OwnershipDashboardDto>
{
    private readonly Container _container;

    public async Task<OwnershipDashboardDto> Handle(
        GetOwnershipDashboardQuery q, CancellationToken ct)
    {
        // Point read — O(1), ~5ms, no joins
        var response = await _container.ReadItemAsync<OwnershipView>(
            id           : $"{q.TenantId}_{q.CompanyId}",
            partitionKey : new PartitionKey(q.TenantId),
            cancellationToken: ct);

        return new OwnershipDashboardDto
        {
            CompanyName     = response.Resource.CompanyName,
            TotalShares     = response.Resource.TotalShares,
            TopShareholders = response.Resource.TopShareholders,
            LastUpdated     = response.Resource.LastUpdated
        };
    }
}
```

---

### 14. BFF — Backend for Frontend

> 🗣️ **Capital Access — How to explain in interview:**
> "The Angular dashboard in Capital Access needs data from three different services — recent engagements, summary metrics, and active alerts — all in one page load. Without a BFF, the Angular app would make three separate HTTP calls, the user would see the page loading in chunks, and we'd have three round trips instead of one. Our BFF endpoint aggregates all three in parallel on the server side — calls Engagement, Metrics, and Alerts services simultaneously using Task.WhenAll — then shapes the combined response exactly for what the Angular dashboard template needs. The Angular app makes one call and gets everything. It's also important to distinguish this from the API Gateway — APIM handles infrastructure concerns like auth, rate limiting, and routing. The BFF handles product concerns — it knows the exact shape of data the dashboard needs. These are two different layers solving two different problems."

#### The Problem

One API serving both Angular SPA and mobile app — the response is a compromise that fits neither perfectly.

```
WITHOUT BFF:
  Angular SPA ──▶  Single API ──▶ giant response (SPA uses 80%, ignores 20%) ❌
  Mobile App  ──▶  Same API   ──▶ downloads 5× more data than needed ❌
  Angular needs:   3 services aggregated into one dashboard call
  Mobile needs:    1 service, minimal fields

  One API cannot satisfy both without over-fetching or multiple round-trips.
```

#### What BFF Does

```
WITH BFF:
  Angular SPA ──▶  Web BFF    ──▶  internal microservices
  Mobile App  ──▶  Mobile BFF ──▶  same internal microservices (different shape)

  Each BFF is OWNED by the frontend team.
  Each BFF shapes the response exactly for its client.
  Microservices stay dumb — they serve raw data.
  BFF is the intelligence layer in between.
```

#### Capital Access — Web BFF Implementation

```csharp
// Web BFF endpoint — aggregates 3 microservices in one call for the Angular dashboard
[ApiController]
[Route("bff/dashboard")]
public class DashboardBffController : ControllerBase
{
    private readonly IEngagementServiceClient _engagementClient;
    private readonly IMetricsServiceClient    _metricsClient;
    private readonly IAlertServiceClient      _alertsClient;

    [HttpGet]
    public async Task<DashboardResponse> GetDashboard()
    {
        var tenantId = User.FindFirst("tenantId")!.Value;

        // Call 3 microservices IN PARALLEL — BFF orchestrates ✅
        var engagementsTask = _engagementClient.GetRecentAsync(tenantId, take: 10);
        var metricsTask     = _metricsClient.GetSummaryAsync(tenantId);
        var alertsTask      = _alertsClient.GetActiveAsync(tenantId);
        await Task.WhenAll(engagementsTask, metricsTask, alertsTask);

        // Shape response EXACTLY for the Angular dashboard component
        return new DashboardResponse
        {
            Engagements = engagementsTask.Result.Select(e => new DashboardEngagementDto
            {
                Id          = e.Id,
                CompanyName = e.CompanyName,
                Status      = e.Status,
                DaysUntil   = (e.ScheduledAt - DateTime.UtcNow).Days
            }),
            Metrics     = metricsTask.Result,
            Alerts      = alertsTask.Result.Take(5), // top 5 only for sidebar ✅
            LastRefreshed = DateTime.UtcNow
        };
        // Angular: 1 HTTP call instead of 3 ✅
        // Response carries exactly the fields the dashboard template binds to ✅
        // No transformation needed in Angular ✅
    }
}
```

#### BFF vs API Gateway

```
API Gateway:  infrastructure concern — auth, routing, rate limit, SSL termination
              One gateway for ALL clients
              Does NOT aggregate or reshape data

BFF:          product concern — aggregate, filter, shape data for ONE specific client
              One BFF per client type (Web, Mobile, TV app...)
              Owned by the frontend team, not platform team
```

#### When to Use / Not Use

**Use BFF when:**
- Multiple client types with meaningfully different data needs (SPA vs mobile vs TV)
- Frontend team owns their own API contract
- API aggregation / orchestration needed on behalf of the client
- Want to shield the client from internal microservice complexity

**Don't use BFF when:**
- Single client type — one API is fine
- All clients need identical data — duplication with no benefit

---

### 15. Interview Strategy

#### System Design — The 5 Gears

| Gear                    | What to do                                                              | Time      |
|-------------------------|-------------------------------------------------------------------------|-----------|
| **1 — Clarify**         | What features? How many users? Read or write heavy? Speed vs accuracy? | 2-3 min   |
| **2 — Simple**          | Design for one user. One server, one database. Show foundation first.  | 3-4 min   |
| **3 — Identify breaks** | Name what breaks at scale BEFORE jumping to solutions.                 | 4-5 min   |
| **4 — Solve**           | Problem → Solution → WHY. Always the why.                              | 10-12 min |
| **5 — Deep dive**       | Interviewer picks one area. Apply queues, Kafka, circuit breakers etc. | remaining |

#### The Magic Sentence Structure

> "The **problem** here is [X].
> This **matters** because [why it breaks at scale].
> So the **solution** is [Y].
> This **works** because [why Y solves X]."

#### What Interviewers Actually Score

- Did you ask clarifying questions?
- Did you identify the right problems?
- Did you explain WHY each solution exists?
- Did you discuss trade-offs?
- Did you structure your thinking clearly?
- Did you handle pushback confidently?

#### Handling Challenges

> **When interviewer challenges your design:**
> Don't say: "Oh yes, you are right." (and stop)
> Do say: "Good point. There is a trade-off here. We can [A] which gives [benefit] but costs [downside].
>          Alternatively [B]. For this use case I'd choose A because [reason]."
> Interviewers challenge to see if you can defend decisions — not to catch you out.

#### The Golden Rule

> The best system design answer is NOT the one with the most components.
> It is the one where every component exists for a clear reason you can explain in plain English.
>
> Start from one user. Scale up. Explain the why. Discuss trade-offs. The interviewer wants to see your thinking — not a memorised architecture.

---

### 16. Real Interview Stories — Decomposition Decisions

*Sourced from live interview rounds: HCL (R1), Virtusa (R1). Framed through the Entity Management System project (Grant Thornton, healthcare domain) — cross-references the pattern sections above rather than re-explaining them.*

#### Have you actually done monolith → microservices migration?

Starting point: one .NET Core Web API with 40+ controllers spanning entities, shareholding, documents, notifications, and user management. Applied the **Strangler Fig** pattern (see [Strategy 6](#strategy-6--strangler-fig-legacy-only) above):

1. **Identify seams** — modules with clear bounded contexts and minimal cross-cutting DB joins.
2. **Extract lowest-coupling first** — Notification Service went first: no synchronous dependency on core domain state, consumes events only.
3. **Route via gateway** — Azure API Management routed `/api/notifications` to the new service while every other route stayed on the monolith.
4. **Migrate data** — a dedicated notification schema, one-time migration script, then cut over.
5. **Remove from monolith** — deleted the old notification module after a 2-week parallel run to confirm parity.

Biggest learning: don't extract a service that shares a DB table heavily with the monolith — data coupling is harder to break than code coupling. The reporting module was deliberately **not** extracted early because it joined 12 tables across domains; extracting it first would have created a distributed monolith (see [The Distributed Monolith Anti-Pattern](#the-distributed-monolith-anti-pattern)).

Result of the eventual split: Entity Service (CRUD), Shareholding Service (ownership % + audit), Notification Service (threshold-breach alerts), Document Service (Azure Blob upload/download for legal docs) — each independently deployable, each owning its own schema.

---

#### How do you decide what to extract, and what's the first boundary you'd pick under a fixed deadline?

Three signals, applied in order (same hierarchy as [Service Decomposition Strategies](#2-service-decomposition-strategies) above):

1. **Business capability / bounded context** — group by what the business *does*, not by technical layer.
2. **Rate of change** — a module that changes every sprint (notification rules) shouldn't force redeployment of a module that's been stable for months (entity schema).
3. **Data ownership** — if two modules both write to the same table, splitting them creates a distributed-transaction problem before you've gained anything.

**Red flags that mean "don't extract yet"**: high join dependency across many tables, shared mutable state, or going so fine-grained (nano-services) that network hops outweigh any operational benefit.

**First boundary under a fixed launch date**: Notification/Alerting. It has no synchronous dependency on core domain state — it consumes events and sends emails/SMS, so if it goes down the core app keeps working, with zero distributed-transaction risk. Kept *inside* the monolith for the same launch: anything writing to core domain tables (entity CRUD, shareholding computation — transactional integrity too valuable to distribute early), auth/authorization (too much security surface to re-engineer mid-project), and reporting/aggregation (premature extraction just creates sync call-chains back to the monolith).

**Decision framework when two teams disagree and the date is fixed**: apply the "deploy independently" test first — does either team need its own deploy cadence or scaling profile, without coordinating with the other? If not, splitting adds coordination overhead with no operational payoff. Then map the coupling surface — if the proposed boundary needs synchronous calls back to the monolith for more than ~2 data entities, it's not really independent, it's a distributed monolith. Given 3 months and a hard date, the call is usually: ship as a well-bounded module *inside* the monolith with clean interfaces now, extract to a real microservice after launch once real traffic data justifies the operational cost — the [Strangler Fig](#strategy-6--strangler-fig-legacy-only) approach makes that extraction incremental and reversible later.

---

#### What was the hardest decomposition decision, and what made it hard?

Whether to split the shareholding recalculation engine into its own service — it was CPU-intensive, which argued for independent scaling, but it read from 4 tables (Entities, Shareholders, Ownership, CorporateActions) and wrote back to `EntitySummary` all within a single EF Core transaction.

Extracting it cleanly meant either a distributed transaction (2PC — rejected as operationally fragile) or eventual consistency (rejected by the business — a stale shareholding % is unacceptable for compliance audit purposes, even for seconds).

**Resolution**: kept it inside the monolith's transactional boundary, but extracted the *execution* into an Azure Function triggered by a Service Bus message — async decoupling without a distributed transaction. This still required an idempotency key (`RecalculationRequestId` stored in the DB) to handle the "what if the Function fires twice" failure mode from Service Bus's at-least-once delivery guarantee.

Takeaway stated in the interview: the harder a transactional boundary is to preserve, the stronger the case for keeping that capability co-located rather than splitting it — this is the same reasoning behind the [Outbox Pattern](#outbox-pattern) covered above, just applied one level up at the "should this even be a separate service" decision instead of the "how do I publish the event reliably" implementation detail.

---

#### Advantages of microservices over a monolith — with concrete, not textbook, examples?

- **Independent deployability** — the Notification Service shipped a fix without touching Entity or Shareholding; in the monolith, any change meant full regression + full redeploy.
- **Right tool per domain** — Document Service used Azure Blob + a lightweight minimal API; Shareholding Service used SQL Server with heavy stored procedures.
- **Independent scalability** — shareholding recalculation batch jobs only needed to scale the Shareholding Service, not the whole monolith.
- **Fault isolation** — a Notification Service bug didn't take down Entity Service; in the monolith, one unhandled exception could crash the whole app pool.
- **Team autonomy** — smaller codebases, less cognitive load, parallel development.

Trade-offs always worth naming unprompted: operational complexity (service discovery, distributed tracing, inter-service auth), network latency between services, and the fact that distributed transactions are genuinely hard — solved here with the Saga pattern (compensating transactions) for cross-service workflows, not with 2PC.

---



---

## 5. What is availability in system design — the Nines, causes of downtime, and how do you achieve each tier?

### What is Availability?

Availability is percentage of time system is operational and able to serve requests.

**Availability = Uptime / (Uptime + Downtime)**

Goal is never 100% — physically impossible. Goal is close enough that downtime is acceptable for the business.

---

### The Nines — Complete Reference Table

| Availability | Downtime/Year | Downtime/Month | Infrastructure | Data Replication | Deployment | On-Call |
|---|---|---|---|---|---|---|
| **99%** | 3.6 days | ~7 hours | Single instance or minimal redundancy. No standby. One fails → full outage until manual fix. | No replication. Single DB. Data loss if DB dies. | Big-bang deploys. Downtime acceptable. MTTR: hours. | Not required. Manual fix when issue reported. |
| **99.9%** | 8.7 hours | 43 minutes | 2 instances (1 region, multi-AZ). Standby idle. Failover 30–60 sec. | Async. Primary + 1 standby. RTO: 30–120 sec. RPO: lose 5–10 min. | Rolling deploys. MTTR: 15–20 min. | Business hours. 15–20 min response. |
| **99.99%** | 52 minutes | 4 minutes | 2+ active instances (1 region). Both serving. Failover <10 sec. | Sync. Primary + 1 replica. RTO: 5 min. RPO: zero loss. Auto-failover. | Blue-green. MTTR: 2–5 min. Zero downtime. | 24/7. <5 min response. |
| **99.999%** | 5.26 minutes | 26 seconds | 3+ active (2–3 regions). All serving. DNS reroutes 30–60 sec. | Fully sync (all regions). RTO: <30 sec. RPO: zero everywhere. Multi-region failover. | Continuous + canary. MTTR: <5 sec. Feature flags. | 24/7/365 + backup. <1 min response. |

---

### What Causes Downtime?

1. **Hardware failures** — Server crashes, power loss, disk dies. *Prevention: redundant instances.*
2. **Bad deployments** — Buggy code pushed → app crashes. *Prevention: blue-green, canary, rollback.*
3. **Database problems** — Replication lag, corruption, migration failure. *Prevention: sync replication, auto-failover.*
4. **Network failures** — Link cut, DNS down. *Prevention: multi-region, auto-reroute.*
5. **Cascading failures** — Service A slow → B waits → B dies → C dies. *Prevention: circuit breaker, timeout, bulkhead.*
6. **Resource exhaustion** — Out of memory, disk full, CPU maxed. *Prevention: monitoring, auto-scaling.*
7. **External dependency failures** — Third-party API down. *Prevention: timeout, circuit breaker.*
8. **Human error** — Operator deletes DB, misconfigures. *Prevention: automation, runbooks, staging.*

---

### How to Achieve Each Tier

**99%**: Single or minimal redundancy. Manual recovery. Downtime acceptable.

**99.9%**: 2 instances in multi-AZ. Async replication. Rolling deploys. 15–20 min recovery. Business hours support.

**99.99%**: 2+ active instances, sync replication, blue-green deploys, 2–5 min recovery. 24/7 on-call.

**99.999%**: 3+ active regions, fully sync replication, continuous deployment, <5 sec recovery. 24/7/365 on-call with <1 min response.

---

### Key Terms

- **AZ (Availability Zone)**: Different physical building in same region. Protects against single-building failure.
- **RTO (Recovery Time Objective)**: Max time acceptable to recover from failure.
- **RPO (Recovery Point Objective)**: Max data loss acceptable. How far back can you lose?
- **MTTR (Mean Time To Recovery)**: Actual average time to restore service after failure.
- **Sync replication**: Wait for all replicas to confirm before acking write. Zero data loss. Slower writes.
- **Async replication**: Ack immediately, replicate in background. Fast writes. Risk: data loss on failover.


---

## 6. How do you do back-of-the-envelope system design calculations — QPS, storage, bandwidth, database, cache?

### QPS Calculations

#### Key Assumptions

**1,000 QPS per server** = typical capacity for modern web server with DB queries, logging, serialization.
- Real-world range: 500–5,000 QPS per server (depends on: server spec, app complexity, DB latency, caching hit ratio)
- Formula: `(DAU × Req/day) ÷ 100K` = mental math avg QPS
- Exact: `(DAU × Req/day) ÷ 86,400` = precise avg QPS
- Peak multiplier: typically 2–10× average (varies by system)

#### QPS Reference Table

**FORMULA BREAKDOWN — QPS CALCULATIONS:**

#### **Avg QPS (Mental Math): (DAU × Req/day) ÷ 100K**
#### **Avg QPS (Exact): (DAU × Req/day) ÷ 86,400**
#### **Peak QPS: Avg QPS × Peak Multiplier**
#### **Servers Needed: Peak QPS ÷ 1,000 QPS/server**

<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 9px;">
<thead style="background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #333;">
<tr>
<th style="border: 1px solid #ddd; padding: 1px; width: 11%;">System</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">DAU(M)</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 5%;">Req/day</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 7%; font-weight: bold;">Formula</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Avg MM</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Avg Exact</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 3%;">×</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Peak MM</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 6%;">Peak Exact</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 5%;">Servers</th>
<th style="border: 1px solid #ddd; padding: 1px; width: 9%;">Notes</th>
</tr>
</thead>
<tbody style="font-size: 8px;">
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Twitter</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150K</td>
<td style="border: 1px solid #ddd; padding: 2px;">174K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696K</td>
<td style="border: 1px solid #ddd; padding: 2px;">696</td>
<td style="border: 1px solid #ddd; padding: 2px;">High write: tweets, RTs, favorites</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>500M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(500M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Read-heavy: cache critical</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>400M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(400M×80)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">320K</td>
<td style="border: 1px solid #ddd; padding: 2px;">370K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.6M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.85M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1850</td>
<td style="border: 1px solid #ddd; padding: 2px;">Photo upload + feed reads</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">WhatsApp</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×150)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2080</td>
<td style="border: 1px solid #ddd; padding: 2px;">Message broker: high throughput</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Facebook</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>300M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">120</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(300M×120)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">360K</td>
<td style="border: 1px solid #ddd; padding: 2px;">417K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.44M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.67M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1670</td>
<td style="border: 1px solid #ddd; padding: 2px;">Social feed: complex DAG</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Uber</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">500</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×500)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">8</td>
<td style="border: 1px solid #ddd; padding: 2px;">2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2310</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo-location: real-time tracking</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">LinkedIn</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×80)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">400K</td>
<td style="border: 1px solid #ddd; padding: 2px;">465K</td>

<td style="border: 1px solid #ddd; padding: 2px;">465</td>
<td style="border: 1px solid #ddd; padding: 2px;">B2B: less peak variance</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>10M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(10M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">20K</td>
<td style="border: 1px solid #ddd; padding: 2px;">23K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>

<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Messaging: high peak during work hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">20</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×20)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">120K</td>
<td style="border: 1px solid #ddd; padding: 2px;">139K</td>

<td style="border: 1px solid #ddd; padding: 2px;">139</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata QPS low, bandwidth high</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50K</td>
<td style="border: 1px solid #ddd; padding: 2px;">58K</td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px;">500K</td>
<td style="border: 1px solid #ddd; padding: 2px;">579K</td>

<td style="border: 1px solid #ddd; padding: 2px;">579</td>
<td style="border: 1px solid #ddd; padding: 2px;">High peak: holiday shopping</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>1000M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">10</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(1000M×10)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>

<td style="border: 1px solid #ddd; padding: 2px;">347</td>
<td style="border: 1px solid #ddd; padding: 2px;">Distributed: federated queries</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>30M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(30M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">45K</td>
<td style="border: 1px solid #ddd; padding: 2px;">52K</td>

<td style="border: 1px solid #ddd; padding: 2px;">52</td>
<td style="border: 1px solid #ddd; padding: 2px;">Low peak: predictable hours</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>500M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(500M×50)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">250K</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.25M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.45M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1450</td>
<td style="border: 1px solid #ddd; padding: 2px;">Push service: bursty</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×30)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30K</td>
<td style="border: 1px solid #ddd; padding: 2px;">35K</td>
<td style="border: 1px solid #ddd; padding: 2px;">2</td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>

<td style="border: 1px solid #ddd; padding: 2px;">69</td>
<td style="border: 1px solid #ddd; padding: 2px;">Steady: low variance</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>10M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">1000</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(10M×1000)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>

<td style="border: 1px solid #ddd; padding: 2px;">694</td>
<td style="border: 1px solid #ddd; padding: 2px;">Payment: complex validation</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>200M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">30</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(200M×30)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">60K</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>

<td style="border: 1px solid #ddd; padding: 2px;">278</td>
<td style="border: 1px solid #ddd; padding: 2px;">File storage: read-heavy</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>100M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(100M×40)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">40K</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">200K</td>
<td style="border: 1px solid #ddd; padding: 2px;">231K</td>

<td style="border: 1px solid #ddd; padding: 2px;">231</td>
<td style="border: 1px solid #ddd; padding: 2px;">Sync service: CDC patterns</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>5M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(5M×300)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">50</td>
<td style="border: 1px solid #ddd; padding: 2px;">750K</td>
<td style="border: 1px solid #ddd; padding: 2px;">868K</td>

<td style="border: 1px solid #ddd; padding: 2px;">868</td>
<td style="border: 1px solid #ddd; padding: 2px;">Extreme peak: ticket release</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>300M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(300M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Personalization: complex ranking</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>20M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">2000</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(20M×2000)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">400K</td>
<td style="border: 1px solid #ddd; padding: 2px;">463K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2310</td>
<td style="border: 1px solid #ddd; padding: 2px;">Trading: real-time updates</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">ICICI Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>15M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(15M×100)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">15K</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">75K</td>
<td style="border: 1px solid #ddd; padding: 2px;">87K</td>

<td style="border: 1px solid #ddd; padding: 2px;">87</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: low DAU, steady</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>20M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">80</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(20M×80)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">16K</td>
<td style="border: 1px solid #ddd; padding: 2px;">19K</td>
<td style="border: 1px solid #ddd; padding: 2px;">5</td>
<td style="border: 1px solid #ddd; padding: 2px;">80K</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K</td>

<td style="border: 1px solid #ddd; padding: 2px;">93</td>
<td style="border: 1px solid #ddd; padding: 2px;">Banking: steady + audit logs</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">300K</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K</td>
<td style="border: 1px solid #ddd; padding: 2px;">4</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.2M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.39M</td>
<td style="border: 1px solid #ddd; padding: 2px;">1390</td>
<td style="border: 1px solid #ddd; padding: 2px;">Geo: location updates + routing</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>400M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">60</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(400M×60)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">240K</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">720K</td>
<td style="border: 1px solid #ddd; padding: 2px;">833K</td>

<td style="border: 1px solid #ddd; padding: 2px;">833</td>
<td style="border: 1px solid #ddd; padding: 2px;">Streaming: metadata + playlist</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">70</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×70)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">105K</td>
<td style="border: 1px solid #ddd; padding: 2px;">122K</td>
<td style="border: 1px solid #ddd; padding: 2px;">3</td>
<td style="border: 1px solid #ddd; padding: 2px;">315K</td>
<td style="border: 1px solid #ddd; padding: 2px;">365K</td>

<td style="border: 1px solid #ddd; padding: 2px;">365</td>
<td style="border: 1px solid #ddd; padding: 2px;">Music: India regional</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>150M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">150</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(150M×150)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">225K</td>
<td style="border: 1px solid #ddd; padding: 2px;">260K</td>
<td style="border: 1px solid #ddd; padding: 2px;">8</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.8M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.08M</td>
<td style="border: 1px solid #ddd; padding: 2px;">2080</td>
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce: inventory + search</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;"><strong>50M</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">200</td>
<td style="border: 1px solid #ddd; padding: 2px; font-weight: bold;"><strong>(50M×200)÷100K</strong></td>
<td style="border: 1px solid #ddd; padding: 2px;">100K</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K</td>
<td style="border: 1px solid #ddd; padding: 2px;">6</td>
<td style="border: 1px solid #ddd; padding: 2px;">600K</td>
<td style="border: 1px solid #ddd; padding: 2px;">694K</td>

<td style="border: 1px solid #ddd; padding: 2px;">694</td>
<td style="border: 1px solid #ddd; padding: 2px;">Booking: peak during holiday</td>
</tr>
</tbody>
</table>

---

### Storage Calculations

#### Key Assumptions

**Storage formula:**
```
Daily Data = Avg QPS × Write% × 86,400 sec/day × Bytes/Write
Total Storage = Daily Data × Retention Days × Redundancy ÷ Compression Ratio
Annual Cost = Tiered cost breakdown (Hot + Warm + Cold)
```

**Key inputs vary by system:**
- **Write % of QPS:** Twitter/messaging 15-50%, YouTube/streaming 5-8%, Banking 3-5%
- **Bytes per write:** Messages 1-2KB, Metadata 5KB, Video chunks 50KB, Transactions 500B
- **Retention:** Compliance 7y (banking), Lifetime (social), 30d (logs), 1-2y (media)
- **Redundancy:** 2× (99.9%), 3× (99.99%+)
- **Compression:** Text 1.5-1.8×, JSON 1.3-1.5×, Video 1.05-1.1×, DB 1.2×

**Storage tiers & costs:**
- **HOT** (0–90 days): $276/TB/year — SSD/NVMe, <10ms access
- **WARM** (91–365 days): $36/TB/year — HDD/Standard, 50–100ms access
- **COLD** (365+ days): $4/TB/year — Glacier/Tape, hours to retrieve

#### Storage Reference Table

**FORMULA BREAKDOWN — STORAGE CALCULATIONS:**

#### **Daily Data Volume: Avg QPS × Write% × 86,400 × Bytes/Write**
#### **Total Storage: (Daily Data × Retention Days × Redundancy) ÷ Compression Ratio**

**Compression Ratio Guide:**
- **1.5× compression** = 33% size reduction (text/JSON)
- **1.2× compression** = 17% size reduction (database exports)
- **1.1× compression** = 9% size reduction (video/audio, already compressed)
- **1.05× compression** = 5% size reduction (streaming media)

**Example (Twitter):**
- **Daily Data** = 174K QPS × 15% writes × 86,400 × 1KB = **2.3 PB/day**
- **Total Storage** = (2.3 PB × 1825 days × 3) ÷ 1.5 = **6.8 EB**

<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 9px;">
<thead style="background-color: #f0f0f0; font-weight: bold; border-bottom: 2px solid #333;">
<tr>
<th style="border: 1px solid #ddd; padding: 2px; width: 9%;">System</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 8%;">Daily Data</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 14%;">Formula</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 10%;">Total (TB)</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Hot %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Warm %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 6%;">Cold %</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 12%;">Annual Cost</th>
<th style="border: 1px solid #ddd; padding: 2px; width: 13%;">Notes</th>
</tr>
</thead>
<tbody style="font-size: 8px;">
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Twitter</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2.3×1825×3)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">6.8 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">28%</td>
<td style="border: 1px solid #ddd; padding: 2px;">60%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$680M</td>
<td style="border: 1px solid #ddd; padding: 2px;">174K avg QPS, 15% writes, 1KB/write (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">YouTube</td>
<td style="border: 1px solid #ddd; padding: 2px;">100 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(100×730×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">200 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">87%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$4.8B</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 8% writes, 50KB/write (2y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Instagram</td>
<td style="border: 1px solid #ddd; padding: 2px;">32 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(32×1825×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">146 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">8%</td>
<td style="border: 1px solid #ddd; padding: 2px;">22%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$3.2B</td>
<td style="border: 1px solid #ddd; padding: 2px;">370K avg QPS, 20% writes, 5KB/write (5y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">WhatsApp</td>
<td style="border: 1px solid #ddd; padding: 2px;">30 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(30×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">14.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.5B</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 50% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Facebook</td>
<td style="border: 1px solid #ddd; padding: 2px;">45 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(45×1825×3)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">188 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">18%</td>
<td style="border: 1px solid #ddd; padding: 2px;">75%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$4.1B</td>
<td style="border: 1px solid #ddd; padding: 2px;">417K avg QPS, 25% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Uber</td>
<td style="border: 1px solid #ddd; padding: 2px;">15 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(15×90×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">3.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$280M</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 30% writes, 2KB/write (90d)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">LinkedIn</td>
<td style="border: 1px solid #ddd; padding: 2px;">8 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(8×1825×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">22.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">33%</td>
<td style="border: 1px solid #ddd; padding: 2px;">55%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.3B</td>
<td style="border: 1px solid #ddd; padding: 2px;">93K avg QPS, 20% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Slack</td>
<td style="border: 1px solid #ddd; padding: 2px;">2.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(2.4×365×2)÷1.8</td>
<td style="border: 1px solid #ddd; padding: 2px;">1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$110M</td>
<td style="border: 1px solid #ddd; padding: 2px;">23K avg QPS, 40% writes, 3KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Netflix</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.2 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(0.2×730×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.28 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">65%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$18M</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K avg QPS, 5% writes, 1KB/write (2y, metadata only)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">E-commerce</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(1.5×365×2)÷1.4</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.78 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$88M</td>
<td style="border: 1px solid #ddd; padding: 2px;">58K avg QPS, 15% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Search</td>
<td style="border: 1px solid #ddd; padding: 2px;">20 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(20×30×1)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">0%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$50M</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 2% writes, 100KB/write (30d, ephemeral index)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Banking App</td>
<td style="border: 1px solid #ddd; padding: 2px;">73 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(73T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.31 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">80%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$31M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 10% writes, 500B/write (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Notification</td>
<td style="border: 1px solid #ddd; padding: 2px;">22.6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(22.6×30×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.68 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$76M</td>
<td style="border: 1px solid #ddd; padding: 2px;">289K avg QPS, 90% writes, 1KB/write (30d, ephemeral logs)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Weather App</td>
<td style="border: 1px solid #ddd; padding: 2px;">3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(3×365×2)÷2</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.1 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$80M</td>
<td style="border: 1px solid #ddd; padding: 2px;">35K avg QPS, 10% writes, 10KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Stripe</td>
<td style="border: 1px solid #ddd; padding: 2px;">4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(4×2555×3)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">25.55 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$2.6B</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 80% writes, 500B/write (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Drive</td>
<td style="border: 1px solid #ddd; padding: 2px;">12 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(12×1825×3)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">62.7 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">12%</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">63%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.4B</td>
<td style="border: 1px solid #ddd; padding: 2px;">69K avg QPS, 20% writes, 10KB/write (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Dropbox</td>
<td style="border: 1px solid #ddd; padding: 2px;">5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5×1825×3)÷1.1</td>
<td style="border: 1px solid #ddd; padding: 2px;">24.8 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">70%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$560M</td>
<td style="border: 1px solid #ddd; padding: 2px;">46K avg QPS, 25% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">IRCTC</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.88 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(0.88×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.43 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">75%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$48M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 30% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Newsfeed</td>
<td style="border: 1px solid #ddd; padding: 2px;">30 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(30×730×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">33.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">50%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$3.4B</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 20% writes, 5KB/write (2y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Zerodha</td>
<td style="border: 1px solid #ddd; padding: 2px;">10 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(10×365×2)÷1.5</td>
<td style="border: 1px solid #ddd; padding: 2px;">4.9 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$600M</td>
<td style="border: 1px solid #ddd; padding: 2px;">463K avg QPS, 25% writes, 1KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">ICICI Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">220 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(220T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">0.93 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$93M</td>
<td style="border: 1px solid #ddd; padding: 2px;">17K avg QPS, 15% writes, 1KB/write (7y compliance)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">HDFC Bank</td>
<td style="border: 1px solid #ddd; padding: 2px;">250 TB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(250T×2555×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">1.06 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">5%</td>
<td style="border: 1px solid #ddd; padding: 2px;">10%</td>
<td style="border: 1px solid #ddd; padding: 2px;">85%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$106M</td>
<td style="border: 1px solid #ddd; padding: 2px;">19K avg QPS, 15% writes, 1KB/write (7y compliance)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Google Maps</td>
<td style="border: 1px solid #ddd; padding: 2px;">9 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(9×365×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">25%</td>
<td style="border: 1px solid #ddd; padding: 2px;">40%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$640M</td>
<td style="border: 1px solid #ddd; padding: 2px;">347K avg QPS, 15% writes, 2KB/write (1y)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Spotify</td>
<td style="border: 1px solid #ddd; padding: 2px;">12 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(12×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">41.7 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$1.2B</td>
<td style="border: 1px solid #ddd; padding: 2px;">278K avg QPS, 10% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Gaana</td>
<td style="border: 1px solid #ddd; padding: 2px;">5.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(5.3×1825×2)÷1.05</td>
<td style="border: 1px solid #ddd; padding: 2px;">18.6 EB</td>
<td style="border: 1px solid #ddd; padding: 2px;">3%</td>
<td style="border: 1px solid #ddd; padding: 2px;">7%</td>
<td style="border: 1px solid #ddd; padding: 2px;">90%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$530M</td>
<td style="border: 1px solid #ddd; padding: 2px;">122K avg QPS, 10% writes, 5KB/write (∞)</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="border: 1px solid #ddd; padding: 2px;">Amazon</td>
<td style="border: 1px solid #ddd; padding: 2px;">13.4 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(13.4×365×2)÷1.3</td>
<td style="border: 1px solid #ddd; padding: 2px;">7.5 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">20%</td>
<td style="border: 1px solid #ddd; padding: 2px;">35%</td>
<td style="border: 1px solid #ddd; padding: 2px;">45%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$870M</td>
<td style="border: 1px solid #ddd; padding: 2px;">260K avg QPS, 20% writes, 3KB/write (1y)</td>
</tr>
<tr style="background-color: #fff;">
<td style="border: 1px solid #ddd; padding: 2px;">Airbnb</td>
<td style="border: 1px solid #ddd; padding: 2px;">6 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">(6×730×2)÷1.2</td>
<td style="border: 1px solid #ddd; padding: 2px;">7.3 PB</td>
<td style="border: 1px solid #ddd; padding: 2px;">15%</td>
<td style="border: 1px solid #ddd; padding: 2px;">30%</td>
<td style="border: 1px solid #ddd; padding: 2px;">55%</td>
<td style="border: 1px solid #ddd; padding: 2px;">$840M</td>
<td style="border: 1px solid #ddd; padding: 2px;">116K avg QPS, 20% writes, 3KB/write (2y)</td>
</tr>
</tbody>
</table>

---

### Bandwidth Calculations

(To do)

---

### Database Capacity Calculations

(To do)

---

### Cache Planning

(To do)


---

## 7. What do the handwritten system design fundamentals notes cover (Grokking the System Design Interview)?

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="systemdesign/handwritten-notes/sysdesign-notes-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="systemdesign/handwritten-notes/sysdesign-notes-light.png">
  <img alt="Handwritten system design interview notes — notebook-style pages covering the Introduction to System Design Interview and Glossary of System Design Basics sections, through Bloom Filters" src="systemdesign/handwritten-notes/sysdesign-notes-light.png" width="720">
</picture>

---

*Source: [Grokking the System Design Interview](https://www.designgurus.io/course/grokking-the-system-design-interview), DesignGurus.io. Editable source for the page above lives at [`systemdesign/handwritten-notes/source.html`](systemdesign/handwritten-notes/source.html) — open it in a browser to view/update it directly; regenerate the PNGs above after edits.*


