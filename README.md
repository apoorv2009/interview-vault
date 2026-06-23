# interview-vault

My interview prep notes, organized by topic.

## Structure

```
interview-vault/
├── angular/                            # Angular 19 & TypeScript interview Q&A (74 questions)
├── SQL&Postgres/                       # SQL & PostgreSQL interview prep
├── capital-access-project/             # Real-project deep dive: S&P Global, Capital Access
└── system-design-interview-playbook/   # Standalone system design Q&A, Senior Staff/Principal depth
```

## angular

74 structured interview Q&As covering Angular 19 and TypeScript at a Senior Developer depth. Organized across 15 topic sections: Compilation & Build, Change Detection, Components & Lifecycle Hooks, Angular 19 Features (Signals, `@defer`, built-in control flow, `linkedSignal`, `resource`), Directives & Pipes, Dependency Injection, Forms, Routing, HTTP & Interceptors, RxJS & Reactivity, State Management (NgRx, BehaviorSubject, Signals), Performance Optimization, Testing with Jasmine & TestBed, TypeScript Deep Dive, and SSR & Hydration.

Questions are tagged with `[Topic: X]` metadata and `[EPAM]` / `[Infosys]` / `[Capgemini]` / `[TCS]` company labels where the question is a known past interview question from that company. All version-specific answers are written from an **Angular 19** perspective.

## capital-access-project

Interview prep tied to my current role: S&P Global, Lead Software Development Engineer, Capital Access (Dec 2024 – Present). Covers the actual production architecture, my ownership areas, and a growing set of Azure-service deep dives.

- `capital-access-interview-story.html` — single-file, self-contained doc (open directly in a browser). Includes: role/architecture overview, OIDC auth, Angular 18 migration, multi-tenancy, CI/CD, STAR story, follow-up Q&A, and per-service "Deep Dive" sections.
- `README.md` — checklist of deep dives done vs. planned for this project.

Deep dives covered so far: Okta/OIDC, Azure Service Bus, Azure Functions, Durable Functions, Azure Cosmos DB.
Planned next: Azure SQL, Azure Database for PostgreSQL, Azure Redis Cache, Azure Blob Storage, Azure Key Vault, Azure App Insights, Azure Front Door, Azure Static Web Apps.

## system-design-interview-playbook

A personal repository of advanced system design interview questions and answers, written at a Senior Staff / Principal Engineer depth — one markdown file per question (real-world scenario style, e.g. "Your CTO calls at 3 AM, your S3 bucket is encrypted, ransom note in metadata — first 15 minutes"). Each answer includes a plain-language explanation, an architecture deep dive with diagrams, and a theoretical-frameworks section (CAP, PACELC, etc.) for interview talking points.

24 questions covered currently, spanning: distributed systems & scale (Instagram scroll, Netflix subtitles/DRM, video transcoding), reliability & incident response (SSL cert expiry, ransomware), security (JWT debugging, API protection, OTP verification), concurrency (race conditions, duplicate inserts), RAG/AI systems (chunking, versioning, cost optimization, multi-format ingestion), and engineering practice (git rebase vs merge, microservice architecture patterns).

See its own `README.md` and `CLAUDE.md` for authoring conventions (file naming, dedup rules, depth target, required sections).

## Source of truth

Markdown/HTML files are the source of truth — they diff cleanly in git and don't need a build step. Polished `.docx` exports can be generated on demand for printing/sharing but aren't tracked in git (see each folder's `.gitignore`).
