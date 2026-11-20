# Project 3 — AI Report Analytics & Ingestion on Capital Access (RAG + Onboarding)

> **Persona:** Architect track, Capital Access (S&P Global). Same platform as [Project 1](01-capital-access.md) — this is the GenAI layer on top of it.
> **Two capabilities, one platform:** (1) **Report analytics** — multi-agent RAG over historical IR reports, asked from **Microsoft Teams**, answers with citations. (2) **Client onboarding** — Claude + FastAPI extraction into **7,500+** client profiles with human review.
> **Headline results:** analysis **2–3 hours → ~10 minutes** (time-to-*trusted*-answer, includes checking citations); onboarding **days of data entry → minutes of review**.
> **Merged from:** `capital-access-project/ai-rag-architecture-grill-qa.md` (124 Q&As incl. Optum + Capgemini parts), `behavioural/behavioural-answers.md` (final Architect intro), `capital-access-project/README.md`, `ai-llm/ai-llm-questions.md` (hallucination layers), TJX interview debrief (ingestion disagreement story).
> **Deep source:** [ai-rag-architecture-grill-qa.md](../capital-access-project/ai-rag-architecture-grill-qa.md) — full diagram, live-coding RAG (Part L), Optum/Capgemini parts.

## Table of Contents
- [0. Confirmed facts vs still-to-confirm](#0-confirmed-facts-vs-still-to-confirm)
- [1. Project Summary — STAR](#1-project-summary--star)
- [2. System Architecture & Flow](#2-system-architecture--flow)
- [3. Design Patterns](#3-design-patterns)
- [4. Security](#4-security)
- [5. Observability & Resilience](#5-observability--resilience)
- [6. Testing & Quality (evals)](#6-testing--quality-evals)
- [7. Deployment & DevOps (LLMOps)](#7-deployment--devops-llmops)
- [8. Real-World Incident / Production Challenge](#8-real-world-incident--production-challenge)
- [9. Curveballs worth one line each](#9-curveballs-worth-one-line-each)

---

## 0. Confirmed facts vs still-to-confirm

| ✅ Confirmed — say it plainly | ⚠️ Confirm before quoting — or say "how I'd do it" |
|---|---|
| **LangGraph** orchestrator + **LangChain** building blocks (not "custom orchestrator") | Bicep **or** Terraform — pick the true one |
| **Cosmos DB-backed LangGraph checkpointer**, thread = tenant + conversation | Where orchestrator and FastAPI extraction run (Container Apps / AKS / App Service) |
| Embeddings **gemini-embedding-001**; OCR Gemini Flash-class; vectors in **Pinecone**, namespace per tenant | LLM gateway = APIM only, or APIM + a FastAPI gateway service |
| Generation: **Claude Haiku / Sonnet / Opus** 3-tier routing; fallback model only when circuit open | Offline judge model (Gemini cross-family or Opus) |
| **Claude Haiku as reranker** (recollection) and for claim-level output check | Streaming vs verify-then-show; real latency numbers |
| Golden set **seeded by the IR business team** | Entra SSO + Okta linking **or** Okta-only sign-in card in Teams |
| Pipeline: Report Gen → Service Bus → Function → Blob → topic "report ready" → ingestion Function → OCR → chunk → metadata → embed → Pinecone | Whether LangGraph interrupts ran in production; onboarding eval metrics |

> Rule: "X or Y" about your own system sounds like you weren't there — name one, or say "I'd do it this way".

---

## 1. Project Summary — STAR

**Situation.** IR analysts spent **2–3 hours** per analysis opening historical PDF reports, finding figures, comparing quarters and validating. Onboarding a client meant **days of manual data entry** from documents. In this domain **a fluent but wrong answer is worse than no answer**.

**Task.** Lead the architecture of (1) a trustworthy Q&A assistant over historical reports inside Teams, and (2) an extraction pipeline to build/backfill **7,500+** client profiles — with tenant isolation, cost control and measurable quality.

**Action.**
- **Event-driven ingestion** reusing the report pipeline: "report ready" event → ingestion Function → OCR → chunking (tables kept intact) → metadata (tenant, company, quarter, doc type) → embeddings → Pinecone namespace per tenant.
- **Multi-agent orchestrator on LangGraph** — planner → retrieval (hybrid + rerank, hard tenant + period filter) → analysis (deterministic tools for numbers) → citation/synthesis → output guardrails.
- **One LLM gateway** for every model call: keys, per-tenant rate limits and token budgets, cost metering, **3-tier router (Haiku/Sonnet/Opus)**, circuit breakers + fallback, PII scrub.
- **Quality as a release gate:** LLM-as-judge on groundedness, relevance, citation accuracy + numeric checks, in CI and on sampled production traffic.
- **Onboarding:** FastAPI + Claude with **strict Pydantic schemas**, computed confidence, **human review** before anything becomes a profile; backfill as a queued, rate-limited batch.

**Result.** Analysis **2–3 h → ~10 min**; onboarding **days → minutes of review** across 7,500+ profiles; cost held down by tiered routing and caching; quality measurable and gated per release.

> **60-second pitch (say this):** "Two AI capabilities on one platform. First, report analytics: IR teams ask questions about their historical reports in Microsoft Teams. A LangGraph multi-agent orchestrator — planner, retrieval, analysis, citation-and-synthesis, guardrails — retrieves from a tenant-isolated Pinecone index and answers with citations. That cut analysis from two to three hours to about ten minutes. Second, client onboarding: a FastAPI service uses Claude with strict schemas to extract company data, IR contacts, financials and AUM, with validation and human review — days of data entry became minutes of review across 7,500-plus profiles. Underneath, a 'report ready' event triggers ingestion, every model call goes through one LLM gateway with a three-tier router and circuit breakers, and an evaluation pipeline gates deployments on groundedness, relevance and citation accuracy."

---

## 2. System Architecture & Flow

**Write path (ingestion):** Report Service → Service Bus **queue** → Report Gen Function → **Blob** → topic **"report ready"** → Trigger-RAG Function → OCR + clean + PII redact → chunk (semantic/recursive; tables intact) → metadata enrichment → `gemini-embedding-001` → **Pinecone** (namespace = tenant) → update **report catalog** status → `ReportIndexed`.

**Read path (question):** Teams → **Azure Bot Service + Entra SSO** → API gateway (token → internal tenant ID + roles, rate limit) → **input guardrails** → **planner** (intent, period, report, version) → **retrieval** (hybrid search + rerank to 5–8 chunks, hard tenant/period/version filter) → **analysis** (deterministic tools; `get_report()` for full doc) → **synthesis** (answer + citations) → **output guardrails** → Teams. Memory in Cosmos (checkpointer), response cache in Redis per tenant.

**Onboarding path:** Angular admin upload → Onboarding API stores docs in Blob, enqueues `ExtractionRequested`, returns **202 + jobId** → FastAPI extraction worker (Claude via gateway) → schema + confidence validation → **human review** → Client Profiles DB. Backfill job feeds the same queue.

**Q: Why multi-agent instead of one agent with tools?**
> "Because the steps need different things. The planner needs speed and runs on a small model; retrieval is mostly deterministic code; analysis needs strong reasoning over numbers; synthesis needs citation discipline. Splitting them lets me route each to the right model tier, test each one alone, and put guardrails between them. But it's orchestrated, not free-form — a fixed graph with a step limit — and simple lookups short-circuit to a single-agent path."

**Q: Why build an LLM gateway instead of calling models directly?**
> "Without it every service embeds a vendor SDK, its own retries and its own keys — lock-in, inconsistent resilience, no single view of cost, keys everywhere. The gateway centralises keys, per-tenant limits and token budgets, the complexity router, circuit breakers and fallback, caching, PII scrubbing and cost metering. A model swap becomes a config change. On Azure, APIM already covers much of this, so we build only what it doesn't — like the complexity router."

**Q: Why Pinecone and not Azure AI Search in an Azure shop?**
> "Managed serverless scale, fast ANN search and a namespace per tenant — isolation, and tenant deletion is dropping a namespace — with zero ops and good LangChain integration, so speed of delivery. The trade-off is real: another vendor outside the Azure boundary. For a strictly regulated tenant set, Azure AI Search with private endpoints is a strong candidate. Because retrieval sits behind an abstraction, swapping is a re-index, not a rewrite."

---

## 3. Design Patterns

| Pattern | Where | Trade-off |
|---|---|---|
| **Event-driven ingestion** (queue for jobs, topic for facts) | Report gen → "report ready" → ingestion | "Generated" ≠ "searchable" → explicit status |
| **CQRS thinking** | Write path (ingest) vs read path (ask) separate | Index lags source |
| **Orchestrated multi-agent graph** (LangGraph) | Planner → retrieval → analysis → synthesis → verify | More LLM hops → parallelise, short-circuit simple asks |
| **Gateway / router** | LLM gateway, 3-tier routing | Shared component → stateless, scaled, bulkheaded |
| **Tool use for facts** | Numbers from deterministic functions; LLM only narrates | More code to build and test |
| **Hybrid retrieval + rerank** | Keyword + vector, Haiku reranker | Extra latency and cost per query |
| **Idempotent consumer + fencing** | Deterministic chunk IDs; version-conditioned status writes | Must design IDs up front |
| **Claim-check** | Events carry blob path, not the report | Consumer fetches separately |
| **Human-in-the-loop** | Onboarding review queue | Throughput bound by reviewers |
| **Circuit breaker + fallback tiers** | Per provider + model + region | Fallback must be eval-qualified per task |

**Q: How does the 3-tier router decide simple vs complex — and what if it misroutes?**
> "Task type first — single-field extraction goes to Haiku, RAG Q&A to Sonnet, multi-report synthesis to Opus. For open chat a cheap classifier looks at signals: how many reports or periods, whether comparison is needed, context size. Misroutes are handled by escalation — if a Haiku extraction fails schema validation or has low-confidence fields, it retries once on Sonnet — and we track the escalation rate per task type. Escalation costs more only for the small fraction that fails."

**Q: How do you stop the LLM getting numbers wrong?**
> "Three layers. Numbers come from tools, not generation — the analysis agent computes deltas over structured data and the LLM only narrates. Tables are chunked intact with period metadata so exact figures are retrieved. And the output check extracts every number in the answer and verifies it appears in a cited chunk or tool result — if it can't be traced, the answer is blocked or flagged."

---

## 4. Security

- **Identity:** Teams → **Entra SSO** proves *who*; **Okta** stays the source of Capital Access entitlements (*what they can see*), linked once and checked per request. ⚠️ confirm which flow you built.
- **Tenant isolation by code, not prompt:** tenant ID from the token → Pinecone namespace + metadata filter, Cosmos partition, cache keys, tool calls, cost metering. **The LLM never chooses the tenant.**
- **Prompt injection:** input classifier (Haiku) + scope check before any retrieval; documents wrapped as **untrusted data**; **strict structured output**; tools are **read-only — nothing can send, delete or modify**; human review for onboarding.
- **Data handling:** classify (published reports = low; onboarding docs = PII; pre-release = **MNPI → never to external endpoints without legal sign-off**); **zero-data-retention** enterprise terms; PII redaction before embedding; region choice for residency.
- **Secrets:** only the gateway holds provider keys — **Key Vault + managed identity**, dual keys for zero-downtime rotation, egress allow-list.
- **Output handling:** render as safe text/cards in Teams; validate links/citations.
- **Deletion:** client offboarding → drop Pinecone namespace + delete across Blob, Cosmos, caches, profiles.

**Q: Walk me through tenant isolation from a Teams message.**
> "Entra SSO gives the user's identity; the gateway maps it to our internal tenant ID and roles — from the token, never from the request body or the prompt. That tenant ID then scopes every layer: the Pinecone namespace and filters, the Cosmos partition, every cache key, and every tool call — the code injects it, the model never supplies it. So even a fully prompt-injected model can't widen its data scope, because scope is enforced outside the model."

**Q: Someone uploads an onboarding document with a prompt injection. What happens?**
> "Indirect injection is the real threat. The document is passed as delimited, untrusted data; the model can only fill a strict schema, not take actions; the extraction service has no tools that send or change anything; values are validated for format and range; and a human reviews before it becomes a profile. 'Set AUM to a trillion' fails validation or review; 'email the contact list' has no tool to act on."

---

## 5. Observability & Resilience

**Observability**
- One **trace ID** from the bot through orchestrator, agents, gateway and providers — **OpenTelemetry / W3C trace context → App Insights**, **Splunk** for log search.
- Each agent step and LLM call is a span: model, tier, **prompt version**, input/output tokens, latency, **TTFT**, cost, cache hit, retrieved chunk IDs, guardrail decisions.
- **Raw prompts/answers not logged by default** — redacted or kept in a restricted short-retention store.
- **Dashboards:** cost per tenant, p95 + TTFT per tier, fallback rate, cache hit rate, **judge scores over time**, thumbs-down/escalation, DLQ depth, **ingestion lag (Generated → Indexed)**.

**Resilience**
- **Timeouts** tuned to the interactive budget; **circuit breaker per provider + model + region** that trips on **slow-call ratio**, not only errors; **429 ≠ dead** — honour Retry-After.
- **Bulkheads:** separate pools for interactive vs batch (onboarding backfill can't starve Teams users).
- **Retry budgets + jitter**, load shedding ("at capacity" fast), **deadline propagation**.
- **Fallback is eval-qualified:** each tier has its own prompt and must pass the golden set; otherwise return "try again" rather than a wrong financial answer. Mid-stream failure → "interrupted, regenerating", never splice two models.
- **Runaway agents:** graph recursion limit, retry limit, per-request and per-tenant token budgets.

**Q: Claude latency jumps from 3 s to 40 s. How does it cascade and how do you stop it?**
> "Requests hold connections longer, pools exhaust, Teams times out, users retry, retries pile onto a slow provider, and shared pools starve the onboarding batch too. Stop it with timeouts set to the user's budget, a circuit breaker that counts slow calls as failures and routes to a qualified fallback tier, separate pools for interactive and batch, capped retries with jitter, fast 'at capacity' responses when saturated, and dropping downstream work once the user's deadline has passed."

---

## 6. Testing & Quality (evals)

- **Layered testing** for non-deterministic systems:
  1. **Unit tests** on deterministic parts — chunkers, parsers, routing rules, validators, numeric verification.
  2. **Mocked-LLM tests** — gateway stubbed with recorded responses → retries, fallbacks, error paths tested free and deterministically.
  3. **Structural assertions** on real calls — valid schema, citations present and resolvable — not exact strings.
  4. **Golden-set evaluation** with an LLM judge, thresholded, compared to the previous release.
  5. **Adversarial suite** — injection, out-of-scope, cross-tenant probes, "delete everything".
- **Metrics in layers:** retrieval (recall@k, MRR, **period/entity match**) → generation (claim-level groundedness, relevance, citation accuracy, **numeric accuracy**) → system (escalation rate, TTFT, cost/query) → business (thumbs-down, escalations, 2–3 h → 10 min). *Most RAG "hallucinations" are retrieval failures — measure retrieval separately.*
- **Judge hygiene:** calibrated on ~50 human-scored cases, different model family where possible, rubric with examples, re-calibrate on judge change.
- **Golden set:** seeded by the IR business team; engineering added expected sources, resolved entities, question-type tags, refusal and ambiguous cases; versioned in Git; grows from production failures.
- **Performance:** load test against provider rate limits + cost-per-query check in staging.

**Q: How do you compute groundedness, relevance and citation accuracy — isn't LLM-as-judge biased?**
> "Groundedness: split the answer into claims, check each against the retrieved context, score supported over total. Relevance: does it answer the question, on a calibrated rubric. Citation accuracy is mostly deterministic — does the cited chunk exist and contain the number — and only the 'does this source support this sentence' part uses the judge. Judges do favour long answers and their own model family and they drift, so I calibrate against human-scored examples, use a different family where I can, and re-calibrate when the judge changes."

**Q: An answer is "fully grounded" but wrong. How?**
> "Groundedness proves faithfulness to what was retrieved, not correctness. If retrieval pulled Q1 chunks for a Q2 question, the answer is faithful and wrong. So we check citations against the planner's resolved period and report, and we evaluate retrieval separately from generation."

---

## 7. Deployment & DevOps (LLMOps)

- **Same Azure DevOps backbone** as Capital Access, plus an **eval gate**:
  1. **PR:** build, lint, unit tests, contract tests for event + tool schemas, security scans, **fast eval subset (~50 critical cases)** when prompts/models/retrieval change.
  2. **Dev:** IaC applied, integration tests with dev keys.
  3. **Staging:** **full golden set** + judge, load test vs provider limits, cost-per-query vs budget.
  4. **Prod:** canary.
- **Per-component strategy:**
  - Services → **blue-green slots + canary 10 → 25 → 50 → 100%**, auto swap-back on error rate, p95 **or cost per request**.
  - Prompts/models → **feature flags** (App Configuration) **1 → 5 → 25 → 100%**, sticky per conversation; **model upgrades shadow-tested first**.
  - Embedding/chunking changes → **blue-green at the data layer**: build new index, evaluate, switch alias, keep the old one.
  - Durable orchestrations → in-flight instances finish on their starting version.
  - Schema → expand/contract; event schema → additive only.
- **What's versioned (MLOps without training):** prompts, model IDs, router rules, chunking config, embedding model + index version, golden set, judge prompt + thresholds.
- **Hosting:** ingestion/report gen on **Functions**; orchestrator + gateway stateless with autoscale; FastAPI extraction as a container scaled on queue depth *(⚠️ name the real host)*.

**Q: Is rolling back a prompt the same as rolling back code?**
> "No. Code: swap the slot back, seconds. Prompt or model: flip the flag to the previous version, seconds, no deploy. Index or embedding: flip the alias back — only possible because we kept the old index. Schema: expand-and-contract so the old code still works. And the canary watches judge scores by question type, because an AI regression shows up as worse answers with a 200 OK, not as errors."

---

## 8. Real-World Incident / Production Challenge

### Primary — "Q1 numbers answered as Q2" (the generated-vs-searchable race)

| Step | Detail |
|---|---|
| **Symptom** | An analyst asks about the **Q2** report seconds after it's generated and gets a confident, **cited** answer — using **Q1** figures. The groundedness judge **passes** it. |
| **Troubleshoot** | Trace showed retrieved chunk IDs were Q1. Ingestion lag (Generated → Indexed) was tens of seconds to minutes; Q1 and Q2 "top holders" text is semantically almost identical. |
| **Root cause** | Two different states — **report generated** vs **report searchable** — were treated as one; retrieval had **no hard period filter**, and Pinecone is **eventually consistent**. |
| **Fix 1 — filters** | Planner resolves **period, report, version** → **hard metadata filter**; a Q2 question can never match Q1 chunks. Ambiguous → ask a clarifying question. |
| **Fix 2 — explicit state** | **Report catalog** (tenant, report, version, `ingestionStatus`: Pending/Processing/Indexed/Failed). Two events: `ReportGenerated` (download) and **`ReportIndexed`** (ask questions). |
| **Fix 3 — read-your-writes** | After upsert, a **freshness check** fetches a known deterministic chunk ID before marking Indexed. Not indexed yet → "Q2 is still indexing" or a direct-read fallback via Fetch Report. |
| **Fix 4 — verify** | Output guard checks every citation's period/report matches the planner's resolved entities. |
| **Lesson** | Most RAG "hallucinations" are **retrieval** failures; faithfulness ≠ correctness. |

> **Say this:** "The hardest problem was a race I'd call out in my own design. 'Report generated' and 'report searchable' are different moments — ingestion takes tens of seconds to minutes. If someone asked about Q2 in that gap, retrieval could match Q1 chunks, because quarterly reports read almost the same, and the model would present Q1 numbers as Q2 — with citations — and the groundedness judge would pass it. We fixed it in layers: the planner resolves the period and report and passes them as hard filters; a report catalog tracks ingestion status with a separate 'report indexed' event; a freshness check confirms vectors are visible before we mark it indexed; and the output check verifies every citation matches the resolved period."
>
> ⚠️ Frame as a **design risk found and fixed**; only call it a customer-facing incident if one actually happened.

### Backup — Split-brain on long OCR runs
Long OCR outlived the **Service Bus message lock** → redelivery → **two Function instances** on the same report → duplicate chunks / stale overwrite. Fix: **lock renewal** above worst-case time (or Durable fan-out to keep units short), **deterministic chunk IDs** (duplicates collapse), and **fencing** — status writes conditioned on report **version** with ETags.

### Backup — Prompt change passed CI but quality dropped in production (incident-review shape)
Detect (judge scores + thumbs-down on canary) → **flip the flag back** in seconds → traces show the drop is one slice (multi-period comparisons) under-represented in the golden set → add those cases, **report evals per question type**, canary compares per-slice before ramping → blameless write-up. *(Use as "how we run it" unless it happened.)*

### Leadership — Event-driven vs batch ingestion disagreement
Real story that landed well in the TJX interview: you argued **event-driven ingestion** against a **batch** approach and **won with a POC**. ⚠️ Details aren't in the vault yet — write down who, what the POC measured, and the outcome before using it.

---

## 9. Curveballs worth one line each

- **Biggest weakness?** "Period-specific correctness — similar quarters look alike, so correctness depends on entity resolution and hard filters. That's where I invested."
- **Why OCR your own PDFs?** "Honestly, for our own reports it's the wrong path — the better design ingests the structured source. OCR is for external or legacy documents. V1 treated all docs the same to ship fast; the structured lane is the roadmap."
- **Fine-tune instead of RAG?** "Fine-tuning teaches style and behaviour, not reliable facts — and our facts change every quarter. RAG gives current data, citations, tenant isolation and deletion — you can't delete one client's data from model weights."
- **Cost per query?** "Roughly 6–10k input and 500–1,000 output tokens — a few cents on a Sonnet-class model; controlled by routing, reranking to fewer chunks, prompt caching, per-tenant cache and token budgets." *(illustrative math)*
- **How did you measure 2–3 h → 10 min?** "Timed analysts on a standard task set, manual vs assistant, **including** time to verify citations — a median, not a best case."
- **Why build, not buy Copilot Studio / Foundry?** "Buy where it's commodity — Teams hosting, identity, the bot channel. Build where it differentiates — period-aware retrieval, numeric verification, extraction schemas and review, per-tenant isolation and cost control." *(Say "managed platforms were evaluated" only if true.)*
- **10x traffic — what breaks first?** "Not our services — they scale out. Provider token quotas first, then cost, then Pinecone throughput for whale tenants — so higher quotas and multi-deployment capacity, more caching, more traffic to smaller tiers where evals allow, and per-tenant budgets."
- **CFO says cut LLM cost 50%?** "Measure cost per tenant, task and tier first; then cheaper tiers where the golden set proves quality holds, batch API for offline work, prompt caching, smaller context via better reranking, response caching — every change through the eval gate."
- **Client offboards and wants full deletion?** "A saga on a `TenantOffboarded` event: every context deletes its own — Blob, Pinecone namespace drop, Cosmos memory, Redis keys, profiles, review queues, eval samples — and confirms back."
