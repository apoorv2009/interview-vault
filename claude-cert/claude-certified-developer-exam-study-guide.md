# Claude Certification — Exam Study Guide

A condensed, cross-referenced study guide covering all 8 domains of the Claude / Anthropic certification (Associate, Developer, Architect tracks share the same blueprint). Compiled from the official course decks; every place the source material explicitly flagged something as an exam signal is called out inline as **🎯 Exam rule**.

**Exam format:** 53 scenario-based multiple-choice questions, 120 minutes, ~135 minutes total seat time with check-in and survey, passing score 720/1000 (72%).

---

## Table of contents

0. [⚠️ Personal weak-spot review](#personal-weak-spot-review)
1. [Agents & Workflows](#1-agents--workflows)
2. [Applications & Integration](#2-applications--integration)
3. [Claude Code](#3-claude-code)
4. [Eval, Testing & Debugging](#4-eval-testing--debugging)
5. [Model Selection & Optimization](#5-model-selection--optimization)
6. [Prompt & Context Engineering](#6-prompt--context-engineering)
7. [Security & Safety](#7-security--safety)
8. [Tools & MCP](#8-tools--mcp)
9. [How the eight domains connect](#how-the-eight-domains-connect)

---

## Personal weak-spot review ⚠️

Cumulative across practice attempts — each new attempt's misses get appended here rather than replacing the old ones, so this compounds over time. Points are numbered continuously across attempts.

### Attempt 1 — Hard Difficulty

**42/53 (79%)** overall, concentrated misses in **D3 (50%)**, **D5 (67%)**, and **D8 (67%)** — all below the 75% target. D6 and D7 were clean (100%).

| Domain | Score |
|---|---|
| D6 · Prompt & Context Engineering | 6/6 · 100% |
| D7 · Security & Safety | 4/4 · 100% |
| D2 · Applications & Integration | 14/17 · 82% |
| D1 · Agents & Workflows | 7/9 · 78% |
| D5 · Model Selection & Optimization | 6/9 · 67% |
| D8 · Tools & MCP | 4/6 · 67% |
| D3 · Claude Code | 1/2 · 50% |

#### 1. Thinking-mode configuration is model-specific (D5)
- Opus 4.8 and Sonnet 5 support **only `thinking.type: "adaptive"`**, with no `budget_tokens` field — the model sizes its own reasoning per request.
- Sending `thinking.type: "enabled"` with `budget_tokens` on these models returns a **400 error**.
- The legacy `budget_tokens` pattern still applies to **older models** (Sonnet 4.5, Opus 4.5) — one config does not work across the whole model line.
- 🎯 **Exam trap:** this exact scenario (migrating legacy `budget_tokens` code to a newer model) showed up twice in one practice set — treat it as a near-certain exam topic.

#### 2. `effort` is a nested field, not a top-level one (D2 / D5)
- Reasoning effort is configured at **`output_config.effort`**, not the request root.
- Valid values: `max`, `xhigh`, `high`, `medium`, `low` — default is **`high`**.
- A top-level `effort` field is silently ignored, not an error — easy to miss in review.

#### 3. Bedrock integration specifics (D2 / D5)
- **Current recommended path:** the `bedrock-mantle` endpoint, reached via the `AnthropicBedrockMantle` client, using **bare `anthropic.`-prefixed model IDs** — this mirrors the first-party API's request/response shape.
- **Legacy path** (still functional, but not the answer for a *new* build): `InvokeModel` with **region-scoped inference-profile IDs** (`us.anthropic....`).
- **Vision on Bedrock/Vertex:** URL-based image input and the Files API are **not supported** on either — images must be sent **inline as base64**. A design that assumes URLs work everywhere breaks the moment it targets Bedrock or Vertex.

#### 4. MCP stdio transport is literally stdin/stdout (D8)
- When an MCP client spawns a server locally, the two processes exchange protocol messages over the **child process's standard input and standard output streams** — not a TCP socket, not a shared file, not an authenticated HTTPS channel.
- A locally-run server over stdio is a **complete, valid deployment** for single-machine/single-developer use — it does not need a hosted public endpoint to "count" as done.

#### 5. Reach for the built-in before building custom (D8)
- Anthropic ships built-in server tools (e.g. web retrieval) that cost nothing to wire up — no schema to write, no server to host, no Skill to author.
- When a built-in already covers the need, building a custom tool, a Skill, or standing up an MCP server for the same capability is **pure duplicated effort**. Check the built-in list first.

#### 6. Hooks live in settings.json, not CLAUDE.md (D2)
- **CLAUDE.md** = behavioral instructions (advisory, what Claude should *know*).
- **settings.json** = hooks and permissions (enforced, what Claude *can do*).
- A `PreToolUse` hook meant to run for the whole team belongs in the **project-root `settings.json`**, committed to version control — putting it in CLAUDE.md means it never actually fires as a hook.

#### 7. Commands vs. Skills — different trigger mechanics (D3)
- A **custom slash command** is a plain Markdown file; its **filename alone** becomes the keyword. No frontmatter is required for it to work.
- A **Skill** requires **valid YAML frontmatter** (with a `description` Claude matches against) to trigger — that requirement belongs to Skills, not commands.
- Mixing these up leads to over-engineering a command with frontmatter it doesn't need, or under-specifying a Skill that then never fires.

#### 8. Subagents: the point is context isolation, not parallelism (D1)
- The headline benefit of delegating to a subagent is **keeping a subtask's intermediate tokens out of the parent's context window** — its reasoning, tool calls, and raw output stay in its own disposable window; only the final summary returns.
- Parallel speed is a nice side effect (and something Claude decides, not something you schedule) — it is **not** the primary architectural reason to use subagents.
- Subagents do **not** share memory with the parent implicitly, and they don't inherently reduce cost or guarantee determinism.

#### 9. Self-hosted ≠ "the whole loop runs on our servers" (D1)
- In a **self-hosted managed deployment**, the **agent loop and orchestration stay on Anthropic** — only **tool execution** moves to the customer's infrastructure.
- This is the shape for "keep sensitive tool calls in our network, but don't make us build and run our own harness."
- Contrast: **Anthropic-hosted** = everything (loop + tools) runs in an Anthropic-managed sandbox, zero customer infrastructure. A **custom harness** = the team runs and maintains the whole loop themselves — reach for this only when Anthropic's managed options genuinely don't fit.

### Attempt 2 — Hard Difficulty

**43/53 (81%)** overall — up from attempt 1, but **D7 dropped to the weakest domain (50%)** this time, and D2 stayed borderline. D3, D5, D6 all improved to comfortably clean.

| Domain | Score |
|---|---|
| D3 · Claude Code | 2/2 · 100% |
| D5 · Model Selection & Optimization | 8/9 · 89% |
| D6 · Prompt & Context Engineering | 6/7 · 86% |
| D8 · Tools & MCP | 5/6 · 83% |
| D1 · Agents & Workflows | 7/8 · 88% |
| D2 · Applications & Integration | 13/17 · 76% |
| D7 · Security & Safety | 2/4 · 50% |

#### 10. Least-privilege identity, scoped per agent *and* per tool (D7)
- IAM best practice: **every tool gets its own narrowly-scoped identity/credential**, not one shared identity across all tools "for convenience." A compromised tool should inherit only *its* role, not everything.
- Fixes that **don't** address the actual problem: verbose logging on the shared identity, rotating the shared credential more often, or storing the shared broad-scope key in a secret store. All of these keep the blast radius wide — logging/rotation/secure-storage are orthogonal to *scope*.
- 🎯 **Exam trap:** this exact lesson appeared twice in one attempt (once as "one shared service identity," once as "one shared API key") — high-yield, near-certain repeat.

#### 11. `PreToolUse` hook decisions: four values, not three (D1)
- `permissionDecision` accepts **`allow`, `deny`, `ask`, and `defer`** — not just allow/deny/ask.
- `ask` routes the call to a human for an explicit yes/no. `defer` hands the decision to the normal permission configuration instead of the hook deciding outright.
- A three-value framing (allow/deny/ask) that drops `defer` is a distractor to watch for.
- 🎯 **Missed twice now** — once on the full 53-question mock, again on a mock built specifically to drill it. The note alone isn't sticking; use the mnemonic **A·D·A·D — Allow, Deny, Ask, Defer** (say it in that order, it's alphabetical-ish and rhymes) until picking `ask` and `defer` out of a 5-option list is automatic.

#### 12. Cache-prefix structure: stable content in system, variable content in user turn (D2)
- Persistent rules/instructions belong in the **system prompt** — they apply every turn and form a reusable cached prefix.
- Per-request variable data (a document, a user question) belongs in the **user turn**, after the cache breakpoint, where it's expected to change.
- Mixing them — e.g. putting the rules in the user turn or the variable document in the system prompt — breaks caching and blurs the stable/variable boundary.

#### 13. Right-size the model tier *before* reaching for caching (D2 / D5)
- If a **simple, well-scoped, high-volume task** is running expensive and slow on Opus, the fix is **moving to a lighter tier (Haiku/Sonnet)** that still meets the quality bar — not adding prompt caching to make the over-provisioned Opus cheaper.
- Caching optimizes cost on a *correctly chosen* tier; it doesn't correct a wrong tier choice. Reducing reasoning effort or batching have the same blind spot — they keep paying for capability the task doesn't need.

#### 14. Cache economics: the first call on a new prefix pays the write premium (D5)
- On the **first call** against a stable prefix — before any cache entry exists — the request pays the **cache-write multiplier** (a premium over the base rate), because that call is what creates the cache entry.
- Only **subsequent calls** that hit the existing entry get the discounted read rate. There's no "reduced charge for reserving a slot" and the base rate is not simply skipped.
- Savings only accrue once a prefix is reused enough times to amortize that initial write premium.

#### 15. Security-review triage: a hardcoded credential outranks other findings (D2)
- In a code review surfacing multiple issues (free-text parsing, broad tool access, a hardcoded API key, trusting confident-sounding output), the **hardcoded key in source control is the most severe** — it's an exposed secret reachable via the repo, logs, or context, and must move to an environment variable or secret store.
- Don't let a less severe but more "interesting" finding (like output-parsing style) top the priority list ahead of an actual leaked credential.

#### 16. Don't force every extension through MCP — demote single-app capabilities to custom tools (D8)
- MCP earns its overhead (a server to build, host, and secure) **only when a capability is genuinely shared across multiple clients or apps**.
- A narrow action used by exactly one product, with no reuse in sight, should be a **custom tool** wired directly to the backend — not an MCP server. Exposing every single-app action as its own MCP server just adds operational overhead, attack surface, and misrouting between overlapping servers.
- This is the mirror image of weak spot #5 (reach for the built-in before building custom): the same "match the mechanism to actual reuse" principle, applied one level up.

#### 17. Batch/bulk processing needs *per-record* defensive parsing, not one big try/except (D6)
- When processing many model responses in a loop (e.g. an overnight batch job), wrapping the **entire job** in one try/except that stops at the first error still aborts the whole run on a single malformed response.
- The fix is parsing **each record defensively**, so one bad generation is contained and handled locally — the run continues past it instead of dying on it.

#### 18. Tool schema design: only require fields with no safe default; use enums for fixed sets (D2)
- Marking **every** field required causes the model to stall mid-call asking for values it can't infer. Require only fields that have **no safe default**.
- For any field with a fixed set of valid values (e.g. a status field), use an **enum**, not a free-form string with a longer description — free-form strings for fixed sets is exactly the pattern that lets the model send inconsistent values (`economy`, `Economy`, `coach`) that break the backend.

### Attempt 3 — Challenging Difficulty

**46/53 (87%)** overall — best score yet, on the hardest tier. D5, D6, D7 all hit 100%. **D2 is the recurring soft spot across all three attempts** (82% → 76% → 76%) and D3 dipped to 67% on a small 3-question sample.

| Domain | Score |
|---|---|
| D5 · Model Selection & Optimization | 10/10 · 100% |
| D6 · Prompt & Context Engineering | 6/6 · 100% |
| D7 · Security & Safety | 4/4 · 100% |
| D1 · Agents & Workflows | 6/7 · 86% |
| D8 · Tools & MCP | 5/6 · 83% |
| D2 · Applications & Integration | 13/17 · 76% |
| D3 · Claude Code | 2/3 · 67% |

#### 19. Tool-use token overhead applies whenever tools are *present* — `tool_choice` doesn't change that (D2 / D8)
- Sending tool definitions on a request adds a **base tool-use system-prompt cost** (roughly 290 tokens on Opus 4.8) regardless of `tool_choice`.
- Setting `tool_choice: "none"` or `"auto"` does **not** remove this overhead — it only changes whether the model is allowed/forced to call a tool, not whether the tool schemas are billed.
- The only way to reach genuinely zero tool-use overhead on a request that won't need one: **omit the tool definitions from that request entirely.**
- 🎯 This exact trap appeared twice in one attempt (once as `tool_choice: "none"`, once as `"auto"`) — high-yield repeat.

#### 20. Agent SDK "streaming input" ≠ API `stream: true` (D2)
- **Streaming input** is the Agent SDK's mode for how prompts/messages are *fed into* the running agent loop — it's an input mechanism, and the SDK's recommended default.
- **`stream: true`** at the API level controls how *output tokens* are delivered back (as server-sent events) — it's an output mechanism.
- These are two unrelated settings that happen to share the word "stream" — don't assume configuring one affects the other, and don't assume they're the same feature under two names.

#### 21. Team-reproducibility file mapping: one correct home per concern (D2 / D3)
- **Shared behavioral rules** (coding conventions, standards) → committed **`CLAUDE.md`**.
- **Deterministic guardrails** (e.g. a `PreToolUse` hook blocking a destructive command) → committed **`settings.json`**.
- **Personal, per-developer overrides** that must never be shared or committed → **`.claude/settings.local.json`**, which is git-ignored.
- No single file can hold all three — a design that crams guardrails or personal overrides into `CLAUDE.md` (prose can't enforce a hook) or commits `settings.local.json` (defeats the point of "personal") breaks reproducibility, enforcement, or privacy respectively.

#### 22. A refusal is intended behavior, not a bug — classify before you "fix" it (D2)
- When Claude declines a request on safety/policy grounds, that's a **refusal**: the model working as intended, not a defect.
- Filing a refusal as a system bug (or as a "transient error to retry," or "a tool integration error") misclassifies it — the correct response is to adjust the **prompt or guardrail configuration**, not to debug application code.
- Distinguishing refusal from bug matters because it determines *which* part of the system you go fix.

#### 23. The memory tool is client-side — Claude requests it, your code executes it (D1)
- The file-backed **memory tool** is an Anthropic-schema **client-side tool**, in the same family as `bash` and `text_editor` — Claude emits the call, but the developer's own code performs the actual read/write against storage.
- It does **not** run on Anthropic infrastructure automatically, and it is **not** the same thing as CLAUDE.md (which loads once, automatically, at session start, and is static).
- Because it writes outside the context window, memory-tool state **survives compaction and session boundaries** — unlike in-context conversation state, which is lost the moment the window truncates or the session ends.

### Attempt 4 — CCDV-F Form 1 (different source: AI Certificates)

**42/53 (79%)** — first attempt from a different question bank, useful precisely because it phrases familiar concepts differently. Confirms D2 as a genuine, now four-attempt-consistent pattern (82% → 76% → 76% → 76%), and surfaces a clear new gap: **Skill vs. every other extension mechanism**, missed twice in this one attempt.

| Domain | Score |
|---|---|
| D7 · Security & Safety | 4/4 · 100% |
| D4 · Eval & Debugging | 1/1 · 100% |
| D5 · Model Selection & Optimization | 8/9 · 89% |
| D1 · Agents & Workflows | 7/8 · 88% |
| D6 · Prompt & Context Engineering | 5/6 · 83% |
| D2 · Applications & Integration | 13/17 · 76% |
| D8 · Tools & MCPs | 3/6 · 50% |
| D3 · Claude Code | 1/2 · 50% |

#### 24. Client-side `tool_use` still means *your code* runs it and returns a `tool_result` (D1 / D8)
- When a response ends with `stop_reason: "tool_use"` for a **custom (client-side) tool**, the API has paused and is waiting on the application — it does not execute the tool for you. The app must run the call itself, then return a `tool_result` block tied to that `tool_use` id before the model can continue.
- Only Anthropic's **server-side** tools (web search, web fetch, code execution, tool search) run on Anthropic's infrastructure and can return directly without this round trip.
- 🎯 Worth extra drilling: this exact mechanic showed up twice in one attempt, worded differently — missed once, answered correctly once. If the underlying fact isn't rock-solid, different phrasing will catch it inconsistently.

#### 25. Deriving the *right* infrastructure requirement from a deadline — don't grab the nearest plausible-sounding one (D2)
- Given a business constraint like "40,000 reports must be summarized and visible by 6 a.m., nobody watches it run," the infrastructure requirement that actually follows is **throughput sufficient to finish the volume by the deadline** — not low-latency streaming (nobody's watching), not autoscaling for morning dashboard readers (that's read traffic *after* the results exist), not a realtime priority queue (nothing needs per-item immediacy).
- The trap: several distractors describe real infrastructure concerns that just don't apply to *this* constraint. Anchor on what the business requirement is actually binding on before picking an answer.

#### 26. A prompt tuned in claude.ai will not behave the same sent verbatim through the API (D2)
- Consumer surfaces like claude.ai inject their **own system prompt, tools, and product-level framing** around whatever you type. The raw Messages API starts from a blank slate — none of that scaffolding exists unless you build it yourself.
- The fix when porting behavior from claude.ai to the API isn't debugging the model — it's **explicitly reconstructing** the framing (system prompt, tone rules, tool access) that the web interface was quietly providing.

#### 27. Large diffs degrade code review effectiveness — no amount of process fixes that (D2)
- A 2,000-line pull request gets reviewed fast and defects still slip through, not because reviewers are careless but because **diff size and mixed purpose make genuine scrutiny infeasible**, regardless of checklists, a second approver, or a live walkthrough (which just transfers the author's framing rather than checking it).
- The actual fix is **splitting work into small, single-purpose changes** reviewed separately — this is the intervention that makes careful review possible at all, not an add-on to a large-diff process.

#### 28. When something is a Skill — vs. CLAUDE.md, a slash command, an MCP server, or a custom tool (D3 / D8)
- **Missed twice in one attempt** — this is the clearest new gap from this pass. The discriminating questions to ask about a piece of team know-how:
  - Does it need to be **always loaded**, every session, no matter the task? → **CLAUDE.md**.
  - Does someone need to **explicitly invoke** it when they remember to? → a **slash command**.
  - Should it **load automatically, only when the task matches**, without permanently costing context? → a **Skill**.
  - Does it need to **call a live external system** (a database, a shared service) rather than just supply instructions and reference files? → an **MCP server** (if shared across clients) or a **custom tool** (if used by only one app).
- A documented multi-step procedure with formatting rules and helper scripts, with *no external system involved*, that should surface only when relevant — that shape is a Skill's exact use case, not an MCP server (nothing external to connect to), not a custom tool (it's not one callable function), and not CLAUDE.md (would tax every session's context for something only occasionally relevant).

#### 29. Adaptive thinking is the answer for *mixed-difficulty* traffic on one endpoint (D5)
- When one endpoint serves a mix of simple lookups and occasional multi-step reasoning, **always-on extended thinking** taxes every simple request with unneeded thinking tokens, while **manually routing by keyword** to two separate deployments is brittle and adds an extra system to maintain.
- **Adaptive thinking** lets the model itself decide, per request, whether the query warrants deeper reasoning — solving exactly this mixed-workload shape without a routing layer or a blanket policy in either direction.

#### 30. Some fixes are genuinely two-part — don't stop after finding one correct lever (D6 / D8)
- **Output-format instability** (bullets one run, a table the next, prose after that) is fixed by **two complementary levers together**: explicitly spelling out the required structure *and* showing worked examples of it. Either alone is weaker than both — instructions alone leave room for interpretation, examples alone don't state the rule they're illustrating.
- **Tool-selection errors** (the model picking the wrong one of several similar tools) are fixed by **two complementary levers together**: rewriting each tool's description to state precisely when it applies and how it differs from its near-neighbor, *and* consolidating genuinely overlapping tools into a smaller, non-competing set. Sharper descriptions alone don't remove real overlap; consolidation alone doesn't help if what's left is still vaguely described.
- On multi-select questions, a partially-right pair (one correct lever + one plausible-but-wrong one) is a common trap — check whether the two "obviously good" options are actually addressing the same root cause from different angles, which is usually the signal both are meant to be picked.

#### 31. Tool failures should reach the model as a structured error, not crash the run (D8)
- When a tool call fails (e.g. a transient `503` from a backend API), the harness should return the failure as an **error-flagged `tool_result`** — what failed, and why — so the model can reason about it: retry, back off, or try a different approach.
- What *not* to do: let the exception kill the whole run (discarding all prior progress), retry silently with no visibility (the model never learns retries are failing and can't adapt), or try to validate every possible failure away beforehand (a transient server-side fault happens to perfectly valid requests — validation can't prevent it).
- This is the same "your code executes, the model reasons over the result" principle as #24, applied to the failure path specifically.

### Attempt 5 — Form 2 (self-authored original mock)

**45/53 (85%)** — best percentage yet, on an original 53-question full-length form (D3 and D8 misses are on small samples, 2 and 6 questions respectively, so weigh those less heavily than D1's 6/8).

| Domain | Score |
|---|---|
| D4 · Eval, Testing & Debugging | 1/1 · 100% |
| D7 · Security & Safety | 4/4 · 100% |
| D2 · Applications & Integration | 16/17 · 94% |
| D6 · Prompt & Context Engineering | 5/6 · 83% |
| D8 · Tools & MCPs | 5/6 · 83% |
| D5 · Model Selection & Optimization | 7/9 · 78% |
| D1 · Agents & Workflows | 6/8 · 75% |
| D3 · Claude Code | 1/2 · 50% |

#### 32. Subagents have TWO distinct benefits — isolation *and* containment — don't collapse them into one (D1)
- **Isolation**: a subtask's intermediate tokens (a long document read, a big exploration) stay in the subagent's own window, so only the distilled result reaches the parent.
- **Containment**: a *failure* inside the subagent — a bad read, an error, a wrong turn — stays local and can't corrupt or poison the manager's own state/run.
- These are separate claims. A multi-select question can correctly flag isolation while the second correct answer is containment, not something adjacent-sounding like "guaranteed determinism" or "automatically cheaper" — subagents provide neither of those.

#### 33. Bloat/drift distractors also come as a *swapped* fix, not just a merged one (D1)
- The known trap is treating bloat and drift as one problem with one fix. There's a second, subtler trap: a distractor that keeps them separate but **swaps which fix goes with which problem** — e.g. "the crowding is fixed by re-anchoring; drift resolves once tool output shrinks" (backwards).
- The correct pairing is always: **drift → re-anchor the instruction**, **bloat/crowding → prune or compact tool output**. When a multi-part answer keeps the two problems distinct, still check the fix is matched to the *right* one before picking it.

#### 34. A business objective is a third category — not automatically a non-functional requirement (D2)
- "Reduce processing cost by 25% this year" or "improve customer satisfaction scores" are **business objectives** — the outcomes requirements exist to serve — not themselves functional or non-functional requirements on the system.
- On a multi-select "which are non-functional requirements" question, a business-goal-shaped statement is a common wrong pick precisely because it *sounds* like a constraint. The real non-functional requirements are the measurable quality attributes (latency, isolation, throughput) — not the business reason those attributes matter.

#### 35. Plan Mode is not headless mode — don't reach for it for unattended automation (D3)
- **Plan Mode** proposes a set of actions and pauses for a human to approve them — useful for supervised work, wrong for anything unattended.
- **Headless mode** (`-p` / `--print`) runs a fixed prompt to completion with no UI and no pause, then exits — this is what CI pipelines and cron jobs need.
- A CI/cron scenario ("no person present to respond to anything") is designed to make Plan Mode look plausible because it's still an "automation" feature — it is not the automation feature that fits *unattended* runs.

#### 36. Fast mode vs. extended thinking — the most consistently missed distinction across every attempt so far (D5)
- 🎯 **This has now been missed multiple times across different question banks — treat it as close to guaranteed to appear on the real exam.**
- **Fast mode**: the *same* model, generating output tokens faster, at a premium per-token price. It's a **latency** lever. Reasoning quality is unchanged because the model itself hasn't changed.
- **Extended thinking**: the model reasons in a scratchpad *before* answering — this **increases** time-to-first-token, the opposite of what a latency complaint needs.
- The reliable tell: any scenario that says *"latency is the complaint, quality must be preserved, cost is secondary"* → the answer is fast mode, never extended thinking, never a smaller tier, never Batches.

#### 37. Long documents: content first, question after — a concrete positional rule, not just advice (D6)
- When a request pairs a long document with a specific question about it, the accuracy fix is **structural**: put the full document **before** the question and instructions, so the model reads the query with the content already in view.
- Wrong-but-tempting alternatives: splitting the document into many small per-page requests (destroys cross-page context the answer may depend on), or dropping the document and answering from general knowledge (answers about the topic in general, not about *this* document).

#### 38. MCP roots — flagged again after an earlier correct answer on the same concept (D8)
- Roots are the **client-granted list of paths** a server may reach; a server has **no implicit filesystem access** beyond what's declared there. Registering every individual file as its own tool does not scope anything — it just multiplies tools without adding a boundary.
- This exact concept (roots as the least-privilege filesystem mechanism) was answered correctly in an earlier mock and missed here under different wording — a sign the underlying fact needs one more deliberate pass rather than being marked "known."

### Attempt 6 — Warm-Up difficulty

**47/53 (89%)** — strongest raw score yet. Six misses, and two of them (#40's pair) test the identical concept back-to-back in the same attempt — a stronger signal than a single miss.

| Domain | Score |
|---|---|
| D3 · Claude Code | 2/2 · 100% |
| D4 · Eval, Testing & Debugging | 1/1 · 100% |
| D2 · Applications & Integration | 17/18 · 94% |
| D5 · Model Selection & Optimization | 8/9 · 89% |
| D1 · Agents & Workflows | 7/8 · 88% |
| D6 · Prompt & Context Engineering | 6/7 · 86% |
| D8 · Tools & MCPs | 4/5 · 80% |
| D7 · Security & Safety | 2/3 · 67% |

#### 39. Exceeding the context window is an error, not a silent fix (D5)
- If a request goes over the context window, the API **returns an error** — it does not silently drop the oldest tokens, auto-summarize, or auto-expand the window to fit.
- Staying inside the limit is an **active engineering responsibility**: pruning stale tool output, compacting history, or windowing content, not something the API manages for you.
- The distractors to rule out on sight: "silently drops the oldest tokens and continues" and "the window automatically expands" are both fabricated behaviors — the real answer is always the error, with management as the developer's job.

#### 40. "More context is always better" is false — missed twice in one attempt, worded two different ways (D1 / D6)
- 🎯 Tested as both "stuffing every document the model might conceivably need" and "keeping every raw tool response for completeness" — same underlying concept, both missed. Treat this as high-yield.
- Filler and low-signal content **wastes budget, raises cost and latency, and can actively degrade focus and accuracy** — it does not sit there harmlessly, and the model does not "ignore" it for free.
- Selective, high-signal context beats cramming everything in. This is the same mechanism as context rot / the attention budget from the main Domain 6 material, now confirmed as a real, recurring miss rather than just a concept to recognize.
- Distractors to rule out: "a larger context tends to improve quality," "filler tokens are ignored and carry no cost," "bloat raises latency but leaves accuracy unchanged" — all three deny that bloat has a real, negative effect on the answer itself.

#### 41. PII protection acts on the way IN, not just the way out (D7)
- Sensitive data (SSNs, full records) must be **minimized and redacted before it ever enters the prompt or gets logged** — not sent in full and cleaned up by filtering the response afterward.
- Filtering only the outbound response leaves the inbound exposure completely unaddressed — the data already reached the model, and very likely a log, before any output-side filter ever runs.
- Distractors to rule out: encrypting the response (protects it in transit/storage, does nothing about the model or logs having already seen raw PII), and timing sends for off-peak hours (irrelevant to exposure — has nothing to do with *who* or *what* can see the data).

#### 42. MCP's three primitives have distinct **control owners** — not just distinct jobs (D8)
- **Tools** are **model-controlled** — the model decides when to invoke one.
- **Resources** are **application-controlled** — the host application decides what to include.
- **Prompts** are **user-controlled** — a person explicitly selects/invokes them.
- This is a sharper framing than "resources query, tools act, prompts standardize" (still true, but this question is testing *who decides*, not just *what each does*). A distractor naming a different trio ("functions, files, templates") or claiming the model controls all three misstates the protocol.

#### 43. The SDK never unlocks capabilities the underlying REST surface doesn't support — reinforced with a new combination (D2)
- The SDK is a thin convenience wrapper (auth, retries, typed errors, streaming parsing) over the **same REST endpoints** — it cannot expose a capability the REST surface lacks.
- Concretely: if server-side tools are unsupported on a platform like Bedrock, migrating from raw REST to the SDK does **not** unlock them — they stay unsupported either way.
- The SDK also does **not** make output deterministic — non-determinism is a property of generation itself, unrelated to which client sent the request.
- This combines two already-known facts (SDK-wraps-REST, and non-determinism-is-expected) into one question — the miss suggests reaching for "the SDK is more powerful/reliable" as an assumption rather than recalling it's a pure convenience layer.

## Final cram — Tier 1 & Tier 2

Prioritized from the pattern across all five attempts. If exam day is close, read this section last, in this order.

### 🎯 Tier 1 — near-certain to appear, missed repeatedly

#### 1. Fast mode vs. Extended thinking

| | Fast mode | Extended thinking |
|---|---|---|
| What changes | Same model, faster **output token generation** | Model reasons in a scratchpad **before** answering |
| Effect on latency | **Reduces** time-to-answer | **Increases** time-to-first-token |
| Effect on reasoning quality | Unchanged — it's still the same model | Improves quality on hard, multi-step problems |
| Cost | Premium per-token rate | More tokens spent (the thinking tokens) |
| Availability | Not available with the Batches API | Available on models that support adaptive thinking |

**How the exam disguises this:** every version of this question sets up the same shape — an interactive, latency-sensitive workload (live chat, a debugging copilot, an agent mid-call) where reasoning quality must be **preserved**, and cost is explicitly stated as **secondary**. The distractor that keeps winning is **extended thinking**, because "reasoning more carefully" *sounds* like the safe, quality-preserving choice. It's the opposite — it adds a reasoning phase before the answer even starts, making the latency complaint worse, not better.

**The other distractors, and why they're wrong:**
- **Downgrade to a smaller tier** — sacrifices exactly the reasoning quality the scenario says to protect.
- **Move to the Batches API** — trades *cost* for a multi-hour delay window; the opposite of an interactive workload's needs, and fast mode isn't even available there.

> **Exam-day rule:** the moment a question says *latency complaint + preserve quality + cost is secondary*, the answer is fast mode. That combination has only one correct mechanism among the options you'll be shown.

#### 2. `PreToolUse` hook `permissionDecision` — four values

- **`allow`** — the tool call proceeds.
- **`deny`** — the tool call is hard-blocked before it runs.
- **`ask`** — the call pauses and routes to a **human** for an explicit yes/no.
- **`defer`** — the hook declines to decide, and the call falls back to the normal permission configuration instead.

**How the exam disguises this:** the trap is a distractor option listing only three values — typically `allow`, `deny`, `ask` — omitting `defer`. It reads as complete and plausible, especially if you're recalling "a hook can allow, deny, or ask a human," which is *almost* right and exactly wrong.

**Where this shows up:** any question about routing a risky-but-not-always-wrong tool call to a human (a file deletion, a destructive command, a payment) for confirmation rather than outright blocking it — `ask` is usually the single right answer there. On a multi-select "which two decisions exist for this" version, the pairing to recognize is **`ask` and `defer`** as the two non-terminal decisions, versus `allow`/`deny` as the two terminal ones. Fabricated-sounding options like `permit`, `escalate`, or `block` are never real values.

> **Exam-day rule:** if the answer choices include a three-value list for this, that's the tell it's wrong — the real set always has four: allow, deny, ask, defer. Mnemonic: **A-D-A-D**.

#### 3. Skill vs. CLAUDE.md vs. slash command vs. MCP server vs. custom tool

The decision tree, in the order the exam actually asks it:

1. **Does it need to call a live external system** (a database, a shared internal service, an API)?
   - Yes, and **multiple clients/apps** need it → **MCP server**.
   - Yes, but only **one app** needs it → **custom tool**.
   - No external system at all → go to step 2.
2. **Is it pure knowledge/procedure** (instructions, templates, formatting rules, a checklist) with no external system to call?
   - Needs to be **always loaded**, every session, regardless of task → **CLAUDE.md**.
   - Someone must **explicitly invoke it** when they remember to → **slash command**.
   - Should **load automatically, only when the task matches**, without taxing every session's context → **Skill**.

**The specific scenario shape that keeps catching this:** "a documented multi-step procedure with formatting rules and helper scripts, used across many projects, that should surface only when a matching task arises — no new system call involved." This is the canonical Skill description. The wrong answers that keep winning:
- **MCP server** — sounds "shareable across projects," but MCP's value is a *live connection to an external system*, and there's nothing external here.
- **Custom tool** — sounds like it "packages the scripts," but a custom tool is one callable function; a judgment-heavy, multi-step procedure isn't a single function call.

**A related trap in the same family:** a **custom slash command** is just a Markdown file — its **filename alone** is the trigger, no frontmatter required. A **Skill** *requires* valid YAML frontmatter with a `description` Claude matches against to know when to load it. Assuming a command needs frontmatter, or that a Skill will trigger without it, is a distinct but related mistake.

> **Exam-day rule:** first ask "is there a live external system to call?" — that single question splits MCP/custom-tool from CLAUDE.md/command/Skill immediately. Only then decide between always-loaded, user-invoked, or auto-loaded-on-demand.

### ⚠️ Tier 2 — inconsistent, worth a solid re-read

#### 4. MCP roots — the filesystem least-privilege mechanism

**The mechanism, precisely:** when an MCP server needs filesystem access, the **client** declares which specific paths ("roots") the server is allowed to reach. The server has **no implicit access beyond what's declared** — a default-closed, least-privilege boundary set from the client side, not something the server grants itself or something enforced reactively after the fact.

**The scenario shape:** "an MCP server needs to read files, but must be limited to two specific project folders and nothing else on disk" — seen almost identically twice, right once, wrong once, meaning the fact hasn't fully hardened yet.

**The distractors, and exactly why each is wrong:**
- **"The server inherits the host process's full filesystem access by default"** — false, and the *opposite* of a least-privilege boundary. Instant no.
- **"Register every individual file as its own separate tool"** — the one that actually catches you. Sounds granular/scoped, but adds no boundary enforcement at all — it just multiplies tools while access stays exactly as open.
- **A `PostToolUse` hook that reacts to out-of-scope reads** — reacts *after* the read already happened. Wrong layer; the boundary must prevent the read, not clean up afterward.

> **Exam-day rule:** whenever a question scopes *what a server can read on disk*, the answer is roots. Per-file tools, a reactive hook, or "default full access" are all wrong regardless of how the scenario is dressed up.

#### 5. Subagents: isolation *and* containment are two separate claims

- **Isolation** — a subtask's intermediate tokens (a long document read, a big exploration, verbose tool output) stay inside the subagent's own context window; only the final, distilled result returns to the parent. About **volume/token growth**.
- **Containment** — if something goes wrong *inside* the subagent, that failure stays local and can't corrupt or poison the manager's own state. About **failure blast radius** — a completely different axis from isolation.

**How the exam disguises this:** single-choice subagent questions usually only need isolation, which is solid. The trap is on **multi-select "choose two benefits"** questions — isolation gets picked correctly, then the second pick reaches for something that sounds adjacent but is fabricated:
- **"Guaranteed byte-identical output"** — wrong; generation stays non-deterministic regardless of where it runs.
- **"Automatically runs on a cheaper model tier"** — wrong; delegation doesn't change model tier, that's a separate explicit choice.
- **"Removes the need to design a synthesis step"** — wrong; someone still has to combine the subagent's report into the overall answer.

> **Exam-day rule:** on any multi-select subagent question, the two real answers are isolation and containment. Treat them as a fixed pair to recall together, not something to re-derive each time.

#### 6. Domain 2 generally — the recurring sub-themes

D2 is 33% of the real exam by weight. Even though the most recent attempt jumped to 94%, these narrow, easy-to-mix-up facts recurred across three flatter attempts (~76% each) and are worth a final pass:

- **`effort` lives under `output_config.effort`**, not the request root. A top-level `effort` field is silently ignored, not an error.
- **Current Bedrock path** is the `bedrock-mantle` endpoint via `AnthropicBedrockMantle`, with bare `anthropic.`-prefixed IDs — legacy `InvokeModel` + region-scoped profile IDs still works but isn't the answer for a *new* build.
- **Hooks live in `settings.json`, not CLAUDE.md** — CLAUDE.md is advisory; a `PreToolUse` hook for the whole team must be in the committed project `settings.json`.
- **Cache prefix structure**: stable content (system prompt, tools) first with the breakpoint after it; variable per-request content (a timestamp, a trace ID, a user's question) always *after* that breakpoint, never before it.
- **Right-size the model tier before reaching for caching** — a simple, high-volume task running expensive on Opus needs a lighter tier, not caching an over-provisioned model.
- **In a security-review triage question, a hardcoded credential always outranks every other finding** — broad tool access, free-text parsing, confidence-based trust issues are real but lower severity.
- **claude.ai injects its own system prompt and tools that the raw API starts without** — behavior tuned in claude.ai must be explicitly rebuilt when moved to the API; not a quality or randomness difference.
- **A business objective ("reduce cost by 25%") is a third category**, separate from both functional and non-functional requirements — don't pick it on a "which are non-functional" multi-select just because it sounds like a constraint.
- **Session hygiene**: independent tasks get independent sessions — "ignore everything above" instructions don't reliably work because the material is still physically in context.

> **Exam-day rule for D2:** if a question tests a small, specific API/config detail rather than a broad concept, it's likely drawing from this list — these are the "gotcha" facts, not the conceptual ones.

---

## 1. Agents & Workflows

The foundational domain — its vocabulary (loop, context, subagent, hook) is reused by every other domain.

### Workflow or Agent?

**Workflow** — you write the steps, Claude fills in the language inside them.
**Agent** — you give the goal and tools; Claude decides the next step at runtime.

> **🎯 Exam rule:** The only distinguishing question is **who decides the next step** — not "which is smarter," not "which uses tools" (both can). If you can draw the flowchart in advance, it's a workflow.

Four workflow patterns:
- **Chaining** — output of one step feeds the next.
- **Routing** — classify first, then send to the right handler.
- **Parallel** — run independent steps at once, then combine.
- **Orchestrator** — one step plans the work and gathers results from workers.

| | Workflow | Agent |
|---|---|---|
| Steps decided by | You, upfront | Claude, at runtime |
| Predictable | Yes | No |
| Cost | Known | Varies |
| Debugging | Easy | Harder |
| Best for | Repeated, known tasks | Open-ended tasks |

> **🎯 Exam rule:** When both approaches could work, **choose the workflow**.

### Inside the Agent Loop

The loop, every cycle:
1. **Claude thinks** — goal + tools + history, reasoning about the immediate next action only.
2. **Calls a tool** — Claude requests, your code decides whether to run it and executes it. Claude never runs anything itself.
3. **Result returns** — appended to history.
4. **Loop repeats** with more context than before.

> **⚠️ Watch for:** The gap between "Claude calls a tool" and "your code executes it" is exactly where approvals, permissions, and hooks live (see Domain 7).

**The stopping problem** — a loop needs an exit: goal met, iteration limit hit, or unrecoverable error. A loop with no exit runs forever and bills forever.

> **🎯 Exam rule:** Production agents **always** set an iteration limit — this is the line between a demo and a real system.

**Three loop shapes:**
- Single call — no loop, one tool one answer.
- Tool-use loop — repeats until done, steps unknown upfront.
- Subagent dispatch — loop spawns loops, for separable subtasks.

### Context & Memory

The context window is a fixed-size whiteboard shared by the system prompt, conversation history, and tool outputs. Once full, quality drops *silently*, before anything visibly breaks.

| | Bloat | Drift |
|---|---|---|
| Problem | Too much volume. Junk tool output crowds out what matters. | A problem of attention. The original goal gets buried under turns. |
| Fix | **Prune tool output** before it lands — filter to only the fields Claude needs. | **Re-anchor the goal.** |

> **⚠️ Caution:** Bloat and drift are different problems with different fixes — don't treat them as one.

**Compaction** summarizes old turns and keeps recent ones intact — trades detail for room; it is lossy and can lose something that mattered.

| | Context window | Memory |
|---|---|---|
| Lifespan | Wiped at session end | Survives after session ends |
| Cost | Every single call | Only on retrieval |
| Holds | What Claude has right now | What Claude can go fetch |

Memory lives **outside** the model, in a file or database. Two actions only: **write** what's worth keeping on the way out, **read** back only the relevant notes on the way in — reading everything back just rebuilds bloat.

### Manager, Workers, Subagents

One manager agent owns the plan; subagents own execution. Each subagent starts with a **fresh, empty** whiteboard and one narrow job — it runs its own full loop and returns only its answer.

- **Isolation** — a 200-page doc gets read inside the subagent; only one paragraph comes back.
- **Containment** — a failure stays inside one subagent instead of poisoning the whole run.
- **Speed** — independent subagents can run in parallel (Claude decides when, you don't script it).

> **⚠️ Caution:** Subagents aren't free — you pay the manager's tokens **plus** every subagent's. Split only when subtasks are genuinely independent, context is overflowing, or parallel speed truly matters. Don't add a manager for a three-step task.

### Building Agents with Claude

| | Agent SDK | Custom harness | Managed Agents |
|---|---|---|---|
| Who writes the loop | Anthropic | You | Anthropic |
| Runs in | Your process | Your process | Anthropic's cloud |
| Best for | Common patterns | Unusual requirements | Long-running, async, production |

> **🎯 Exam rule:** The Agent SDK is **not** a generic agent framework — it's Claude Code itself, packaged as a library, with built-in tools (Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch). Move to a custom harness only when you can **name** the specific thing the SDK won't let you do.

> **⚠️ Nuance:** Self-hosted infrastructure is a choice *inside* Managed Agents, not its opposite. Managed Agents is in beta and, because sessions are stateful, is **not currently eligible for Zero Data Retention or HIPAA**.

**Hooks are deterministic** — code that always runs, no model judgement involved. Named events: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit`.

> **🎯 Exam rule:** Prompting *asks* Claude nicely; a hook *enforces*. "Deterministic" is the exam signal word.

### Agentic Frameworks

All three speak MCP (Domain 8) and build both workflows and agents.

| Framework | Model | Optimized for |
|---|---|---|
| **Strands** | Model-driven — give tools + a goal, get out of the way | AWS Bedrock |
| **LangGraph** | Graph-driven — agent is a state machine with LLM steps | Branching paths, pause/resume, checkpoints, human approval |
| **PydanticAI** | Type-driven — typed outputs + dependency injection | Strict validation, less code |

> **🔗 Connects to:** Frameworks trade control for speed; the spectrum runs Framework → Agent SDK → Custom harness for code-you-write, with Managed Agents as the only one that moves the loop off your own infrastructure.

### Quick recall — Domain 1
- Who decides the next step = the only workflow-vs-agent test.
- Loop = think → call tool → result returns → repeat. Claude requests, your code executes.
- Always set an iteration limit in production.
- Bloat (volume) ≠ Drift (attention) — different fixes.
- Memory: write on the way out, read on the way in — outside the model.
- Subagents: fresh context, isolation + containment + parallel speed — but never free.
- Agent SDK = Claude Code as a library, not a generic framework.
- Hooks are deterministic enforcement; prompts are advisory.

---

## 2. Applications & Integration

Translating a business wish into a build spec, the API mechanics underneath every call, and the lifecycle that keeps it working.

### Business Needs → Build Requirements

- **Functional** — what the system must *do*. Test: can you phrase it as "the system shall…"? e.g. look up an order, answer FAQs, escalate to a human.
- **Infrastructure** — what it must *run on*: scale, latency, cost, security, data location. Decides model choice, batch vs realtime, self-hosting.

> **🎯 Exam rule:** Beginners remember functional and forget infrastructure — miss it and the app works in a demo but falls over in production. Exam scenarios give a business need and ask which requirement is missing.

### REST, JSON, Async

An API is the waiter between your code and Claude. The Claude API is REST: a request to a URL, a predictable JSON response every time.

**Synchronous** — your code waits at the counter until Claude replies. **Asynchronous** — fire the request, keep working, pick up the answer later (the idea behind the Batch API).

### API Mechanics I — Messages, Tools, Streaming

Every call is a list of messages with three roles: `system` (standing rules), `user` (the ask), `assistant` (Claude's reply). The whole history is resent every call — Claude has no memory between calls.

**Tools**: Claude requests an action, your code runs it, the result returns — the request-execute gap from Domain 1, now at the API level.

> **🎯 Exam rule:** Streaming is a UX choice, not a correctness one — **stream for a human watching**, skip it for another program consuming the whole answer at once or a batch job.

### API Mechanics II — Vision, Caching, Vendors, Batch

- **Vision** — images as input. **Extended thinking** — reason longer before answering, better on hard tasks, costs more tokens/time.
- **Prompt caching** — cache reads cost roughly a **tenth** of normal input. One of the biggest cost levers.
- **Where Claude runs** — Anthropic API, Amazon Bedrock, Google Vertex: same model, different front door. "Our whole stack is on AWS" → Bedrock.
- **Batch API** — bulk, non-urgent, overnight, ~50% cheaper.

> **🎯 Exam rule:** "Non-urgent, cost is the priority, results by morning" → the answer is always **Batch**. Three access patterns: realtime (sync), streaming (pieces as they arrive), batch (async bulk).

### The Life of a Claude System (SDLC)

Five stages, looping, not linear: **Plan → Build → Test → Deploy → Operate**. Waterfall runs them once in order; Agile repeats them in short cycles.

> **🎯 Exam rule:** Unlike ordinary software, a Claude app's behavior can shift when **the model updates**, even with your code untouched — this is why version pinning is part of the lifecycle, not an optional extra.

Building takes weeks; **operating takes years** — monitoring quality, handling errors, updating prompts, controlling cost is where most real work lives. A problem spotted while operating feeds back into the next planning round.

### Version Control, Code Review, Refactoring

Git = unlimited, shared undo. **Prompts and CLAUDE.md are code too** — version them so a prompt change that hurts quality can be diffed and rolled back.

Code review = a second pair of eyes before shipping. Refactoring: small (rename, split a function — low risk) vs large (restructure many files — needs more testing and review).

### Interfaces & Boundaries

API/SDK, Claude Code, Desktop, claude.ai — same model, different doors, and **each treats your instructions differently**. A system prompt in the API is fixed and applies to every call; the same words typed in claude.ai sit in a different setup entirely.

> **🎯 Exam rule:** **Content boundary** = trusted instructions vs untrusted content. A document Claude is asked to summarize is data to work *on*, never orders to follow — even if it contains text like "ignore your instructions." This is the same idea Domain 7 calls prompt-injection defense.

Match interface to job: building a product → API/SDK · modernizing a codebase → Claude Code · everyday personal use → Desktop/claude.ai.

### Schemas, Sessions, Plugins

**Schema** = a fixed, agreed shape for Claude's output — clear names, only the fields you'll use, a stable shape.

**Session hygiene** — one job per conversation; start fresh when the topic shifts, or stale info from a finished task pollutes new answers (the drift problem from Domain 1, now a design rule).

**Plugins** are dependencies — track which ones and which versions, same as any other dependency.

### Configuration Management

| | CLAUDE.md | settings.json |
|---|---|---|
| What it is | Written rules — what Claude should *know* | Machine control panel — what Claude *can do* |
| Enforcement | Guides only — does not enforce | Enforces (tool permissions) |

> **🎯 Exam rule:** **Pin the model version** (not `"latest"`) so behavior doesn't shift silently. Version prompts and plugins too, so a bad change can be rolled back — this is the whole point of the version control lecture, applied.

### Quick recall — Domain 2
- Functional = what it does; Infrastructure = what it runs on — the exam tests both.
- Stream for humans, not machine consumers or batch jobs.
- Cache reads ≈ 1/10th cost; Batch ≈ 50% off, overnight.
- SDLC is a loop: Plan→Build→Test→Deploy→Operate; model updates can shift behavior.
- Content boundary: trusted instructions vs untrusted data — never let content give orders.
- CLAUDE.md guides (advisory); settings.json enforces (machine control panel).
- Pin the model version; version prompts and plugins.

---

## 3. Claude Code

A smaller domain — know the configurable pieces and the two ways to run it.

### The Building Blocks

| Piece | What it is | Loads / triggers |
|---|---|---|
| **Rules** | Focused instruction files in `.claude/rules/` | Only when matching files are touched |
| **Skills** | A `SKILL.md` folder — reusable know-how for one task class | Typed `/command` or Claude spots a matching task |
| **Commands** | Slash shortcuts — built-in (`/init`, `/clear`, `/compact`) or a custom file | Typed explicitly |
| **Agents** | Subagents with their own clean context — review, test-writing, refactor | Dispatched for a sub-task |
| **Agent Memory** | CLAUDE.md (you write it) + Auto Memory (Claude learns patterns) | Explicit vs learned |

> **🔗 Connects to:** Rules keep context clean the same way Domain 1's pruning does — targeted guidance instead of one giant always-loaded file.

### Running It

`/init` scans the repo and writes a starting CLAUDE.md — the first command in a fresh repository, then you edit it by hand.

**CLAUDE.md hierarchy** — read up the directory tree: Home folder (broad) → Project (shared with the team) → Sub-folder (specific area, added on top). `settings.json` merges user settings, then project settings — later ones override earlier.

| Session tool | Does |
|---|---|
| **Resume** | Pick up where you left off |
| **Branch** | Split off a new direction |
| **Checkpoint** | Return to an earlier point |
| `/clear` | Reset a cluttered session |

> **⚠️ Exam caution:** Checkpoints are **not Git** — they cannot undo real-world side effects like a sent API call.

**Interactive** (`claude`) — a person types, watches, responds. **Headless** (`claude -p "…"`) — pass the whole task, no UI, prints the result; puts Claude Code into CI/CD pipelines.

> **🎯 Exam rule:** Two independent axes, don't conflate them — **streaming mode** controls how OUTPUT flows (live event feed); **auto-mode** controls how APPROVALS are handled (a second model reviews routine tool calls instead of asking you).

### Quick recall — Domain 3
- Rules load when relevant; Skills load when triggered; Commands are typed explicitly.
- CLAUDE.md hierarchy: Home → Project → Sub-folder, broad to specific.
- Checkpoints ≠ Git — can't undo side effects.
- Streaming mode = output flow; auto-mode = approval handling — different axes.

---

## 4. Eval, Testing & Debugging

The provided material for this domain covers the debugging workflow: classify before you fix.

### When Things Go Wrong

Professional instinct: slow down and classify before touching anything. Four steps — **Type → Origin → Trace → Recover.**

| Code | Meaning | Whose fault |
|---|---|---|
| `429` | Rate limit | Your account sent too many requests |
| `529` | Overloaded | The service is busy — nothing to do with you |
| `400` | Bad request | Your request itself was malformed |

**Origin** — is the problem the **integration layer** (your code, the network, a bad API call) or **model output** (what Claude actually produced, e.g. JSON with a missing field)?

> **🎯 Exam rule:** Always ask: is this my plumbing, or is this the answer? Fixing the wrong layer wastes hours.

**Trace** the record — Request → Tool call → Tool result → Response — to find the exact step where it broke. That step is the **failure mode**: naming it points at the fix.

| Recovery | When |
|---|---|
| **Retry** | `529` → exponential backoff (temporary, not your fault). `429` → wait exactly the retry-after time. |
| **Fix the request** | `400` or a bad schema — retrying won't help. You fix the request itself. |

### Quick recall — Domain 4
- Classify first: Type → Origin → Trace → Recover — never guess-and-change.
- Integration layer (your code) vs Model output (Claude's answer) — isolate which.
- Match the recovery to the diagnosis: retry temporary faults, fix malformed requests.

---

## 5. Model Selection & Optimization

How LLMs actually generate text, the thinking-mode dial, picking a tier, and controlling the bill.

### How LLMs Actually Work

- **Tokens** are chunks, not words (~1 token ≈ 4 characters of English) — you pay and measure in tokens.
- **Context window** = everything the model can see in one request — fixed and finite, the "desk."
- **Next-token generation** — predicts one token at a time, feeding each choice back in; there's no plan written in advance.
- **Sampling / temperature** — picks from a ranked list of candidates. Low temperature → almost always the top candidate (predictable); high → more variety (creative).

> **🎯 Exam rule:** Non-determinism is **normal, not a bug** — the same prompt can give slightly different answers each time because of sampling. This is why testing a Claude app differs from testing ordinary code.

### Thinking Modes & Prompting Basics

| Mode | What happens | Use when |
|---|---|---|
| **Fast mode** | No extra reasoning, respond straight through | Default — most everyday tasks |
| **Extended thinking** | Reasons in a scratchpad before answering | Tricky maths, multi-step logic, planning |
| **Adaptive thinking** | Model decides depth itself; you steer with an **effort level** (low → medium → high → xhigh → max) | Replaced the older manual thinking-token budget |

> **🎯 Exam rule:** The exam names **both** the old manual thinking-budget and the newer effort-level system — know that one replaced the other.

**Zero-shot** (no examples — try first) → **Single-shot** (one example) → **Multi-shot** (several — more consistent, more tokens). Use the fewest examples that get the job done.

### The Engineering Underneath

An SDK wraps the REST API — one clean function call instead of raw HTTP — and handles auth, retries with backoff, error parsing, and streaming for you. It's still REST underneath; if the SDK can't do something, drop to raw REST.

> **🎯 Exam rule:** REST = letters (ask, get a reply, connection closes) fits **almost everything**. Reach for a **websocket** (a continuous open line, like a phone call) only for genuinely real-time, two-way work.

### Choosing Your Model — Opus, Sonnet, Haiku

| Tier | Profile | Deep thinking? |
|---|---|---|
| **Haiku** | Fastest & cheapest — high volume, tagging, routing, classification | No |
| **Sonnet** | Balanced default — strong at most tasks, moderate price | Yes |
| **Opus** | Most capable — genuinely hard problems, slower, pricier | Yes |

> **🎯 Exam rule:** This is a **capability** difference, not just price — if a task needs careful multi-step reasoning, Haiku isn't the pick no matter how cheap. Default rule: **start with Sonnet**, drop to Haiku only for high-volume simple work, escalate to Opus only when Sonnet genuinely struggles.

Trade-off triangle: quality, latency, cost — no "best" model, only best fit. When a new model ships, **re-evaluate** — a task that needed Opus may now run on Sonnet, and tokenizing itself can change. This is exactly why you pin your model version (Domain 2).

### Managing Tokens and Cost

You pay per token, input **and** output — output usually costs more per token. Every response reports `input_tokens` / `output_tokens` usage — track it, don't guess. Model your cost before you scale: `tokens/request × requests/day × price = monthly cost`.

Cost-optimization order:
1. **Cache** — reuse repeated context, biggest single lever.
2. **Batch** — group non-urgent work, ~50% off.
3. **Shorten prompts** — trim what you send.
4. **Downgrade model** — only as a last resort.

> **🎯 Exam rule:** The cost-optimization order is a named sequence on the exam — cut waste before you cut intelligence. Downgrading the model comes **last**, not first. `Cache checkpointing` marks points in a growing prompt so earlier stable parts stay cached as the conversation extends.

### Quick recall — Domain 5
- 1 token ≈ 4 characters; non-determinism is expected behavior, not a bug.
- Fast (default) → Extended thinking (hard tasks) → Adaptive thinking (effort low→max, replaced manual budget).
- SDK wraps REST; use websockets only for genuine real-time two-way work.
- Haiku (no deep thinking) / Sonnet (default) / Opus (hardest) — capability gap, not just price.
- Re-test and re-pin on every new model release.
- Cost order: Cache → Batch → Shorten prompts → Downgrade model (last resort).

---

## 6. Prompt & Context Engineering

From wording one instruction well, to curating everything the model sees, to making the output something your code can trust.

### Writing a Good Prompt

Parts of a prompt: **instruction** (what you want done), **context** (background needed), **examples** (the pattern), **format** (how to shape the answer) — not every prompt needs all four, but knowing the pieces helps you spot what's missing.

Be specific: task + length + audience + tone beats a vague ask. Give the model a **role** via the system prompt — standing behavior across the whole conversation, separate from each question. Ask explicitly for the output shape you want.

### Examples, Templates, Refinement

Examples teach the pattern faster than description — use the fewest that work. A **prompt template** is written once with blanks filled per request: consistency, and one place to improve everything at once (and the thing you version — Domain 2).

**Iterative refinement**: write → run → check output → adjust → repeat. Treat prompting like tuning, not a one-shot guess.

### Context Engineering — Feeding the Model Right

> **🎯 Exam rule:** Prompt engineering is about a **sentence**. Context engineering is about the **whole pipeline** — deciding everything the model sees on a call: system prompt, retrieved documents, conversation history, tool definitions, stored memory. As apps grow into agents, this becomes the more important skill.

**Context rot** — counter-intuitively, as tokens grow, recall of any single fact goes **down**, and it starts degrading *before* the size limit. Stuffing everything in makes answers worse, not better.

The **attention budget** is a finite resource every token spends a little of — the goal is the smallest set of high-value tokens, not the biggest pile. Put key instructions up front; label documents clearly.

- **RAG** — Retrieval-Augmented Generation: search first, pull only the relevant chunks into the prompt — the direct answer to context rot.
- **Just-in-time context** — keep lightweight references (file paths, stored queries, links); load actual content only at the moment it's used. Claude Code works this way — Anthropic's recommendation for long-running agents.

### Making Output Reliable

**Structured outputs** (JSON) give your code a predictable shape to parse — vs. free text your code has to guess at. Always **validate** the response (right fields, right types, all present) before acting — the model is non-deterministic, so you validate rather than assume.

Plan for both a **refusal** ("I can't help with that") and an **error** (429/529) — catch it, show a helpful message, retry if it makes sense, or fall back to a safe default.

> **🎯 Exam rule:** Consistency techniques — none makes output perfectly identical, but together they push toward reliable: lower temperature, strict schema, add examples, one clear format.

### Quick recall — Domain 6
- Prompt engineering = one sentence; Context engineering = the whole pipeline.
- Context rot starts before the hard limit — smallest high-value set beats the biggest pile.
- RAG fetches only relevant chunks; just-in-time context loads late and keeps references light.
- Always validate structured output before acting; plan for refusals and errors separately.
- Consistency levers: lower temperature, strict schema, examples, clear format.

---

## 7. Security & Safety

Two different problems that get conflated on the exam: attackers coming in (security) vs Claude's own behavior going out (safety).

### Securing Your Claude App

An AI app can read files, run commands, and call tools — those powers make it useful, and a target.

> **🎯 Exam rule:** **Prompt injection is the #1 AI security threat** — hidden instructions buried in content Claude reads, no code exploit, just malicious text Claude may follow as if legitimate.

| | Direct (jailbreak) | Indirect |
|---|---|---|
| Adversary | The user themself | The fetched content (web page, email, tool result) |
| Trust | User untrusted | User trusted — content is the danger |

> **⚠️ Caution:** Indirect is sneakier — the danger arrives inside content you trusted enough to fetch in the first place.

Main defense: the **trust boundary** — your system prompt and rules are trusted; uploads, web pages, and tool results are untrusted data to work *on*, never orders to follow. Label untrusted content clearly.

**PII protection**: **minimize** (send only what the task needs), **mask** (redact sensitive fields), **control access** (limit who/what can reach it). A leaked API key or `.env` file is a top real-world risk.

### Keeping Claude Safe

> **🎯 Exam rule:** **Security** defends against bad actors coming in. **Safety** keeps Claude's own behavior appropriate going out — and matters even with no attacker present. Claude is safety-trained by default; guardrails add on top.

**Guardrails**: an input screen (a cheap model like Haiku pre-checks risky input) and output filtering/moderation (checks the response before it's shown).

**Defense in depth** — no single layer is perfect, so stack them, from advisory to hard enforcement:
1. **CLAUDE.md** — guides behavior, advisory, no enforcement.
2. **Permissions** — blocks tool patterns (bash can still slip past).
3. **Hooks** — inspect and hard-block an action.
4. **Sandbox** — the OS-level boundary that contains what runs.

> **⚠️ Exam caution:** **Human-in-the-loop** — for high-risk actions, a person approves before it runs (the permission prompt). `--dangerously-skip-permissions` removes that safety net entirely.

### Quick recall — Domain 7
- Prompt injection = #1 threat; direct = user is the adversary, indirect = trusted content is.
- Trust boundary: instructions trusted, outside content never trusted with orders.
- PII: minimize, mask, control access.
- Security (attackers in) ≠ Safety (Claude's behavior out) — separate concepts.
- Defense in depth, soft to hard: CLAUDE.md → Permissions → Hooks → Sandbox; human approves the riskiest actions.

---

## 8. Tools & MCP

Formalizing the request-execute gap from Domain 1, then the shared protocol that makes tool connections reusable.

### How Tool Use Works

A tool lets Claude request an action instead of just producing text. A **tool definition** has three parts: `name`, `description` (tells Claude *when* to use it — and when not to), `input_schema` (JSON schema of required parameters).

Loop: Claude requests → your code runs it → result returns → Claude answers. Claude never runs the tool itself.

> **🎯 Exam rule:** **Parallel tool use** fires when calls are independent (none needs another's result) — results return together, faster than one at a time. If tool B needs tool A's result, they run in sequence instead.

**Built-in tools** (web search, code execution) ship ready to switch on; **custom tools** are functions you define — same loop either way.

### MCP — One Way to Connect Everything

> **🎯 Exam rule:** Before MCP: **M apps × N tools = M×N** custom integrations, each with its own auth and data handling. MCP is an open standard (Anthropic, late 2024) — "USB-C for AI tools" — build a connector once, any MCP-compatible app can use it: **M×N becomes M+N.**

| Role | What it is |
|---|---|
| **Host** | The user-facing AI app — Claude Desktop, Claude Code, Cursor |
| **Client** | Lives inside the host, one client per server — the wire |
| **Server** | Independent program exposing tools & data to the host — the capability |

A connection: client connects to server → server declares what it offers (**capability discovery**) → host can now use those capabilities. Any host understands any server automatically.

> **🔗 Connects to:** MCP doesn't replace the Domain 1/Lecture 1 tool-use loop — it standardizes how connections happen, adding **discovery**, **transport**, and **session** layers on top of the same request → run → return mechanics.

### Building and Using MCP Servers

| You need to… | Use a… | Example |
|---|---|---|
| Read data | **Resource** | Read a file, fetch a record |
| Do something | **Tool** | Run a query, send an email |
| Reuse a workflow | **Prompt** | A pre-built task template |

> **🎯 Exam rule:** Rule of thumb: **resources query, tools act, prompts standardize.**

**Transports**: `stdio` — local, same machine, the default for Claude Desktop & Code. **Streamable HTTP** — remote, over HTTPS, for shared hosted connectors. Same message format underneath either way.

> **⚠️ Caution:** A tool description is text Claude reads — only connect MCP servers you trust (ties directly back to Domain 7's trust boundary).

### Quick recall — Domain 8
- Tool definition = name + description (when) + input_schema (what).
- Parallel tool calls only when independent; dependent calls run in sequence.
- MCP turns M×N integrations into M+N via one shared standard.
- Host (app) → Client (wire, in host) → Server (capability) — connect, discover, use.
- Resources query, Tools act, Prompts standardize.
- stdio = local/default; Streamable HTTP = remote/hosted.
- Only connect MCP servers you trust — a tool description is untrusted text otherwise.

---

## How the eight domains connect

The decks cross-reference constantly. These are the load-bearing links worth holding in mind walking into the exam.

| Link | What connects |
|---|---|
| 1 → 5 | The context window "whiteboard" (D1) is the same fixed-size, token-measured context window explained mechanically in D5. |
| 1 → 8 | The agent loop's "request-execute gap" (D1) is formalized as the tool-use loop (D8, Lecture 1) and then standardized for reuse by MCP (D8, Lecture 2). |
| 1 → 7 | Hooks as deterministic enforcement (D1) reappear as the hard-block layer in the D7 defense-in-depth ladder, above advisory CLAUDE.md and permeable permissions. |
| 2 → 7 | The content boundary (D2, trusted vs untrusted) IS the anti-prompt-injection defense (D7) — same concept, security framing. |
| 2 → 3 | CLAUDE.md and settings.json are introduced conceptually in D2's Configuration Management, then operated hands-on in D3. |
| 2 → 5 | Prompt caching is introduced in D2's API mechanics and becomes the #1 cost-optimization lever in D5. |
| 4 → 5 | The 429/529 error codes debugged in D4 are exactly what an SDK's built-in retry-with-backoff (D5) exists to absorb automatically. |
| 5 → 6 | Zero/single/multi-shot prompting (D5) is the theory; D6's "Examples Teach the Pattern" is the applied version. |
| 6 → 1 | Context rot and the attention budget (D6) are the mechanism behind D1's bloat/drift problem — same failure, explained at two levels. |
| 6 → 2 | Structured outputs (D6) are schemas (D2) applied — the shape your code parses, not just the shape a human reads. |
| 7 → 2/3 | "CLAUDE.md guides, doesn't enforce" is stated in D2, operated in D3, and cashed in as a security fact in D7's enforcement ladder. |

---

*Study guide compiled from: Domain 1 (Agents & Workflows), Domain 2 (Applications & Integration), Domain 3 (Claude Code), Domain 4 (Eval, Testing & Debugging), Domain 5 (Model Selection & Optimization), Domain 6 (Prompt & Context Engineering), Domain 7 (Security & Safety), Domain 8 (Tools & MCP). All content sourced from the provided course decks.*
