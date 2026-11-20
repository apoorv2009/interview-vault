# Project Stories — 4 consolidated revision docs

Pre-interview revision in three files. Each one follows the same shape: **STAR summary → architecture & flow → patterns → security → observability & resilience → testing → deployment → a real incident**, with 1–3 senior-level questions and a ready-to-say answer per section.

| # | Project | Use it for | File |
|---|---|---|---|
| 1 | **Capital Access** (S&P Global) | Microservices, Azure PaaS, multi-tenant SaaS, OIDC, CQRS, event-driven design | [01-capital-access.md](01-capital-access.md) |
| 2 | **WARP — retail activation modernization** (the TJX story) | Strangler-Fig, rehost → refactor, DB decomposition (outbox, CDC, reverse sync), retail peaks, carrier resilience | [02-warp-retail-modernization-tjx.md](02-warp-retail-modernization-tjx.md) |
| 3 | **AI report analytics & ingestion** (Capital Access RAG + onboarding) | RAG, multi-agent (LangGraph), LLM gateway, evals, LLMOps, AI security | [03-ai-report-ingestion-rag.md](03-ai-report-ingestion-rag.md) |
| 4 | **BDC → Capital Access transition** (S&P Global) | "Did you do a migration on your current project?", per-tenant batch rollout, feature parity, coexistence data sync, decommissioning | [04-bdc-to-capital-access-migration.md](04-bdc-to-capital-access-migration.md) |

**10-minute pre-interview routine:** read §0 (facts to keep consistent) and the **60-second pitch** of the relevant project → skim the section headers → re-read §8 (incident) out loud.

---

## Consolidation audit

**Scanned:** all **71 markdown files** in the vault were keyword-scanned for project content (Capital Access, WARP/retail activation, report ingestion/RAG). **16 files** had project-relevant content; **10** were read in depth and merged; 6 were checked for project-specific lines only. Plus **4 memory notes** used as the source of confirmed facts (title, scale, WARP role, AI stack).

| Source file | Merged into | How |
|---|---|---|
| `capital-access-project/capital-access-interview-story.md` | 01 | Read in full |
| `capital-access-project/capital-access-deep-dives.md` | 01 | Patterns, CQRS, Okta, Service Bus, Cosmos scenarios |
| `capital-access-project/capital-access-operations.md` | 01 | Observability, feature toggles, CI/CD, rollback scenarios |
| `capital-access-project/README.md` | 01, 03 | Index + scope |
| `capital-access-project/ai-rag-architecture-grill-qa.md` | 03 | Facts table, diagram, ~35 of 124 Q&As distilled |
| `tjx-prep/retail-activation-modernization-story.md` | 02 | Read in full (incl. 15 Strangler-Fig Q&As) |
| `tjx-prep/tjx-azure-services-qa.md` | 02 | Service Bus scenarios, APIM/App Service/SQL answers |
| `tjx-prep/tjx-storeweb-prep.md` | 02 | Bridge lines (Wells Fargo story itself **not** merged — see below) |
| `behavioural/behavioural-answers.md` | 01, 03 | Architect intro + Solera-track war stories (Q8, Q9, Q10, Q12, Q16, Q24, Q32–34) |
| `mock-interview-debrief/recording-5-verdict-and-drill.md` | 01, 02 | API-contract governance answer, saga SPOF point |
| `ai-llm/ai-llm-questions.md` | 03 | Hallucination-layer framing (checked) |
| `azure-revision-notes/azure-services-revision.md` | 01 | Report worker → Durable Functions evolution (checked) |
| `unit-testing/unit-testing-questions.md` | 01 | Test pyramid, 80% coverage gate (checked) |
| `principal-architect-interview-guide.md` | 01 | Capital Access STAR stories (checked) |
| `enterprise-modernization/enterprise-modernization-guide.md` | 01 | Disagreement/postmortem framing (checked) |
| `design-patterns/design-patterns-questions.md` | 01 | Pattern examples (checked) |

**Duplicates removed:** the same Q&As repeated across story/deep-dives/operations/behavioural (e.g. App Service vs AKS ×3, SAML→OIDC migration ×3, correlation-ID tracing ×5, Queue vs Topic ×4, deployment strategies ×4, outbox ×3) now appear **once**, in the project where they belong.

**Deliberately not merged (to keep stories clean):**
- **Wells Fargo / Wipro 500-app migration** — a different project; keep it separate from WARP.
- **Entity Management System** (9-year track) — different persona.
- **Aagam Mitra** — side project, not one of the three.
- Generic topic banks (.NET, Angular, SQL, DSA, system-design playbook) — not project stories.

**Original files are unchanged** — these three docs are a revision layer on top; the deep sources stay linked from each doc.

---

## Contradictions found in the old notes (fixed in the new docs)

| Topic | Use this | Conflicting older text |
|---|---|---|
| S&P title | Application Architect | "Full Stack Developer", "Lead SDE" |
| Capital Access scale | 7,500+ issuers | "500+" in STAR and career table |
| Service count | 6 core + Engagement | "five", "seven" |
| Hosting | App Service + slots | CI/CD walkthrough uses AKS/`kubectl` |
| Ownership store | SQL write + Cosmos read model (CQRS) | "Cosmos only" |
| 503 OOM outage story | Architect track only, as Capital Access | Same story also in the 9-year track |
