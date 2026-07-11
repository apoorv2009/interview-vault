# LangGraph & Agent Design — Interview Q&A

> How Aagam Mitra implements LangGraph-like patterns (state, nodes, edges, orchestration) and why agent design matters.

---

## 1. What is LangGraph and how does it differ from LangChain?

> **Why asked:** LangChain is for chains (linear flows), LangGraph is for agents (reasoning loops). Interviewers ask this to test whether you understand when to use each. The key difference: chains execute once, agents loop and make decisions. Aagam Mitra implements LangGraph-like patterns without the library.

**LangChain = Linear pipelines**
```
User Input → Retriever → Prompt → LLM → Parser → Answer
```
Data flows one direction, never loops back. Good for: simple Q&A, RAG.

**LangGraph = Agent reasoning with loops**
```
User Input
  ↓
Agent Reasoning ("What should I do?")
  ↓ (decides: "Search events")
Retrieve Events
  ↓ (evaluates: "Not complete")
Agent Reasoning Again
  ↓ (decides: "Search FAQ")
Retrieve FAQ
  ↓ (evaluates: "Complete now")
Generate Answer
  ↓
Return
```

Agent can loop, make decisions, use different tools based on reasoning.

### Key differences:

| Aspect | LangChain | LangGraph |
|---|---|---|
| **Execution** | Linear, one-way flow | Looping, agent decides next step |
| **Decision-making** | None (fixed pipeline) | Yes (agent reasons) |
| **Tool use** | Can call tools, but chain is predetermined | Agent chooses which tool to call |
| **State** | Data passed through pipeline | Full state object (context, decisions, results) |
| **Complexity** | Simple Q&A, RAG | Complex multi-step queries, reasoning |
| **Use case** | "Answer a question using docs" | "Solve a problem by deciding what to do" |

### Aagam Mitra example

**Scenario 1: Simple (LangChain-like)**
```
User: "When is Diwali?"
  ↓ (Intent detection: SCRIPTURE)
  ↓ (ScriptureAgent selected)
  ↓ (Search Jain texts for "Diwali")
  ↓ (LLM synthesizes answer)
Answer: "Diwali is on November 1st..."
```

Simple one-shot query → use simple LangChain-style chain.

**Scenario 2: Complex (LangGraph-like)**
```
User: "I want to book Shantidhara and also learn about the significance"
  ↓ (Intent detection: TEMPLE_OPS + SCRIPTURE)
  ↓ (Multiple agents selected)
  ↓ [TempleOpsAgent]
    ├─ Call: get_shantidhara_slots()
    ├─ Agent reasoning: "User didn't specify date, should ask"
    ├─ Response: "Available slots: [list]"
  ↓ [ScriptureAgent] (in parallel)
    ├─ Call: search_jain_texts("Shantidhara significance")
    ├─ Response: "Shantidhara is a ritual that..."
  ↓ (Synthesis)
  ├─ Combine both responses
  └─ Return unified answer
```

Multi-intent, multi-agent, parallel execution → LangGraph-like design.

---

## 2. What is state in LangGraph and how do you design it?

> **Why asked:** State is the most important concept in agentic systems — it's what the agent "remembers" across iterations. Interviewers want to see you think carefully about: What information must be tracked? What gets passed between nodes? How do you prevent data loss? This is core system design.

**State = Data structure that persists across agent loop iterations**

In LangGraph, state flows through nodes:

```python
# LangGraph style (hypothetical)
from typing import TypedDict

class AgentState(TypedDict):
    user_input: str           # What user asked
    conversation_history: list  # Previous turns
    retrieved_docs: list      # Docs found
    current_decision: str     # What agent decided
    tool_results: dict        # Tool outputs
    reasoning_trace: list     # Why decisions were made
    final_answer: str         # Final response

# State flows:
Reasoning Node
  ├─ Reads: user_input, conversation_history
  ├─ Writes: current_decision, reasoning_trace
  ↓
Retrieval Node
  ├─ Reads: current_decision, user_input
  ├─ Writes: retrieved_docs
  ↓
Tool Node
  ├─ Reads: current_decision, user_input
  ├─ Writes: tool_results
  ↓
Synthesis Node
  ├─ Reads: all previous data
  ├─ Writes: final_answer
```

Each node can read previous state and write new state.

### Aagam Mitra state design

We follow the same principle with `AgentContext` and `AgentResult`:

```python
# From base.py
@dataclass
class AgentContext:
    """Runtime context — shared across nodes"""
    temple_id: str
    user_id: str
    role: str  # 'devotee' | 'admin'
    temple_name: str

@dataclass
class AgentResult:
    """What each agent returns — contributes to state"""
    response: str
    agent_name: str
    tools_called: list[str]

# Agent loop maintains implicit state:
messages: list[dict] = [
    {"role": "system", "content": system_prompt},  # Instructions
]
# Add history
for h in history[-8:]:
    messages.append(h)  # 'Context' in state
messages.append({"role": "user", "content": user_message})

# Loop iteration 1:
response = await _call_groq(messages, tools)  # Read: messages, tools
if finish_reason == "tool_calls":
    results = await execute_tools(tool_calls)
    messages.append({"role": "tool", "content": json.dumps(results)})  # Write: messages

# Loop iteration 2:
response = await _call_groq(messages, tools)  # Read: updated messages

# After loop:
return AgentResult(answer, agent_name, tools_called)
```

**Key state elements:**

| State | What it holds | When it updates |
|---|---|---|
| `messages` | Conversation history + tool results | After each iteration |
| `tools` | Available tools for this agent | Set once at start |
| `context` | Temple/user/role info | Set once at start |
| `tools_called` | Which tools were executed | After each tool call |
| `tools_called` | Which tools were executed | After each tool call |

**Design principle:** State should contain everything needed for the next iteration. If a node can't access it from state, the loop will break.

---

## 3. What are nodes and edges in LangGraph?

> **Why asked:** Nodes and edges are the building blocks of agent graphs. Nodes are "what happens," edges are "when to move." This tests whether you can design complex workflows. For Aagam Mitra, specialist agents are nodes, and intent detection is edges.

**Nodes = Functions that do work**
**Edges = Connections between nodes (determine flow)**

### LangGraph example (hypothetical)

```python
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    query: str
    retrieved_docs: list
    agent_decision: str
    final_answer: str

# Define nodes
def retrieval_node(state: AgentState) -> AgentState:
    """Retrieve docs from vector DB"""
    docs = retriever.get_relevant_documents(state["query"])
    state["retrieved_docs"] = docs
    return state

def reasoning_node(state: AgentState) -> AgentState:
    """Agent reasons: What tool to use?"""
    decision = llm.invoke(f"Decide tool for: {state['query']}")
    state["agent_decision"] = decision
    return state

def answer_node(state: AgentState) -> AgentState:
    """Generate final answer"""
    answer = llm.invoke(f"Answer based on: {state['retrieved_docs']}")
    state["final_answer"] = answer
    return state

# Build graph
graph = StateGraph(AgentState)
graph.add_node("retrieve", retrieval_node)
graph.add_node("reason", reasoning_node)
graph.add_node("answer", answer_node)

# Add edges (flow)
graph.add_edge("retrieve", "reason")        # After retrieval, go to reasoning
graph.add_edge("reason", "answer")          # After reasoning, go to answer
graph.add_edge("answer", END)               # After answer, done

# Conditional edge (decision point)
def should_loop(state):
    if state["agent_decision"] == "search_again":
        return "retrieve"  # Loop back
    return "answer"  # Continue

graph.add_conditional_edges("reason", should_loop)

# Compile and run
agent = graph.compile()
result = agent.invoke(initial_state)
```

### Aagam Mitra node/edge design

We implement this differently (no LangGraph library), but same concept:

```python
# Nodes = Specialist agents
class ScriptureAgent(BaseAgent):
    async def run(self, message, history, context) -> AgentResult:
        # This is a "node" — takes state, returns result
        # Internally: retrieval node → reasoning loop → tool execution → answer

class TempleOpsAgent(BaseAgent):
    async def run(self, message, history, context) -> AgentResult:
        # Another "node"

# Edges = OrchestratorAgent routing
class OrchestratorAgent:
    async def run(self, user_message, history, context):
        intents = _detect_intents(user_message)  # Detect edges
        
        # Single agent (simple flow)
        if len(intents) == 1:
            agent = _AGENTS[intents[0]]
            result = await agent.run(...)  # Follow edge to agent
            return result.response, result.tools_called
        
        # Multiple agents (parallel edges)
        tasks = [_AGENTS[intent].run(...) for intent in intents]
        results = await asyncio.gather(*tasks)  # Run in parallel
        
        # Synthesis node (combine results)
        synthesised = await _synthesise(..., results)
        return synthesised, all_tools

# Flow:
User Input
  ↓ [EDGE: intent detection]
    ├─ Intent: SCRIPTURE → [NODE: ScriptureAgent]
    ├─ Intent: TEMPLE_OPS → [NODE: TempleOpsAgent]
  ↓ [EDGE: parallel execution]
    └─ [NODE: Synthesis] — combine responses
  ↓
Final Answer
```

**Key insight:** Edges determine which node runs next. They can be:
- **Simple:** Always go to next node (sequential)
- **Conditional:** Decide based on state (if/else)
- **Parallel:** Run multiple nodes simultaneously

---

## 4. Explain the agent loop and why it matters.

> **Why asked:** The agent loop (decide → act → observe → loop) is the soul of agentic systems. Interviewers want to see you understand that agents are different from chains because they can reason, make mistakes, recover. This is high-level thinking about system design.

**The Agent Loop = Reason → Act → Observe → Decide → Loop**

```
Iteration 1:
  Reason: "User asked about Diwali. I should search texts."
  Act: Call search_jain_texts("Diwali")
  Observe: Got 8 passages about Diwali
  Decide: "I have enough info, time to answer"

Iteration 2:
  Reason: "I have passages. Now I'll synthesize answer"
  Act: Call LLM to synthesize answer
  Observe: Got coherent answer
  Decide: "Done!"

Return answer
```

Each iteration builds on previous one.

### Why loops matter

**Without loops (just LLM):**
```python
docs = retriever.search(query)
answer = llm.invoke(f"Based on {docs}, answer {query}")
# If docs aren't enough, no way to fix it — answer is deterministic
```

**With loops (agent):**
```python
for iteration in range(max_iterations):
    response = llm.invoke(prompt)  # Reason
    
    if response.finish_reason == "tool_calls":
        results = execute_tools(response.tool_calls)  # Act
        messages.append(tool_results)  # Observe
        # Loop back, LLM sees tool results and can refine
    else:
        return response.content  # Decide: done
```

Agent can:
- ✅ Realize its docs weren't complete → call another tool
- ✅ See tool failed → try different tool
- ✅ Evaluate its own work → refine if needed

### Aagam Mitra agent loop

```python
# From BaseAgent.run()
async def run(self, user_message, history, context) -> AgentResult:
    tools = self.get_tools(context.role)  # Agent setup
    messages = [system_prompt, history, user_message]
    
    for iteration in range(self.max_iterations):  # The loop
        # REASON
        response = await self._call_groq(messages, tools)
        finish_reason = response["choices"][0]["finish_reason"]
        
        if finish_reason == "tool_calls":
            # ACT — call tools
            tool_calls = response["message"]["tool_calls"]
            results = await asyncio.gather(
                *[self._execute_tool(tc, context) for tc in tool_calls]
            )
            
            # OBSERVE — add results to state
            for tc, result in zip(tool_calls, results):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result)
                })
            # Loop continues — LLM sees results
        
        elif finish_reason == "stop":
            # DECIDE — I'm done
            answer = response["message"]["content"]
            return AgentResult(answer, self.name, tools_called)
        
        else:
            break
    
    return AgentResult("Unable to process", self.name, tools_called)
```

**Loop in action:**

```
Iteration 1:
  LLM sees: "User asked: 'Book Shantidhara and tell about it'"
  LLM decides: "I need two tools — book_slot and search_texts"
  Tools called: get_shantidhara_slots, search_jain_texts

Iteration 2:
  LLM sees: Previous results + tool outputs
  LLM decides: "I have slot info and text info. Time to answer"
  finish_reason: "stop"
  
Return: Synthesized answer about booking + Shantidhara significance
```

**Without the loop:** LLM would only see original message, couldn't incorporate tool results.

---

## 5. How do you handle multi-agent orchestration?

> **Why asked:** This is real-world complexity. Most real apps need multiple agents working together. Interviewers want to see you think about: coordination (parallel vs sequential), conflict resolution (what if agents disagree?), data aggregation (how to combine results). Aagam Mitra's orchestrator is a great example.

**Multi-agent orchestration = Running multiple agents and combining results**

### Patterns:

**Pattern 1: Sequential (one agent at a time)**
```
User Input
  ↓
Select Agent 1
  ├─ Run Agent 1
  ├─ Get result
  ↓
Select Agent 2
  ├─ Run Agent 2
  ├─ Get result
  ↓
Combine results
  ↓
Return
```

**Pattern 2: Parallel (all at once)**
```
User Input
  ↓
Select Agents 1, 2, 3
  ├─ Run Agent 1 (async)
  ├─ Run Agent 2 (async)
  ├─ Run Agent 3 (async)
  ↓ (wait for all)
Combine results
  ↓
Return
```

### Aagam Mitra orchestration (Parallel)

```python
# From orchestrator.py
async def run(self, user_message, history, context):
    intents = _detect_intents(user_message)  # Detect which agents needed
    
    # Single agent — simple case
    if len(intents) == 1:
        agent = _AGENTS[intents[0]]
        result = await agent.run(user_message, history, context)
        return result.response, result.tools_called
    
    # Multiple agents — parallel execution
    tasks = [
        _AGENTS[intent].run(user_message, history, context)
        for intent in intents
    ]
    results: list[AgentResult] = await asyncio.gather(*tasks)  # Run in parallel!
    
    # Combine results
    synthesised = await _synthesise(user_message, results, history)
    
    all_tools = []
    for r in results:
        all_tools.extend(r.tools_called)
    
    return synthesised, all_tools
```

**Key insight:** `asyncio.gather()` runs all agents concurrently. If each takes 1 second:
- Sequential: 3 seconds total
- Parallel: 1 second total (3x faster!)

### Multi-agent example

```
User: "Book Shantidhara and tell me about its significance"

Intent detection:
  ├─ TEMPLE_OPS (booking)
  └─ SCRIPTURE (significance)

Parallel execution:
  ├─ TempleOpsAgent.run()
  │  ├─ get_shantidhara_slots()
  │  ├─ "Available slots: [list]"
  │
  └─ ScriptureAgent.run()
     ├─ search_jain_texts("Shantidhara")
     └─ "Shantidhara is a ritual that..."

Synthesis (combine):
  "You can book Shantidhara on these dates: [list].
   The ritual is significant because: [explained]"

Return to user
```

### Challenges in multi-agent systems

| Challenge | Solution |
|---|---|
| **Agents give conflicting info** | Synthesis LLM resolves conflicts |
| **One agent fails** | Return partial results + error message |
| **Latency** | Run in parallel, not sequential |
| **Token overload** | Limit history + synthesis prompt size |
| **Hallucination from one agent** | Validate tool outputs before synthesis |

---

## 6. Why build custom vs using LangGraph?

> **Why asked:** This gets at framework decisions. When do you use a library vs build custom? Interviewers value clear trade-off analysis. Aagam Mitra built custom agents — why? What did we gain? What did we sacrifice?

### LangGraph (Use the library)

```python
from langgraph.graph import StateGraph

graph = StateGraph(AgentState)
graph.add_node("retrieve", retrieval_node)
graph.add_edge("retrieve", "reason")
graph.add_conditional_edges("reason", should_loop)
agent = graph.compile()
result = agent.invoke(initial_state)
```

**Pros:**
- ✅ 2-3 days to build (vs 2-3 weeks)
- ✅ Designed specifically for agents
- ✅ Built-in state management
- ✅ Visualization tools
- ✅ Community support
- ✅ Battle-tested

**Cons:**
- ❌ Library dependency
- ❌ Less control over details
- ❌ Learning curve (new paradigm)
- ❌ Opinionated (you follow LangGraph's way)

### Custom agents (What Aagam Mitra does)

```python
class BaseAgent:
    async def run(self, message, history, context):
        for iteration in range(self.max_iterations):
            response = await self._call_groq(messages, tools)
            # ... loop logic ...

class OrchestratorAgent:
    async def run(self, user_message, history, context):
        intents = _detect_intents(user_message)
        # ... routing logic ...
```

**Pros:**
- ✅ Full control (implement exactly what we need)
- ✅ Lightweight (only 5 dependencies)
- ✅ No learning curve (just Python)
- ✅ Easy to debug (we wrote it)
- ✅ Custom behaviors (120-word minimum, role-based tools, parallel execution)

**Cons:**
- ❌ 2-3 weeks to build + test
- ❌ More code to maintain
- ❌ No visualization tools
- ❌ Smaller community

### Why Aagam Mitra chose custom

1. **We needed custom quality enforcement**
   - ScriptureAgent minimum 120 words per answer
   - LangGraph doesn't have "enforce minimum output length" out of the box

2. **Role-based tool access (RBAC)**
   - Devotees see booking tools, admins see everything
   - Each agent's `get_tools(role)` returns different tools
   - LangGraph doesn't model permission per agent

3. **Parallel orchestration**
   - Multiple agents running simultaneously
   - Intent detection routing
   - Synthesis of multiple responses
   - This is possible with LangGraph but requires careful setup

4. **Lightweight dependencies**
   - We import only what we use
   - No transitive dependencies from a massive library
   - Easier to understand the full system

5. **Learning value**
   - Team understands *how* agents work
   - Easier to reason about bugs
   - Easier to explain to stakeholders

### If we built it today...

We might use LangGraph because:
- ✅ Team is already familiar (it's now standard)
- ✅ Faster time-to-market is important
- ✅ Maintenance burden is shared with community
- ✅ Visualization is helpful for debugging

But we'd lose some flexibility:
- ❌ Harder to enforce 120-word minimum
- ❌ Harder to do role-based tool access
- ❌ Harder to customize parallel execution

---

## Summary: From LangChain to LangGraph to Aagam Mitra

| Aspect | LangChain | LangGraph | Aagam Mitra |
|---|---|---|---|
| **Execution** | Linear chains | Looping agents | Custom loop + orchestration |
| **State** | Implicit (data in pipeline) | Explicit `State` dict | `AgentContext` + message history |
| **Nodes** | Components (Retriever, LLM, Parser) | Functions (each a node) | Specialist agents (classes) |
| **Edges** | Automatic (pipe operator) | Explicit (add_edge) | Intent detection + routing |
| **Tools** | Through agent interface | Defined in state | `get_tools()` method per agent |
| **Multi-agent** | Not designed for it | Possible, but complex | Native (Orchestrator) |
| **Library** | ~50 dependencies | ~10 dependencies | ~5 dependencies |
| **Control** | Medium | High | Very high |
| **Speed to MVP** | 1-2 weeks | 2-3 weeks | 2-3 weeks (no library learning) |

**Key insight:** Whether you use LangChain, LangGraph, or build custom, the principles are the same:
- ✅ Standardize component interfaces
- ✅ Model computation as a graph (nodes + edges)
- ✅ Manage state explicitly
- ✅ Handle errors gracefully
- ✅ Make decisions based on reasoning, not just input

Aagam Mitra proves you can build a sophisticated, production-grade agent system without depending on these libraries — if you understand the principles behind them.
