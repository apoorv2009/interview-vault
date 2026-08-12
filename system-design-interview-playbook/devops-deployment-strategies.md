# What Are the Different Deployment Strategies and When to Use Them?

*Tests knowledge of progressive delivery, risk management, and operational trade-offs in production deployments.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Overview

Deployment strategy is a risk management decision: how do you balance shipping speed against blast radius? The strategies range from "replace everything at once" (high risk) to "shift 1% of traffic for 24 hours" (minimal risk, slower).

```
Risk vs. Speed spectrum:
High Risk ←───────────────────────────────────────────────→ Low Risk
Recreate   Rolling   Blue-Green   Canary   Shadow   Feature Flags
Fast       Fast      Medium       Slow     Slowest   Any pace
```

---

## 2. Strategy 1: Recreate (Big Bang)

**What:** Shut down all instances of v1, deploy all instances of v2.

```
Before:  [v1][v1][v1][v1]  100% traffic → v1
          ↓ shutdown all
During:  [ ][ ][ ][ ]       DOWNTIME
          ↓ start all
After:   [v2][v2][v2][v2]  100% traffic → v2
```

**Trade-offs:**
- Pros: Simple. No version compatibility needed. Full resource available to v2 from start.
- Cons: **Guaranteed downtime.** Full blast radius — if v2 is broken, 100% of users are impacted immediately.

**Use when:** Dev/test/staging environments. Applications where downtime is acceptable (internal tools, maintenance windows). Stateful apps where running both versions simultaneously causes data corruption.

---

## 3. Strategy 2: Rolling Update

**What:** Replace instances one-by-one (or in batches) until all run v2. Default in Kubernetes.

```
Before:   [v1][v1][v1][v1]  100% → v1
Step 1:   [v2][v1][v1][v1]  25% → v2, 75% → v1
Step 2:   [v2][v2][v1][v1]  50% → v2, 50% → v1
Step 3:   [v2][v2][v2][v1]  75% → v2, 25% → v1
After:    [v2][v2][v2][v2]  100% → v2
```

```yaml
# Kubernetes rolling update config
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1       # at most 1 pod down at a time
    maxSurge: 1             # at most 1 extra pod above desired count
```

**Trade-offs:**
- Pros: No downtime. Gradual rollout. Built into Kubernetes, ECS, etc.
- Cons: **v1 and v2 run simultaneously** — API must be backward-compatible. Rollback requires a second rolling update (slow). Health check misconfiguration can silently roll broken code to all nodes.

**Use when:** Stateless services where v1 ↔ v2 API compatibility is guaranteed. Default for most web services. Works well when rollback speed isn't critical.

---

## 4. Strategy 3: Blue-Green Deployment

**What:** Run two identical production environments (blue = current, green = new). Cut over traffic instantly via load balancer switch.

```
Before:   LB → [blue: v1][v1][v1]    [green: idle]
Deploy:   LB → [blue: v1][v1][v1]    [green: v2][v2][v2] ← deploy + test
Cutover:  LB → [blue: v1][v1][v1]    [green: v2][v2][v2]
               (LB rule: all traffic → green)
Rollback: LB → [blue: v1][v1][v1] ← flip back instantly
               (LB rule: all traffic → blue)
```

**Trade-offs:**
- Pros: **Instant rollback** (flip LB rule). Zero downtime. No mixed-version traffic. Green can be fully tested before cutover.
- Cons: **Doubles infrastructure cost** during deployment. Database migrations that are not backward-compatible are dangerous (green uses a schema that blue doesn't understand). Not suitable for stateful apps without careful DB coordination.

**Use when:** Releases with complex changes where fast rollback is essential (payment systems, auth services). When you can afford 2x infra cost temporarily. Strongly preferred for compliance-sensitive deployments (banking, healthcare).

---

## 5. Strategy 4: Canary Deployment

**What:** Route a small percentage of real traffic to v2, monitor, gradually increase if healthy.

```
Phase 1: [v2: 1%]  + [v1: 99%]  → monitor error rates, latency, business metrics
Phase 2: [v2: 10%] + [v1: 90%]  → monitor for 30 min
Phase 3: [v2: 25%] + [v1: 75%]  → monitor
Phase 4: [v2: 100%]              → v1 decommissioned
```

```yaml
# Argo Rollouts canary example
strategy:
  canary:
    steps:
    - setWeight: 5
    - pause: {duration: 10m}
    - setWeight: 20
    - pause: {duration: 10m}
    - setWeight: 50
    - pause: {duration: 10m}
    - setWeight: 100
    analysis:
      metrics:
      - name: success-rate
        threshold: 95
        provider:
          prometheus:
            query: |
              rate(http_requests_total{status=~"5.."}[5m])
```

**Trade-offs:**
- Pros: **Real user traffic validates the release** — catches issues that staging misses. Small blast radius for initial failures. Supports automated rollback on SLO breach.
- Cons: v1 + v2 run simultaneously (same API compatibility requirement as rolling). Slow — a 24-hour canary before full rollout means slower releases. Requires robust observability to detect issues at low traffic percentages.

**Use when:** High-traffic user-facing services. Releases with behavioral changes that are hard to test in staging. Services with strong SLOs. Combined with **feature flags** for even finer control.

---

## 6. Strategy 5: Shadow Deployment (Dark Launch / Traffic Mirroring)

**What:** Route production traffic to v2 in parallel but discard v2's responses. v2 processes real traffic but never serves responses to users.

```
User Request → LB → v1 (serves response to user) ← normal
                ↳→ v2 (processes request, discards response) ← shadow
```

**Trade-offs:**
- Pros: Zero risk to users. Tests v2 under real production load. Uncovers performance and correctness issues before cutover.
- Cons: **2x infrastructure cost** continuously (not just during deploy). v2 side effects (DB writes, Kafka messages) must be carefully controlled — use a shadow database or dry-run mode. Very complex to implement correctly.

**Use when:** ML model evaluation (shadow-deploy new model, compare predictions offline). Performance testing a rewritten service under production load. High-stakes services (payment processing) where even 1% canary is too risky.

---

## 7. Strategy 6: Feature Flags (Feature Toggles)

**What:** Deploy code to production with the new feature disabled. Enable it independently via a configuration flag, per user/cohort/region.

```python
from launchdarkly_client import LDClient

client = LDClient(sdk_key)

def process_checkout(user: User, cart: Cart):
    if client.variation("new-checkout-flow", user.to_ld_context(), False):
        return new_checkout_flow(user, cart)  # v2 logic
    else:
        return old_checkout_flow(user, cart)  # v1 logic
```

**Feature flag rollout:**
```
Monday:    Enable for internal employees only (dogfooding)
Tuesday:   Enable for 1% of users (canary via flag)
Wednesday: Enable for 10% of users
Thursday:  Enable for all users
Friday:    Remove flag, delete old code path
```

**Trade-offs:**
- Pros: **Decouples deployment from release.** Instant rollback (flip flag, no redeploy). A/B testing built-in. Different rollout per segment (Beta users, geography, account tier).
- Cons: Technical debt — flag cleanup is often neglected. Dual code paths in production increase testing complexity. Flag evaluation adds latency (mitigated by local SDK caching).

**Use when:** Any significant feature launch. Continuous deployment pipelines. A/B testing new UX. Gradual migration of user segments to a new system.

---

## 8. Decision Framework

```
Is downtime acceptable?
  → Yes (dev/test, maintenance): Recreate
  → No: → Continue

Is rollback speed critical? (< 5 min)
  → Yes: Blue-Green or Feature Flags
  → No: → Continue

Do you need real production traffic validation?
  → No: Rolling update is sufficient
  → Yes: Canary or Shadow

Is the risk too high even for 1% of users?
  → Yes: Shadow deployment first
  → No: Canary

Is this a behavioral change (not infra change)?
  → Yes: Feature Flags (can deploy code today, release feature next week)
  → No: Blue-Green or Canary
```

---

## 9. Database Migration Strategy (The Hard Part)

Every deployment strategy except "replace everything" requires **v1 and v2 to coexist** — this means database schema must support both versions simultaneously.

**Expand-Contract migration (also called "parallel change"):**

```
Phase 1 — Expand (deploy with v1 still running):
  ALTER TABLE users ADD COLUMN phone_number_new VARCHAR(20);
  -- v1 ignores new column; v2 writes to both old and new

Phase 2 — Migrate (background job):
  UPDATE users SET phone_number_new = phone_number WHERE phone_number_new IS NULL;

Phase 3 — Switch (deploy v2 fully):
  -- v2 now reads from phone_number_new only

Phase 4 — Contract (cleanup):
  ALTER TABLE users DROP COLUMN phone_number;
  ALTER TABLE users RENAME COLUMN phone_number_new TO phone_number;
```

Never run a destructive schema migration (`DROP COLUMN`, `RENAME COLUMN`) while v1 is still reading that column. This is the most common source of deployment outages.

---

## 10. Theoretical Frameworks

### CAP Theorem

Blue-Green with instant cutover is a **CP** decision during the switch window — traffic stops going to v1 before v2 is fully ready, prioritizing consistency (no mixed-version responses) over availability (brief gap). Canary is **AP** — accepts that different users get different version responses (inconsistency) in favor of availability (no downtime, no cutover gap).

### PACELC — Latency vs Consistency

- **EL (Speed):** Rolling or Recreate — fastest deployment cycle, lowest operational overhead
- **EC (Consistency/Safety):** Blue-Green or Shadow — accept slower/more expensive deployments to guarantee rollback speed and minimize risk

The choice is a **release cadence vs. risk tolerance** trade-off, not a technical one.

### Write Amplification

Shadow deployments have structural write amplification: every write operation in the user's request is executed twice — once on v1 (real) and once on v2 (discarded). For write-heavy services, this doubles database load during shadow testing. Mitigation: shadow only read paths, or use a dedicated shadow database.

### Read/Write Trade-off

Feature flags are a **read-heavy optimization** for the deployment problem: every request reads the flag value, but writes (deployments, rollouts) are decoupled entirely. The flag evaluation is cached locally by the SDK (< 1ms), making the read cost negligible while giving unlimited write-side flexibility (enable/disable any time, no redeploy).

---

## 11. Comparison Table

| Strategy | Downtime | Rollback Speed | Blast Radius | Infra Cost | Use Case |
|---|---|---|---|---|---|
| Recreate | Yes | Redeploy = slow | 100% | 1x | Dev/test, maintenance |
| Rolling | No | Another rolling (slow) | Gradual | 1x + 1 pod | Standard stateless services |
| Blue-Green | No | **Instant** (LB flip) | 0% until cutover | **2x** | Compliance, payment, auth |
| Canary | No | Automated (fast) | 1% → progressive | 1x + 1% | High-traffic user-facing |
| Shadow | No | N/A (no user impact) | 0% | **2x** | ML models, perf testing |
| Feature Flags | No | **Instant** (flag flip) | Configurable | 1x | Any feature rollout |

---

## 12. Interview-Ready One-Liner

> "Choose by blast radius and rollback speed requirements: Recreate for dev/test (simple, downtime OK); Rolling for most stateless services (no downtime, low cost, gradual); Blue-Green when you need instant rollback and can afford 2x infra (payments, auth); Canary when you want real-traffic validation with a controlled blast radius; Shadow for zero-risk validation of critical rewrites; Feature Flags to completely decouple deployment from release and enable per-cohort rollout. The hardest part is always database migrations — use expand-contract to keep both versions schema-compatible simultaneously."
