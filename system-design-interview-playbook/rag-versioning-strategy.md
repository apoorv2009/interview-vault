# Your RAG data changes every hour. How do you manage versioning without breaking the system?

**SIMPLE EXPLANATION — Read This First**

Short Answer: If you treat RAG like static data, you are one update away from a production outage. RAG has THREE things that need versioning: (1) the documents, (2) the embeddings/vectors, (3) the index itself. Each has different rules.

- Why versioning is hard in RAG: Changing a document is not like changing a database row. The document affects: which chunks were created, which vectors were generated, how the index is structured. A naive in-place update breaks everything mid-query.
- Layer 1 — Document versioning: Every document needs a version ID and a content hash. Never overwrite the original. Store new versions alongside old ones (like S3 versioning). This way you can always see "what did the system know on Jan 15?"
- Layer 2 — Embedding versioning: If you upgrade your embedding model (e.g., from ada-002 to text-embedding-3-large), ALL your old vectors become useless — you cannot mix vectors from different models in the same index. You must version the embedding model and re-index when it changes.
- Layer 3 — Index versioning (most critical): NEVER update the live index while it is serving queries. Instead: build a new index in the background, test it, then swap traffic to it. This is called Blue/Green deployment. Zero downtime.
- Hourly updates — incremental strategy: With hourly changes, you cannot re-index all 5000 documents every hour. Instead: hash each document's content. Only re-process documents whose hash changed. Skip unchanged ones. This reduces hourly work from 5000 documents to typically ~100.
- Metadata tagging for traceability: Every chunk stored in the index must carry: doc_id, doc_version, ingested_at, embedding_model_version. This lets you filter by version ("show only chunks from documents valid on date X") and debug wrong answers ("which document version produced this answer?").
- Testing before promoting: Before switching to a new index version: run your eval set (100+ known question-answer pairs). The new index must match or beat the old one. Only promote it to production if it passes.

**DEEP DIVE — Technical Architecture Below**

## Three Versioning Layers

| Layer | What Versions | Update Frequency | Breaking If Wrong |
| --- | --- | --- | --- |
| Source Documents | New/updated files | Hourly | Stale answers — wrong but recoverable |
| Embeddings + Chunking | Embedding model upgrade | Weeks/months | Catastrophic — all distances meaningless |
| Vector Index | Schema/shard changes | Rarely | Downtime if changed in-place on live index |

## Hourly Incremental Update — Hash-Based

```
  Every hour:
  ┌────────────────────────────────────────────────────┐
  │  1. Get list of changed files from source system    │
  │  2. For each file:                                  │
  │       new_hash = SHA256(file_content)              │
  │       old_hash = registry.get(file_id)             │
  │       if new_hash == old_hash → SKIP (unchanged)   │
  │       else → queue for re-processing               │
  │  3. For changed docs:                              │
  │       soft-delete old chunks from vector index     │
  │       re-extract, re-embed, re-insert new chunks   │
  │       update registry (new version, new hash)      │
  └────────────────────────────────────────────────────┘
```

```
  Result: only ~100 docs re-processed per hour (not 5000)
```

## Blue/Green Index Deployment — For Embedding Model Upgrades

```
  Phase 1: Build new index in background (GREEN)
    Live traffic → BLUE index (stable, serving queries)
    Background  → re-embed ALL docs → GREEN index
    Users see no change
```

```
  Phase 2: Validate GREEN index
    Run eval set: 100+ known Q&A pairs
    GREEN must match or beat BLUE accuracy
    GREEN must not be slower than BLUE
```

```
  Phase 3: Atomic swap (milliseconds, zero downtime)
    alias "production" → BLUE   (before)
    alias "production" → GREEN  (after) ← one operation
```

```
  Phase 4: Keep BLUE for 24–48h
    Monitor GREEN for errors
    If problem detected: swap alias back to BLUE instantly
    After stability window: delete BLUE to save costs
```

## Metadata Schema — Full Traceability

```
# Every chunk stored with full version metadata:
{
    "chunk_id":        "chunk_abc123",
    "doc_id":          "policy_001",
    "doc_version":     3,
    "ingested_at":     "2024-01-15T14:30:00Z",
    "valid_from":      "2024-01-15",
    "valid_to":        null,         # null = currently active
    "embedding_model": "text-embedding-3-large",
    "content_hash":    "a3f9b2...",
}
```

```
# Query for current version only:
vector_db.query(q_vec, filter={"valid_to": None})
```

```
# Query for historical snapshot (audit):
vector_db.query(q_vec, filter={"valid_from": {"$lte": "2024-01-10"}})
```

## The Interview One-Liner

"RAG versioning uses hash-based incremental ingestion for hourly document changes, metadata tagging for per-chunk traceability, and blue/green index deployment for embedding model upgrades — ensuring the system stays live and queries always hit a consistent index version."

## Theoretical Framework — Interview Talking Points

- CAP Theorem: The RAG index is explicitly AP during updates: queries continue from the current index (available) while updates run in background (partition-tolerant), accepting that some answers may reference the previous document version (inconsistent). For most use cases (policy docs, product manuals), brief eventual consistency is correct.
- PACELC: Under normal operation (E): the system chooses Latency over Consistency. Serving from the current (slightly stale) index gives sub-100ms retrieval. Waiting for all hourly updates to complete before serving would create a 10–60 minute gap every hour — unacceptable for a real-time chatbot.
- Write Amplification: A full re-index triggers write amplification across: text re-extraction, re-embedding (API cost), vector DB upserts, BM25 rebuild. Incremental hash-based updates reduce this from O(N) to O(changed_docs) — typically O(100) vs O(5000) for hourly changes. 50x cost reduction.
- Execution Trade-offs: Index updates must be fully async relative to query serving. Synchronous updates (blocking queries during mutation) cause 503s every hour. Asynchronous blue/green deployment decouples update cadence from query availability. The alias swap is O(1) atomic regardless of index size — this is the clean solution to the sync/async trade-off.
