# Project 1 — Capital Access (S&P Global)

> **Persona:** Architect track only. Application Architect, S&P Global, Dec 2024 – present. 7,500+ corporate issuers.
> **Merged from:** `capital-access-project/` (story, deep dives, operations, README), `behavioural/behavioural-answers.md` (Architect + Solera tracks), `azure-revision-notes/`, `unit-testing/`, `principal-architect-interview-guide.md` (Capital Access stories), `mock-interview-debrief/recording-5`.
> **Deep source if you get pulled deeper:** [capital-access-interview-story.md](../capital-access-project/capital-access-interview-story.md) · [deep-dives](../capital-access-project/capital-access-deep-dives.md) · [operations](../capital-access-project/capital-access-operations.md)
> **AI work on this platform** lives in its own doc → [03-ai-report-ingestion-rag.md](03-ai-report-ingestion-rag.md).

## Table of Contents
- [0. Facts to keep consistent (read first)](#0-facts-to-keep-consistent-read-first)
- [1. Project Summary — STAR](#1-project-summary--star)
- [2. System Architecture & Flow](#2-system-architecture--flow)
- [3. Design Patterns](#3-design-patterns)
- [4. Security](#4-security)
- [5. Observability & Resilience](#5-observability--resilience)
- [6. Testing & Quality](#6-testing--quality)
- [7. Deployment & DevOps](#7-deployment--devops)
- [8. Real-World Incident / Production Challenge](#8-real-world-incident--production-challenge)
- [9. Leadership one-liners from this project](#9-leadership-one-liners-from-this-project)

---

## 0. Facts to keep consistent (read first)

The old notes contradict each other in a few places. Say it **one way** every time:

| Topic | Say this | Older notes that conflict |
|---|---|---|
| Title | **Application Architect** (confirmed) | One answer says "Full Stack Developer"; one note says "Lead SDE" |
| Scale | **7,500+ corporate issuers** | Some lines say 500+ |
| Services | **6 core services** (Ownership, Profiles, Targeting, Contacts, Notifications, Report) **+ Engagement & Activity** | STAR says "five"; one answer says "seven" — say "six core plus Engagement" |
| Hosting | **App Service** with staging slots | CI/CD walkthrough uses `kubectl`/AKS pods; one answer says "deploy to AKS" |
| Ownership data | **Commands → Azure SQL; Cosmos DB read model** for dashboards/history (CQRS) | Story table says Cosmos is the only store — CQRS is the fuller, defensible version |
| Report worker | Started as a **queue-triggered Function**; became **Durable Functions** once it grew to generate → store → SAS URL | Some notes say plain Function only |

---

## 1. Project Summary — STAR

**Situation.** Capital Access is S&P Global's multi-tenant SaaS for **Investor Relations teams at public companies**. IR officers use it to see who owns their stock, target new institutional investors, manage meetings and roadshows, send investor mail, and build board-level reports. 7,500+ corporate issuers, regulated financial data, Azure-hosted.

**Task.** As Application Architect: own the application architecture and back-end service design for the .NET microservices on Azure, guide the Angular 18 front end, own the Okta OIDC authentication flow, and keep CI/CD and quality gates healthy. Later, lead the AI initiatives (see Project 3).

**Action.**
- Event-driven microservices: database per service, **Service Bus topics** for fan-out, a **queue + Azure Function** for long-running reports, **Redis** cache-aside for hot reads, **CQRS** for ownership data.
- Single **APIM gateway** for JWT + tenant/role validation and per-tenant rate limits; tenant isolation enforced again in each service with **EF Core global query filters**.
- **SAML → Okta OIDC** migration rolled out **tenant by tenant behind feature flags**.
- **NgModule → Angular 18 standalone** migration with the esbuild builder, done incrementally (leaf → shared → feature).
- One **Correlation ID** across App Insights (timing) and Splunk (log content); alerts on error rate and p99.

**Result.**
- **30% smaller bundle**, faster CI builds, and a **bundle-size gate** so regressions can't merge.
- Auth moved for 7,500+ tenants with **no platform-wide outage** — any one tenant could roll back alone.
- Hot targeting reads **< 5 ms** from Redis; dashboard reads isolated from quarter-end write storms.
- Cross-service incidents now found **in minutes** by Correlation ID instead of matching timestamps.

> **60-second pitch (say this):** "Capital Access is S&P Global's SaaS platform for investor-relations teams at more than 7,500 public companies. It's Angular 18 on a CDN, Front Door at the edge, API Management as the single gateway, and six .NET microservices on App Service, each with its own database. Services talk through Service Bus — topics when many services react to one change, a queue when one worker must do a job, like report generation in Azure Functions. Redis holds hot targeting scores, and App Insights plus Splunk share one correlation ID. As Application Architect I own the service design, the Okta OIDC flow and multi-tenant isolation, and I led the Angular standalone migration that cut the bundle by 30 percent."

---

## 2. System Architecture & Flow

**Request path (sync):**
1. User signs in at **Okta** → JWT with `sub` (user), `tid` (tenant), `roles`.
2. **Front Door + CDN** → WAF, DDoS, TLS termination → **Angular 18 SPA** on Static Web Apps.
3. SPA calls **APIM** only, with a Bearer JWT. APIM validates signature (cached JWKS), issuer, audience, expiry, required `tenantId` claim, then rate-limits per tenant and routes.
4. **Microservice on App Service** validates the JWT again, reads `tenantId`, and EF Core filters every query by tenant.

**Event path (async):**
- Ownership feed updates → Ownership Service saves → publishes `OwnershipChanged` to a **topic** → Targeting recalculates and clears its Redis key; Notifications sends alerts. Publisher doesn't know who listens.

**Long-running path:**
- User asks for a report → Report Service writes a job row, puts a message on a **queue**, returns a `jobId` at once → **Function** pulls data from Ownership/Profiles/Targeting/Contacts, builds the PDF, writes to **Blob** (`reports/{tenantId}/{jobId}/`) → publishes `report-ready` → user gets a notification and downloads via a **15-minute read-only SAS URL**. Blob lifecycle: hot 7 days → cool → delete at 90 days.

**Data store per service — the "why":**

| Service | Store | Why |
|---|---|---|
| Ownership | Azure SQL (write) + Cosmos DB (read model) | Quarter-end bulk writes vs constant dashboard reads |
| Profiles | Azure SQL | Relational, rarely changes, JOIN-heavy |
| Targeting | Azure SQL + Redis | Expensive scores, read constantly |
| Contacts / Engagement | Azure SQL (EF Core code-first) | Deeply relational, ACID status changes |
| Notifications | Table Storage | Huge cheap writes, read by user + time |
| Report | Azure SQL (jobs) + Blob | Job state + files |

**Q: Why App Service and not AKS for six services?**
> "Autoscaling was never the difference — VM scale sets and AKS can autoscale too. The difference is who owns the layer below the app. With App Service, Microsoft patches the OS and runtime, and we get slots, autoscale and TLS out of the box. With six .NET services there was no workload that needed a cluster, a service mesh or custom nodes, and every unpatched node is a compliance question for regulated clients. I'd revisit AKS at dozens of services or for polyglot or sidecar-heavy workloads."

**Q: When do you use a direct call, a topic, or a queue?**
> "Direct REST when I need an answer right now and already have the context — the report worker pulling data from four services. A topic when many independent services react to one change — ownership changed, so Targeting and Notifications both react and a new Audit service is just a new subscription. A queue when exactly one worker must do a job once — report generation."

---

## 3. Design Patterns

| Pattern | Where | Trade-off you accept |
|---|---|---|
| **Database per service** | Every service | No cross-service JOINs → events, local copies, eventual consistency |
| **API Gateway** (APIM) | Single entry | Gateway is critical path → keep it thin, scale it, services still validate |
| **Pub/Sub (choreography)** | Ownership → Targeting + Notifications | Harder to see the whole flow → Correlation ID + tracing |
| **Orchestration** | Report generation (Durable Functions) | Orchestrator is a central component → durable state, retries, replay |
| **Saga** | Creating an Engagement across Contacts/Profiles/Engagement/Notifications | Compensations instead of rollback; must be idempotent |
| **CQRS** | Ownership data | Read model is 100–500 ms behind → show "Last updated" timestamp |
| **Cache-aside** | Targeting scores in Redis (1 h TTL) | Staleness → event-driven key invalidation |
| **Idempotent consumer** | Every Service Bus handler | Store processed message IDs |
| **Circuit breaker + timeout + fallback** (Polly) | Targeting → Ownership | Serve cached scores while the circuit is open |
| **Feature toggles** | Every new feature (Azure App Configuration) | Flag debt → remove after rollout |
| **Strangler / incremental migration** | SAML→OIDC, NgModule→standalone | Two paths live for a while |

**Q: Why CQRS for ownership data — isn't it over-engineering?**
> "It solved a real contention problem. At quarter-end, regulatory filings land in bulk — thousands of ownership updates a minute — exactly when clients open the ownership dashboard. On one database, write locks made reads time out. So commands write to Azure SQL and publish an event; a Function projects it into a Cosmos DB document already shaped for the dashboard; reads are partition-key point reads under 10 ms. The cost is a few hundred milliseconds of lag, which we show as a 'last updated' time. For audit reads that need the latest truth, we read SQL directly. If the read model breaks, we rebuild it by replaying events."

**Q: Orchestration or choreography — which did you use?**
> "Both, on purpose. Choreography where many services react to one fact — ownership changed. Orchestration where steps must run in order with error handling — report generation. In a mock I proposed an orchestrated saga, then pointed out the orchestrator is now a single point of failure — the answer is to make it durable and stateless so any instance can resume it, or fall back to choreography when the flow is simple."

---

## 4. Security

- **AuthN:** Okta **OIDC + PKCE**, short-lived access tokens (15–60 min), silent renewal ~5 min before expiry, one retry then redirect to login **with the current route saved**.
- **Tokens in memory**, never localStorage. CSP headers + Angular sanitisation for XSS. Bearer tokens → CSRF not applicable.
- **AuthZ:** roles + `tid` as custom claims. **Route guards are UX; the server is the security boundary.** `[Authorize(Roles=...)]` per endpoint.
- **Defence in depth:** APIM `validate-jwt` (signed tokens only, rejects `alg: none`) **and** each service validates — because the report worker calls services directly, bypassing APIM.
- **Tenant isolation:** `tenantId` from the token → middleware → **EF Core global query filter** on every entity; Blob paths and cache keys include tenant; Service Bus messages carry tenant in the payload.
- **Secrets:** **Key Vault + Managed Identity** (Key Vault Secrets User, Storage Blob Data Reader — least privilege). No connection strings in code or pipelines.
- **Data protection:** TLS everywhere; nothing sensitive in JWT payloads (signed, not encrypted); SAS URLs short-lived and read-only.
- **Compliance:** WCAG 2.1 AA accessibility as a PR gate; audit fields from `sub`.

**Q: If the gateway already validates the JWT, why validate again in each service?**
> "Because not all traffic comes through the gateway. The report worker calls Ownership, Profiles and Targeting directly. So every service validates the token itself against Okta's cached public keys — no network call per request — and then uses the claims for real authorization: role checks and the tenant filter on every query. A service never trusts a request just because it's on the internal network."

**Q: How did you move 7,500+ tenants from SAML to Okta without downtime?**
> "Per-tenant feature flags. Each tenant had a flag choosing the old SAML redirect or the new OIDC flow. We started with internal test tenants, then moved clients in batches. If one tenant had a problem, we flipped only that tenant back. The front-end auth flow was ready before the rollout, so each migration was a flag change. User provisioning into Okta was owned by the platform team — I owned the app side."

---

## 5. Observability & Resilience

**Observability**
- **Correlation ID** (W3C trace context) created at entry, passed on every REST call **and every Service Bus message**.
- **App Insights** = the timeline (which hop was slow). **Splunk** = the content (log lines, payloads, stack traces). Same ID in both.
- **Alerts:** error rate > 5% in 5 min; p99 > 2 s; memory > 80% for 3 min; DLQ growth; queue depth.

**Resilience**
- Polly: **timeout → retry (transient only) → circuit breaker** (5 failures, 30 s open) → **fallback to cached score**.
- Service Bus: at-least-once, peek-lock, **DLQ** after max delivery count, **idempotent consumers**.
- App Service: min 2 instances, health probe on `/health`, autoscale on CPU and **custom metrics like queue depth** (CPU lies for async work).
- Graceful degradation: Targeting serves cached scores when Ownership is slow.

**Q: How do you trace one request across four services?**
> "One correlation ID, set at the edge and passed on every call and every message. In App Insights I open the end-to-end trace and see each hop's time — say Targeting 50 ms, Redis miss, SQL 120 ms. Then I search that same ID in Splunk to read what each service actually logged. App Insights tells me where; Splunk tells me what."

**Q: What happens if Notifications is down when an event arrives?**
> "Nothing is lost. The message waits in its subscription. When the service returns, it processes the backlog. If it crashes mid-message, the lock expires and the message is redelivered — so the handler checks the message ID and skips duplicates. After repeated failures the message goes to the dead-letter queue, where we alert, inspect, fix and resubmit."

---

## 6. Testing & Quality

- **Unit:** NUnit/xUnit + Moq on domain logic; **80% coverage gate** on every PR.
- **Integration:** `WebApplicationFactory` + real DB (TestContainers) in DEV after merge.
- **Contract:** OpenAPI spec in the repo + **schema-diff in CI** (breaking change fails the build) + **consumer-driven contract tests (Pact)**; additive event fields only, **lenient consumers**.
- **E2E:** Cypress/Playwright on staging, including flag-on/flag-off paths.
- **Performance:** **k6 load tests** in staging; Lighthouse + Core Web Vitals per release; **bundle-size budget** gate.
- **Security & accessibility:** SonarQube, dependency and secret scans, accessibility scan + NVDA/VoiceOver checks in PR review.
- **Data access rule (from an incident):** every EF Core query needs pagination or a written reason.

**Q: How do two teams avoid breaking each other's API contracts?**
> "The contract lives in code, not in a conversation: an OpenAPI spec in the same repo as the API, with a schema diff in CI that fails the build on a breaking change. On top of that, consumer-driven contract tests — the UI team publishes what it actually uses, and the backend pipeline runs those checks before deploy. If a breaking change is truly needed, we publish v2 next to v1 and retire v1 when its traffic is gone."

**Q: How do you keep front-end performance from regressing?**
> "A bundle budget in the Azure DevOps pipeline — if any chunk is over budget, the PR fails. Plus Lighthouse on key routes, tracking First Contentful Paint and Total Blocking Time per release. That's what keeps the 30 percent saving from leaking back."

---

## 7. Deployment & DevOps

- **Azure DevOps YAML**, build once, promote the same artifact: **PR → DEV → STAGING → PROD**.
- **PR gates:** lint, unit tests + coverage, SonarQube, security scan, bundle size, accessibility.
- **Staging:** E2E, k6 load test, security checks, QA sign-off.
- **Prod:** **blue/green with App Service slots** + **canary traffic shift (10% → 25% → 100%)**; automatic swap-back if error rate > 1% or p95 above baseline.
- **Feature toggles** (Azure App Configuration) for every feature: **1% → 5% → 25% → 100%**; rollback = flag flip in seconds.
- **DB changes:** EF Core migrations as a pipeline step, **expand/contract** so old and new code both work.
- **Per-service pipelines** — deploy one service without the rest.
- **IaC:** keep it to what's in the notes — environment-specific config, Managed Identity and Key Vault set up by script/pipeline. *(Don't claim Bicep/Terraform on Capital Access unless true.)*

**Q: How do you release without downtime and roll back fast?**
> "Two levers. For code, deploy to a staging slot, smoke test, swap — and swap back if the gate fails. For behaviour, every feature ships off behind a toggle and is ramped by percentage, so most rollbacks are a flag flip with no deploy. Database changes are expand-and-contract so the previous version still runs against the new schema."

**Q: Why feature flags if you already have slot swaps?**
> "A swap rolls back the whole deployment; a flag rolls back one feature for some users in seconds. When a new targeting algorithm at 25% caused 5-second p95 spikes — the ML call had no timeout — on-call turned the flag off from App Configuration in about 90 seconds, no redeploy. Then we added the timeout and restarted the rollout at 1%."

---

## 8. Real-World Incident / Production Challenge

### Primary story — Service Bus publish blocking the API (Engagement service)

| Step | What happened |
|---|---|
| **Symptom** | Creating an engagement event **timed out intermittently under load**. |
| **Detect** | p99-latency alert (> 2 s) fired — before customers escalated. |
| **Troubleshoot** | Took the Correlation ID → App Insights end-to-end trace. The time was **not** in our code or SQL — it was the **Service Bus publish awaited inline** in the HTTP request. |
| **Root cause** | The domain-event publish was on the request's critical path, so broker latency became user latency. |
| **Fix** | Made the publish genuinely async relative to the HTTP response instead of awaited inline, so the API returns once the data is saved. *Trap — "what if the publish then fails?" → that's the dual-write gap; the robust end-state is a transactional outbox (save + outbox row in one transaction, relay publishes, consumers idempotent).* |
| **Make it systemic** | Searched the codebase — **same pattern in two more places**; fixed all three and added "async publish" to the engineering standard. |
| **Prevent** | Kept the p99 alert; added the pattern to code-review guidance. |

> **Say this:** "Engagement creation was timing out under load. The p99 alert fired, I pulled the correlation ID, and the App Insights trace showed the delay wasn't our code or the database — it was the Service Bus publish being awaited inside the HTTP request. I moved the publish off the response path, then searched for the same pattern and found it in two more services, so I fixed all three and made async publishing part of our standard. The lesson: one incident is a prompt to look for the same shape everywhere."

### Backup story — 503s from an unbounded background job

- **Symptom:** API returned **503s for ~20 min** one morning; dashboard not loading.
- **Contain first:** instances at 95% CPU → **scaled out** for relief before diagnosing.
- **Diagnose:** logs showed `OutOfMemoryException`; **memory dump** traced it to a job deployed days earlier doing an unbounded `.ToList()` every run.
- **Fix:** hotfix added pagination; permanent fix moved aggregation into SQL.
- **Prevent:** memory alert (80% for 3 min) + review rule "every EF Core query is paged or justified". Principle: **restore first, diagnose second, fix root cause third.**
- ⚠️ This same outline also appears in the 9-year track notes — tell it **only** as Capital Access on the Architect track.

### Also ready — silent event failure
An **additive field** on the Engagement event made the Notifications team's **strict deserializer drop every message silently** — no error logged. Found by walking the real message on the wire. Fix: lenient consumers + documented rule "additive fields are always backward compatible".

---

## 9. Leadership one-liners from this project

- **Disagreement resolved by evidence:** a peer wanted a synchronous call from Reports to Engagement for a "real-time" count. We agreed what data would settle it, measured — lag was **under 2 s** in most cases — and kept the event-driven design.
- **Pushed back on big-bang:** standalone migration done **leaf → shared → feature**, one PR per phase, never a broken build.
- **AI in daily work:** used Claude to scaffold the Durable Functions orchestrator, then caught that its retry treated transient Service Bus timeouts as permanent failures — rebuilt with Polly retries scoped to transient errors and a "failed, retry available" status.
