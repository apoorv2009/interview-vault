# System Design & Microservices — Revision Notes

*Compiled from study sessions | Last updated: June 2026 | Topics grow with every session*

---

## Table of Contents

1. [Microservices — What & Why](#1-microservices--what--why)
2. [Service Decomposition Strategies](#2-service-decomposition-strategies)
3. [Communication Patterns — Overview](#3-communication-patterns--overview)
4. [Synchronous Patterns](#4-synchronous-patterns)
5. [Asynchronous Patterns](#5-asynchronous-patterns)
6. [Queue vs Pub/Sub — The Key Difference](#6-queue-vs-pubsub--the-key-difference)
7. [Kafka Deep Dive](#7-kafka-deep-dive)
8. [Kafka vs RabbitMQ vs Queue vs Pub/Sub](#8-kafka-vs-rabbitmq-vs-queue-vs-pubsub)
9. [API Gateway & Bypass Security](#9-api-gateway--bypass-security)
10. [Circuit Breaker Pattern](#10-circuit-breaker-pattern)
11. [SAGA Pattern](#11-saga-pattern)
12. [Choreography vs Orchestration](#12-choreography-vs-orchestration)
13. [System Design — Facebook](#13-system-design--facebook)
14. [System Design — Twitter](#14-system-design--twitter)
15. [Interview Strategy](#15-interview-strategy)

---

## 1. Microservices — What & Why

Microservices is an architectural style where a large application is broken into small, independent services. Each service owns one thing completely — its data, its logic, its deployment.

### Monolith vs Microservices

```
Monolith:                          Microservices:
┌─────────────────────┐            ┌──────────┐  ┌──────────┐
│  Everything in one  │            │  Orders  │  │ Payments │
│  codebase           │     vs     └──────────┘  └──────────┘
│  One deploy         │            ┌──────────┐  ┌──────────┐
│  One database       │            │Inventory │  │  Users   │
└─────────────────────┘            └──────────┘  └──────────┘
```

### Core Principle

> **High Cohesion, Low Coupling** — A service owns one thing completely. Other services can change independently without affecting yours. If two services always deploy together — they are probably one service.

### When NOT to use Microservices

- Small team, small project — operational overhead not justified
- Domain boundaries not yet clear — start with modular monolith first
- Simple CRUD application — no need for distributed complexity

---

## 2. Service Decomposition Strategies

> **The Hierarchy — Apply in This Order:** DDD Bounded Contexts → Business Capability → Data Ownership → Change Rate → Strangler Fig (legacy only) → Core/Supporting/Generic

### Strategy 1 — DDD Bounded Contexts

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

### Strategy 2 — Business Capability

One service per thing the business does. Most universally applicable — always the starting point.

| Business Capability | Service           |
|---------------------|-------------------|
| Browse products     | Catalogue Service |
| Know stock levels   | Inventory Service |
| Set prices          | Pricing Service   |
| Place orders        | Order Service     |
| Process payments    | Payment Service   |
| Ship items          | Fulfilment Service|

### Strategy 3 — Data Ownership (Validation Test)

Each service owns its own database. No other service can touch it directly.

> **If two services share a database table — they are not truly separate services.** The boundary is wrong. Go back and redesign.

### Strategy 4 — Change Rate / Team Ownership

Things that change together for the same reason belong together. Things that change independently belong apart. Design your system to match your team structure (Conway's Law).

### Strategy 5 — Core / Supporting / Generic

| Type           | What it is                          | Action                      |
|----------------|-------------------------------------|-----------------------------|
| **Core**       | Your competitive advantage          | Build, invest heavily       |
| **Supporting** | Necessary but not differentiating   | Build simply                |
| **Generic**    | Commodity (auth, email, payments)   | Buy / use third party       |

### Strategy 6 — Strangler Fig (Legacy Only)

For decomposing existing monoliths. Put an API Gateway in front. Extract one service at a time. Monolith shrinks gradually. Never rewrite everything at once.

### The Distributed Monolith Anti-Pattern

> **Warning signs:** Services share a database · Services always deploy together · One change requires updates in 5 services · Decomposed by technical layer not business domain

### Boundary Decision — 5 Questions

1. Does it have a distinct business capability?
2. Does it have its own data no one else should own?
3. Does it change independently of adjacent services?
4. Can a single team own it end-to-end?
5. Would splitting require constant cross-service coordination? (If yes → wrong boundary)

---

## 3. Communication Patterns — Overview

### The Three-Question Decision Framework

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

### Full Pattern Map

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

### Master Decision Table

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

## 4. Synchronous Patterns

### REST over HTTP

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

### gRPC

Binary Protocol Buffers over HTTP/2. Strongly typed contracts via `.proto` files. Much faster than REST. Supports server streaming, client streaming, and bidirectional streaming.

**Use gRPC when:** High-frequency internal service calls · Performance critical · Streaming needed · Both sides under your control

**Don't use when:** External/browser clients · Low-frequency calls

---

### GraphQL

Client specifies exactly what fields it needs. One endpoint. Three operations: Query (read), Mutation (write), Subscription (real-time).

**Use GraphQL when:** Multiple clients with different data needs · Mobile bandwidth matters · BFF aggregation layer

**Don't use when:** Simple stable APIs · Service-to-service calls

---

## 5. Asynchronous Patterns

### Message Queue (Point-to-Point)

Producer drops a message. Exactly ONE consumer picks it up. Producer moves on immediately. Message deleted after consumer acknowledges (ACK).

```
Order Service ──▶ [Email Queue] ──▶ Notification Service
Dead Letter Queue (DLQ): message fails N times → moved to DLQ for investigation
```

**Use when:** Fire-and-forget jobs · Emails, PDFs, image processing · Exactly ONE service should handle each message

---

### Pub/Sub (Publish-Subscribe)

Producer publishes event to a topic. EVERY subscriber gets their own independent copy. Publisher has no knowledge of who's listening.

```
Order Service ──▶ [OrderPlaced Topic]
                   ├──▶ Inventory Service  (own copy)
                   ├──▶ Fulfilment Service (own copy)
                   └──▶ Notification       (own copy)
```

**Use when:** Multiple services react to one event · Domain events · Add subscribers without touching publisher

---

### Outbox Pattern

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

---

### Request-Reply over Messaging

Async but still returns a response. Caller sends message with `replyTo` address + `correlationId`. Consumer processes and replies. Use when you need a response but operation is slow (seconds).

---

## 6. Queue vs Pub/Sub — The Key Difference

| | Queue | Pub/Sub |
|---|---|---|
| Message goes to | Exactly ONE consumer | ALL subscribers |
| Message after read | Deleted | Deleted after all read |
| Competing consumers | Yes — share the work | No — each gets own copy |
| Add new consumer | Must change producer | Just add subscription |
| Think of it as | Task / job | Event / announcement |

**Queue = Restaurant Kitchen** — Tickets on a rail. One chef picks each ticket. Cooks it. Ticket gone. Other chefs never see it. *One message → One worker → Done*

**Pub/Sub = Newspaper** — One edition printed. All subscribers get their own copy. One slow reader doesn't affect others. *One message → Every subscriber → All independent*

### The One Question That Always Gives the Answer

> **"Would it be a problem if TWO services both processed this same message?"**
> YES → Queue. Only one worker should handle it.
> NO, you WANT both to process it → Pub/Sub.

### Why Not Just Use Multiple Queues Instead of Pub/Sub?

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

### Bottom Line

> Queue = work distribution. One job to one worker.
> Pub/Sub = event broadcasting. Everyone who cares hears it independently.
>
> **"Send this email"** = task = Queue | **"Order was placed"** = event = Pub/Sub

---

## 7. Kafka Deep Dive

### Why Kafka Exists

- Messages gone after processing — new service has no historical data
- One slow consumer blocks others in a shared queue
- Cannot handle millions of events/second with RabbitMQ

### The Mental Model — A Library Archive

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

### Core Concepts

| Concept            | What it is                                                                              |
|--------------------|-----------------------------------------------------------------------------------------|
| **Topic**          | Named log. Append-only. Messages never modified, only added.                           |
| **Partition**      | Topic split for parallelism. Same key → same partition → ordering guaranteed.          |
| **Offset**         | Consumer's bookmark/position. Can be rewound to replay history.                        |
| **Consumer Group** | Service instances sharing partitions. Different groups = completely independent.        |
| **Retention**      | How long messages are kept. NOT deleted after reading.                                 |

### How "Done" Works — Offset Commit

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

## 8. Kafka vs RabbitMQ vs Queue vs Pub/Sub

### RabbitMQ — The Smart Post Office

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

### Full Comparison

|                         | Queue          | Pub/Sub        | RabbitMQ       | Kafka              |
|-------------------------|----------------|----------------|----------------|--------------------|
| One consumer per message| ✅             | ❌             | ✅ queue mode  | ✅ within group    |
| All consumers get copy  | ❌             | ✅             | ✅ fanout      | ✅ across groups   |
| Message replay          | ❌             | ❌             | ❌             | ✅                 |
| Deleted after read      | ✅             | ✅             | ✅             | ❌                 |
| High throughput         | ❌             | Medium         | Medium         | ✅                 |
| Complex routing         | ❌             | ❌             | ✅             | ❌                 |
| Operational complexity  | Low            | Low            | Medium         | High               |

### One Line Each

> **Queue** — Task board. One person picks each task. Gone when done.
> **Pub/Sub** — Group announcement. Everyone hears it right now.
> **RabbitMQ** — Smart post office. Routes messages by rules.
> **Kafka** — Library archive. Everything stored. Anyone reads anytime. Reading doesn't delete.

---

## 9. API Gateway & Bypass Security

### What API Gateway Does

- **Authentication** — validate JWT once, not in every service
- **Routing** — `/orders/*` → Order Service, `/products/*` → Catalogue
- **Rate limiting** — 1000 calls/minute per client
- **SSL termination** — HTTPS at edge, plain HTTP internally
- **Load balancing** — distribute across service instances

### Preventing Gateway Bypass — Defence in Depth

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

## 10. Circuit Breaker Pattern

### The Problem — Cascading Failure

Review Service goes slow. 1000 users open product page. All 1000 requests stuck waiting 10 seconds. Product Page runs out of threads. Product Page crashes too. One slow service killed the whole website.

### Analogy — Home Fuse Box

Too many appliances running → fuse trips → cuts electricity → protects the rest of the house. After some time you reset it.

### Three States

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

### Friend Analogy

Friend not answering. After 5 unanswered calls → stop calling 2 hours (OPEN). After 2 hours → try once (HALF-OPEN). Answers → resume calling (CLOSED).

**Use when:** Any sync call to a non-critical service · Want graceful degradation · Downstream is unreliable

**Tools:** Polly (.NET), Hystrix / Resilience4j (Java)

---

## 11. SAGA Pattern

### The Problem

In microservices, each service has its own database. No single transaction spans them all. You cannot ROLLBACK across three separate systems.

### What Saga Does

Chain of local transactions. Each step publishes an event. If any step fails, compensating transactions undo previous steps in reverse order.

### Happy Path vs Failure Path

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

### Compensating Transaction

> NOT a magical undo. A NEW ACTION that reverses the effect of a previous step.
> Original:     Reserve 2 iPhones in stock
> Compensating: Release 2 iPhones back to stock

**Use when:** Business operation spans multiple services · Each service has its own DB · Eventual consistency is acceptable

---

## 12. Choreography vs Orchestration

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

### When to Use Which

| Choreography                  | Orchestration                          |
|-------------------------------|----------------------------------------|
| Simple flow, 2-3 steps        | Complex flow, 4+ steps                |
| Steps rarely change           | Business rules evolve frequently       |
| Teams fully independent       | Need visibility across full flow       |
| Startup / early stage         | Scale / mature system                  |

> **Real world:** Most teams start with choreography. As system grows they hit event spaghetti and migrate to orchestration. Netflix, Uber, Amazon all use orchestration for core transactional flows.

---

## 13. System Design — Facebook

### Core Features (8 Things)

Profile · Friends (mutual) · Posts/Photos/Videos · News Feed · Likes & Comments · Notifications · Messages · Search

### The 6 Core Concepts

| Concept           | What it does                           | Analogy                                    |
|-------------------|----------------------------------------|--------------------------------------------|
| **Load Balancer** | Spreads traffic across many servers    | Supermarket directing customers to shortest queue |
| **Sharding**      | Splits data across multiple databases  | Library rooms A-H, I-P, Q-Z               |
| **Cache**         | Hot data in memory, skip DB            | Brain remembering capital of France        |
| **CDN**           | Files from nearest server worldwide    | Flipkart warehouse in every city           |
| **Message Queue** | Async background jobs                  | Restaurant ticket rail                     |
| **Pre-computation**| Do hard work in advance, serve instantly | Pre-building your inbox overnight        |

### News Feed — The Hardest Problem

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

### Key Solutions Per Problem

| Problem                           | Solution                                  |
|-----------------------------------|-------------------------------------------|
| One server overloaded             | Load Balancer + multiple servers          |
| One DB can't handle 3B users      | Sharding + separate DBs per data type     |
| Photos/videos too big for DB      | Blob Storage (S3) + CDN                   |
| Same post read millions of times  | Cache (Redis)                             |
| Real-time notifications           | WebSockets — persistent two-way connection|
| Search 3B users                   | Elasticsearch — pre-built inverted index  |

---

## 14. System Design — Twitter

### 3 Core Differences from Facebook

|                   | Facebook                    | Twitter                                     |
|-------------------|-----------------------------|---------------------------------------------|
| Connection        | Mutual (friend both ways)   | One-way (follow)                            |
| Feed order        | Algorithm ranked            | Chronological (newest first)                |
| Write volume      | Medium                      | 500M tweets/day — extreme                   |
| Public by default | No                          | Yes                                         |
| Trending topics   | No                          | Core feature                                |
| Real-time search  | No                          | Critical (tweets searchable in seconds)     |

### Hybrid Fan-out (Celebrity Problem Even Worse)

```
Normal users (< 10K followers) → fan-out on write → push to followers' cache
Celebrities (millions)         → fan-out on read  → pull when timeline opened
Your timeline = cache (normal friends) + pulled celebrity tweets (merged chronologically)
```

### Trending Topics — Unique to Twitter

```
Every tweet arrives → extract hashtags → increment counter in Redis (cache)

Every 30 seconds: sort hashtags by count → top 10 = Trending

Key: Trending = SPIKE detection, not just total count.
  #Cricket always mentioned → not trending
  #Cricket spikes 10K/hr → 500K/hr → something big happened → TRENDING

Tools: Kafka + Apache Flink (stream processing)
```

### Why Cassandra (Not SQL) for Tweets

| SQL Database                              | Cassandra (NoSQL)                    |
|-------------------------------------------|--------------------------------------|
| Hard to scale writes horizontally         | Built for massive write throughput   |
| Struggles at 6,000 tweets/second          | Handles millions of writes/second    |
| ACID transactions                         | Eventual consistency                 |

### What's New vs Facebook

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

### The One Sentence Difference

> **Facebook** = social network. Connections between people. Sharing life moments with friends.
> **Twitter** = public broadcast platform. Sharing information with the world in real time.
>
> Same building blocks. Assembled differently because the problems are different.

---

## 15. Interview Strategy

### System Design — The 5 Gears

| Gear                    | What to do                                                              | Time      |
|-------------------------|-------------------------------------------------------------------------|-----------|
| **1 — Clarify**         | What features? How many users? Read or write heavy? Speed vs accuracy? | 2-3 min   |
| **2 — Simple**          | Design for one user. One server, one database. Show foundation first.  | 3-4 min   |
| **3 — Identify breaks** | Name what breaks at scale BEFORE jumping to solutions.                 | 4-5 min   |
| **4 — Solve**           | Problem → Solution → WHY. Always the why.                              | 10-12 min |
| **5 — Deep dive**       | Interviewer picks one area. Apply queues, Kafka, circuit breakers etc. | remaining |

### The Magic Sentence Structure

> "The **problem** here is [X].
> This **matters** because [why it breaks at scale].
> So the **solution** is [Y].
> This **works** because [why Y solves X]."

### What Interviewers Actually Score

- Did you ask clarifying questions?
- Did you identify the right problems?
- Did you explain WHY each solution exists?
- Did you discuss trade-offs?
- Did you structure your thinking clearly?
- Did you handle pushback confidently?

### Handling Challenges

> **When interviewer challenges your design:**
> Don't say: "Oh yes, you are right." (and stop)
> Do say: "Good point. There is a trade-off here. We can [A] which gives [benefit] but costs [downside].
>          Alternatively [B]. For this use case I'd choose A because [reason]."
> Interviewers challenge to see if you can defend decisions — not to catch you out.

### The Golden Rule

> The best system design answer is NOT the one with the most components.
> It is the one where every component exists for a clear reason you can explain in plain English.
>
> Start from one user. Scale up. Explain the why. Discuss trade-offs. The interviewer wants to see your thinking — not a memorised architecture.

---

*Saved at D:\Learning\Study Material | Updated after every session | New topics added as discussions grow*
