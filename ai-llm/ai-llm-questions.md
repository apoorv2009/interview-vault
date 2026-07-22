# AI / LLM Concepts — Interview Preparation

**Project Context**: Capital Access, S&P Global + personal RAG community app
**Audience Level**: Senior Developer / Architect
**Last Updated**: June 27, 2026

> These questions came up in real interviews when discussing AI tooling experience, Copilot usage, and building LLM-powered applications.

---

## Table of Contents

1. [What is a context window?](#q1-what-is-a-context-window-in-an-llm-and-what-happens-when-you-exhaust-it)
2. [How do you choose which LLM to use?](#q2-how-do-you-choose-which-llm-to-use-for-a-given-task)
3. [What prompting techniques reduce token usage?](#q3-what-prompting-techniques-do-you-use-to-write-efficient-prompts)
4. [What is an AI agent / agentic mode?](#q4-what-is-an-ai-agent-what-is-agentic-mode)
5. [What is RAG?](#q5-what-is-rag-retrieval-augmented-generation-how-does-it-work)
6. [How do you make RAG context-aware across conversation turns?](#q6-how-do-you-make-rag-context-aware-across-conversation-turns)
7. [How do you validate whether the generated SQL query is correct?](#q7-how-do-you-validate-whether-the-generated-sql-query-is-correct)
8. [How do you handle infinite loops in an AI agent?](#q8-how-do-you-handle-infinite-loops-in-an-ai-agent)
9. [Why did you choose ChromaDB instead of PostgreSQL or MongoDB?](#q9-why-did-you-choose-chromadb-instead-of-postgresql-or-mongodb)
10. [How do you implement tracing in your AI application?](#q10-how-do-you-implement-tracing-in-your-ai-application)
11. [Have you used OpenTelemetry, LangSmith, LangChain, or LangGraph?](#q11-have-you-used-opentelemetry-langsmith-langchain-or-langgraph)
12. [What frameworks are available for building Agentic AI?](#q12-what-frameworks-are-available-today-to-build-agentic-ai-applications)
13. [How do multiple AI agents coordinate?](#q13-how-do-multiple-ai-agents-coordinate-with-each-other)
14. [What are the operations of an AI agent?](#q14-what-are-the-operations-of-an-ai-agent)
15. [How would you expose your AI system to another AI agent?](#q15-how-would-you-expose-your-ai-system-to-another-ai-agent)
16. [Memory types: what memory did your AI agent use?](#q16-what-type-of-memory-did-your-ai-agent-use-and-disadvantages-of-storing-context-in-memory)

---

### Q1. What is a context window in an LLM, and what happens when you exhaust it?

The context window is the maximum amount of text (measured in tokens) that a model can hold in its "working memory" at one time. It includes everything the model can see: the system prompt, the conversation history, and the current user message. Everything outside the window is invisible to the model.

A token is roughly 3–4 characters or about 0.75 words. GPT-4o has a 128k token window; Claude models go up to 200k. Larger windows let you pass in more documents, longer conversations, or bigger codebases.

When you exhaust the context window in a long conversation, older messages are silently dropped from the beginning. The model "forgets" earlier context. In a coding session or agentic workflow, this means the model loses awareness of decisions made earlier and may contradict itself or repeat work.

**How to manage it in practice:**

```
Strategies when approaching context limits:

1. Summarise — compress the earlier conversation into a summary,
   inject it at the top of a new context window, and continue.
   "Summarise our conversation so far in under 300 words" → paste into new session.

2. Chunking — break large inputs (e.g., a 500-page PDF) into chunks,
   process each chunk separately, then aggregate results.

3. RAG (Q5) — don't stuff all documents into the context.
   Retrieve only the relevant chunks for each query.

4. Rolling window — in agentic systems, maintain a sliding window:
   keep only the last N turns + a pinned summary of earlier decisions.

5. Token counting — use the model's tokeniser to estimate usage before hitting the limit:
   pip install tiktoken  (for OpenAI models)
   tokens = len(enc.encode(text))

Context window sizes (approx, as of mid-2025):
  GPT-4o            →  128k tokens
  Claude Sonnet 4   →  200k tokens
  Gemini 1.5 Pro    →  1M tokens
  Gemini 2.5 Pro    →  1M tokens
```

> **Interview line**: "Context window is the model's working memory. In our RAG community app, we never stuffed the full document corpus into the context — we chunked PDFs into 500-token passages, stored them in a vector store, and retrieved only the top-5 relevant chunks per query. That kept context usage under 4k tokens per call."

---

### Q2. How do you choose which LLM to use for a given task?

Model selection is a cost-performance trade-off. You pick the smallest, cheapest model that reliably produces the quality you need for the task. Throwing a $15/M-token frontier model at a simple classification task wastes money; using a fast cheap model for deep reasoning produces wrong answers.

```
TASK → MODEL MAPPING (general heuristics):

┌──────────────────────────────────┬──────────────────────────────────────────┐
│ Task                             │ Model choice                             │
├──────────────────────────────────┼──────────────────────────────────────────┤
│ Deep research, complex reasoning │ Claude Opus / GPT-4o / Gemini 2.5 Pro   │
│ Code generation, refactoring     │ Claude Sonnet / GPT-4o                   │
│ Simple Q&A, classification       │ Claude Haiku / GPT-4o-mini / Gemini Flash│
│ Fast streaming UI responses      │ Haiku / GPT-4o-mini (low latency)        │
│ RAG retrieval (embedding)        │ text-embedding-3-small (OpenAI)          │
│                                  │ or models/text-embedding-004 (Gemini)    │
│ Legacy code understanding        │ Claude Opus (best at older patterns)     │
│ Image / multimodal tasks         │ GPT-4o / Claude (vision-capable models)  │
└──────────────────────────────────┴──────────────────────────────────────────┘

Decision checklist:
1. What is the complexity of reasoning required?
   Low (extract/classify) → small/fast model
   High (multi-step, nuanced) → frontier model

2. What is the latency requirement?
   Real-time streaming UI → fast model (Haiku, mini)
   Background batch job → can afford slower, smarter model

3. What is the context size needed?
   Large codebase / long documents → models with 128k+ windows

4. Cost per 1M tokens (approx mid-2025):
   GPT-4o:           $5 input / $15 output
   Claude Sonnet 4:  $3 input / $15 output
   Claude Haiku 4:   $0.80 input / $4 output
   GPT-4o-mini:      $0.15 input / $0.60 output

5. Is there a compliance / data residency constraint?
   Azure OpenAI or AWS Bedrock for data that can't leave your region.
```

> **Interview line**: "For our community RAG app, I used Gemini Flash for the embedding model (cheap, fast) and Claude Sonnet for generating the final answer (high quality). The retrieval step is high-volume and cheap; the generation step is low-volume and needs quality — so I matched model cost to the value delivered by each step."

---

### Q3. What prompting techniques do you use to write efficient prompts?

A good prompt is precise, scoped, and economical. Every unnecessary token is money spent and context wasted. The techniques below apply whether you are calling an API or using Copilot in an IDE.

```
KEY TECHNIQUES:

1. ROLE + TASK + FORMAT
   Tell the model who it is, what to do, and how to return the answer.

   BAD:  "Tell me about SOLID"
   GOOD: "You are a .NET tech lead. Explain Open/Closed Principle in 3 bullet
          points using a C# example from a microservices context."

2. ZERO-SHOT vs FEW-SHOT
   Zero-shot: just describe the task.
   Few-shot:  give 1–3 examples of input/output pairs before asking.
   Use few-shot when the format or style must match exactly.

   // Few-shot example:
   Input: "Fetch all users"   → Output: "SELECT * FROM Users"
   Input: "Count active orders" → Output: "SELECT COUNT(*) FROM Orders WHERE IsActive=1"
   Input: "Get top 5 products by revenue" → Output: [model fills in]

3. CHAIN-OF-THOUGHT (CoT)
   Add "Think step by step" or "Reason through this" to improve accuracy on
   complex tasks. Makes the model externalise reasoning before giving the answer.
   Adds tokens but improves correctness on multi-step problems.

4. CONSTRAIN THE OUTPUT
   "Answer in under 100 words."
   "Return only valid JSON. No explanation."
   "List only the file names, one per line."
   Shorter, constrained outputs = fewer tokens = lower cost.

5. SUMMARISE LONG CONVERSATIONS
   If a conversation is getting long, ask the model to summarise before continuing:
   "Summarise our conversation in 5 bullet points" → use that as context in the next window.
   Compresses the context, reduces token usage on subsequent turns.

6. AVOID REPETITION IN SYSTEM PROMPTS
   Don't repeat the same instruction in every user message.
   Put stable instructions in the system prompt (cached in most APIs).
   OpenAI and Anthropic cache system prompts — repeated calls with the same
   system prompt are cheaper because cached tokens are discounted.

7. BE SPECIFIC ABOUT WHAT YOU DON'T WANT
   "Do not explain what the code does. Do not add comments. Return only the function."
   Negative constraints prevent the model from padding with unnecessary content.
```

> **Interview line**: "In our Copilot workflow, we trained the team to prefix prompts with the design pattern we expected and the constraint — e.g., 'Using Repository pattern, no service locator, return only the interface and one concrete class.' Specific prompts produce usable first-draft code; vague prompts produce vague code."

---

### Q4. What is an AI agent? What is agentic mode?

An AI agent is an LLM that is given **tools** (functions it can call) and a **goal**, and it decides autonomously which tools to call, in what order, to achieve the goal. Unlike a single-turn Q&A, an agent runs a loop: think → act → observe → think again.

**Agentic mode** (also called Plan-and-Act or ReAct) means the model:
1. Receives a goal
2. Generates a plan (which tools to call)
3. Calls a tool → gets a result
4. Updates its understanding
5. Calls the next tool
6. Repeats until the goal is achieved or it gives up

```
AGENTIC LOOP (ReAct pattern):

Goal: "Generate the Q2 Capital Access ownership report for tenant SPG-001"

Step 1 — THINK:
  "I need to fetch ownership data, then company profile, then generate PDF."
  Tool available: FetchOwnershipData(tenantId), FetchCompanyProfile(companyId), GeneratePdf(data)

Step 2 — ACT:
  Call FetchOwnershipData("SPG-001") → { shareholders: [...], totalShares: 5M }

Step 3 — OBSERVE:
  Got 12 shareholders. Need company profile next.

Step 4 — ACT:
  Call FetchCompanyProfile("SPG-001") → { name: "S&P Global", sector: "Finance" }

Step 5 — ACT:
  Call GeneratePdf({ ownership: ..., profile: ... }) → "report_q2_2026.pdf"

Step 6 — DONE: Return "Report generated: report_q2_2026.pdf"

// In .NET — using Semantic Kernel (Microsoft's agent framework)
var kernel  = Kernel.CreateBuilder()
    .AddAzureOpenAIChatCompletion(model, endpoint, apiKey)
    .Build();

kernel.Plugins.AddFromType<OwnershipPlugin>();    // registers FetchOwnershipData as a tool
kernel.Plugins.AddFromType<ReportPlugin>();       // registers GeneratePdf as a tool

var agent = new ChatCompletionAgent
{
    Kernel       = kernel,
    Instructions = "You are a report generation assistant. Use the available tools to generate ownership reports."
};

// The agent autonomously calls tools in the right order
await foreach (var message in agent.InvokeAsync("Generate Q2 report for SPG-001"))
    Console.WriteLine(message.Content);
```

> **Interview line**: "In our community knowledge app, I used an agentic approach with Semantic Kernel. The agent gets a user question, decides whether to search the vector store, call the FAQ tool, or fetch live data from the API. Each tool call updates the agent's context and it chains calls autonomously. I don't hardcode the sequence — the model decides."

---

### Q5. What is RAG (Retrieval-Augmented Generation)? How does it work?

RAG solves the problem of LLMs having a knowledge cutoff and not knowing your private data. Instead of fine-tuning the model (expensive), you keep your documents in a vector database and retrieve relevant chunks at query time, then inject them into the context window along with the question.

The model answers based on retrieved context, not its training data — so answers are up-to-date and cite your actual documents.

```
RAG PIPELINE:

INGESTION (run once, or on document update):
  1. Load document (PDF, Word, web page)
  2. Chunk into ~500-token passages with some overlap (e.g., 50 tokens)
  3. Embed each chunk with an embedding model
     → 1536-dimension vector representing semantic meaning
  4. Store (vector, metadata, original text) in a vector DB
     (Azure AI Search, Pinecone, Qdrant, pgvector)

QUERY (runs on every user question):
  1. Embed the user's question → query vector
  2. Similarity search in vector DB (cosine similarity)
     → top-K most relevant chunks (typically 3–5)
  3. Build the prompt:
     System: "Answer using only the provided context."
     Context: [chunk1] [chunk2] [chunk3]
     Question: "What is Capital Access's ownership data policy?"
  4. Send to LLM → grounded answer

// .NET implementation using Semantic Kernel + Azure AI Search
var memory = new SemanticTextMemory(
    new AzureAISearchMemoryStore(searchEndpoint, searchApiKey),
    new AzureOpenAITextEmbeddingGenerationService(embeddingModel, endpoint, apiKey)
);

// Ingestion
await memory.SaveInformationAsync(
    collection : "capital-access-docs",
    text       : chunkText,
    id         : $"doc_{docId}_chunk_{chunkIndex}",
    description: "Capital Access ownership policy document"
);

// Query
var results = memory.SearchAsync("capital-access-docs", userQuestion, limit: 5);
var context = new StringBuilder();
await foreach (var r in results)
    context.AppendLine(r.Metadata.Text);

// Build prompt with retrieved context
var prompt = $"""
    Answer the question using only the context below.
    Context:
    {context}

    Question: {userQuestion}
    """;

var answer = await kernel.InvokePromptAsync(prompt);

// WHY RAG over fine-tuning:
// Fine-tuning: expensive, slow, model forgets old data, needs retraining for updates
// RAG:         cheap, real-time updates, auditable (you can show which chunk was cited),
//              works with any LLM without retraining
```

> **Interview line**: "For our community knowledge app, I built a RAG pipeline in Python using Semantic Kernel. I chunked all our community PDFs and hard-copy guides into 500-token passages with 50-token overlap, embedded them with Gemini's embedding model, and stored them in a vector store. When a member asks a question, I embed the query, retrieve the top-5 chunks, and inject them into Claude's context. The model answers from the retrieved text — so it's always based on our actual documents, not Claude's training data."

---

### Q6. How do you make RAG context-aware across conversation turns?

The naive trap: treat each query independently, retrieve fresh docs per turn, lose the conversation thread. When a user asks "How do I scale it?" in turn 2, the system has no idea what "it" was from turn 1.

**The correct approach — a tiered strategy:**

**1. Query Rewriting / Expansion** (simplest, highest ROI)

Rewrite follow-up questions to include context from previous turns before retrieval:

```
User Turn 1: "What are microservices?"
System: retrieves docs on microservices architecture

User Turn 2: "How do I scale them?"
❌ Naive: retrieve on "scale"
✅ Correct: rewrite to "How do I scale microservices?" before retrieval
```

Use the LLM itself as a pre-processor:

```python
# Before retrieval, expand the query with context
expansion_prompt = f"""
Previous conversation:
{format_recent_turns(conversation_history)}

Current query: {current_query}

Rewrite the current query to be standalone and include necessary context from the conversation.
Return only the rewritten query, no explanation.
"""

expanded_query = llm.generate(expansion_prompt)
retrieved_docs = vector_db.search(expanded_query, top_k=5)
```

---

**2. Conversation State / Memory**

Store what's been discussed to bias future retrievals:

```python
conversation_state = {
    "discussed_topics": ["microservices", "scaling", "container orchestration"],
    "retrieved_docs": {
        "doc_id_1": 0.92,  # high relevance, already discussed
        "doc_id_2": 0.88   # also retrieved earlier
    },
    "key_entities": {
        "architecture": "microservices",
        "deployment": "Kubernetes",
        "concern": "auto-scaling"
    }
}

# Future retrievals: de-prioritize already-discussed docs,
# prioritize docs related to key entities
retrieved = vector_db.search(
    query, 
    top_k=5,
    bias_down=conversation_state["retrieved_docs"].keys(),  # avoid repetition
    boost_entities=conversation_state["key_entities"]        # expand on related topics
)
```

---

**3. Context Injection Into Retrieval**

Augment the retrieval query with conversation metadata:

```
Base query: "How do I monitor it?"
Augmented query: "How do I monitor microservices that are auto-scaled in Kubernetes?
Context from conversation: we discussed service discovery and container orchestration earlier."
```

This forces the retriever to see the full picture, not just "monitor" in isolation.

---

**4. Conversation Window in the LLM Prompt**

Even if retrieval is per-turn, include the full conversation in the LLM context:

```python
final_prompt = f"""
You are a helpful technical assistant. Here is the conversation so far:
{format_conversation_history(limit=5)}

Current question: {current_query}
Retrieved documents: {format_retrieved_docs(retrieved_docs)}

Answer the current question in the context of the full conversation.
If the user is asking "more about X," resolve X to the topic from the previous turn.
If the question is ambiguous, use the conversation history to clarify.
"""

answer = llm.generate(final_prompt)
```

The LLM can now resolve "What about X?" by looking back at what X was.

---

**5. Clarification on Ambiguous Follow-Ups**

If a follow-up is ambiguous, resolve it or ask:

```python
# Detect ambiguous pronouns ("that", "it", "which one")
if contains_ambiguous_pronoun(current_query):
    # Extract the most-recent relevant noun from the conversation
    most_likely_referent = extract_most_recent_entity(
        conversation_history,
        current_query
    )
    # Clarify: "Do you mean X?"
    clarification = f"Did you mean more about {most_likely_referent}?"
    # Or silently resolve and retrieve on that
    resolved_query = current_query.replace("it", most_likely_referent)
```

---

**Trade-offs & Comparison:**

| Approach | Implementation Cost | Benefit | Best Used When |
|----------|---|---|---|
| Query rewriting | 1 LLM call per turn | Immediate improvement, no state | Always — cheap win |
| Conversation state | Requires storage + bias logic | Prevents repetition, smart prioritization | Long conversations (5+ turns) |
| Context injection | Augment retrieval query | Retriever sees full picture | Complex multi-document reasoning |
| LLM prompt augmentation | Include conversation in system prompt | Resolves ambiguity, maintains coherence | All turns — foundational |
| Clarification on ambiguity | Extract + resolve or ask | User explicitly confirms intent | When ambiguity is likely |

---

**Recommended hybrid approach (80/20):**

1. **Always do query rewriting** — cheap, always helps
2. **Always include conversation in LLM prompt** — the LLM can resolve ambiguity
3. **Add conversation state tracking** if conversation is >5 turns or documents are being repeated
4. **Add clarification prompting** only if you detect genuine ambiguity (pronouns without clear antecedent)

```python
def rag_conversation_turn(user_query, conversation_history, vector_db):
    # Step 1: Rewrite query with context
    expanded_query = rewrite_with_context(user_query, conversation_history)
    
    # Step 2: Retrieve on expanded query
    retrieved_docs = vector_db.search(expanded_query, top_k=5)
    
    # Step 3: Build prompt with full conversation
    prompt = f"""
    {system_instructions}
    
    Conversation so far:
    {format_conversation_history()}
    
    Retrieved documents: {format_docs(retrieved_docs)}
    
    Current question: {user_query}
    
    Answer based on the context and conversation history.
    """
    
    # Step 4: Generate answer
    answer = llm.generate(prompt)
    
    # Step 5: Store interaction for future turns
    update_conversation_state(user_query, retrieved_docs, answer)
    
    return answer
```

> **Interview line**: "The key insight is that a follow-up like 'How do I scale it?' is meaningless without knowing what 'it' was. So before retrieval, I rewrite the query to include context from the conversation. Then I inject the full conversation history into the LLM prompt so it can resolve any remaining ambiguity. This way you get conversation continuity without needing a complex external memory system — the LLM itself is the state keeper. For long conversations, I'd add a conversation state tracker to de-prioritize already-retrieved documents and boost related entities."

---

### Q7. How do you validate whether the generated SQL query is correct?

Generated SQL from LLMs is often plausible-looking but wrong. Validation requires multiple layers:

**1. Syntax Validation (automatic)**
```python
import sqlparse

try:
    parsed = sqlparse.parse(generated_sql)
    if not parsed or not parsed[0].tokens:
        return {"valid": False, "error": "Empty or malformed SQL"}
except Exception as e:
    return {"valid": False, "error": str(e)}
```

**2. Schema Validation (checks column/table existence)**
```python
def validate_against_schema(sql, actual_schema):
    # Parse the SQL to extract table and column names
    # Compare against actual schema
    
    from sqlalchemy import inspect
    
    tables_in_query = extract_table_names(sql)
    columns_in_query = extract_column_names(sql)
    
    actual_tables = inspect(engine).get_table_names()
    actual_columns = {table: [c.name for c in inspect(engine).get_columns(table)] 
                      for table in actual_tables}
    
    errors = []
    for table in tables_in_query:
        if table not in actual_tables:
            errors.append(f"Table '{table}' not found in schema")
    
    for table, cols in columns_in_query.items():
        for col in cols:
            if col not in actual_columns.get(table, []):
                errors.append(f"Column '{col}' not found in table '{table}'")
    
    return errors
```

**3. Semantic Validation (does the query do what we asked?)**
```python
# Execute on a test dataset and validate output shape/content

def semantic_validate(generated_sql, user_intent, test_data):
    """
    user_intent: "List all customers who made purchases in Q3"
    generated_sql: "SELECT * FROM customers WHERE purchase_date > '2026-07-01'"
    test_data: small sample dataset
    """
    
    # Run the query on test data
    result = execute_test_query(generated_sql, test_data)
    
    # Check: Does the result match the intent?
    # - If intent says "customers", does result have customer records?
    # - If intent says "Q3", do dates fall in Q3?
    
    validation_rules = extract_validation_rules(user_intent)
    # e.g., ["result must have customer_id", "dates must be between July-Sept"]
    
    for rule in validation_rules:
        if not rule(result):
            return {"valid": False, "reason": f"Failed: {rule}"}
    
    return {"valid": True}
```

**4. Performance Validation (will it be slow?)**
```python
# Estimate query cost using EXPLAIN
def estimate_query_cost(sql, connection):
    explain_result = connection.execute(f"EXPLAIN {sql}").fetchall()
    # Extract execution cost, number of rows scanned
    
    estimated_rows = extract_row_count(explain_result)
    estimated_cost = extract_cost(explain_result)
    
    if estimated_cost > COST_THRESHOLD or estimated_rows > ROW_THRESHOLD:
        return {
            "valid": False,
            "reason": f"Query too expensive: {estimated_cost} cost, {estimated_rows} rows",
            "suggestion": "Consider adding indexes or filtering"
        }
    return {"valid": True}
```

**My approach for the AI Database Agent project:**
1. Generate SQL from LLM
2. Run syntax check (fail fast if unparseable)
3. Validate schema (table/column existence)
4. Execute on test subset → compare output against intent
5. EXPLAIN plan → check cost, suggest index improvements
6. Return validation report to user: ✅ Valid OR ❌ Invalid with specific reason

> **Interview line**: "Generated SQL looks right but is often subtly wrong. I build a validation pipeline: syntax check, schema validation against the actual database, semantic validation by running it on a test dataset and verifying the output matches the user's intent, and performance validation using EXPLAIN to catch expensive queries. If it fails any step, I show the user the specific error and suggest the fix."

---

### Q8. How do you handle infinite loops in an AI agent?

AI agents can loop forever if:
- LLM keeps generating the same step repeatedly (e.g., "try X" → "X failed" → "try X again")
- Circular dependencies between tools (A calls B, B calls A)
- Agent doesn't recognize it's stuck

**Prevention & Detection:**

```python
class SafeAgent:
    def __init__(self, max_iterations=10, max_same_action_repeats=3):
        self.max_iterations = max_iterations
        self.max_same_action_repeats = max_same_action_repeats
        self.iteration_count = 0
        self.action_history = []
    
    async def run(self, user_query):
        while self.iteration_count < self.max_iterations:
            # Agent decides next action
            action = await self.llm_decide_next_action(user_query)
            
            # Check: are we repeating the same action?
            recent_actions = self.action_history[-self.max_same_action_repeats:]
            if all(a == action for a in recent_actions):
                return {
                    "status": "STUCK",
                    "reason": f"Repeated action '{action}' {self.max_same_action_repeats}+ times",
                    "last_state": self.current_state,
                    "suggestion": "Action is ineffective, try different strategy"
                }
            
            # Execute action
            result = await self.execute_action(action)
            self.action_history.append(action)
            
            # Check: did we make progress toward goal?
            if self.is_goal_achieved(result):
                return {"status": "SUCCESS", "result": result}
            
            self.iteration_count += 1
        
        # Max iterations exceeded
        return {
            "status": "MAX_ITERATIONS_EXCEEDED",
            "reason": f"Agent did not converge within {self.max_iterations} steps",
            "actions_taken": self.action_history,
            "last_state": self.current_state
        }
```

**Breakout strategies:**
1. **Iteration limit** — hard cap (e.g., 10 steps max)
2. **Repetition detection** — if same action triggered 3+ times, break
3. **Goal progress tracking** — if state hasn't changed in N steps, break
4. **Timeout** — if agent runs > T seconds, timeout and fail gracefully

> **Interview line**: "AI agents can loop forever if the LLM keeps trying the same failing action. I implement three safety mechanisms: (1) hard iteration limit (max 10 steps), (2) repetition detection (if the agent tries the same action 3+ times, break out and report 'stuck'), and (3) progress tracking (if the goal state hasn't advanced in N steps, assume we're in a loop and exit). The agent returns a detailed 'STUCK' report with the last state and a suggestion for what to try next."

---

### Q9. Why did you choose ChromaDB instead of PostgreSQL or MongoDB?

**The use case:** Store embeddings for 50,000 PDF chunks from community content, retrieve top-K similar chunks per user query.

**ChromaDB:**
- ✅ Built specifically for embeddings (vector store)
- ✅ Fast similarity search (cosine distance, approximate nearest neighbor)
- ✅ In-memory option for development (simple setup)
- ✅ Persistent storage option for production (sqlite backend)
- ❌ No ACID transactions
- ❌ Limited complex querying (no joins)
- ✅ Cheap to run (embedded library, no separate server needed)

**PostgreSQL (with pgvector extension):**
- ✅ ACID transactions, strong consistency
- ✅ Complex queries (joins, aggregations, ACID guarantees)
- ✅ Production-proven
- ❌ Vector search is a secondary concern (extension, not primary feature)
- ❌ Slower similarity search than dedicated vector DBs (doesn't use approximate algorithms by default)
- ❌ Requires tuning (index configuration, HNSW vs IVFFlat tradeoffs)

**MongoDB (with Atlas Vector Search):**
- ✅ Flexible schema (JSON documents)
- ✅ Good vector search with Atlas
- ❌ Expensive for this use case (cloud-only Atlas needed for good vector performance)
- ❌ More operational complexity than ChromaDB
- ✅ Better if you have other document data to store alongside embeddings

**My decision:**
For a hobby RAG project serving a community, ChromaDB was the sweet spot:
- **80% of the work is just "given a query, find similar chunks"** — that's what vector DBs do best
- No need for ACID; if embedding fails, we re-chunk and re-embed
- Development speed mattered more than enterprise guarantees
- Cost was a factor (ChromaDB = free, PostgreSQL with good indexing = more overhead)

If the project scaled to millions of chunks and needed complex queries (e.g., "find chunks similar to query X, from documents published after date Y, related to topic Z"), I'd migrate to PostgreSQL + pgvector.

> **Interview line**: "ChromaDB is optimized for exactly one thing: storing embeddings and doing fast similarity search. For a RAG project where 80% of the work is 'retrieve similar chunks,' it's perfect. PostgreSQL is more powerful overall, but if you only need vector search, you're over-provisioning. I chose ChromaDB for a hobby project where simplicity and development speed mattered more than enterprise guarantees. If it scaled to millions of chunks and needed complex filtering (by date, topic, document type), I'd migrate to PostgreSQL with pgvector."

---

### Q10. How do you implement tracing in your AI application?

**The problem:** When an AI agent fails, you need to know:
- Which tool was called? What were the inputs?
- What did the tool return?
- What was the agent's reasoning at each step?

**Solution 1: Structured logging with correlation IDs**

```python
import logging
import uuid
from datetime import datetime

class AIAgentTracer:
    def __init__(self):
        self.trace_id = str(uuid.uuid4())
        self.logger = logging.getLogger(__name__)
        self.events = []
    
    def log_step(self, step_name, data):
        event = {
            "trace_id": self.trace_id,
            "timestamp": datetime.utcnow().isoformat(),
            "step": step_name,
            "data": data
        }
        self.events.append(event)
        self.logger.info(f"[{self.trace_id}] {step_name}: {data}")
    
    def log_tool_call(self, tool_name, inputs):
        self.log_step("TOOL_CALL", {"tool": tool_name, "inputs": inputs})
    
    def log_tool_result(self, tool_name, output, duration_ms):
        self.log_step("TOOL_RESULT", {
            "tool": tool_name,
            "output": output,
            "duration_ms": duration_ms
        })
    
    def log_error(self, error_msg, context):
        self.log_step("ERROR", {"message": error_msg, "context": context})
    
    def export_trace(self):
        """Export full trace for debugging"""
        return {
            "trace_id": self.trace_id,
            "events": self.events,
            "duration_ms": (self.events[-1]["timestamp"] - self.events[0]["timestamp"]).total_seconds() * 1000
        }
```

**Usage:**
```python
tracer = AIAgentTracer()

try:
    tracer.log_step("AGENT_START", {"query": user_query})
    
    # Decision step
    decision = await llm.decide_tool()
    tracer.log_step("LLM_DECISION", {"tool": decision.tool_name})
    
    # Execute tool
    start = time.time()
    result = await tool_executor.run(decision.tool_name, decision.inputs)
    duration = (time.time() - start) * 1000
    
    tracer.log_tool_call(decision.tool_name, decision.inputs)
    tracer.log_tool_result(decision.tool_name, result, duration)
    
    tracer.log_step("AGENT_SUCCESS", {"result": result})

except Exception as e:
    tracer.log_error(str(e), {"step": "tool_execution"})
    raise

finally:
    # Store or display trace
    trace_json = tracer.export_trace()
    print(json.dumps(trace_json, indent=2))
```

**Solution 2: OpenTelemetry (if using observability platform)**

See Q11 (OpenTelemetry).

> **Interview line**: "Tracing is critical for debugging AI agents. I log every step: agent decision, tool call (tool name + inputs), tool result, and timing. Each trace gets a unique ID that carries through the entire request so I can follow it end-to-end. When something fails, I export the trace as JSON, which shows exactly which tool was called, what it returned, and where the agent got stuck. For the hobby project I just used structured logging + correlation IDs. If it scaled, I'd use OpenTelemetry with a backend like Jaeger or Datadog."

---

### Q11. Have you used OpenTelemetry, LangSmith, LangChain, or LangGraph?

**OpenTelemetry (OTel):**
- Open standard for tracing, metrics, and logs
- Integrates with observability backends (Jaeger, Datadog, New Relic, etc.)
- Language-agnostic (Python, C#, Go, etc.)
- For AI: trace LLM calls, tool execution, latency bottlenecks

**LangSmith:**
- Purpose-built for LLM app debugging
- Traces LLM calls, token usage, cost
- Evaluation toolkit (test your prompt against test cases)
- Collaboration features (share traces with team)
- **I haven't used it** but it's becoming standard for production LLM apps

**LangChain:**
- Framework for building LLM applications
- Abstracts LLM API calls, tool execution, memory management
- Popular for RAG and agent development
- **For my project:** I considered it but built custom agent orchestration instead (wanted to understand the full flow)

**LangGraph:**
- Newer framework (part of LangChain ecosystem)
- Graph-based agent orchestration (DAG representation of steps)
- Better than LangChain for complex multi-step workflows
- Visualize agent flow as a graph
- **Not yet used** but it's on my to-try list

**My experience:**
- Used **structured logging + correlation IDs** (Python logging)
- Not yet used LangSmith (would use if scaling the project to production with multiple users)
- Not used LangChain/LangGraph (built custom orchestration for learning)
- Familiar with OTel concepts but haven't integrated it

> **Interview line**: "For my hobby AI project, I implemented custom tracing with correlation IDs and structured logging — wanted to learn the plumbing before using a framework. LangSmith is the obvious next step for production LLM apps (traces + evals + cost tracking). LangChain/LangGraph are great if you want to abstract away the orchestration logic, but I chose to build it myself for this project to understand how agents work end-to-end. If scaling to production, I'd migrate to LangSmith + OpenTelemetry for observability."

---

### Q12. What frameworks are available today to build Agentic AI applications?

| Framework | Best For | Maturity | Cost |
|-----------|----------|----------|------|
| **LangChain** | General LLM apps, RAG, simple agents | Production-ready | Free |
| **LangGraph** | Complex multi-step agents, DAG workflows | Stable | Free |
| **Anthropic Claude SDK** | Claude models specifically | Production-ready | Free (pay for API) |
| **LLamaIndex** | Data indexing + RAG specifically | Production-ready | Free |
| **AutoGen (Microsoft)** | Multi-agent orchestration | Research/early | Free |
| **Pydantic AI** | Type-safe agent systems (Python) | Emerging | Free |
| **Crew AI** | Team of agents with roles | Emerging | Free |
| **n8n / Make** | No-code/low-code agent workflows | Production-ready | Free tier + paid |
| **LLM OS (open-ended)** | Custom orchestration | DIY | Free |

**My choice**: Built custom with LLM API calls + structured logging (learned the most).

**For production**: Would use **LangGraph** (good abstractions, clear DAG flow) or **Claude SDK** (if using Claude exclusively).

> **Interview line**: "LangChain and LangGraph are the most mature open-source options. LangGraph is better if you have complex multi-step workflows (it models agents as a DAG, which is easier to reason about). LLamaIndex is great if you're building a pure RAG system. Pydantic AI is emerging and looks promising for type-safe agents. For my project, I built custom orchestration to learn how agents work. For production with a team, I'd use LangGraph + LangSmith (for evals and observability)."

---

### Q13. How do multiple AI agents coordinate with each other?

**Pattern 1: Sequential (Agent A → Agent B)**
```
User query
    ↓
Agent A (analysis) → produces output
    ↓
Agent B (summary) → consumes output → final answer
```

**Pattern 2: Parallel (agents work independently, then merge)**
```
Query splits into subtasks:
  - Agent A: "Summarize revenue data"
  - Agent B: "Summarize cost data"
  - Agent C: "Compare the two"
          ↓
Wait for all → merge results
```

**Pattern 3: Hierarchical (manager agent delegates to worker agents)**
```
Manager Agent:
  1. Receives: "Create annual financial report"
  2. Decides: "Need three sub-reports"
  3. Delegates to:
     - Worker A: "Q1 revenue"
     - Worker B: "Q2 revenue"
     - Worker C: "Q3 revenue"
  4. Collects results
  5. Synthesizes into final report
```

**Coordination mechanisms:**

```python
class AgentCoordinator:
    async def sequential_execution(self, agents, input_data):
        """Agent A's output → Agent B's input"""
        current_state = input_data
        for agent in agents:
            current_state = await agent.execute(current_state)
        return current_state
    
    async def parallel_execution(self, agents, input_data):
        """All agents run concurrently"""
        results = await asyncio.gather(
            *[agent.execute(input_data) for agent in agents]
        )
        return self.merge_results(results)
    
    async def hierarchical_execution(self, manager_agent, worker_agents, task):
        """Manager delegates to workers"""
        subtasks = await manager_agent.decompose(task)
        # Map subtasks to worker agents
        worker_results = []
        for subtask, worker in zip(subtasks, worker_agents):
            result = await worker.execute(subtask)
            worker_results.append(result)
        # Manager synthesizes
        final = await manager_agent.synthesize(worker_results)
        return final
```

> **Interview line**: "Agents coordinate via three patterns: sequential (output of one feeds into the next), parallel (agents work on independent tasks simultaneously, then merge), and hierarchical (a manager agent decomposes a big task into subtasks and delegates to workers). The key is shared context — all agents need visibility into the goal, the subtasks, and intermediate results. If agents can't see each other's work, you get duplication and wasted effort."

---

### Q14. What are the operations of an AI agent?

An agent is a loop:

```
┌─────────────────────────┐
│  1. Observe (current state)
│  2. Decide (which action to take)
│  3. Act (execute the action / call a tool)
│  4. Update (new state)
└─────────────────────────┘
       ↓
    Repeat until goal achieved
```

**Specific operations:**

1. **Observe** — Read current state, available tools, goal
   ```
   Goal: "Generate Q3 financial report"
   Current state: "User authenticated, reports_db connected, no report generated yet"
   Available tools: ["fetch_revenue", "fetch_costs", "generate_pdf"]
   ```

2. **Reason** — Use LLM to decide next step
   ```
   LLM prompt: "To generate a Q3 report, what's the next step?"
   LLM output: "fetch_revenue"
   ```

3. **Act** — Call the tool
   ```
   Execute: fetch_revenue(quarter="Q3", company_id="123")
   Result: {revenue: 2.5M, ...}
   ```

4. **Update** — Incorporate result into state
   ```
   New state: "Revenue fetched: $2.5M"
   ```

5. **Loop or Stop** — Check if goal achieved
   ```
   Goal achieved? "All data collected"
   Yes → Generate PDF
   No → Decide next step (e.g., fetch_costs)
   ```

> **Interview line**: "An agent is an observe-decide-act loop. Observe the current state and available tools. Ask the LLM what to do next. Execute the tool. Update the state with the result. Repeat until the goal is achieved. The hard part is giving the LLM enough information to decide well (what tools exist, what the state is, what the goal is) without overwhelming it with context."

---

### Q15. How would you expose your AI system to another AI agent?

**Option 1: HTTP API (REST/GraphQL)**
```
Other agent calls:
POST /api/agent/query
{
  "query": "Summarize recent sales trends",
  "context": {"company_id": "123"}
}

Response:
{
  "result": "Sales up 15% in Q3...",
  "confidence": 0.92,
  "sources": ["sales_db", "market_report"]
}
```

**Option 2: MCP (Model Context Protocol)**
```
Agent A registers resources:
{
  "name": "sales_analyzer",
  "tools": [
    {
      "name": "analyze_sales",
      "description": "Analyze sales data for date range",
      "input_schema": {...}
    }
  ],
  "resources": [
    {
      "uri": "sales://2026-q3",
      "description": "Q3 2026 sales data"
    }
  ]
}

Agent B calls:
call_tool("sales_analyzer", {"date_range": "2026-07-01:2026-09-30"})
```

**Comparison:**

| Aspect | HTTP API | MCP |
|--------|----------|-----|
| **Setup** | Standard, well-known | Emerging, LLM-centric |
| **Discovery** | OpenAPI/docs | MCP server registry |
| **Semantics** | Generic (doesn't know it's an agent) | Agent-aware (LLM can understand context) |
| **Performance** | Typical HTTP latency | Lower overhead (direct protocol) |
| **Standardization** | Mature (REST) | New (MCP still evolving) |
| **Use case** | Public APIs, microservices | LLM-to-LLM, agent-to-agent |

> **Interview line**: "HTTP APIs are the safe, proven choice — any system can call it, tools like Postman work, it's familiar. MCP is newer and LLM-specific: it lets AI agents understand not just 'what endpoint to call' but 'what resources exist' and 'what these tools do.' For a hobby project, HTTP is simpler. For agent-to-agent in an org, MCP is more powerful because the LLM gets richer context about what's available."

---

### Q16. What type of memory did your AI agent use, and disadvantages of storing all context in memory?

**Types of memory an AI agent uses:**

1. **Session memory** (current conversation)
   - What's been discussed in this conversation
   - Used to resolve pronouns ("it", "that")
   - Lives in context window only
   - Lost when conversation ends

2. **Working memory** (action history)
   - Which tools were called, in what order
   - Results of each tool call
   - Used to detect loops ("did we already try this?")
   - Cleared per agent execution

3. **Long-term memory** (persistent storage)
   - Past conversations, user preferences, learned facts
   - Stored in a database or vector DB
   - Retrieved on-demand (RAG style)
   - Lives beyond one conversation

**My AI agent:** Primarily session memory (conversation history) + tool call history.

```python
class AgentMemory:
    def __init__(self):
        self.session_memory = []  # Current conversation
        self.action_history = []   # Tools called this execution
        # No long-term persistence (hobby project)
    
    def add_turn(self, user_msg, agent_decision, tool_result):
        self.session_memory.append({
            "user": user_msg,
            "decision": agent_decision,
            "result": tool_result
        })
    
    def detect_loop(self):
        """Check if we're repeating actions"""
        recent = [a["tool"] for a in self.action_history[-3:]]
        return len(set(recent)) == 1  # All same tool?
```

**Disadvantages of storing all context in memory:**

| Problem | Impact | Example |
|---------|--------|---------|
| **Memory explosion** | RAM grows unbounded | After 1,000 turns, context window exhausted |
| **Slow retrieval** | O(n) search through history | Finding relevant past interaction takes longer |
| **No learning across sessions** | Agent forgets past users' needs | Same user asks same Q twice, agent re-learns |
| **Server downtime = data loss** | Crash loses all sessions | Agent restarts, conversation history gone |
| **Latency at scale** | Every turn reads + writes memory | Real-time constraints violated |
| **Privacy leak** | One user sees another's context | Conversation mixing |

**Better approach:**
- Keep only recent N turns in session memory (e.g., last 5)
- Archive old turns to persistent storage
- Use RAG to retrieve relevant past context only when needed
- Separate user contexts strictly

> **Interview line**: "My hobby agent used only session memory (current conversation + recent tool calls). For production, I'd tier it: recent turns in memory (fast access), older turns in a database, and use RAG to retrieve relevant past context on-demand. Storing everything in memory sounds simple but breaks at scale — unbounded growth, slow retrieval, and privacy issues. Better to be selective about what you keep hot."
