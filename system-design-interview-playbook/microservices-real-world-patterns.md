**What Microservice Architecture Do Companies Actually Use in Real Projects?**

Not What You See in Textbooks

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

# 1. Executive Reality Check

Textbooks show you neat boxes with arrows. Production systems are far messier. Companies don't implement a pure microservices model — they run a hybrid of decomposed services, shared libraries, platform teams, and pragmatic shortcuts accumulated over years of operational pain.

| Textbook Fiction | Production Reality |
| --- | --- |
| Every service is independently deployable | Shared DB schemas and monorepo coupling abound |
| Services communicate via clean REST APIs | gRPC internally; REST only at the boundary |
| Each team owns exactly one service | Platform teams own shared infra (mesh, CI/CD, observability) |
| Service mesh everywhere from day one | Sidecar injection rolled out incrementally; many teams bypass it |

# 2. How Companies Actually Decompose Services

## 2.1 Domain-Driven Design (DDD) Bounded Contexts

The gold standard. Services map 1:1 to a Bounded Context. Ubiquitous language per domain. The challenge: boundaries drift over time as business logic leaks across domains through shared data models.

## 2.2 Strangler Fig Pattern

The dominant migration path from monolith to microservices at scale. New features are implemented as standalone services; the monolith is incrementally strangled by routing requests through an API gateway.

## 2.3 The Anti-Pattern Companies Live With: Distributed Monolith

Services that are separately deployed but share a database or have synchronous chains with no tolerance for partial failure. This is the most common real-world failure mode. Recognizing it is a senior-level differentiator.

# 3. Production Architecture Diagram

The following shows a representative production topology at a mid-to-large tech company:

```
CLIENT LAYER
  Web / Mobile / Third-Party Consumers
           |              |
  ┌────────▼──────────────▼────────┐
  │         API GATEWAY             │  ← Auth, Rate Limit, Routing
  │  (Kong / AWS API GW / Envoy)    │
  └──┬──────────┬──────────┬───────┘
     │          │          │
  ┌──▼──┐   ┌───▼───┐  ┌──▼──────┐
  │Order│   │Payment│  │ User    │   ← Domain Services
  │ Svc │   │  Svc  │  │ Profile │
  └──┬──┘   └───┬───┘  └──┬──────┘
     │  Service Mesh (Istio/Linkerd)
     │  mTLS + Circuit Breaker + Observability
  ┌──▼──────────▼──────────▼──────┐
  │        Event Bus (Kafka)        │  ← Async / Eventual Consistency
  └──┬──────────────────────────────┘
  ┌──▼──────────────┐  ┌───────────┐
  │  Notification   │  │ Analytics │  ← Consumers / Downstream
  │  Worker         │  │ Pipeline  │
  └─────────────────┘  └───────────┘
  ┌──────────────────────────────────┐
  │    PLATFORM LAYER                │
  │  Prometheus + Grafana + Jaeger   │  ← Observability
  │  Vault (Secrets) + ArgoCD (CD)   │
  │  Kubernetes (Orchestration)      │
  └──────────────────────────────────┘
```

# 4. Communication Patterns: What Actually Gets Used

| Pattern | Real-World Usage |
| --- | --- |
| Sync (gRPC) | Service-to-service within a domain (e.g., Order -> Inventory). Strongly typed protobuf contracts. Bi-directional streaming for live data. |
| Async (Kafka/SNS+SQS) | Cross-domain events (e.g., OrderPlaced event consumed by Payment, Notification, Analytics). Decouples services; enables fan-out. |
| REST/GraphQL at edge | External-facing API only. Internal services rarely use REST due to lack of streaming and higher latency overhead. |
| BFF (Backend for Frontend) | A dedicated aggregation layer per client type (mobile BFF, web BFF). Reduces over-fetching and encapsulates client-specific orchestration. |

## 4.1 Handling Distributed Transactions

Two-phase commit is almost never used in practice. Companies use one of:

- Saga Pattern (Choreography): Services publish events; each downstream service listens and reacts. Compensating transactions handle rollback. Preferred for long-running flows.
- Saga Pattern (Orchestration): A central saga orchestrator (often a workflow engine like Temporal or AWS Step Functions) drives the transaction. Preferred when visibility and control are required.
- Outbox Pattern: Write to local DB and an outbox table atomically; a relay process publishes to Kafka. Eliminates dual-write race conditions.

# 5. Data Management Patterns

## 5.1 Database Per Service

The canonical pattern — each service owns its data store. In practice, teams share RDS clusters (for cost) while maintaining schema isolation. True polyglot persistence (Postgres for OLTP, Redis for cache, Cassandra for time-series) is adopted selectively, not universally.

## 5.2 CQRS + Event Sourcing

Used in high-throughput domains (e.g., order history, audit logs). Commands mutate state; queries read from a separately maintained read model (materialized view). Event sourcing persists the full event log rather than current state — enables temporal queries and replay.

## 5.3 Read Replicas & Caching Hierarchy

- L1: In-process cache (Caffeine/Guava) — sub-millisecond, evicted on pod restart
- L2: Distributed cache (Redis/Memcached) — single-digit ms, shared across pods
- L3: DB read replicas — offloads analytics and reporting queries from primary

# 6. Service Mesh: What Companies Actually Deploy

Istio (with Envoy sidecars) dominates at large scale. Linkerd is preferred when operational simplicity matters more than feature breadth. Consul Connect is common in hybrid cloud/VM environments.

| Capability | Implementation Detail |
| --- | --- |
| Traffic Management | Canary releases, weighted routing (5% -> 50% -> 100%), circuit breaking, retry budgets with exponential backoff + jitter |
| Security | Mutual TLS between all services; SPIFFE/SPIRE for workload identity; automatic certificate rotation |
| Observability | Automatic telemetry: Prometheus metrics, distributed traces (Jaeger/Zipkin), access logs — zero code change required |
| Policy Enforcement | Rate limiting, quota enforcement, and AuthorizationPolicy at the mesh layer rather than in application code |

# 7. Deployment & Platform Patterns

## 7.1 Kubernetes at Scale

Every serious microservices shop runs on Kubernetes. Key patterns at senior level:

- Namespace-per-team isolation with RBAC and NetworkPolicy
- Horizontal Pod Autoscaler (HPA) on CPU + custom metrics (queue depth, RPS)
- Vertical Pod Autoscaler (VPA) for right-sizing; LimitRange to prevent noisy neighbors
- Pod Disruption Budgets (PDB) to maintain availability during rolling updates
- Cluster Autoscaler + Karpenter for node provisioning based on pending pod demand
## 7.2 CI/CD: GitOps Model

ArgoCD or Flux watches a Git repo. Manifests are the source of truth. Promotion from dev -> staging -> prod is a PR merge. Rollbacks are a git revert. This is the dominant model at companies beyond early startup stage.

## 7.3 Progressive Delivery

- Feature flags (LaunchDarkly / Unleash) decouple deploy from release
- Canary analysis: Flagger automated canary with Prometheus success-rate and latency gates
- Blue/green: Maintained for stateful services where canary is too complex

# 8. Observability: The Three Pillars

| Pillar | Production Implementation |
| --- | --- |
| Metrics (Prometheus/Grafana) | RED method: Rate, Errors, Duration per service. USE method: Utilization, Saturation, Errors for infra. Custom business metrics via instrumentation. |
| Tracing (Jaeger/Tempo) | Distributed trace propagation via W3C Trace Context headers. P99 latency attribution across service hops. Sampling: tail-based (Tempo) over head-based to capture anomalies. |
| Logging (ELK/Loki) | Structured JSON logs. Correlation ID injected at gateway and propagated in thread-local context. Log aggregation in Loki (push) or Elasticsearch (pull) for querying. |
| Alerting | SLO-based alerts (error budget burn rate) rather than static thresholds. Multi-window multi-burn-rate alerts per Google SRE book. |

**9. Theoretical Frameworks — Interview Talking Points**

## CAP Theorem

In a distributed microservices system, network partitions are unavoidable. The key design decision is the C vs A trade-off per service:

- CP services (Consistency + Partition Tolerance): Payment, Inventory. Use strong consistency reads, synchronous replication. Sacrifice availability during partition.
- AP services (Availability + Partition Tolerance): User sessions, recommendation feeds, notification delivery. Accept eventual consistency; stale reads tolerated.
- Interview insight: Identify which services are CP vs AP explicitly. Mixing them without isolation creates correctness bugs at partition boundaries.

## PACELC

PACELC extends CAP: when there is no partition (the normal case), you still face a Latency vs Consistency trade-off. This is the daily design tension in microservices:

- EL (Else Latency): Choose lower latency — serve reads from local cache or read replica. Accept stale data.
- EC (Else Consistency): Choose consistency — always read from primary. Accept higher latency tail (P99).
- Interview insight: PACELC explains why DynamoDB's eventual consistency mode (EL) outperforms strong consistency (EC) by 20-30% on read latency — the latency cost of consistency in a distributed system is real and measurable.

## Write Amplification

In microservices with event-driven architectures, a single user action can cascade into dozens of writes across services. This is write amplification at the application layer:

- An order creation event triggers writes in: Order DB, Outbox table, Kafka partition, Payment service DB, Inventory DB, Notification queue — 6+ writes for 1 user action.
- At the storage layer: Kafka log segments, Cassandra LSM compaction, and Redis AOF persistence all amplify further.
- Mitigation: Batch writes, idempotent consumers (dedup by event ID), and write coalescing in the outbox relay.

## Read/Write Trade-off Analysis

Microservices design decisions are fundamentally about skewing the system toward read optimization or write optimization based on access patterns:

- Write-heavy domains (telemetry, logging, order ingestion): LSM-tree stores (Cassandra, RocksDB), append-only event logs, async fan-out.
- Read-heavy domains (product catalog, user profile): CQRS read models, CDN-edge caching, denormalized projections, eventual consistency tolerated.
- Mixed workloads: Separate read and write paths explicitly (CQRS). Command handler writes to event store; projector builds read model asynchronously.

## Execution Trade-offs: Sync vs Async Fan-out

Synchronous orchestration is simpler to reason about but creates latency chains and failure cascades. Asynchronous choreography via events decouples services but introduces observability complexity (distributed traces across event boundaries).

- Fan-out cost: An event consumed by N services multiplies the write + processing cost by N. Use consumer group partitioning and parallel consumption to bound latency.
- Back-pressure: Async queues absorb traffic spikes. Sync chains amplify them. Prefer async for cross-domain calls that can tolerate eventual delivery.
- Recommendation: Sync within a domain (same bounded context, low-latency SLO). Async across domains (cross-context, tolerance for eventual consistency).

# 10. Decision Matrix: Real-World Trade-offs

| Decision | Option A | Option B | Production Choice |
| --- | --- | --- | --- |
| Intra-service comms | REST | gRPC | gRPC internally |
| Cross-domain events | Sync HTTP calls | Kafka events | Kafka (async) |
| Distributed txn | 2PC | Saga + Outbox | Saga + Outbox |

End of Document — System Design Interview Repository
