# interview-vault

My interview prep notes, organized by topic. All answers are framed around the **Capital Access** project at S&P Global.

## Structure

| Folder | Description | Coverage |
|--------|-------------|----------|
| [dotnet-core](https://github.com/apoorv2009/interview-vault/tree/main/dotnet-core) | .NET 8 & C# 12 interview Q&A | 96 questions |
| [angular](https://github.com/apoorv2009/interview-vault/tree/main/angular) | Angular 19 & TypeScript interview Q&A | 72 questions |
| [design-patterns](https://github.com/apoorv2009/interview-vault/tree/main/design-patterns) | GoF design patterns with real .NET examples | 17 questions |
| [unit-testing](https://github.com/apoorv2009/interview-vault/tree/main/unit-testing) | Unit & integration testing — NUnit, xUnit, Moq | Reference |
| [coding-tasks](https://github.com/apoorv2009/interview-vault/tree/main/coding-tasks) | C# and SQL live coding challenges | 55+ tasks |
| [ai-llm](https://github.com/apoorv2009/interview-vault/tree/main/ai-llm) | AI/LLM concepts — context window, RAG, agents, prompting | 5 questions |
| [SQL&Postgres](https://github.com/apoorv2009/interview-vault/tree/main/SQL%26Postgres) | SQL & PostgreSQL interview prep | Reference |
| [agile](https://github.com/apoorv2009/interview-vault/tree/main/agile) | Agile methodology interview Q&A | Reference |
| [azure-revision-notes](https://github.com/apoorv2009/interview-vault/tree/main/azure-revision-notes) | Azure services revision — Service Bus, Functions, Redis, Key Vault | Reference |
| [behavioural](https://github.com/apoorv2009/interview-vault/tree/main/behavioural) | Behavioural interview STAR answers | Reference |
| [capital-access-project](https://github.com/apoorv2009/interview-vault/tree/main/capital-access-project) | Real-project deep dive: S&P Global, Capital Access | Reference |
| [system-design-interview-playbook](https://github.com/apoorv2009/interview-vault/tree/main/system-design-interview-playbook) | System design Q&A at Staff/Principal depth | 24+ questions |
| [angular-interview-prep-app](https://github.com/apoorv2009/interview-vault/tree/main/angular-interview-prep-app) | Hands-on Angular 19 app for practising concepts | App |

---

## dotnet-core

96 Q&As covering .NET 8 and C# 12 at Senior/Architect depth. Organized across 9 sections:

1. **OOP Fundamentals** (Q1–Q9) — four pillars, interface vs abstract class, SOLID
2. **C# Language Features** (Q10–Q30) — generics, async/await, threading, IDisposable, records, delegates, Lazy\<T\>
3. **SOLID Principles** (Q4–Q9) — each principle with a real Capital Access example
4. **Garbage Collection** (Q31–Q54) — generations, dispose pattern, weak references, memory leaks
5. **ASP.NET Core** (Q55–Q74) — request lifecycle, middleware, DI lifetimes, JWT, CORS, REST, rate limiting
6. **Entity Framework Core** (Q75–Q79) — N+1, migrations, AsNoTracking, performance
7. **LINQ** (Q80–Q83) — deferred execution, IQueryable vs IEnumerable, key operators
8. **Additional Topics** (Q84–Q89) — correlation IDs, SQL views, scaling, MCP, observability, production debugging
9. **Platform, DI & Caching** (Q90–Q96) — .NET Standard, explicit interface impl, Lazy\<T\>, Mutex vs SemaphoreSlim, struct memory layout, DbContext lifetime, Redis vs IMemoryCache

All answers tagged `[EPAM]` where the question is a known past EPAM interview question.

---

## angular

72 Q&As covering Angular 19 and TypeScript at Senior Developer depth. Organized across 15 topic sections: Compilation & Build, Change Detection, Components & Lifecycle Hooks, Angular 19 Features (Signals, `@defer`, built-in control flow), Directives & Pipes, Dependency Injection, Forms, Routing, HTTP & Interceptors, RxJS & Reactivity, State Management, Performance Optimization, Testing, TypeScript Deep Dive, and SSR & Hydration.

Questions tagged `[EPAM]` / `[Infosys]` / `[Capgemini]` / `[TCS]` where applicable.

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

SQL and PostgreSQL interview prep covering query fundamentals, window functions, indexing, transactions, and PostgreSQL-specific features (JSONB, CTEs, partitioning). Each topic includes a SQL vs PostgreSQL comparison section.

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

---

## behavioural

STAR-format answers for behavioural interview questions — leadership, conflict resolution, dealing with ambiguity, most challenging project, stakeholder management. All tied to real Capital Access and previous role experiences.

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
