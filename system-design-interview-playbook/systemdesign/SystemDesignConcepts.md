# System Design Concepts

*Last updated: July 2026*

---

## Table of Contents

1. [Availability](#1-availability)

---

## 1. Availability

### What is Availability?

Availability is percentage of time system is operational and able to serve requests.

**Availability = Uptime / (Uptime + Downtime)**

Goal is never 100% — physically impossible. Goal is close enough that downtime is acceptable for the business.

---

### The Nines

| Tier | Availability | Downtime / year | Downtime / month |
|------|-------------|-----------------|------------------|
| Two nines | 99% | ~3.6 days | ~7 hours |
| Three nines | 99.9% | ~8.7 hours | ~43 minutes |
| Four nines | 99.99% | ~52 minutes | ~4 minutes |
| Five nines | 99.999% | ~5.26 minutes | ~26 seconds |

Most production SaaS targets **99.9% to 99.99%**. Five nines reserved for air traffic control, financial settlement. Going from three nines to four nines is not twice as hard — order of magnitude harder and costlier.

> Capital Access is not five nines. Investor relations data unavailable for 4 minutes a month is acceptable. Trading system down 4 minutes can cost millions — that warrants five nines.

---

### Availability Compounds — The Trap

Multiple services in chain? Multiply their availabilities.

Three services each at 99.9% = 99.9% × 99.9% × 99.9% = **99.7%**

Down almost 3× more than each individual service. More dependencies → lower overall availability. Design matters.

---

### SLI / SLO / SLA

| Term | Meaning | Example |
|------|---------|---------|
| **SLI** (Indicator) | Actual measured metric | "Our p99 latency is 120ms. Error rate 0.05%." |
| **SLO** (Objective) | Internal target team owns | "We want 99.9% uptime." Not a contract. |
| **SLA** (Agreement) | Contract with customer. Breach → penalty/refund | Always weaker than SLO — buffer between them. |

---

### How to Achieve High Availability

**Layer 1 — Eliminate single points of failure**

Every component with one instance is a single point of failure. Run minimum two instances of everything critical: app servers, load balancers, DB nodes, cache, message broker, DNS. Map architecture, circle everything with one instance — each circle is a risk.

**Layer 2 — Active-Active vs Active-Passive**

- **Active-Passive**: one node serves, standby waits. Failover takes 30–120 seconds. At five nines, 120 seconds = 4% of annual budget gone in one failover.
- **Active-Active**: both nodes serve traffic simultaneously. One dies → load balancer reroutes in under a second. No promotion delay.

Stateless services: active-active trivial. Databases: multi-master or synchronous replication with automatic failover (Azure SQL Hyperscale, Cosmos DB multi-region write).

**Layer 3 — Multi-AZ mandatory, Multi-Region for five nines**

- **Multi-AZ**: replicas in different physical buildings, same region. Protects against single building failure.
- **Multi-Region**: replicas in different geographic regions. Azure Traffic Manager detects region failure, reroutes DNS in 30–60 seconds. Cosmos DB does this natively.

Five nines requires multi-region. Multi-AZ alone not enough.

**Layer 4 — Zero-downtime deployments**

Deployments are planned downtime. Eliminate them:

- **Rolling deploy**: replace instances one at a time. No downtime but brief version mismatch in flight.
- **Blue-green**: two identical environments. Deploy to idle one, test, flip load balancer in one second. Rollback = flip back.
- **Canary**: route 1–5% traffic to new version. Watch error rates. Problem → kill canary, 95% of users never saw it.
- **Feature flags**: ship code dark, enable per tenant. Decouple deploy from release.

**Layer 5 — Failure isolation (Bulkhead + Circuit Breaker)**

*Bulkhead*: separate thread pools per downstream service. Report service misbehaves → exhausts its 10 threads → dashboard threads unaffected on their 50. One compartment floods, others stay dry.

*Circuit Breaker* — three states:
- **Closed** (normal): calls pass through
- **Open** (failure detected): calls fail immediately, no attempt. Fail fast.
- **Half-open** (probe): after timeout, let one call through. Succeeds → close. Fails → open again.

Without circuit breaker: Service A waits on slow Service B → A's threads pile up → A runs out of threads → A goes down → cascades to everything. Fail fast beats fail slow.

Timeout on every network call. No timeout = thread waits forever = thread pool exhausted = outage.

**Layer 6 — Health checks + auto-healing**

System must self-detect failure, self-recover, not wait for human.

- **Liveness probe**: is process alive? Fail → kill container, restart.
- **Readiness probe**: is service ready to serve? Fail → remove from load balancer rotation, keep alive.

Kubernetes does both natively. Auto-restart on crash. HPA auto-scales on CPU/memory/custom metrics.

**Layer 7 — Data durability**

- **Synchronous replication**: primary waits for replica to confirm write before ack to client. Zero data loss. Adds ~5ms latency per write.
- **Asynchronous replication**: primary acks immediately, replicates in background. Fast. Risk: failover loses last few seconds of writes (RPO > 0).

Five nines requires synchronous replication for writes. Accept the latency cost.

**Layer 8 — Observability + SLO alerting**

Can't protect budget you can't see.

Track SLI in real time: error rate, p99 latency, uptime per service. Alert at 50% of error budget consumed — not at 100%. By 100%, SLO already breached.

Error budget = (1 − availability target) × time period.
Five nines over 30 days = 26 seconds budget. Alert fires when 13 seconds downtime consumed in a month.

---

### Designing for Five Nines — Checklist

| Requirement | What to do |
|-------------|-----------|
| No SPOF | Min 2 instances of every component |
| Fast failover | Active-Active, not Active-Passive |
| Infra failure | Multi-AZ (building) + Multi-Region (geographic) |
| Deployments | Blue-green or canary, never big-bang |
| Cascade prevention | Circuit breaker + bulkhead + timeouts on every call |
| Self-healing | Liveness + readiness probes, HPA |
| Data safety | Synchronous replication |
| Budget tracking | SLI dashboards, alert at 50% error budget consumed |

---

### Availability vs Consistency Trade-off (CAP Theorem)

Highly available system may serve slightly stale data during partition. CQRS with eventually consistent read model is concrete example: trade few hundred milliseconds of consistency for read side always available regardless of write side state.

---

### Honest Cost Reality

Five nines requires: multi-region active-active, synchronous replication, blue-green deploys, full circuit breaker mesh, 24/7 on-call with sub-5-minute response. Costs 3–5× more than three nines infra.

**Right interview answer**: "Five nines is a cost decision, not just a tech decision. I'd push back and ask what downtime actually costs the business per minute. Then pick cheapest architecture that keeps us inside that budget."

---
