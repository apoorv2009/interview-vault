# Capital Access — Interview Preparation

**Production SaaS platform for Investor Relations teams.** My role: Lead Software Development Engineer, S&P Global (Dec 2024 – Present).

This directory contains **complete, production-grade interview prep** for the Capital Access microservices architecture, operations, and deployment strategy. Everything is self-contained — no external references needed.

---

## 🗺️ Quick Navigation

### **Which file should I read?**

| Need | File | Time |
|------|------|------|
| **Interview narrative & architecture** | [capital-access-interview-story.md](capital-access-interview-story.md) ⭐ START HERE | 30 min |
| **Technical patterns & services** | [capital-access-deep-dives.md](capital-access-deep-dives.md) | 2-3 hrs |
| **Production operations & CI/CD** | [capital-access-operations.md](capital-access-operations.md) | 1-2 hrs |

---

## 📖 Complete Index by Topic

**Architecture & Design:**
- [Architecture Overview](capital-access-interview-story.md#architecture-overview)
- [Service Decomposition Strategy](capital-access-deep-dives.md#service-decomposition-strategy)
- [Database Per Service](capital-access-deep-dives.md#service-decomposition-strategy)

**Authentication & Security:**
- [OIDC Authentication](capital-access-interview-story.md#how-to-explain-the-full-project-flow-verbally-interview-script)
- [Okta Deep Dive](capital-access-deep-dives.md#deep-dive--okta-identity--oidc)
- [Multi-Tenancy Enforcement](capital-access-deep-dives.md#multitenant-on-app-service)
- [Secrets Management](capital-access-operations.md#securing-key-vault-without-secrets-in-code)

**Microservices Patterns:**
- [Communication Patterns](capital-access-interview-story.md#service-to-service-communication-patterns)
- [SAGA Pattern (Distributed Transactions)](capital-access-deep-dives.md#saga-pattern--distributed-transactions-across-services)
- [Orchestration vs Choreography](capital-access-deep-dives.md#orchestration-vs-choreography--which-does-capital-access-use)
- [Idempotency & Eventual Consistency](capital-access-deep-dives.md#idempotency--eventual-consistency)
- [Circuit Breaker Pattern](capital-access-deep-dives.md#circuit-breaker-pattern--cascading-failures)

**Azure Services Deep Dives:**
- [Azure App Service](capital-access-deep-dives.md#deep-dive--azure-app-service-microservices-hosting)
- [Azure Service Bus](capital-access-deep-dives.md#deep-dive--azure-service-bus)
- [Azure Functions](capital-access-deep-dives.md#deep-dive--azure-functions-triggers-bindings-hosting)
- [Durable Functions](capital-access-deep-dives.md#deep-dive--durable-functions)
- [Azure Cosmos DB](capital-access-deep-dives.md#deep-dive--azure-cosmos-db)
- [EF Core 8](capital-access-deep-dives.md#deep-dive--ef-core-8-ir-engagement--activity-service)

**CQRS & Data Patterns:**
- [CQRS Pattern](capital-access-deep-dives.md#cqrs-pattern--ownership-data)

**Operations & Deployment:**
- [Logging & Observability](capital-access-operations.md#logging--observability--app-insights--splunk)
- [Report Generation](capital-access-operations.md#report-generation-architecture)
- [Feature Toggles](capital-access-operations.md#feature-toggles-feature-flags--deployment-without-risk)
- [CI/CD Pipeline Architecture](capital-access-operations.md#deep-dive--cicd-pipeline-architecture)
- [Advanced Operations FAQ](capital-access-operations.md#advanced-operations--production-scenarios--interview-faq)

**Interview Content:**
- [Interview Script](capital-access-interview-story.md#how-to-explain-the-full-project-flow-verbally-interview-script)
- [STAR Story](capital-access-interview-story.md#the-star-story--say-this-in-the-interview)
- [Follow-Up Q&A](capital-access-interview-story.md#follow-up-questions--answers)

---

## 🎯 Index by Interview Question Type

**"What is Capital Access?" / "Explain the system"**
→ [Interview Script](capital-access-interview-story.md#how-to-explain-the-full-project-flow-verbally-interview-script)

**"What's your role?"**
→ [Your Role & Ownership](capital-access-interview-story.md#your-role--ownership)

**"Walk me through the architecture"**
→ [Architecture Overview](capital-access-interview-story.md#architecture-overview)

**"Why microservices?"**
→ [Service Decomposition Strategy](capital-access-deep-dives.md#service-decomposition-strategy)

**"How do you handle distributed transactions?"**
→ [SAGA Pattern](capital-access-deep-dives.md#saga-pattern--distributed-transactions-across-services)

**"How do you ensure data isolation in multi-tenancy?"**
→ [Multi-Tenancy Enforcement](capital-access-deep-dives.md#multitenant-on-app-service)

**"Describe your authentication flow"**
→ [Okta Deep Dive](capital-access-deep-dives.md#deep-dive--okta-identity--oidc)

**"How do services communicate?"**
→ [Service-to-Service Communication](capital-access-interview-story.md#service-to-service-communication-patterns)

**"Explain your CI/CD pipeline"**
→ [CI/CD Pipeline Architecture](capital-access-operations.md#deep-dive--cicd-pipeline-architecture)

**"How do you deploy safely?"**
→ [Feature Toggles](capital-access-operations.md#feature-toggles-feature-flags--deployment-without-risk)

**"How do you handle failures?"**
→ [Circuit Breaker Pattern](capital-access-deep-dives.md#circuit-breaker-pattern--cascading-failures)

**"Describe your STAR story / most impactful project"**
→ [STAR Story](capital-access-interview-story.md#the-star-story--say-this-in-the-interview)

---

## 📚 Documentation Structure

The Capital Access documentation is organized into **3 focused files** for efficient interview prep:

### **1. [capital-access-interview-story.md](capital-access-interview-story.md)** ⭐ START HERE
**Read time: 30 minutes | Purpose: Interview narrative & architecture**

Your main interview story and system overview.

**Contains:**
- ✅ What is Capital Access (product context for 2,500 corporate issuers)
- ✅ How to explain it verbally (complete interview script)
- ✅ Your role and ownership (feature dev, auth, platform modernization)
- ✅ Architecture diagram (Okta → Front Door → APIM → 6 microservices → data stores)
- ✅ Service overview (Ownership, Profiles, Targeting, Contacts, Notifications, Report)
- ✅ Brief communication patterns (sync, async, pub/sub)
- ✅ Angular 18 & Multi-Tenancy frontend
- ✅ **STAR Story** (your 3-minute pitch — practice this!)
- ✅ Follow-Up Questions & Answers
- ✅ Links to deep dives and operations

**→ Read this first. It tells the complete story in 30 minutes.**

---

### **2. [capital-access-deep-dives.md](capital-access-deep-dives.md)** 🔧 TECHNICAL DEPTH
**Read time: 2-3 hours | Purpose: Technical patterns & services**

Comprehensive deep dives into every technical pattern and Azure service.

**Contains (9 complete deep dives):**

1. **Azure App Service** (Microservices hosting)
   - Why App Service vs AKS vs VMs
   - How hosting works (instances, load balancing, auto-scaling)
   - Deployment strategies and health checks
   - Multi-tenancy enforcement
   - Interview Q&A

2. **Microservices Patterns & Strategies** ⭐ MOST IMPORTANT
   - Service decomposition strategy (why 6 services, bounded contexts)
   - **SAGA Pattern** (distributed transactions)
     - Orchestration vs Choreography with complete C# code
   - Idempotency & Eventual Consistency
   - Circuit Breaker Pattern (preventing cascading failures)
   - API Versioning & Backward Compatibility
   - Real Capital Access examples throughout

3. **CQRS Pattern** (Ownership data, read/write separation)
   - Problem: Quarter-end bulk updates vs dashboard reads
   - Solution: Two models, two databases
   - Event sourcing for audit trail

4. **Okta OIDC** (Authentication & identity)
   - How JWT is issued with custom claims (tenant ID, roles)
   - Silent token renewal
   - Role-based access control

5. **Azure Service Bus** (Async communication)
   - Topics & Subscriptions (pub/sub)
   - Queues (task distribution)
   - Dead-Letter Queue (failed message handling)
   - Guaranteed delivery patterns

6. **Azure Functions** (Serverless orchestration)
   - Triggers (Service Bus, timers, HTTP)
   - Bindings (input/output)
   - Report Worker use case (aggregating data from multiple services)

7. **Durable Functions** (Long-running workflows)
   - Orchestration functions
   - Activity functions
   - Error handling & retries

8. **Azure Cosmos DB** (Time-series data)
   - Why chosen for ownership data (high-volume writes)
   - Partition keys & consistency
   - Cost optimization

9. **EF Core 8** (Data access & migrations)
   - Global query filters (multi-tenant data isolation)
   - Lazy loading & change tracking
   - N+1 query prevention
   - Migrations as CI/CD deployment step

**→ Read when preparing for technical questions. Each deep dive is self-contained.**

---

### **3. [capital-access-operations.md](capital-access-operations.md)** 🚀 PRODUCTION OPERATIONS
**Read time: 1-2 hours | Purpose: How it operates at scale**

How Capital Access runs, deploys, and maintains stability in production.

**Contains:**

1. **Logging & Observability**
   - App Insights (distributed tracing, APM)
   - Splunk (log search, dashboards)
   - Correlation IDs (request journey tracking)

2. **Report Generation Architecture**
   - Async job queue pattern
   - Serverless orchestration (Report Worker function)
   - Multi-step aggregation from 4 services

3. **CI/CD & DevOps** (High-level overview)
   - PR validation pipeline
   - Multi-stage deployment

4. **Feature Toggles** (Feature flags for safe rollout)
   - Azure App Configuration
   - Gradual rollout (1% → 5% → 25% → 100%)
   - Instant rollback on issues
   - Backend & frontend implementation with code

5. **Complete CI/CD Pipeline Architecture** ⭐ REAL-TIME WALKTHROUGH
   - **STAGE 1:** PR validation (linting, tests, security scan, bundle size)
   - **STAGE 2:** Merge to main & deploy to DEV (build, integration tests)
   - **STAGE 3:** Deploy to STAGING (E2E tests, load testing, QA sign-off)
   - **STAGE 4:** Deploy to PRODUCTION (canary deployment, gradual traffic shift, monitoring)
   - Real timestamps showing exactly what happens at each step
   - Automatic rollback if error rate > 1%
   - Failure scenario walkthrough (what happens if something breaks)

6. **Advanced Operations FAQ** (10 production interview scenarios)
   - Traffic management & cost efficiency
   - High-traffic success without overprovisioning
   - Distributed tracing with correlation IDs
   - Dynamic threshold adjustment
   - Microservices security & secrets
   - Managed Identity configuration with code
   - Secure deployment with environment-specific configs

**→ Read when preparing for "How do you operate at scale?" questions.**

---

## 🎯 Interview Prep Roadmap (5-Day Plan)

### **Day 1: Understand the System (2 hours)**
1. Read `capital-access-interview-story.md` (30 min)
2. Study the architecture diagram
3. Practice STAR story (30 min) — record yourself, time it (< 3 min)
4. Read through Follow-Up Questions

### **Day 2-3: Technical Deep Dives (4-5 hours total)**
Study one deep dive per session. Suggested order:
1. **Microservices Patterns** (most important, most asked)
2. **Azure App Service** (you use it daily)
3. **Okta / Authentication** (security is always asked)
4. **CQRS Pattern** (distributed systems thinking)
5. **Azure Service Bus** (async communication)
6. **EF Core** (database patterns)
7. **Cosmos DB** (distributed data)
8. **Azure Functions** (serverless thinking)

For each: understand WHY, remember the example, explain the code.

### **Day 4: Operations (2-3 hours)**
1. Read CI/CD Pipeline Architecture completely
   - Study the real-time timestamps
   - Understand each gate and why it matters
   - Be able to explain deployment strategy
2. Read Advanced Operations FAQ
   - 10 production scenarios
   - You should be able to answer each one

### **Day 5: Integration & Practice (2 hours)**
1. Full system walkthrough end-to-end
   - User login (Okta) → Angular SPA → APIM gateway → microservices → async → monitoring
2. Practice common questions:
   - "Walk me through the architecture"
   - "Why microservices?"
   - "How do you ensure data isolation?"
   - "Handle failures in distributed systems?"
   - "Describe your CI/CD pipeline"

---

## 📊 Document Stats

| File | Lines | Size | Read Time | Purpose |
|------|-------|------|-----------|---------|
| capital-access-interview-story.md | 871 | 61K | 30 min | Main narrative |
| capital-access-deep-dives.md | 2,104 | 120K | 2-3 hrs | Technical depth |
| capital-access-operations.md | 2,087 | 81K | 1-2 hrs | Production ops |
| **Total** | **~5,070** | **~262K** | **~4 hrs** | **Complete reference** |

---

## ✅ Checklist for Interview Readiness

**Before the interview:**
- [ ] Read capital-access-interview-story.md (30 min)
- [ ] Practice STAR story until it flows naturally (30 min)
- [ ] Study all 9 deep dives (2-3 hours)
- [ ] Deep dive into CI/CD and operations (1-2 hours)
- [ ] Practice explaining full system end-to-end (30 min)
- [ ] Review Follow-Up Q&A (30 min)
- [ ] Practice common questions under time pressure (1 hour)

**Total prep time: ~4-5 hours for complete mastery**

---

## 🎓 Study Tips

1. **Don't just read** — code along with examples in your head
2. **Explain out loud** — interviews are spoken, not read
3. **Ask "why"** — for every pattern, understand the constraint it solves
4. **Use Correlation IDs** as your mental model for tracing requests
5. **Remember the constraints** — 2,500 tenants, high availability, regulated industry
6. **Practice under pressure** — time your STAR story, record yourself
7. **Know the differences** — between Orchestration/Choreography, SAGA patterns, CQRS benefits

---

## 🚀 You're Ready!

This is a production-grade, real-world system. Everything here is based on real architecture decisions made at S&P Global for 2,500+ enterprise customers.

**Key message for interviews:** This isn't a toy project — it's a regulated financial services platform serving public companies. Your microservices decisions, security patterns, and operational rigor directly impact real companies' IR programs.

**Own it. You've got this.** 💪

---

## 📁 Related Files

- `capital-access-interview-story.md` — Main narrative (START HERE)
- `capital-access-deep-dives.md` — Technical deep dives
- `capital-access-operations.md` — Production operations
- `README.md` — This file

---

*Last updated: July 2026 | Complete Capital Access interview reference | ~5,000 lines of production architecture*
