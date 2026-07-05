# System Design Concepts — Availability

*Last updated: July 2026*

---

## Table of Contents

1. [What is Availability?](#what-is-availability)
2. [The Nines — Complete Reference Table](#the-nines--complete-reference-table)
3. [What Causes Downtime?](#what-causes-downtime)
4. [How to Achieve Each Tier](#how-to-achieve-each-tier)
5. [Key Terms](#key-terms)

---

## What is Availability?

Availability is percentage of time system is operational and able to serve requests.

**Availability = Uptime / (Uptime + Downtime)**

Goal is never 100% — physically impossible. Goal is close enough that downtime is acceptable for the business.

---

## The Nines — Complete Reference Table

| Availability | Downtime/Year | Downtime/Month | Infrastructure | Data Replication | Deployment | On-Call |
|---|---|---|---|---|---|---|
| **99%** | 3.6 days | ~7 hours | Single instance or minimal redundancy. No standby. One fails → full outage until manual fix. | No replication. Single DB. Data loss if DB dies. | Big-bang deploys. Downtime acceptable. MTTR: hours. | Not required. Manual fix when issue reported. |
| **99.9%** | 8.7 hours | 43 minutes | 2 instances (1 region, multi-AZ). Standby idle. Failover 30–60 sec. | Async. Primary + 1 standby. RTO: 30–120 sec. RPO: lose 5–10 min. | Rolling deploys. MTTR: 15–20 min. | Business hours. 15–20 min response. |
| **99.99%** | 52 minutes | 4 minutes | 2+ active instances (1 region). Both serving. Failover <10 sec. | Sync. Primary + 1 replica. RTO: 5 min. RPO: zero loss. Auto-failover. | Blue-green. MTTR: 2–5 min. Zero downtime. | 24/7. <5 min response. |
| **99.999%** | 5.26 minutes | 26 seconds | 3+ active (2–3 regions). All serving. DNS reroutes 30–60 sec. | Fully sync (all regions). RTO: <30 sec. RPO: zero everywhere. Multi-region failover. | Continuous + canary. MTTR: <5 sec. Feature flags. | 24/7/365 + backup. <1 min response. |

---

## What Causes Downtime?

1. **Hardware failures** — Server crashes, power loss, disk dies. *Prevention: redundant instances.*
2. **Bad deployments** — Buggy code pushed → app crashes. *Prevention: blue-green, canary, rollback.*
3. **Database problems** — Replication lag, corruption, migration failure. *Prevention: sync replication, auto-failover.*
4. **Network failures** — Link cut, DNS down. *Prevention: multi-region, auto-reroute.*
5. **Cascading failures** — Service A slow → B waits → B dies → C dies. *Prevention: circuit breaker, timeout, bulkhead.*
6. **Resource exhaustion** — Out of memory, disk full, CPU maxed. *Prevention: monitoring, auto-scaling.*
7. **External dependency failures** — Third-party API down. *Prevention: timeout, circuit breaker.*
8. **Human error** — Operator deletes DB, misconfigures. *Prevention: automation, runbooks, staging.*

---

## How to Achieve Each Tier

**99%**: Single or minimal redundancy. Manual recovery. Downtime acceptable.

**99.9%**: 2 instances in multi-AZ. Async replication. Rolling deploys. 15–20 min recovery. Business hours support.

**99.99%**: 2+ active instances, sync replication, blue-green deploys, 2–5 min recovery. 24/7 on-call.

**99.999%**: 3+ active regions, fully sync replication, continuous deployment, <5 sec recovery. 24/7/365 on-call with <1 min response.

---

## Key Terms

- **AZ (Availability Zone)**: Different physical building in same region. Protects against single-building failure.
- **RTO (Recovery Time Objective)**: Max time acceptable to recover from failure.
- **RPO (Recovery Point Objective)**: Max data loss acceptable. How far back can you lose?
- **MTTR (Mean Time To Recovery)**: Actual average time to restore service after failure.
- **Sync replication**: Wait for all replicas to confirm before acking write. Zero data loss. Slower writes.
- **Async replication**: Ack immediately, replicate in background. Fast writes. Risk: data loss on failover.
