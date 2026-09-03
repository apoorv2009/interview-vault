# AI System Design Interview Guide: RAG & Agentic AI

Comprehensive interview guide for **Retrieval-Augmented Generation (RAG)** and **Agentic AI** system design patterns commonly asked at Big 4 consulting firms and tech companies.

---

# Part 1: RAG (Retrieval-Augmented Generation) System Design

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

**DEEP DIVE — Technical Architecture**

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
```

### Recency-Aware Retrieval Implementation

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
            recency_score = max(0, 1.0 - (age_days / max_doc_age_days))
            recent_docs.append({
                **match,
                'recency_score': recency_score,
                'age_days': age_days
            })
    
    # Pass 3: Re-rank by combined score
    for doc in recent_docs:
        doc['combined_score'] = (
            0.6 * doc['score'] +
            0.3 * doc['recency_score'] +
            0.1 * doc['metadata'].get('authority', 0.5)
        )
    
    return sorted(recent_docs, key=lambda x: x['combined_score'], reverse=True)[:5]
```

---

## How do you validate retrieval quality in RAG? (RAGAS Metrics)

**SIMPLE EXPLANATION — Read This First**

Short Answer: RAG retrieval quality is measured by **RAGAS metrics** (Retrieval-Augmented Generation Assessment):
- **Context Relevance**: Does the retrieved document actually answer the question? (0–1, higher = better)
- **Faithfulness**: Did the LLM answer match the retrieved context, or did it hallucinate? (0–1, higher = better)
- **Answer Relevance**: Does the final answer address the user's question? (0–1, higher = better)

In production, track these continuously with a **ground-truth test set** (100–500 queries with known correct answers), measure baseline scores, then run weekly to catch retrieval drift.

---

## How do you handle hallucinations in RAG?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Hallucinations happen when LLMs ignore retrieved context or generate plausible-sounding false details. Fix it by: **(a) enforcing context grounding** via prompt engineering, **(b) running consistency checks**, **(c) using smaller, instruction-tuned models**, and **(d) adding confidence thresholds** (if retrieval score < 0.7, say "I don't know").

**Common Hallucination Patterns:**

1. **Context Ignorance**: LLM uses training data instead of provided context
2. **Gap-filling**: Partial context + LLM invents missing details
3. **Temporal Confusion**: Outdated context answered as current

**Production Safeguards:**

```python
def safe_rag_answer(query, retrieved_docs):
    # Guard 1: Check retrieval confidence
    max_relevance_score = max([doc['score'] for doc in retrieved_docs], default=0)
    if max_relevance_score < 0.6:
        return {'answer': "I don't have enough information.", 'confidence': 0.0}
    
    # Guard 2: Build grounded prompt
    context_text = "\n".join([
        f"[Source: {doc['metadata']['source']}, Updated: {doc['metadata']['updated_at']}]\n{doc['text']}"
        for doc in retrieved_docs
    ])
    
    prompt = f"""Answer ONLY based on the provided context.
If context doesn't contain the answer, say "I don't have this information."
Do NOT infer, assume, or use external knowledge.

Context: {context_text}
Question: {query}
Answer:"""
    
    # Guard 3: Use smaller, instruction-tuned model
    answer = llm_call(prompt=prompt, model="gpt-3.5-turbo", temperature=0.0, max_tokens=200)
    
    # Guard 4: Consistency check
    hallucination_check = llm_call(
        prompt=f"Given context:\n{context_text}\nDoes this answer contradict any fact?\nAnswer: \"{answer}\"\nContradict: ",
        model="gpt-3.5-turbo", temperature=0.0
    )
    
    if "yes" in hallucination_check.lower():
        answer = "I cannot provide an accurate answer based on available information."
        confidence = 0.0
    else:
        confidence = min(max_relevance_score, 0.95)
    
    return {'answer': answer, 'confidence': confidence, 'retrieved_docs': retrieved_docs}
```

---

## How do you choose between fine-tuning, RAG, and prompt engineering for knowledge?

**SIMPLE EXPLANATION — Read This First**

| Approach | Use When | Pros | Cons |
| --- | --- | --- | --- |
| **Prompt Engineering** | <10K facts, general reasoning | Fast, cheap, flexible | Doesn't scale, token limits, stale knowledge |
| **RAG** | 100K–100M facts, frequent updates, need attribution | Scalable, updatable, explainable | Retrieval can fail, hallucinations possible |
| **Fine-tuning** | >1M facts, stable knowledge, model-native understanding | Knowledge in weights, no retrieval latency | Expensive, slow to update, black-box |

**Scenario-based choices:**
- **Real-time pricing**: RAG (daily updates, no fine-tuning speed)
- **Coding assistant**: Prompt engineering + fine-tuning (stable knowledge)
- **Customer support**: RAG (fast-changing FAQs/policies)
- **Medical/legal**: RAG + fine-tuning hybrid (fresh + accurate)

---

## What is semantic chunking and why does it matter in RAG?

**SIMPLE EXPLANATION — Read This First**

Short Answer: **Semantic chunking** splits documents based on *meaning* rather than fixed token counts. Instead of "split every 512 tokens," you split when topic/context changes. This keeps related ideas together and improves retrieval quality.

**Methods:**

1. **Fixed-size (512 tokens)**: Fast, but loses context
2. **Recursive (paragraphs → sentences)**: Medium quality
3. **Embedding-based**: Best for RAG, calculates semantic distance between sentences and breaks where similarity drops

**Comparison:**

| Method | Quality | Latency | Cost | Complexity |
| --- | --- | --- | --- | --- |
| Fixed-size | Poor | <1ms | $0 | None |
| Recursive | Medium | <10ms | $0 | Low |
| Embedding-based | High | 100–500ms | $0.05–$0.20 | Medium |

---

---

# Part 2: Agentic AI System Design

## Your AI agent fixed a production issue but the fix increased the blast radius. How would you prevent that safely?

**SIMPLE EXPLANATION — Read This First**

Short Answer: An AI agent with production write access needs guardrails. Prevent blast radius by: (1) **limiting agent permissions** (principle of least privilege), (2) **requiring human approval** before deployment, (3) **testing in staging first**, (4) **canary deployment** (roll out to 5% first, monitor 30 min), (5) **automatic rollback triggers** (error rate >10% → rollback), and (6) **agent reasoning transparency** (log every decision for audit).

**Why It's Dangerous:**
- Agents optimize for immediate goal ("fix the error"), not system-wide consequences
- Example: Agent sees "database query slow" → adds index → INSERT performance drops 50% → cascading failures

**Production Safeguards:**

1. **Permission Model: Principle of Least Privilege**
   ```
   ❌ WRONG: Agent has AWS IAM admin role
   ✅ RIGHT: Agent has read-only + approval queue for writes
   ```

2. **Staged Rollout: Blast Radius Containment**
   ```
   Stage 1 — Staging (agent-owned)
     - Deploy fix to staging
     - Run synthetic traffic, monitor 15 minutes
     - If anything degrades: STOP
   
   Stage 2 — Canary (5% of prod traffic, human approved)
     - Human reviews cost/risk
     - Monitor real user traffic 30 minutes
     - If metrics good: continue to 100%
     - If anything wrong: auto-rollback
   
   Stage 3 — Full Rollout (if canary succeeds)
   ```

3. **Automatic Rollback Triggers (Circuit Breaker)**
   ```
   Metrics Monitored:
     - Error rate: if > 5% for >1 min → rollback
     - P99 latency: if > 2x baseline → rollback
     - CPU: if > 85% → rollback
     - Memory: if OOM → rollback
   ```

4. **Agent Reasoning Transparency: Audit Trail**
   ```json
   {
     "incident_id": "INC-20260903-12345",
     "detected_issue": {
       "symptom": "API latency p99 = 5s (baseline 200ms)",
       "root_cause_hypothesis": "Database query N+1 problem",
       "confidence": 0.78
     },
     "proposed_fix": {
       "type": "add_database_index",
       "estimated_blast_radius": "low",
       "cost": "+$5/month"
     },
     "approvals": {
       "human_approved": true,
       "approved_by": "alice@company.com"
     },
     "execution": {
       "stage": "canary_5_percent",
       "status": "success",
       "metrics_before": { "p99_latency": 5000 },
       "metrics_after": { "p99_latency": 800 }
     }
   }
   ```

5. **Agent Authority Tiers**
   ```
   Tier 1 — Read-only (diagnostic): read logs, query metrics
   Tier 2 — Config changes: adjust timeouts, toggle flags
   Tier 3 — Infrastructure: add indices, create caches (canary required)
   Tier 4 — Destructive: disabled by default (requires explicit approval)
   ```

---

## How do you prevent an AI agent from hallucinating in a multi-step decision tree?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Multi-step agents hallucinate by making up facts at intermediate steps. Prevent it by: **(1) grounding every step in real data** (query actual state, don't assume), **(2) explicit state tracking** ("what I know for sure" vs "what I'm assuming"), **(3) constraint checking** (verify each step's assumptions), and **(4) rollback on inconsistency** (stop and ask human).

**Example Hallucination:**

```
❌ WRONG: Agent assumes schema without checking
  Step 1: "I'll migrate data"
  Step 2 (Agent assumes): "Old DB has schema [X, Y, Z]"
  Step 3 (Agent fails): Creates script for wrong schema

✅ RIGHT: Ground every step in reality
  Step 1: "I need to verify source schema"
  Step 2 (Agent queries): SELECT * FROM information_schema.COLUMNS
  Result: Schema is [id, email, name, created_at] (not [X, Y, Z])
  Step 3: Create script based on VERIFIED schema → Success
```

**Implementation Pattern:**

```python
class GroundedMultiStepAgent:
    def execute_plan(self, user_request):
        known_facts = {}  # Track "what we know for sure"
        
        for step_info in plan:
            try:
                if action == "verify_source_schema":
                    schema = self.db.get_table_schema(table)
                    known_facts[f"schema"] = schema  # VERIFIED
                
                elif action == "transform_data":
                    # Before transforming, verify schema from Step 1 still true
                    source_schema = known_facts.get("schema")
                    if not source_schema:
                        raise Exception("Schema not verified. Cannot proceed.")
                    # Generate transform based on VERIFIED schema, not assumption
                    script = self.generate_transform_script(source_schema)
            
            except Exception as e:
                # If any step fails, halt and ask human
                recovery = self.ask_human(f"Step failed: {e}\nKnown facts: {known_facts}")
                if recovery == "rollback":
                    return {"status": "rolled_back"}
```

---

## How do you design guardrails for an AI agent in production?

**SIMPLE EXPLANATION — Read This First**

Guardrails are boundaries and safety checks that keep agents from doing harmful things. **Four layers:**

1. **Instruction-level** (in the prompt)
   - "You can read logs but cannot delete databases"
   - Weakest (can be overridden by clever reasoning)

2. **Permission-level** (enforced by infrastructure)
   - Agent runs with limited IAM role
   - Even if agent wants to delete, API call fails with 403 Forbidden
   - Stronger (agent can't bypass)

3. **Semantic-level** (monitored by observer LLM)
   - Before agent executes action, observer LLM checks: "Is this reasonable?"
   - Blocks absurd actions (creating 1000 replicas costing $100K)
   - Medium strength

4. **Operational-level** (monitored by systems)
   - Automatic rollback if metrics degrade
   - Rate limiting: agent can't execute >10 actions/minute
   - Canary deployment: changes go to 5% first
   - Strongest (automatic, no human needed)

**Guardrails Configuration:**

```yaml
permission_guardrails:
  aws_iam_role: "arn:aws:iam::ACCOUNT:role/ai-agent-production"
  permissions:
    - "logs:GetLogEvents"
    - "cloudwatch:GetMetricStatistics"
  denied_permissions:
    - "ec2:TerminateInstances"
    - "rds:DeleteDBInstance"

semantic_guardrails:
  checks:
    - name: "Cost Impact"
      block_if_cost: "> $1000/month"
    - name: "Data Loss Risk"
      block_if: "deletes data"
    - name: "Blast Radius"
      block_if: "> 20% of users affected"

operational_guardrails:
  rate_limits:
    actions_per_minute: 10
    deployments_per_hour: 5
  canary_deployment:
    stages: [{ percentage: 5, duration_minutes: 30 }, { percentage: 100 }]
  automatic_rollback:
    error_rate_threshold: 5%
    latency_threshold: "2x baseline"
```

---

## What's the difference between single-agent and multi-agent systems?

**SIMPLE EXPLANATION — Read This First**

| Aspect | Single Agent | Multi-Agent |
| --- | --- | --- |
| **What** | One LLM makes all decisions | Multiple specialized LLMs collaborate |
| **Example** | "Fix outage" (one agent) | Agent 1 diagnoses → Agent 2 proposes fix → Agent 3 deploys → Agent 4 validates |
| **Pros** | Simple, fast, no coordination | Better accuracy (specialists), handles complex problems |
| **Cons** | Limited context, hallucination risk | Coordination complexity, latency |

**Single-Agent:**
```
Input: "API is down, fix it"
Agent: Reads logs → determines root cause → proposes fix → deploys → validates
Output: "Fixed. Root cause was database connection pool exhaustion."
```

**Multi-Agent (Real Incident Response):**
```
Input: "API is down, fix it"

Agent 1 (Diagnostician):
  - Reads metrics, logs, traces
  - Determines: "Database queries taking 30s"
  - Passes to Agent 2

Agent 2 (Database Specialist):
  - Analyzes database metrics
  - Finds: "Connection pool at 95% capacity"
  - Proposes: "Optimize slow queries OR increase pool size"
  - Passes to Agent 3

Agent 3 (Performance Engineer):
  - Analyzes slow queries
  - Finds: "N+1 SELECT problem"
  - Proposes: "Add database index"
  - Passes to Agent 4

Agent 4 (DevOps):
  - Creates index in staging, tests
  - Deploys to production (canary)
  - Monitors: no regression
  - Passes to Agent 5

Agent 5 (Validator):
  - Confirms: API latency back to normal
  - Verifies: no new errors, no data corruption
  - Closes incident

Output: "Fixed by optimizing slow queries. Root cause: N+1 pattern."
```

**Multi-Agent Coordination Patterns:**
- **Sequential**: Agent 1 → Agent 2 → Agent 3 (slow but clear dependencies)
- **Parallel**: Agent 1 → (Agent 2, 3, 4 in parallel) → Agent 5 (fast but coordination complex)
- **Hierarchical**: Manager routes to specialists (scalable)

**When to use:**
- **Single-agent**: Simple tasks, latency-sensitive, well-defined domain
- **Multi-agent**: Complex domains (incident response), specialists outperform generalists

---

## Interview Strategy

### For RAG Questions:
1. Start with the problem: "Why does my RAG return old data?"
2. Propose layered solutions: metadata → recency filtering → user feedback → auto refresh
3. Mention trade-offs: storage cost, latency, accuracy
4. Discuss metrics: RAGAS for validating your solution
5. Production example: "We use Pinecone with metadata filtering + weekly re-indexing"

### For Agentic AI Questions:
1. Start with safety: "I'd never give an agent write access without guardrails"
2. Propose staged rollout: staging → canary 5% → monitor → 100%
3. Emphasize transparency: "Every agent decision is logged and auditable"
4. Mention circuit breakers: "If error rate spikes, we auto-rollback"
5. Real example: "Our incident response multi-agent system has 5 tiers"

---

## Key Takeaways Checklist

### RAG System Design
- [ ] Explain stale data problem and recency filtering solution
- [ ] Define RAGAS metrics (Context Relevance, Faithfulness, Answer Relevance)
- [ ] Explain when to use RAG vs fine-tuning vs prompt engineering
- [ ] Discuss semantic vs fixed-size chunking trade-offs
- [ ] Describe multi-pass retrieval (vector search → temporal filter → ranking)

### Agentic AI System Design
- [ ] Explain principle of least privilege for agent permissions
- [ ] Describe staged rollout (staging → canary 5% → full)
- [ ] List automatic rollback triggers (error rate, latency, CPU)
- [ ] Explain grounding multi-step agents in reality
- [ ] Describe four layers of guardrails
- [ ] Compare single-agent vs multi-agent with examples

---

**Last Updated**: September 3, 2026
**Level**: Senior / Staff Engineer (Big 4 Consulting, Tech Lead interviews)
