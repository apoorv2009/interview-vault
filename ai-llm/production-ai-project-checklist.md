# Production AI Project Checklist

A reusable checklist for any production-level AI or agent project. It's built from the IIT Hyderabad capstone evaluation criteria and the feedback on ShopSense, rewritten so it doesn't depend on any one project.

**The rule behind every item:** evidence counts, claims don't. A README or slide saying something exists is worth nothing. Each item needs either a run you can repeat, a committed output (logs, eval results, trace screenshots), or code you can point to by file and line.


## Table of contents
- [1. LLM integration](#1-llm-integration)
- [2. Structured input and output](#2-structured-input-and-output)
- [3. Tools and actions](#3-tools-and-actions)
- [4. Memory](#4-memory)
- [5. Retrieval (RAG)](#5-retrieval-rag)
- [6. Workflow and orchestration](#6-workflow-and-orchestration)
- [7. Multi-agent teams](#7-multi-agent-teams)
- [8. Human approval](#8-human-approval)
- [9. Security and access control](#9-security-and-access-control)
- [10. Guardrails](#10-guardrails)
- [11. Observability](#11-observability)
- [12. Reliability](#12-reliability)
- [13. Evaluation](#13-evaluation)
- [14. Packaging and deployment](#14-packaging-and-deployment)
- [15. Reproducibility](#15-reproducibility)
- [16. Documentation](#16-documentation)
- [17. Code hygiene](#17-code-hygiene)
- [18. Data privacy](#18-data-privacy)
- [Red flags to check before calling anything production-ready](#red-flags-to-check-before-calling-anything-production-ready)

---

## 1. LLM integration
- [ ] Every LLM call goes through one provider-neutral layer. No provider SDK is called directly from business or agent code.
- [ ] Model names, provider, base URLs and generation settings come from configuration, not from values written in code.
- [ ] Switching provider needs a configuration change only.
- [ ] A fallback model exists for transient failures, and its use is flagged.
- [ ] Latency, tokens and cost per provider are measured and committed, not only accuracy.

## 2. Structured input and output
- [ ] Every input is parsed into a typed model with required fields, optional fields, and constraints.
- [ ] The LLM is asked for structured output, and every response is validated.
- [ ] Invalid output goes through a bounded repair step, then fails safely.
- [ ] Downstream code uses the validated fields, never raw model text.
- [ ] Cross-field checks exist where they matter (totals add up, IDs match a pattern, dates are logical).
- [ ] Messy and edge-case inputs are tested, with success counts per input type.

## 3. Tools and actions
- [ ] Each tool has a clear name and a description that says what it does, when to use it, and when not to.
- [ ] Every argument is typed and described, with constraints.
- [ ] Tools return structured results and structured errors. A failing tool returns an error to the agent; it doesn't crash.
- [ ] Every agent loop has an iteration cap and ends with an answer or an explicit stop reason.
- [ ] Business limits (refund caps, approval thresholds) are enforced in code, not just in prompts.
- [ ] No `eval`, `exec` or shell execution on model or user input.
- [ ] Mock and real implementations share one interface, switched by configuration.
- [ ] Tool selection and tool functions have tests.

## 4. Memory
- [ ] Short-term history has a deliberate size limit (a trim window or a rolling summary).
- [ ] Events are stored with time and user or session details, and recalled in a later session.
- [ ] Stable facts and preferences are extracted, stored separately, and applied without the user repeating them.
- [ ] Procedures and rules are stored as versioned, retrievable records.
- [ ] Long-term memory survives a restart and is kept separate per user, with no leakage between users.
- [ ] A changed fact replaces the old one.
- [ ] Memory added to a prompt is filtered by relevance and size, not dumped in full.
- [ ] Memory actually reaches every step that needs it. Check that it's passed through the workflow state, not dropped along the way.
- [ ] Personal data is minimised, kept only as long as needed, and can be deleted on request.

## 5. Retrieval (RAG)
- [ ] Ingestion has a suitable loader per format, plus a fallback, so one bad file doesn't break the whole load.
- [ ] Chunks keep structure, with source and section details on every chunk.
- [ ] Retrieval goes beyond plain vector search: hybrid search plus a reranker whose order is actually used.
- [ ] Answers use only retrieved text, cite their sources, and say "don't know" when the sources don't cover the question.
- [ ] Retrieved text is marked as untrusted data in the prompt, so a poisoned document can't give instructions.
- [ ] The system can tell "the search failed" apart from "the policy doesn't cover this", and replies differently.
- [ ] A golden question set with expected sources or answers is committed.
- [ ] A baseline is measured, and every change is scored against the same set with standard metrics.
- [ ] Latency per retrieval option is measured, so the cost of a reranker is justified.
- [ ] The index is persistent, or rebuilt automatically when the service restarts.

## 6. Workflow and orchestration
- [ ] The process is an explicit state graph with a typed state schema.
- [ ] Every field that a later step reads is declared in the state, so it isn't silently dropped.
- [ ] Decisions happen in steps and routing in edges. Routing is plain code, with no LLM call inside it.
- [ ] Rules that can be written in code are checked by code; the LLM only handles judgement.
- [ ] Every loop has a counter with a maximum, and every path reaches an end.
- [ ] State is saved in a durable store, and a paused run resumes correctly after the process is killed.
- [ ] Each step that relies on earlier work (tools, memory, typed outputs) uses it rather than re-implementing it.
- [ ] Routers and steps have unit tests, and the graph has a diagram.

## 7. Multi-agent teams
- [ ] Each agent has one clear job and binds only its own tools.
- [ ] Each agent sees only the part of the state it needs, and writes only its own fields.
- [ ] Routing between agents is validated against allowed routes, with caps on revisions and hops.
- [ ] There is an escalation path when the budget runs out.
- [ ] A critic or reviewer actually checks another agent's output, and a deliberately wrong output is caught in a test.
- [ ] Durable state and human approval still work at team level.

## 8. Human approval
- [ ] Every irreversible or high-risk action has a human approval step.
- [ ] Both approve and reject are handled, and a reject writes nothing.
- [ ] The action runs exactly once, even across a restart or a repeated approval.
- [ ] An audit trail records who approved, when, what they decided, and why.
- [ ] The approver sees full context, including the customer's history.
- [ ] Only high-risk paths pause; low-risk ones run automatically.

## 9. Security and access control
- [ ] Every endpoint that approves, changes or reveals data requires authentication.
- [ ] Approval actions take the approver's identity from a verified token, never from the request body.
- [ ] A user can't act on another user's data. Ownership is checked in the system of record.
- [ ] Identifiers returned to users (ticket IDs, order IDs) can't be used to perform privileged actions.
- [ ] Service-to-service calls use managed identity or signed credentials.
- [ ] Secrets live in a secret store, never in code, configuration files, notebooks, logs or git history.
- [ ] A threat model or endpoint review is done before the system is called production-ready.

## 10. Guardrails
- [ ] Guardrails are enforced in code, independent of the model's answer.
- [ ] User input is screened for prompt injection.
- [ ] Retrieved content and tool results are screened too, not only user input.
- [ ] Output is validated against a schema.
- [ ] The domain's worst failure has its own guardrail (for example, an auto-approval cap, or blocking invented policy).
- [ ] Each policy number (cap, threshold) is defined once and read by every component that uses it.
- [ ] Rejections return an explicit status and reason.

## 11. Observability
- [ ] One trace per request, with nested spans for each agent, step and tool call.
- [ ] LLM calls are recorded as generations with model name, token usage and cost.
- [ ] Traces carry user and session IDs.
- [ ] Code logs with levels, not print statements.
- [ ] No secrets or personal data appear in logs or traces.
- [ ] A KPI view shows tokens, cost and latency per agent or run, plus error and fallback rates.
- [ ] Retries, fallbacks and circuit-breaker state are tagged in traces.
- [ ] Prompt versions and evaluation scores are linked to traces.

## 12. Reliability
- [ ] Every external call has a timeout.
- [ ] Retries use exponential backoff with jitter, on transient errors only.
- [ ] A circuit breaker protects calls to unreliable systems.
- [ ] Fallback paths are flagged when used.
- [ ] Approved writes go through an outbox or equivalent, so they aren't lost.
- [ ] Failure injection measures the success rate before and after hardening, and both numbers are recorded.
- [ ] A slow request can't be retried into a duplicate or half-finished result.

## 13. Evaluation
- [ ] A golden set of 20+ end-to-end cases with expected outcomes, including adversarial ones.
- [ ] The domain's dangerous combinations are in the set (for example, an angry customer with a large refund).
- [ ] Each component is evaluated: tool use, retrieval, routing and final answer.
- [ ] Deterministic scorers, plus at least one LLM-judge metric.
- [ ] Before-and-after results are committed, on unchanged labels.
- [ ] Labels aren't changed to match what the system already does. If a label is changed, both scores are reported.
- [ ] At least one domain-specific metric (for example, a cap-breach rate).
- [ ] Reported numbers can be reproduced from committed code and outputs.

## 14. Packaging and deployment
- [ ] The service has a domain endpoint and a `/health` endpoint.
- [ ] It's containerised, or deployed at a reachable URL.
- [ ] Settings that differ between environments (SSL mode, URLs) come from configuration, not forced in code.
- [ ] Deployments are automated per component.
- [ ] Data needed at startup, such as a search index, is restored automatically.

## 15. Reproducibility
- [ ] The README covers overview, setup, run and evaluation commands, and a quick start from a clean clone.
- [ ] Dependencies are pinned.
- [ ] A `.env.example` exists, with no real secrets.
- [ ] No machine-specific paths or values.
- [ ] The system starts from a clean clone on someone else's machine.
- [ ] Tests, linting and type checks pass before submission.

## 16. Documentation
- [ ] An as-built architecture document covers components, data flow, failure modes and deployment.
- [ ] It's updated when the build changes, so it doesn't describe a design that was never built.
- [ ] Known gaps and limitations are listed honestly.
- [ ] API usage examples run against the live service.

## 17. Code hygiene
- [ ] No secrets anywhere, including git history.
- [ ] No model names or provider values written at call sites.
- [ ] No hard-coded paths or localhost values that block a run elsewhere.
- [ ] No repeated policy numbers.
- [ ] No canned replies, stubs on by default, `if query == ...` branches, or mocks that always succeed.

## 18. Data privacy
- [ ] No real personal data in the repository, test data or demos.
- [ ] Test accounts and addresses are loaded from untracked configuration.
- [ ] Anything personal already committed is purged from git history.

---

## Red flags to check before calling anything production-ready
- Secrets in the repo, notebooks, git history or logs.
- Real personal data in the code or test data.
- An irreversible action (refund, payment, dispatch) with no human approval.
- `eval`, `exec` or shell execution on model or user input.
- Results that the committed code can't reproduce.
- Stubbed or hard-coded behaviour presented as working.
- An unauthenticated endpoint that can approve or change data.
