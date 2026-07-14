# Aagam Mitra — Interview Preparation Guide

Complete interview Q&A based on the **real production code** of the Aagam Mitra AI service built for the MyTemple Jain community platform.

Every answer references actual config values, library versions, design decisions, and code patterns from the live system.

---

## Files in This Folder

### Foundation & Architecture (Files 01–05)

| File | Topics Covered | Questions |
|---|---|---|
| [01-RAG-and-Vector-Search.md](01-RAG-and-Vector-Search.md) | RAG pipeline, chunking, embeddings, Pinecone, cosine similarity, semantic search, temple knowledge sync, HNSW, prompt injection | 30 |
| [02-LLM-and-Groq.md](02-LLM-and-Groq.md) | LLM basics, temperature, Groq API, tool-call loop, chat history, parallel execution, retry logic, orchestrator routing | 10 |
| [03-Agents-and-Architecture.md](03-Agents-and-Architecture.md) | Agent types, 12 tools, system architecture, JWT auth, password hashing, Cloudflare tunnel, action cards, push notifications | 10 |
| [04-Security-and-Production.md](04-Security-and-Production.md) | 4-layer security, prompt injection, graceful degradation, double-booking prevention, scaling, tricky questions, all config values | 11 |
| [05-YouTube-Transcript-Pipeline.md](05-YouTube-Transcript-Pipeline.md) | Dual-layer extraction, Whisper ASR, LLM formatting, Shanka Samadhan vs Pravachan detection, RAG storage, live stream handling | 8 |

**Subtotal: 69 detailed Q&As** (30 + 10 + 10 + 11 + 8)

### Framework & Patterns (Files 06–07)

| File | Topics Covered | Questions |
|---|---|---|
| [06-LangChain-Concepts-and-Prompt-Templates.md](06-LangChain-Concepts-and-Prompt-Templates.md) | LangChain principles, prompt templates, RAG pattern, chains & composition, framework vs custom, error handling in LLM apps | 6 |
| [07-LangGraph-Agent-Design-and-Orchestration.md](07-LangGraph-Agent-Design-and-Orchestration.md) | LangGraph vs LangChain, state management, nodes & edges, agent loop, multi-agent orchestration, why build custom vs LangGraph | 6 |

**Subtotal: 12 detailed Q&As**

### Expert Deep-Dives (File 08)

| File | Topics Covered | Questions |
|---|---|---|
| [08-Agentic-Design-Patterns-and-Enterprise-AI.md](08-Agentic-Design-Patterns-and-Enterprise-AI.md) | **5 agentic design patterns** (router, hierarchical, tool-using, reflection, autonomous). **LangGraph migration story** (when & why). **Advanced RAG**: retrieval quality metrics (hit rate, NDCG, MRR), knowledge base freshness. **Enterprise AI**: compliance (Basel III, GDPR, Fair Lending), model governance, fairness testing. **Governance & Observability**: monitoring, cost optimization, testing strategies. **Memory Architectures**: 4-layer design (working, conversational, semantic, episodic). | 12 |

**Subtotal: 12 expert-level Q&As**

### General AI & Prompt Engineering (File 10)

| File | Topics Covered | Questions |
|---|---|---|
| [10-General-AI-and-Prompt-Engineering-Questions.md](10-General-AI-and-Prompt-Engineering-Questions.md) | **Foundation** (Q1-Q4): context window, LLM selection, AI agents, RAG. **Prompt Engineering** (Q5-Q12): efficient prompts, advanced techniques, few-shot, security, reasoning, evaluation. **General AI** (Q13-Q15): hallucinations, fine-tuning vs RAG, LLM limitations. **Production RAG** (Q16): cache invalidation. **LLM Deep-Dive** (Q17-Q22): tokenization, transformers/attention, vector DBs, embeddings, vector DB comparisons, schema design. | 22 |

**Subtotal: 22 comprehensive Q&As**

---

## Total Coverage

**115 detailed Q&As** organized across 10 files, covering everything from foundational LLM concepts (tokenization, transformers, embeddings) and prompt engineering to expert-level enterprise AI architecture, agentic design patterns, cache invalidation strategies, indexing algorithms, prompt injection defense, vector database design, and memory systems. All answers grounded in real Aagam Mitra production code and real interview questions from companies like HDFC Bank.

---

## Detailed Index by File

### 01-RAG-and-Vector-Search.md (30 Q&As)
```
Q1:  Which RAG architectural pattern are you using?
Q2:  What RAG architecture patterns exist today, and why did you pick Agentic RAG?
Q3:  What is RAG and why did you use it in Aagam Mitra?
Q4:  Walk me through your complete RAG pipeline end-to-end
Q5:  Why chunk at 800 characters with 100 overlap? How did you choose these values?
Q6:  What is an embedding? Explain it to a non-technical person
Q7:  What is cosine similarity and how does Pinecone use it?
Q8:  What is the difference between RETRIEVAL_DOCUMENT and RETRIEVAL_QUERY task types in Gemini?
Q9:  How do you handle temple live data that changes frequently (news, events, slots)?
Q10: Why Pinecone for Jain texts but PostgreSQL for temple data?
Q11: What is semantic search and how is it different from keyword search?
Q12: How does the temple knowledge sync handle content-addressed deduplication?
Q13: What's missing from Aagam Mitra to make it production-ready?
Q14: How would you add LLM-as-judge evaluation to Aagam Mitra?
Q15: What metadata should we extract during chunking to improve production quality?
Q16: How would you add a human-in-the-loop gate for high-stakes actions?
Q17: What observability would you add to production Aagam Mitra?
Q18: How would you handle schema versioning and metadata migration in production?
Q19: How do you preserve table structure when chunking PDFs?
Q20: How does HNSW find 10 nearest neighbors from 100M embeddings without comparing all of them?
    └─ Follow-up: When would you choose HNSW vs. IVF vs. Flat indexing?
    └─ Follow-up: If we replaced Pinecone with self-hosted HNSW, what would change?
Q21: Your LLM bill is $2000/month. How would you cut it in half?
Q22: An AI agent is about to go live. 1% of its responses violate company policy. What would you do?
Q23: How do you build an AI system with ZERO internet access? (On-Prem / Offline)
Q24: Our Pinecone bill is $5000/month and growing. How would you optimize vector DB costs?
Q25: What is Corrective RAG (CRAG) and when should we use it?
Q26: What is Self-RAG and how is it different from Corrective RAG?
Q27: How do you prevent prompt injection attacks in a RAG system?
Q28: How would LangChain and Graph RAG implement the Aagam Mitra pipeline?
Q29: What happens if the real answer is in rank 10-12 but we only retrieve top-8? How do you handle this?
```

### 02-LLM-and-Groq.md (10 Q&As)
```
Q1:  What is an LLM and how does it generate text one token at a time?
Q2:  What's the difference between temperature and top-p?
Q3:  What is the Groq API and why did we choose it over OpenAI?
Q4:  How do you structure a tool-call loop? (LLM → tool → LLM)
Q5:  How do you manage chat history in production?
Q6:  How do you make LLM calls in parallel and handle results?
Q7:  How do you implement exponential backoff for LLM timeouts?
Q8:  What happens when Groq is down? How do you gracefully degrade?
Q9:  How do you route different query types to different agents?
Q10: How do you reduce latency for LLM responses to <200ms?
```

### 03-Agents-and-Architecture.md (10 Q&As)
```
Q1:  What is an agent and how is it different from a chatbot?
Q2:  What are the 4 agents in Aagam Mitra and what do they do?
Q3:  How does multi-agent routing work?
Q4:  What are the 12 tools available to agents?
Q5:  Walk me through the system architecture end-to-end
Q6:  How does JWT authentication work in Aagam Mitra?
Q7:  How do you hash passwords securely?
Q8:  What is Cloudflare Tunnel and why use it instead of a public IP?
Q9:  What are action cards and how do they guide users?
Q10: How do push notifications work in the mobile app?
```

### 04-Security-and-Production.md (11 Q&As)
```
Q1:  What is the 4-layer security pipeline?
Q2:  How do you prevent prompt injection attacks?
Q3:  How do you handle edge cases gracefully?
Q4:  How do you prevent double-booking in Shantidhara slots?
Q5:  What scaling challenges exist and how would you solve them?
Q6:  What configuration values matter most in production?
Q7:  How do you handle concurrent requests to the same temple?
Q8:  What are some tricky edge cases you've encountered?
Q9:  How do you secure the API Gateway?
Q10: How do you monitor for security incidents?
Q11: What would you change if Aagam Mitra scaled to 1M users?
```

### 05-YouTube-Transcript-Pipeline.md (8 Q&As)
```
Q1:  How do you extract transcripts from YouTube videos?
Q2:  What is Whisper ASR and why use it for audio?
Q3:  How do you distinguish between Shanka Samadhan and Pravachan videos?
Q4:  How do you format LLM-cleaned transcripts into structured summaries?
Q5:  How do you handle live streams that are still being recorded?
Q6:  How do you deduplicate transcript chunks before storage?
Q7:  What metadata do you extract from each video?
Q8:  How do you integrate transcripts into the main RAG pipeline?
```

### 06-LangChain-Concepts-and-Prompt-Templates.md (6 Q&As)
```
Q1: What is LangChain and why would we use it?
Q2: What are chains and how do you compose them?
Q3: How do you build reusable prompt templates?
Q4: What is the RAG pattern in LangChain?
Q5: When should you use a framework vs. build custom?
Q6: How do you handle errors in LLM application pipelines?
```

### 07-LangGraph-Agent-Design-and-Orchestration.md (6 Q&As)
```
Q1: What is LangGraph and how is it different from LangChain?
Q2: What are nodes, edges, and state graphs?
Q3: How do you build an agent loop in LangGraph?
Q4: What is conditional branching and why does it matter?
Q5: How do you orchestrate multi-agent workflows?
Q6: Why did Aagam Mitra build custom instead of using LangGraph?
```

### 08-Agentic-Design-Patterns-and-Enterprise-AI.md (12 Q&As)
```
Q1:  What are the 5 core agentic design patterns?
Q2:  What is orchestrator-based routing? (with LangGraph migration story)
Q3:  How do you measure RAG retrieval quality?
Q4:  How do you keep a knowledge base fresh at scale?
Q5:  What regulatory compliance applies to AI systems?
Q6:  How do you test AI systems for fairness and bias?
Q7:  How do you monitor AI agents in production?
Q8:  How do you optimize costs of agentic systems?
Q9:  What testing strategies apply to AI agents?
Q10: How do you debug agent failures?
Q11: What are the 4 memory layers in agentic systems?
Q12: How do you version and manage LLM models in production?
```

### 09-Semantic-Kernel-and-Dotnet-Agents.md (7 Q&As)
```
Q1: What is Semantic Kernel?
Q2: How does Semantic Kernel compare to LangChain?
Q3: What are plugins, functions, and planners?
Q4: How do you build an agent loop in C#?
Q5: How do you manage prompts in Semantic Kernel?
Q6: How do you manage memory in Semantic Kernel?
Q7: What are production patterns for Semantic Kernel?
```

### 10-General-AI-and-Prompt-Engineering-Questions.md (22 Q&As)
```
Q1:  What is a context window and what happens when you exhaust it?
Q2:  How do you choose which LLM to use for a given task?
Q3:  What is an AI agent and how does it differ from a chatbot?
Q4:  What is RAG (Retrieval-Augmented Generation)?
Q5:  How do you write prompts that use fewer tokens?
Q6:  What is context-aware retrieval and why does it matter?
Q7:  What is structured output and when should you use it?
Q8:  How do you version and track prompt changes?
Q9:  What is few-shot prompting and when does it help?
Q10: How do you prevent prompt injection attacks?
Q11: What is chain-of-thought reasoning and when should you use it?
Q12: How do you evaluate if a prompt is working well?
Q13: What causes hallucinations and how do you reduce them?
Q14: When should you fine-tune vs. RAG vs. prompt engineering?
Q15: What are the limitations of LLMs?
Q16: How do you implement cache invalidation for production RAG systems? (HDFC Bank)
Q17: What is tokenization and why do LLMs work with tokens instead of characters?
Q18: How do Large Language Models actually work? Explain transformers and attention.
Q19: What is a Vector Database and why do we need it for RAG systems?
Q20: How do embeddings work and why are they central to vector search?
Q21: Compare vector databases: Pinecone vs Weaviate vs Qdrant vs Milvus. When would you use each?
Q22: How do you design a vector database schema for a specific RAG use case?
```

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
