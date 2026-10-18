# TJX StoreWeb — Azure Services Q&A

Prep for the TJX Senior Staff Engineer – StoreWeb Modernization interview. JD line: *"Deep expertise across Azure services: APIM, App Services/AKS, Functions, Service Bus/Event Grid, Azure SQL, Cosmos DB."*

Persona: **Architect track** (Capital Access at S&P Global + Wells Fargo migration at Wipro). **Format:** every question starts with a quoted **Answer to say** (speak it as-is, about 20–30 seconds), followed by the **Explanation** (what → where it runs → how it works → live example) for follow-ups.

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
  - [Quick answers](#quick-answers)
- [Part 4 — Application Gateway Deep Dive](#part-4--application-gateway-deep-dive)
  - [Quick answers](#quick-answers-1)
- [Part 5 — APIM: Tiers, Versions, Gateway Types](#part-5--apim-tiers-versions-gateway-types) — incl. developer portal
  - [Quick answers](#quick-answers-2)
- [Part 6 — Confusing Pairs: API Gateway vs APIM vs App Gateway](#part-6--confusing-pairs-api-gateway-vs-apim-vs-app-gateway)
  - [Quick answers](#quick-answers-3)
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

> **Answer to say:** "Azure Functions is Azure's serverless compute. I write small pieces of code that run only when an event happens, like an HTTP call, a queue message, a timer or a file upload, and Azure handles the servers and scaling. I use them for background, event-driven and bursty work, not for steady, latency-critical APIs. In Capital Access, our report generation ran on a Service Bus-triggered Function."

**Explanation:**

**What:** A small piece of code Azure runs **only when something happens** — no server to manage. Analogy: a motion-sensor light; off and free until someone walks in.

**How it works:**
- Every function has exactly **one trigger** (HTTP, queue message, timer, blob upload).
- **Bindings** connect to other services without plumbing code (input binding reads, output binding writes).
- On **Consumption**, Azure adds instances as load grows and **scales to zero** when idle. You pay per execution.

**Use for:** event-driven, background, bursty work — queue processing, scheduled jobs, webhooks, file processing.
**Avoid for:** latency-critical user APIs, steady high load, long-running processes → App Service or containers.

**Live example (Capital Access):** "Report requests don't build the PDF in the API. The API drops a message on a **Service Bus queue** and returns immediately. A **Service Bus-triggered Function** generates the report. 50 requests at once → it scales out; at night → costs nothing. We used the **isolated worker model**, so our .NET version isn't tied to the Functions host."

### Q2. What are Durable Functions?

> **Answer to say:** "Durable Functions is an extension of Azure Functions for long-running, multi-step workflows. It saves progress after every step, so if something crashes, the workflow continues from the last completed step instead of starting over. It supports patterns like chaining, fan-out/fan-in, timers and waiting for a human approval. We used it to make our report pipeline survive failures."

**Explanation:**

**What:** An extension for **multi-step workflows that remember progress** across crashes and restarts. Analogy: video-game save points.

**How it works:**
- Three roles: **client** starts it, **orchestrator** decides the order of steps, **activities** do the work.
- Each time the orchestrator awaits a step, the result is written to a **history log** in Storage (event sourcing).
- On wake-up the orchestrator **replays from the top** — finished steps return cached results, only the next step really runs.
- Therefore orchestrator code **must be deterministic**: no `DateTime.Now`, no random, no direct I/O. All of that goes into activities.

**Patterns:** function chaining, fan-out/fan-in, async HTTP API (built-in status endpoint), monitor, human interaction (external events), Durable Entities.

**Live example:** "The report function hit timeouts on large reports, and a crash meant starting over. We moved to a Durable orchestration chaining **Generate → WriteToBlob → GenerateSasUrl** — a Blob failure retries only that step. For RAG ingestion of 200-page PDFs we use **fan-out/fan-in** over page batches."

### Q3. How do you handle state management in Azure Functions?

> **Answer to say:** "Functions are stateless by design, so I never keep important data in memory. Workflow state goes into Durable Functions, business data into Cosmos DB or Azure SQL, files into Blob Storage, and short-lived data into Redis. That way any instance can crash and another one continues without losing anything."

**Explanation:**

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

> **Answer to say:** "Cold start is the delay on the first request after a Function has been idle, because Azure has to start a new instance and load our code. I reduce it by choosing a plan with warm instances, like Premium or Flex Consumption with always-ready instances, or Always On on a dedicated plan, and by keeping startup light. If the work is asynchronous anyway, I accept it, because the user never notices."

**Explanation:**

**What:** The delay on the **first request after idle** — Azure must allocate a host, load the runtime and your code. Happens because Consumption scales to zero.

**How to reduce:**
1. **Plan:** Premium (always-ready + pre-warmed instances), Flex Consumption (always-ready), Dedicated with **Always On**.
2. **Lighter startup:** fewer dependencies, no heavy DI work, reuse static `HttpClient` / `ServiceBusClient`.
3. **Isolated worker + ReadyToRun** compilation.
4. **Design around it:** if the flow is async, nobody notices.

**Live example:** "Report generation stayed on **Consumption** — it's async and polled, so a 2-second cold start is invisible inside a 30-second job. The **RAG ingestion trigger** needs freshness, so Premium/always-ready is justified there. Plan per workload."

### Q5. How do you keep Function instances pre-warmed on an App Service Plan?

> **Answer to say:** "On an App Service plan the instances are already running because we pay for them, so the key setting is Always On, which stops the host from unloading. I also set a minimum instance count, use deployment slots with warm-up before swapping, and turn on health checks. Strictly speaking, 'pre-warmed instances' is a Premium plan feature, where you set always-ready and pre-warmed instance counts."

**Explanation:**

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

> **Answer to say:** "Azure API Management is a single front door for all our APIs. Every client calls APIM, which checks who is calling, applies rules like rate limits and validation, and forwards the request to the right backend. It has three parts: the gateway that handles the calls, the management plane where we define APIs and policies, and a developer portal for API consumers."

**Explanation:**

**What:** A **single front door for all APIs**. Clients call APIM; APIM checks, applies rules and forwards to the real backend. Analogy: hotel reception — guests never walk into the kitchen.

**Three parts:** **Gateway** (runtime for every call), **management plane** (define APIs/policies), **developer portal** (docs, keys).
**Key terms:** API (operations mapped to a backend), Product (bundle of APIs for a consumer group), Subscription (key to a product), Policy (rule on every call).

**Flow:** client → gateway → **inbound** policies → backend → **outbound** policies → client.

**Live example (Capital Access):** "Every SPA request went through **APIM**, which validated the Okta JWT and tenant/role claims and routed to the right microservice. Services still self-validated the JWT for service-to-service calls — defence in depth."
**Live example (Wells Fargo):** "APIM sat in front of **legacy and new endpoints**; moving a route was a routing-rule change, rollback was flipping it back."
**TJX tie-in:** APIM is where you strangle the StoreWeb monolith route by route, invisible to stores.

### Q2. How do you implement APIM policies and validate incoming requests?

> **Answer to say:** "Policies are rules APIM runs on every request and response, in four stages: inbound, backend, outbound and on-error. To validate requests, I use validate-jwt to check the token, rate-limit-by-key to stop abuse, and validate-content to check the body against the OpenAPI schema. Bad requests are rejected at the gateway, so they never reach the backend."

**Explanation:**

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

> **Answer to say:** "I secure every hop with three things: a private network, managed identity and TLS. APIM reaches the backend through the VNet and a private endpoint, and calls it using its managed identity. The backend connects to Azure SQL with its own managed identity through a private endpoint, with public access turned off. So there are no passwords or secrets anywhere in config."

**Explanation:**

Every hop: **private network, managed identity, TLS, zero secrets in config.**

- **Client → APIM:** JWT validation, subscription key, rate limits, WAF in front (Front Door / App Gateway).
- **APIM → backend:** APIM in/integrated with VNet; backend has **private endpoint**, public access off; APIM **managed identity** via `authentication-managed-identity` (or mTLS client certs); access restrictions allow only the APIM subnet.
- **Backend → Azure SQL:** backend **managed identity** + **Entra auth** (no password), least privilege (no `db_owner`); SQL **private endpoint**, public access off, **private DNS zone**; TLS in transit, TDE at rest.
- Leftover secrets → **Key Vault** via managed identity.

**Live example:** "No service in Capital Access had a DB password anywhere — managed identity to SQL and Key Vault, both behind private endpoints."

### Q4. How can public APIM APIs reach a backend inside a VNet with a private endpoint?

> **Answer to say:** "APIM has to sit on both sides: public for clients and inside the VNet for the backend. The options are APIM in External VNet mode, Standard v2 with VNet integration, or the most secure one, APIM in Internal mode with Application Gateway and WAF in front as the public entry. In every case I link the private DNS zone so APIM resolves the backend's private IP."

**Explanation:**

APIM must stand on both sides.
1. **External VNet mode** (Developer/Premium classic) — public gateway IP, APIM inside the subnet.
2. **Standard v2 / Premium v2 + VNet integration** — public inbound, outbound into the VNet; cheaper.
3. **Internal VNet mode + Application Gateway (WAF) in front** — most secure, common enterprise pattern.

Often forgotten: **private DNS zone** linked to APIM's VNet, **NSG rules** for APIM management ports, **disable public access** on the backend.

**Live example (Wells Fargo):** "Employee-only apps → APIM in **Internal mode**, reached over ExpressRoute. If public exposure were needed: App Gateway WAF → internal APIM."

### Q5. How do you deploy APIM across multiple regions on a budget?

> **Answer to say:** "Built-in multi-region APIM needs the Premium tier, which is expensive per region. On a budget I'd either run Premium with a small one-unit secondary region, or run two cheaper Standard v2 instances in two regions behind Front Door and keep their config identical through IaC. The right choice depends on the SLO and how fast we must recover from a regional outage."

**Explanation:**

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

> **Answer to say:** "Azure Front Door is Microsoft's global entry point for web apps and APIs. Users connect to the nearest Microsoft edge location, Front Door blocks attacks with its WAF, caches static content like a CDN, and sends the request to the healthiest, fastest region. If a region fails, it moves traffic to another region within seconds."

**Explanation:**

Global entry point at Microsoft's edge: global load balancing + failover, TLS at the edge, WAF, CDN caching, path routing, Private Link to origins (Premium). Traffic Manager = DNS only; App Gateway = regional. See [Part 3](#part-3--front-door-deep-dive).

---

## Part 3 — Front Door Deep Dive

### Quick answers

**What does Azure Front Door provide?**

> **Answer to say:** "Front Door gives five things in one service: global load balancing with automatic failover between regions, faster connections through Microsoft's edge network, CDN caching, security through WAF and DDoS protection, and a rules engine for redirects and header changes."

**What is the difference between Front Door and Azure CDN?**

> **Answer to say:** "Azure CDN was the older, caching-only product, and it's being retired. Front Door Standard and Premium is now Azure's CDN as well as its global load balancer and WAF, so for new designs I use Front Door."

**What is the difference between Front Door Standard and Premium?**

> **Answer to say:** "Both give CDN, global routing and custom WAF rules. Premium adds Microsoft-managed OWASP rules, bot protection and Private Link to the backends, so the backends need no public IP. I choose Premium when backends must be private, or for regulated workloads like payments."

**When did Microsoft launch Front Door?**

> **Answer to say:** "Front Door became generally available in 2019, built on the edge platform Microsoft already used for its own services. The current Standard and Premium tiers became generally available in 2022, and the classic tier retires in March 2027."

**How is Front Door priced?**

> **Answer to say:** "You pay a monthly base fee per profile, roughly 35 dollars for Standard and 330 for Premium, plus a charge for requests and for data sent to users, which is usually the biggest part. For a typical enterprise app that's a few hundred dollars a month, and a good cache hit ratio is the main way to keep it down."

**How do you stop people bypassing Front Door and calling the backend directly?**

> **Answer to say:** "The best way is Private Link with Front Door Premium and public access turned off on the backend. Otherwise the backend accepts only the Front Door service tag and also checks that the X-Azure-FDID header matches our own Front Door profile."

**Front Door vs Traffic Manager vs Application Gateway?**

> **Answer to say:** "Front Door is a global Layer 7 proxy with WAF and caching. Traffic Manager is also global but DNS-only, so it just tells the client where to go. Application Gateway is a regional Layer 7 load balancer that sits inside the VNet."

**How does Front Door fail over, and how fast?**

> **Answer to say:** "Health probes check every backend, and when one becomes unhealthy, Front Door stops sending traffic to it within seconds. Clients don't wait for DNS changes, because they keep talking to the same edge location."

**Is Front Door a single point of failure?**

> **Answer to say:** "It's a globally distributed service and very resilient, but it has had global incidents. For a critical system I keep a tested DNS fallback path and low DNS TTLs."

### Detailed explanation

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


---

## Part 4 — Application Gateway Deep Dive

### Quick answers

**What is Azure Application Gateway?**

> **Answer to say:** "Application Gateway is a regional Layer 7 load balancer with an optional web application firewall. It sits inside our VNet, decrypts HTTPS, checks requests for attacks, and routes them by URL path or host name to healthy backend servers."

**When would you use Application Gateway, and when would you skip it?**

> **Answer to say:** "I use it when the backend is private inside a VNet, for example internal-mode APIM or AKS ingress, or when I need client certificate checks at a regional entry. If Front Door Premium can reach the backends directly over Private Link, I skip it to save cost and one network hop."

**Application Gateway returns 502. How do you debug it?**

> **Answer to say:** "A 502 means Application Gateway couldn't get a healthy answer from the backend. I check backend health first, then the health probe, the NSG rules, the host header settings for App Service, and the certificates if we re-encrypt to the backend."

**Which Application Gateway SKU, and what does it cost?**

> **Answer to say:** "v1 is retired, so it's Standard_v2 or WAF_v2. You pay a fixed hourly fee per gateway plus capacity units for traffic, roughly 350 to 700 dollars a month per region for WAF_v2, and you pay for each region separately."

### Detailed explanation

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

### Quick answers

**How do you choose an APIM tier?**

> **Answer to say:** "Consumption is pay-per-call for light traffic, Developer is for testing only with no SLA, Standard v2 suits most production workloads, and Premium is needed for full VNet injection, multi-region and the self-hosted gateway. I pick the cheapest tier that meets our networking and availability needs."

**What is the difference between an API version and a revision?**

> **Answer to say:** "A version is a new contract for breaking changes, and the old and new versions run side by side so consumers move when they're ready. A revision is a safe change inside a version that I can test, make live and roll back instantly."

**What is the APIM developer portal, and what is it used for?**

> **Answer to say:** "The developer portal is a ready-made website that comes with APIM for the developers who consume our APIs. They can read docs generated from OpenAPI, try calls and get subscription keys themselves. It's optional: useful for partners and many consuming teams, but not needed for APIs used only by our own apps."

**What gateway types does APIM have?**

> **Answer to say:** "APIM's gateway can be the managed one in Azure, a self-hosted gateway that runs as a container on-prem or at the edge, or a dedicated workspace gateway for one team. The self-hosted one is useful for stores, because local traffic keeps flowing even if the cloud link drops."

**What happens if APIM or a backend fails?**

> **Answer to say:** "If APIM fails in one region, Front Door moves traffic to the other region. For failing backends I use APIM's circuit breaker and retries for safe calls, per-consumer rate limits stop one client flooding us, and policies are deployed from Git, so a bad change is rolled back quickly."

### Detailed explanation

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

### Quick answers

**Are API Gateway and APIM the same thing?**

> **Answer to say:** "Not exactly. API gateway is a design pattern: one entry point in front of many services. APIM is Microsoft's managed product that implements it. Its gateway is the API gateway, and APIM adds a management plane, a developer portal and analytics on top."

**Is the API gateway part of APIM?**

> **Answer to say:** "Yes. The gateway is the runtime part of APIM that handles every API call and runs the policies."

**Are Application Gateway and API Gateway the same?**

> **Answer to say:** "No, they're different. Application Gateway is a regional load balancer with a WAF that routes traffic to healthy servers and blocks attacks, but it doesn't understand API consumers. An API gateway like APIM validates tokens, applies per-consumer limits and manages versions, but it isn't a full WAF, so they're often used together."

### Detailed explanation

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

> **Answer to say:** "I'd publish one ItemSold event to a Service Bus topic and give inventory, loyalty, analytics and replenishment their own subscription. Each gets its own copy, its own retries and its own dead-letter queue, so one slow consumer never affects the others. Adding a new consumer is just adding a subscription."

**Explanation:**

**Idea:** one fact, many interested teams → **publish/subscribe** with a **topic and subscriptions**.

**Fuller version:** "POS publishes one **`ItemSold` event** to a topic. Inventory, loyalty, analytics and replenishment each get their **own subscription** — own copy, own retries, own **DLQ**. If loyalty is down for an hour, inventory keeps working. **Correlation filters** (cheaper than SQL filters) give each consumer only what it needs. The publisher doesn't know who listens — a new fraud service is just a new subscription. I separate **events from commands**: `ItemSold` is a fact → topic; 'reserve 5 units for order 123' is a command with one owner → queue."

**Points:** event carries enough data (store, SKU, qty, timestamp, eventId, version); all consumers idempotent; very high-volume analytics may fit Event Hubs better.
**Follow-ups:** Why not direct calls? → coupling, POS slowed by consumers. Limit? → up to 2,000 subscriptions per topic.
**Live example:** Capital Access fanned out ownership/profile changes through Service Bus topics.

### SB2. Ordered price updates

> **Answer to say:** "Two layers. Service Bus sessions keyed by store and SKU keep updates for the same item in order, while different items still run in parallel. And every price update carries a version number, so the handler ignores any update older than the one already saved."

**Explanation:**

**Idea:** parallel consumers and retries can reorder messages → deliver in order per item **and** reject stale updates.

**Fuller version:** "Two layers. **Sessions** with `SessionId = storeId + SKU` give FIFO per key while different SKUs run in parallel. And the **handler checks a version or effective timestamp** — a conditional update that applies only if newer. Retries, DLQ resubmits or late upstream sends can still reorder, so sessions give order in the normal case and the version check makes it correct in every case."

**Retail nuance:** future-dated markdowns → store the effective date or use **scheduled messages**.
**Follow-ups:** session downsides → a stuck session blocks only that SKU, must be enabled at creation, hot-session risk. Event Grid? → no ordering.

### SB3. 500,000-message backlog on Black Friday

> **Answer to say:** "First I check whether the consumers are failing or just too slow, by comparing incoming and completed messages and the dead-letter count. Then I find the real bottleneck, usually the database or an external service, and either scale out the consumers or protect the downstream system while the queue absorbs the spike. Critical order flows go first, and afterwards we alert on message age, not just queue length."

**Explanation:**

**Fuller version:**
1. **Working but slow, or broken?** Compare incoming vs completed, check DLQ count and exceptions. Failing and retrying = bug/poison, not capacity.
2. **Real bottleneck?** Usually downstream — SQL at 100%, Cosmos 429s, payment provider limits. More consumers make it worse.
3. **Act:** consumer-bound → scale out (Functions auto, **KEDA** on AKS, MaxConcurrentCalls, prefetch, Premium messaging units). Downstream-bound → cap concurrency, scale the DB, let the queue absorb. Prioritise order confirmation, pause analytics.
4. **Communicate:** honest "Processing your order" status.

**Afterwards:** alert on **queue age, not just length**; load test before peak.
**Metrics:** Active, Dead-lettered, Incoming vs Completed, Server Errors, Throttled Requests, Premium CPU/Memory, oldest-message age.

### SB4. Poison messages blocking a session

> **Answer to say:** "After a set number of failed attempts, ten by default, Service Bus moves the message to the dead-letter queue automatically. I also dead-letter a message immediately when the error is permanent, like bad data, so it doesn't block the session. We alert on the dead-letter queue, fix the cause and resubmit."

**Explanation:**

**Fuller version:** "Three layers. **Automatic:** after **MaxDeliveryCount** (default 10) the message goes to the **DLQ**. **Smarter:** separate **transient** errors (retry with backoff) from **permanent** ones (validation, unknown SKU) and **dead-letter immediately with a reason**, so a session isn't blocked for 10 attempts. **Operations:** alert on DLQ > 0, runbook + tooling to inspect, fix and **resubmit** (safe because handlers are idempotent), and fix the root cause upstream with schema validation or contract tests. For longer retry waits, schedule a retry message instead of abandoning."

**Follow-ups:** other DLQ reasons → expired messages (if enabled), header size, filter errors. Why does a session block? → FIFO within the session.

### SB5. Message grew from 5 KB to 5 MB

> **Answer to say:** "The Standard tier allows only 256 KB per message, so sends start failing, and even on Premium big messages are slow and costly. The fix is the claim-check pattern: store the large payload in Blob Storage and send only a small message with a reference to it."

**Explanation:**

**Fuller version:** "**Standard caps messages at 256 KB**, so sends fail. **Premium** allows up to 100 MB, but big messages cut throughput, raise memory and cost, lengthen locks, and get copied per subscription. Fix: **claim-check** — upload the payload to **Blob**, send a small message with the reference plus key metadata and a checksum; the consumer fetches only if needed, using managed identity or a short-lived SAS; a lifecycle policy cleans up. The real lesson is governance: schema and size checks in CI, message contracts treated like API contracts."

**Follow-up:** just upgrade to Premium? → treats the symptom.

### SB6. DB write + publish without losing either (outbox)

> **Answer to say:** "I use the transactional outbox pattern. The service saves the business data and the event into an outbox table in the same database transaction, and a separate process publishes the outbox events to Service Bus. Consumers are idempotent, because an event may be published more than once."

**Explanation:**

**Idea:** the **dual-write problem** — DB and Service Bus share no transaction.

**Fuller version:** "**Transactional outbox.** In the same DB transaction, write the business change **and** an outbox row. A **relay** (worker, timer Function or CDC on the outbox table) publishes unpublished rows and marks them sent. A crash between publish and mark means republishing, so it's at-least-once — consumers are idempotent, and `MessageId = outbox row ID` lets **duplicate detection** drop repeats within its window. In Cosmos DB the **change feed** is a built-in outbox; in SQL Server, **CDC** reads the transaction log — the same principle I used for Wells Fargo legacy/new sync."

**Follow-ups:** 2PC? → not practical across SQL and Service Bus, hurts availability. Ordering? → publish in outbox sequence, `SessionId = aggregate ID`. Inbox pattern? → consumer records processed IDs in the same transaction as its change.

### SB7. Event Grid or Service Bus for image upload?

> **Answer to say:** "Event Grid to detect the upload, because Blob Storage raises a BlobCreated event natively. If the processing must be reliable, with retries and a dead-letter queue, I route that event into a Service Bus queue and process it from there."

**Explanation:**

**Idea:** Event Grid = doorbell (notify). Service Bus = managed to-do list (process reliably).

**Fuller version:** "**Event Grid** is the natural trigger — Blob emits **BlobCreated** natively, filtered by container and extension. It retries delivery for up to **24 hours**, and **dead-lettering to storage is off by default** — turn it on. If processing must be reliably tracked (resize, scan, catalogue update) with controlled concurrency and a monitored DLQ, route **Event Grid → Service Bus queue → processor**. Processor idempotent on **blob name + ETag**."

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

**B1. Main parts of APIM?**

> **Answer to say:** "APIM has three parts: the gateway that handles every API call, the management plane where we define APIs and policies, and the developer portal for API consumers."

**Explanation:** Gateway (runtime for every call, runs policies), management plane (define APIs, products, policies — portal/REST/IaC), developer portal (consumer docs, try-it, keys). Plus analytics into App Insights / Azure Monitor.

**B2. Version vs revision?**

> **Answer to say:** "A version is a new contract for breaking changes that runs alongside the old one. A revision is a safe change inside a version that can be tested and rolled back instantly."

**Explanation:** Version = new contract consumers opt into (`/v2`), for breaking changes, lives side by side. Revision = non-breaking change inside a version, tested on `;rev=N`, made current, instant rollback.

**B3. Products and subscriptions?**

> **Answer to say:** "A product is a bundle of APIs with its own rules and limits for a group of consumers, and a subscription gives one consumer a key to that product."

**Explanation:** A product bundles APIs with rules for a consumer group (e.g. "Store Apps" 1,000 calls/min, "Partners" 100 calls/min). A subscription gives one consumer a key to a product — so you can see, limit and cut off each consumer independently.

**B4. Policy order and inheritance?**

> **Answer to say:** "Policies run in four stages: inbound, backend, outbound and on-error. They're inherited from global to product to API to operation, and the base tag decides where the parent's rules run."

**Explanation:** Inbound → backend → outbound → on-error. Scopes global → product → API → operation; each lower scope decides where the parent's rules run by placing `<base/>`. Shared rules (CORS, header stripping) at global; auth at product/API; validation at operation.

**B5. Internal vs External VNet mode?**

> **Answer to say:** "Both modes put APIM inside a VNet. External mode keeps a public gateway address, while Internal mode has only a private address, reachable from inside the network or from on-prem."

**Explanation:** Both put APIM inside a VNet subnet so it can reach private backends. External: gateway has a **public** IP. Internal: **only a private** IP — reachable from the VNet, peered VNets or on-prem over ExpressRoute/VPN; put App Gateway WAF in front for public access.

**B6. Consumption vs Standard v2 vs Premium?**

> **Answer to say:** "Consumption for light, bursty traffic, Standard v2 for most production workloads, and Premium only when I need full VNet injection, multi-region or the self-hosted gateway."

**Explanation:** Consumption: low/bursty traffic, pay per call, cold start, fewer features. Standard v2: most production workloads, outbound VNet integration, sensible cost. Premium: VNet injection (internal mode), multi-region, availability zones, self-hosted gateway — justify by requirement (~$2,800/unit/month).

**S7. Strangler-Fig with APIM.**

> **Answer to say:** "I put APIM in front of the monolith first, then move one route at a time to the new service by changing APIM's routing. Stores keep calling the same URL, and rollback is just switching the route back."

**Explanation:** "Put APIM in front of the monolith first with zero behaviour change — every route forwards to legacy. Then move one route at a time: `/stores/{id}/inventory` → new Inventory service via `set-backend-service`, everything else still to legacy. Stores keep the same URL. Start with read-only, low-risk routes, compare responses in shadow mode if possible, then flip writes once the data sync is proven. Rollback is reverting one routing rule. Eventually the monolith has no routes left and is retired."

**S8. One region's POS floods APIM.**

> **Answer to say:** "Immediately, I rate-limit that client in APIM so it gets 429 errors and the other stores are protected. Long term, the client is fixed to retry with backoff and jitter, and we alert on unusual call rates per client."

**Explanation:** "Right now: `rate-limit-by-key` on store or client ID, returning **429 with Retry-After**, so the faulty client is throttled and other stores are protected; the backend **circuit breaker** sheds load if needed. Long term: fix the client — exponential backoff with **jitter**, idempotency keys so retries are safe, a retry cap. Alert on per-client call rate, and set per-product quotas so no consumer group can take all capacity."

**S9. Breaking change for 1,000 stores.**

> **Answer to say:** "I'd publish v2 alongside v1 instead of changing v1, track which stores still use v1, and give a clear deprecation timeline. v1 is retired only once its traffic has gone."

**Explanation:** "Publish **v2 alongside v1** — never change v1 in place. Track **usage per version** in APIM analytics. Announce a deprecation timeline, return `Deprecation`/`Sunset` headers on v1, roll store software by rings (pilot → region → all). Retire v1 when traffic reaches zero. Better still, make the change additive and avoid a new version."

**S10. Stores lose WAN.**

> **Answer to say:** "Partly. APIM's self-hosted gateway can run in the store and keep routing local calls during the outage. But the store also needs local data and a queue that holds sales and syncs them when the link comes back."

**Explanation:** "APIM's **self-hosted gateway** can run as a container in the store or a regional hub, routing local calls to local services with its last config while the cloud link is down, and syncing config and logs when it returns. The gateway is only part of it — the store also needs local data and a store-and-forward queue so sales are captured offline and synced idempotently."

**S11. APIM config at scale.**

> **Answer to say:** "With APIOps. All APIM config and policies live in Git and are deployed by pipelines to each environment, secrets come from Key Vault, and each team owns its own APIs. Nobody changes production by hand in the portal."

**Explanation:** "**APIOps**: APIM config in Git, one folder per API, policies as files, deployed by pipeline dev → QA → prod with environment values in **named values** linked to **Key Vault**. Teams own their API folders (CODEOWNERS); a platform team owns global policies. **Workspaces** isolate teams inside one instance. Nobody edits prod in the portal — the pipeline overwrites drift."

### 9.2 App Service / AKS answers

**B1. App Service vs AKS?**

> **Answer to say:** "App Service by default for standard web APIs, because Microsoft runs the platform for us. AKS when we need Kubernetes-level control and have a team that can operate it."

**Explanation:** App Service: PaaS — deploy code or a container, Microsoft runs the platform; slots, autoscale, easy auth; best for standard web APIs and small teams. AKS: full Kubernetes — control over networking, sidecars, scheduling, many services; you own upgrades, node pools and policies. App Service (or Container Apps) by default; AKS when you need its control and have the team to run it.

**B2. Deployment slots?**

> **Answer to say:** "A slot is a live copy of the app. I deploy to the staging slot, warm it up and test it, then swap it with production, so there's no downtime, and rollback is just swapping back."

**Explanation:** A slot is a live copy of the app with its own hostname. Deploy to staging, warm up and test, then **swap** — production gets the warmed instances with no restart. Rollback = swap back. Mark environment-specific config as **slot settings**. Standard tier or above.

**B3. Autoscaling?**

> **Answer to say:** "App Service scales out by rules like CPU or a schedule. In AKS, the HPA adds pods, the cluster autoscaler adds nodes, and KEDA scales on events like queue length."

**Explanation:** App Service: scale-out rules (CPU, memory, queue length, schedule) or automatic scaling. AKS: **HPA** adds pods on CPU/memory/custom metrics; **cluster autoscaler** adds nodes when pods can't be scheduled; **KEDA** scales on event sources like Service Bus depth, including to zero.

**B4. Managed identity?**

> **Answer to say:** "A managed identity is an identity Azure creates and manages for the app, so it can access other services without any password. App Service uses it directly, and AKS pods use it through workload identity."

**Explanation:** An Entra ID identity Azure manages for a resource — no secrets. App Service: enable system- or user-assigned identity, grant RBAC roles, SDK uses `DefaultAzureCredential`. AKS: **workload identity** — a Kubernetes service account federated with a user-assigned managed identity; the pod's token is exchanged for an Entra token. (Pod identity is deprecated.)

**B5. AKS vs Container Apps vs ACI?**

> **Answer to say:** "AKS is full Kubernetes, with full control and full operational work. Container Apps runs containers serverlessly with autoscaling and no cluster to manage. Container Instances just runs a single container quickly, for jobs or bursts."

**Explanation:** AKS: full Kubernetes, most control, most ops. Container Apps: serverless containers on managed Kubernetes with KEDA scaling, scale to zero, revisions, Dapr — microservices without running a cluster. ACI: one container quickly, no orchestration — batch jobs, build agents, burst capacity.

**S6. Hosting 12 StoreWeb services.**

> **Answer to say:** "Simple CRUD services go on App Service or Container Apps for low operational effort. The high-throughput inventory processors go on Container Apps or AKS, scaling on queue length. The choice depends on the workload, the team's skills and the running cost."

**Explanation:** "Simple CRUD APIs → **App Service** or **Container Apps**: low ops, slots/revisions, autoscale. The two high-throughput inventory processors → **Container Apps with KEDA** on Service Bus depth, or **AKS** if we need fine control (node pools, sidecars, network policy) or already run AKS with a platform team. Background jobs → Functions. Not everything on AKS just for uniformity — workload shape, team skills and ops cost decide."

**S7. p95 200 ms → 2 s after release.**

> **Answer to say:** "If users are affected, I roll back first. Then I use Application Insights to see whether the time is spent in our code or in a dependency like the database, compare before and after the deployment, and fix the actual cause."

**Explanation:** "If customers are hurting, **roll back** first (swap back). Then App Insights: app or **dependency**? Compare around the **deploy marker**; open slow **end-to-end transactions** to see which call grew. Usual suspects: new N+1 query or missing index (Query Store), a chatty new external call, **SNAT port exhaustion** from `HttpClient` per request, sync-over-async thread starvation, a cache disabled by config. Confirm with KQL on `requests`/`dependencies`, fix, add a performance test to the pipeline."

**S8. Black Friday in 3 weeks.**

> **Answer to say:** "I load test at two to three times the expected peak, find the first bottleneck, and pre-scale before the event instead of relying on autoscale. I add caching, queues for non-critical work, and a plan to switch off non-essential features before checkout suffers."

**Explanation:** "Load test at **2–3× expected peak** with a realistic mix; find the first bottleneck (usually DB or an external provider). **Pre-scale** — reactive autoscale is too slow for 10× in minutes. Minimum instances, zone redundancy, scheduled scale rules. Cache catalogue at Front Door and Redis; queue non-critical work. **Graceful degradation**: switch off recommendations before checkout suffers. Change freeze the week before; war-room runbook with dashboards and rollback steps."

**S9. OOMKilled pods.**

> **Answer to say:** "OOMKilled means the container used more memory than its limit. I check whether the limit is realistic, whether there's a memory leak, and whether large data is loaded fully into memory, then right-size the limits and fix the cause."

**Explanation:** "The container exceeded its memory **limit**. Check: limit vs real usage over time; a **leak** (steady growth — dump and profile); .NET GC settings in containers; large payloads loaded fully into memory (stream them). Fix: right-size **requests and limits**, fix the leak, stream data, and scale on a metric that rises before memory runs out."

**S10. Zero downtime + instant rollback.**

> **Answer to say:** "On App Service, I deploy to a staging slot and swap. On AKS, I use rolling, blue-green or canary deployments with health checks. Feature flags let me turn a change off instantly without redeploying."

**Explanation:** "App Service: **staging slot**, warm-up and smoke test, **swap**; rollback = swap back. AKS: **rolling update** with readiness probes and `maxUnavailable: 0`, or **blue-green**, or **canary** with metrics. Backward-compatible DB changes (expand/contract). **Feature flags** separate deploy from release, so most rollbacks are a flag flip."

### 9.3 Azure Functions answers

**B1. Triggers and bindings?**

> **Answer to say:** "A trigger is the event that starts a function, and every function has exactly one. Bindings are simple connections for reading input from or writing output to other services without writing client code."

**Explanation:** Trigger = the one event that starts the function (HTTP, timer, Service Bus, Blob, Event Grid, Cosmos change feed). Bindings = declarative input/output connections without client code.

**B2. Plans?**

> **Answer to say:** "Consumption scales to zero and charges per run, but has cold starts. Flex Consumption and Premium keep instances warm and support VNets. A Dedicated plan runs on App Service capacity we already pay for."

**Explanation:** Consumption: scale to zero, pay per execution, cold start, ~10 min max. **Flex Consumption**: scale to zero + always-ready instances, VNet integration, fast per-function scaling — the modern serverless default. Premium: always-ready + pre-warmed, VNet, long runs, per core-hour. Dedicated: an App Service plan you already pay for; Always On; predictable cost, no event-driven scale.

**B3. Cold start?**

> **Answer to say:** "Cold start is the delay on the first call after a function has been idle. Warm instances, a light startup and an async design reduce its impact."

**Explanation:** Delay on the first call after idle while a host starts. Reduce with always-ready (Flex/Premium), Always On (Dedicated), light startup, reused clients, isolated worker + ReadyToRun, or async design where it doesn't matter.

**B4. Durable and determinism?**

> **Answer to say:** "Durable Functions save each step's result and replay the orchestrator from the start when it resumes. So the orchestrator must make the same decisions every time, which means no current time, random values or direct I/O inside it."

**Explanation:** The orchestrator is **replayed** from history on each wake-up, so it must make the same decisions every time — use the context's current time instead of `DateTime.Now`, no random, no direct I/O (activities do that).

**B5. In-process vs isolated?**

> **Answer to say:** "The isolated worker model. It lets us choose our own .NET version and gives full control of middleware, and in-process support ends in November 2026."

**Explanation:** **Isolated worker**: own process, choose the .NET version independently of the host, full middleware and DI, where Microsoft invests. In-process support ends **10 November 2026**, so migrate now.

**S6. Nightly sales files from 1,000 stores.**

> **Answer to say:** "Each uploaded file raises an Event Grid event that goes into a Service Bus queue, and a Function processes each file safely even if it runs twice. Big files are split and processed in parallel with Durable Functions, and a check before the deadline alerts us about missing or failed stores."

**Explanation:** "Stores upload to Blob (SAS per store path). **Event Grid BlobCreated** → **Service Bus queue** (reliable, DLQ) → Function that validates and loads each file, idempotent per file (name + ETag in a processed table). Large files → **Durable fan-out** over chunks. A **timer Function at 5 am** checks missing or failed stores and alerts before the 6 am deadline. Failed files land in the DLQ with a reason for fix-and-resubmit."

**S7. Duplicate inventory adjustments.**

> **Answer to say:** "Service Bus delivers at least once, so a message can be processed twice, usually when processing takes longer than the message lock. The fix is an idempotent handler that records processed message IDs, plus longer lock renewal."

**Explanation:** "Service Bus is **at-least-once**. Usual cause: processing took longer than the **message lock**, it expired, another instance got the message, both applied it — or a crash after the DB write but before completing. Fix: an **idempotent** handler that records the MessageId/adjustment ID in the same DB transaction and skips repeats; raise `maxAutoLockRenewalDuration` above worst-case time; keep processing short."

**S8. Price Function hits the time limit.**

> **Answer to say:** "Break the batch into smaller chunks, each in its own message or Durable activity, or move to a plan with longer time limits. If it's really a long batch job, a container job is a better fit."

**Explanation:** "Split the batch into one message per chunk; or a **Durable orchestration** fanning out over chunks; or **Premium/Flex** for longer timeouts. If it's really a long batch job, a **container job** (Container Apps Jobs) fits better."

**S9. When not to use Functions?**

> **Answer to say:** "Not for steady, high-traffic APIs, long-running stateful processes, or latency-critical calls where cold start hurts. App Service or containers fit those better."

**Explanation:** Steady high-throughput APIs (App Service/containers cheaper, no cold start), long-running stateful processes, latency-critical paths on Consumption, custom OS/runtime or heavy native dependencies, and HTTP calls longer than the ~230-second front-end limit.

### 9.4 Service Bus basics answers

**B1. Queue vs topic?**

> **Answer to say:** "A queue gives each message to one consumer, so it's for commands. A topic gives every subscriber its own copy, so it's for events that many services care about."

**Explanation:** Queue: one consumer processes each message — commands. Topic: every subscription gets a copy — events.

**B2. Service Bus vs Event Grid vs Event Hubs?**

> **Answer to say:** "Service Bus is for reliable business messages that must not be lost. Event Grid is for light notifications that something happened. Event Hubs is for very high-volume streams like telemetry."

**Explanation:** Service Bus: reliable business messaging — locks, sessions, transactions, DLQ. Event Grid: lightweight push notifications, many Azure sources, no ordering. Event Hubs: high-volume fact streams, partitions, consumer groups, replay by offset.

**B3. Peek-lock vs receive-and-delete?**

> **Answer to say:** "Peek-lock locks the message while we process it and removes it only when we complete it, so nothing is lost if we crash. Receive-and-delete removes it immediately, so a crash loses it."

**Explanation:** Peek-lock: message locked (default 1 min, max 5 min) while processing; complete, abandon or dead-letter; a crash means redelivery — at-least-once. Receive-and-delete: removed on receipt; a crash loses it — at-most-once, only for data you can lose.

**B4. Dead-letter queue?**

> **Answer to say:** "It's a side queue where Service Bus puts messages that can't be processed, for example after too many failed attempts or when they expire. Someone has to monitor it, fix the cause and resubmit."

**Explanation:** Sub-queue for messages that can't be processed: delivery count over **MaxDeliveryCount** (default 10), TTL expired (if enabled), filter errors, or explicitly dead-lettered with a reason. Never processed automatically — needs alerts and a resubmit process.

**B5. Sessions?**

> **Answer to say:** "Sessions group messages with the same session ID and deliver them in order to one consumer at a time, while different sessions are processed in parallel."

**Explanation:** Same **SessionId** → FIFO delivery to one consumer at a time holding a session lock; different sessions in parallel. Enabled at creation; also provides per-session state.

**B6. Duplicate detection?**

> **Answer to say:** "Service Bus remembers message IDs for a time window and drops a message if the same ID is sent again. It only covers resends within that window, so consumers still need to be idempotent."

**Explanation:** Service Bus remembers **MessageIds** for a window (default 10 minutes, up to 7 days) and drops repeats. Enabled at creation, Standard/Premium. Limits: only the same MessageId, only within the window, only on send — consumers must still be idempotent.

### 9.5 Azure SQL answers

**B1. DTU vs vCore, serverless, Hyperscale?**

> **Answer to say:** "DTU is a simple bundled size, while vCore lets us choose compute and storage separately and is the usual production choice. Serverless auto-pauses for intermittent use, and Hyperscale is for very large databases."

**Explanation:** DTU: bundled fixed sizes, simple, small workloads. vCore: cores and storage chosen separately, Azure Hybrid Benefit — production default. Serverless (vCore General Purpose): auto-scales and **auto-pauses** — dev or intermittent use. **Hyperscale**: very large databases, fast scale and backups, read replicas.

**B2. Geo-replication vs failover groups?**

> **Answer to say:** "Geo-replication copies one database to another region and fails over manually. A failover group fails over a set of databases together behind a fixed listener address, so the app doesn't need to change its connection string."

**Explanation:** Geo-replication: per database, readable secondaries, manual failover, connection strings change. **Auto-failover groups**: databases fail over **together** behind **listener endpoints** (read-write, read-only) that follow the primary — no connection-string change; automatic or manual. Use failover groups for app-level DR.

**B3. Isolation levels and RCSI?**

> **Answer to say:** "The levels are read uncommitted, read committed, repeatable read, snapshot and serializable. RCSI lets readers see the last committed version of a row instead of waiting for writers, and it's on by default in Azure SQL."

**Explanation:** Read uncommitted, read committed, repeatable read, snapshot, serializable. **RCSI** lets read-committed readers see the last committed row version instead of waiting on writers' locks — readers and writers don't block each other. **On by default in Azure SQL Database.**

**B4. No-password connection?**

> **Answer to say:** "With a managed identity and Entra ID authentication. The app's identity is created as a database user with only the permissions it needs, and no password is stored anywhere."

**Explanation:** **Managed identity + Entra authentication**: contained DB user `FROM EXTERNAL PROVIDER` for the app identity, least-privilege roles, `Authentication=Active Directory Default` in the connection string.

**B5. Finding slow queries?**

> **Answer to say:** "Query Store shows the slowest and most expensive queries and their plan history. I combine it with automatic tuning, live DMVs and Application Insights timings."

**Explanation:** **Query Store** (on by default): top queries, plan history, regressions, forced plans. Intelligent Insights / database watcher, **automatic tuning** (force last good plan, index suggestions), DMVs for live waits and blocking, App Insights dependency timings.

**S6. Migrating legacy StoreWeb SQL without a big bang (CDC story).**

> **Answer to say:** "In phases. We copy the data once, then use SQL Server Change Data Capture to stream every change from legacy into Azure SQL while legacy stays the source of truth. Once the data matches, we switch writes to the new service and reverse the sync, so rollback stays possible."

**Explanation:** "Phase 1: initial bulk load into Azure SQL. Phase 2: **SQL Server CDC** on legacy tables — reads the transaction log, so it captures every committed change including writes from apps we don't own, in commit order, with no legacy code change. A sync process reads change tables by **LSN range**, applies **idempotent upserts**, and persists its **LSN watermark**. Legacy stays source of truth; **reconciliation** compares counts and checksums. Phase 3: flip writes to the new service, **reverse the sync** so legacy readers stay current and rollback stays possible, and tag sync-originated writes to prevent echo loops. Cutover in a low-traffic window with a runbook." Full version: [tjx-storeweb-prep.md](tjx-storeweb-prep.md).

**S7. 50 ms → 8 s after deploy, CPU 100%.**

> **Answer to say:** "I use Query Store to see whether the query's plan changed, and force the last good plan as a quick fix. Then I fix the real cause, which is usually parameter sniffing, a missing index or a changed query."

**Explanation:** "Query Store → **regressed queries**. Plan changed? **Force the last good plan** as a stop-gap. Then the cause: **parameter sniffing**, a new ORM query shape, implicit conversion breaking an index seek, a missing index after a schema change, stale statistics. Real fix: query/index change, `OPTIMIZE FOR` or `RECOMPILE` where justified, update stats; add regression checks to release validation."

**S8. Deadlocks at peak.**

> **Answer to say:** "I capture the deadlock graph to see which two statements collided. Usually they lock the same tables in opposite order, so I make them use the same order, keep transactions short, and let the app retry on deadlock errors."

**Explanation:** "Capture **deadlock graphs** (system_health Extended Events). Typical cause: reservation locks inventory then order, order creation locks order then inventory — **opposite lock order**. Fixes: same access order everywhere, **short transactions** (no external calls inside), covering indexes, RCSI for readers, `UPDLOCK` for read-to-update. The app **retries on error 1205** with backoff."

**S9. Catalogue reads crushing the primary.**

> **Answer to say:** "Catalogue data is read-heavy and can be slightly stale, so I cache it in Redis and at Front Door, send read-only queries to a read replica, and if needed build a separate read model."

**Explanation:** "Catalogue is read-heavy and tolerates slight staleness. **Cache** (Redis cache-aside, Front Door for public GETs); **read scale-out** (`ApplicationIntent=ReadOnly` to the replica or read listener); **CQRS read model** projected via CDC/outbox into Cosmos DB or AI Search; then tune remaining queries. Writes stay on the primary."

**S10. During a SQL failover?**

> **Answer to say:** "The failover group moves its listener to the new primary, so apps reconnect after a short blip as long as they have retry logic. Because replication is asynchronous, the last few seconds of writes may be lost, which is the agreed RPO."

**Explanation:** "The failover group **listener** moves to the new primary. Connections drop; apps see transient errors for seconds to a minute, so they need **retry logic** (EF Core execution strategy). Replication is **asynchronous**, so the last seconds of writes can be lost — the **RPO**; the grace period sets automatic failover timing (**RTO**). Agree both with the business and rehearse."

### 9.6 Cosmos DB answers

**B1. Partition key?**

> **Answer to say:** "The partition key decides how Cosmos DB spreads data and load. A good key has many distinct values, spreads writes evenly, and is used in the most common query."

**Explanation:** The field used to spread data and throughput across physical partitions. Good key: **high cardinality**, **even writes**, used in the **most common query** so reads hit one partition. Bad: low cardinality (country) or time-based (today) → hot partitions. Logical partition limit 20 GB.

**B2. RU and exceeding it?**

> **Answer to say:** "An RU is the unit of cost for every Cosmos DB operation. If we use more RUs per second than we provisioned, requests get 429 errors and have to retry."

**Explanation:** A Request Unit is the normalised cost of an operation (1 KB point read ≈ 1 RU). Exceeding provisioned RU/s returns **429** with a retry-after hint; the SDK retries. Sustained 429s mean more RU, a better key or cheaper queries.

**B3. Consistency levels?**

> **Answer to say:** "From strongest to weakest: Strong, Bounded staleness, Session, Consistent prefix and Eventual. Session is the default and means users always see their own writes. I pick the weakest level that's still correct."

**Explanation:** **Strong** (latest; not with multi-region writes) → **Bounded staleness** (lag at most K versions / T time) → **Session** (default; read your own writes) → **Consistent prefix** (never out of order) → **Eventual** (fastest, may be stale). Pick the weakest level that's still correct.

**B4. Change feed?**

> **Answer to say:** "The change feed is an ordered stream of every change in a container. I use it to build other views, publish events, update caches and trigger Functions."

**Explanation:** Ordered log of changes per partition, read with a saved lease position. Uses: second view with a different key, publish events (built-in outbox), update caches/search, trigger Functions. Default mode has no deletes — soft delete or all-versions-and-deletes mode.

**B5. Provisioned vs autoscale vs serverless?**

> **Answer to say:** "Provisioned is fixed throughput for steady load, autoscale moves between 10 and 100 percent of a maximum for spiky load, and serverless charges per request for light or dev use."

**Explanation:** Manual provisioned: steady load, cheapest. Autoscale: 10%–100% of a max — spiky retail peaks. Serverless: pay per RU — dev/test or low intermittent traffic, with limits.

**S6. Inventory model (1,000 stores × 500k SKUs).**

> **Answer to say:** "I partition by store ID with the SKU as the document ID, so reading one item in one store is cheap and writes spread across stores. For 'which stores have this SKU', the change feed keeps a second container partitioned by SKU."

**Explanation:** "Main container keyed on **storeId**, id = SKU — 'stock of SKU X in store Y' is a cheap **point read**, and writes spread across 1,000 partitions (each well under 20 GB). 'Which stores have SKU X' is cross-partition, so the **change feed** builds a second container keyed on **SKU** — eventually consistent, fine for availability lookups. If a partition grows hot, a **hierarchical key** (storeId → department) splits it."

**S7. 429s at 30% total usage.**

> **Answer to say:** "Throughput is split across physical partitions, so one hot partition can hit its limit while total usage is low. The fix is a better partition key, not just more RUs."

**Explanation:** "Throughput is split **per physical partition**, so one partition can be at 100% while the total is 30% — a **hot partition** (flagship store, a 'today' key). Check normalised RU by partition key range. Fix with a better or **synthetic key**, hierarchical keys, caching hot reads, cheaper queries. Raising RU blindly wastes money."

**S8. Cosmos vs Azure SQL for StoreWeb?**

> **Answer to say:** "Cosmos DB for high-scale lookups by key, like inventory snapshots or carts. Azure SQL for relational data that needs joins and transactions, like orders and payments. Most systems use both."

**Explanation:** "Cosmos for high-volume key-value/document access with predictable keys and global distribution: inventory snapshots, carts, device state, read-optimised catalogue views. Azure SQL for relational data needing joins, constraints and multi-table transactions: orders, payments, financial records, reporting. Most systems use both."

**S9. Two stores update the same item.**

> **Answer to say:** "Optimistic concurrency with ETags. Each update says 'only if nobody changed it since I read it', and if someone did, it re-reads and retries."

**Explanation:** "**Optimistic concurrency with ETags**: write with `If-Match`; if someone updated first, **412** → re-read, re-apply, retry. **Transactional batch** for related docs in one partition. For hot counters, **patch** with increment and a filter predicate (only if quantity ≥ 1)."

**S10. Bill tripled.**

> **Answer to say:** "I look at which operations use the most RUs, usually cross-partition queries or indexing everything, and check autoscale limits, extra regions and data without a TTL. Then I fix the biggest consumers first."

**Explanation:** "Check **RU per operation**: new **cross-partition queries**, an **indexing policy** indexing everything (exclude unused paths), bigger documents. Then **autoscale max** too high, **extra regions**/multi-region writes, missing **TTL**, dev accounts on provisioned throughput. Fix the top consumers, then right-size."

### 9.7 Cross-service architecture answers

**X1. StoreWeb order and inventory flow end to end.**

> **Answer to say:** "Stores and web clients come in through Front Door and APIM. The order service saves the order in Azure SQL with an outbox and publishes an event to Service Bus, and inventory, payment, loyalty and fulfilment each process it independently. Failures are handled by a saga, and everything is private, uses managed identities, and is traced with one correlation ID."

**Explanation:** "**Edge:** Front Door Premium + WAF → APIM in two regions (token validation, per-store limits, versions). **Store:** POS calls the Order API; local service + queue keep selling offline. **Order API** (App Service/Container Apps) writes the order to **Azure SQL** with an **outbox** row and returns fast. A relay publishes `OrderPlaced` to a **Service Bus topic**: **inventory** (Cosmos DB keyed by storeId, ETag concurrency), **payment**, **loyalty**, **fulfilment/warehouse**, **analytics** each on their own subscription. Failures via a **saga** (Durable Functions) with compensations (release reservation, refund). **Security:** Private Link, managed identity, Key Vault. **Observability:** correlation ID from APIM through every message, App Insights + KQL, alerts on DLQ, queue age, 429s, p95. **Delivery:** IaC, pipelines, canary by store rings."

**X2. Last unit sold online and in-store at once.**

> **Answer to say:** "The stock decrement must be atomic, so only one sale wins the last unit. Because stores can sell offline, we also keep a small safety stock for online orders, and if an oversell still happens, the order is cancelled or rerouted and the customer is told."

**Explanation:** "The decrement must be **atomic**: conditional update (ETag/patch with `quantity >= 1` in Cosmos, or `UPDATE … WHERE qty >= 1` in SQL) — the loser gets 'out of stock'. But stores may sell **offline**, so real time isn't always possible; retailers keep a **safety-stock buffer** for online availability and accept a small oversell risk. If oversell happens, the **saga compensates**: cancel or reroute the online order, notify the customer, offer an alternative. Blocking (lost sales) vs allowing (occasional oversell) is a business decision."

**X3. "I paid but my order is stuck."**

> **Answer to say:** "I take the order's correlation ID and trace it in Application Insights to find the last step that worked. Then I check the dead-letter queue, queue age, throttling and timeouts, fix the cause, resubmit safely, and add an alert so we catch it next time."

**Explanation:** "Order ID → **correlation ID** → App Insights end-to-end transaction / KQL to find the **last successful step**. Check: message in a **DLQ** with a reason? **Queue age** growing? **429s** or SQL timeouts? Payment call timed out? Fix the cause, **resubmit** (idempotent handlers make it safe), confirm the order moved. Then add a **business alert** (e.g. 'Paid' but not 'Confirmed' after 5 minutes)."

**X4. East US down at 7 pm on Black Friday.**

> **Answer to say:** "Front Door moves traffic to the other region within seconds, APIM and the services there are already running, and SQL and Cosmos DB fail over to their secondary. Stores keep selling locally, and we follow a runbook we've already rehearsed."

**Explanation:** "**Front Door** probes fail → traffic to West US in seconds. **APIM** in West serves. **App services** already run in West, pre-scaled for peak. **Azure SQL** failover group fails over — apps reconnect via the listener with retries; RPO a few seconds of writes. **Cosmos DB** fails over its write region. **Service Bus** Premium geo-replication/geo-DR alias switches; in-flight messages in the failed region may be delayed. Stores keep selling locally. All of it is a **rehearsed runbook** with RPO/RTO per service — untested DR usually fails."

**X5. Store keeps selling during a 2-hour outage (known gap — be honest, reason it through).**

> **Answer to say:** "The store runs its essential services locally with its own database, so sales are saved locally and queued. When the connection comes back, the queue syncs to the cloud, and every transaction has a unique ID so nothing is counted twice."

**Explanation:** "Treat the store as an **edge node**: POS and essential services run locally with a **local database** holding the price file, catalogue and local stock. Sales are written locally into a **store-and-forward outbox** with idempotent transaction IDs. Card payments use the provider's offline/stand-in mode within risk limits. On reconnect the queue **syncs in order**; the cloud side is idempotent. **Conflict rules**: store sales always count; HQ price changes win by version. APIM **self-hosted gateway** or Azure Arc-managed edge can host local APIs. I haven't built a retail edge myself, but it's the same outbox + idempotency + versioning pattern I've used in the cloud, moved into the store."

**X6. No public backends, no secrets.**

> **Answer to say:** "Only Front Door is public. Everything else sits behind private endpoints with public access turned off, services authenticate with managed identities, and the few remaining secrets live in Key Vault, with Azure Policy enforcing all of it."

**Explanation:** "Only **Front Door Premium** is public (WAF, bot rules). Origins via **Private Link**; App Service/AKS, APIM, SQL, Cosmos, Service Bus Premium, Storage and Key Vault behind **private endpoints**, public access disabled, **private DNS zones**. Service-to-service auth via **managed identity + RBAC** (least privilege). Remaining third-party secrets in **Key Vault**, rotated. **Azure Policy** denies public endpoints and enforces diagnostics; **Defender for Cloud** monitors posture. APIM and services both validate JWTs. Subnets and NSGs segment the network; outbound via a firewall with allow-lists."
