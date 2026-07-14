# RAG Learning Journey — Progress Tracker

**Goal:** Master all 10 RAG patterns from simple to production-grade.

**Status:** 27 Q&As completed ✅

---

## ✅ Completed

### RAG Patterns (Q1-Q2)
All 10 patterns explained in detail with code examples:
1. **Naive RAG** — Simple fixed pipeline
2. **Advanced RAG** — Query rewrite + reranking
3. **Modular RAG** — Pluggable components
4. **Agentic RAG** ✅ — LLM chooses tools (Aagam Mitra uses this)
5. **Multi-Agent RAG** ✅ — Specialist agents (Aagam Mitra uses this)
6. **Corrective RAG** — Validate + retry
7. **Self-RAG** — LLM self-reflects
8. **Graph RAG** — Entity relationships
9. **Hybrid Search** — Dense + keyword
10. **RAG-Fusion** — Multiple query variants

### Deep Dives (Q25-Q27)
- **Q25:** Corrective RAG (CRAG) — detailed explanation
- **Q26:** Self-RAG vs CRAG — key differences clarified
- **Q27:** RAG Security & Prompt Injection — 5 defense layers

### Other Coverage (Q3-Q24)
- RAG fundamentals (what, why, how)
- Complete pipeline walkthrough
- Chunking strategy (800 chars, 100 overlap)
- Embeddings (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY)
- Vector search (cosine similarity, HNSW indexing)
- Two-tier storage (Pinecone + PostgreSQL)
- Metadata extraction
- Human-in-the-loop gates
- Observability & monitoring
- Schema versioning
- Table structure preservation
- HNSW algorithm deep-dive
- Cost optimization strategies
- Production readiness checklist
- On-premise deployment
- Vector DB cost optimization

---

## Key Learnings

### RAG Pattern Selection
- **Agentic RAG** = Best for mixed workloads (knowledge + actions)
- **Multi-Agent RAG** = Best for multiple domains
- CRAG/Self-RAG = Overkill for high-quality retrieval
- Graph RAG = Overkill for simple questions
- Hybrid Search = Not needed for semantic-only corpus
- RAG-Fusion = Too expensive for clear queries

### Cost/Quality Tradeoffs
| Pattern | Cost | Quality | When to use |
|---------|------|---------|------------|
| Naive | Cheap | Medium | MVP |
| Advanced | Medium | Good | Noisy corpus |
| Agentic | Cheap | Good | Mixed workload |
| CRAG | Expensive | Very High | Critical domains |
| Self-RAG | Medium | Good | Budget + capable LLM |

### Aagam Mitra Stack
```
├─ Agentic RAG (primary pattern)
├─ Multi-Agent routing (4 specialists)
├─ Two-tier storage (Pinecone + PostgreSQL)
├─ Security gates (input validation, output filtering)
└─ Monitoring & logging (observability)
```

### Security Insights
- Prompt injection = Real risk in RAG
- Defense in layers: validation → hardening → filtering → monitoring
- One malicious document CAN hijack system without defenses
- Aagam Mitra mitigations: Admin validation + hardened prompts + output filtering

---

## Interview Vault Structure

```
aagam-mitra/
├─ 01-RAG-and-Vector-Search.md (Q1-Q27, 2500+ lines)
│  ├─ Q1-Q2: RAG patterns overview (all 10 explained)
│  ├─ Q3-Q24: RAG fundamentals & production topics
│  ├─ Q25-Q26: CRAG vs Self-RAG deep-dive
│  └─ Q27: Security & prompt injection defense
├─ 04-Security-and-Production.md (Q1-Q11)
├─ 05-YouTube-Transcript-Pipeline.md (Q1-Q8)
├─ ARCHITECTURE_DIAGRAMS.md (11 Mermaid flowcharts)
└─ RAG_Learning_Journey.md (this file - progress tracker)
```

---

## Next Learning Topics (Optional)

If continuing:
- **Observability & Monitoring** — Dashboards, metrics, alerts
- **Cost Optimization** — Per-query, per-agent, budgeting
- **Multimodal RAG** — Images, videos, mixed content
- **Real-time RAG** — Streaming results, live updates
- **Distributed RAG** — Scaling across services
- **Fine-tuning vs RAG** — When to use each
- **Evaluation Metrics** — Measuring RAG quality (ROUGE, BLEU, MRR)
