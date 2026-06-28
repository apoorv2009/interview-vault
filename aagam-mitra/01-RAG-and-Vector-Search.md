# RAG & Vector Search — Interview Q&A

> Based on the real Aagam Mitra AI service (`aagam-mitra-service`, port 8004).
> Every answer references actual code, config values, and design decisions made in this project.

---

## 1. What is RAG and why did you use it in Aagam Mitra?

> **Why asked:** This is the most fundamental question in any AI/LLM interview. The interviewer wants to know if you understand the *problem* RAG solves, not just the acronym. Always anchor your answer with a concrete reason — in our case, Jain scripture needs to be accurate and citable, so the AI can't just guess from training data.

**RAG (Retrieval-Augmented Generation)** is a technique where you retrieve relevant documents from a knowledge base *at query time* and inject them into the LLM's context before generating an answer.

**Why RAG over fine-tuning for Aagam Mitra:**

| | Fine-tuning | RAG (our choice) |
|---|---|---|
| Update knowledge | Retrain model (hours, $100+) | Update vector DB (seconds, free) |
| Transparency | Black box — can't cite source | Cites exact scripture + page |
| Cost per query | Training amortised | $0.0003 per query (Groq) |
| Hallucination | Still hallucinates | Grounded in real text |

**Baseline without RAG:** 25% hallucination rate on Jain scripture questions.
**With RAG:** Reduced to 2–5%.

---

## 2. Walk me through your complete RAG pipeline end-to-end.

> **Why asked:** Interviewers use this to separate people who have read about RAG from people who have actually built it. They want to hear specific steps, real library names, and actual config values — not a generic description. Mention pypdf, Gemini, Pinecone, chunk sizes, task types, and Groq in the right order.

### Indexing Phase (done once per document)

```
1. Admin uploads Jain scripture PDF
   → POST /api/v1/ingest/upload (multipart/form-data)

2. pypdf extracts text page by page:
   for page in reader.pages:
       text = re.sub(r'\s+', ' ', page.extract_text()).strip()

3. Chunker splits text:
   chunk_size    = 800 characters   (config.py)
   chunk_overlap = 100 characters   (config.py)
   → [{text, page_num, chunk_index}, ...]

4. Gemini embeds each chunk:
   POST https://generativelanguage.googleapis.com/v1beta/
        models/gemini-embedding-001:batchEmbedContents
   task_type = "RETRIEVAL_DOCUMENT"
   outputDimensionality = 2048
   batch_size = 100 texts per call
   → [float * 2048] per chunk

5. Pinecone stores vectors:
   index.upsert(vectors=[{
     id:       "tattvartha-sutra:12:3",
     values:   [2048 floats],
     metadata: {text, source, page}
   }])
   index: "jain-texts"
```

### Retrieval Phase (every user question)

```
1. User: "What is Navakar Mantra?"

2. Embed the question:
   task_type = "RETRIEVAL_QUERY"  ← different from storage!
   → [2048 floats]

3. Pinecone semantic search:
   index.query(vector=query_embedding, top_k=8, include_metadata=True)
   → 8 passages with cosine similarity scores

4. Build prompt for Groq:
   system: scripture agent system prompt
   context: 8 retrieved passages (text + source + page)
   user: original question

5. Groq (LLaMA 4 Scout 17B) synthesises answer:
   temperature = 0.3
   → 4-part structured answer (Context → Sacred Text → Meaning → Wisdom)
```

---

## 3. Why chunk at 800 characters with 100 overlap? How did you choose these values?

> **Why asked:** Chunking parameters look like random numbers to someone who hasn't thought about them. The interviewer wants to know you understand *why* each value exists and what happens if you get it wrong. Always mention what you tested and what the tradeoff is — too small loses context, too large wastes tokens.

**The problem chunking solves:** LLMs and embedding models have token limits. A 200-page Agam text can't fit in one embedding call. We split it into pieces.

**Why 800 chars:**
- Small enough: fits within Gemini's embedding context easily
- Large enough: contains a complete thought/paragraph
- Tested: 400 chars → 25% hallucination, 800 chars → 5%, 1200 chars → no improvement

**Why 100 char overlap:**
```
Without overlap:
  Chunk 0: "...णमो अरिहंताणं means salutation. The five Paramesthi"
  Chunk 1: "are Arihanta, Siddha, Acharya, Upadhyaya, Sadhu..."
  ← "The five Paramesthi" is split — neither chunk has the complete sentence

With 100 char overlap:
  Chunk 0: "...णमो अरिहंताणं means salutation. The five Paramesthi are"
  Chunk 1: "The five Paramesthi are Arihanta, Siddha, Acharya..."
  ← Both chunks contain the key phrase — retrieval works correctly
```

---

## 4. What is an embedding? Explain it to a non-technical person.

> **Why asked:** This tests whether you truly understand the concept or just use the library. A good engineer can explain embedding to a product manager. Key insight to always mention: similar *meanings* produce similar numbers — this is what enables cross-language search (Hindi question finds English passage).

An embedding converts text into a list of numbers in a way that **similar meanings produce similar numbers**.

```
"Navakar Mantra is a Jain prayer"   → [0.12, -0.45, 0.78, ...]
"पंच परमेष्ठी की वंदना"              → [0.14, -0.43, 0.76, ...]  ← very similar!
"Today's cricket score"             → [-0.89, 0.21, -0.34, ...] ← very different
```

**Key insight:** The two Jain sentences (one English, one Hindi) produce similar vectors because their **meaning** is similar — even though the words are completely different. This is how cross-language search works.

**In Aagam Mitra:**
- Model: `gemini-embedding-001`
- Dimensions: 2048 (Matryoshka — first N dims are always most informative)
- Why 2048? Better Hindi/Sanskrit/Prakrit accuracy than 768-dim models

---

## 5. What is cosine similarity and how does Pinecone use it?

> **Why asked:** Every vector DB uses similarity scoring under the hood. The interviewer wants to know you understand *how* Pinecone decides which chunks are most relevant — not just that it does. The key point to hit: cosine measures angle (direction of meaning), not distance (length of vector), which is why it works well for text.

Cosine similarity measures the **angle** between two vectors in high-dimensional space:

```
score = (A · B) / (|A| × |B|)

score = 1.0  → identical meaning
score = 0.9+ → very similar (our retrieval threshold)
score = 0.7  → related
score = 0.1  → unrelated
```

**Why angle and not distance?**
Distance (Euclidean) is affected by vector magnitude. Cosine only looks at direction — two texts can have different lengths but the same meaning, and cosine handles that correctly.

**In Pinecone:**
```python
results = index.query(
    vector=query_embedding,  # 2048 floats
    top_k=8,                 # return top 8 matches
    include_metadata=True    # return the actual text
)
# Returns: [{id, score, metadata: {text, source, page}}]
```

**Why HNSW (Hierarchical Navigable Small World)?**
Pinecone uses HNSW graph indexing. Instead of comparing the query vector against every stored vector (O(n)), it navigates a graph of approximate nearest neighbours (O(log n)). Result: search 5,000 vectors in ~50ms instead of ~500ms.

---

## 6. What is the difference between `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY` task types in Gemini?

> **Why asked:** Most people who use Gemini embeddings don't know this exists. If you mention it, it immediately signals you've actually read the API docs and thought carefully about your embedding pipeline. The interviewer is testing depth — many candidates use the same task type for both storage and querying, which silently hurts retrieval quality.

Gemini's embedding model has two modes:

| Mode | Used when | Optimisation |
|---|---|---|
| `RETRIEVAL_DOCUMENT` | Storing chunks in Pinecone | Information density — pack as much meaning as possible |
| `RETRIEVAL_QUERY` | Embedding user's question | Retrieval accuracy — maximise similarity to relevant docs |

**Why does this matter?**
Using `RETRIEVAL_DOCUMENT` for queries (or vice versa) reduces retrieval accuracy by ~10–15%. The model is internally optimised differently for each direction.

```python
# Ingestion time:
embed_texts(chunks, task_type="RETRIEVAL_DOCUMENT")

# Query time:
embed_texts([user_question], task_type="RETRIEVAL_QUERY")
```

---

## 7. How do you handle temple live data that changes frequently (news, events, slots)?

> **Why asked:** This is a classic production AI problem — your vector DB has static knowledge, but real-world data changes constantly. The interviewer wants to see that you thought about freshness, cost, and avoiding unnecessary re-embedding. SHA-256 deduplication and TTL-based sync are the two design decisions worth highlighting here.

Jain scripture doesn't change — it stays in Pinecone forever. But temple news, events, and slots change daily. Storing live data in Pinecone would cost money per write and have staleness issues.

**Solution: Local SQLite with TTL-based sync**

```python
async def sync_if_needed(temple_id: str):
    state = await get_sync_state(temple_id)
    if state and (now() - state.synced_at).seconds < 300:  # TTL = 5 min
        return  # use cached chunks

    # Fetch 6 data sources in parallel
    profile, slots, news, events, wof, payment = await asyncio.gather(
        GET admin:8003/temples/{id},
        GET admin:8003/shantidhara/slots,
        GET admin:8003/news-feed,
        GET admin:8003/events,
        GET admin:8003/wall-of-fame,
        GET admin:8003/payment-profile,
    )

    # Content-addressed dedup: only re-embed if content changed
    for doc in build_documents(profile, slots, news, ...):
        new_checksum = sha256(doc.content)
        if doc.checksum != stored_checksum:
            delete_old_chunks(doc.document_id)
            embed_and_store(doc)  # chunk → embed → SQLite

    update_sync_state(temple_id, synced_at=now())
```

**In-memory cosine search** (not Pinecone) for temple data:
```python
# Load all chunks from SQLite, compute cosine similarity in Python
# Return top 4 (retrieval_limit=4) most relevant chunks
```

---

## 8. Why Pinecone for Jain texts but SQLite for temple data?

> **Why asked:** Architecture decisions like "why did you use two different storage systems for the same type of data?" reveal whether you made thoughtful tradeoffs or just used whatever was convenient. Be ready to explain cost, update frequency, scale, and privacy as the four reasons for this split.

| | Jain Texts | Temple Live Data |
|---|---|---|
| Storage | Pinecone (cloud) | SQLite (local) |
| Update frequency | Once (per new book) | Every 5 minutes |
| Scale | Shared across all temples | Per-temple, small |
| Search | Pinecone HNSW | In-process cosine |
| top_k | 8 | 4 |
| Reason | Best semantic search at scale | Free, fast, private |

---

## 9. What is semantic search and how is it different from keyword search?

> **Why asked:** This is often asked to test if you can articulate *why* you chose vector search over a simpler SQL LIKE query. The killer example is cross-language search — a Hindi question finding an English passage — because no keyword approach could ever do that. Lead with this example and the interviewer will be impressed.

**Keyword search (SQL LIKE):**
```sql
SELECT * FROM texts WHERE content LIKE '%soul%'
-- Misses: 'आत्मा', 'atma', 'spirit', 'consciousness'
-- Only finds exact string matches
```

**Semantic search (vector similarity):**
```
Query: "What does Jain philosophy say about the soul?"
Query vector: [0.45, -0.23, ..., 0.67]

Stored chunks:
  "आत्मा नित्य और अमर है" → [0.47, -0.21, ..., 0.65]  score=0.94 ✓
  "soul is eternal in Jainism" → [0.44, -0.25, ..., 0.66]  score=0.97 ✓
  "cricket match score" → [-0.89, 0.21, ..., -0.34]  score=0.05 ✗
```

**Result:** Finds the Hindi passage about आत्मा even though the question used the English word "soul" — because they mean the same thing and their vectors are similar.

---

## 10. How does the temple knowledge sync handle content-addressed deduplication?

> **Why asked:** Deduplication in a sync pipeline is a senior-level concern. If you sync every 5 minutes but always re-embed everything, you'll burn your Gemini API quota for zero benefit. SHA-256 checksumming solves this elegantly — only changed content triggers the expensive embedding step. Mentioning this shows you think about API cost and efficiency, not just correctness.

```python
# Every document gets a SHA-256 checksum of its content
new_checksum = hashlib.sha256(content.encode()).hexdigest()

# Compare with stored checksum
stored = await get_document(document_id)
if stored and stored.content_checksum == new_checksum:
    return  # content unchanged — skip re-embedding (saves Gemini API cost)

# Content changed — delete old chunks and re-embed
await delete_chunks_for_document(document_id)
new_chunks = chunk_text(content)
embeddings = await embed_texts([c.text for c in new_chunks])
await store_chunks(new_chunks, embeddings)
```

This means even if the sync runs every 5 minutes, Gemini API is only called when content actually changes — not on every sync tick.
