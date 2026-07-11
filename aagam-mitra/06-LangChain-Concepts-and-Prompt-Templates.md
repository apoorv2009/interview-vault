# LangChain Concepts & Prompt Templates — Interview Q&A

> How Aagam Mitra implements LangChain patterns (prompts, chains, RAG) and why we chose to build our own vs using LangChain directly.

---

## 1. What is LangChain and why is it useful?

> **Why asked:** LangChain is the most popular LLM framework right now. Interviewers ask this to see if you understand the problem it solves (standardization, reusability, composition) vs just knowing it exists. The clearest answer compares "before" and "after" — scattered LLM code vs organized, reusable chains.

**LangChain = Framework for standardizing and composing LLM applications**

It solves four key problems:

### Problem 1: Different LLMs have different APIs
```python
# Without LangChain (❌ 3 different APIs)
# Groq
client = Groq(api_key="...")
response = client.chat.completions.create(...)

# OpenAI
client = OpenAI(api_key="...")
response = client.chat.completions.create(...)

# Claude
client = Anthropic(api_key="...")
message = client.messages.create(...)

# With LangChain (✅ Same interface for all)
from langchain_groq import ChatGroq
llm = ChatGroq(model="mixtral-8x7b-32768")
response = llm.invoke(prompt)

# Switch to OpenAI — change 1 line:
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4")
response = llm.invoke(prompt)  # Same code!
```

### Problem 2: Prompts are scattered throughout code
```python
# Without LangChain (❌ Inconsistent)
prompt1 = f"You are a temple expert. Question: {q}"
prompt2 = f"Answer this about temples: {q}"  # Different format!
prompt3 = f"Temple Q&A — Q: {q}"  # Different format!

# With LangChain (✅ Single source of truth)
template = ChatPromptTemplate.from_template(
    "You are a temple expert. Question: {question}"
)
# Use everywhere — consistent format
```

### Problem 3: Connecting components is manual
```python
# Without LangChain (❌ Manual plumbing)
docs = retriever.search(query)
context = format_docs(docs)
prompt = build_prompt(context, query)
response = llm.invoke(prompt)
answer = parse_response(response)

# With LangChain (✅ Chain operator)
chain = retriever | prompt | llm | parser
answer = chain.invoke({"query": query})
```

### Problem 4: No standard patterns for common tasks
```python
# Without LangChain (❌ Build from scratch)
# 50+ lines to build RAG: retriever setup, prompt formatting,
# error handling, token counting, memory management...

# With LangChain (✅ Pre-built templates)
from langchain.chains import RetrievalQA
qa = RetrievalQA.from_chain_type(llm, retriever=retriever)
answer = qa.run("When is Diwali?")
# Done in 3 lines!
```

**Key insight for Aagam Mitra:** We built our own agent framework (custom BaseAgent class) that implements *LangChain-like patterns* without depending on LangChain. This gives us full control and lighter dependencies, but we follow the same design principles: standardized LLM interface, reusable prompts, composable tools.

---

## 2. What is a prompt template and why is it important?

> **Why asked:** Prompt engineering is now a core skill. Interviewers want to see you understand prompts as *controlled structures* not *magic strings*. The impressive answer shows: templates keep prompts consistent, testable, and maintainable. For Aagam Mitra, you use prompt templates in every agent (system_prompt method).

### What is a prompt template?

A prompt template = **reusable blueprint with placeholders**

It has two parts:
- **Static content:** Stays the same every time (instructions, role definition)
- **Dynamic content:** Changes per query (the actual question, context)

```
Template:
"You are {role}. Context: {context}. Question: {question}"

Use 1:
format_with(role="temple expert", context="Diwali info", question="When?")
→ "You are temple expert. Context: Diwali info. Question: When?"

Use 2:
format_with(role="temple expert", context="Prayer times", question="Opening hours?")
→ "You are temple expert. Context: Prayer times. Question: Opening hours?"

Same template, different outputs!
```

### Why templates matter

| Without templates | With templates |
|---|---|
| ❌ Inconsistent prompt formatting | ✅ Every query same structure |
| ❌ Prompts scattered in code | ✅ Prompts centralized |
| ❌ Hard to test different versions | ✅ Easy A/B test templates |
| ❌ Duplicate prompt logic | ✅ Single source of truth |
| ❌ Hard to maintain | ✅ Change once, affects all |

### Aagam Mitra example: ScriptureAgent system prompt

```python
# From scripture.py — this IS a prompt template
_SYSTEM_PROMPT = f"""You are the Scripture specialist of Aagam Mitra.
Today is {date.today().isoformat()}.

YOUR ROLE:
- Answer questions about Jain dharma and sacred texts
- Always search the knowledge base before answering
- Synthesise retrieved passages — never copy verbatim

RESPONSE STRUCTURE:
  1. Context / Background (why this matters)
  2. Sacred Text / Concept
  3. Meaning Explained (literal + philosophical)
  4. Practical Wisdom (how to apply)

QUALITY RULES:
- Minimum 120 words for scripture questions
- Use numbered lists for multi-part answers
- Never fabricate — use only retrieved content
"""

# This prompt is used in: BaseAgent.run() → messages[0]["content"] = system_prompt(role)
```

**Why this template works:**
- ✅ Injected date for temporal grounding
- ✅ Clear role definition
- ✅ Explicit response structure (enforced quality)
- ✅ Guardrails (don't fabricate, only use retrieved content)
- ✅ Reused for every Scripture query without modification

---

## 3. Explain the RAG pattern (Retrieval-Augmented Generation).

> **Why asked:** RAG is the most common pattern for grounding LLMs in real data. Interviewers ask this to see if you understand: retrieval alone isn't enough (must get GOOD docs), the prompt must frame context clearly, and the LLM must know to use the context. For Aagam Mitra, you use RAG in ScriptureAgent — Pinecone search + prompt injection.

**RAG = Retrieval + Augmentation + Generation**

```
Step 1: RETRIEVAL — Get relevant docs
  User: "What does Mahavira teach about ahimsa?"
  Search Pinecone: embed query → find 8 similar passages
  Retrieved: [
    "Mahavira taught that ahimsa (non-violence) is the highest vow...",
    "The five Mahavratas include ahimsa as the first...",
    "Ahimsa means not harming any living being..."
  ]

Step 2: AUGMENTATION — Add docs to prompt
  Template: "Context: {context}\nQuestion: {question}"
  Formatted: "Context: [8 passages]\nQuestion: What does Mahavira teach about ahimsa?"

Step 3: GENERATION — LLM synthesizes answer
  LLM: "Mahavira taught that ahimsa (non-violence) is the foundation of Jain dharma.
        The five Mahavratas include ahimsa as the first... [synthesized answer]"

Result: ✅ Answer grounded in retrieved text, not hallucinated
```

### Why RAG matters

| Without RAG | With RAG |
|---|---|
| ❌ LLM answers from training data (outdated, generic) | ✅ LLM answers from live knowledge base |
| ❌ No way to cite sources | ✅ Can trace answer to source passages |
| ❌ Answer may be wrong or hallucinated | ✅ Answer grounded in real data |
| ❌ Can't update knowledge without retraining | ✅ Update vector DB, answers improve immediately |

### Aagam Mitra RAG implementation

```python
# From scripture.py
def get_tools(self, role: str) -> list[dict]:
    return [{
        "type": "function",
        "function": {
            "name": "search_jain_texts",
            "description": "Search Jain Agam scripture knowledge base (Pinecone RAG)",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"],
            },
        },
    }]

# From tools.py
async def tool_search_jain_texts(query: str) -> dict:
    embedding = (await embed_texts([query]))[0]  # Embed query
    index = get_index()  # Get Pinecone index
    results = index.query(vector=embedding, top_k=8)  # Search
    return {
        "found": True,
        "passages": [  # Return top 8 passages
            {"source": m.metadata.get("source"), "text": m.metadata.get("text")}
            for m in results.matches
        ]
    }

# Flow:
# 1. User asks "What is ahimsa?"
# 2. ScriptureAgent calls tool: search_jain_texts("ahimsa")
# 3. Tool embeds query, queries Pinecone, returns 8 passages
# 4. LLM sees: "Here are passages about ahimsa: [passages]"
# 5. LLM synthesizes answer based on actual knowledge base
```

**Key numbers:**
- Pinecone index: ~5000 Jain scripture passages
- Search model: Google Gemini Embeddings (multilingual)
- Top-k: 8 passages per query
- Response latency: 200-400ms (Pinecone) + 600-1200ms (Groq synthesis)

---

## 4. How would you implement RAG with LangChain vs. building it yourself?

> **Why asked:** This gets at the core decision: when to use a framework vs. building custom. Interviewers want to hear trade-offs: LangChain is faster to build but less flexible; building yourself takes longer but gives full control. Your answer should show you understand both paths.

### With LangChain (Fast, less control)

```python
from langchain_pinecone import PineconeVectorStore
from langchain.chains import RetrievalQA
from langchain_groq import ChatGroq

# Set up
vectorstore = PineconeVectorStore(index_name="aagam-mitra")
retriever = vectorstore.as_retriever(k=8)
llm = ChatGroq(model="mixtral-8x7b-32768")

# Create RAG chain in 3 lines!
qa = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",  # Stuff all docs into prompt
    retriever=retriever
)

# Use it
answer = qa.run("What is ahimsa?")
```

**Pros:**
- ✅ 5-10 minutes to implement
- ✅ Built-in error handling
- ✅ Easy to swap components
- ✅ Less code to maintain

**Cons:**
- ❌ Less control over prompt structure
- ❌ Harder to enforce custom response format (120-word minimum)
- ❌ Harder to customize tool behavior
- ❌ Heavy dependency (entire LangChain library)

### Building it yourself (Slower, full control)

```python
# From Aagam Mitra (simplified)
class ScriptureAgent(BaseAgent):
    def system_prompt(self, role):
        return f"""You are Scripture specialist.
        QUALITY RULES: Min 120 words, use structured format..."""
    
    def get_tools(self, role):
        return [{
            "name": "search_jain_texts",
            "description": "Search Jain texts",
            "parameters": {...}
        }]
    
    async def tool_dispatch(self, tool_name, args, context):
        if tool_name == "search_jain_texts":
            embedding = await embed_texts([args["query"]])
            results = await pinecone_query(embedding)
            return {"passages": results}

# Use it
agent = ScriptureAgent()
answer = await agent.run(user_message, history, context)
```

**Pros:**
- ✅ Full control over every detail
- ✅ Can enforce exact response format
- ✅ Lighter dependencies
- ✅ Custom behaviors (like 120-word min)
- ✅ Parallel tool execution (we run all tools at once)

**Cons:**
- ❌ 2-3 weeks to build + test
- ❌ More code to maintain
- ❌ Must handle errors yourself
- ❌ Must implement composition yourself

### Decision: Why Aagam Mitra built custom

**We chose to build custom because:**

1. **Quality requirements needed custom enforcement**
   - ScriptureAgent requires minimum 120 words per answer
   - Hard to enforce with LangChain's generic chain
   
2. **Multi-agent orchestration**
   - Needed intelligent routing (keyword-based intent detection)
   - Needed parallel agent execution
   - LangChain agents are single-threaded by default
   
3. **Role-based tool access**
   - Devotee vs Admin roles see different tools
   - Easier to control in custom BaseAgent.get_tools(role)
   
4. **Simpler dependencies**
   - Aagam Mitra only needs: httpx, embedding client, Pinecone client, Groq client
   - LangChain brings 50+ transitive dependencies
   
5. **Learning value**
   - Building from scratch teaches you *how* agents work
   - Easier to debug when you wrote the agent loop

**If we were starting a new project, we might use LangChain because:**
- ✅ Faster time-to-market (hours vs weeks)
- ✅ Maintained by the community
- ✅ Better documentation
- ✅ Easier onboarding for junior developers

---

## 5. What is a chain and how do you compose them?

> **Why asked:** Chains are how LangChain models computation as a pipeline. This question tests whether you understand functional composition — connecting independent components so data flows through them. The answer should include concrete Aagam Mitra examples.

**A chain = series of components connected in sequence**

In LangChain, you compose chains with the pipe operator `|`:

```python
from langchain.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain.output_parsers import StrOutputParser

# Define components
template = "You are a {role}. Question: {question}"
prompt = ChatPromptTemplate.from_template(template)

llm = ChatGroq(model="mixtral-8x7b-32768")

parser = StrOutputParser()  # Extract string from LLM response

# Compose into chain
chain = prompt | llm | parser

# Use chain
result = chain.invoke({
    "role": "temple expert",
    "question": "When is Diwali?"
})
```

**Flow:**
```
Input: {"role": "temple expert", "question": "When is Diwali?"}
  ↓
[prompt] → "You are a temple expert. Question: When is Diwali?"
  ↓
[llm] → "Diwali is on November 1st, 2024..."
  ↓
[parser] → "Diwali is on November 1st, 2024..."
  ↓
Output: "Diwali is on November 1st, 2024..."
```

### How Aagam Mitra chains components

We don't use LangChain syntax, but we chain operations:

```python
# From BaseAgent.run()
async def run(self, user_message, history, context):
    tools = self.get_tools(context.role)  # 1. Get tools
    
    messages = [
        {"role": "system", "content": self.system_prompt(context.role)},  # 2. Inject system prompt
        ...history[-8 turns]...,  # 3. Add history
        {"role": "user", "content": user_message}  # 4. Add user message
    ]
    
    for iteration in range(self.max_iterations):
        response = await self._call_groq(messages, tools)  # 5. Call Groq
        
        if finish_reason == "tool_calls":
            results = await asyncio.gather(  # 6. Execute tools in parallel
                *[self._execute_tool(tc, context) for tc in tool_calls]
            )
            messages.append(...)  # 7. Add tool results
        elif finish_reason == "stop":
            return AgentResult(response, ...)  # 8. Return answer

# This is a "chain" of steps:
# Get tools → Format prompt → Call LLM → Decide (tool or answer?)
#   → If tool: Execute → Loop
#   → If answer: Return
```

**Key insight:** Whether you use LangChain's pipe operator or build custom, you're still composing a chain of operations. The principle is the same — connect components so data flows through them smoothly.

---

## 6. How do you handle errors in LLM applications?

> **Why asked:** LLMs fail in unique ways (hallucination, malformed tool calls, timeouts). Interviewers want to see you've thought about resilience. The impressive answer shows specific error types and concrete handling strategies.

**Common error types:**

| Error | Cause | Fix |
|---|---|---|
| **Malformed tool args** | LLM generates invalid JSON | `try/except json.JSONDecodeError` → return error dict |
| **Tool execution fails** | API timeout, permission denied | Wrap tool in try/except, return `{"error": "..."}` |
| **LLM timeout** | Model overloaded | Retry with exponential backoff |
| **Hallucinated tool call** | LLM calls tool that doesn't exist | Check tool name against `get_tools()` first |
| **Infinite loop** | Agent keeps calling tools | Set `max_iterations` limit |
| **Empty response** | LLM returns blank | Check `(content or "").strip()`, return default message |

### Aagam Mitra error handling

```python
# From BaseAgent._execute_tool()
async def _execute_tool(self, tool_call: dict, context: AgentContext) -> dict:
    name = tool_call["function"]["name"]
    
    # Error 1: Malformed JSON
    try:
        args = json.loads(tool_call["function"]["arguments"])
    except json.JSONDecodeError:
        args = {}  # Fallback: empty args
    
    # Error 2: Tool execution fails
    try:
        return await self.tool_dispatch(name, args, context)
    except Exception as exc:
        return {"error": f"Tool '{name}' failed: {exc}"}

# From orchestrator.py (synthesis)
async def _synthesise(...):
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(...)
            r.raise_for_status()
    except httpx.HTTPError as exc:
        return f"Error synthesizing response: {exc}"

# From agent.py (guardrails)
try:
    check_input_guardrails(request.message)
except GuardrailViolation as exc:
    audit_log("GUARDRAIL_BLOCK", ...)
    return "I'm unable to process that request."  # Safe fallback
```

**Best practices:**

1. **Always have a fallback** — If tool fails, return error dict, not exception
2. **Set timeouts** — Groq API timeout = 60s, upstream services = 30s
3. **Log errors** — Every error gets audit logged (for debugging)
4. **Limit iterations** — Max 5 iterations prevents infinite loops
5. **Validate before executing** — Check tool exists before calling

---

## Summary: LangChain principles in Aagam Mitra

| Principle | LangChain way | Aagam Mitra way |
|---|---|---|
| **Standardized LLM interface** | All LLMs have `.invoke(prompt)` | All agents have `async def run(message, history, context)` |
| **Reusable components** | Chains composed with \| operator | Tools defined as dicts, reused across agents |
| **Prompt templates** | `ChatPromptTemplate.from_template()` | `system_prompt(role)` method per agent |
| **Tool execution** | LangChain agent loop | `BaseAgent.run()` with tool dispatch loop |
| **Error handling** | Built into LangChain | Custom try/catch + fallbacks |
| **Composability** | Chains easily swappable | Each agent is a specialist, routed by orchestrator |

**Key takeaway:** We built our own framework instead of using LangChain because we needed full control over quality enforcement and multi-agent orchestration. But we followed the same design patterns LangChain popularized — standardization, composability, reusability.
