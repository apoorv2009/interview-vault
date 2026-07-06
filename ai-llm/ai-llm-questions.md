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
