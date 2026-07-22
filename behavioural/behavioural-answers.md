# Behavioural Answers — EPAM Interview

---

## EPAM / Architect Track (16 yrs, Capital Access)

*Framing for the EPAM Application Architect role at S&P Global — 16-year Application Architect narrative, most recent project Capital Access.*

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

---

## Other Company Rounds — Senior Full Stack Track (9 yrs, Entity Management System)

*Sourced from live interview rounds: Wipro (R1, R2), Decos Global (R1), Infosys (R1), Virtusa (R1). This is a distinct framing from the EPAM/Architect track above — 9-year Senior Full Stack Developer, most recent project the Entity Management System (Grant Thornton, healthcare domain). Kept separate rather than blended with the Capital Access narrative, since the two tracks report different tenure and a different most-recent project.*

### Q: Introduce yourself (Virtusa)

"I'm Ankit, a Senior Full Stack Developer with 9 years of experience specialising in C# .NET Core, Angular, and Azure. My most recent engagement was with Grant Thornton, where I built an Entity Management System for the healthcare domain — tracking business entities, shareholding percentages, and partnerships.

On the tech side: .NET Core Web API with Clean Architecture, Angular (standalone components), SQL Server with optimised stored procedures, and Azure (App Service, Functions, Blob Storage, DevOps CI/CD, Application Insights).

One example of impact: our dashboard was timing out at ~8 seconds due to N+1 queries. I rewrote the logic into a single CTE-based stored procedure, cutting response time to 420ms — a ~95% improvement.

I've also worked on monolith-to-microservices migration, Docker containerisation, and Azure Function-based event-driven pipelines. I'm comfortable across the full delivery lifecycle — design, development, code review, deployment, and production triage."

Keep it under 90 seconds: name, years, specialisation, last project, one measurable win — in that order.

---

### Q: Technologies and projects worked on / Entity Management System — role and description

Full stack: Angular (5+ years), React (~10 months), C# .NET Core, SQL Server, Azure; also Azure Functions and Cosmos DB.

The Entity Management System (Grant Thornton, healthcare) tracked businesses and entities to compute partnerships and shareholding percentages — an enterprise app on layered architecture. Role: Full Stack Developer across Angular/React front end, .NET Core Web APIs, SQL Server, and Azure backend, delivered against Agile user stories.

---

### Q: Rate yourself 1–5 in your core stack

| Skill | Rating | Backing evidence |
|---|---|---|
| .NET Core | 4/5 | 9 years, Clean Architecture, Web API design |
| Angular | 4/5 | 5+ years, standalone components, NgRx-adjacent state patterns |
| Web API | 4/5 | Auth, versioning, middleware, performance tuning |
| Entity Framework | 3.5/5 | Code First migrations, N+1 diagnosis and fixes, Eager/Lazy/Explicit loading |
| React | 3/5 | ~9–10 months hands-on, hooks, state management, component lifecycle |

Always back a number with a concrete example rather than leaving it as a bare rating — the number invites a follow-up question, so have the story ready before you say it.

---

### Q: Describe a production incident you triaged, end to end

Framework: **Detect → Contain → Diagnose → Fix → Post-Mortem.**

**Incident**: the dashboard API started returning `503`s for ~20 minutes on a Monday morning; clients reported the page not loading.

**Detect**: an Application Insights alert fired on error rate > 5%, paging via an Azure Monitor action group.

**Contain (first 2 minutes)**: App Service → Scale Out showed 2 instances at 95% CPU; manually scaled to 4 instances for immediate partial relief. App Service logs showed an `OutOfMemoryException` in the worker process.

**Diagnose**: pulled a memory dump from the App Service Diagnose blade. Root cause: a background job deployed the previous Friday loaded 50,000 entity records into memory with no pagination, running every 5 minutes — each run grew memory further until OOM. The specific bug: `.ToList()` on an unbounded EF Core query.

**Fix**: hotfix added `.Take(500)` pagination to the job and deployed via the Azure DevOps pipeline (~15 minutes). Permanent fix replaced the background job with a SQL-aggregated stored procedure — zero in-memory object graphs.

**Post-mortem**: added a memory-usage alert (>80% for 3 minutes) to Azure Monitor, added a code-review checklist item ("all EF Core queries must have pagination or an explicit count justification"), and documented the timeline/root cause/fix/prevention in Confluence.

**Guiding principle to state out loud**: fix availability first (scale out), diagnose second, fix root cause third — never debug directly in a live, still-failing production system.

---

### Q: Your main experience is in .NET. AI is relatively new for you. How do you justify your AI experience?

**Framing (what NOT to say):**
- ❌ "I'm not really an AI expert, but I built a hobby project"
- ❌ "I taught myself last month" (sounds like shallow learning)
- ❌ Overselling depth you don't have

**Framing (what TO say):**
- ✅ "I have hands-on experience building and shipping an LLM-powered system end-to-end"
- ✅ "I went deep on the parts that mattered: architecture, safety, evaluation, not on ML theory"
- ✅ "I learned by building, not by taking a course"

**The Story:**

"My background is 16 years in .NET backend systems, so AI was new territory. But when I started the community Q&A AI project, I committed to understanding the full stack end-to-end, not just gluing together libraries.

**What I actually did:**
1. **Architecture**: I designed the agent orchestration from scratch — observe-decide-act loop, tool execution, state management, memory tiers. No framework, just core principles. This forced me to understand what agents actually do.

2. **Safety**: I implemented tracing, error handling, infinite-loop detection, context window management. In AI, 'it seems to work' is dangerous — I built mechanisms to validate that queries were actually correct before returning them to users.

3. **Evaluation**: I didn't just launch the project and hope. I tracked which queries failed, why the LLM chose certain tools, where tracing showed bottlenecks. I used this feedback to tune prompts and model selection.

4. **Constraints**: I chose tools specifically (ChromaDB for embeddings, Gemini for generation, LLM for orchestration) based on trade-offs, not defaults.

**Why this counts as real experience:**
- I shipped a working system users interact with daily
- I made production decisions (Cosmos vs PostgreSQL, HTTP API vs MCP, when to use embeddings vs full-text)
- I hit real problems (.NET calling Python FastAPI, token counting, context window management) and solved them
- I read research (RAG techniques, CQRS for eventual consistency, prompt engineering)

**Where I'm NOT an expert:**
- I'm not a machine learning researcher (no model training)
- I'm not competing on latency benchmarks
- I haven't scaled to millions of queries

**Why .NET depth helps:**
- Systems thinking: I understand async/await, cancellation tokens, error handling at scale
- I know how to build reliable APIs that call unreliable downstream services (the LLM)
- I'm disciplined about testing, tracing, observability — things AI projects often skip

So my AI experience is: **deep on systems, wide on tools, honest about boundaries.**"

**Close with:**
"I'm not claiming to be an AI expert, but I have hands-on experience shipping a production AI system, end-to-end. I learned AI by building, not by theory. Where I need deeper ML knowledge, I'll learn quickly because I have the foundation."

> **Interview line**: "My AI experience is new but real — I built a complete LLM application end-to-end, from orchestration to safety to deployment. I didn't just glue libraries together; I understood the architecture, implemented tracing and validation, and made platform trade-offs (Cosmos vs SQL, ChromaDB vs PostgreSQL). I'm not an ML researcher, but I'm a systems engineer who built and shipped AI software. My 16 years in .NET meant I brought production-grade thinking to an unfamiliar domain."
