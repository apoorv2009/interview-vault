# Behavioural Answers — EPAM Interview

---

## Q: Tell me about yourself / Walk me through your career journey

"Hi, I'm Apoorv Jain — Application Architect with 16 years of experience, based in Hyderabad. My expertise is in Azure cloud architecture, full-stack .NET and Angular development, and more recently AI and GenAI systems.

I started my career in 2010 at **Cerebrata Software**, where I built Azure Storage management tools — Cerebrata Azure Management Studio — which at its peak was used by over **100,000 Azure developers worldwide**. That's where I got very deep into Azure fundamentals early on, well before it was mainstream.

From there I joined **Applied Information Services**, where I spent 9 years growing from Software Engineer all the way to Module Lead. I delivered **15+ enterprise projects** across healthcare, insurance, and eCommerce — leading teams of 5 to 12 developers. This is where I matured as an architect — I designed multi-tenant SaaS platforms on Azure SQL supporting 50,000 concurrent users, established Angular front-end standards adopted across 6 project teams, and led SQL Server migrations to Azure SQL Managed Instance achieving **40% infrastructure cost reduction**.

In 2022 I moved to **Wipro as Application Architect**, where I worked at much larger scale — I led cloud migration programmes for Fortune 500 clients, defining target-state Azure architectures across IaaS, PaaS, and SaaS workloads. I also architected JTI-TERA, an enterprise mobility platform serving **5,000 field sales users across 20 markets**, with an offline-first sync architecture on Azure Service Bus.

Since December 2024 I've been at **S&P Global as Application Architect** on Capital Access — an enterprise investor relations SaaS platform serving **500+ institutional clients**. I own the front-end platform architecture on Angular 18 and NgRx, designed OIDC authentication flows, led a migration from legacy webpack to Angular 18 standalone components cutting **bundle size by 30%**, and drive the overall CI/CD strategy on Azure DevOps.

Outside of work, I recently built **Aagam Mitra** — a production RAG and Agentic AI assistant for a Jain temple community app, using Groq, Pinecone, and Gemini Embeddings. This gave me deep hands-on experience in LLM integration, vector search, and agentic function calling — which I'm actively bringing into my architecture thinking.

So in summary — 16 years across capital markets, healthcare, insurance and eCommerce, from developer to architect, with a strong Azure foundation and now an AI layer on top. I'm excited about EPAM because of the scale and diversity of engineering challenges you work on."

**Career timeline at a glance:**

| Period | Company | Role | Key highlight |
|---|---|---|---|
| 2010–2013 | Cerebrata Software | Software Engineer | Azure tools used by 100K+ devs |
| 2013–2022 | Applied Information Services | SE → Module Lead | 15+ projects, 9 years, 40% cost reduction |
| 2022–2024 | Wipro | Application Architect | Fortune 500 cloud migration, 5K users/20 markets |
| 2024–Now | S&P Global | Application Architect | Capital Access SaaS, 500+ clients, 30% bundle reduction |
| Side project | — | Solo Architect | Aagam Mitra — RAG + Agentic AI assistant |

---

## Q: Tell me about your previous project — roles and responsibilities

"I've been working at S&P Global on a platform called **Capital Access**, which is a B2B SaaS product that connects institutional investors with public companies to facilitate engagement activities — think investor meetings, conference calls, roadshows.

Architecturally it's a **microservices system** built on **.NET 8 and Azure** — seven services covering ownership data, investor profiles, targeting, contacts, notifications, reports, and engagement activity tracking. The front end is **Angular 18** with NgRx for state management.

My role was as a **Full Stack Developer**. On the backend, I designed and built the Engagement/Activity service — this handles all the CRUD operations for engagement events, tracks attendees, and publishes domain events to **Azure Service Bus** for downstream consumers like Notifications and Reports. I also worked on the authentication layer, implementing **Okta OIDC** with custom JWT claims (tenantId, roles) for multi-tenant isolation.

On the frontend, I built several Angular features including the engagement calendar, investor targeting grid with virtual scrolling for performance, and the report download flow that integrates with **Azure Durable Functions** for long-running PDF generation.

I also contributed to our CI/CD pipeline in **Azure DevOps** — maintaining the NUnit test suite, code coverage gates, and deployment pipelines to AKS."

---

## Q: What value does your project bring to the client?

"Capital Access solves a real operational problem for both sides of the market.

For **public companies**, the value is in intelligence and efficiency. Instead of manually tracking which institutional investors own their stock and reaching out blindly, Capital Access surfaces ownership data and investor profiles — so IR teams know exactly who to target, when they last engaged, and what the relationship history looks like. This reduces wasted outreach and helps companies build more meaningful investor relationships.

For **institutional investors**, it reduces friction in the engagement process — meeting requests, materials, follow-ups all managed in one platform rather than scattered across emails and spreadsheets.

From a technical value perspective, the platform handles **multi-tenant data isolation** (each fund manager sees only their data), processes **large ownership datasets** from custodian feeds, and delivers reports on-demand via an async pipeline — so what used to take hours of manual work is available in minutes.

The business impact: S&P Global can offer this as a differentiated data product, increasing stickiness of their institutional client base."

---

## Q: What AI tools have you used, and what percentage?

"I use AI tools actively in my daily development workflow — I'd estimate **40-50% of my coding time** involves AI assistance.

Specifically:
- **Claude (Anthropic)** — my primary tool for complex reasoning tasks: designing architecture, reviewing code logic, writing and refactoring C# services, debugging tricky EF Core issues. I use Claude Code (the CLI) for codebase-aware assistance.
- **GitHub Copilot** — inline code completions inside VS Code, mainly for boilerplate: writing test cases, LINQ queries, mapping code, DTO constructors.
- **Cursor** — occasional use for refactoring workflows.

**Validation strategy — this is critical:** I never accept AI output blindly.
1. I review every suggestion before accepting — does it match our architecture patterns?
2. For logic-heavy code: I trace through the output manually or write a test to verify
3. For security-sensitive code (auth, JWT handling, SQL): zero AI code goes in unreviewed
4. AI is a first-draft accelerator, not a replacement for understanding

Concrete example: used Claude to scaffold the initial Durable Functions orchestrator for our report pipeline — saved 2 hours of boilerplate. But I spent another hour reviewing the activity function error handling, because AI had used a naive retry pattern that wouldn't work correctly with our Service Bus exactly-once semantics."

---

## Q: How does the API validate the JWT token — does it call Okta on every request?

"No — calling Okta on every request would be too slow and would make our system dependent on Okta's availability for every single API call.

Here's how it actually works. When Okta issues a JWT token, it signs it using its private key — think of it like a wax seal that only Okta can create. Okta also publishes its public keys at a well-known JWKS endpoint — JWKS stands for JSON Web Key Set. This is a public URL anyone can reach.

When Azure API Management starts up, it fetches those public keys from the JWKS endpoint and caches them locally. From that point, every incoming JWT is validated in memory using the cached public key — pure cryptographic signature verification, no network call to Okta needed. Along with the signature, APIM also checks that the token hasn't expired, the issuer is correct, and the tenant and role claims are valid.

**Why not call Okta every time?** Three reasons — performance, availability, and scale. A live Okta call would add 50 to 200 milliseconds of latency to every API request. If Okta had a brief outage, our entire platform would go down with it. Caching the public keys keeps validation fast and our system independent of Okta's availability per request.

**Key rotation** — Okta rotates its signing keys periodically. Each JWT carries a `kid` (key ID) in its header. When APIM sees a `kid` it doesn't recognise in its cache, it automatically refreshes from the JWKS endpoint. No manual intervention needed.

**Token revocation limitation** — since validation is local, a stolen token remains valid until it expires. That's why access tokens are kept short-lived — 15 to 60 minutes — and we use a refresh token to silently get a new access token when the old one expires. Short lifetime = small window of risk."

**One-liner:** "APIM fetches Okta's public keys once and caches them. Every JWT is validated locally using that cached public key — no Okta call per request. Fast, reliable, and decoupled from Okta's availability."

---

## Q: How do you build an API that is secure and performance-centric?

**Security:**
```
1. JWT Authentication — Okta OIDC, validate signature + expiry + audience
2. Authorization — [Authorize] with policy-based checks (tenantId claim validation)
3. HTTPS only — HSTS enforced
4. Input validation — FluentValidation / DataAnnotations on all DTOs
5. SQL Injection prevention — EF Core parameterized queries, never string concat
6. Rate limiting — ASP.NET Core rate limiting middleware per tenant
7. CORS — only allowed origins, never wildcard in production
8. Secrets in Key Vault — never in appsettings.json
9. Principle of least privilege — API service account has minimum DB permissions
10. OWASP Top 10 awareness in code review
```

**Performance:**
```
1. AsNoTracking() for all read-only EF Core queries
2. Pagination — keyset pagination not OFFSET for large datasets
3. Projection — .Select(e => new Dto{}) not SELECT *
4. Caching — Redis for frequently read reference data (investor profiles, company list)
5. Async all the way — async/await on every I/O call, never .Result
6. Include() to prevent N+1 queries
7. Indexed columns — ensure WHERE/JOIN columns are indexed in Azure SQL
8. Response compression — AddResponseCompression() for large payloads
9. Avoid chatty APIs — return everything the client needs in one call
10. Correlation ID — traces slow requests in Application Insights
```

---

## Q: How do you track issues in production?

"We use a layered observability approach:

**Application Insights** is our primary tool — every request is traced, exceptions captured with full stack traces, and we have custom events for business-critical flows like report generation and engagement creation.

**Correlation IDs** — every request gets an `X-Correlation-ID` header (generated in middleware if not present). This ID flows through all downstream service calls and is stamped on every log line. When an issue is reported, I can grep by correlation ID in Application Insights and see the entire request journey across all services.

**Alerting** — Azure Monitor alerts fire to our Teams channel if error rate exceeds 5% in a 5-minute window, or if p99 latency crosses 2 seconds.

**Process for investigating a production issue:**
1. Get the correlation ID from the user report or error alert
2. Open Application Insights → search by correlation ID → see full trace
3. Identify which service/dependency failed (DB timeout? External API? Our code?)
4. If DB: pull the slow query, check execution plan, look for missing index
5. If our code: reproduce locally with the same inputs
6. Fix → deploy via Azure DevOps pipeline → verify in production with same correlation ID pattern"

---

## Q: What is your approach to moving .NET Framework 4.7 to modern .NET?

"I'd take a phased, risk-managed approach — never a big-bang rewrite.

**Phase 1 — Analyze**: Run the .NET Upgrade Assistant (`upgrade-assistant analyze`) to get a compatibility report. Identify which NuGet packages have no .NET 8 equivalent, which APIs are removed, and estimate the effort.

**Phase 2 — Migrate class libraries first**: Convert shared libraries to .NET Standard 2.0 — compatible with both Framework and modern .NET. This lets you modernize incrementally without breaking the running system.

**Phase 3 — Strangler Fig pattern**: Don't migrate the whole app at once. Extract one endpoint or service at a time into a new .NET 8 project. Route traffic to new service when ready. Old system keeps running until all routes are migrated.

**Phase 4 — Modernize**: Replace Web.config with appsettings.json + environment variables. Replace Unity/Autofac with built-in DI. Replace HttpContext.Current with IHttpContextAccessor. Update to async/await where synchronous blocking calls existed.

**Phase 5 — Decommission**: Once all traffic routes to the new system and monitoring is stable for 2 weeks, retire the old system.

Why this approach? Because a big-bang rewrite has a high failure rate — you're essentially rebuilding the entire system, introducing new bugs, without the safety net of the running production system. The strangler fig lets you validate each piece independently."
