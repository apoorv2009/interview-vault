# interview-vault

My interview prep notes, organized by topic. Most answers are framed around the **Capital Access** project at S&P Global; a subset (clearly labeled "Interview Rounds" / "Other Company Rounds" sections) is sourced from live interview rounds at other companies and framed around the **Entity Management System** project instead — kept separate rather than blended since the two report different tenure and a different most-recent project.

**Latest addition:** The `aagam-mitra` folder now contains **106 Q&As** on production agentic AI systems, prompt engineering, and LLM fundamentals — from foundation concepts to expert-level deep-dives on design patterns, RAG at scale, enterprise governance, and memory architectures. Tailored for VP-level interviews on AI/ML leadership roles.

## Structure

| Folder | Description | Coverage |
|--------|-------------|----------|
| [dotnet-core](https://github.com/apoorv2009/interview-vault/tree/main/dotnet-core) | .NET 8 & C# 12 interview Q&A | 134 questions |
| [angular](https://github.com/apoorv2009/interview-vault/tree/main/angular) | Angular 19 & TypeScript interview Q&A | 82 questions |
| [react](https://github.com/apoorv2009/interview-vault/tree/main/react) | React hooks, state management interview Q&A | 4 questions |
| [design-patterns](https://github.com/apoorv2009/interview-vault/tree/main/design-patterns) | GoF design patterns with real .NET examples | 17 questions |
| [unit-testing](https://github.com/apoorv2009/interview-vault/tree/main/unit-testing) | Unit & integration testing — NUnit, xUnit, Moq | Reference |
| [coding-tasks](https://github.com/apoorv2009/interview-vault/tree/main/coding-tasks) | C# and SQL live coding challenges | 55+ tasks |
| [SQL&Postgres](https://github.com/apoorv2009/interview-vault/tree/main/SQL%26Postgres) | SQL & PostgreSQL interview prep | 35 questions |
| [agile](https://github.com/apoorv2009/interview-vault/tree/main/agile) | Agile methodology interview Q&A | Reference |
| [azure-revision-notes](https://github.com/apoorv2009/interview-vault/tree/main/azure-revision-notes) | Azure services revision — Service Bus, Functions, Redis, Key Vault | Reference |
| [devops](https://github.com/apoorv2009/interview-vault/tree/main/devops) | Docker, container deployment interview Q&A | Reference |
| [behavioural](https://github.com/apoorv2009/interview-vault/tree/main/behavioural) | Behavioural interview STAR answers (two tracks: EPAM/Architect + other-company Full Stack) | Reference |
| [capital-access-project](https://github.com/apoorv2009/interview-vault/tree/main/capital-access-project) | Real-project deep dive: S&P Global, Capital Access | Reference |
| [system-design-interview-playbook](https://github.com/apoorv2009/interview-vault/tree/main/system-design-interview-playbook) | System design Q&A at Staff/Principal depth | 24+ questions |
| [aagam-mitra](https://github.com/apoorv2009/interview-vault/tree/main/aagam-mitra) | Production agentic AI system: RAG, LLMs, multi-agent orchestration, enterprise governance, prompt engineering | 106 questions |
| [angular-interview-prep-app](https://github.com/apoorv2009/interview-vault/tree/main/angular-interview-prep-app) | Hands-on Angular 19 app for practising concepts | App |

---

## dotnet-core

134 Q&As covering .NET 8 and C# 12 at Senior/Architect depth. Organized across 10 sections:

1. **OOP Fundamentals** (Q1–Q9) — four pillars, interface vs abstract class, SOLID
2. **C# Language Features** (Q10–Q30) — generics, async/await, threading, IDisposable, records, delegates, Lazy\<T\>
3. **SOLID Principles** (Q4–Q9) — each principle with a real Capital Access example
4. **Garbage Collection** (Q31–Q54) — generations, dispose pattern, weak references, memory leaks
5. **ASP.NET Core** (Q55–Q74) — request lifecycle, middleware, DI lifetimes, JWT, CORS, REST, rate limiting
6. **Entity Framework Core** (Q75–Q79) — N+1, migrations, AsNoTracking, performance
7. **LINQ** (Q80–Q83) — deferred execution, IQueryable vs IEnumerable, key operators
8. **Additional Topics** (Q84–Q89) — correlation IDs, SQL views, scaling, MCP, observability, production debugging
9. **Platform, DI & Caching** (Q90–Q96) — .NET Standard, explicit interface impl, Lazy\<T\>, Mutex vs SemaphoreSlim, struct memory layout, DbContext lifetime, Redis vs IMemoryCache
10. **Interview Rounds — Additional Q&A** (Q97–Q134) — sourced from live Wipro/Decos Global/HCL/Infosys/Virtusa rounds: architecture styles, middleware, collections/boxing, EF Code First vs DB First, N+1 diagnosis story, JWT auth, performance methodology

All answers tagged `[EPAM]` where the question is a known past EPAM interview question.

---

## angular

82 Q&As covering Angular 19 and TypeScript at Senior Developer depth. Organized across 15 topic sections: Compilation & Build, Change Detection, Components & Lifecycle Hooks, Angular 19 Features (Signals, `@defer`, built-in control flow), Directives & Pipes, Dependency Injection, Forms, Routing, HTTP & Interceptors, RxJS & Reactivity, State Management, Performance Optimization, Testing, TypeScript Deep Dive, and SSR & Hydration — plus an "Interview Rounds" section (Q73–Q82) sourced from live Wipro/Decos Global/Infosys rounds: JWT-refresh interceptors, data binding, DI singletons, service integration patterns.

Questions tagged `[EPAM]` / `[Infosys]` / `[Capgemini]` / `[TCS]` where applicable.

---

## react

4 Q&As covering React hooks and state management, from ~9–10 months hands-on experience layered on top of Angular: `useState`/`useEffect`/`useContext`, component vs global state, Redux vs Context API, `useMemo` vs `useCallback`.

---

## design-patterns

17 Q&As covering GoF design patterns with real .NET + Capital Access examples:

- **Creational** — Singleton, Factory Method, Abstract Factory, Builder, Prototype
- **Structural** — Repository, Decorator, Facade, Adapter, Proxy, Composite
- **Behavioral** — Observer, Strategy, Command, Chain of Responsibility, Template Method
- **Code Smells** — identifying and refactoring common anti-patterns

---

## unit-testing

Reference guide covering: AAA principle (Arrange, Act, Assert), test pyramid, NUnit/xUnit/MSTest comparison, mocking with Moq, integration tests with WebApplicationFactory, CI/CD gates, code coverage targets, and what to test vs what not to test.

---

## coding-tasks

Live coding challenges for technical interviews:

- `csharp-coding-30-questions.md` — 30 C# coding problems (collections, LINQ, algorithms)
- `csharp-coding-30-no-builtins.md` — same 30 problems solved without built-in helpers
- `sql-coding-questions.md` — 25 SQL challenges (window functions, CTEs, self-joins, stored procedures)
- `coding-tasks.md` — additional mixed coding tasks

---

## ai-llm

5 Q&As covering AI/LLM concepts that come up in senior engineering interviews:

- **Q1** — What is a context window? What happens when you exhaust it?
- **Q2** — How do you choose which LLM to use for a given task?
- **Q3** — What prompting techniques help reduce token usage?
- **Q4** — What is an AI agent / agentic mode?
- **Q5** — What is RAG (Retrieval-Augmented Generation)?

Answers include real examples from a personal RAG knowledge-base app built with Semantic Kernel, Azure OpenAI, and Gemini.

---

## SQL&Postgres

35 Q&As covering query fundamentals, window functions, indexing, transactions, and PostgreSQL-specific features (JSONB, CTEs, partitioning), plus a live-interview-sourced block (Q25–Q35: index design strategy, execution plan red flags, temp tables, Profiler/Query Store, a full N+1 diagnosis war story). **Every** question includes a SQL Server vs PostgreSQL comparison table.

---

## agile

Agile methodology interview Q&A covering Scrum ceremonies, sprint planning, velocity, retrospectives, Kanban vs Scrum, and agile at scale.

---

## azure-revision-notes

Revision notes for Azure services used in Capital Access:

- Azure Service Bus (topics, subscriptions, dead-letter queues)
- Azure Functions & Durable Functions
- Azure Redis Cache
- Azure Key Vault & Managed Identity
- Azure Application Insights
- Azure SQL & PostgreSQL
- Azure Blob Storage

Plus an "Interview Rounds — Additional Q&A" section sourced from live Wipro/Decos Global/HCL/Virtusa rounds: Functions vs Web API trade-offs, Function deployment pipelines, Cosmos DB vs SQL Server, and a full cascading-failure incident-response war story.

---

## devops

Docker and container deployment Q&A — multi-stage Dockerfile for a .NET microservice, and a full build → ACR → Azure Container Apps deployment pipeline with zero-downtime rollout. Sourced from the Virtusa round.

---

## behavioural

STAR-format answers for behavioural interview questions — leadership, conflict resolution, dealing with ambiguity, most challenging project, stakeholder management. Two tracks kept clearly separate since they report different tenure/most-recent-project: the **EPAM/Architect track** (16 yrs, Capital Access) and the **Other Company Rounds track** (9 yrs Senior Full Stack, Entity Management System — Wipro/Decos Global/Infosys/Virtusa), including a full production-incident (OOM) triage story.

---

## capital-access-project

Interview prep tied to my current role: S&P Global, Lead Software Development Engineer, Capital Access (Dec 2024 – Present).

- `capital-access-interview-story.html` — single-file doc (open in browser). Covers: role overview, OIDC auth, Angular 18 migration, multi-tenancy, CI/CD, STAR story, and Azure service deep dives.
- `README.md` — checklist of deep dives done vs. planned.

---

## system-design-interview-playbook

24+ advanced system design Q&As at Staff/Principal Engineer depth — one file per scenario. Covers: distributed systems & scale, reliability & incident response, security, concurrency, RAG/AI systems, and engineering practice.

See its own `README.md` and `CLAUDE.md` for authoring conventions.

---

## aagam-mitra

**106 Q&As** covering production agentic AI systems, prompt engineering, and LLM fundamentals. All answers grounded in real code, config values, and production patterns from the Aagam Mitra system (built for a Jain temple community platform).

**10 files organized in 5 tiers:**

**Foundation (Files 01–05):** 67 Q&As
- RAG pipeline, vector embeddings, semantic search (28 Q&As)
- LLM selection, temperature tuning, tool-calling loops, chat history management (10 Q&As)
- Multi-agent orchestration (4 specialist agents, 12 tools) (10 Q&As)
- System architecture, JWT auth, Cloudflare tunnel, push notifications (11 Q&As)
- 4-layer security pipeline, YouTube transcript extraction (8 Q&As)

**Framework & Patterns (Files 06–07):** 12 Q&As
- LangChain principles, prompt templates, RAG pattern (6 Q&As)
- LangGraph concepts, state management, agent reasoning loops (6 Q&As)

**Expert Deep-Dive (File 08):** 12 Q&As ⭐ *VP-level agentic system interviews*
- 5 agentic design patterns + LangGraph migration story
- Advanced RAG: quality metrics, freshness strategies
- Enterprise AI: regulatory compliance, model governance, fairness testing
- Production governance: observability, cost optimization, testing
- Memory architecture: 4-layer design (working, conversational, semantic, episodic)

**General AI & Prompt Engineering (File 10):** 15 Q&As ⭐ *Prompt engineering + general AI knowledge*
- Foundation concepts: context window, LLM selection, agents, RAG (Q1-Q4)
- Prompt engineering: efficient prompts, context-aware RAG, advanced techniques (Q5-Q12)
- General AI: hallucinations, fine-tuning, LLM limitations (Q13-Q15)

**Key numbers:** 17B LLM, 2048-dim embeddings, 8-passage retrieval, 25%→2% hallucination reduction via RAG, custom 40-line agent loop, **106 interview Q&As**.

See the folder `README.md` for detailed breakdown.

---

## angular-interview-prep-app

Angular 19 app for hands-on practice of concepts covered in the `angular/` section — Signals, `@defer`, built-in control flow, standalone components, lazy routing, reactive forms.

```bash
cd angular-interview-prep-app
npm install
ng serve
```

Open `http://localhost:4200/` in your browser.

---

## Source of truth

Markdown files are the source of truth — they diff cleanly in git. All answers are written from the perspective of the **Capital Access** project at S&P Global so every answer tells a real story.
