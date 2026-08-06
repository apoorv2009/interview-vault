# A User Places an Insurance Order — Can I Call Multiple Downstream Services Directly Now?

*Asked in top SEA Bank interviews. Tests understanding of orchestration vs choreography, distributed transactions, and fan-out anti-patterns.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Direct Answer: No — Not From the Originating Service

The service that receives the insurance order should **not** fan out and call Underwriting, Payment, Policy Issuance, and Notification directly and synchronously in its own request thread. That creates a **distributed monolith** disguised as microservices.

---

## 2. Why Direct Synchronous Fan-Out Is an Anti-Pattern

| Problem | What Happens | Why It's Worse Than It Looks |
|---|---|---|
| **Cascading failure** | If Payment Service is slow, the Order Service thread blocks, exhausting its own thread pool | Circuit breaker helps but doesn't remove root coupling |
| **No atomicity** | Order succeeds, Underwriting fails halfway — no rollback mechanism across 3+ independent calls | Compensation logic belongs in a saga, not ad-hoc try/catch |
| **Tight coupling** | Order Service must know every downstream service's API contract and availability | Violates SRP; downstream additions require Order Service redeploys |
| **Latency stacking** | Sequential: 50ms + 80ms + 120ms + 40ms = 290ms minimum, before business logic | Parallelising helps latency but worsens partial-failure complexity |
| **Security surface** | Order Service needs credentials/network access to every downstream system | Expands blast radius of a single service compromise |

---

## 3. The Correct Pattern: Decouple via Orchestration or Choreography

### 3.1 Orchestration — Saga Orchestrator (Preferred for Insurance/Banking)

A dedicated orchestrator (e.g. **Temporal**, **Camunda**, **AWS Step Functions**) owns the multi-step flow. The Order Service does ONE thing: persist the order and emit a single `OrderPlaced` event or call the orchestrator. The orchestrator sequences calls to Underwriting → Payment → Policy Issuance, handling retries and compensations centrally.

- **Best when:** You need visibility into flow state, explicit compensation, and step-by-step retry policies — common in regulated domains like insurance/banking.
- **Trade-off:** Orchestrator becomes a critical dependency; must be highly available and independently scaled.

### 3.2 Choreography — Event-Driven

Order Service publishes a single `OrderPlaced` event to Kafka/SNS. Underwriting, Payment, and Notification services independently subscribe and react, each publishing their own completion/failure events. No central coordinator.

- **Best when:** Steps are loosely related and don't require strict sequencing or centralised visibility.
- **Trade-off:** Harder to trace overall flow state; requires correlation IDs and distributed tracing to debug.

### 3.3 Industry Practice in Regulated Domains

**Orchestration is strongly preferred for insurance order flows** because regulators require auditable, replayable state transitions (underwriting decision → premium calculation → policy binding → payment capture). A workflow engine gives you a durable execution log for free.

---

## 4. Architecture Diagram

```
  ┌─────────────┐
  │   Client    │
  └──────┬──────┘
         │ POST /orders
  ┌──────▼────────────────┐
  │   API Gateway / BFF    │
  └──────┬────────────────┘
         │
  ┌──────▼────────────────────────────┐
  │   Order Service                    │  ← Persists order + writes Outbox
  │   (writes to own DB + Outbox)      │
  └──────┬────────────────────────────┘
         │ OrderPlaced event (Kafka, via Outbox relay)
  ┌──────▼────────────────────────────────┐
  │   Saga Orchestrator                    │  ← Owns workflow state
  │   (Temporal / AWS Step Functions)      │
  └──┬──────────┬──────────┬───────────────┘
     │           │          │
  ┌──▼──────┐ ┌──▼──────┐ ┌─▼─────────┐
  │Underwrit│ │ Payment │ │  Policy   │
  │ing Svc  │ │ Svc     │ │  Issuance │
  └──┬──────┘ └──┬──────┘ └─┬─────────┘
     │  success/failure events back to orchestrator
     └───────────┴────────────┘

  On failure → Orchestrator runs compensating transactions:
    Refund payment → cancel policy binding → mark order failed
```

---

## 5. Compensating Transactions on Failure

If Payment succeeds but Policy Issuance fails, the orchestrator runs compensations in reverse order:

1. **Refund payment** — call Payment Service's idempotent refund API
2. **Cancel underwriting reservation** — release the underwriting slot
3. **Mark order as `underwriting_rejected`** — notify customer

**Idempotency is mandatory:** every downstream call carries an idempotency key (`order_id + step`) so retries from the orchestrator never double-charge or double-issue a policy.

---

## 6. Outbox Pattern — Guaranteeing Exactly-Once Event Delivery

Order Service must not do a dual write (DB + Kafka directly — risks message loss on crash between the two writes).

```
BEGIN TRANSACTION;
  INSERT INTO orders (id, status, ...) VALUES (...);
  INSERT INTO outbox  (event_type, payload, status) VALUES ('OrderPlaced', {...}, 'pending');
COMMIT;

-- Separate outbox relay process:
SELECT * FROM outbox WHERE status = 'pending' LIMIT 100;
-- publish each to Kafka, mark as 'published'
```

---

## 7. Theoretical Frameworks

### CAP Theorem

The insurance order flow spans multiple services with independent databases. During a partition between orchestrator and Payment Service:

- **CP choice (payment step):** Block until Payment confirms. No inconsistent state, but user waits or order fails. Standard for the payment-capture step.
- **AP choice (status display):** Accept order as `pending_payment` and resolve asynchronously. Better availability; user sees intermediate state. Common for underwriting-pending statuses.

### PACELC

Even without a partition, synchronous step confirmation is a **Latency vs Consistency** trade-off:

- **EC (Else Consistency):** Orchestrator waits for each step to confirm before proceeding. Strong consistency on order state; 300–500ms total latency per flow.
- **EL (Else Latency):** Choreography with async event propagation. Faster client response (order accepted immediately); true policy-active state lags by the slowest consumer.

### Write Amplification

One insurance order triggers writes across: Order DB, Outbox table, Kafka log, Orchestrator state store (Temporal history), Underwriting DB, Payment DB, Policy DB, Notification queue — **8+ writes per user action**.

Mitigation: batch non-critical writes (notification, analytics) via async consumers; keep the orchestrator's critical-path writes minimal and idempotent.

### Read/Write Trade-off

Order status queries (read-heavy — customer checking "where is my policy?") should **not** hit the orchestrator's live execution engine:

- Maintain a **denormalized read model** (CQRS) updated by orchestrator state-change events, queried independently with no impact on the write/orchestration path.

### Sync vs Async Fan-Out — The Core Insight

| Path | Execution Model | Why |
|---|---|---|
| Client → Order Service | **Synchronous** | Fast ack, < 100ms |
| Order Service → Downstream | **Asynchronous** (orchestrator-driven) | Decoupled, compensable, auditable |
| Customer status check | **Read model** (CQRS projection) | Non-blocking, independent scale |

**Never synchronous fan-out from the originating service** — this is the core anti-pattern the interviewer is probing for.

---

## 8. Interview-Ready Summary

| Wrong Answer | Right Answer |
|---|---|
| "Yes, call Underwriting, Payment, and Policy Issuance directly from Order Service in sequence" | "No. Order Service persists + emits one event via the Outbox pattern. A Saga orchestrator (Temporal/Step Functions) drives downstream calls with compensation logic and idempotency keys. The client gets a 202 Accepted and polls or receives a webhook on policy issuance." |
