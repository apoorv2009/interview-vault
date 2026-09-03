# RAG (Retrieval-Augmented Generation) System Design Interview Guide

## Your RAG chatbot gives a perfect answer but from a 3-year-old document. How would you prevent this?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Stale data in RAG systems happens because the knowledge base isn't being refreshed, or retrieved documents aren't validated for recency. Fix it by: (1) implementing **document versioning and metadata timestamps** so you know when each document was last updated, (2) adding a **recency filter** in your retrieval pipeline that demotes or excludes documents older than a configurable threshold, (3) implementing **automatic knowledge base refresh** on a schedule or event-driven basis, (4) using **hybrid retrieval** that combines dense vector search with keyword/temporal filtering, and (5) adding **user feedback loops** so users can flag stale answers, triggering immediate re-indexing of that document.

**Why It Happens:**
- The RAG pipeline retrieves documents based on semantic similarity alone — a 3-year-old document can be perfectly relevant to the query, so the LLM generates a perfect answer from outdated information
- The system has no concept of "document age" unless explicitly encoded into the retrieval logic
- Knowledge bases decay: product features change, prices update, policies evolve, but the vector embeddings remain static

**Production Fixes (in priority order):**

1. **Add document metadata (timestamps, update frequency)**
   - Every document stored in your vector DB should have: `created_at`, `updated_at`, `source_url`, `refresh_cadence`
   - At retrieval time, filter out documents where `(current_time - updated_at) > MAX_AGE`
   - Example: ignore documents older than 90 days for financial info, 1 year for general product info

2. **Implement semantic + temporal fusion**
   - Don't retrieve ONLY on vector similarity
   - Use BM25 + vector similarity + metadata filters as a three-pass system:
     - Pass 1: Vector search returns top-50 candidates
     - Pass 2: Filter by recency/category/source
     - Pass 3: Rank by combined score: `0.7 * semantic_score + 0.2 * recency_score + 0.1 * confidence_score`

3. **Automatic knowledge base refresh (event-driven or scheduled)**
   - Scheduled: Re-index your knowledge base weekly/monthly from authoritative sources (product docs, databases, APIs)
   - Event-driven: Listen for document change events (CMS updates, product launches) and trigger immediate re-indexing
   - Example: When a pricing page updates, re-embed all pricing-related documents within 5 minutes

4. **User feedback + human-in-the-loop**
   - Every RAG answer should include source metadata: which document was used, when was it updated
   - Add thumbs down/flag button: "This answer is outdated"
   - Route flagged answers to a queue for immediate re-indexing or manual review
   - Update the document's `updated_at` timestamp if it's the document's fault, or lower its ranking if it's repeatedly flagged

5. **Confidence scoring with freshness weighting**
   - LLMs can generate confident-sounding answers from outdated data
   - Add a confidence multiplier: if retrieved documents are >90 days old, cap confidence at 0.6 even if the LLM says 0.95
   - Return to user: "Answer based on [document from March 2023]. For current info, see [updated source]"

**DEEP DIVE — Technical Architecture Below**

### Document Lifecycle in RAG

```
Document Source (Docs, Blogs, APIs, Databases)
        │
        ▼
Extraction & Chunking
  - Split into 512-token chunks
  - Add metadata: chunk_id, source_url, updated_at, version
        │
        ▼
Embedding + Storage (Vector DB: Pinecone, Weaviate, etc.)
  {
    "id": "doc_chunk_5432",
    "embedding": [0.12, -0.45, ..., 0.88],  // 1536-dim (OpenAI text-embedding-3-small)
    "text": "Product X costs $99/month in 2023",
    "metadata": {
      "source": "pricing-page",
      "document_id": "pricing_doc_v3",
      "created_at": "2023-05-15T10:30:00Z",
      "updated_at": "2023-05-15T10:30:00Z",
      "refresh_cadence": "weekly",
      "category": "pricing",
      "confidence": 0.95
    }
  }
        │
        ▼
Query Time: Multi-Pass Retrieval
  Pass 1 — Vector Search (semantic similarity):
    ┌─────────────────────────────────────────────────────┐
    │ Query: "How much does Product X cost?"              │
    │ Embedding: [0.11, -0.46, ..., 0.87]                │
    │ Top-50 candidates by cosine similarity              │
    └─────────────────────────────────────────────────────┘
  
  Pass 2 — Temporal Filtering (recency):
    ┌─────────────────────────────────────────────────────┐
    │ Filter: updated_at > (now - MAX_AGE)                │
    │ MAX_AGE: 90 days for pricing, 365 days for general  │
    │ Result: 12 candidates pass recency filter           │
    └─────────────────────────────────────────────────────┘
  
  Pass 3 — Metadata + Contextual Ranking:
    ┌─────────────────────────────────────────────────────┐
    │ Score = λ₁ * semantic_score                         │
    │       + λ₂ * recency_score                          │
    │       + λ₃ * source_authority_score                 │
    │       + λ₄ * feedback_score                         │
    │ λ values: 0.5, 0.3, 0.1, 0.1 (configurable)        │
    │ Top 3-5 ranked documents sent to LLM                │
    └─────────────────────────────────────────────────────┘
        │
        ▼
LLM Inference + Source Attribution
  Input: "Context: [top-3 documents]. Q: How much does Product X cost?"
  Output: "Product X costs $99/month (from pricing page, last updated May 2023)"
  [Show recency badge: ⚠️ Information may be outdated]
        │
        ▼
User Feedback Loop
  User rates: 👍 correct, 👎 outdated, 🚫 wrong source
  Feedback stored: {query, answer, selected_doc, feedback, timestamp}
  Action: Re-index that doc, lower its ranking, or notify doc owner
```

### Recency-Aware Retrieval: Concrete Implementation

```python
from datetime import datetime, timedelta
import pinecone

def retrieve_with_recency(query, vector_embedding, max_doc_age_days=90):
    # Pass 1: Vector search
    results = pinecone.Index("knowledge-base").query(
        vector=vector_embedding,
        top_k=50,
        include_metadata=True
    )
    
    # Pass 2: Filter by recency
    current_time = datetime.utcnow()
    max_age = timedelta(days=max_doc_age_days)
    
    recent_docs = []
    for match in results['matches']:
        doc_updated = datetime.fromisoformat(match['metadata']['updated_at'])
        age_days = (current_time - doc_updated).days
        
        if age_days <= max_doc_age_days:
            # Calculate recency score: 1.0 (fresh) → 0.0 (max age)
            recency_score = max(0, 1.0 - (age_days / max_doc_age_days))
            recent_docs.append({
                **match,
                'recency_score': recency_score,
                'age_days': age_days
            })
    
    # Pass 3: Re-rank by combined score
    for doc in recent_docs:
        doc['combined_score'] = (
            0.6 * doc['score'] +           # semantic similarity
            0.3 * doc['recency_score'] +   # freshness
            0.1 * doc['metadata'].get('authority', 0.5)  # source trust
        )
    
    # Return top 3-5
    ranked = sorted(recent_docs, key=lambda x: x['combined_score'], reverse=True)
    return ranked[:5]

# Usage
retrieved = retrieve_with_recency(
    query="How much does Product X cost?",
    vector_embedding=embed_query("How much does Product X cost?"),
    max_doc_age_days=90
)

# With attribution
for doc in retrieved:
    print(f"Source: {doc['metadata']['source']}")
    print(f"Updated: {doc['metadata']['updated_at']} ({doc['age_days']} days old)")
    print(f"Confidence: {doc['combined_score']:.2%}")
```

### Architecture Comparison: Stale vs. Fresh RAG

| Dimension | Naive RAG (No Recency) | Recency-Aware RAG |
| --- | --- | --- |
| Document retrieval basis | Semantic similarity only | Semantic + temporal + metadata |
| Stale document risk | High — perfect answers from 3-year-old docs | Low — recent docs preferred, old docs demoted/excluded |
| Storage overhead | None — metadata optional | Metadata mandatory (created_at, updated_at, refresh_cadence) |
| Retrieval latency | ~50ms (vector search) | ~100–150ms (3-pass filtering + ranking) |
| Accuracy on time-sensitive queries | Poor (product prices, policies, features) | High — answers reflect current state |
| Source attribution | Usually missing | Included by default: source URL, update timestamp, age warning |
| User feedback loop | None | Integrated — flagged docs trigger re-indexing |
| Knowledge refresh | Manual or ad-hoc | Scheduled (weekly/monthly) + event-driven (CMS updates) |
| Cost (inference + storage) | Lower | Slightly higher (metadata storage, 3-pass retrieval) |

### Common Pitfall: Embedding Stale Data

```
❌ WRONG: Embed once, serve forever
  Document uploaded March 2023
    → Embedded once in March 2023
    → Vector stays static
    → Query in Sept 2026: still returns March 2023 data
    → No mechanism to detect staleness

✅ RIGHT: Embed with metadata, refresh on schedule
  Document uploaded March 2023 (version 1)
    → Embedded, tagged: created_at=2023-03-15, updated_at=2023-03-15
    → Every Monday at 2am: re-check source
    → Source changed Sept 2026 (version 2)
    → Re-embed Sept 2026, update: updated_at=2026-09-01
    → Next query: retrieval filters for updated_at > (now - 90 days)
    → Returns version 2 (fresh data), not version 1
```

---

## How do you validate retrieval quality in RAG? (RAGAS Metrics)

**SIMPLE EXPLANATION — Read This First**

Short Answer: RAG retrieval quality is measured by **RAGAS metrics** (Retrieval-Augmented Generation Assessment):
- **Context Relevance**: Does the retrieved document actually answer the question? (0–1, higher = better)
- **Faithfulness**: Did the LLM answer match the retrieved context, or did it hallucinate? (0–1, higher = better)
- **Answer Relevance**: Does the final answer address the user's question? (0–1, higher = better)

In production, track these continuously: set up a **ground-truth test set** (100–500 queries with known correct answers), measure baseline scores, then run the same test set weekly to catch retrieval drift.

**RAGAS Metrics Explained:**

1. **Context Relevance (CR)**: Among top-5 retrieved documents, what percentage is actually relevant to the query?
   - Formula: For each retrieved doc, ask LLM: "Is this document relevant to: [query]?" (Yes/No)
   - CR = (relevant docs) / (total retrieved docs)
   - Example: Query "price of X", retrieve 5 docs, 4 are pricing-related, 1 is about features → CR = 0.8

2. **Faithfulness (F)**: Does the LLM's answer come from the retrieved context, or did it use hallucinated/external knowledge?
   - Formula: Extract claims from the LLM answer, check each against retrieved docs
   - F = (claims supported by context) / (total claims)
   - Example: LLM says "Product X costs $99/month and has 24/7 support". Retrieved docs say "$99/month" but don't mention support → F = 0.5

3. **Answer Relevance (AR)**: Does the final answer actually answer the user's question?
   - Formula: Semantic similarity between [user question] and [LLM answer], using embeddings or LLM scoring
   - AR = cosine_similarity([question_embedding], [answer_embedding])
   - Example: Question "How do I reset my password?" Answer "See our help center for security tips." → AR = 0.4 (answers the Q partially)

**Production Setup:**

```
Ground-Truth Test Set (created quarterly):
  ├─ Query 1: "How much does Product X cost?"
  │   ├─ Expected answer: "$99/month"
  │   ├─ Correct documents: [pricing_doc_v2, faq_doc_v1]
  │   └─ Unacceptable docs: [roadmap_doc, blog_post_old]
  │
  ├─ Query 2: "What's the refund policy?"
  │   ├─ Expected answer: "30-day money-back guarantee"
  │   └─ Correct documents: [tos_doc_v3, refund_policy_doc_v2]
  │
  └─ ... (100–500 queries total)

Weekly RAGAS Evaluation:
  Run all queries through RAG pipeline
    ├─ Measure Context Relevance (% of correct docs in top-5)
    ├─ Measure Faithfulness (% of answer claims supported by context)
    ├─ Measure Answer Relevance (answer addresses the query)
    └─ Alert if any metric drops >10% from baseline

  If drop detected → Investigate:
    ├─ Did knowledge base get stale? (re-index)
    ├─ Did embedding model change? (re-embed all docs)
    ├─ Did LLM inference params change? (rollback or retune)
    └─ Is retrieval filter too strict? (adjust recency threshold)
```

---

## How do you handle hallucinations in RAG?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Hallucinations in RAG happen when the LLM either: (1) ignores the retrieved context and uses training data instead, or (2) generates plausible-sounding but false details to "fill gaps" in the context. Fix it by: **(a) enforcing context grounding** via prompt engineering ("Answer ONLY using the provided context"), **(b) running consistency checks** (compare LLM answer against source documents), **(c) using smaller, instruction-tuned models** (GPT-3.5, Llama 2 instruct) rather than huge models prone to confabulation, and **(d) adding confidence thresholds** (if retrieval score < 0.7 or no context found, say "I don't know" rather than guessing).

**Common Hallucination Patterns in RAG:**

1. **Context Ignorance**: LLM has context but chooses to use training data instead
   - Cause: Model was trained to "be helpful" even when context is missing
   - Example: Q: "What's the capital of Narnia?" Context: [empty, no Narnia in knowledge base]. LLM answers: "Cair Paravel" (from training data, not context)
   - Fix: Prompt: "If the context does not contain the answer, say 'I don't have this information.'"

2. **Gap-filling**: LLM retrieves partial context and invents the rest
   - Cause: Retrieved doc says "Product X supports Linux" but doesn't mention Windows
   - LLM infers: "Product X supports Linux and Windows" (confabulation)
   - Fix: Prompt: "Only mention features explicitly listed. Do not infer or generalize."

3. **Temporal Confusion**: LLM mixes current date with outdated context
   - Cause: Context from March 2023, LLM answers as if it's Sept 2026
   - Example: Q: "Is X still on sale?" Context: "Sale runs through March 2023." LLM: "Yes, the sale is still active!" (false)
   - Fix: Prepend current date to prompt: "Today is September 3, 2026. Evaluate context in this context."

**Production Safeguards:**

```python
def safe_rag_answer(query, retrieved_docs):
    """
    RAG with hallucination guards.
    """
    
    # Guard 1: Check if retrieval was confident
    max_relevance_score = max([doc['score'] for doc in retrieved_docs], default=0)
    if max_relevance_score < 0.6:
        return {
            'answer': "I don't have enough information to answer this confidently.",
            'confidence': 0.0,
            'retrieved_docs': []
        }
    
    # Guard 2: Build grounded prompt
    context_text = "\n".join([
        f"[Source: {doc['metadata']['source']}, Updated: {doc['metadata']['updated_at']}]\n{doc['text']}"
        for doc in retrieved_docs
    ])
    
    prompt = f"""
You are a helpful assistant. Answer ONLY based on the provided context.
If the context does not contain the answer, say "I don't have this information."
Do NOT infer, assume, or use external knowledge.

Today's date is: 2026-09-03

Context:
{context_text}

Question: {query}

Answer:
"""
    
    # Guard 3: Use smaller, instruction-tuned model
    answer = llm_call(
        prompt=prompt,
        model="gpt-3.5-turbo",  # Not GPT-4; smaller model = fewer hallucinations
        temperature=0.0,  # Deterministic, no creativity
        max_tokens=200
    )
    
    # Guard 4: Consistency check
    hallucination_check = llm_call(
        prompt=f"""
Given the context:
{context_text}

Does this answer contradict any fact in the context?
Answer: "yes" or "no"

Answer: "{answer}"
Contradict: """,
        model="gpt-3.5-turbo",
        temperature=0.0
    )
    
    if "yes" in hallucination_check.lower():
        # Answer contradicts context
        answer = "I cannot provide an accurate answer based on the available information."
        confidence = 0.0
    else:
        confidence = min(max_relevance_score, 0.95)  # Cap at 0.95 even if retrieval perfect
    
    return {
        'answer': answer,
        'confidence': confidence,
        'retrieved_docs': retrieved_docs,
        'sources': [doc['metadata']['source'] for doc in retrieved_docs]
    }
```

---

## How do you choose between fine-tuning, RAG, and prompt engineering for knowledge?

**SIMPLE EXPLANATION — Read This First**

| Approach | Use When | Pros | Cons |
| --- | --- | --- | --- |
| **Prompt Engineering** (in-context learning) | Small, <10K domain facts; questions ask for general reasoning | Instant to deploy, cheap, flexible | Doesn't scale; hits token limits; knowledge becomes stale |
| **RAG** (retrieval + LLM) | Medium, 100K–100M facts; knowledge changes frequently; need attribution | Scalable, updatable, explainable, fresh data | Retrieval can fail; hallucinations still possible; latency +50–100ms |
| **Fine-tuning** | Large, >1M facts; knowledge rarely changes; need model-native understanding | Knowledge encoded in weights; no retrieval latency; works with small models | Expensive ($1K–$10K+ per model), slow to update, black-box |

---

**DEEP DIVE — Comparative Analysis**

### Scenario 1: Real-time Product Pricing (thousands of SKUs, updates daily)
→ **Use RAG**
- Pricing changes every day; fine-tuning takes hours
- 10K SKUs fit in RAG; fine-tuning would be overkill
- Users need source attribution ("Prices from [URL], updated Sept 3")
- Prompt engineering alone can't handle scale + freshness

### Scenario 2: Coding Assistant (general programming knowledge)
→ **Use Prompt Engineering** (in-context) + **fine-tuning** (if accuracy critical)
- Knowledge is stable (Python syntax doesn't change daily)
- Users don't need source attribution ("It's just how Python works")
- Fine-tuned model on millions of Stack Overflow examples = better domain understanding
- Few-shot examples in prompt (prompt engineering) are enough for casual queries

### Scenario 3: Customer Support (mix of FAQs, policies, real-time tickets)
→ **Use RAG** with fallback to **prompt engineering**
- FAQs are relatively stable (RAG is fine)
- Real-time support tickets change constantly (RAG + vector DB allows fast indexing)
- Source attribution matters (link user to FAQ)
- Fine-tuning would lag behind policy changes

### Scenario 4: Specialized Domain (medical diagnosis, legal contracts)
→ **Use RAG + fine-tuning hybrid**
- RAG: Retrieve relevant case law, medical guidelines, regulations (fresh + explainable)
- Fine-tuning: Small specialized LLM trained on domain patterns, runs after retrieval (higher accuracy)
- Never rely on prompt engineering alone (liability/accuracy risk)

---

## What is semantic chunking and why does it matter in RAG?

**SIMPLE EXPLANATION — Read This First**

Short Answer: **Semantic chunking** means splitting documents into pieces based on *meaning* rather than just character/token count. Instead of "split every 512 tokens," you split whenever the topic or semantics changes. This prevents cutting mid-sentence, keeps related ideas together, and improves retrieval quality because each chunk is a coherent semantic unit.

**Why it matters:**
- **Fixed-size chunking (naive)**: "The price is $99/month. Features include: 1) Auth 2) Storage" → cut at 512 tokens → chunk 1 ends with "$99/month", chunk 2 starts with "Features". When queried "cost," one chunk is retrieved, missing "Features" context.
- **Semantic chunking**: Recognizes "$99/month" and "Features" are part of the same logical unit → keeps them in one chunk.

**Methods:**

1. **Sentence-level splitting** (simplest)
   ```python
   chunks = text.split(". ")  # Split on periods
   ```
   Pro: Coherent
   Con: Sentences vary in length; may merge very long sentences

2. **Recursive splitting by markers** (better)
   ```python
   # Split by paragraphs (double newline), then sentences, then fixed token count
   # Preserves structure better than naive fixed-size
   ```

3. **Embedding-based semantic splitting** (best for RAG)
   ```python
   # Chunk text into sentences
   sentences = split_into_sentences(text)
   
   # Embed each sentence
   embeddings = [embed(s) for s in sentences]
   
   # Calculate semantic distance between consecutive sentences
   breakpoints = []
   for i in range(len(embeddings) - 1):
       similarity = cosine_similarity(embeddings[i], embeddings[i+1])
       if similarity < THRESHOLD (e.g., 0.8):  # Semantic break detected
           breakpoints.append(i)
   
   # Merge sentences into chunks at breakpoints
   chunks = merge_sentences_at_breakpoints(sentences, breakpoints)
   ```

**Comparison:**

| Chunking Method | Quality | Latency | Cost | Complexity |
| --- | --- | --- | --- | --- |
| Fixed-size (512 tokens) | Poor (context loss) | <1ms | $0 | None |
| Recursive (paragraphs → sentences) | Medium | <10ms | $0 | Low |
| Embedding-based (semantic) | High (coherent chunks) | 100–500ms | $0.05–0.20 per doc | Medium |

**When to use:**
- **RAG on technical docs** (code, APIs, manuals): embedding-based (breaks on topic changes)
- **RAG on short FAQs**: recursive (enough semantic coherence)
- **Prototype/MVP**: fixed-size (fast to set up, acceptable quality)

