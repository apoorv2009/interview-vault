# Users Ask in Casual Hindi-English Like 'kitna refund milega for cancelled order' — But Your Docs Are in Formal English. How Do You Handle Code-Mixed Queries in Retrieval?

*Asked at Meesho AI Engineer Interview. Tests multilingual NLP, embedding model selection, and RAG pipeline design for code-mixed (Hinglish) user queries.*

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

---

## 1. Problem Framing

**Code-mixing** (Hinglish = Hindi + English) is the dominant user input pattern for Indian consumer apps (Meesho, Flipkart, Swiggy, PhonePe). The challenge has three layers:

| Layer | Problem | Naive Failure |
|---|---|---|
| **Tokenization** | Hinglish words like "milega", "karo" aren't in English vocab | Token split into `[mi, ##le, ##ga]` — destroys semantic meaning |
| **Embedding mismatch** | Query is Hinglish; documents are formal English. Their embedding spaces don't align. | Cosine similarity is low even when meaning matches |
| **Retrieval miss** | "kitna refund milega" doesn't surface "Refund Policy for Cancelled Orders" | User gets no answer; escalates to human agent |

---

## 2. Solution Architecture — Layered Approach

```
User Query: "kitna refund milega for cancelled order"
        │
        ▼
┌──────────────────────────────────────────────┐
│  Layer 1: Language Detection + Query Router   │
│  langdetect / fastText → "hi-en" (code-mixed) │
└───────────────────┬──────────────────────────┘
                    │
        ┌───────────┴────────────┐
        │                        │
        ▼                        ▼
┌───────────────┐     ┌──────────────────────────┐
│  Path A:      │     │  Path B:                  │
│  Multilingual │     │  Query Translation         │
│  Embedding    │     │  (Hinglish → English)      │
│  (mBERT/      │     │  via LLM or IndicTrans2   │
│  LaBSE/       │     └──────────┬───────────────┘
│  MuRIL)       │                │
└───────┬───────┘                ▼
        │              Formal English query:
        │              "How much refund for cancelled order?"
        │                        │
        └──────────┬─────────────┘
                   ▼
        ┌──────────────────────┐
        │   Vector Store        │  ← Docs embedded with SAME model
        │  (Pinecone/Weaviate)  │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │   Re-ranker           │  ← Cross-encoder scores (language-agnostic)
        │  (mMiniLM / Cohere   │
        │   Rerank multilingual)│
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │   LLM Response        │  ← Answer in user's preferred language
        │  (respond in Hindi    │     if detected as Hindi-dominant
        │   or Hinglish)        │
        └──────────────────────┘
```

---

## 3. Core Fix: Use a Multilingual Embedding Model

Standard English-only models (OpenAI `text-embedding-ada-002`, BGE-en) fail on Hinglish. Replace with a multilingual model that has joint embedding space:

| Model | Languages | Best For | Notes |
|---|---|---|---|
| **MuRIL** (Google) | 17 Indian languages + Hinglish | Indian code-mixed specifically | Trained on scraped Hinglish data; best for this use case |
| **LaBSE** (Google) | 109 languages | Cross-lingual similarity | Strong for sentence-level; handles code-mixing reasonably |
| **mE5 / mBGE** | 100+ languages | General multilingual RAG | Strong retrieval benchmark on MIRACL |
| **Cohere Embed Multilingual v3** | 100+ languages | Production SaaS | High quality; API-based; handles Hinglish well |

**Key principle:** Both the query and the documents must be embedded with the **same multilingual model**. If you embed docs with an English model and queries with a multilingual model, the vector spaces don't align.

---

## 4. Query Translation as a Parallel Path

Run a lightweight LLM (GPT-4o-mini, Claude Haiku, or IndicTrans2 NMT) to translate the Hinglish query to formal English **in parallel** with multilingual embedding retrieval. Merge results:

```python
async def retrieve_code_mixed(query: str):
    # Run both paths concurrently
    results_multilingual, results_translated = await asyncio.gather(
        retrieve_multilingual(query),           # Path A: multilingual embedding
        translate_then_retrieve(query)          # Path B: translate → English retrieval
    )
    # Merge and deduplicate by doc_id
    merged = reciprocal_rank_fusion([results_multilingual, results_translated])
    return merged
```

**Reciprocal Rank Fusion (RRF):** Combines ranked lists from multiple retrievers without score normalization issues. RRF score = Σ 1/(k + rank_i) where k=60.

---

## 5. Hybrid Retrieval: BM25 + Dense

For Hinglish queries, pure dense retrieval misses English keywords that ARE in formal docs. Hybrid retrieval helps:

- **BM25** catches exact English token matches: "refund", "cancelled", "order" — these appear verbatim in docs even if the surrounding query is Hindi.
- **Dense (multilingual embedding)** catches semantic meaning of the Hindi parts: "milega" (will I get) → intent = "am I eligible for".
- Combined via RRF or weighted sum.

---

## 6. Document-Side Augmentation

Augment your formal English docs with Hinglish paraphrases at indexing time:

```
Original doc chunk: "Refund is processed within 5-7 business days for cancelled orders."

Augmented with:
"kitna refund milega cancelled order pe? 5-7 business days mein refund aayega."
"order cancel kiya to paisa kab milega?"
```

Store augmented chunks alongside originals — they act as "retrieval anchors" for Hinglish queries without changing the authoritative source text. Use an LLM to generate augmentations at ingest time (one-off cost, not per-query).

---

## 7. Re-ranking: Language-Agnostic Scoring

After retrieval, use a **cross-encoder re-ranker** that understands both languages to score (query, chunk) pairs:

- `cross-encoder/mmarco-mMiniLMv2-L12-H384` — multilingual cross-encoder trained on MS MARCO multilingual
- `Cohere Rerank Multilingual` — API-based, production-ready
- Re-ranker sees the full query and full chunk — catches semantic alignment the bi-encoder missed.

---

## 8. Response Language Matching

Detect the dominant language of the user's query (`langdetect` or `fastText`) and instruct the LLM to respond accordingly:

```python
system_prompt = f"""
You are a customer support assistant for Meesho.
Answer based ONLY on the provided context.
Respond in {detected_language} language.
If the user wrote in Hinglish, respond in simple Hinglish they understand.
"""
```

---

## 9. Theoretical Frameworks

### CAP Theorem Applied to Multilingual RAG

The translation pipeline is an AP system — it may translate incorrectly under ambiguity (partial consistency) but always returns an answer (high availability). For customer support, availability > perfect consistency: a slightly imperfect answer is better than "I don't understand your query."

### PACELC — Latency vs Accuracy Trade-off

- **EL (Latency):** Skip translation, use multilingual embedding only. Faster (single retrieval pass) but may miss some queries.
- **EC (Accuracy):** Run translation + multilingual embedding in parallel, merge with RRF. Better recall (+15–20% on Hinglish queries in experiments) at +50–100ms latency.
- **Production decision:** Use EL for real-time chat (< 500ms SLO), EC for async support ticket processing where accuracy matters more.

### Write Amplification — Indexing Augmented Chunks

Generating Hinglish paraphrases at index time amplifies write cost: if each chunk gets 3 Hinglish variants, your index is 4x larger. Trade-off: higher storage/indexing cost → much better recall for Hinglish queries. Acceptable if the retrieval quality improvement reduces human escalation (expensive) by > cost of larger index.

### Read/Write Trade-off

This is fundamentally a **read-path optimization** — query-time translation vs index-time augmentation:
- Index-time augmentation = write-heavy, read-light (pay cost once, benefit forever)
- Query-time translation = write-light, read-heavy (pay cost every query)
- **Recommendation:** Hybrid — augment high-traffic doc clusters at index time; fall back to query-time translation for long-tail queries.

---

## 10. Interview-Ready Summary

| Naive Approach | Production Approach |
|---|---|
| English embedding model + English docs → zero recall on Hinglish | Multilingual model (MuRIL/LaBSE) for both query and doc embedding |
| Single retrieval pass | Hybrid BM25 + dense, merged via RRF |
| No query translation | Parallel translation path + RRF merge |
| English-only re-ranker | Multilingual cross-encoder re-ranker |
| English response always | Detect query language → respond in same language |
| Docs indexed once | Augment docs with Hinglish paraphrases at ingest |
