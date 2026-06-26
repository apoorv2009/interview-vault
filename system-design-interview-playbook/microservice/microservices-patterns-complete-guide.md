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
11a. [Fan-out / Fan-in](#11a-fan-out--fan-in)
12. [Choreography vs Orchestration](#12-choreography-vs-orchestration)
13. [CQRS Pattern](#13-cqrs-pattern)
14. [BFF — Backend for Frontend](#14-bff--backend-for-frontend)
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

> 🗣️ **Capital Access — How to explain in interview:**
> "Capital Access is decomposed into six microservices — Ownership, Profiles, Targeting, Contacts, Notifications, and Reports. Each owns a distinct business capability and its own database. For example, the Ownership Service is completely independent of the Notifications Service — if Notifications goes down, ownership data still works perfectly. Each service deploys independently, scales independently, and can be built with the most appropriate technology for its domain. That's the core benefit we get from microservices in Capital Access."

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

### Outbox Pattern — Capital Access C# Implementation

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

> 🗣️ **Capital Access — How to explain in interview:**
> "In Capital Access, Azure API Management is our single entry point for all SPA traffic. The Angular app never talks directly to any microservice — every request goes through APIM. The gateway does three things: it validates the JWT token against Okta's public keys cached from the JWKS endpoint, it checks the tenant ID and role claims so one client can never access another client's data, and it applies rate limiting per tenant. Then it routes the request to the correct downstream microservice. The microservices themselves are in a private subnet with no public IP — they cannot be reached from the internet directly. So even if someone knew the internal URL of the Targeting Service, they couldn't hit it. Network isolation is the first and most important layer of gateway bypass protection."

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

> 🗣️ **Capital Access — How to explain in interview:**
> "In Capital Access, the Report Worker is an Azure Function that calls four microservices synchronously — Ownership, Profiles, Targeting, and Contacts — to aggregate data for a report. If the Targeting Service is slow or down, without a circuit breaker the Report Worker would keep sending requests and waiting, eventually exhausting its connections and failing all reports. We wrap each service client with Polly's circuit breaker — after five consecutive failures, the circuit opens and we instantly return a cached fallback or a partial report rather than waiting. After 30 seconds the circuit goes half-open, sends one test request, and if it succeeds the circuit closes again. This protects the report pipeline from a single slow downstream service bringing down the entire flow."

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

### Circuit Breaker — Capital Access C# Implementation (Polly)

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

## 11. SAGA Pattern

> 🗣️ **Capital Access — How to explain in interview:**
> "Report generation in Capital Access is a classic Saga scenario — it spans four services, each with its own database, and there's no single transaction that can cover all of them. The steps are: create the report job record, fetch ownership data, fetch targeting data, generate the PDF and store it in Blob Storage. We use Azure Durable Functions as the Saga orchestrator — it coordinates each step and if anything fails it runs compensating transactions in reverse order. For example if PDF generation fails after ownership and targeting data were already fetched, the orchestrator deletes the report job record so the user doesn't see a permanently stuck job. The reason we chose orchestration over choreography here is that the flow has four steps with complex failure handling — having one place where you can see the full state of any report job is essential for debugging and support."

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

### SAGA — Capital Access C# Implementation (Azure Durable Functions)

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

## 11a. Fan-out / Fan-in

**Fan-out** means splitting one task into multiple parallel sub-tasks that all run at the same time.

**Fan-in** means waiting for all those parallel sub-tasks to complete and combining their results back into one before proceeding.

### The Mental Model — Manager Delegating Work

Instead of asking one person to do four things one after another, you give all four people their tasks simultaneously and wait for everyone to finish before the team moves forward. That's fan-out/fan-in.

### Sequential vs Parallel

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

### Key Points

- **Fan-out** = fire all calls at the same time
- **Fan-in** = the wait point — you don't proceed until ALL parallel branches return
- If any branch fails, the fan-in fails — the SAGA then handles compensation
- The total time is determined by the **slowest** parallel call, not the sum

### When to Use

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

## 13. CQRS Pattern

> 🗣️ **Capital Access — How to explain in interview:**
> "We use CQRS in the Engagement Service in Capital Access. The write side handles commands like creating an engagement, completing it, or rescheduling it — with full business rule validation and ACID transactions in Azure SQL. When a command succeeds, it publishes a domain event. The read side has a separate denormalized database view — the EngagementSummaries table — which the event handler keeps up to date. When the Angular dashboard loads, it hits the read side, which returns pre-shaped data with company names already joined in, no complex queries needed. The benefit is that our dashboard reads are extremely fast because the read model is already shaped exactly for what the UI needs. The trade-off is eventual consistency — there's a very short window, typically milliseconds, where the write is committed but the read model hasn't updated yet. For an investor relations dashboard that's completely acceptable."

### The Problem

One database handles both reads and writes. They fight each other.

- **Writes** need strong consistency, complex validation, normalized data
- **Reads** need speed, denormalized views, different indexes per use case
- At scale, heavy reads slow down writes and vice versa — same DB, different needs

### What CQRS Does

**Command Query Responsibility Segregation** — split the write model (Commands) from the read model (Queries). Each side is optimized independently. Commands change state. Queries never change state.

### The Mental Model — Bank Teller vs ATM Screen

```
Teller (Command side):
  Processes transactions, enforces rules, updates the ledger.
  Needs accuracy. Can be slower.

ATM display (Query side):
  Shows your balance instantly.
  Doesn't process anything — just reads a pre-built view.
  Can show data that's a few seconds old. That's fine.
```

### Architecture Flow

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

### Commands vs Queries

| | Command | Query |
|---|---|---|
| Intent | Change state | Read state |
| Returns | Acknowledgement / void | Data |
| Example | `PlaceOrder`, `CancelOrder` | `GetOrderStatus`, `GetUserOrders` |
| Database | Write DB (normalized) | Read DB (denormalized) |
| Consistency | Strong | Eventual |

### Consistency Trade-off

```
User places order (Command) → Write DB updated immediately ✅
                            → Event published → Read DB updated ~100ms later

User checks order status (Query) → might see old status for 100ms
                                 → then sees correct status ✅

This is EVENTUAL CONSISTENCY. Acceptable for most use cases.
If you need "read your own writes" immediately → cache the command result client-side.
```

### CQRS + Event Sourcing (Common Pairing)

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

### When to Use / Not Use

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

### Comparison with Related Patterns

| Pattern | What it solves | Key idea |
|---------|----------------|----------|
| **CQRS** | Read/write contention | Separate models for reads and writes |
| **Saga** | Distributed transactions | Chain of compensating steps |
| **Outbox** | Dual-write reliability | Atomic DB write + event publish |
| **Event Sourcing** | Audit trail / time travel | Store events not state |

### CQRS — Capital Access C# Implementation (MediatR)

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

### Interview Answer

> "CQRS separates the write model from the read model. The command side handles all state changes with strong consistency. The query side handles reads from a denormalized, eventually-consistent view. The write side publishes domain events; the read side consumes them to update its read models. This lets you scale reads and writes independently and optimize each side for its access pattern. The main cost is eventual consistency and the overhead of maintaining two databases."

---

## 14. BFF — Backend for Frontend

> 🗣️ **Capital Access — How to explain in interview:**
> "The Angular dashboard in Capital Access needs data from three different services — recent engagements, summary metrics, and active alerts — all in one page load. Without a BFF, the Angular app would make three separate HTTP calls, the user would see the page loading in chunks, and we'd have three round trips instead of one. Our BFF endpoint aggregates all three in parallel on the server side — calls Engagement, Metrics, and Alerts services simultaneously using Task.WhenAll — then shapes the combined response exactly for what the Angular dashboard template needs. The Angular app makes one call and gets everything. It's also important to distinguish this from the API Gateway — APIM handles infrastructure concerns like auth, rate limiting, and routing. The BFF handles product concerns — it knows the exact shape of data the dashboard needs. These are two different layers solving two different problems."

### The Problem

One API serving both Angular SPA and mobile app — the response is a compromise that fits neither perfectly.

```
WITHOUT BFF:
  Angular SPA ──▶  Single API ──▶ giant response (SPA uses 80%, ignores 20%) ❌
  Mobile App  ──▶  Same API   ──▶ downloads 5× more data than needed ❌
  Angular needs:   3 services aggregated into one dashboard call
  Mobile needs:    1 service, minimal fields

  One API cannot satisfy both without over-fetching or multiple round-trips.
```

### What BFF Does

```
WITH BFF:
  Angular SPA ──▶  Web BFF    ──▶  internal microservices
  Mobile App  ──▶  Mobile BFF ──▶  same internal microservices (different shape)

  Each BFF is OWNED by the frontend team.
  Each BFF shapes the response exactly for its client.
  Microservices stay dumb — they serve raw data.
  BFF is the intelligence layer in between.
```

### Capital Access — Web BFF Implementation

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

### BFF vs API Gateway

```
API Gateway:  infrastructure concern — auth, routing, rate limit, SSL termination
              One gateway for ALL clients
              Does NOT aggregate or reshape data

BFF:          product concern — aggregate, filter, shape data for ONE specific client
              One BFF per client type (Web, Mobile, TV app...)
              Owned by the frontend team, not platform team
```

### When to Use / Not Use

**Use BFF when:**
- Multiple client types with meaningfully different data needs (SPA vs mobile vs TV)
- Frontend team owns their own API contract
- API aggregation / orchestration needed on behalf of the client
- Want to shield the client from internal microservice complexity

**Don't use BFF when:**
- Single client type — one API is fine
- All clients need identical data — duplication with no benefit

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
