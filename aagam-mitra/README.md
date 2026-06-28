# Aagam Mitra — Interview Preparation Guide

Complete interview Q&A based on the **real production code** of the Aagam Mitra AI service built for the MyTemple Jain community platform.

Every answer references actual config values, library versions, design decisions, and code patterns from the live system.

---

## Files in This Folder

| File | Topics Covered | Questions |
|---|---|---|
| [01-RAG-and-Vector-Search.md](01-RAG-and-Vector-Search.md) | RAG pipeline, chunking, embeddings, Pinecone, cosine similarity, semantic search, temple knowledge sync | 10 |
| [02-LLM-and-Groq.md](02-LLM-and-Groq.md) | LLM basics, temperature, Groq API, tool-call loop, chat history, parallel execution, retry logic, orchestrator routing | 10 |
| [03-Agents-and-Architecture.md](03-Agents-and-Architecture.md) | Agent types, 12 tools, system architecture, JWT auth, password hashing, Cloudflare tunnel, action cards, push notifications | 10 |
| [04-Security-and-Production.md](04-Security-and-Production.md) | 4-layer security, prompt injection, graceful degradation, double-booking prevention, scaling, tricky questions, all config values | 10 |
| [05-YouTube-Transcript-Pipeline.md](05-YouTube-Transcript-Pipeline.md) | Dual-layer extraction, Whisper ASR, LLM formatting, Shanka Samadhan vs Pravachan detection, RAG storage, live stream handling | 8 |

**Total: 48 detailed Q&As** covering the entire system from UI to vector database.

---

## Key Numbers to Memorise

```
Model:              meta-llama/llama-4-scout-17b-16e-instruct (Groq)
Embedding model:    gemini-embedding-001
Embedding dims:     2048 (Matryoshka)
Chunk size:         800 characters
Chunk overlap:      100 characters
Pinecone top_k:     8 (scripture)  /  4 (temple data)
Temple sync TTL:    300 seconds
Chat history DB:    100 messages per user+temple
History to agent:   Last 8 turns (16 messages)
Access token:       24 hours
Refresh token:      30 days
Retry attempts:     4  (delay: min(8.0, 1+attempt) seconds)
Groq timeout:       60 seconds
Inter-svc timeout:  45 seconds
Gemini batch size:  100 texts per call
Hard-block patterns: 14
RBAC patterns:       8
PII mask patterns:   7
Agents:              4  (Scripture, TempleOps, Community, YouTube)
Tools:               12
Services:            5  (Gateway, Identity, Registration, Admin, Aagam Mitra)
Ports:               8000, 8001, 8002, 8003, 8004
Hallucination rate:  25% (no RAG) → 2% (with RAG)
```

---

## Quick Architecture Summary

```
React Native (Expo 55) / Web (Vercel)
  → Cloudflare Tunnel
  → API Gateway :8000 (JWT verify, proxy)
  → Identity :8001 | Registration :8002 | Admin :8003 | Aagam Mitra :8004
  → Groq (LLM) | Pinecone (vectors) | Gemini (embeddings) | Redis (cache)
```

**Custom-built** — no LangChain, no LangGraph. Raw httpx + asyncio + Pinecone SDK.
