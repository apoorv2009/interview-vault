# Project 4 — BDC → Capital Access: Full Migration Story (S&P Global)

> **What it is:** the move of Investor Relations clients from **BDC**, the legacy monolithic IR platform on one big database, to **Capital Access**, the multi-tenant .NET microservices SaaS on Azure.
> **Your role:** **Application Architect.** Owned **6 microservices — Ownership, Profiles, Targeting, Contacts, Notifications, Reporting** — and the **client migration workstream** (a task, not a service). Joined **Dec 2024**, when the rebuild was mostly done and both platforms were running side by side.
> **Say "we" / another team for:** the original decomposition of BDC (before you joined), the **content team's data feeds**, and **Okta user provisioning** (platform team).
> **Persona:** Architect track only. S&P is **past tense** (left Jun 2026). Main project doc: [01-capital-access.md](01-capital-access.md). Same-shape retail story: [02-warp-retail-modernization-tjx.md](02-warp-retail-modernization-tjx.md).

> ⚠️ **What is reconstructed:** the Capital Access architecture (§3–4, §7–8) matches your confirmed notes. **BDC's internals (§1) are a reconstruction** of a typical legacy IR monolith on one database — keep what matches, drop what you can't picture. Anything marked *(verify)* needs your confirmation.

## Table of Contents
- [0. Context in one paragraph](#0-context-in-one-paragraph)
- [1. Starting point — the old BDC architecture (reconstructed)](#1-starting-point--the-old-bdc-architecture-reconstructed)
- [2. Why modernise, and why this way](#2-why-modernise-and-why-this-way)
- [3. Target architecture — Capital Access](#3-target-architecture--capital-access)
  - [3.1 Edge and front end](#31-edge-and-front-end)
  - [3.2 Identity — Okta OIDC](#32-identity--okta-oidc)
  - [3.3 Gateway — APIM](#33-gateway--apim)
  - [3.4 The six services I owned](#34-the-six-services-i-owned)
  - [3.5 Data from the content team](#35-data-from-the-content-team)
  - [3.6 Security and tenant isolation](#36-security-and-tenant-isolation)
  - [3.7 Resilience](#37-resilience)
  - [3.8 Observability](#38-observability)
  - [3.9 Delivery](#39-delivery)
- [4. Key flows end to end](#4-key-flows-end-to-end)
- [5. Coexistence — BDC and Capital Access side by side](#5-coexistence--bdc-and-capital-access-side-by-side)
- [6. Client migration — my workstream in detail](#6-client-migration--my-workstream-in-detail)
- [7. Breaking up the big database](#7-breaking-up-the-big-database)
- [8. Incidents (real ones)](#8-incidents-real-ones)
- [9. Results](#9-results)
- [10. Deep-dive questions](#10-deep-dive-questions)
- [11. Still to verify](#11-still-to-verify)

---

## 0. Context in one paragraph

Capital Access was S&P Global's SaaS platform for **Investor Relations teams at more than 7,500 public companies**. An IR officer uses it to see **who owns their stock** and how that changed this quarter, **which institutional investors to target** next, their **contacts and meetings** with investors, **alerts** when a big holder buys or sells, and **board-level reports**. It replaced **BDC**, the older platform — one large monolith on one large database. When I joined in **Dec 2024**, the rebuild was mostly done and the two were running side by side: clients moving over in batches, features moving one by one, and the content team's data feeding both. As Application Architect I owned six microservices — **Ownership, Profiles, Targeting, Contacts, Notifications, Reporting** — and the **client migration workstream**.

> **Answer to say:** "At S&P Global I worked on Capital Access, the SaaS platform for investor-relations teams, which replaced an older monolith called BDC. Most of the rebuild was done before I joined, so I came in during the coexistence phase. As Application Architect I owned six of the microservices — Ownership, Profiles, Targeting, Contacts, Notifications and Reporting — and the client migration itself: moving client companies from BDC to Capital Access in batches, with a per-client login switch so any client could be rolled back on its own."

---

## 1. Starting point — the old BDC architecture (reconstructed)

```
IR user (browser, at client company)
        │
        ▼
  Load balancer (sticky sessions)
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  BDC WEB APPLICATION — one deployable (ASP.NET)       │
│  Ownership screens · Profiles · Targeting · Contacts  │
│  · Meetings · Alerts · Reports — all in one codebase  │
│  Server-rendered pages · session in server memory     │
│  Business logic in code + many stored procedures      │
│  SAML login                                           │
└─────────────────────────────────────────────────────┘
        │                       │
        ▼                       ▼
┌──────────────────┐   ┌──────────────────────────────┐
│ BACKGROUND JOBS   │   │  ONE BIG SHARED SQL DATABASE  │
│ Feed loaders      │──▶│  Holdings · Institutions ·    │
│ Score recalc      │   │  Funds · Contacts · Meetings ·│
│ Alert sender      │   │  Clients · Users · Alerts ·   │
│ Report generator  │   │  Report jobs · Audit          │
│ (scheduled jobs)  │   │  Tenant = a ClientId column   │
└──────────────────┘   └──────────────────────────────┘
        ▲                              ▲
        │                              │
  Content team feeds          Reports run directly
  (ownership filings,         on live tables
   profiles, fund data)
```

**Layer by layer:**

| Layer | What it looked like |
|---|---|
| **UI** | Server-rendered pages — every click is a full round trip, heavy pages |
| **Business logic** | Mixed between page code, shared libraries and **lots of stored procedures** — the same rule could live in two places |
| **Session** | In server memory → load balancer needed **sticky sessions** |
| **Auth** | **SAML** login; roles stored in BDC's own user tables |
| **Multi-tenancy** | One database for all clients; isolation depended on **every query remembering `WHERE ClientId = @x`** |
| **Data** | **One big shared database** — every module read and wrote the same tables and joined freely across domains |
| **Data ingestion** | Content team feeds (ownership filings, institution and fund profiles) loaded by **scheduled jobs straight into the shared tables** |
| **Targeting scores** | Recalculated by scheduled jobs, read straight from the DB — no cache |
| **Alerts** | A scheduled job scanned for changes and sent emails |
| **Reports** | Generated on web servers or by jobs, **querying live tables** |
| **Delivery** | One deployable, full regression for any change, scheduled release windows |

**What hurt (symptom → root cause):**

| What clients felt | Root cause |
|---|---|
| **Ownership dashboards time out at quarter-end** | Quarterly filings land in bulk; the feed loader writes thousands of holdings into the same tables dashboards read → **write locks block reads** |
| **Reports slow everything down** | Big report queries run on the **same live database**, competing with users |
| **One slow module slows the whole app** | One process, one database — a heavy report or long recalculation eats CPU and connections everyone needs |
| **Small change, big release** | One deployable — a targeting fix means redeploying and retesting everything |
| **Can't scale what's busy** | Quarter-end needs ingestion and reporting capacity, but you can only scale the whole monolith |
| **Tenant-isolation risk** | One missed `ClientId` filter in one stored procedure could show another client's data |
| **Slow feature delivery** | Domains coupled through shared tables — changing one table's shape breaks other modules' queries |

---

## 2. Why modernise, and why this way

**Drivers:** quarter-end performance (the busiest moment for clients was the worst moment for the system), independent scaling and deployment per domain, stronger tenant isolation for regulated financial data, and faster delivery.

| Decision | Options | Chosen | Why |
|---|---|---|---|
| Shape | Rewrite in one go vs **Strangler-Fig** | **Strangler-Fig** | 7,500+ clients use it daily; big bang = one bug locks everyone out. Move domain by domain and client by client |
| Structure | Modular monolith vs **microservices** | **Microservices** | Domains have very different load patterns (bulk writes, constant reads, long jobs, high-volume writes) → each needs its own scaling and its own data store; a modular monolith on one DB can't give that |
| Hosting | VMs vs AKS vs **App Service** | **App Service** | Six standard .NET HTTP services; Microsoft patches OS and runtime; slots, autoscale, TLS built in; no need for a cluster; unpatched nodes are a compliance issue for regulated clients |
| Front end | Keep server pages vs **Angular SPA** | **Angular** (later 18, standalone) | Rich dashboards; small JSON calls instead of full-page postbacks |
| Identity | SAML per app vs **central Okta OIDC** | **Okta OIDC + PKCE** | One identity provider, standard JWTs with tenant and role claims, works for SPA and APIs |
| API entry | Direct to services vs **APIM** | **APIM** | One place for JWT validation, per-tenant rate limits, routing, versioning |
| Data | One shared DB vs **DB per service** | **DB per service**, store chosen per domain | Removes cross-domain locking; each service owns and evolves its own data |
| Communication | All REST vs **REST + Service Bus** | **Both** | REST when an answer is needed now; topic when many services react to one change; queue when exactly one worker must do a job |

---

## 3. Target architecture — Capital Access

```
IR user
   │  sign-in
   ▼
 OKTA (OIDC + PKCE) ──► JWT: sub (user), tid (tenant), roles
   │
   ▼
 FRONT DOOR + CDN  (WAF, DDoS, TLS) ──► Angular 18 SPA (static)
   │  API calls with Bearer JWT
   ▼
 APIM  (validate-jwt, require tid, per-tenant rate limit, route)
   │
   ├──► Ownership Svc ──► Azure SQL (writes) ──event──► Cosmos DB (read model)
   ├──► Profiles Svc  ──► Azure SQL
   ├──► Targeting Svc ──► Azure SQL + Redis (scores)
   ├──► Contacts Svc  ──► Azure SQL (EF Core)
   ├──► Notifications Svc ──► Table Storage
   └──► Reporting Svc ──► Azure SQL (jobs) ──queue──► Durable Functions ──► Blob
                                   (all on App Service, min 2 instances)

 SERVICE BUS
   Topic  ownership-changed ─► subs: Targeting, Notifications
   Queue  report-requests   ─► Report worker (Durable Functions)
   Topic  report-ready      ─► Notifications

 CROSS-CUTTING
   Key Vault + Managed Identity · App Configuration (feature flags)
   App Insights + Splunk (one correlation ID) · Azure DevOps (per-service pipelines)
```

### 3.1 Edge and front end
- **Front Door + CDN** serves the Angular SPA from the edge, with **WAF** (blocks SQL injection and XSS patterns), DDoS protection and TLS termination.
- **Angular 18 standalone** — lazy-loaded feature routes, esbuild builder. The NgModule → standalone migration cut the **bundle by 30%**, with a **bundle-size gate** in CI.
- The SPA only ever calls **APIM**, never a service directly.

### 3.2 Identity — Okta OIDC
1. User opens the app → SPA redirects to **Okta** with **authorization code + PKCE** (a one-time secret that proves the app that started the login is the one finishing it, so a stolen code is useless).
2. Okta signs the user in → returns a code → SPA exchanges it for an **access token (JWT)**.
3. The JWT carries **`sub`** (user), **`tid`** (tenant / client company), **`roles`**.
4. **Tokens are kept in memory**, never localStorage — XSS can't steal them from storage.
5. **Silent renewal** about 5 minutes before expiry; if renewal fails, one retry, then redirect to login **saving the current route** so the user lands back on the same screen.

### 3.3 Gateway — APIM
- `validate-jwt`: signature against Okta's **cached public keys** (no call to Okta per request), issuer, audience, expiry, and a **required `tid` claim**. Rejects `alg: none`.
- **Per-tenant rate limits** — one client's script can't starve everyone else.
- **Routing** to each service's backend; **versioning** — v2 published next to v1 when a breaking change is unavoidable.

### 3.4 The six services I owned

**Ownership service**
- **Does:** who holds the client's stock (institutions, funds), positions, quarter-on-quarter changes, history.
- **Data in:** content team's ownership feeds (filings).
- **Store — CQRS:** **command side = Azure SQL** (holdings written here, source of truth); **read side = Cosmos DB**, one document per company already shaped for the dashboard, **partition key `companyId`**.
- **Why:** this is the BDC quarter-end problem — bulk writes go to SQL, dashboard reads are single-partition point reads on Cosmos and never wait on write locks.
- **Publishes:** `OwnershipChanged` (companyId, tenant, what changed) on a topic.
- **Trade-off:** read model lags a little → UI shows "Last updated"; audit or "latest truth" reads go straight to SQL; if the read model breaks, **rebuild it by replaying events**.

**Profiles service**
- **Does:** institution and fund profiles — who they are, investment style, assets, key people.
- **Store:** Azure SQL — relational, JOIN-heavy, rarely changes.
- **Used by:** Targeting, Contacts and Reporting screens through its API.

**Targeting service**
- **Does:** scores and ranks investors a client should approach (e.g. funds that hold peers but not us); builds target lists.
- **Store:** Azure SQL for lists and scores + **Redis cache-aside** for hot scores.
- **Cache:** read → Redis first → on miss read SQL and store in Redis with a **1-hour TTL**. On `OwnershipChanged` → recalculate that company's scores and **delete its Redis key**.
- **Resilience:** calls to Ownership wrapped in **timeout → retry → circuit breaker → fallback to cached score** — if Ownership is slow, Targeting still answers with slightly older data.
- **Subscribes to:** `OwnershipChanged`.

**Contacts service**
- **Does:** IR contacts at investor firms, relationships, interaction history.
- **Store:** Azure SQL, EF Core code-first — deeply relational (contact → firm → interactions), status changes need **ACID**.
- **EF Core migrations** run as a pipeline step with **expand/contract**.

**Notifications service**
- **Does:** alerts to IR users — "top holder sold 20%", "your report is ready" — in-app and email.
- **Store:** **Table Storage** — huge numbers of cheap writes, always read as "this user's alerts, newest first" (key = user + time). A relational DB would be expensive overkill.
- **Subscribes to:** `OwnershipChanged`, `report-ready`.
- **Rule:** handlers are **idempotent** — processed message IDs are stored, so a redelivered message never sends the same alert twice.

**Reporting service**
- **Does:** board-level reports (ownership summary, targeting results, activity) as PDF.
- **Store:** Azure SQL for **job state**, **Blob** for files.
- **Flow (§4.3):** request → job row → queue → **Durable Functions** worker → Blob → `report-ready` → notification → download via a **15-minute read-only SAS link**.
- **Blob lifecycle:** hot 7 days → cool → deleted at 90 days.
- **History:** started as one queue-triggered Function; became **Durable Functions** once the flow grew to generate → store → notify, because each step needed its own retries and a visible state.

### 3.5 Data from the content team
- The **content team owns the source data** and delivers it as feeds.
- BDC: feeds → one big database. Capital Access: **each service loads only the data it owns into its own database**.
- **How a load works** *(verify the exact mechanism)*:
  1. Feed arrives.
  2. The owning service's loader **upserts** each record by **business key + version** — loading the same file twice changes nothing.
  3. It **publishes an event** for what changed (Ownership → `OwnershipChanged` per company), so other services react.
- **The feed is the source of truth** — if a load fails or a database drifts, reload from the feed; never patch one database from another.

### 3.6 Security and tenant isolation
- **Validate twice:** APIM validates the JWT, and **each service validates again** — the report worker calls services directly, bypassing APIM. A service never trusts a request just because it's inside the network.
- **Authorization:** `roles` checked per endpoint. Angular route guards are only UX — **the server is the security boundary**.
- **Tenant isolation:**
  - `tid` taken **only from the validated token**, never from URL or body.
  - Middleware puts it in a request context → an **EF Core global query filter** adds the tenant filter to **every query automatically** — the fix for BDC's "every query must remember ClientId".
  - **Blob paths** (`reports/{tenantId}/{jobId}/`), **cache keys** and **Service Bus messages** all carry the tenant.
- **Secrets:** **Key Vault + Managed Identity**, least-privilege roles; no connection strings in code or pipelines.
- TLS everywhere; nothing sensitive in the JWT (signed, not encrypted); SAS links short-lived and read-only.

### 3.7 Resilience
- **Polly:** timeout → retry (transient only, with backoff) → **circuit breaker** (opens after 5 failures, stays open 30 s) → **fallback**.
- **Service Bus:** peek-lock, max delivery count → **dead-letter queue**, alert on DLQ growth; idempotent consumers.
- **App Service:** **min 2 instances**, `/health` probe, **autoscale on CPU and queue depth** (CPU lies for async work).

### 3.8 Observability
- **One correlation ID** (W3C trace context) created at the edge, passed on **every REST call and every Service Bus message**.
- **App Insights = where** (end-to-end trace, time per hop, application map). **Splunk = what** (log lines, payloads, stack traces). Same ID in both.
- **Structured logs:** tenantId, userId, correlationId, service, operation.
- **Alerts:** error rate > 5% in 5 min; p99 > 2 s; memory > 80% for 3 min; DLQ growth; queue depth; during migration, **login failures per tenant**.

### 3.9 Delivery
- **Azure DevOps YAML**, **one pipeline per service**, build once and promote the same artifact DEV → STAGING → PROD.
- **PR gates:** unit tests + **80% coverage**, SonarQube, dependency and secret scans, **OpenAPI schema diff** (breaking change fails the build), consumer contract tests, bundle-size gate, accessibility.
- **Staging:** E2E (flag on and off), k6 load test, QA sign-off.
- **Prod:** **App Service slots** (blue/green) + canary traffic shift, automatic swap-back if error rate or p95 crosses the threshold. **Feature flags** in Azure App Configuration ramped 1% → 5% → 25% → 100%.

---

## 4. Key flows end to end

### 4.1 Login and first screen
1. User opens Capital Access → SPA redirects to Okta (code + PKCE).
2. Gets a JWT with `tid` and `roles`, held in memory.
3. SPA calls `GET /ownership/summary` on APIM with the Bearer token.
4. APIM validates the JWT, checks `tid`, applies the rate limit, routes to Ownership.
5. Ownership validates the token again, reads `tid`; the EF Core filter scopes the query to that tenant.
6. Ownership reads the **Cosmos read-model document** for that company (point read) and returns it.
7. Dashboard renders with a "Last updated" time.

### 4.2 Quarter-end ownership update (the BDC pain, solved)
1. Content team's quarterly filings arrive.
2. Ownership loader upserts holdings into **Azure SQL** by business key + version (safe to rerun).
3. For each changed company it publishes **`OwnershipChanged`** to the topic.
4. **Projection** updates that company's **Cosmos document** → dashboards see new data shortly after.
5. **Targeting** (its own subscription) recalculates scores for that company and **deletes the Redis key**.
6. **Notifications** (its own subscription) checks alert rules ("a top-10 holder changed by more than X%") and writes alerts to Table Storage + email.
7. Dashboards **keep reading Cosmos the whole time** — no read waits on a write lock. That's the exact BDC problem fixed.

### 4.3 Report generation
1. User clicks "Generate board report" → Reporting writes a **job row** (Pending), puts a message on **report-requests**, **returns a `jobId` immediately**.
2. A **Durable Functions orchestrator** picks it up, calls Ownership, Profiles, Targeting and Contacts directly (each validates the token), builds the PDF, writes it to **Blob** at `reports/{tenantId}/{jobId}/`.
3. Updates the job to Completed and publishes **`report-ready`**.
4. Notifications tells the user; download uses a **15-minute read-only SAS URL**.
5. On failure: retry transient errors only; permanent failure → "Failed, retry available". The orchestrator is durable, so any instance can resume it after a crash.

### 4.4 Creating an engagement (saga)
1. User logs a meeting with an investor — touches Contacts, Profiles, Engagement and Notifications.
2. Each step **commits locally** and publishes an event.
3. If a later step fails, **compensating actions** undo the earlier ones. Audit is append-only — compensation adds a "reversed" entry, never deletes.
4. Publishing uses the **outbox**: business row + event row in one local transaction; a relay publishes to Service Bus with retries.

---

## 5. Coexistence — BDC and Capital Access side by side

```
IR user ──► Login page
              │
              ▼
      Tenant migration flag (App Configuration)
       │                          │
   not migrated                migrated
       │                          │
   SAML ──► BDC monolith      Okta OIDC ──► Capital Access
               │                               │
       BDC big database          Service databases
               ▲                               ▲
               └───── Content team feeds ──────┘
                 (both loaded during coexistence — verify)
```

- **Which platform a client used depended on one thing: their tenant flag.** Not migrated → SAML → BDC. Migrated → Okta → Capital Access.
- **Both platforms loaded from the same content feeds**, so both showed the same data during the transition *(verify)*.
- **Features not yet rebuilt:** a migrated client could still reach them in BDC *(verify how — link-out, separate login, or not allowed until parity)*.
- **Write ownership:** client-entered data (contacts, meetings, target lists) is written by **only one platform per client at a time** — the one the client is on. Single writer, so the two never overwrite each other *(verify how client-entered data moved — see §6.2)*.

---

## 6. Client migration — my workstream in detail

### 6.1 Preparation (done once)
1. **OIDC path built and shipped dark** — the Okta flow went to production switched off for everyone.
2. **Per-tenant flag** in App Configuration — one flag per client company, read at sign-in.
3. **Both login paths covered by E2E tests** (flag on and off).
4. **Monitoring ready before batch one:** dashboard of login success, Okta errors and app errors **per tenant**.
5. **Batch criteria** *(verify)*: internal test tenants → small and friendly clients → clients **not depending on any BDC-only feature** → big or heavily customised clients last.

### 6.2 Per-batch runbook *(verify which steps were yours)*

**Before (T-few days):**
- Platform team **provisions the batch's users in Okta**.
- **Role mapping checked** — each user's BDC role → Okta `roles` claim; company → `tid`.
- **Data check per client** — feed data present and reconciled in each service's DB (counts and key fields).
- **Client-entered data** (contacts, notes, target lists) moved and checked, if not already shared *(verify — likely deep-dive question)*.
- **Communication** — clients told the date and what changes (new login page); support briefed.

**Migration day:**
1. Flip the tenant flags for the batch.
2. Watch login success and errors per tenant, App Insights error rate and p99, support tickets.
3. Spot-check: a test user from a migrated client signs in, checks dashboard, contacts and a report.

**After:** hold the next batch until this one is clean for an agreed period; fix issues; update the runbook.

**Rollback:** flip that tenant's flag back to SAML/BDC — no deployment, no other tenant affected. Safe because BDC was still live with current data. The tenant is re-migrated in a later batch.

### 6.3 Ownership boundary (say it clearly)
> "The platform team provisioned users into Okta, and the content team owned the feeds. I owned the application side of the migration: the OIDC flow, token handling, the per-tenant switch, the batch plan and runbook, and making sure my six services had each client's data ready before they moved."

---

## 7. Breaking up the big database

**Single-writer ownership matrix** — every table has exactly one service as its writer:

| Data | Writer | Readers (how) |
|---|---|---|
| Holdings / positions | Ownership | Targeting (event + local copy), Reporting (API), Notifications (event) |
| Institution / fund profiles | Profiles | Targeting, Contacts, Reporting (API) |
| Scores, target lists | Targeting | Reporting (API) |
| Contacts, interactions | Contacts | Reporting (API), Engagement |
| Alerts | Notifications | UI (API) |
| Report jobs and files | Reporting | UI (API + SAS) |

**How BDC's cross-domain joins were replaced:**
- **Need the answer now** → synchronous API (the report worker calls 4 services).
- **Need it often** → **events + a local copy** (Targeting keeps the ownership facts it needs, updated by `OwnershipChanged`).
- **Accept eventual consistency** and show it in the UI ("Last updated").

**Consistency without 2PC:** **outbox** for "save + publish", **saga with compensations** for multi-service actions, **idempotent consumers** everywhere (delivery is at-least-once).

---

## 8. Incidents (real ones)

**Primary — Service Bus publish blocking the API**
- **Symptom:** creating an engagement timed out intermittently under load.
- **Detect:** p99 > 2 s alert fired before customers escalated.
- **Troubleshoot:** correlation ID → App Insights end-to-end trace — the time wasn't our code or SQL, it was the **Service Bus publish awaited inside the HTTP request**.
- **Fix:** took the publish off the request path; robust end state is the **outbox** (save + outbox row in one transaction, relay publishes, idempotent consumers).
- **Systemic:** searched the codebase, found the **same pattern in two more places**, fixed all three, added "async publish" to the engineering standard.

**Backup — 503s from an unbounded background job**
- **Symptom:** API returned 503s for about 20 minutes one morning.
- **Contain:** instances at 95% CPU → **scaled out first** for relief.
- **Diagnose:** `OutOfMemoryException`; a memory dump traced it to a job deployed days earlier doing an **unbounded `.ToList()`**.
- **Fix:** hotfix to paginate; permanent fix moved aggregation into SQL.
- **Prevent:** memory alert + review rule "every EF Core query is paged or justified". Principle: restore first, diagnose second, fix root cause third.

**Also ready — additive event field broke a consumer silently**
- An **additive field** on an event made the Notifications team's **strict deserializer drop every message** with no error. Fix: **lenient consumers** + documented rule "additive fields are always backward compatible".

---

## 9. Results
- **Quarter-end:** dashboards no longer blocked by bulk writes (CQRS).
- **Clients moved tenant by tenant** with **no platform-wide outage**; any one client could roll back alone.
- **30% smaller front-end bundle**, gated so it can't grow back.
- **Cross-service incidents found in minutes** by correlation ID instead of matching timestamps.
- **Small per-service releases** instead of full-platform releases.

> ⚠️ **Don't use "Redis < 5 ms"** unless you can say exactly what was measured — which call, p95 or p99, before and after, measured where. That claim hurt you in TJX round 2.

---

## 10. Deep-dive questions

**Q: A client is mid-session in BDC when you flip their flag. What happens?**
> "The flag only decides which login they get at the next sign-in. Their BDC session continues until it expires or they log out. Next time they go through Okta into Capital Access, and their data is there because both platforms are loaded from the same feeds."

**Q: What if half of a client's users were provisioned in Okta and half weren't?**
> "That's why provisioning is checked per tenant before the flag flips. If users are missing, the batch waits. Flipping a half-ready tenant would lock people out, and the per-tenant switch exists exactly so we never have to."

**Q: How do you stop one client ever seeing another's data?**
> "The tenant comes only from the validated token. An EF Core global query filter adds it to every query, so a developer can't forget it — that was BDC's risk. Cache keys, blob paths and messages all carry the tenant. And we test it: sign in as tenant A, request tenant B's IDs, expect 404 or 403."

**Q: Quarter-end — 10,000 holdings arrive at once. Walk me through it.**
> "The loader upserts into SQL by business key and version, so a rerun is safe. It publishes one `OwnershipChanged` per company, not per row, so we don't flood the bus. The projection updates Cosmos, Targeting recalculates and clears its cache, Notifications checks alert rules. Dashboards keep reading Cosmos the whole time, so no read waits on a write. Services autoscale on queue depth, not CPU."

**Q: Targeting shows old scores after an ownership change. How long, and why?**
> "Normally only as long as it takes to process the event — `OwnershipChanged` makes Targeting recalculate and delete the Redis key. If an event is missed, the 1-hour TTL heals it. If Ownership is down, the circuit breaker opens and Targeting serves the last cached scores instead of failing."

**Q: A user edits using stale Cosmos data. Then what?**
> "Writes never go to Cosmos. They go to the SQL command side, which checks a version number. If the data changed underneath, the write is rejected and the user is asked to refresh. Cosmos is only for reading."

**Q: Notifications is down when the event fires. Is anything lost?**
> "No. The message waits in Notifications' own subscription and the backlog is processed when it's back. If it crashes mid-message, the lock expires and the message is redelivered; the idempotent handler skips duplicates. After max retries it goes to the DLQ, which alerts us, and we fix and resubmit."

**Q: The report worker calls four services — isn't that a distributed monolith?**
> "It's one read-only path, and each service still owns its data and deploys alone. Calls have timeouts and retries, and the report is asynchronous, so a slow service delays a report but never breaks a screen. If it grew, I'd move to a reporting read model fed by events."

**Q: When can BDC be switched off?**
> "When no tenant is on the SAML login, no Capital Access feature links back to BDC, and telemetry shows zero writes to BDC. Then it stays read-only for a while as a safety net, compliance data is archived, and only then is it switched off — telemetry, not belief."

**Q: What would you do differently?**
> "Agree exit criteria and the data-ownership list on day one of coexistence — otherwise there's always one more client or feature keeping the old system alive. Give the business a per-tenant migration dashboard. And remove feature flags right after full rollout."

---

## 11. Still to verify
1. **§1** — BDC internals (reconstructed). Keep what matches, drop the rest.
2. **§5** — how migrated clients reached BDC-only features.
3. **§6.2** — how **client-entered data** (contacts, notes, target lists) moved from BDC. Most likely deep-dive question about the migration.
4. **§3.5** — the exact feed-loading mechanism.
5. One **concrete feature you built** per service — for "what did *you* build in Targeting?".
