# Agentic Design Patterns, RAG at Scale & Enterprise AI Architecture
## Interview Deep-Dive: Expert-Level Questions & Answers

> This file covers the four core expertise areas of your JPMC interviewer:
> 1. **Agentic Design Patterns** — multi-agent orchestration, autonomous reasoning
> 2. **Advanced RAG & Data Integration** — retrieval quality, ranking, knowledge synthesis  
> 3. **Enterprise AI Architecture** — scale, reliability, compliance, governance
> 4. **Governance & Observability** — monitoring, tracing, audit, performance

All answers are grounded in **Aagam Mitra's production implementation** and include detailed narrative context suitable for explaining to a VP-level interviewer.

---

# PART 1: AGENTIC DESIGN PATTERNS
## Multi-Agent Systems & Autonomous Orchestration

### Question 1: What are the core agentic design patterns, and how does Aagam Mitra implement them?

> **Why asked:** This is THE fundamental question for someone interviewing with an agent-systems expert. They want to hear: Do you know the taxonomy of patterns? Can you map them to real code? Can you explain when each pattern is appropriate? The interviewer likely uses these patterns in JPMC DART, and they want to see if you think the same way.

#### The Agentic Design Pattern Taxonomy

An **agentic pattern** is a reusable architectural approach to organizing AI agents—how they communicate, make decisions, coordinate, and execute tasks. Understanding the taxonomy helps you choose the right pattern for your problem and avoid pitfalls.

**The five core patterns:**

**1. Router / Orchestrator Pattern**

This is the simplest and most common pattern. A router agent reads the user's query, determines which specialist agent(s) should handle it, and routes accordingly. If multiple specialists are needed, the router may run them sequentially or in parallel and then synthesize results.

*Mental model:*
```
User Query
    ↓
Router (Intent Detection)
    ↓ (decides: "This is a SCRIPTURE question")
Specialist Agent (ScriptureAgent)
    ↓
Answer
```

**When to use:** Single-domain queries, or queries that map cleanly to one specialist. Most straightforward to build and debug.

**Aagam Mitra's implementation:** Our `OrchestratorAgent` in `orchestrator.py` uses keyword-based intent detection (regex patterns compiled at module load) to route user messages. If the query maps to one agent (e.g., user asks "What is Karma?"), the orchestrator calls `ScriptureAgent.run()` directly. If it maps to multiple agents (e.g., "Book Shantidhara and tell me its significance"), the orchestrator runs both `TempleOpsAgent` and `ScriptureAgent` in parallel using `asyncio.gather()`, then calls `_synthesise()` to combine their responses into one coherent answer.

The key insight: We don't use an LLM to decide routing—we use regex patterns. This makes routing fast (~1ms), deterministic, and testable. The tradeoff is that complex or ambiguous queries may not route correctly.

---

**2. Hierarchical / Hierarchical Routing Pattern**

In hierarchical routing, agents are organized in tiers: a high-level "supervisor" agent breaks down complex tasks into subtasks, delegates to mid-level specialist agents, which may in turn delegate to worker agents. This allows decomposition of very complex problems.

*Mental model:*
```
User Query
    ↓
Supervisor Agent
    ├─ Subtask 1 → Specialist A → Worker Agent 1
    ├─ Subtask 2 → Specialist B → Worker Agent 2
    └─ Subtask 3 → Specialist A → Worker Agent 3
    ↓
Synthesize Results
    ↓
Answer
```

**When to use:** Multi-step, complex workflows where you need reasoning at multiple levels. Example: "Plan my temple visit for next month" might require the supervisor to decompose into: (1) check events, (2) check bookings, (3) get travel info, (4) synthesize a plan.

**Aagam Mitra's current state:** We don't currently use hierarchical routing—our queries are typically single-domain or two-domain. But this pattern is relevant if we wanted to handle complex multi-step planning queries. We could implement a "PlannerAgent" that breaks down a long-term request into steps, delegates to specialist agents, and synthesizes the plan.

---

**3. Tool-Using Agent Pattern**

A tool-using agent is one that has access to a set of functions (tools) it can call to take actions in the world. The agent loops: reads the current state, decides which tool(s) to call, executes them, observes the results, and decides whether to continue or stop.

*Mental model:*
```
User: "Book Shantidhara for January 15"
    ↓
Agent Thinks: "I need to check availability and then book"
    ↓
Call Tool: get_shantidhara_slots(date="2026-01-15")
    ↓
Observe Results: "2 slots available"
    ↓
Agent Thinks: "I should ask which slot the user prefers"
    ↓ (or if user was clear in query)
Call Tool: book_shantidhara_slot(date="2026-01-15", slot_id="slot_123")
    ↓
Observe Results: "Booking confirmed, ID: BKG_xyz"
    ↓
Agent Thinks: "Task complete, return answer"
    ↓
Answer
```

**When to use:** When an agent needs to take actions in the real world (query databases, call APIs, perform transactions). Most agentic systems include this pattern.

**Aagam Mitra's implementation:** Every specialist agent inherits from `BaseAgent` and implements a tool-calling loop in the `run()` method. The loop:
1. Calls Groq with the user message + conversation history + tool definitions
2. Checks if Groq returns `finish_reason="tool_calls"` (wants to call tools) or `"stop"` (has the answer)
3. If tool calls, executes them in parallel with `asyncio.gather()` and appends results to the message history
4. Loops again (up to `max_iterations` times: 4-5 depending on agent) until Groq says `"stop"`

The `TempleOpsAgent` has 7 tools (get_slots, book_slot, cancel, get_membership, submit_membership, get_temple_info). The `ScriptureAgent` has 1 tool (search_jain_texts). This allows agents to take concrete actions.

---

**4. Reflection Agent Pattern**

A reflection agent is one that can introspect on its own outputs and iteratively improve them. After generating an answer, the agent can ask itself: "Is this answer correct? Is it complete? Did I miss something?" and then refine.

*Mental model:*
```
User Query
    ↓
Agent Generates Initial Answer
    ↓
Agent Self-Critiques: "Is this right? Accurate? Complete?"
    ↓ (if flaws detected)
Agent Refines Answer
    ↓ (repeat until satisfied)
Final Answer
```

**When to use:** When answer quality is critical and you want to avoid hallucinations. Reflection adds latency (multiple LLM calls) but can significantly improve output quality, especially for reasoning tasks.

**Aagam Mitra's implementation:** We don't currently have explicit reflection loops, but we could add them. For the `ScriptureAgent`, we could add a reflection step like: after synthesizing the answer from retrieved texts, the agent could ask itself: "Does this answer directly address the user's question? Is it grounded in the texts? Any contradictions?" and then refine if needed.

One implicit form of reflection happens via the tool-calling loop: if the agent calls a search tool and the results seem insufficient, it can decide to call the tool again with a different query. This is a lightweight form of self-refinement.

---

**5. Autonomous / Multi-Turn Agent Pattern**

An autonomous agent runs without human intervention, maintaining state across multiple interactions. It has a goal, can plan multi-step strategies, execute them, observe results, adjust its plan, and continue until the goal is reached or it determines it's blocked.

*Mental model:*
```
Goal: "Increase membership sign-ups by 20%"
    ↓
Agent Plans: "I'll analyze current sign-ups, identify barriers, propose solutions"
    ↓
Agent Acts: Calls tools to gather data, test hypotheses
    ↓ (iteratively)
Agent Observes & Adjusts Plan
    ↓
Agent Reports Results
```

**When to use:** Long-running tasks, optimization loops, complex problem-solving. Less common in conversational AI; more common in robotic process automation (RPA) or data pipelines.

**Aagam Mitra's implementation:** Our system is currently conversational, not autonomous. Each agent processes one user query and returns an answer. However, the structure is extensible: we could add autonomous agents for tasks like "clean up old bookings" or "generate weekly temple analytics" by extending `BaseAgent` and having it run without waiting for a user message.

---

#### Summary: Which Patterns Does Aagam Mitra Use?

| Pattern | Used? | Where | Benefit |
|---------|-------|-------|---------|
| **Router/Orchestrator** | ✅ Yes | `OrchestratorAgent` with intent detection | Fast routing, multi-agent coordination |
| **Hierarchical** | ❌ Not yet | Could be added for complex planning | Handles multi-step decomposition |
| **Tool-Using** | ✅ Yes | `BaseAgent` loop with tool calling | Real-time actions, concrete results |
| **Reflection** | ⚠️ Partial | Implicit via retries; not explicit | Could improve answer quality |
| **Autonomous** | ❌ Not yet | Could be added for background tasks | Enables long-running workflows |

The key design decision: We prioritized **clarity and simplicity** over advanced patterns. A router + tool-using agents covers ~90% of temple assistant use cases. If we needed multi-step planning or long-running workflows, we'd add hierarchical or autonomous patterns.

---

### Question 2: How does Aagam Mitra's orchestrator decide when to run multiple agents in parallel vs. sequentially?

> **Why asked:** This reveals your understanding of: (1) how to coordinate multiple agents, (2) tradeoffs between latency and coherence, (3) when parallelism actually helps vs. adds complexity. JPMC DART likely has similar orchestration challenges—this question tests if you think about those tradeoffs.

#### Current Behavior: Parallel Execution

In `OrchestratorAgent.run()`, when multiple intents are detected (e.g., user asks "Book Shantidhara and tell me its significance"), the orchestrator runs all matched agents **in parallel**:

```python
tasks = [
    _AGENTS[intent].run(user_message, history, context)
    for intent in intents  # e.g., ["temple_ops", "scripture"]
]
results: list[AgentResult] = await asyncio.gather(*tasks)  # Run all simultaneously
```

Both `TempleOpsAgent` and `ScriptureAgent` execute concurrently. If each takes ~1.5 seconds individually, running them sequentially would take ~3 seconds total. Running in parallel reduces the latency to ~1.5 seconds (the slowest agent).

**Why parallel?** User experience: The user expects a fast response. If they ask a two-intent query at 4 PM on a Tuesday, they don't want to wait for one agent to finish before the other starts.

**Tradeoff:** Parallel execution uses more resources (two concurrent Groq API calls, two sets of tool calls). If we had rate-limiting or cost constraints, we might need to switch to sequential.

#### When Sequential Makes Sense

There are scenarios where sequential execution is better:

**1. Dependencies between agents**
If Agent B's inputs depend on Agent A's outputs, you must run A → B sequentially.

*Example:* "Check if there are events next month, and if so, show me how to attend them."
- Agent A (CommunityAgent) must first check events
- Agent B (TempleOpsAgent) uses A's output to provide booking info
- Must be sequential: A → B

Aagam Mitra's current intent routing doesn't detect this kind of dependency. If we wanted to support it, we'd need to either:
- Add a dependency-detection step in the orchestrator (complex)
- Have the router agent explicitly decide on the order (adds latency, requires an LLM call)

**2. Cost optimization**
If parallel execution triggers rate limits or becomes expensive, sequential is cheaper and safer.

*Example:* At scale, running 4 agents in parallel for every query could exceed API rate limits or cost. Sequential execution would reduce peak concurrency.

**3. Coherence concerns**
In rare cases, running agents in parallel might produce conflicting or redundant outputs that are hard to synthesize.

*Example:* If both ScriptureAgent and TempleOpsAgent try to answer a query about "significance of Shantidhara," their responses might overlap. Sequential execution with a "stop if already answered" logic could avoid redundancy.

#### What We Should Consider for JPMC

At JPMC scale, you'd likely implement:

1. **Configurable concurrency:** Some queries are parallel, some are sequential, based on detected dependencies or cost constraints.
2. **Smart orchestration:** A supervisor agent that decides order and concurrency based on query structure.
3. **Rate limiting & backpressure:** If downstream services are overloaded, fall back to sequential execution.
4. **Monitoring:** Track latency, cost, and quality for parallel vs. sequential decisions and use data to optimize.

---

### Question 2b: Aagam Mitra's LangGraph Migration Story: When We'd Switch

> **Why asked:** This is the critical narrative question. Interviewers don't just want "why custom now?" They want "when would we migrate?" This shows you think about technical evolution, not dismissing frameworks. It also proves you understand LangGraph's actual value.

#### Current State: Why Custom Works Today

Aagam Mitra's agent loop is **~40 lines of Python**. Simple and sufficient:
- Intent detection via regex patterns (fast, deterministic)
- Sequential or parallel agent routing (explicit with `asyncio.gather()`)
- Basic tool-calling loop (no complex state management)
- No conditional branching (no "if confidence < 0.5, try different strategy")

**Cost of adding LangGraph:** Abstractions (planners, graph nodes, state machines) we don't need yet. It's overkill for our current domain.

**This mindset is correct:** Choose the simplest tool that solves your problem.

---

#### Trigger #1: Multi-Step Reasoning with Conditional Branching

**Scenario:** User asks "Plan my temple visit for next month."

Agent needs:
1. Check events for next month
2. **IF** no suitable events → suggest alternatives
3. **IF** events found → check user calendar
4. **IF** conflicts → propose different dates
5. **IF** no conflicts → book + create itinerary

This is **conditional logic**, not just sequential tools.

**Custom approach breaks:**
```python
# Current—doesn't handle branching:
if "planning" in intents:
    events = await community_agent.run("What events next month?")
    # Now what? No way to conditionally route to booking_agent based on events
```

**LangGraph shines here:**
```python
# LangGraph—native conditional logic:
def should_suggest_alternatives(state):
    return len(state.events) == 0  # Branch point

events_node → (check if empty) → suggest_alternatives_node
                              → book_if_available_node
```

**Migration trigger:** When we need conditional branching, adopt LangGraph.

---

#### Trigger #2: Streaming Responses to UI

**Scenario:** User on slow connection waits for agent (2-3 seconds). What if we streamed intermediate steps?

```
User: "Book Shantidhara and explain significance"

[Real-time streaming]
→ "Checking availability..." (instantly)
→ "Found 3 slots" (100ms)
→ "Searching scripture..." (200ms)
→ "Retrieved 8 passages" (400ms)
→ "Synthesizing answer..." (600ms)
→ "Complete: [full response]" (1200ms)
```

**Custom approach:** No native streaming. We'd manually emit WebSocket events from each step — boilerplate-heavy.

**LangGraph shines:** Streaming is first-class. Graph automatically emits events at each node transition.

**Migration trigger:** When we need real-time streaming to UI, adopt LangGraph.

---

#### Trigger #3: Human-in-the-Loop Approval

**Scenario:** User donates ₹100,000. Temple policy: donations > ₹50,000 require admin approval.

Agent needs:
1. Validate donation amount
2. If > ₹50,000 → pause and ask: "Requires approval. Continue?"
3. Wait for human response
4. If approved → execute donation
5. If rejected → cancel

**Custom approach breaks:** No pause mechanism. We'd build custom state management — complex and error-prone.

**LangGraph shines:** Nodes can pause and wait for human input before proceeding.

```python
# LangGraph:
def validation_node(state):
    if state.amount > 50000:
        return {"needs_approval": True, "paused": True}  # Pause execution

donation_node → validation_node → (pause: wait for human) → execute_node
```

**Migration trigger:** When we need mid-execution human approval, adopt LangGraph.

---

#### Trigger #4: Agent Hierarchies (Agents Calling Agents)

**Scenario:** As we scale, single agents can't handle all temple operations. We need sub-agents:

- **Finance Agent**
  - Sub-agent: Transaction validation
  - Sub-agent: Fraud detection
  - Sub-agent: Reconciliation
  
- **Community Agent**
  - Sub-agent: Content moderation
  - Sub-agent: Sentiment analysis

Agents need to call other agents and wait for results.

**Custom approach breaks:** We'd manually orchestrate agent-to-agent calls. State flows become messy (does A wait for B? What if C fails?).

**LangGraph shines:** State graphs naturally express agent hierarchies.

```python
# LangGraph:
main_orchestrator_node
  ├─ finance_agent_node
  │   ├─ transaction_validation_sub_agent
  │   ├─ fraud_detection_sub_agent
  │   └─ reconciliation_sub_agent
  ├─ community_agent_node
  └─ synthesis_node (combines results)
```

**Migration trigger:** When we need agent-calling-agent hierarchies, adopt LangGraph.

---

#### Trigger #5: Complex State Audit & Session Persistence

**Scenario:** For JPMC compliance, we need:
1. Track every decision and what led to it
2. Persist state across crashes (user starts query → system crashes → user resumes)
3. Replay entire reasoning trace for regulatory audits

**Custom approach:** We'd build custom serialization, versioning, and replay logic — lots of boilerplate.

**LangGraph shines:** State is explicit. Graph execution is fully trackable and replayable.

```python
# LangGraph:
state = {
    "user_id": "usr_123",
    "query": "Book Shantidhara...",
    "nodes_visited": ["routing", "booking_check", "approval", "execution"],
    "reasoning_trace": [...],
    "final_answer": "..."
}

# After each node:
db.save(state, trace_id="trace_xyz789")

# If crash:
state = db.load("trace_xyz789")  # Resume from exact point
```

**Migration trigger:** When we need complex audit trails and session persistence, adopt LangGraph.

---

#### The Migration Matrix

| Requirement | Custom OK? | LangGraph Value |
|---|---|---|
| Simple sequential agents | ✅ Yes | ❌ Overkill |
| Conditional branching | ❌ No | ✅ Native |
| Streaming to UI | ❌ No | ✅ First-class |
| Human-in-the-loop pausing | ❌ No | ✅ Native pause/resume |
| Agent hierarchies | ❌ No | ✅ Graph structure |
| Complex audit & replay | ❌ No | ✅ Built-in |

**Aagam Mitra today:** All "Yes" ✅ → Custom is correct choice
**Aagam Mitra at JPMC scale:** Multiple "No" ❌ → LangGraph is necessary

---

#### The Interview Narrative

**Strong answer:**
> "We use a custom 40-line agent loop because it's optimal for our current domain — simple routing, sequential/parallel execution, no branching. But I'm very aware of LangGraph. If we added multi-step reasoning with conditional logic, or human-in-the-loop approvals for high-value transactions, or agent-calling-agent hierarchies, or complex compliance audit requirements — we'd immediately migrate to LangGraph. The decision isn't 'LangGraph is bad,' it's 'LangGraph is overkill for our current complexity.' We'd re-evaluate this at each scale inflection."

**Why it works:**
- Shows you evaluated critically (not defaulting to custom)
- Demonstrates deep LangGraph knowledge (specific use cases)
- Indicates architectural thinking (evolution, not just current state)
- Suggests sound tool selection judgment at different scales

---

### Question 3: How do you handle agent failures, hallucinations, and timeout edge cases?

> **Why asked:** This is a reliability question. Interviewers ask this because in production, things WILL fail. An LLM will hallucinate. A tool call will timeout. A dependency service will be down. Knowing how you handle these cases separates prototype code from production code. This is especially important at JPMC, where financial decisions depend on reliability.

#### 1. Agent Loop Failures (Tool Calls Timing Out or Returning Errors)

**The problem:** An agent calls a tool (e.g., `get_shantidhara_slots`), but the HTTP request times out or returns a 500 error.

**Aagam Mitra's handling:**

In `tool_dispatch()` within `BaseAgent`, each tool call is wrapped with retry logic:

```python
async def _get_json(url: str) -> dict:
    for attempt in range(settings.upstream_retry_attempts):  # 4 attempts
        try:
            response = await client.get(url, timeout=45.0)
            if response.status_code < 500:
                return response.json()  # Success or client error
            # 5xx → retry (server error, may recover)
        except httpx.HTTPError:
            pass  # Network error, retry
        
        if attempt < settings.upstream_retry_attempts - 1:
            await asyncio.sleep(_retry_delay(attempt + 1))
            # Delay: 2s → 3s → 4s → 8s (capped)
    
    raise last_exception  # After 4 attempts, fail
```

If a tool fails after retries, the agent's message history includes the error. The LLM sees the error and can:
- Ask the user to retry (e.g., "The booking system is temporarily unavailable")
- Suggest an alternative (e.g., "Let me check the phone number to call")
- Acknowledge and gracefully degrade

**Example:** User asks "Book Shantidhara." `get_shantidhara_slots` fails 4 times. The error is appended to messages. Groq sees: `{"role": "tool", "tool_call_id": "call_123", "content": "Error: Service unavailable after 4 retries"}`. Groq responds: "I'm unable to check availability right now. Please try again in a few minutes or call the temple directly."

**Tradeoff:** Retries add latency (worst case: 2+3+4 = 9 seconds of waiting). For some queries, this is acceptable; for others, immediate failure is better. We could make retry logic configurable per-tool.

---

#### 2. Max Iterations Exceeded (Agent Loop Not Terminating)

**The problem:** An agent keeps calling tools but never decides to stop. This could happen if:
- The LLM keeps requesting the same tool (circular reasoning)
- Each tool call reveals new questions (infinite curiosity)
- A bug in the tool causes the LLM to keep retrying

**Aagam Mitra's handling:**

Each agent has a `max_iterations` limit (4-5 depending on agent type). The loop is:

```python
for iteration in range(self.max_iterations):
    response = await self._call_groq(messages, tools)
    
    if response.finish_reason == "stop":
        return AgentResult(response=response.content)
    
    elif response.finish_reason == "tool_calls":
        # Execute tools, append results
        # Loop continues
    
    # If we reach max_iterations without "stop", we fall through and return
    # (implicit: return the last message as-is)
```

If the loop reaches `max_iterations` without getting a `"stop"` response, the agent returns the last message from the LLM (which might be incomplete). This prevents infinite loops but risks incomplete answers.

**Example:** User asks "What is Karma?" ScriptureAgent loops 4 times:
- Iteration 1: Calls `search_jain_texts("Karma")` → gets passages
- Iteration 2: Calls `search_jain_texts("Karma philosophy")` → gets more passages
- Iteration 3: Calls `search_jain_texts("Karma in Jainism")` → gets even more
- Iteration 4: Groq still wants to search (not satisfied)
- Loop ends (max_iterations reached)
- Agent returns: "Karma is the law of cause and effect..." (partial response)

**Tradeoff:** We cap the loop to protect against runaway agents, but at the risk of incomplete answers. A better approach: Groq's `finish_reason` should eventually be `"stop"` if the prompt is well-designed. If it keeps requesting tools, it suggests the prompt or tools need refinement.

---

#### 3. LLM Hallucinations (Fake Data in Responses)

**The problem:** The LLM generates plausible-sounding but false information. Example: User asks "When is Mahavir Jayanti?" Groq responds: "Mahavir Jayanti is on April 32nd." (There is no April 32nd.)

**Aagam Mitra's handling:**

We mitigate hallucinations through:

1. **Tool grounding:** We push the LLM to call tools for factual queries. The system prompt for `TempleOpsAgent` says: "Use the get_temple_info tool to retrieve accurate information." By forcing tool calls, we ground answers in real data.

2. **Temperature tuning:** Lower temperature = more factual, less creative.
   - ScriptureAgent: temp=0.5 (moderate creativity needed to synthesize texts)
   - YouTubeAgent: temp=0.2 (stay close to transcript, minimal creativity)
   - TempleOpsAgent: temp=0.5 (factual, but some reasoning flexibility)

3. **Prompt constraints:** System prompts include guardrails. Example, ScriptureAgent:
   ```
   "Always cite the specific sacred text or passage when answering. 
    Do not invent scriptures or teachings that don't exist in Jain philosophy."
   ```

4. **Output validation:** We could add post-processing to detect hallucinations (e.g., fact-checking against a knowledge base), but we don't currently.

**What we DON'T do:** We don't use reflection loops or explicit hallucination-checking. This is a gap. At JPMC scale, you'd likely have:
- Semantic similarity checks (does the answer match the query intent?)
- External fact-checking (cross-check against a knowledge base)
- Confidence scoring (if confidence < threshold, escalate to human)

---

#### 4. Timeout Edge Cases (Slow LLM or Tool Responses)

**The problem:** Groq is slow today (overloaded). A tool call takes 30+ seconds. The user's HTTP request times out at 60 seconds.

**Aagam Mitra's handling:**

We set explicit timeouts:
- Groq API call: 60 second timeout
- Downstream HTTP calls (to admin, registration services): 45 second timeout
- Total request timeout (API Gateway to client): 120 seconds (Vercel default)

If Groq takes > 60s, the request fails with a timeout exception. The error handler catches it and logs the failure (audit log).

**What we could improve:**
- **Graceful degradation:** If Groq times out, return a cached answer or a simpler heuristic response
- **Circuit breaker:** If Groq is consistently slow, stop calling it and return a default message
- **Streaming:** Return partial results as they arrive (e.g., stream Groq's response as it generates it)

Currently, if Groq times out, the user gets an error. We don't stream or cache, so there's no fallback.

---

#### 5. RBAC & Security Violations

**The problem:** A user tries to do something they're not allowed to do (e.g., a devotee tries to publish an admin notification).

**Aagam Mitra's handling:**

In `agent.py`, before calling the orchestrator, we check:
1. Input guardrails (block injection attacks, malicious queries)
2. RBAC (role-based access control)

```python
try:
    check_input_guardrails(request.message, request.user_id)
except GuardrailViolation:
    return "I'm unable to process that request."

try:
    check_rbac(request.role, request.message, request.user_id)
except RBACViolation:
    return "You don't have permission to access that information."
```

If RBAC fails, we return a polite error message, not an exception. We log it for audit purposes.

**Example:** Admin tries to ask "Publish a fake notification to all members." The RBAC check detects the word "publish" + role="admin" (allowed), but the message is flagged as malicious by guardrails (fake notification). The request is blocked.

---

#### What JPMC Would Likely Add

At an enterprise scale (JPMC with billions of transactions), you'd add:

1. **Explainability & Tracing:** Every decision traced back to the data/logic that led to it. Required for regulatory compliance.
2. **Confidence Scoring:** Each answer includes a confidence level. Low confidence → escalate to human.
3. **A/B Testing:** Different agent configurations tested on real queries to measure quality.
4. **Human-in-the-Loop:** For high-stakes decisions, escalate to a human reviewer.
5. **Incident Response:** Automated detection of anomalies, automated rollback of bad agents/models.

---

### Question 4: How do you scale agent orchestration to handle 1000s of concurrent requests?

> **Why asked:** This is a scaling question. In production, you're not serving one user. You're serving thousands. At JPMC, you might serve millions of requests per day across multiple data centers. This question tests if you understand: (1) bottlenecks in agentic systems, (2) how to remove them, (3) tradeoffs between latency, cost, and complexity.

#### Current State: Small Scale

Aagam Mitra is deployed on a home Windows machine with a Cloudflare tunnel. It handles one temple community (~1K active users). On a busy day, maybe 50-100 concurrent requests.

The architecture is:
```
API Gateway (FastAPI, single-threaded asyncio event loop)
  ↓
OrchestratorAgent (sequential per-request processing)
  ↓
Specialist Agents (parallel, but limited to N agents)
  ↓
Groq API (rate-limited, shared across all requests)
```

At 1K concurrent requests, this would collapse:
- The event loop would be backlogged with 1K pending requests
- Groq API rate limit would be hit immediately
- Memory usage would explode (each request keeps chat history in memory)
- Latency would be unacceptable (100+ seconds per request)

---

#### How to Scale to 1000s of Concurrent Requests

**1. Horizontal scaling: Multiple API Gateway instances**

Deploy multiple FastAPI instances behind a load balancer (AWS ELB, Kubernetes Service, etc.):

```
Load Balancer (sticky sessions for conversation context)
  ├─ API Gateway 1 (handles ~100-200 concurrent requests)
  ├─ API Gateway 2 (handles ~100-200 concurrent requests)
  ├─ API Gateway 3 (handles ~100-200 concurrent requests)
  └─ ... (scale to 10+ instances as needed)
  ↓
Shared Redis (conversation cache, rate limiting state)
Shared Vector DB (Pinecone, shared across instances)
Groq API (backend service)
```

Each instance is independent, so you can add instances without coordination overhead. Sticky sessions ensure a user's conversation stays on the same instance (better performance due to local caching).

**2. Async & Non-blocking I/O**

Aagam Mitra already uses async (FastAPI + asyncio). This allows a single instance to handle hundreds of concurrent requests without threads (which would explode memory). Key: Ensure all I/O is non-blocking.

Currently:
- Groq API calls: ✅ Async (httpx.AsyncClient)
- Downstream service calls: ✅ Async (httpx.AsyncClient)
- Vector DB calls: ✅ Async (Pinecone SDK)
- Database calls: ⚠️ SQLAlchemy ORM is synchronous (not async yet)

To scale further, convert sync code to async. Example: Use SQLAlchemy async sessions or use an async ORM like Tortoise-ORM or Motor (for MongoDB).

**3. Request queuing & backpressure**

If traffic spikes beyond capacity, queue requests instead of rejecting them:

```
Load Balancer
  ↓
Request Queue (SQS, Kafka, RabbitMQ)
  ↓
Pool of Workers (API Gateway instances)
  ↓
  Response Queue
  ↓
Client
```

Workers process requests from the queue at their own pace. Clients wait longer, but the system doesn't crash. Tradeoff: Higher latency (requests wait in queue), but guaranteed processing.

For chat applications, this is acceptable—users expect responses in seconds, not milliseconds.

**4. Caching: Chat history & embeddings**

Every request includes chat history. Sending "last 8 turns" from disk/DB is slow. Solution: Cache in Redis.

```
Request comes in with user_id, temple_id
  ↓
Check Redis: GET "chat_history:{user_id}:{temple_id}"
  ↓ (if cached)
Use cached history (~1ms)
  ↓ (if not cached)
Fetch from DB (~10-50ms)
  ↓
Save to Redis with TTL (24 hours)
```

For embeddings, cache them too:
```
Embedding request: embed("What is Karma?")
  ↓
Check Redis: GET "embedding:{text_hash}"
  ↓ (if cached)
Use cached embedding (~1ms)
  ↓ (if not cached)
Call Gemini API (~100-200ms)
  ↓
Save to Redis
```

This reduces latency from ~200ms to ~1ms for cached requests.

**5. Rate limiting & quota management**

At scale, you can't call the Groq API unlimited times. Groq has rate limits (e.g., 100 requests/second per API key). Solution: Implement rate limiting.

```python
from slowapi import Limiter

limiter = Limiter(
    key_func=get_user_id,
    storage_uri="redis://localhost:6379",
    default_limits=["100 per minute"]  # Per user
)

@app.post("/api/assistant/chat")
@limiter.limit("100 per minute")
async def chat(request: TempleAssistantRequest):
    # Process request
```

Users who exceed the limit get a 429 (Too Many Requests) response. You could also implement tiered limits (e.g., free users: 10/min, premium: 100/min).

**6. Connection pooling**

Every HTTP call uses a connection. At 1K concurrent requests, you're making thousands of HTTP calls to Groq, admin service, etc. Without pooling, you'd exhaust the OS's file descriptor limit.

Solution: Connection pooling.

```python
async with httpx.AsyncClient(
    limits=httpx.Limits(max_connections=500, max_keepalive_connections=100)
) as client:
    # Reuse connections, don't open new ones for each request
```

**7. Model quantization & distillation (reduce inference cost)**

Groq's LLaMA Scout 17B is fast, but it's still expensive at scale. Options:

- **Use a smaller model:** LLaMA 3.1 8B is faster & cheaper than 17B (but less capable)
- **Model distillation:** Train a smaller model to mimic the larger one
- **Caching:** Cache LLM outputs for common queries (e.g., "What is Karma?" likely has a canonical answer)

Tradeoff: Smaller models are faster but less accurate.

**8. Kubernetes & Auto-scaling**

Deploy on Kubernetes with auto-scaling:

```yaml
apiVersion: autoscaling.horizontalpod.com/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-autoscaler
spec:
  scaleTargetRef:
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        averageUtilization: 80
```

As CPU/memory usage increases, Kubernetes automatically spins up new instances. When traffic drops, instances are terminated. This optimizes cost—you pay only for what you use.

**9. Distributed tracing & observability**

At scale, you can't debug individual requests manually. You need end-to-end visibility:

```
User Request
  ├─ Trace ID: abc123
  ├─ Span: API Gateway (2ms)
  ├─ Span: Guardrails Check (5ms)
  ├─ Span: OrchestratorAgent (1000ms)
  │   ├─ Span: ScriptureAgent (500ms)
  │   │   ├─ Span: Embed Query (50ms)
  │   │   ├─ Span: Pinecone Search (100ms)
  │   │   └─ Span: Groq LLM (350ms)
  │   └─ Span: TempleOpsAgent (500ms)
  │       └─ Span: HTTP to Admin Service (450ms)
  └─ Span: Synthesis (100ms)
```

Tools: Jaeger, Datadog, New Relic, or AWS X-Ray. Each span is timed and logged. If latency spikes, you can pinpoint which component is slow.

---

#### Scaling Strategy for JPMC

At JPMC, scaling looks like:

1. **Multi-region deployment:** Agentic service deployed in US, Europe, Asia for low latency
2. **Request routing:** Route based on geography (user in US → US data center)
3. **Specialized agents per domain:** DART might have agents for credit risk, fraud detection, trading, etc. Each deployed independently, allowing independent scaling
4. **Message queue at the core:** All requests go through a queue (Kafka) → workers consume at their pace
5. **Observability everywhere:** Every microsecond is tracked. Dashboards show latency, error rates, cost per request
6. **Cost optimization:** Negotiate higher rate limits with Groq, use spot instances for less-critical workloads, cache aggressively

---

---

# PART 2: ADVANCED RAG & DATA INTEGRATION
## Retrieval Quality, Knowledge Synthesis, Hybrid Search

### Question 5: How do you ensure retrieval quality in RAG systems? What metrics do you use?

> **Why asked:** RAG is only as good as the retrieved documents. If retrieval is poor, synthesis (LLM) can't help. This question tests: (1) Do you understand retrieval quality is THE bottleneck in RAG? (2) Can you measure it? (3) Do you iterate on it? (4) What's your strategy for improving it?

#### The RAG Pipeline & Where Retrieval Fits

```
User Query: "What is the significance of Paryushana?"
  ↓
1. EMBEDDING: Convert query to vector (using Gemini Embeddings)
   → Vector: [0.12, -0.45, 0.89, ...]
  ↓
2. RETRIEVAL: Search vector DB (Pinecone) for similar passages
   → Returns: Top 8 passages with similarity scores
   ├─ Passage 1: "Paryushana is an annual festival of repentance..." (score: 0.92)
   ├─ Passage 2: "During Paryushana, Jains practice self-reflection..." (score: 0.87)
   └─ ...
  ↓
3. SYNTHESIS: Feed passages to LLM to generate answer
   → "Paryushana is significant because..."
  ↓
Answer
```

**Retrieval quality** = How well the top 8 passages answer the user's query.

---

#### The Challenge: Poor Retrieval

**Scenario:** User asks "How do I find inner peace in Jainism?"

Bad retrieval might return:
- Passage 1: "Paryushana festival locations and timings"
- Passage 2: "How to donate to the temple"
- Passage 3: "Jain dietary restrictions"
- ...

These are all about Jainism, but none directly address inner peace / spirituality. The LLM would struggle to synthesize a good answer from these passages.

**Root causes of poor retrieval:**
1. **Vocabulary mismatch:** User says "find inner peace," but passages use "achieve equanimity" or "liberation" or "moksha." Vector similarity might miss this.
2. **Semantic misalignment:** User's query and passage are about different topics but have similar vector representations.
3. **Sparse/low-quality knowledge base:** The relevant passages don't exist in the vector DB, or they're poorly written.
4. **Embedding model limitations:** Gemini Embeddings might not capture the nuance of Jain philosophy well.

---

#### Metrics for Retrieval Quality

**1. Hit Rate (Does the answer exist in top-k?)**

For each query in your test set, check: Is the relevant passage in the top 8 results?

```
Query: "What is Karma in Jainism?"

Passages returned by Pinecone:
1. "Karma is the law of cause and effect in Jainism" (RELEVANT ✅)
2. "Buddhist concept of Karma"
3. "How to donate to temple"

Hit @ 8 = YES (relevant passage is in top 8)
Cumulative hit rate = (# queries with hit @ 8) / (# total queries) = 85%
```

A hit rate of 85% means 85% of user queries have their answer in the top 8 results. This is a good baseline. Ideal: > 90%.

**2. Normalized Discounted Cumulative Gain (NDCG)**

This metric measures not just whether the answer exists, but **where** it appears in the ranking. A relevant passage ranked #1 is better than one ranked #8.

```
Query: "What is Karma?"

Ideal ranking (from human annotation):
1. "Karma is the law of cause and effect in Jainism" (relevance: 5/5)
2. "How Karma affects rebirth in Jainism" (relevance: 4/5)
3. "Karma and free will" (relevance: 3/5)

Actual ranking (from Pinecone):
1. "Karma and free will" (relevance: 3/5)
2. "Karma is the law of cause and effect" (relevance: 5/5)
3. "How Karma affects rebirth" (relevance: 4/5)

NDCG = (score if ranked correctly) / (score of ideal ranking) = 0.85 (pretty good)
```

NDCG ranges from 0 to 1. Higher is better. A system with NDCG > 0.7 is generally good.

**3. Mean Reciprocal Rank (MRR)**

Simpler than NDCG: What's the average rank of the first relevant result?

```
Query 1: First relevant result at rank 1 → reciprocal rank = 1/1 = 1.0
Query 2: First relevant result at rank 3 → reciprocal rank = 1/3 = 0.33
Query 3: First relevant result at rank 2 → reciprocal rank = 1/2 = 0.5

MRR = (1.0 + 0.33 + 0.5) / 3 = 0.61
```

A high MRR (> 0.8) means relevant results appear near the top.

**4. Precision @ k (How many of the top-k results are relevant?)**

```
Top 8 results for "What is Karma?":
1. "Karma definition" (relevant ✅)
2. "Karma and rebirth" (relevant ✅)
3. "Temple timings" (not relevant ❌)
4. "Karma philosophy" (relevant ✅)
5. "Donation process" (not relevant ❌)
6. "More on Karma" (relevant ✅)
7. "Event schedule" (not relevant ❌)
8. "Karma resolution" (relevant ✅)

Precision @ 8 = 6 / 8 = 0.75 (75% of top 8 are relevant)
Precision @ 4 = 3 / 4 = 0.75
Precision @ 1 = 1 / 1 = 1.0
```

---

#### Aagam Mitra's Current Retrieval Quality

**Current setup:**
- Embedding model: Gemini (2048-dim vectors)
- Vector DB: Pinecone with ~800 passages from Jain texts
- Search strategy: Semantic similarity (cosine distance)
- Top-k: Return top 8 passages

**Quality estimate:** Informally, we think retrieval quality is ~80% (most queries get relevant passages). But we don't have formal metrics.

**Why not?** We'd need a test set of ~100 queries with human-annotated relevance labels. This is labor-intensive.

---

#### How to Improve Retrieval Quality

**1. Query Expansion**

Instead of searching for the exact query vector, expand it first:

```
User query: "Find inner peace in Jainism"
  ↓
Expanded queries:
- "Find inner peace in Jainism"
- "Achieve equanimity through Jain practices"
- "Spiritual peace in Jain philosophy"
- "Meditation and peace in Jainism"
  ↓
Search for all 4 vectors in Pinecone
  ↓
Union results (avoid duplicates)
  ↓
Rank by relevance score
```

This catches passages that use different vocabulary but are semantically related.

**2. Semantic Reranking**

Pinecone returns top-k by vector similarity. But similarity ≠ relevance. Solution: Rerank with a more sophisticated model.

```
Pinecone returns top 20 passages (fast, semantic similarity)
  ↓
Reranker (e.g., Cohere Rerank API) reranks them
  ├─ Reads full passage text + query
  ├─ Outputs relevance score (0-1)
  └─ Returns top 8 after reranking
```

Reranking is slower but more accurate. Tradeoff: +50-100ms latency, but better quality.

**3. Keyword + Semantic Hybrid Search**

Combine keyword search (BM25) with semantic search:

```
User query: "Paryushana festival"
  ├─ Keyword search: Find passages with "Paryushana" and "festival"
  │  → Results: [passage_1, passage_5, passage_12]
  └─ Semantic search: Find similar vectors
     → Results: [passage_2, passage_7, passage_9]
  ↓
Merge results (keyword + semantic)
  ├─ passage_1 (matched keyword + semantic)
  ├─ passage_5 (matched keyword)
  ├─ passage_2 (matched semantic)
  └─ ...
```

Hybrid search catches both exact matches and semantic matches. Often outperforms either alone.

Pinecone supports hybrid search natively (keyword + dense vectors). We could enable it.

**4. Entity Recognition & Linking**

Recognize entities in queries and passages, and use them to improve ranking:

```
Query: "Tell me about Mahavir Jayanti"
  ├─ Entities: ["Mahavir" (person), "Jayanti" (event)]

Passages:
1. "Mahavir Jayanti is the birthday of Mahavira, the 24th Tirthankara" (contains both entities)
2. "Mahavira lived in India around 599 BCE" (contains one entity, but not Jayanti)
3. "Festival celebrations in Jainism" (generic, no entities)

Rank by entity overlap: passage_1 > passage_2 > passage_3
```

**5. Query-Specific Filtering**

Some queries have implicit constraints:

```
Query: "When is Diwali celebrated in Jainism?"
  ├─ Constraint: Looking for a DATE
  ├─ Constraint: Context is JAINISM (not Buddhism or Hinduism)

Search:
  ├─ Filter: Date-related passages
  ├─ Filter: Jain-related passages
  ├─ Search: "Diwali"
```

Adding filters narrows the search space, improving precision.

**6. Active Learning & Feedback Loop**

Collect user feedback to improve retrieval:

```
System returns 8 passages → User reads → Gives feedback
├─ "Helpful" (passage was relevant)
├─ "Not helpful" (passage was irrelevant)
└─ "Partially helpful"

Every 100 feedback points:
  └─ Retrain embedding model or reranker
     └─ Improve future retrieval
```

This is how Google Search improves—through feedback loops.

**7. Chunking & Context Window Optimization**

How passages are split affects retrieval:

```
Passage: "Mahavir was born in 599 BCE in Bihar. He renounced the world at age 30. 
          He attained enlightenment after 12 years of austerity. He founded the Jain order."

Chunking option 1 (by sentence):
- Chunk 1: "Mahavir was born in 599 BCE in Bihar."
- Chunk 2: "He renounced the world at age 30."
- Chunk 3: "He attained enlightenment after 12 years of austerity."

Chunking option 2 (by paragraph):
- Chunk 1: Full passage (4 sentences)

Option 2 is better—it preserves context. But it might lose granularity for specific queries.
```

Optimal chunk size: ~200-500 words (balance between context and granularity).

---

#### Measuring Quality in Production

In production, you can't manually rate every query. Instead, use proxy metrics:

1. **User engagement:** Do users click on the returned passages? Do they re-ask the same question? High engagement = good retrieval.
2. **Response quality:** Does the LLM synthesize a good answer? (Measured via user ratings of the final answer, not retrieval alone)
3. **Latency:** Is retrieval fast? (Measured via query response time)

For Aagam Mitra, we could add:
```python
# After returning answer, ask user:
# "Was this answer helpful?" → thumbs up/down
# Track: (query, passages returned, user rating)
# Correlate: Better retrieval → Higher user ratings

user_ratings[user_id][query_id] = "helpful"  # or "not helpful"
```

Over time, this gives you a feedback signal to improve retrieval.

---

### Question 6: What's your approach to keeping a knowledge base fresh and current?

> **Why asked:** RAG systems have a cold-start problem: What if the answer isn't in the vector DB yet? What if the answer was in there but changed? At JPMC, regulations change, product docs change, market data changes. This question tests if you think about data freshness and update strategies.

#### The Problem: Stale Knowledge Bases

Scenario 1: Temple publishes new Shantidhara timings. The vector DB still has old timings. User asks "What time is Shantidhara?" They get outdated info.

Scenario 2: JPMC's trading risk policy changes. The RAG system still has the old policy. A trader uses the AI to check compliance, gets wrong info, violates regulation.

---

#### Strategies for Keeping Knowledge Bases Fresh

**1. Push-based Updates (Real-time)**

When source data changes, immediately update the vector DB:

```
Admin publishes new event
  ├─ Event stored in Admin Service DB
  ├─ Webhook triggered: POST /aagam-mitra/webhooks/events
  │  ├─ Embed event description (Gemini)
  │  └─ Insert into Pinecone
  ├─ Chat remembers new event for next query
  └─ 1-2 second latency
```

**Pros:** Always fresh. **Cons:** Requires coordination with source systems.

**2. Batch Imports (Periodic)**

Nightly or hourly, re-import from source:

```
Every night at 1 AM:
  ├─ Fetch all events from Admin Service
  ├─ Fetch all news from News Service
  ├─ Fetch all FAQs from Knowledge Base
  ├─ Embed everything (Gemini batch API, faster)
  ├─ Replace old vectors in Pinecone with new ones
  └─ Rebuild indices
```

**Pros:** Simple, scalable. **Cons:** Stale during the day (lag time).

For Aagam Mitra, we could run a daily batch job:
```python
@scheduler.scheduled_job('cron', hour=1)
async def refresh_knowledge_base():
    # Fetch latest events, news, FAQs from all services
    # Re-embed and replace in Pinecone
```

**3. Versioning & Snapshots**

Keep multiple versions of passages in the DB:

```
Passage ID: jain_sutra_001
Versions:
- v1 (2026-01-01): "Mahavir Jayanti is on April 14"
- v2 (2026-02-01): "Mahavir Jayanti is on April 13" (corrected based on lunar calendar)
- v3 (2026-06-01): "Mahavir Jayanti is on April 14" (back to original)

When querying:
  ├─ Search latest version (v3) by default
  └─ Optionally allow queries for historical versions ("What was the date in Jan 2026?")
```

Tradeoff: More storage, but can rollback if incorrect info is detected.

**4. Source-of-Truth Pattern**

Embed passages in a way that links them back to source:

```
Passage: "Paryushana lasts 8 days"
Metadata:
  ├─ source: "admin:8003/api/events/paryushana"
  ├─ fetched_at: "2026-07-11T10:30:00Z"
  ├─ ttl: 86400  # Refresh every 24 hours
  └─ version: "v2.1"

When passage is retrieved:
  ├─ Check TTL: Is it stale?
  │  ├─ If yes: Refetch from source
  │  └─ If no: Use cached version
```

This way, each passage knows where it came from and when it was last updated.

**5. Continuous Monitoring & Alerts**

Monitor for inconsistencies:

```
Query: "When is Paryushana?"
  ├─ RAG answer: "August 20-27, 2026"
  ├─ Admin DB answer: "August 19-26, 2026"
  └─ Alert: Mismatch detected → Trigger refresh
```

Or monitor user feedback:

```
User asks: "When is Paryushana?"
  ├─ System returns: "August 20-27"
  ├─ User rates: "Not helpful" ❌
  ├─ Log: (query, returned_passages, user_rating)
  └─ If multiple "not helpful" ratings on same passages → Flag for review
```

---

#### Aagam Mitra's Current Approach

Currently, we have:
- Jain texts (static, updated ~quarterly when new translations added)
- Temple events & news (updated via admin dashboard)
- Membership info (updated via registration service)

**Gap:** No automated refresh. If an event is updated, the vector DB isn't updated until someone manually re-imports. This can lead to stale info.

**Improvement plan:**
1. Add daily batch refresh (1 AM, 1-minute job)
2. Add webhooks for real-time updates (events, news)
3. Add version tracking (each passage includes `updated_at`)
4. Add user feedback loop (rate answer quality, correlate with retrieval)

---

---

# PART 3: ENTERPRISE AI ARCHITECTURE
## Scale, Reliability, Compliance, Governance

### Question 7: How do you design for compliance and regulatory requirements in AI systems?

> **Why asked:** This is critical at JPMC. Financial services are heavily regulated. Model decisions might be subject to regulatory scrutiny ("Why did you deny this person a loan?"). This question tests if you understand the regulatory landscape and how to build AI systems that satisfy it.

#### Regulatory Landscape (Financial Services Focus)

In financial services, AI is regulated under:

1. **Basel III / IV (Banking regulation)**
   - Banks must understand and justify their risk models
   - Model risk management (MRM) requirements
   - Models must be explainable, validated, approved by risk teams

2. **Fair Lending Laws (US)**
   - ECOA (Equal Credit Opportunity Act): Lending decisions can't be based on protected characteristics (race, gender, religion, etc.)
   - FCRA (Fair Credit Reporting Act): Automated decisions must be accurate and transparent
   - Disparate impact: Even if unintentional, if an AI model disadvantages a protected group, it's illegal

3. **GDPR (EU data privacy)**
   - Right to explanation: Users can ask "Why did the AI make that decision?"
   - Right to be forgotten: Users can request their data be deleted
   - Data minimization: Only collect/process data you need

4. **SOX (Sarbanes-Oxley Act)**
   - Financial reports must be accurate
   - If AI influences financial reporting, it must be validated and audited

5. **Internal Risk & Compliance Policies**
   - JPMC has its own policies on AI (data governance, model governance, ethical AI)
   - These often exceed regulatory requirements

---

#### How to Design for Compliance

**1. Explainability & Audit Trails**

Every decision must be traceable:

```
User: "What's my credit score?"

System:
  1. Fetch user data from DB (which tables, which fields?)
  2. Calculate credit score using model (which version, which coefficients?)
  3. Return score: 720
  
  Audit trail:
  ├─ User ID: usr_abc123
  ├─ Query: "What's my credit score?"
  ├─ Timestamp: 2026-07-11T14:30:45Z
  ├─ Model version: credit_model_v3.2
  ├─ Input features: [age=35, income=$100k, debt=$50k, ...]
  ├─ Model output: 720
  ├─ Approved by: risk_team_user_001
  └─ Query duration: 45ms
```

Every query is logged. A regulator can replay it and verify the decision was correct.

**2. Model Governance & Validation**

Before deploying a model, it must be validated:

```
Model Development
  ├─ Train on historical data
  ├─ Test on holdout set (to check accuracy)
  └─ Document limitations ("Model is 92% accurate on X demographic")
  ↓
Model Validation (by risk team)
  ├─ Check: Is it accurate? (Performance metrics)
  ├─ Check: Is it fair? (No disparate impact on protected groups)
  ├─ Check: Is it stable? (Will it work on new data?)
  ├─ Check: Is it explainable? (Can we explain why it made a decision?)
  └─ Approve or reject
  ↓
Model Deployment (if approved)
  ├─ Deploy to staging (test environment)
  ├─ Monitor performance for 1-2 weeks
  ├─ If stable, promote to production
  └─ Continue monitoring
```

This is formalized in Model Risk Management (MRM) frameworks like the Federal Reserve's guidance on Governance and Oversight.

**3. Data Governance**

Know your data:

```
For each data field:
  ├─ Source: Where does it come from? (API, DB, manual entry?)
  ├─ Quality: Is it accurate? Complete? (Validation rules)
  ├─ Access: Who can see it? (Role-based access control)
  ├─ Retention: How long do we keep it? (Legal holds, GDPR right to be forgotten)
  ├─ Lineage: How is it transformed? (Data pipeline documentation)
  └─ Sensitivity: Is it PII, confidential, etc.? (Classification)
```

At JPMC, data governance is formalized in the Enterprise Data Management (EDM) framework.

**4. Fairness & Bias Testing**

Before deploying, test for bias:

```
Credit scoring model:
  ├─ Accuracy by demographic:
  │  ├─ White males: 95% accurate
  │  ├─ Black females: 88% accurate (DISPARATE IMPACT ⚠️)
  │  └─ Hispanic: 92% accurate
  ├─ Approval rates:
  │  ├─ White males: 70% approved for loans
  │  ├─ Black females: 55% approved (DISPARATE IMPACT ⚠️)
  └─ Recommended action: Retrain model or add constraints to ensure fairness

Fairness metrics:
  ├─ Demographic parity: Approval rate should be equal across groups
  ├─ Equalized odds: True positive rate and false positive rate equal across groups
  └─ Calibration: Model confidence should be consistent across groups
```

Legal risk: If a regulator finds disparate impact, JPMC faces fines, lawsuits, reputational damage.

**5. Human-in-the-Loop for High-Risk Decisions**

For high-stakes decisions, require human approval:

```
AI recommends: "Deny loan application"
  ├─ Decision confidence: 78%
  ├─ If confidence < 80%: Escalate to human reviewer
  ├─ Human reviews: Application, AI explanation, comparable cases
  ├─ Human decides: Approve, deny, or request more info
  └─ Log human decision (for audit)

For JPMC credit decisions:
  ├─ AI scores: 0-100
  ├─ Approve if AI score > 80
  ├─ Deny if AI score < 20
  ├─ Human review if 20 ≤ score ≤ 80
```

This reduces risk of bad AI decisions.

**6. Right to Explanation**

Customers can ask: "Why did you deny my loan?"

You must be able to explain in plain language:

```
Customer: "Why was I denied?"

Response:
"Your application was scored 65/100 by our credit model. 
The primary factors were:
  - Debt-to-income ratio (60%): Higher than typical applicants
  - Length of credit history (3 years): Shorter than preferred
  - Missed payment 18 months ago: Concerning but improving

We recommend:
  - Pay down debt to <50% of income
  - Wait 6 months and reapply (shows improvement)
  - Consider a secured credit card to build history"
```

This requires:
- Explainable models (not black-box neural networks)
- Clear documentation of model decisions
- Interpretation layer (translate model scores into human language)

**7. Monitoring & Continuous Validation**

After deployment, monitor for:

```
Model performance over time:
  ├─ Accuracy: Still 92%? Or degraded to 85%?
  ├─ Fairness: Approval rates still equal? Or drifted?
  ├─ Data drift: Is new data different from training data?
  └─ Model drift: Is the model's behavior changing?

If issues detected:
  ├─ Alert risk team
  ├─ Investigate root cause
  ├─ Retrain or rollback model
  └─ Document findings
```

---

#### Aagam Mitra & Compliance

Aagam Mitra is **not a financial system**, so regulatory burden is lighter. But we do have security/privacy considerations:

**Current practices:**
- Input guardrails (block injections, malicious queries)
- RBAC (role-based access control: devotee vs. admin)
- Audit logging (every request logged with user_id masked for privacy)
- Prompt hardening (system prompts constrain behavior)

**What we could add (if regulated):**
- Model validation: Test ScriptureAgent and TempleOpsAgent for accuracy before deploying
- Fairness testing: Ensure responses don't discriminate (though our queries are low-risk)
- Data governance: Formalize data retention, access control, lineage
- Explainability: Log why each agent made a decision
- Human-in-the-loop: For high-risk actions (big donations, membership approvals), require admin review

For JPMC DART (financial services), compliance is **mandatory**. Every agentic system must have:
- Model governance & validation
- Explainability & audit trails
- Data governance & lineage
- Fairness testing
- Continuous monitoring
- Right to explanation

---

### Question 8: What's your approach to observability and monitoring in production agentic systems?

> **Why asked:** In production, things fail. Users experience bugs. Systems degrade. This question tests: (1) Do you have visibility into what's happening? (2) Can you detect issues automatically? (3) Can you debug production issues quickly? (4) Do you learn from issues to prevent repeats?

#### The Observability Stack

Modern observability has four pillars:

**1. Metrics (Numbers)**
```
- Response time: 450ms (average)
- Requests per second: 250 RPS
- Error rate: 0.5% (5 errors per 1000 requests)
- Cache hit rate: 75%
- Groq API cost: $12.34/hour
```

**2. Logs (Events)**
```
[2026-07-11T14:30:45.123Z] INFO: QUERY_RECEIVED 
  user_id=usr_abc123, 
  message="What is Karma?", 
  temple_id=tmpl_001

[2026-07-11T14:30:46.234Z] DEBUG: ORCHESTRATOR_ROUTE 
  intents=["scripture"], 
  agent="ScriptureAgent"

[2026-07-11T14:31:00.456Z] INFO: RESPONSE_SENT 
  response_time_ms=1212, 
  tools_called=["search_jain_texts"]
```

**3. Traces (Execution flow)**
```
Trace ID: trace_xyz789
  ├─ Span: API Gateway (2ms)
  ├─ Span: RBAC Check (5ms)
  ├─ Span: OrchestratorAgent (1200ms)
  │  ├─ Span: Intent Detection (10ms)
  │  ├─ Span: ScriptureAgent.run (1190ms)
  │  │  ├─ Span: Embedding (50ms)
  │  │  ├─ Span: Pinecone Search (100ms)
  │  │  └─ Span: Groq LLM Call (1040ms)
  └─ Span: Response Encoding (3ms)
```

**4. Events (User actions)**
```
- User clicked "Book Shantidhara" → Triggered action card
- User rated response as "Helpful" → Positive feedback
- User re-asked same question 2 min later → Query was confusing
```

---

#### Aagam Mitra's Current Observability

**Current:**
- Audit logging (every query logged, PII masked)
- Downstream HTTP retries logged
- Errors logged (exceptions, RBAC violations)

**Gaps:**
- No metrics dashboard (response time, error rate, cost)
- No distributed tracing (can't see what took time in a request)
- No alerting (if error rate spikes, we don't know)
- No user feedback loop (can't correlate query quality with retrieval quality)

---

#### Building Observability at Scale

**1. Metrics & Dashboards**

Track key metrics and display in a dashboard:

```
Metrics to track:
  ├─ Request volume (RPS)
  ├─ Response time (p50, p95, p99 latencies)
  ├─ Error rate (% of requests with errors)
  ├─ Cache hit rate (% of queries served from cache)
  ├─ Groq API cost ($/hour, $/request)
  ├─ Vector DB query time (ms)
  ├─ Tool execution time (ms)
  └─ User satisfaction (% positive ratings)

Dashboards:
  ├─ Executive: High-level KPIs (RPS, error rate, cost)
  ├─ Engineering: Detailed metrics (latency breakdown, cache hit rate, API usage)
  ├─ Operations: Alerting & incidents (error spikes, resource exhaustion)
  └─ Product: User metrics (satisfaction, engagement)
```

Tools: Prometheus (metrics collection), Grafana (dashboards).

**2. Distributed Tracing**

Trace every request from entry to exit:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@app.post("/api/v1/temples/{id}/assistant/chat")
async def chat_endpoint(request: TempleAssistantRequest):
    with tracer.start_as_current_span("chat_endpoint") as span:
        span.set_attribute("user_id", request.user_id)
        span.set_attribute("temple_id", request.temple_id)
        
        with tracer.start_as_current_span("orchestrator") as orch_span:
            response, tools = await orchestrator.run(...)
            orch_span.set_attribute("response_time_ms", elapsed)
        
        return response
```

Tools: Jaeger, Datadog, New Relic, AWS X-Ray.

**Benefit:** Can replay any request, see exactly which step took time, identify bottlenecks.

**3. Logging Strategy**

Structured logging (JSON format, not plain text):

```python
logger.info({
    "event": "QUERY_RECEIVED",
    "timestamp": "2026-07-11T14:30:45.123Z",
    "user_id": user_id,  # PII, but needed for debugging
    "temple_id": temple_id,
    "message": message,  # Full query for replay
    "user_role": role,
    "trace_id": trace_id,  # Links to distributed trace
})
```

Benefits:
- Searchable (filter by user_id, temple_id, event type)
- Correlatable (trace_id links logs to traces)
- Parseable (JSON is machine-readable)

Tools: ELK (Elasticsearch, Logstash, Kibana), Loki, Datadog.

**4. Alerting**

Automatic alerts when metrics go out of bounds:

```
Alert: High Error Rate
  if (error_rate > 1.0% for 5 minutes) then
    send_slack("Error rate is {error_rate}%")
    create_incident("ERR_RATE_SPIKE")

Alert: High Latency
  if (p95_latency > 2000ms for 10 minutes) then
    send_slack("API latency degraded to {p95_latency}ms")
    page_oncall()

Alert: High Cost
  if (groq_cost > $50/hour) then
    send_slack("Groq cost exceeded budget")
    trigger_cost_investigation()
```

Tools: Prometheus AlertManager, PagerDuty, Opsgenie.

**5. Debugging Production Issues**

When a user reports "The AI gave me a wrong answer," how do you debug?

```
Step 1: Find the request
  ├─ User says: Query was at 2:30 PM, about "Karma"
  ├─ Search logs: timestamp > 14:30 AND timestamp < 14:31 AND message ~ "Karma"
  ├─ Find request: trace_id = trace_xyz789

Step 2: Replay the request
  ├─ Look at trace: Which agents were called? How long did each take?
  ├─ Look at logs: What was the exact message? What was the response?
  ├─ Look at metrics: Was latency normal? Were there errors?

Step 3: Diagnose root cause
  ├─ Retrieved passages relevant? (Check Pinecone logs)
  ├─ Groq response reasonable? (Check Groq API logs)
  ├─ User feedback correct? (Check user rating in DB)

Step 4: Fix & monitor
  ├─ If retrieval was bad: Improve vector DB or embedding model
  ├─ If LLM response was bad: Improve prompt or temperature
  ├─ If metrics are trending wrong: Investigate systemic issue
```

**6. Incident Response**

When an incident occurs (error rate spikes, service down, etc.):

```
Incident Detected (via alert)
  ├─ Severity: P1 (critical), P2 (high), P3 (medium), P4 (low)
  ├─ Create incident ticket
  ├─ Assign on-call engineer
  ├─ Start Slack war room
  └─ Begin investigation

Investigation
  ├─ Check metrics: What changed? (Error rate, latency, resource usage)
  ├─ Check logs: Any errors or warnings?
  ├─ Check traces: Where did it fail?
  ├─ Check deployments: Any recent changes?
  └─ Formulate hypothesis

Mitigation
  ├─ If downstream service is down: Retry or degrade gracefully
  ├─ If LLM rate limit hit: Slow down requests or queue
  ├─ If database is slow: Increase connection pool or cache more aggressively
  └─ If bug introduced: Rollback or apply hotfix

Resolution
  ├─ Confirm metrics normal
  ├─ Conduct post-mortem
  ├─ Document root cause and fix
  ├─ Add monitoring/alerts to prevent repeat
  └─ Close incident

Example post-mortem:
  Root cause: Pinecone rate limit exceeded (1000 QPS limit hit)
  Why: New feature ("Save favorite responses") triggered vector search on every request
  Impact: 5% error rate for 15 minutes, ~500 queries failed
  Fix: Add caching layer, implement backpressure
  Prevention: Monitor Pinecone error rates, alert at 80% of limit
```

---

#### Aagam Mitra's Observability Roadmap

**Phase 1 (Now):**
- ✅ Audit logging (every query logged)
- ✅ Error handling (exceptions caught & logged)
- ❌ Metrics dashboard (not implemented)
- ❌ Distributed tracing (not implemented)

**Phase 2 (Next sprint):**
- Prometheus metrics: Request volume, response time, error rate
- Grafana dashboard: Display metrics
- Datadog integration: Centralized logging + monitoring

**Phase 3 (Future):**
- Distributed tracing (Jaeger or Datadog APM)
- Alerting (Slack alerts for error spikes, cost overruns)
- User feedback loop (rating quality, correlate with metrics)
- Post-mortem process (document and prevent repeats)

---

# PART 4: GOVERNANCE & OBSERVABILITY
## Advanced Governance Patterns, Cost Management, Quality Assurance

### Question 9: How do you balance cost and quality in LLM-powered systems?

> **Why asked:** LLMs are expensive. An LLM call costs ~$0.001 per request. At scale (1M requests/day), that's $1000/day = $30k/month. This question tests: (1) Do you think about cost vs. quality tradeoffs? (2) Can you optimize without sacrificing user experience? (3) Do you measure ROI?

#### The Cost-Quality Tradeoff

**Expensive = High Quality:**
- GPT-4o: $5/M input tokens, 5-10 second response time, very accurate
- Groq LLaMA 17B: $0.11/M input tokens, <1 second response time, pretty accurate

**Cheap = Lower Quality:**
- Open source models (Llama 3, Mistral): $0/M input tokens (self-hosted), variable quality
- Smaller models: Cheaper but less capable

**Tradeoff:** Choose model based on:
- Required quality (accuracy, safety, factuality)
- Budget constraints
- Latency requirements (can user wait 5 seconds?)
- Volume (at 1M requests/day, even $0.01/request = $10k/day)

---

#### Cost Optimization Strategies

**1. Caching (Avoid Redundant LLM Calls)**

Many queries are similar or identical. Cache the LLM response:

```
User 1: "What is Karma?"
  ├─ Not in cache
  ├─ Call Groq: $0.001
  └─ Cache response with TTL=24h

User 2: "What is Karma?" (1 hour later)
  ├─ Found in cache
  ├─ Return immediately
  ├─ Cost: $0
  └─ Latency: <5ms

User 3: "What is karma in Jainism?" (similar but not identical)
  ├─ Not in cache (different query)
  ├─ Call Groq: $0.001
  └─ Cache response
```

**Savings:** If 50% of queries are cacheable, save 50% on LLM costs.

At Aagam Mitra scale (~100 queries/day), caching saves ~$0.05/day. At scale (1M queries/day), caching saves ~$500/day.

Redis cache (in-memory):
```python
cache_key = hash(query)
cached = redis.get(cache_key)
if cached:
    return cached

response = groq.chat(message=query)
redis.set(cache_key, response, ex=86400)  # Cache for 24h
return response
```

**2. Prompt Compression & Caching**

LLM calls include system prompt + conversation history. Longer prompts = higher cost.

Strategy: Cache the embedding of frequently-used prompts.

```
System Prompt (used for every request):
  "You are Aagam Mitra, a Jain temple assistant. Today is 2026-07-11. 
   Be warm, accurate, and ground answers in scripture."
  
Without caching:
  - Every request includes full system prompt (~500 tokens)
  - Cost: 500 tokens * 0.0001 $/1000 tokens = $0.00005 per request
  
With prompt caching (OpenAI / Claude feature):
  - Upload system prompt once, get cache token
  - Subsequent requests reference cache token
  - Cost: ~90% discount on cached tokens
  - Savings: 0.00005 * 0.9 = $0.000045 per request
```

At 1M requests/day: $45/day saved just on system prompt caching.

**3. Model Routing (Use Cheaper Model When Possible)**

Use smaller, cheaper models for simple queries; expensive models for complex ones:

```
Simple query: "What time is Shantidhara?"
  ├─ Route to: Groq LLaMA Scout 7B ($0.05/M tokens)
  ├─ Response quality: Good (simple factual query)
  └─ Cost: $0.0001

Complex query: "Plan my spiritual journey in Jainism for next year"
  ├─ Route to: Groq LLaMA Scout 17B ($0.11/M tokens)
  ├─ Response quality: Better (needs reasoning)
  └─ Cost: $0.0002
```

**Savings:** ~30% if 50% of queries are routable to cheaper model.

**4. Batching**

Instead of calling LLM once per query, batch multiple queries:

```
Without batching:
  Request 1: "What is Karma?" → Call Groq (fixed overhead)
  Request 2: "What is Ahimsa?" → Call Groq (fixed overhead)
  Request 3: "What is Aparigraha?" → Call Groq (fixed overhead)
  Total: 3 API calls, high latency

With batching:
  Collect: [Request 1, Request 2, Request 3]
  Wait: 100ms (batch window)
  Call Groq once: Process all 3 queries in parallel
  Total: 1 API call, slight latency increase
```

**Savings:** ~2-3x reduction in API calls. **Tradeoff:** Higher latency (wait for batch window).

For chat applications, batching isn't ideal (users expect immediate response). But for background jobs (analysis, summaries), batching is great.

**5. Token Optimization**

LLM cost is per-token. Fewer tokens = Lower cost.

**Before (verbose):**
```
System Prompt: "You are Aagam Mitra, an AI assistant for the Jain temple community. 
               Your role is to help members with questions about Jain philosophy, temple operations, 
               community events, and spiritual guidance. Always be respectful, accurate, and cite sources."

Message: "User asked: What is the significance of Paryushana? 
         Please provide a thoughtful, detailed answer grounded in Jain texts."

Total: ~100 tokens
```

**After (concise):**
```
System: "Jain temple AI assistant. Answer queries on philosophy, operations, events, spirituality. 
        Cite sources."

Message: "Significance of Paryushana?"

Total: ~20 tokens
```

**Savings:** 80% fewer tokens. At 1M requests/day, saves $0.01 per request = $10k/day.

**6. RAG Efficiency**

Instead of asking the LLM to know everything, use RAG (retrieve documents, then ask LLM):

```
Query: "What is Mahavir Jayanti?"

With RAG:
  ├─ Retrieve: "Mahavir Jayanti is celebrated on April 14..."
  ├─ Call Groq: "Answer based on this passage: ..."
  └─ Cost: 1 LLM call, ~50 tokens

Without RAG (using LLM memory):
  ├─ Call Groq: "What is Mahavir Jayanti?"
  └─ Cost: 1 LLM call, ~200 tokens (context needed to answer)
```

**Savings:** ~75% fewer tokens with RAG. The downside: Retrieval quality matters (bad retrieval = bad answer).

**7. Monitoring Cost & Setting Budgets**

Track spending and alert when budgets are exceeded:

```
Groq API usage:
  Today: $12.34
  This week: $87.65
  This month: $375.23 (budget: $400/month)

Breakdown:
  ├─ ScriptureAgent: $234 (63%)
  ├─ TempleOpsAgent: $95 (25%)
  ├─ CommunityAgent: $46 (12%)
  └─ YouTubeAgent: $0.23 (<1%)

Alert: If usage > 90% of budget, notify.
       If usage > 100% of budget, throttle requests.
```

Tools: Custom dashboards or integrated cost tracking (Groq provides usage via API).

---

#### Aagam Mitra Cost Analysis

**Current cost (home scale, 100 queries/day):**
- Groq API: ~200 tokens/query avg × $0.00001/token ≈ $0.002/query × 100 = $0.20/day
- Gemini Embeddings: ~50 embedding calls/day × $0.00001 = $0.0005/day
- Pinecone: Free tier (<1M vectors)
- Total: ~$0.20/day = $6/month

**Projected cost (scale to 10k queries/day):**
- Groq: 0.002 × 10k = $20/day = $600/month
- Gemini Embeddings: $0.05/day = $1.50/month
- Pinecone: ~$0.35/day = $10.50/month
- Total: ~$600/month

**Cost reduction opportunities:**
1. Implement caching → 50% savings = $300/month
2. Optimize prompts → 20% savings = $120/month
3. Route to 7B model → 30% savings = $180/month
4. Total potential: Save $600/month (100% of cost)

---

### Question 10: How do you approach testing and validation of agentic systems?

> **Why asked:** Testing AI systems is hard. You can't unit test an LLM call the same way you test a function. This question tests: (1) Do you understand the unique challenges of testing agents? (2) Can you design a testing strategy? (3) Do you know when to use automated tests vs. manual review?

#### The Testing Challenge

Traditional testing:
```python
def add(a, b):
    return a + b

# Test
assert add(2, 3) == 5  # ✅ Deterministic, reproducible
```

Agent testing:
```python
def agent.run(user_message: str):
    # Call LLM (non-deterministic)
    # Execute tools (might fail)
    # Return answer (quality varies)
    return response

# How do you test this?
response = agent.run("What is Karma?")
assert "Karma" in response  # ✅ Checks if answer is relevant
# But: Two runs might have different answers (both correct)
# And: Even if response contains "Karma," it might be wrong
```

---

#### Testing Strategy for Agentic Systems

**1. Intent Routing Tests**

Test that the orchestrator routes to the right agent:

```python
def test_intent_routing():
    # Scripture query
    intents = orchestrator._detect_intents("What is Karma?")
    assert "scripture" in intents
    
    # Temple ops query
    intents = orchestrator._detect_intents("Book Shantidhara")
    assert "temple_ops" in intents
    
    # Multi-intent query
    intents = orchestrator._detect_intents("Book Shantidhara and explain significance")
    assert {"temple_ops", "scripture"} == set(intents)
```

**Status:** We can test this locally (no LLM call needed, just regex).

**2. Tool Functionality Tests**

Test that tools return expected data:

```python
@pytest.mark.asyncio
async def test_get_shantidhara_slots():
    slots = await tool_get_shantidhara_slots(
        temple_id="tmpl_001",
        slot_date="2026-07-15"
    )
    
    assert len(slots) > 0
    assert all(s.date == "2026-07-15" for s in slots)
    assert all(s.price > 0 for s in slots)
```

**Status:** We can test against a live or mock admin service.

**3. End-to-End Agent Loop Tests**

Test the full agent pipeline with mocked LLM:

```python
@pytest.mark.asyncio
async def test_scripture_agent_loop():
    # Mock Groq response
    mock_response = {
        "finish_reason": "tool_calls",
        "message": {
            "tool_calls": [{
                "function": {"name": "search_jain_texts", "arguments": '{"query": "Karma"}'}
            }]
        }
    }
    
    with patch("aagam_mitra.groq_api.post") as mock_groq:
        mock_groq.return_value = mock_response
        
        result = await scripture_agent.run(
            user_message="What is Karma?",
            history=[],
            context=AgentContext(...)
        )
        
        # Verify:
        assert "Karma" in result.response.lower()
        assert len(result.tools_called) == 1
```

**Status:** We can mock Groq locally.

**4. Answer Quality Tests**

Test that answers are relevant to queries:

```python
def test_answer_relevance():
    # Use a scoring model (e.g., sentence-transformers) to compare query & answer
    query = "What is Karma?"
    answer = agent.run(query).response
    
    score = semantic_similarity(query, answer)
    assert score > 0.7  # Answer should be >70% similar to query
```

**Challenge:** How do you define "quality"? Similarity isn't enough (answer could be similar but wrong).

Better: Use a reference answer + compare:
```python
def test_answer_against_reference():
    query = "What is Karma?"
    answer = agent.run(query).response
    reference_answer = "Karma is the law of cause and effect in Jainism..."
    
    # Compare semantic similarity
    score = semantic_similarity(answer, reference_answer)
    assert score > 0.8
```

**5. Retrieval Quality Tests**

Test that RAG retrieval is working:

```python
def test_retrieval_quality():
    query = "What is Mahavir Jayanti?"
    passages = pinecone.search(embed(query), top_k=8)
    
    # Verify: First passage should contain "Mahavir Jayanti"
    assert "Mahavir Jayanti" in passages[0].text.lower()
    
    # Verify: All passages should be about Jain topics
    for passage in passages:
        assert any(kw in passage.text.lower() for kw in ["jain", "karma", "dharma"])
```

**6. Security Tests (RBAC, Guardrails)**

Test that security controls work:

```python
def test_rbac_prevents_unauthorized_action():
    request = TempleAssistantRequest(
        message="Publish a notification to all members",
        role="devotee",  # Only admin can publish
        user_id="usr_123"
    )
    
    response = run_agent("tmpl_001", request)
    
    assert "not have permission" in response.lower()
```

```python
def test_guardrails_block_malicious_input():
    request = TempleAssistantRequest(
        message="'; DROP TABLE users; --",  # SQL injection
        role="devotee",
        user_id="usr_123"
    )
    
    response = run_agent("tmpl_001", request)
    
    assert "unable to process" in response.lower()
```

**7. Manual Review & Human Evaluation**

Automated tests catch some issues, but human review is essential:

```
For 50 random queries:
  ├─ Run agent
  ├─ Human rates answer: ★★★★★ (excellent) to ★ (poor)
  ├─ Track: % of 4-5 star answers
  └─ Acceptable: >80% of answers are 4+ stars

Metrics:
  ├─ Accuracy: Is the answer correct?
  ├─ Completeness: Does it answer the full question?
  ├─ Relevance: Is it on-topic?
  ├─ Clarity: Is it easy to understand?
  └─ Tone: Is it respectful and warm?
```

**Status:** We don't currently do this. Could add quarterly human evals.

**8. A/B Testing**

Test changes in production with a subset of users:

```
Control group (50% of users):
  ├─ Use old ScriptureAgent (temperature=0.5)

Test group (50% of users):
  └─ Use new ScriptureAgent (temperature=0.4, better prompt)

After 1 week:
  ├─ Measure: % of 4-5 star ratings
  ├─ Control: 78% (baseline)
  ├─ Test: 84% (improvement!)
  └─ Deploy new version to all users
```

---

#### Aagam Mitra's Testing Strategy

**Currently:**
- ✅ Intent routing tests (pytest, deterministic)
- ✅ Tool tests (mock admin service)
- ❌ Answer quality tests (no automated eval)
- ❌ Human evaluation (manual only, when issues reported)
- ❌ A/B testing (no framework)

**Improvements:**
1. Add semantic similarity tests for answer quality
2. Implement quarterly human evaluation (50 queries, rate answers)
3. Add A/B testing framework (compare prompt versions, model versions)
4. Set up continuous evaluation (track metrics over time, alert on degradation)

---

---

# PART 5: MEMORY ARCHITECTURES IN AGENTIC SYSTEMS
## Multi-Layer Memory Design & Production Patterns

### Question 11: How do you design memory layers in agentic systems? What information flows between them?

> **Why asked:** Memory is the backbone of agentic systems. An interviewer asking this wants to see: (1) Do you understand different types of memory (working, conversational, semantic, episodic)? (2) Can you design a memory architecture that scales? (3) Do you think about data lifecycle, privacy, and cost? This is crucial at JPMC, where decisions must be auditable and compliant.

#### The Four-Layer Memory Architecture

Every production agentic system needs **4 distinct memory layers**, each serving a different purpose:

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: SHORT-TERM MEMORY (Working Memory)                │
│ ├─ Lifetime: 1 agent execution (~1-5 seconds)              │
│ ├─ Storage: In-memory (messages list)                       │
│ ├─ Capacity: 4-8K tokens per request                       │
│ └─ Aagam Mitra: Last 8 conversation turns passed to Groq   │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: CONVERSATIONAL MEMORY (Session Memory)             │
│ ├─ Lifetime: 24-48 hours (configurable TTL)                │
│ ├─ Storage: Database + Redis cache                          │
│ ├─ Capacity: 100-1000 messages per user+temple             │
│ └─ Aagam Mitra: Chat history table, auto-trimmed after 30d │
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: SEMANTIC MEMORY (Knowledge Base)                   │
│ ├─ Lifetime: Permanent (versioned)                          │
│ ├─ Storage: Vector database (Pinecone)                      │
│ ├─ Capacity: Millions of passages/embeddings               │
│ └─ Aagam Mitra: ~800 Jain texts, temple events, FAQs       │
├─────────────────────────────────────────────────────────────┤
│ LAYER 4: EPISODIC MEMORY (Audit Trail & Action Log)         │
│ ├─ Lifetime: 90 days - 7 years (compliance)                │
│ ├─ Storage: Audit log (database, S3, CloudWatch)           │
│ ├─ Capacity: Every query ever logged                       │
│ └─ Aagam Mitra: PII-masked query log for debugging & audit │
└─────────────────────────────────────────────────────────────┘
```

---

#### Layer 1: Short-Term Memory (Working Memory)

**Purpose:** Current reasoning context. The agent needs this to think about the current problem.

**What it contains:**
- System prompt (instructions for the agent)
- Last N conversation turns (context for multi-turn reasoning)
- Current user query
- In-flight tool results (accumulated as the agent loops)

**In Aagam Mitra:**

```python
# From BaseAgent.run()
messages = [
    {"role": "system", "content": system_prompt},      # ~500 tokens
    *history[-8:],                                      # Last 8 turns = ~3000 tokens
    {"role": "user", "content": user_message}           # Current query = ~100 tokens
]
# Total: ~3600 tokens per request

# During agent loop (tool-calling):
response = await groq.chat(messages=messages, tools=tools)

if response.finish_reason == "tool_calls":
    # Execute tools in parallel
    results = await asyncio.gather(*[
        execute_tool(tc.function.name, json.loads(tc.function.arguments))
        for tc in response.tool_calls
    ])
    
    # Append tool results to messages (grows working memory)
    messages.append({
        "role": "assistant",
        "content": None,
        "tool_calls": response.tool_calls
    })
    for tool_call, result in zip(response.tool_calls, results):
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result)
        })
    
    # Next iteration sees: system + history + user + tool_result1 + tool_result2
```

**Key insight:** Working memory grows with each tool call. After iteration 3, the messages list might be 6K tokens. This is necessary for reasoning, but expensive (each token costs money).

**Tradeoffs:**
- ✅ Fast (no DB latency)
- ✅ Complete context for complex reasoning
- ❌ Expensive (grows with each tool call)
- ❌ Lost after agent finishes (not persistent)

**Cost impact at scale:**
- Single request: 3600 tokens × $0.0001 per token = $0.36 per request
- 1M requests/day: $360,000/day = $10.8M/month

**Optimization:** Limit to essential history. Aagam Mitra uses last 8 turns, not last 100.

---

#### Layer 2: Conversational Memory (Session Memory)

**Purpose:** Persistent multi-turn context. Users should be able to ask related questions over hours or days without losing context.

**What it contains:**
- Full chat history for (user_id, temple_id)
- Structured as: role, content, timestamp, metadata
- Indexed for fast retrieval

**In Aagam Mitra:**

```python
# Storage schema
class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id: int = Column(Integer, primary_key=True)
    user_id: str = Column(String, index=True)
    temple_id: str = Column(String, index=True)
    role: str = Column(String)  # 'user' | 'assistant'
    content: str = Column(Text)
    timestamp: datetime = Column(DateTime, default=datetime.utcnow)
    metadata: dict = Column(JSON)  # Optional: tool_calls, response_time, etc.

# Retention policy:
# Keep last 100 messages per (user_id, temple_id)
# Expire messages older than 30 days
async def trim_chat_history(user_id: str, temple_id: str):
    # Delete messages beyond 100
    excess = await db.execute(
        delete(ChatHistory)
        .where(
            (ChatHistory.user_id == user_id) &
            (ChatHistory.temple_id == temple_id) &
            (ChatHistory.timestamp < (
                select(ChatHistory.timestamp)
                .where(...)
                .order_by(ChatHistory.timestamp.desc())
                .limit(1)
                .offset(100)  # 100th oldest
            ))
        )
    )
    
    # Delete messages older than TTL
    expired = await db.execute(
        delete(ChatHistory)
        .where(
            (ChatHistory.user_id == user_id) &
            (ChatHistory.timestamp < (datetime.utcnow() - timedelta(days=30)))
        )
    )
```

**Retrieval with caching (critical for performance):**

```python
async def get_conversation_history(user_id: str, temple_id: str, n_turns: int = 8):
    # Try Redis first
    cache_key = f"chat_history:{user_id}:{temple_id}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)  # ~1ms
    
    # Cache miss: fetch from DB
    history = await db.execute(
        select(ChatHistory)
        .where(
            (ChatHistory.user_id == user_id) &
            (ChatHistory.temple_id == temple_id)
        )
        .order_by(ChatHistory.timestamp.desc())
        .limit(n_turns * 2)  # 2 messages per turn (user + assistant)
    )
    
    # Cache for 1 hour
    await redis.setex(cache_key, 3600, json.dumps(history))
    return history
```

**Why it matters:**

User context: "I asked about Karma yesterday. Today I ask 'How does it relate to rebirth?' The agent should remember the earlier discussion."

With Layer 2:
```
Day 1:
  User: "What is Karma?"
  Agent: "Karma is the law of cause and effect..."
  
Day 2:
  User: "How does it relate to rebirth?"
  Agent: (retrieves history) "Based on yesterday's discussion about Karma, 
          rebirth is..."
```

Without Layer 2, the agent would treat it as a new conversation.

**Tradeoffs:**
- ✅ Enables multi-day conversations
- ✅ Persistent context
- ⚠️ Slower than working memory (100-500ms vs <5ms)
- ❌ Privacy risk (stores sensitive queries)
- ❌ Storage cost (every message stored)

**Privacy mitigation:**
```python
# Before storing, mask PII
message_content = mask_pii(user_message)
    # Removes: email, phone, SSN, credit card, etc.
    
# Encrypt at rest
message_encrypted = encrypt(message_content, encryption_key)

# Log with audit trail
audit_log.insert({
    "event": "MESSAGE_STORED",
    "user_id_masked": hash(user_id),
    "content_encrypted": True,
    "timestamp": now()
})
```

---

#### Layer 3: Semantic Memory (Knowledge Base)

**Purpose:** Factual grounding. The agent uses this to answer questions with real information instead of hallucinating.

**What it contains:**
- Embeddings of domain knowledge (texts, FAQs, events, docs)
- Each passage: text + vector + metadata
- Indexed for fast similarity search

**In Aagam Mitra:**

```python
# Data preparation
passages = [
    {
        "id": "jain_sutra_001",
        "text": "Karma is the law of cause and effect in Jainism. Every action has consequences.",
        "source": "Aadigranth",
        "language": "Sanskrit",
        "chunk_index": 0,
        "chunk_size": 800  # characters
    },
    {
        "id": "event_paryushana_2026",
        "text": "Paryushana festival 2026 begins August 20 and lasts 8 days.",
        "source": "temple_events",
        "temple_id": "tmpl_001",
        "event_date": "2026-08-20"
    },
    # ... 800+ more passages
]

# Embedding step (expensive, done offline)
for passage in passages:
    embedding = await gemini.embed_text(passage["text"])  # 2048-dim vector
    passage["embedding"] = embedding

# Storage in Pinecone (vector DB)
pinecone.upsert(
    vectors=[
        (
            passage["id"],
            passage["embedding"],
            passage  # metadata
        )
        for passage in passages
    ],
    namespace="jain-texts"
)

# Retrieval: Semantic search during agent execution
async def search_semantic_memory(query: str, top_k: int = 8):
    query_embedding = await gemini.embed_text(query)  # ~50ms
    
    results = pinecone.query(
        vector=query_embedding,
        top_k=top_k,
        namespace="jain-texts",
        include_metadata=True
    )
    
    # Results: [(id, score, metadata), ...]
    # score = cosine similarity (0-1), higher = more relevant
    
    return [
        {
            "passage": result.metadata["text"],
            "source": result.metadata["source"],
            "relevance_score": result.score
        }
        for result in results
    ]

# Agent use:
# ScriptureAgent calls: search_semantic_memory("What is Karma?")
# → Returns: top 8 passages about Karma
# → Passes to Groq: "Answer based on these passages: [passages]"
# → Groq synthesizes: "Karma is the law of cause and effect, as stated in..."
```

**Hallucination reduction:**

Without Layer 3 (pure LLM):
```
User: "What is Karma?"
Groq (from training data): "Karma is the law of cause and effect. 
                             In Buddhism, it's called 'kamma'..."
Result: Correct but generic. May mix Buddhist and Jain concepts.
Hallucination rate: ~25% (model might invent details)
```

With Layer 3 (RAG):
```
User: "What is Karma?"
Retrieve: ["Karma in Jain texts is...", "Karma leads to rebirth through...", ...]
Groq (grounded in passages): "According to Jain texts, Karma is the law 
                               of cause and effect, binding the soul..."
Result: Specific, grounded, accurate.
Hallucination rate: ~2% (model sticks to retrieved passages)
```

**Tradeoffs:**
- ✅ Drastically reduces hallucinations
- ✅ Scales to millions of documents
- ✅ Enables domain-specific knowledge
- ⚠️ Retrieval quality matters (bad retrieval = bad answer)
- ❌ Stale if knowledge base isn't refreshed
- ❌ Extra latency (embedding + search: 100-200ms)

**Freshness strategy:**

```python
# Strategy 1: Daily batch refresh
@scheduler.scheduled_job('cron', hour=1)  # 1 AM daily
async def refresh_knowledge_base():
    # Fetch latest from sources
    new_passages = []
    new_passages.extend(await fetch_jain_texts())
    new_passages.extend(await fetch_temple_events())
    new_passages.extend(await fetch_faqs())
    
    # Embed and re-upload to Pinecone
    for passage in new_passages:
        passage["embedding"] = await gemini.embed_text(passage["text"])
    
    pinecone.upsert(vectors=[(p["id"], p["embedding"], p) for p in new_passages])

# Strategy 2: Real-time webhooks for critical updates
@app.post("/webhooks/events")
async def on_event_created(event: Event):
    # New temple event published
    embedding = await gemini.embed_text(event.description)
    pinecone.upsert([(event.id, embedding, event.to_dict())])
    # Agent will retrieve it in next query
```

---

#### Layer 4: Episodic Memory (Audit Trail & Action Log)

**Purpose:** Complete accountability. Every decision is logged so it can be replayed, debugged, and audited.

**What it contains:**
- Every query, tool call, and response
- Timing, errors, and metadata
- Structured for querying and compliance

**In Aagam Mitra:**

```python
# Audit log schema
class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id: UUID = Column(UUID, primary_key=True, default=uuid4)
    event_type: str = Column(String)  # 'QUERY_RECEIVED', 'TOOL_CALLED', 'ERROR', 'RESPONSE_SENT'
    user_id_masked: str = Column(String, index=True)  # Hash of user_id for privacy
    temple_id: str = Column(String, index=True)
    role: str = Column(String)  # 'devotee' | 'admin'
    message: str = Column(Text)  # User's query (truncated if >500 chars)
    tools_called: List[str] = Column(JSON)
    response_time_ms: int = Column(Integer)
    error_category: str = Column(String)  # If error: 'GUARDRAIL_BLOCK', 'RBAC_DENIED', 'TOOL_TIMEOUT'
    trace_id: str = Column(String, index=True)  # Links to distributed trace
    created_at: datetime = Column(DateTime, default=datetime.utcnow, index=True)

# Logging throughout agent execution:
# 1. Query received
audit_log.insert({
    "event_type": "QUERY_RECEIVED",
    "user_id_masked": hash(user_id),
    "temple_id": temple_id,
    "role": role,
    "message": user_message[:500],  # Truncate
    "trace_id": trace_id,
    "timestamp": now()
})

# 2. Intent routing
audit_log.insert({
    "event_type": "INTENT_DETECTED",
    "intents": ["scripture", "temple_ops"],  # Detected intents
    "trace_id": trace_id
})

# 3. Tool execution
audit_log.insert({
    "event_type": "TOOL_CALLED",
    "tools_called": ["search_jain_texts", "get_shantidhara_slots"],
    "response_time_ms": 450,
    "trace_id": trace_id
})

# 4. Response sent
audit_log.insert({
    "event_type": "RESPONSE_SENT",
    "response_time_ms": 1212,
    "tools_called": ["search_jain_texts", "get_shantidhara_slots"],
    "trace_id": trace_id,
    "timestamp": now()
})

# If error:
audit_log.insert({
    "event_type": "ERROR",
    "error_category": "GUARDRAIL_BLOCK",
    "message": "Input matched injection pattern",
    "trace_id": trace_id
})
```

**How to use the audit log:**

**Debugging:** User reports "The AI gave me wrong info about Karma."

```python
# Find the request
log_entry = db.select(AuditLog).where(
    (AuditLog.user_id_masked == hash(user_id)) &
    (AuditLog.created_at >= datetime.now() - timedelta(hours=2)) &
    (AuditLog.message.contains("Karma"))
).first()

# Trace it
trace_id = log_entry.trace_id
all_events = db.select(AuditLog).where(AuditLog.trace_id == trace_id)

# Visualize:
QUERY_RECEIVED: "What is Karma?"
  ↓
INTENT_DETECTED: intents=["scripture"]
  ↓
TOOL_CALLED: ["search_jain_texts"]  (response_time_ms: 100)
  ↓
GROQ_CALLED: temperature=0.5, tokens_in=3500, tokens_out=250
  ↓
RESPONSE_SENT: "Karma is..." (response_time_ms: 1200)

Root cause: Retrieved passages were about "karma in Buddhism," not Jainism.
Fix: Improve query expansion in retrieval step.
```

**Compliance:** Regulator asks "Why did you deny this user's request?"

```python
# Find denial event
denial = db.select(AuditLog).where(
    (AuditLog.event_type == "RBAC_DENIED") &
    (AuditLog.user_id_masked == hash(user_id))
).first()

# Explain
print(f"User tried to: {denial.message}")
print(f"User role: {denial.role}")
print(f"Required role: admin")
print(f"Denial reason: Non-admin users cannot access admin features")

# Log retention: 7 years (compliance requirement)
```

**Learning:** Which queries fail most often?

```python
# Analyze error patterns
errors = db.select(AuditLog).where(
    (AuditLog.event_type == "ERROR") &
    (AuditLog.created_at >= datetime.now() - timedelta(days=30))
).all()

error_categories = Counter(e.error_category for e in errors)
# Output:
# GUARDRAIL_BLOCK: 45%
# TOOL_TIMEOUT: 30%
# RBAC_DENIED: 15%
# HALLUCINATION: 10%

# Action: Improve guardrails (most common error)
```

**Tradeoffs:**
- ✅ Complete audit trail (no surprises)
- ✅ Enables root-cause analysis
- ✅ Satisfies compliance requirements
- ⚠️ Storage cost (every request logged)
- ❌ PII risk (must mask sensitive data)
- ❌ Query latency if audit logging is synchronous

**Optimization:**
```python
# Async audit logging (don't block the response)
async def run_agent(...):
    response = await orchestrator.run(...)
    
    # Fire-and-forget audit logging
    asyncio.create_task(audit_log.insert_async({
        "event": "RESPONSE_SENT",
        "response_time_ms": elapsed,
        ...
    }))
    
    return response  # Return immediately, audit log in background
```

---

#### How Layers Interact During Execution

```
User asks: "Book Shantidhara for January 15 and explain its significance"

┌─ LAYER 1: SHORT-TERM (Working Memory)
│  messages = [
│    system_prompt,
│    history[-8:],  ← Retrieved from LAYER 2
│    user_message,
│  ]
│  Pass to Groq
│  (Groq thinks: "I need to book and search for significance")
│
├─ LAYER 2: CONVERSATIONAL (Session Memory)
│  history = await redis.get("chat_history:usr_123:tmpl_001")
│  if not cached:
│    history = await db.select(ChatHistory where user_id=..., limit=8)
│    await redis.set(cache_key, history, ex=3600)
│
├─ LAYER 3: SEMANTIC (Knowledge Base)
│  ScriptureAgent.run():
│    embeddings = await gemini.embed("significance of Shantidhara")
│    passages = await pinecone.query(embeddings, top_k=8)
│    (Gets: 8 passages about Shantidhara ritual meaning)
│
├─ LAYER 4: EPISODIC (Audit Trail)
│  audit_log.insert({
│    event: "QUERY_RECEIVED",
│    message: "Book Shantidhara...",
│    trace_id: "trace_xyz789"
│  })
│
│  audit_log.insert({
│    event: "TOOL_CALLED",
│    tools: ["book_shantidhara_slot", "search_jain_texts"],
│    response_time_ms: 1200,
│    trace_id: "trace_xyz789"
│  })
│
│  audit_log.insert({
│    event: "RESPONSE_SENT",
│    response: "Shantidhara is available on...",
│    trace_id: "trace_xyz789"
│  })
│
└─ User receives answer: "Shantidhara slots are [dates]. Its significance is..."
```

---

#### Memory Layer Tradeoffs at Scale

| Layer | Lifetime | Speed | Cost | Size | Risk |
|-------|----------|-------|------|------|------|
| **Short-term** | 1-5s | <5ms | High ($) | 4-8K tokens | Token overage |
| **Conversational** | 24-48h | 10-100ms | Medium | 100-1K messages | PII exposure |
| **Semantic** | Permanent | 50-200ms | Low | Millions | Stale data |
| **Episodic** | 90d-7y | Async | Medium | All queries | Storage cost |

**For Aagam Mitra scale (100 queries/day):**
- Working memory: 3600 tokens × $0.0001 × 100 = $0.036/day = $1.08/month
- Conversational: 100 messages × 100 users = 10K messages stored = 1-5 MB (negligible)
- Semantic: 800 passages × 2048 dims × 4 bytes = 6.5 GB (one-time, then query cost only)
- Episodic: 100 queries/day × 1KB per log = 100KB/day = 3MB/month

**At JPMC scale (100K queries/day):**
- Working memory: $3600/month (optimize by truncating history)
- Conversational: 100K × 100 users = 10M messages = 50-100 GB (archive old data)
- Semantic: 1M+ passages (cost: Pinecone subscription ~$500/month)
- Episodic: Compressing and archiving becomes critical (compliance requires 7-year retention)

---

#### What JPMC Would Add

At enterprise scale:

1. **Hierarchical Summarization:** Automatically summarize old conversations into topic summaries (reduces Layer 2 size)
2. **Vector Indices per Domain:** Separate semantic memory for credit risk, fraud, trading, compliance
3. **Memory Confidence Scores:** Track which memories are reliable vs speculative
4. **Cross-Agent Memory Sharing:** One agent's episodic memory informs another's decisions
5. **Reasoning Traces:** Store not just tool calls, but *why* the agent called them (reasoning chain)
6. **Memory Compression:** Periodically compress episodic logs (archive old entries, summarize events)
7. **Explainability Layer:** When explaining a decision, trace it back through all 4 memory layers

---

---

## Summary & Interview Tips

This document covers five expert-level domains:

1. **Agentic Design Patterns** — Router, hierarchical, tool-using, reflection, autonomous patterns (Q1-Q4)
2. **Advanced RAG** — Retrieval quality metrics (hit rate, NDCG, MRR), freshness strategies (Q5-Q6)
3. **Enterprise AI Architecture** — Compliance, governance, explainability, scale (Q7-Q8)
4. **Governance & Observability** — Monitoring, cost optimization, testing strategies (Q9-Q10)
5. **Memory Architectures** — 4-layer memory design (working, conversational, semantic, episodic), data lifecycle, production patterns (Q11)

### Key Takeaways for Your Interview:

- **Explain Aagam Mitra's choices:** We use router + tool-using patterns because they're simple and effective for our domain. We don't use hierarchical or reflection patterns (yet) because they'd add complexity we don't need.

- **Show production mindset:** Focus on reliability, cost, compliance, monitoring. Interviewers want to hear about edge cases you've handled, not just happy paths.

- **Connect to JPMC:** DART likely handles higher complexity (financial decisions, regulatory requirements). Show you understand how to scale Aagam Mitra's patterns to enterprise scale—caching, async, Kubernetes, distributed tracing, fairness testing, explainability.

- **Ask smart questions:** Show curiosity about JPMC's architecture, compliance challenges, scale. Questions like "How do you handle regulatory explainability requirements for agent decisions?" are impressive.

- **Use numbers:** "Aagam Mitra saves 80 seconds per user query by running agents in parallel" or "Caching reduces LLM costs by 50%" or "We achieve 92% retrieval quality with semantic search + reranking."

Good luck on Tuesday!
