# Project 2 — WARP: Retail Activation Platform Modernization (the TJX story)

> **What it is:** WARP (Wireless Activation Retail Platform) at AIS — a store-facing activation portal used by associates in a large US retailer's stores. Rehosted on-prem → Azure VMs, then modernised WebForms monolith → Angular + .NET Core services with **Strangler-Fig**.
> **Your role:** **Individual contributor (senior engineer).** Say **"I"** for the **Carrier Integration service** and the **Commissions & Reporting service**; say **"we"** for everything else.
> **How to say it:** anonymised — *"In one of my previous companies, I worked on a wireless activation platform used by store associates in a large US retailer's stores."* No client, retailer or product names. **No invented numbers** — results are qualitative.
> **Merged from:** `tjx-prep/retail-activation-modernization-story.md` (15 Strangler-Fig Q&As + follow-ups), `tjx-prep/tjx-azure-services-qa.md` (APIM, Service Bus, App Service, SQL scenarios), `tjx-prep/tjx-storeweb-prep.md` (bridge lines), TJX interview debrief notes.
> **Deep source:** [retail-activation-modernization-story.md](../tjx-prep/retail-activation-modernization-story.md) (diagrams) · [tjx-azure-services-qa.md](../tjx-prep/tjx-azure-services-qa.md)

## Table of Contents
- [0. Read before using — what is reconstructed](#0-read-before-using--what-is-reconstructed)
- [1. Project Summary — STAR](#1-project-summary--star)
- [2. System Architecture & Flow](#2-system-architecture--flow)
- [3. Design Patterns](#3-design-patterns)
- [4. Security](#4-security)
- [5. Observability & Resilience](#5-observability--resilience)
- [6. Testing & Quality](#6-testing--quality)
- [7. Deployment & DevOps](#7-deployment--devops)
- [8. Real-World Incident / Production Challenge](#8-real-world-incident--production-challenge)
- [9. TJX bridge + "what I'd do today"](#9-tjx-bridge--what-id-do-today)

---

## 0. Read before using — what is reconstructed

The vault story is a **reconstruction** that matches the real shape of the project (WebForms on-prem → Azure VMs → Angular + .NET Core on App Service with APIM, Service Bus, Azure SQL). Confirmed by you: Angular + .NET Core, App Service, Azure SQL, Service Bus, APIM; you owned **carrier integration APIs** and **reports/commissions**; flows = sell phone, activate SIM/device, port/upgrade, customer ID + pay, reports/commissions; integrations = carrier APIs, retailer POS/inventory, retailer SSO.

| Treat with care | Rule |
|---|---|
| Module order, Always On AG, log shipping, App Gateway as screen router, Cosmos audit, Redis, Event Grid for carrier files, Terraform | Realistic choices — **drop any you can't picture** |
| Incidents in §8 | **Claim only if something similar happened**; otherwise say "we designed for…" |
| Numbers, dates, names | **None.** "It was a few years ago, so I won't make up figures, but…" |
| AKS, OpenTelemetry, Bicep, Durable Functions | **Not claimed here** → use "today I'd…" or Capital Access |
| **Don't confuse with Wells Fargo (Wipro)** | The 500-app CDC/6Rs migration is a **different project** — keep it separate |

---

## 1. Project Summary — STAR

**Situation.** Store associates used the platform at the electronics counter to **sell a phone, activate a SIM/device on one of several carriers, port a number in, upgrade, capture customer ID, and take payment through the store POS**. Back office used it for **reports and associate commissions**. Peaks were extreme — Black Friday, holidays, flagship phone launches. The app was an **ASP.NET WebForms monolith on one shared SQL Server**, on-prem.

**Pain (symptom → root cause):**
- Slow screens on store networks → ViewState + full postback per wizard step.
- **Whole site slow when one carrier was slow** → synchronous carrier calls on IIS threads → **thread-pool starvation**.
- Month-end report timeouts → SSRS and commission queries blocking live activation tables.
- New carrier took months → carrier logic spread across pages, procs, if/else.
- Scary monthly night releases → one deployable, manual steps, no automated tests.

**Task.** Phase 1: get out of the datacenter fast. Phase 2: modernise without stopping stores. My part: build the **Carrier Integration** and **Commissions & Reporting** services.

**Action.**
- **Phase 1 — rehost** to Azure VMs (deadline + live retail system = rewrite too risky).
- **Phase 2 — Strangler-Fig** from three sides: **App Gateway** routed screens by path, **APIM** routed APIs, **branch by abstraction** inside the monolith.
- **Broke the shared DB** by an ownership matrix (**one writer per table**), extracting by risk: reporting → commissions (**outbox + parallel run**) → carriers → catalog (**reverse sync**) → inventory → activations (**CDC + per-store ring cutover**) → customer/KYC.
- **Carrier service:** adapter per carrier, **per-carrier queue as bulkhead**, timeouts, safe retries, **circuit breaker per carrier**, **idempotent request IDs**.

**Result (qualitative).**
- One carrier's problem **no longer affected the others** — calmer launch days.
- Activation flow **noticeably faster** — single-page wizard, small JSON calls, async port-ins.
- **Monthly night releases → small, frequent, per-service releases** with slot swaps.
- New carrier = **new adapter + config**. Month-end load off live activations. Monolith and shared DB **retired module by module**.

> **60-second pitch (say this):** "In one of my previous companies, I worked on a wireless activation platform used by store associates in a large US retailer's stores. We first rehosted it from an on-prem datacenter to Azure VMs because a deadline made a rewrite too risky. Then we modernised it from an ASP.NET WebForms monolith into Angular and .NET Core services using the Strangler-Fig pattern — App Gateway moved screens path by path, APIM moved APIs, and every switch was a routing rule or a flag, so rollback was a flip. I owned the carrier integration service and the commissions and reporting service. The big wins were that a slow carrier no longer took the whole site down, and releases went from monthly night deployments to small per-service releases."

---

## 2. System Architecture & Flow

**Target state (Phase 2):**
- **Retailer IdP federated with Azure AD** → Angular uses OIDC, APIs get OAuth2 JWTs → one sign-in for old and new.
- **App Gateway (WAF)** — strangler router for **screens**: `/app/*` → new SPA, everything else → legacy, **same domain** so cookies + SSO work across both.
- **APIM** — strangler router for **APIs**: JWT validation, rate limits, OpenAPI contracts, versions/revisions, per-route backend.
- **.NET Core APIs on App Service** (slots, autoscale): Catalog & Plans, Inventory, Customer/KYC, Activation, **Carrier Integration (mine)**, **Commissions & Reporting (mine)**.
- **Service Bus:** topic `activation-events` (subs: commissions, notifications, inventory, reporting) + **one queue per carrier**.
- **Functions:** port-in status checks (scheduled messages), notifications, carrier file parser (Event Grid BlobCreated), outbox relay.
- **Data:** Azure SQL per service (elastic pool), Redis for catalog, **Cosmos DB for carrier request/response audit** (PK = requestId, TTL), Blob for contracts/carrier files.
- **Payment stays in the store POS** — we keep only a payment reference (small PCI scope).

**Activation flow:** associate submits → Activation API → Carrier Integration API (idempotency check on RequestId) → **per-carrier queue** → carrier adapter (SOAP/REST) with timeout + breaker → result mapped to a standard error/success → `ActivationCompleted` on the topic → commissions, inventory, notifications react. **Port-ins** return **202 + RequestId**; a Function polls carrier status with backoff; UI polls `GET /requests/{id}`.

**Q: Why rehost first instead of refactoring?**
> "There was a datacenter deadline, and rewriting a live retail system under a deadline is the riskiest option. We rehosted to VMs — the app needed Windows Services, GAC libraries, machine certificates and local files, and the database used SQL Agent jobs, linked servers and SSRS. The developer work was the classic WebForms list: session out of memory, one shared machineKey, files off local disk, externalised config, store-local time, and getting carriers to allow-list our new static outbound IPs. Refactoring then happened in safe slices."

**Q: Why App Service and not AKS in Phase 2?**
> "Standard HTTP APIs and a small ops team. App Service gave slots, autoscale and TLS out of the box; AKS would have added cluster operations without a workload that needed it. That was an ADR-worthy decision, and it also kept us away from the second-system effect."

---

## 3. Design Patterns

| Pattern | Where | Trade-off |
|---|---|---|
| **Strangler-Fig** (edge + gateway routing) | App Gateway for screens, APIM for APIs | Two systems run for a while; routing must be config, not deploy |
| **Branch by abstraction** | `ICarrierGateway` inside the monolith, flag per carrier | Temporary indirection in legacy code |
| **Anti-corruption layer / adapter** | One adapter per carrier, carrier codes → standard codes | One more component per carrier |
| **Bulkhead** | Queue per carrier, concurrency = carrier rate limit | More queues to monitor |
| **Circuit breaker + timeout + safe retry** | Per carrier | Must classify which ops are safe to retry |
| **Idempotency key** | RequestId created on first submit | Store request + outcome |
| **Async request-reply** | Port-ins: 202 + status polling | UI must handle pending state |
| **Transactional outbox** | Legacy `CompleteActivation` proc writes outbox row in the same transaction | At-least-once → idempotent consumers |
| **CDC + reverse sync + reconciliation** | Activations cutover | Lag, loop prevention, retention alerts |
| **Database per service / one writer per table** | All new services | No cross-domain joins → APIs or event-fed local copies |
| **Expand/contract** | Schema changes | Two-step migrations |

**Q: How do you find seams in a tightly coupled monolith?**
> "Three places. In code — every carrier call ended as an outbound request, so we wrapped them all behind one interface: our first seam. In data — we mapped who writes and who reads each table, using code search plus production tracing; single-writer tables were natural boundaries. In flows — reports and commissions only read activation data after the fact, so they could be separated by events instead of joins. If there's no seam, you create one first with branch by abstraction."

**Q: Why outbox instead of writing the DB and Service Bus directly?**
> "There's no shared transaction between them, so a crash in between loses an event or sends a phantom one. The legacy activation-complete procedure wrote the business change and an outbox row in one transaction; a relay published `ActivationCompleted` and marked it sent. That's at-least-once, so the commissions consumer was idempotent on ActivationId plus CommissionType."

**Q: What did you extract first, and why?**
> "Low risk, high value, easy to verify. Reporting first — read-only, moved to the readable secondary, month-end pain gone. Commissions next — clear boundary and easy to prove because money totals must match. Carrier integration for the biggest reliability gain. The core activation flow last, once routing, sync and rollback were proven on safer modules."

---

## 4. Security

- **Identity:** retailer IdP **federated with Azure AD**; SPA uses OIDC; APIs use OAuth2 JWTs with roles.
- **Validation twice:** APIM validates JWT (issuer, audience, expiry, roles); **services validate again** (defence in depth).
- **Service-to-service:** **managed identities**; carrier credentials and client certificates in **Key Vault**.
- **PII:** **Always Encrypted** columns for customer ID data; **masked** in logs and in the Cosmos carrier audit; role-restricted access.
- **PCI scope kept small:** card payment stays **inside the store POS**; we store a **payment reference** only.
- **Network:** POS reachable over **site-to-site VPN**; **static outbound IPs** allow-listed by every carrier.
- **Threat model (STRIDE-style)** per new service: spoofed store/associate, tampered activation requests, PII leaking into logs.

**Q: How did you keep PCI and PII risk low while modernising?**
> "We didn't bring card data into our scope at all — payment stayed in the store POS and we kept only a reference. Customer ID data lived in one service with Always Encrypted columns, and we masked it in logs and in the carrier audit store. Each new service got a short threat model before it went live — spoofed associates, tampered requests, PII in logs."

---

## 5. Observability & Resilience

**Observability**
- **One correlation ID** gateway → APIM → APIs → Service Bus message properties → Functions → carrier audit — **also added to legacy**, so old and new paths trace together.
- App Insights per service → one **Log Analytics** workspace; **KQL dashboards**: activation success rate **per carrier**, p95 activation time, queue depth **+ oldest message age** per carrier queue, DLQ counts, circuit-breaker state.
- **Alerts on business signals:** "carrier X success rate below normal for 10 min", "messages waiting > N min".

**Resilience**
- Per-carrier **bulkhead queues**, **timeouts**, **retries with backoff + jitter for safe ops only**, **circuit breaker per carrier** → fail fast with `CarrierUnavailable`.
- **Idempotent RequestId** → no double activations on retry.
- **Peak readiness:** load test at a multiple of forecast peak, **pre-scale** App Service and Function plans the day before, change freeze, **war-room dashboard** on launch day.

**Q: A carrier is down on launch day — what happens?**
> "Its circuit breaker opens, so that carrier fails fast with a clear message for the associate. Its queue holds requests within limits, other carriers keep working, and the dashboard shows that carrier's success rate dropping before stores call us."

**Q: 500,000 messages backed up on Black Friday — what do you do?**
> "First, are consumers failing or just slow — compare incoming vs completed and check the dead-letter count. Then find the real bottleneck — usually the database or the external carrier, where more consumers make it worse. Scale consumers if they're the limit; otherwise cap concurrency, protect the downstream and let the queue absorb. Critical flows first. Afterwards, alert on message age, not just queue length."

---

## 6. Testing & Quality

- **Characterisation / golden-master tests** before moving logic: replayed real historical activations through legacy commission logic and saved outputs; the new service had to match. Any difference = deliberate business decision.
- **Contract tests per carrier adapter** using **recorded carrier request/response pairs**.
- **New services:** normal pyramid — many unit tests on domain logic (commission rules, error mapping), contract tests for adapters and APIs, a thin layer of E2E on critical journeys.
- **Integration** in carrier sandbox environments; POS test transaction over VPN.
- **Load tests** before peak season.
- **Parallel run + reconciliation** = the final characterisation test at production scale (two commission cycles).
- **Walking skeleton → shadow traffic → one carrier → ramp** for every new service.

**Q: Integration/acceptance tests or unit tests during a migration?**
> "Both, at different moments. Before extraction, high-level tests matter more — legacy code isn't unit-testable and what we protect is behaviour: end-to-end activation flows, golden-master comparisons, contract tests at the boundaries. Inside new services, a normal pyramid. Contract tests are the key layer because they prove old and new honour the same interface."

**Q: How did you prove the new commissions matched the old?**
> "Two full commission cycles in parallel — legacy batch and new service both calculated, with reconciliation per store, per associate, per day. Differences were investigated — cancellations inside the grace period, plan changes. We switched the legacy batch off only after two clean cycles."

---

## 7. Deployment & DevOps

- **Azure DevOps YAML pipelines** — build once, same package dev → QA → UAT → prod.
- **App Service slots + swap** → zero downtime, instant rollback.
- **IaC:** ARM templates → **Terraform modules per service** *(verify)*.
- **Trunk-based development**, short-lived branches; unfinished work shipped **dark behind flags** (per carrier, per store). Deploy ≠ release.
- **DB changes:** versioned migrations, **expand/contract**.
- **Cutover safety:** every switch = **routing rule or flag**; rollback triggers written in the runbook and **rehearsed**.
- **Store-ring rollout** for the activation write path: **pilot stores → one region → all**.

**Q: If the new service fails in production, how do you fall back?**
> "Every cutover had a minutes-long rollback, not a redeploy. APIs: switch the APIM backend back. Screens: switch the App Gateway path rule back. Carriers: turn off that carrier's flag. Activations: flip the store's flag back — legacy was still current because reverse sync kept it up to date. Idempotent request IDs meant retries during rollback didn't double-activate."

**Q: How do you deploy a service before it has business logic?**
> "A walking skeleton: health endpoint and one trivial operation, deployed through the real pipeline with slots, real Key Vault, managed identity, App Insights and correlation ID, registered in APIM with no traffic. That proves pipeline, network, identity and monitoring early. Then shadow traffic — compare results, still serve legacy — then one real carrier, then ramp."

---

## 8. Real-World Incident / Production Challenge

> ⚠️ **Only claim these if something similar really happened.** Otherwise present as *"what we designed for"*.

### Primary — A slow carrier slowed the whole site on a phone-launch day

| Step | Detail |
|---|---|
| **Symptom** | On a launch day, activations for **every** carrier slowed; associates saw spinners and timeouts. |
| **Troubleshoot** | Requests piling up on the web tier; one carrier's response time had gone from seconds to **~30 s**. |
| **Root cause** | Carrier calls were **synchronous on IIS request threads with long timeouts** → threads held → **thread-pool starvation** → healthy carriers queued behind the slow one. |
| **Permanent fix** | The new Carrier Integration service: **queue per carrier (bulkhead)** with concurrency = carrier rate limit, per-carrier **timeouts**, **circuit breaker** (fail fast with `CarrierUnavailable`), retries only for safe ops, async **202 + polling** for port-ins. |
| **Prevent** | KQL dashboard of success rate + oldest message age **per carrier**; alert on "carrier X below normal for 10 min". |
| **Result** | At later peaks a slow carrier affected **only its own** activations. |

> **Say this:** "Before the carrier service existed, one carrier slowed from seconds to about thirty seconds on a phone-launch day, and the whole site slowed for every carrier. The cause was synchronous carrier calls holding IIS threads — thread-pool starvation. That incident shaped the carrier service I built: a queue per carrier as a bulkhead, with concurrency set to that carrier's rate limit, per-carrier timeouts and circuit breakers, and retries only for safe operations. After that, a slow carrier only affected its own activations, and we saw it on the dashboard before stores called."

### Backup — Duplicate commissions during the parallel run
- **Detect:** **reconciliation** (legacy vs new, per store/associate/day) showed extra commission rows.
- **Root cause:** a handler ran longer than the Service Bus **lock duration** → message redelivered → processed twice.
- **Fix:** **idempotent upsert** with unique key (ActivationId, CommissionType) + **lock renewal**.
- **Lesson:** "assume every message arrives twice" — and reconciliation is what proves a sync instead of trusting it.

### Also ready — Store-day boundaries after moving to UTC
Late-evening activations landed on the **next day's** commissions because Azure VMs run in UTC. Fix: **explicit store time zones** in all day-based logic.

---

## 9. TJX bridge + "what I'd do today"

**Bridge (say this):** "StoreWeb has the same shape — store associates, a legacy monolith, a shared database, peak events. I'd run the same playbook: rehost or replatform where it buys time, APIM and path routing as the strangler routers, extract domains by risk with outbox and CDC plus reconciliation and ring-based store cutovers, and resilience, idempotency and telemetry by default."

**Today I'd add:** OpenTelemetry end to end · SLOs with error budgets per critical flow · Bicep modules and service templates · ADRs and threat models per service · Durable Functions for port-ins · **offline-first store behaviour**.

**Known gap — be honest:** *"Store keeps selling during a 2-hour outage?"* → "I haven't built a retail edge myself, but I'd treat the store as an edge node: local DB with price file and stock, a **store-and-forward outbox** with idempotent transaction IDs, sync in order on reconnect, conflict rules (store sales always count; HQ prices win by version), and APIM's **self-hosted gateway** for local routing. It's the same outbox + idempotency + versioning pattern, moved into the store."

**TJX-interview lessons (from the debrief):** don't call your projects "monolithic" or "mostly lift-and-shift" if the resume says Strangler-Fig/CDC; **diagnose before prescribing** (a 0.3% data drift → check reconciliation and the write paths first, *then* talk CDC); have a strong **API contract governance** answer ready (OpenAPI in repo + CI schema diff + consumer contract tests + v2 beside v1).
