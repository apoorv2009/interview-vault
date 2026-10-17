# TJX StoreWeb — Azure Services Q&A

Prep for the TJX Senior Staff Engineer – StoreWeb Modernization interview. JD line: *"Deep expertise across Azure services: APIM, App Services/AKS, Functions, Service Bus/Event Grid, Azure SQL, Cosmos DB."*

Persona: **Architect track** (Capital Access at S&P Global + Wells Fargo migration at Wipro). Each answer follows **what → where it runs → how it works → live example → interview line**.

> Prices are approximate USD list prices — verify in the Azure Pricing Calculator before quoting exact numbers.

## Table of Contents
- [Part 1 — Azure Functions](#part-1--azure-functions)
  - [Q1. What are Azure Functions, and when would you use them?](#q1-what-are-azure-functions-and-when-would-you-use-them)
  - [Q2. What are Durable Functions?](#q2-what-are-durable-functions)
  - [Q3. How do you handle state management in Azure Functions?](#q3-how-do-you-handle-state-management-in-azure-functions)
  - [Q4. What is cold start, and how do you minimise its impact?](#q4-what-is-cold-start-and-how-do-you-minimise-its-impact)
  - [Q5. How do you keep Function instances pre-warmed on an App Service Plan?](#q5-how-do-you-keep-function-instances-pre-warmed-on-an-app-service-plan)
- [Part 2 — API Management and Networking](#part-2--api-management-and-networking)
  - [Q1. What is Azure API Management, and how does it work with backend APIs?](#q1-what-is-azure-api-management-and-how-does-it-work-with-backend-apis)
  - [Q2. How do you implement APIM policies and validate incoming requests?](#q2-how-do-you-implement-apim-policies-and-validate-incoming-requests)
  - [Q3. How do you securely connect APIM → backend API → Azure SQL?](#q3-how-do-you-securely-connect-apim--backend-api--azure-sql)
  - [Q4. How can public APIM APIs reach a backend inside a VNet with a private endpoint?](#q4-how-can-public-apim-apis-reach-a-backend-inside-a-vnet-with-a-private-endpoint)
  - [Q5. How do you deploy APIM across multiple regions on a budget?](#q5-how-do-you-deploy-apim-across-multiple-regions-on-a-budget)
  - [Q6. What is Azure Front Door?](#q6-what-is-azure-front-door)
- [Part 3 — Front Door Deep Dive](#part-3--front-door-deep-dive)
- [Part 4 — Application Gateway Deep Dive](#part-4--application-gateway-deep-dive)
- [Part 5 — APIM: Tiers, Versions, Gateway Types](#part-5--apim-tiers-versions-gateway-types) — incl. developer portal
- [Part 6 — Confusing Pairs: API Gateway vs APIM vs App Gateway](#part-6--confusing-pairs-api-gateway-vs-apim-vs-app-gateway)
- [Part 7 — TJX Question Bank (basics + scenarios)](#part-7--tjx-question-bank-basics--scenarios)
  - [APIM](#apim)
  - [App Service / AKS](#app-service--aks)
  - [Azure Functions](#azure-functions)
  - [Service Bus / Event Grid](#service-bus--event-grid)
  - [Azure SQL](#azure-sql)
  - [Cosmos DB](#cosmos-db)
  - [Cross-service architecture scenarios](#cross-service-architecture-scenarios)
- [Part 8 — Service Bus Scenario Model Answers](#part-8--service-bus-scenario-model-answers)
  - [SB1. Fan-out: one sale, many consumers](#sb1-fan-out-one-sale-many-consumers)
  - [SB2. Ordered price updates](#sb2-ordered-price-updates)
  - [SB3. 500,000-message backlog on Black Friday](#sb3-500000-message-backlog-on-black-friday)
  - [SB4. Poison messages blocking a session](#sb4-poison-messages-blocking-a-session)
  - [SB5. Message grew from 5 KB to 5 MB](#sb5-message-grew-from-5-kb-to-5-mb)
  - [SB6. DB write + publish without losing either (outbox)](#sb6-db-write--publish-without-losing-either-outbox)
  - [SB7. Event Grid or Service Bus for image upload?](#sb7-event-grid-or-service-bus-for-image-upload)
  - [Cross-cutting Service Bus lines](#cross-cutting-service-bus-lines)
- [Part 9 — Model Answers for the Full Question Bank](#part-9--model-answers-for-the-full-question-bank)
  - [9.1 APIM answers](#91-apim-answers)
  - [9.2 App Service / AKS answers](#92-app-service--aks-answers)
  - [9.3 Azure Functions answers](#93-azure-functions-answers)
  - [9.4 Service Bus basics answers](#94-service-bus-basics-answers)
  - [9.5 Azure SQL answers](#95-azure-sql-answers)
  - [9.6 Cosmos DB answers](#96-cosmos-db-answers)
  - [9.7 Cross-service architecture answers](#97-cross-service-architecture-answers)

---

## Part 1 — Azure Functions

### Q1. What are Azure Functions, and when would you use them?

**What:** A small piece of code Azure runs **only when something happens** — no server to manage. Analogy: a motion-sensor light; off and free until someone walks in.

**How it works:**
- Every function has exactly **one trigger** (HTTP, queue message, timer, blob upload).
- **Bindings** connect to other services without plumbing code (input binding reads, output binding writes).
- On **Consumption**, Azure adds instances as load grows and **scales to zero** when idle. You pay per execution.

**Use for:** event-driven, background, bursty work — queue processing, scheduled jobs, webhooks, file processing.
**Avoid for:** latency-critical user APIs, steady high load, long-running processes → App Service or containers.

**Live example (Capital Access):** "Report requests don't build the PDF in the API. The API drops a message on a **Service Bus queue** and returns immediately. A **Service Bus-triggered Function** generates the report. 50 requests at once → it scales out; at night → costs nothing. We used the **isolated worker model**, so our .NET version isn't tied to the Functions host."

### Q2. What are Durable Functions?

**What:** An extension for **multi-step workflows that remember progress** across crashes and restarts. Analogy: video-game save points.

**How it works:**
- Three roles: **client** starts it, **orchestrator** decides the order of steps, **activities** do the work.
- Each time the orchestrator awaits a step, the result is written to a **history log** in Storage (event sourcing).
- On wake-up the orchestrator **replays from the top** — finished steps return cached results, only the next step really runs.
- Therefore orchestrator code **must be deterministic**: no `DateTime.Now`, no random, no direct I/O. All of that goes into activities.

**Patterns:** function chaining, fan-out/fan-in, async HTTP API (built-in status endpoint), monitor, human interaction (external events), Durable Entities.

**Live example:** "The report function hit timeouts on large reports, and a crash meant starting over. We moved to a Durable orchestration chaining **Generate → WriteToBlob → GenerateSasUrl** — a Blob failure retries only that step. For RAG ingestion of 200-page PDFs we use **fan-out/fan-in** over page batches."

### Q3. How do you handle state management in Azure Functions?

Functions are **stateless** — any instance can pick up any message, so never keep important data in memory or statics.

| Need | Where to keep it |
|---|---|
| Workflow progress | Durable Functions |
| Small shared object/counter per key | Durable Entities |
| Business data | Cosmos DB / Azure SQL |
| Files and outputs | Blob Storage |
| Cache / short-lived session data | Azure Cache for Redis |
| State per message group | Service Bus sessions (session state) |

**Live example:** "The report PDF lands in **Blob**; the client polls the **Durable status endpoint**; ownership data lives in **Cosmos DB**. Any instance can crash and another resumes exactly where it stopped."

### Q4. What is cold start, and how do you minimise its impact?

**What:** The delay on the **first request after idle** — Azure must allocate a host, load the runtime and your code. Happens because Consumption scales to zero.

**How to reduce:**
1. **Plan:** Premium (always-ready + pre-warmed instances), Flex Consumption (always-ready), Dedicated with **Always On**.
2. **Lighter startup:** fewer dependencies, no heavy DI work, reuse static `HttpClient` / `ServiceBusClient`.
3. **Isolated worker + ReadyToRun** compilation.
4. **Design around it:** if the flow is async, nobody notices.

**Live example:** "Report generation stayed on **Consumption** — it's async and polled, so a 2-second cold start is invisible inside a 30-second job. The **RAG ingestion trigger** needs freshness, so Premium/always-ready is justified there. Plan per workload."

### Q5. How do you keep Function instances pre-warmed on an App Service Plan?

**Clarify politely:** "pre-warmed instances" is strictly a **Premium plan** feature. On a **Dedicated (App Service) plan**, instances are always running because you pay for them.

On a Dedicated plan:
1. **Always On** — otherwise the host unloads after ~20 minutes idle and timer/queue triggers stop firing reliably.
2. **Minimum instance count** (e.g. 2) via autoscale rules.
3. **Deployment slots + warm-up** (`applicationInitialization`, health check), then **swap**.
4. **Health Check** to pull bad instances out of rotation.

Trade-off: paying 24×7, no scale-to-zero, scaling follows your autoscale rules, not event-driven scaling.
On Premium: set **always-ready** instances + a **pre-warmed buffer**.

**Line:** "Spare App Service capacity → Always On, minimum instances, slot warm-up — zero cold start at no extra cost. Need elastic event scaling *and* no cold start → Premium."

---

## Part 2 — API Management and Networking

### Q1. What is Azure API Management, and how does it work with backend APIs?

**What:** A **single front door for all APIs**. Clients call APIM; APIM checks, applies rules and forwards to the real backend. Analogy: hotel reception — guests never walk into the kitchen.

**Three parts:** **Gateway** (runtime for every call), **management plane** (define APIs/policies), **developer portal** (docs, keys).
**Key terms:** API (operations mapped to a backend), Product (bundle of APIs for a consumer group), Subscription (key to a product), Policy (rule on every call).

**Flow:** client → gateway → **inbound** policies → backend → **outbound** policies → client.

**Live example (Capital Access):** "Every SPA request went through **APIM**, which validated the Okta JWT and tenant/role claims and routed to the right microservice. Services still self-validated the JWT for service-to-service calls — defence in depth."
**Live example (Wells Fargo):** "APIM sat in front of **legacy and new endpoints**; moving a route was a routing-rule change, rollback was flipping it back."
**TJX tie-in:** APIM is where you strangle the StoreWeb monolith route by route, invisible to stores.

### Q2. How do you implement APIM policies and validate incoming requests?

**Stages:** inbound → backend → outbound → on-error. **Scopes:** global → product → API → operation, inherited via `base`.

| Check | Policy |
|---|---|
| Who is calling | `validate-jwt` / `validate-azure-ad-token` (signature, expiry, audience, issuer, claims) |
| Abuse | `rate-limit-by-key`, `quota-by-key` → 429 |
| Well-formed | `validate-content`, `validate-parameters`, `validate-headers` against OpenAPI |
| Origin | `ip-filter`, `cors` |
| Secrets | Named values linked to **Key Vault** |

Also useful: `set-backend-service`, `retry`, `cache-lookup/store`, `set-header` (remove internal headers), `mock-response`. Policies live in **Git**, deployed via **APIOps**.

**Live example:** "Global: CORS + strip internal headers. Product: `validate-jwt` against Okta JWKS, required `tenant` claim, `rate-limit-by-key` on tenant ID so one noisy tenant can't starve others. Operation: `validate-content` on writes so bad payloads get a 400 at the gateway."
**Line:** "Reject early and cheaply."

### Q3. How do you securely connect APIM → backend API → Azure SQL?

Every hop: **private network, managed identity, TLS, zero secrets in config.**

- **Client → APIM:** JWT validation, subscription key, rate limits, WAF in front (Front Door / App Gateway).
- **APIM → backend:** APIM in/integrated with VNet; backend has **private endpoint**, public access off; APIM **managed identity** via `authentication-managed-identity` (or mTLS client certs); access restrictions allow only the APIM subnet.
- **Backend → Azure SQL:** backend **managed identity** + **Entra auth** (no password), least privilege (no `db_owner`); SQL **private endpoint**, public access off, **private DNS zone**; TLS in transit, TDE at rest.
- Leftover secrets → **Key Vault** via managed identity.

**Live example:** "No service in Capital Access had a DB password anywhere — managed identity to SQL and Key Vault, both behind private endpoints."

### Q4. How can public APIM APIs reach a backend inside a VNet with a private endpoint?

APIM must stand on both sides.
1. **External VNet mode** (Developer/Premium classic) — public gateway IP, APIM inside the subnet.
2. **Standard v2 / Premium v2 + VNet integration** — public inbound, outbound into the VNet; cheaper.
3. **Internal VNet mode + Application Gateway (WAF) in front** — most secure, common enterprise pattern.

Often forgotten: **private DNS zone** linked to APIM's VNet, **NSG rules** for APIM management ports, **disable public access** on the backend.

**Live example (Wells Fargo):** "Employee-only apps → APIM in **Internal mode**, reached over ExpressRoute. If public exposure were needed: App Gateway WAF → internal APIM."

### Q5. How do you deploy APIM across multiple regions on a budget?

Built-in multi-region = **Premium only**, each extra region = a full unit (~$2,800/month). Management plane lives **only in the primary region**; secondary gateways keep serving with their last config if primary fails.

| Option | Trade-off |
|---|---|
| Single region + zone redundancy | Survives a datacenter, not a region |
| Two independent **Standard v2** + **Front Door** | Much cheaper; you own config sync (APIOps); rate-limit counters not shared |
| Premium active-passive (secondary at 1 unit) | Built-in sync; scale up on failover |
| Premium active-active | Best, most expensive |

Cost levers: tier by SLO, small secondary, **self-hosted gateway** for on-prem/edge.
**Line:** "Start from SLO and RTO, then pick the cheapest option that meets them."

### Q6. What is Azure Front Door?

Global entry point at Microsoft's edge: global load balancing + failover, TLS at the edge, WAF, CDN caching, path routing, Private Link to origins (Premium). Traffic Manager = DNS only; App Gateway = regional. See [Part 3](#part-3--front-door-deep-dive).

---

## Part 3 — Front Door Deep Dive

**Front Door vs Azure CDN:** Azure CDN was a separate caching product (Microsoft, Verizon/Edgio, Akamai flavours). Akamai and Edgio are retired; CDN (classic) is being retired too. **Front Door Standard/Premium is now Azure's CDN + global load balancer + WAF.**

**What:** Global entry point on Microsoft's edge network. Analogy: a chain of reception desks in every city with a private express road to head offices.

**Request flow:**
1. DNS CNAME → Front Door endpoint.
2. **Anycast** → nearest edge (PoP).
3. **TLS terminated at the edge** (split TCP).
4. **WAF** inspection.
5. **Route** match (domain + path).
6. **Cache** check — hit returns from the edge.
7. **Origin selection:** priority → health → latency → weight.
8. Forward over the **Microsoft backbone** (Private Link with Premium).

**Building blocks:** Profile, Endpoint, Route, Origin group, Origin, Health probe, Rule set, WAF policy.

**Routing:** Priority (active-passive), latency sensitivity (active-active nearest), weighted (canary), session affinity (avoid if stateless).

**All features:**
- Routing: anycast, latency/priority/weighted, health probes, failover in seconds, path routing, multi-site.
- Performance: edge TLS, backbone, connection reuse, HTTP/2, IPv6, compression.
- CDN: caching, query-string options, purge.
- Security: WAF (custom rules, geo-filter, rate limit; managed OWASP + bot protection on Premium), edge DDoS, Private Link (Premium), free managed certs, HTTPS redirect, min TLS.
- Rules engine: redirects, rewrites, headers, conditions (device, country, path, cookie).
- Observability: access/health/WAF logs, metrics (latency, cache hit ratio, origin health).

**Standard vs Premium:**

| | Standard | Premium |
|---|---|---|
| CDN, global LB, rules engine | ✅ | ✅ |
| WAF custom rules | ✅ | ✅ |
| WAF managed OWASP rules + bot protection | ❌ | ✅ |
| Private Link to origins | ❌ | ✅ |

**Timeline:** public preview Sept 2018 → GA April 2019 (now "classic") → Standard/Premium preview 2021, **GA March 2022** → **classic retires 31 March 2027**. Built on the edge platform Microsoft ran internally for its own services.

**Stop bypass:** Private Link + public access off (best), or service tag `AzureFrontDoor.Backend` **plus** check `X-Azure-FDID` = your profile ID.

**Caching:** cache hashed Angular bundles long, `index.html` short; never cache user-specific responses; purge on deploy.

**Pricing (approx.):** base fee per profile (~$35 Standard / ~$330 Premium per month) + requests (~$0.01 per 10k) + **edge → user data** (~$0.08/GB, usually the biggest item) + origin → edge (~$0.02/GB). Managed WAF included in Premium.
Example: 50M requests, 5 TB out, 70% cache hit, Premium ≈ **$800–850/month**.
Levers: higher cache hit ratio, compression, one profile for many apps, Premium only when needed — Premium can replace a regional App Gateway WAF.

**Failures:** region down → probes fail over in seconds; slow origin → latency routing, 60 s default origin timeout (go async); attack → WAF + DDoS; Front Door itself has had global incidents → low DNS TTL + tested fallback runbook; bad rule → IaC, Detection mode before Prevention.

**Live example (Capital Access):** SPA through Front Door, static bundles cached, WAF at edge, `/api/*` → APIM.
**TJX design:** one Front Door Premium profile; `/static/*` → Blob, `/api/*` → APIM in two regions (active-active latency); WAF + bot + rate limit per store range; **weighted routing for pilot-store canary rings**; Private Link to all origins.

**Interview Qs:**
- *Front Door vs Traffic Manager vs App Gateway?* Global L7 proxy vs global DNS vs regional L7 in VNet.
- *How fast is failover?* Seconds — clients stay on the same edge, only the origin choice changes.
- *Single point of failure?* Resilient but has had incidents; tier-0 systems keep a tested DNS fallback.

---

## Part 4 — Application Gateway Deep Dive

**What:** A **regional Layer 7 load balancer + optional WAF**, in a **dedicated subnet in your VNet**, with a public and/or private frontend IP. Analogy: the security desk inside one office building, routing visitors to floors.

**Flow:** frontend IP → **listener** (IP + port + protocol + host) → TLS decrypt (cert from Key Vault) → **WAF** → **routing rule** (basic or path-based) → **rewrite** → **backend settings** (port, protocol, re-encrypt, timeout **20 s default**, host header, affinity) → healthy backend.

**Building blocks:** Frontend IP, Listener (multi-site), Routing rule, Backend pool (VMs, VMSS, App Service, IP/FQDN, AKS, APIM), Backend settings, Health probe, WAF policy, Rewrite set.

**Features:** path routing, multi-site, redirects, header/URL rewrite, TLS termination, end-to-end TLS, **mTLS**, WAF (OWASP/DRS, bot, custom/geo/rate rules), autoscale, zone redundancy, connection draining, cookie affinity, HTTP/2, WebSockets, custom error pages, Private Link, **AGIC** and **Application Gateway for Containers** for AKS.

**SKUs and cost (approx.):** v1 retired (2026) — don't propose it. **Standard_v2** ≈ $0.25/hr (~$180/month) and **WAF_v2** ≈ $0.44/hr (~$320/month) fixed + **capacity units**, **per region**. Typical WAF_v2 ≈ $350–700/month/region. v2 GA ~2019.

**Use when:** internal APIM needs a public entry; internal-only L7 routing (stores over ExpressRoute); AKS ingress with WAF; client **mTLS**; single-region apps.
**Skip when:** Front Door Premium reaches origins over Private Link — a second WAF adds cost, latency and config drift.

**Failures:**

| Problem | Cause → fix |
|---|---|
| **502** | Probe failing, NSG blocking, host header mismatch with App Service, cert mismatch |
| **504** | Backend slower than 20 s → raise timeout or go async |
| Region down | Front Door fails over |
| Subnet issues | Dedicated subnet, /24 for v2, allow GatewayManager ports |
| WAF false positives | Detection mode → tune exclusions → Prevention |

**Why not:** Load Balancer (L4 only), Front Door alone (not a private in-VNet entry, no regional client mTLS), NGINX ingress (self-managed, no managed WAF), Traffic Manager (DNS only).

---

## Part 5 — APIM: Tiers, Versions, Gateway Types

**Tiers (approx.):**

| Tier | ≈ / month | Notes |
|---|---|---|
| Consumption | per call | Serverless, cold start, limited features |
| Developer | ~$50 | No SLA, full features — dev/test only |
| Basic / Standard (classic) | ~$150 / ~$700 | No VNet injection |
| **Premium** (classic) | ~$2,800 per unit | VNet injection, multi-region, AZ, self-hosted gateway |
| Basic v2 / Standard v2 | ~$150 / ~$700 | Fast provisioning; Standard v2 has outbound VNet integration |
| Premium v2 | newer | VNet injection on v2 — verify multi-region support |

**Version vs revision:** version = new contract consumers opt into (breaking change, side by side); revision = safe change inside a version, test on `;rev=N`, make current, instant rollback.

**Other features:** backends with **circuit breaker** and load-balanced pools; built-in or **external Redis** cache; **self-hosted gateway**; **workspaces** for team isolation; **AI gateway** (token rate limits, semantic caching, token metrics, model load balancing); REST, SOAP, GraphQL, WebSocket.

**Developer portal — what is it and why use it?**

**What:** An auto-generated, customisable **website for API consumers** that comes with every APIM instance (not in Consumption tier). It reads the APIs, products and OpenAPI definitions you already configured, so docs stay in sync with what the gateway serves. Analogy: the gateway is the shop counter, the developer portal is the shop's catalogue and help desk.

**What consumers do there:**
1. **Discover** APIs and products (e.g. "Store Ops APIs", "Partner Orders API").
2. **Read docs** generated from OpenAPI — operations, request/response schemas, examples.
3. **Try it** — a built-in console to make real calls with their key or token.
4. **Sign up and subscribe** — get subscription keys for a product, self-service or with admin approval.
5. **See their own usage** — call counts, quota.

**What admins control:** who sees which products (groups: anonymous, registered, internal), sign-in via **Entra ID / Entra External ID**, approval flows for subscriptions, branding and custom pages (visual editor, or self-host the open-source portal for heavy customisation), custom domain.

**Why it matters:** fewer support tickets ("what's the endpoint, what's the payload?"), faster **partner/vendor onboarding**, one source of truth for API contracts, and **governance** — no key without a subscription, visible usage per consumer.

**When it's less useful:** purely internal service-to-service APIs with no external consumers — then API Center or a Git-based catalogue may be enough; you can disable the portal.

**TJX tie-in:** vendors, logistics partners and internal store-app teams self-onboard to StoreWeb APIs: read docs, test in sandbox, request a key under a "Partner" product with lower rate limits than internal products.

**Interview line:** "The developer portal is APIM's self-service website for API consumers — generated docs from OpenAPI, a try-it console, and self-service subscription keys, with access controlled by groups and Entra ID. It turns API onboarding from a ticket-driven process into self-service, while keeping governance at the gateway."

**Gateway types:**

| Type | Runs | Use |
|---|---|---|
| Managed | Azure | Normal cloud APIs |
| **Self-hosted** | Your container (on-prem, edge, stores) | Local traffic, central management — **in-store APIs that survive WAN loss** |
| Workspace | Dedicated per workspace | Team isolation |

**History:** Microsoft acquired Apiphany (2013) → APIM preview 2013, GA 2014; v2 tiers GA ~2024.

**Failures:** region down → edge fails over; backend failing → circuit breaker, retry safe GETs, clean `on-error`; one consumer flooding → per-key 429; bad policy → APIOps + revision rollback; Premium primary down → other gateways keep serving last config.

**Three layers together:**

| Layer | Scope | Job | Doesn't do |
|---|---|---|---|
| Front Door | Global | Edge, failover, CDN, WAF | Per-consumer API rules |
| App Gateway | Regional, in VNet | Private entry, L7 routing, WAF, mTLS | Global failover, API products |
| APIM | API layer | Who, how often, which version, transform | Global failover, CDN |

**TJX StoreWeb design:** Front Door Premium → App Gateway WAF_v2 per region (only if APIM is internal or for store-device mTLS) → APIM in two regions with Strangler-Fig routing → self-hosted gateway in stores for offline resilience.

---

## Part 6 — Confusing Pairs: API Gateway vs APIM vs App Gateway

**API Gateway vs APIM:** API Gateway is a **pattern** (one entry point for many services). Implementations: YARP/Ocelot (in code), Kong/NGINX/Envoy (software), Azure APIM / AWS API Gateway / Apigee (managed). **APIM = gateway + management plane + developer portal + analytics.** The gateway is the runtime part *inside* APIM. Every APIM has a gateway; not every gateway is APIM.

**App Gateway vs API Gateway:**

| | Application Gateway | API Gateway (APIM) |
|---|---|---|
| Question it answers | Which **server**? Is it an attack? | **Who** is calling, allowed, **how often**, **which version**? |
| Identity checks | ❌ (only client certs) | ✅ JWT, claims, keys |
| Per-consumer rate limits | ❌ (IP-based WAF rules only) | ✅ per user/tenant/product |
| Transformation | Headers/URL | Full body, XML↔JSON |
| Versioning, portal | ❌ | ✅ |
| WAF | ✅ | ❌ |
| Load balancing, probes | ✅ core | Limited |
| Layer | Network/web traffic | Application/API |

**Together:** Internet → App Gateway (WAF) → APIM gateway (auth, quota, version) → backend.

**Line:** "Application Gateway is a regional L7 load balancer with a WAF. An API gateway like APIM is API-aware — tokens, quotas, versions, transformation — but isn't a full WAF. Hence App Gateway WAF in front of internal APIM."

---

## Part 7 — TJX Question Bank (basics + scenarios)

→ marks what the interviewer is testing.

### APIM
**Basics**
1. What are the main parts of APIM, and what does each do?
2. What is the difference between an API version and a revision?
3. What are products and subscriptions?
4. In what order do policies run, and how does inheritance work?
5. What is the difference between Internal and External VNet mode?
6. How do you choose between Consumption, Standard v2 and Premium?

**Scenarios**
7. How would you use APIM to move StoreWeb traffic from the monolith to new services gradually without stores noticing? → Strangler-Fig per route, rollback by flipping, unchanged URLs.
8. One region's POS integration sends 10× calls because of a retry bug and other stores slow down. What do you do now and long term? → rate-limit-by-key per store, 429 + Retry-After, circuit breaker, client backoff with jitter.
9. How do you roll out a breaking Order API change when 1,000 stores update on different schedules? → new version side by side, usage per version, deprecation timeline, sunset header.
10. Stores lose WAN a few times a month. Can APIM help keep in-store operations running? → self-hosted gateway, local backends, sync on reconnect.
11. How do you manage APIM config across environments for 40 APIs and 8 teams? → APIOps/IaC, Git, workspaces, Key Vault named values.

### App Service / AKS
**Basics**
1. When would you host a Web API on App Service instead of AKS?
2. How do deployment slots give zero-downtime releases?
3. How does autoscaling work in App Service and in AKS (HPA, cluster autoscaler, KEDA)?
4. How does an App Service or an AKS pod use a managed identity (workload identity)?
5. What is the difference between AKS, Container Apps and Container Instances?

**Scenarios**
6. Where would you host 12 StoreWeb microservices, some simple CRUD and two high-throughput inventory processors? → fit hosting to workload, team skills, ops cost.
7. After a release, Inventory API p95 went from 200 ms to 2 s. How do you find the cause? → App Insights, deploy markers, KQL, query plans, SNAT exhaustion, roll back first.
8. Black Friday is in 3 weeks. How do you make sure the hosting layer survives 10× traffic? → load test, pre-scale, minimum instances, zones, downstream bottleneck, degradation.
9. Pods crash with OOMKilled under load. Cause and fix? → requests vs limits, leaks, GC, right-sizing, probes.
10. How do you release with zero downtime and instant rollback? → slots/swap, rolling/blue-green/canary, health checks, feature flags.

### Azure Functions
**Basics**
1. What are triggers and bindings?
2. Compare Consumption, Flex Consumption, Premium and Dedicated plans.
3. What is cold start and how do you reduce it?
4. What are Durable Functions, and why must orchestrators be deterministic?
5. In-process or isolated worker — which today and why? (In-process support ends 10 Nov 2026.)

**Scenarios**
6. 1,000 stores upload nightly sales files to Blob. Design processing that finishes by 6 am and survives failures. → Event Grid → queue → Function, idempotent per file, Durable fan-out, DLQ, deadline monitoring.
7. A Service Bus-triggered Function sometimes processes a message twice and duplicates inventory adjustments. Why and how to fix? → at-least-once, lock expiry, idempotent handler, lock renewal.
8. A price-update Function hits the plan time limit on large batches. Options? → split work, Durable fan-out, Premium/Flex, container.
9. When would you NOT use Functions? → steady high load, long-running stateful, latency-critical with cold start.

### Service Bus / Event Grid
**Basics**
1. Queue vs topic — when do you use each?
2. What is the difference between Service Bus, Event Grid and Event Hubs?
3. What is peek-lock vs receive-and-delete?
4. What is a dead-letter queue, and when does a message land there?
5. What are sessions and how do they guarantee ordering?
6. How does duplicate detection work, and what are its limits?

**Scenarios** (model answers in [Part 8](#part-8--service-bus-scenario-model-answers))
7. A store sale must reach inventory, loyalty, analytics and replenishment. Design the messaging.
8. Price updates must be applied in order. How do you guarantee it?
9. The order queue backlog grew from 0 to 500,000 in an hour on Black Friday. What do you check and do?
10. A malformed message keeps failing and blocks a session. How do you handle poison messages?
11. A payload grew from 5 KB to 5 MB. What breaks and how do you fix it?
12. How do you update the DB and publish an event without losing one if the service crashes in between?
13. Event Grid or Service Bus for "new product image uploaded"?

### Azure SQL
**Basics**
1. DTU vs vCore; when serverless or Hyperscale?
2. What is the difference between geo-replication and auto-failover groups?
3. What isolation levels exist, and what is RCSI?
4. How do you connect to Azure SQL without a password?
5. How do you find slow queries (Query Store, Intelligent Insights)?

**Scenarios**
6. Legacy StoreWeb SQL Server is on-prem and other apps still write to it. How do you migrate without a big bang? → **the CDC story** (initial load, one-way CDC, reconciliation, flip writes, reverse sync, rollback).
7. A 50 ms query now takes 8 s after a deploy and CPU is 100%. What do you do? → Query Store regression, parameter sniffing, missing index, force last good plan.
8. Deadlocks between inventory reservation and order creation at peak. Investigate and prevent? → deadlock graphs, lock ordering, short transactions, RCSI, indexes, retry on 1205.
9. Catalogue reads are crushing the primary. Options? → read scale-out, Redis cache-aside, CQRS read models, edge caching.
10. What happens to the app during a SQL failover to the secondary region? → failover group listener, transient retry, RPO/RTO, async replication data loss.

### Cosmos DB
**Basics**
1. What is a partition key and what makes a good one?
2. What is an RU, and what happens when you exceed provisioned RUs?
3. Explain the five consistency levels.
4. What is the change feed and what would you use it for?
5. Provisioned vs autoscale vs serverless?

**Scenarios**
6. Model store inventory: 1,000 stores × 500,000 SKUs, frequent updates, queries by store and by SKU. → key choice, hierarchical keys, hot partitions, change feed second view.
7. 429s while total RU usage is only 30%. Why? → hot partition; better or synthetic key.
8. When Cosmos DB over Azure SQL for StoreWeb, and when not? → document/key-value at scale vs relational transactions.
9. Two stores update the same inventory item at once. How do you prevent a lost update? → ETag optimistic concurrency, 412 retry, transactional batch.
10. The Cosmos DB bill tripled. How do you investigate? → RU per op, cross-partition queries, indexing policy, autoscale max, multi-region writes, TTL.

### Cross-service architecture scenarios
1. Design the StoreWeb order and inventory flow on Azure end to end, POS to warehouse.
2. A store sells the last unit online and in-store at the same moment. How does your design handle it?
3. "I paid but my order is stuck" — walk through the investigation across 10 services.
4. East US goes down at 7 pm on Black Friday. What happens, step by step?
5. How do stores keep selling during a 2-hour internet outage? (**known gap** — store-and-forward, local DB/queue, idempotent sync, conflict rules)
6. How do you secure everything so no backend is public and there are no secrets in config?

---

## Part 8 — Service Bus Scenario Model Answers

### SB1. Fan-out: one sale, many consumers

**Idea:** one fact, many interested teams → **publish/subscribe** with a **topic and subscriptions**.

**Say this:** "POS publishes one **`ItemSold` event** to a topic. Inventory, loyalty, analytics and replenishment each get their **own subscription** — own copy, own retries, own **DLQ**. If loyalty is down for an hour, inventory keeps working. **Correlation filters** (cheaper than SQL filters) give each consumer only what it needs. The publisher doesn't know who listens — a new fraud service is just a new subscription. I separate **events from commands**: `ItemSold` is a fact → topic; 'reserve 5 units for order 123' is a command with one owner → queue."

**Points:** event carries enough data (store, SKU, qty, timestamp, eventId, version); all consumers idempotent; very high-volume analytics may fit Event Hubs better.
**Follow-ups:** Why not direct calls? → coupling, POS slowed by consumers. Limit? → up to 2,000 subscriptions per topic.
**Live example:** Capital Access fanned out ownership/profile changes through Service Bus topics.

### SB2. Ordered price updates

**Idea:** parallel consumers and retries can reorder messages → deliver in order per item **and** reject stale updates.

**Say this:** "Two layers. **Sessions** with `SessionId = storeId + SKU` give FIFO per key while different SKUs run in parallel. And the **handler checks a version or effective timestamp** — a conditional update that applies only if newer. Retries, DLQ resubmits or late upstream sends can still reorder, so sessions give order in the normal case and the version check makes it correct in every case."

**Retail nuance:** future-dated markdowns → store the effective date or use **scheduled messages**.
**Follow-ups:** session downsides → a stuck session blocks only that SKU, must be enabled at creation, hot-session risk. Event Grid? → no ordering.

### SB3. 500,000-message backlog on Black Friday

**Say this:**
1. **Working but slow, or broken?** Compare incoming vs completed, check DLQ count and exceptions. Failing and retrying = bug/poison, not capacity.
2. **Real bottleneck?** Usually downstream — SQL at 100%, Cosmos 429s, payment provider limits. More consumers make it worse.
3. **Act:** consumer-bound → scale out (Functions auto, **KEDA** on AKS, MaxConcurrentCalls, prefetch, Premium messaging units). Downstream-bound → cap concurrency, scale the DB, let the queue absorb. Prioritise order confirmation, pause analytics.
4. **Communicate:** honest "Processing your order" status.

**Afterwards:** alert on **queue age, not just length**; load test before peak.
**Metrics:** Active, Dead-lettered, Incoming vs Completed, Server Errors, Throttled Requests, Premium CPU/Memory, oldest-message age.

### SB4. Poison messages blocking a session

**Say this:** "Three layers. **Automatic:** after **MaxDeliveryCount** (default 10) the message goes to the **DLQ**. **Smarter:** separate **transient** errors (retry with backoff) from **permanent** ones (validation, unknown SKU) and **dead-letter immediately with a reason**, so a session isn't blocked for 10 attempts. **Operations:** alert on DLQ > 0, runbook + tooling to inspect, fix and **resubmit** (safe because handlers are idempotent), and fix the root cause upstream with schema validation or contract tests. For longer retry waits, schedule a retry message instead of abandoning."

**Follow-ups:** other DLQ reasons → expired messages (if enabled), header size, filter errors. Why does a session block? → FIFO within the session.

### SB5. Message grew from 5 KB to 5 MB

**Say this:** "**Standard caps messages at 256 KB**, so sends fail. **Premium** allows up to 100 MB, but big messages cut throughput, raise memory and cost, lengthen locks, and get copied per subscription. Fix: **claim-check** — upload the payload to **Blob**, send a small message with the reference plus key metadata and a checksum; the consumer fetches only if needed, using managed identity or a short-lived SAS; a lifecycle policy cleans up. The real lesson is governance: schema and size checks in CI, message contracts treated like API contracts."

**Follow-up:** just upgrade to Premium? → treats the symptom.

### SB6. DB write + publish without losing either (outbox)

**Idea:** the **dual-write problem** — DB and Service Bus share no transaction.

**Say this:** "**Transactional outbox.** In the same DB transaction, write the business change **and** an outbox row. A **relay** (worker, timer Function or CDC on the outbox table) publishes unpublished rows and marks them sent. A crash between publish and mark means republishing, so it's at-least-once — consumers are idempotent, and `MessageId = outbox row ID` lets **duplicate detection** drop repeats within its window. In Cosmos DB the **change feed** is a built-in outbox; in SQL Server, **CDC** reads the transaction log — the same principle I used for Wells Fargo legacy/new sync."

**Follow-ups:** 2PC? → not practical across SQL and Service Bus, hurts availability. Ordering? → publish in outbox sequence, `SessionId = aggregate ID`. Inbox pattern? → consumer records processed IDs in the same transaction as its change.

### SB7. Event Grid or Service Bus for image upload?

**Idea:** Event Grid = doorbell (notify). Service Bus = managed to-do list (process reliably).

**Say this:** "**Event Grid** is the natural trigger — Blob emits **BlobCreated** natively, filtered by container and extension. It retries delivery for up to **24 hours**, and **dead-lettering to storage is off by default** — turn it on. If processing must be reliably tracked (resize, scan, catalogue update) with controlled concurrency and a monitored DLQ, route **Event Grid → Service Bus queue → processor**. Processor idempotent on **blob name + ETag**."

**One-liners:** Event Grid = reactive notifications, push, no ordering. Service Bus = business commands, sessions, transactions, DLQ. Event Hubs = high-volume fact streams, partitions, replay.

### Cross-cutting Service Bus lines
1. "Assume every message arrives twice" — idempotent consumers, always.
2. "Queue age, not queue length."
3. "Dead-letter queues need owners" — alerts + resubmit runbook.
4. "Command or event?" — queue for one owner, topic for many listeners.
5. "Small messages" — claim-check for anything big.
6. "Security" — managed identity with Service Bus Data Sender/Receiver roles, no SAS connection strings, Premium + private endpoint.

---

## Part 9 — Model Answers for the Full Question Bank

Short, sayable answers for every question in [Part 7](#part-7--tjx-question-bank-basics--scenarios). Service Bus scenarios are in [Part 8](#part-8--service-bus-scenario-model-answers).

### 9.1 APIM answers

**B1. Main parts of APIM?** Gateway (runtime for every call, runs policies), management plane (define APIs, products, policies — portal/REST/IaC), developer portal (consumer docs, try-it, keys). Plus analytics into App Insights / Azure Monitor.

**B2. Version vs revision?** Version = new contract consumers opt into (`/v2`), for breaking changes, lives side by side. Revision = non-breaking change inside a version, tested on `;rev=N`, made current, instant rollback.

**B3. Products and subscriptions?** A product bundles APIs with rules for a consumer group (e.g. "Store Apps" 1,000 calls/min, "Partners" 100 calls/min). A subscription gives one consumer a key to a product — so you can see, limit and cut off each consumer independently.

**B4. Policy order and inheritance?** Inbound → backend → outbound → on-error. Scopes global → product → API → operation; each lower scope decides where the parent's rules run by placing `<base/>`. Shared rules (CORS, header stripping) at global; auth at product/API; validation at operation.

**B5. Internal vs External VNet mode?** Both put APIM inside a VNet subnet so it can reach private backends. External: gateway has a **public** IP. Internal: **only a private** IP — reachable from the VNet, peered VNets or on-prem over ExpressRoute/VPN; put App Gateway WAF in front for public access.

**B6. Consumption vs Standard v2 vs Premium?** Consumption: low/bursty traffic, pay per call, cold start, fewer features. Standard v2: most production workloads, outbound VNet integration, sensible cost. Premium: VNet injection (internal mode), multi-region, availability zones, self-hosted gateway — justify by requirement (~$2,800/unit/month).

**S7. Strangler-Fig with APIM.** "Put APIM in front of the monolith first with zero behaviour change — every route forwards to legacy. Then move one route at a time: `/stores/{id}/inventory` → new Inventory service via `set-backend-service`, everything else still to legacy. Stores keep the same URL. Start with read-only, low-risk routes, compare responses in shadow mode if possible, then flip writes once the data sync is proven. Rollback is reverting one routing rule. Eventually the monolith has no routes left and is retired."

**S8. One region's POS floods APIM.** "Right now: `rate-limit-by-key` on store or client ID, returning **429 with Retry-After**, so the faulty client is throttled and other stores are protected; the backend **circuit breaker** sheds load if needed. Long term: fix the client — exponential backoff with **jitter**, idempotency keys so retries are safe, a retry cap. Alert on per-client call rate, and set per-product quotas so no consumer group can take all capacity."

**S9. Breaking change for 1,000 stores.** "Publish **v2 alongside v1** — never change v1 in place. Track **usage per version** in APIM analytics. Announce a deprecation timeline, return `Deprecation`/`Sunset` headers on v1, roll store software by rings (pilot → region → all). Retire v1 when traffic reaches zero. Better still, make the change additive and avoid a new version."

**S10. Stores lose WAN.** "APIM's **self-hosted gateway** can run as a container in the store or a regional hub, routing local calls to local services with its last config while the cloud link is down, and syncing config and logs when it returns. The gateway is only part of it — the store also needs local data and a store-and-forward queue so sales are captured offline and synced idempotently."

**S11. APIM config at scale.** "**APIOps**: APIM config in Git, one folder per API, policies as files, deployed by pipeline dev → QA → prod with environment values in **named values** linked to **Key Vault**. Teams own their API folders (CODEOWNERS); a platform team owns global policies. **Workspaces** isolate teams inside one instance. Nobody edits prod in the portal — the pipeline overwrites drift."

### 9.2 App Service / AKS answers

**B1. App Service vs AKS?** App Service: PaaS — deploy code or a container, Microsoft runs the platform; slots, autoscale, easy auth; best for standard web APIs and small teams. AKS: full Kubernetes — control over networking, sidecars, scheduling, many services; you own upgrades, node pools and policies. App Service (or Container Apps) by default; AKS when you need its control and have the team to run it.

**B2. Deployment slots?** A slot is a live copy of the app with its own hostname. Deploy to staging, warm up and test, then **swap** — production gets the warmed instances with no restart. Rollback = swap back. Mark environment-specific config as **slot settings**. Standard tier or above.

**B3. Autoscaling?** App Service: scale-out rules (CPU, memory, queue length, schedule) or automatic scaling. AKS: **HPA** adds pods on CPU/memory/custom metrics; **cluster autoscaler** adds nodes when pods can't be scheduled; **KEDA** scales on event sources like Service Bus depth, including to zero.

**B4. Managed identity?** An Entra ID identity Azure manages for a resource — no secrets. App Service: enable system- or user-assigned identity, grant RBAC roles, SDK uses `DefaultAzureCredential`. AKS: **workload identity** — a Kubernetes service account federated with a user-assigned managed identity; the pod's token is exchanged for an Entra token. (Pod identity is deprecated.)

**B5. AKS vs Container Apps vs ACI?** AKS: full Kubernetes, most control, most ops. Container Apps: serverless containers on managed Kubernetes with KEDA scaling, scale to zero, revisions, Dapr — microservices without running a cluster. ACI: one container quickly, no orchestration — batch jobs, build agents, burst capacity.

**S6. Hosting 12 StoreWeb services.** "Simple CRUD APIs → **App Service** or **Container Apps**: low ops, slots/revisions, autoscale. The two high-throughput inventory processors → **Container Apps with KEDA** on Service Bus depth, or **AKS** if we need fine control (node pools, sidecars, network policy) or already run AKS with a platform team. Background jobs → Functions. Not everything on AKS just for uniformity — workload shape, team skills and ops cost decide."

**S7. p95 200 ms → 2 s after release.** "If customers are hurting, **roll back** first (swap back). Then App Insights: app or **dependency**? Compare around the **deploy marker**; open slow **end-to-end transactions** to see which call grew. Usual suspects: new N+1 query or missing index (Query Store), a chatty new external call, **SNAT port exhaustion** from `HttpClient` per request, sync-over-async thread starvation, a cache disabled by config. Confirm with KQL on `requests`/`dependencies`, fix, add a performance test to the pipeline."

**S8. Black Friday in 3 weeks.** "Load test at **2–3× expected peak** with a realistic mix; find the first bottleneck (usually DB or an external provider). **Pre-scale** — reactive autoscale is too slow for 10× in minutes. Minimum instances, zone redundancy, scheduled scale rules. Cache catalogue at Front Door and Redis; queue non-critical work. **Graceful degradation**: switch off recommendations before checkout suffers. Change freeze the week before; war-room runbook with dashboards and rollback steps."

**S9. OOMKilled pods.** "The container exceeded its memory **limit**. Check: limit vs real usage over time; a **leak** (steady growth — dump and profile); .NET GC settings in containers; large payloads loaded fully into memory (stream them). Fix: right-size **requests and limits**, fix the leak, stream data, and scale on a metric that rises before memory runs out."

**S10. Zero downtime + instant rollback.** "App Service: **staging slot**, warm-up and smoke test, **swap**; rollback = swap back. AKS: **rolling update** with readiness probes and `maxUnavailable: 0`, or **blue-green**, or **canary** with metrics. Backward-compatible DB changes (expand/contract). **Feature flags** separate deploy from release, so most rollbacks are a flag flip."

### 9.3 Azure Functions answers

**B1. Triggers and bindings?** Trigger = the one event that starts the function (HTTP, timer, Service Bus, Blob, Event Grid, Cosmos change feed). Bindings = declarative input/output connections without client code.

**B2. Plans?** Consumption: scale to zero, pay per execution, cold start, ~10 min max. **Flex Consumption**: scale to zero + always-ready instances, VNet integration, fast per-function scaling — the modern serverless default. Premium: always-ready + pre-warmed, VNet, long runs, per core-hour. Dedicated: an App Service plan you already pay for; Always On; predictable cost, no event-driven scale.

**B3. Cold start?** Delay on the first call after idle while a host starts. Reduce with always-ready (Flex/Premium), Always On (Dedicated), light startup, reused clients, isolated worker + ReadyToRun, or async design where it doesn't matter.

**B4. Durable and determinism?** The orchestrator is **replayed** from history on each wake-up, so it must make the same decisions every time — use the context's current time instead of `DateTime.Now`, no random, no direct I/O (activities do that).

**B5. In-process vs isolated?** **Isolated worker**: own process, choose the .NET version independently of the host, full middleware and DI, where Microsoft invests. In-process support ends **10 November 2026**, so migrate now.

**S6. Nightly sales files from 1,000 stores.** "Stores upload to Blob (SAS per store path). **Event Grid BlobCreated** → **Service Bus queue** (reliable, DLQ) → Function that validates and loads each file, idempotent per file (name + ETag in a processed table). Large files → **Durable fan-out** over chunks. A **timer Function at 5 am** checks missing or failed stores and alerts before the 6 am deadline. Failed files land in the DLQ with a reason for fix-and-resubmit."

**S7. Duplicate inventory adjustments.** "Service Bus is **at-least-once**. Usual cause: processing took longer than the **message lock**, it expired, another instance got the message, both applied it — or a crash after the DB write but before completing. Fix: an **idempotent** handler that records the MessageId/adjustment ID in the same DB transaction and skips repeats; raise `maxAutoLockRenewalDuration` above worst-case time; keep processing short."

**S8. Price Function hits the time limit.** "Split the batch into one message per chunk; or a **Durable orchestration** fanning out over chunks; or **Premium/Flex** for longer timeouts. If it's really a long batch job, a **container job** (Container Apps Jobs) fits better."

**S9. When not to use Functions?** Steady high-throughput APIs (App Service/containers cheaper, no cold start), long-running stateful processes, latency-critical paths on Consumption, custom OS/runtime or heavy native dependencies, and HTTP calls longer than the ~230-second front-end limit.

### 9.4 Service Bus basics answers

**B1. Queue vs topic?** Queue: one consumer processes each message — commands. Topic: every subscription gets a copy — events.

**B2. Service Bus vs Event Grid vs Event Hubs?** Service Bus: reliable business messaging — locks, sessions, transactions, DLQ. Event Grid: lightweight push notifications, many Azure sources, no ordering. Event Hubs: high-volume fact streams, partitions, consumer groups, replay by offset.

**B3. Peek-lock vs receive-and-delete?** Peek-lock: message locked (default 1 min, max 5 min) while processing; complete, abandon or dead-letter; a crash means redelivery — at-least-once. Receive-and-delete: removed on receipt; a crash loses it — at-most-once, only for data you can lose.

**B4. Dead-letter queue?** Sub-queue for messages that can't be processed: delivery count over **MaxDeliveryCount** (default 10), TTL expired (if enabled), filter errors, or explicitly dead-lettered with a reason. Never processed automatically — needs alerts and a resubmit process.

**B5. Sessions?** Same **SessionId** → FIFO delivery to one consumer at a time holding a session lock; different sessions in parallel. Enabled at creation; also provides per-session state.

**B6. Duplicate detection?** Service Bus remembers **MessageIds** for a window (default 10 minutes, up to 7 days) and drops repeats. Enabled at creation, Standard/Premium. Limits: only the same MessageId, only within the window, only on send — consumers must still be idempotent.

### 9.5 Azure SQL answers

**B1. DTU vs vCore, serverless, Hyperscale?** DTU: bundled fixed sizes, simple, small workloads. vCore: cores and storage chosen separately, Azure Hybrid Benefit — production default. Serverless (vCore General Purpose): auto-scales and **auto-pauses** — dev or intermittent use. **Hyperscale**: very large databases, fast scale and backups, read replicas.

**B2. Geo-replication vs failover groups?** Geo-replication: per database, readable secondaries, manual failover, connection strings change. **Auto-failover groups**: databases fail over **together** behind **listener endpoints** (read-write, read-only) that follow the primary — no connection-string change; automatic or manual. Use failover groups for app-level DR.

**B3. Isolation levels and RCSI?** Read uncommitted, read committed, repeatable read, snapshot, serializable. **RCSI** lets read-committed readers see the last committed row version instead of waiting on writers' locks — readers and writers don't block each other. **On by default in Azure SQL Database.**

**B4. No-password connection?** **Managed identity + Entra authentication**: contained DB user `FROM EXTERNAL PROVIDER` for the app identity, least-privilege roles, `Authentication=Active Directory Default` in the connection string.

**B5. Finding slow queries?** **Query Store** (on by default): top queries, plan history, regressions, forced plans. Intelligent Insights / database watcher, **automatic tuning** (force last good plan, index suggestions), DMVs for live waits and blocking, App Insights dependency timings.

**S6. Migrating legacy StoreWeb SQL without a big bang (CDC story).** "Phase 1: initial bulk load into Azure SQL. Phase 2: **SQL Server CDC** on legacy tables — reads the transaction log, so it captures every committed change including writes from apps we don't own, in commit order, with no legacy code change. A sync process reads change tables by **LSN range**, applies **idempotent upserts**, and persists its **LSN watermark**. Legacy stays source of truth; **reconciliation** compares counts and checksums. Phase 3: flip writes to the new service, **reverse the sync** so legacy readers stay current and rollback stays possible, and tag sync-originated writes to prevent echo loops. Cutover in a low-traffic window with a runbook." Full version: [tjx-storeweb-prep.md](tjx-storeweb-prep.md).

**S7. 50 ms → 8 s after deploy, CPU 100%.** "Query Store → **regressed queries**. Plan changed? **Force the last good plan** as a stop-gap. Then the cause: **parameter sniffing**, a new ORM query shape, implicit conversion breaking an index seek, a missing index after a schema change, stale statistics. Real fix: query/index change, `OPTIMIZE FOR` or `RECOMPILE` where justified, update stats; add regression checks to release validation."

**S8. Deadlocks at peak.** "Capture **deadlock graphs** (system_health Extended Events). Typical cause: reservation locks inventory then order, order creation locks order then inventory — **opposite lock order**. Fixes: same access order everywhere, **short transactions** (no external calls inside), covering indexes, RCSI for readers, `UPDLOCK` for read-to-update. The app **retries on error 1205** with backoff."

**S9. Catalogue reads crushing the primary.** "Catalogue is read-heavy and tolerates slight staleness. **Cache** (Redis cache-aside, Front Door for public GETs); **read scale-out** (`ApplicationIntent=ReadOnly` to the replica or read listener); **CQRS read model** projected via CDC/outbox into Cosmos DB or AI Search; then tune remaining queries. Writes stay on the primary."

**S10. During a SQL failover?** "The failover group **listener** moves to the new primary. Connections drop; apps see transient errors for seconds to a minute, so they need **retry logic** (EF Core execution strategy). Replication is **asynchronous**, so the last seconds of writes can be lost — the **RPO**; the grace period sets automatic failover timing (**RTO**). Agree both with the business and rehearse."

### 9.6 Cosmos DB answers

**B1. Partition key?** The field used to spread data and throughput across physical partitions. Good key: **high cardinality**, **even writes**, used in the **most common query** so reads hit one partition. Bad: low cardinality (country) or time-based (today) → hot partitions. Logical partition limit 20 GB.

**B2. RU and exceeding it?** A Request Unit is the normalised cost of an operation (1 KB point read ≈ 1 RU). Exceeding provisioned RU/s returns **429** with a retry-after hint; the SDK retries. Sustained 429s mean more RU, a better key or cheaper queries.

**B3. Consistency levels?** **Strong** (latest; not with multi-region writes) → **Bounded staleness** (lag at most K versions / T time) → **Session** (default; read your own writes) → **Consistent prefix** (never out of order) → **Eventual** (fastest, may be stale). Pick the weakest level that's still correct.

**B4. Change feed?** Ordered log of changes per partition, read with a saved lease position. Uses: second view with a different key, publish events (built-in outbox), update caches/search, trigger Functions. Default mode has no deletes — soft delete or all-versions-and-deletes mode.

**B5. Provisioned vs autoscale vs serverless?** Manual provisioned: steady load, cheapest. Autoscale: 10%–100% of a max — spiky retail peaks. Serverless: pay per RU — dev/test or low intermittent traffic, with limits.

**S6. Inventory model (1,000 stores × 500k SKUs).** "Main container keyed on **storeId**, id = SKU — 'stock of SKU X in store Y' is a cheap **point read**, and writes spread across 1,000 partitions (each well under 20 GB). 'Which stores have SKU X' is cross-partition, so the **change feed** builds a second container keyed on **SKU** — eventually consistent, fine for availability lookups. If a partition grows hot, a **hierarchical key** (storeId → department) splits it."

**S7. 429s at 30% total usage.** "Throughput is split **per physical partition**, so one partition can be at 100% while the total is 30% — a **hot partition** (flagship store, a 'today' key). Check normalised RU by partition key range. Fix with a better or **synthetic key**, hierarchical keys, caching hot reads, cheaper queries. Raising RU blindly wastes money."

**S8. Cosmos vs Azure SQL for StoreWeb?** "Cosmos for high-volume key-value/document access with predictable keys and global distribution: inventory snapshots, carts, device state, read-optimised catalogue views. Azure SQL for relational data needing joins, constraints and multi-table transactions: orders, payments, financial records, reporting. Most systems use both."

**S9. Two stores update the same item.** "**Optimistic concurrency with ETags**: write with `If-Match`; if someone updated first, **412** → re-read, re-apply, retry. **Transactional batch** for related docs in one partition. For hot counters, **patch** with increment and a filter predicate (only if quantity ≥ 1)."

**S10. Bill tripled.** "Check **RU per operation**: new **cross-partition queries**, an **indexing policy** indexing everything (exclude unused paths), bigger documents. Then **autoscale max** too high, **extra regions**/multi-region writes, missing **TTL**, dev accounts on provisioned throughput. Fix the top consumers, then right-size."

### 9.7 Cross-service architecture answers

**X1. StoreWeb order and inventory flow end to end.** "**Edge:** Front Door Premium + WAF → APIM in two regions (token validation, per-store limits, versions). **Store:** POS calls the Order API; local service + queue keep selling offline. **Order API** (App Service/Container Apps) writes the order to **Azure SQL** with an **outbox** row and returns fast. A relay publishes `OrderPlaced` to a **Service Bus topic**: **inventory** (Cosmos DB keyed by storeId, ETag concurrency), **payment**, **loyalty**, **fulfilment/warehouse**, **analytics** each on their own subscription. Failures via a **saga** (Durable Functions) with compensations (release reservation, refund). **Security:** Private Link, managed identity, Key Vault. **Observability:** correlation ID from APIM through every message, App Insights + KQL, alerts on DLQ, queue age, 429s, p95. **Delivery:** IaC, pipelines, canary by store rings."

**X2. Last unit sold online and in-store at once.** "The decrement must be **atomic**: conditional update (ETag/patch with `quantity >= 1` in Cosmos, or `UPDATE … WHERE qty >= 1` in SQL) — the loser gets 'out of stock'. But stores may sell **offline**, so real time isn't always possible; retailers keep a **safety-stock buffer** for online availability and accept a small oversell risk. If oversell happens, the **saga compensates**: cancel or reroute the online order, notify the customer, offer an alternative. Blocking (lost sales) vs allowing (occasional oversell) is a business decision."

**X3. "I paid but my order is stuck."** "Order ID → **correlation ID** → App Insights end-to-end transaction / KQL to find the **last successful step**. Check: message in a **DLQ** with a reason? **Queue age** growing? **429s** or SQL timeouts? Payment call timed out? Fix the cause, **resubmit** (idempotent handlers make it safe), confirm the order moved. Then add a **business alert** (e.g. 'Paid' but not 'Confirmed' after 5 minutes)."

**X4. East US down at 7 pm on Black Friday.** "**Front Door** probes fail → traffic to West US in seconds. **APIM** in West serves. **App services** already run in West, pre-scaled for peak. **Azure SQL** failover group fails over — apps reconnect via the listener with retries; RPO a few seconds of writes. **Cosmos DB** fails over its write region. **Service Bus** Premium geo-replication/geo-DR alias switches; in-flight messages in the failed region may be delayed. Stores keep selling locally. All of it is a **rehearsed runbook** with RPO/RTO per service — untested DR usually fails."

**X5. Store keeps selling during a 2-hour outage (known gap — be honest, reason it through).** "Treat the store as an **edge node**: POS and essential services run locally with a **local database** holding the price file, catalogue and local stock. Sales are written locally into a **store-and-forward outbox** with idempotent transaction IDs. Card payments use the provider's offline/stand-in mode within risk limits. On reconnect the queue **syncs in order**; the cloud side is idempotent. **Conflict rules**: store sales always count; HQ price changes win by version. APIM **self-hosted gateway** or Azure Arc-managed edge can host local APIs. I haven't built a retail edge myself, but it's the same outbox + idempotency + versioning pattern I've used in the cloud, moved into the store."

**X6. No public backends, no secrets.** "Only **Front Door Premium** is public (WAF, bot rules). Origins via **Private Link**; App Service/AKS, APIM, SQL, Cosmos, Service Bus Premium, Storage and Key Vault behind **private endpoints**, public access disabled, **private DNS zones**. Service-to-service auth via **managed identity + RBAC** (least privilege). Remaining third-party secrets in **Key Vault**, rotated. **Azure Policy** denies public endpoints and enforces diagnostics; **Defender for Cloud** monitors posture. APIM and services both validate JWTs. Subnets and NSGs segment the network; outbound via a firewall with allow-lists."
