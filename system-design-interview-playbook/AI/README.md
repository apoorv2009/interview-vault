# AI System Design Interview Guide

This folder contains comprehensive interview guides for **RAG (Retrieval-Augmented Generation)** and **Agentic AI** system design questions commonly asked at Big 4 consulting firms and tech companies.

## Files in this Guide

### 1. [RAG-System-Design.md](./RAG-System-Design.md)
**Retrieval-Augmented Generation** — how to build production RAG systems that don't hallucinate and serve fresh data.

Key questions covered:
- **Your RAG chatbot gives a perfect answer but from a 3-year-old document. How would you prevent this?**
  - Document versioning, recency filtering, automatic knowledge base refresh
  - Semantic + temporal fusion retrieval
  - User feedback loops
  
- **How do you validate retrieval quality in RAG? (RAGAS Metrics)**
  - Context Relevance, Faithfulness, Answer Relevance metrics
  - Ground-truth test set evaluation
  - Weekly RAGAS monitoring in production

- **How do you handle hallucinations in RAG?**
  - Context grounding via prompt engineering
  - Consistency checks
  - Confidence thresholds
  - Using smaller, instruction-tuned models

- **How do you choose between fine-tuning, RAG, and prompt engineering for knowledge?**
  - Trade-off comparison table
  - Scenario-based decision matrix
  - When to use each approach

- **What is semantic chunking and why does it matter in RAG?**
  - Naive vs semantic vs embedding-based chunking
  - Implementation of semantic splitting
  - Cost vs quality trade-offs

### 2. [Agentic-AI-System-Design.md](./Agentic-AI-System-Design.md)
**AI Agents in Production** — how to build safe, autonomous agents that don't cause production disasters.

Key questions covered:
- **Your AI agent fixed a production issue but the fix increased the blast radius. How would you prevent that safely?**
  - Permission model (principle of least privilege)
  - Staged rollout (staging → canary 5% → 100%)
  - Automatic rollback triggers
  - Agent reasoning transparency & audit trails
  - Agent authority tiers

- **How do you prevent an AI agent from hallucinating in a multi-step decision tree?**
  - Grounding every step in real data
  - Explicit state tracking
  - Constraint checking
  - Rollback on inconsistency
  - Implementation pattern with detailed code examples

- **How do you design guardrails for an AI agent in production?**
  - Four layers: instruction-level, permission-level, semantic-level, operational-level
  - Configuration YAML example
  - Guardrail failure handling workflow

- **What's the difference between single-agent and multi-agent systems?**
  - Comparison table: pros/cons of each
  - Multi-agent coordination patterns (sequential, parallel, hierarchical)
  - When to use each approach
  - Real incident response example with 5-agent collaboration

## Interview Strategy

### For RAG Questions:
1. **Start with the problem**: "Why does my RAG return old data?" → shows understanding of the fundamental issue
2. **Propose layered solutions**: Document metadata → recency filtering → user feedback → automatic refresh
3. **Mention trade-offs**: Storage cost, retrieval latency, accuracy
4. **Discuss metrics**: RAGAS metrics for validating your solution works
5. **Production example**: "We use Pinecone with metadata filtering + weekly re-indexing from Notion"

### For Agentic AI Questions:
1. **Start with safety mindset**: "I'd never give an agent production write access without guardrails"
2. **Propose staged rollout**: Staging → canary 5% → monitor metrics → 100%
3. **Emphasize transparency**: "Every agent decision is logged and auditable"
4. **Mention circuit breakers**: "If error rate spikes, we auto-rollback"
5. **Real example**: "Our incident response multi-agent system has Diagnostician → Specialist → DevOps → Validator tiers"

## Quick Reference: Interview Answers Checklist

### RAG System Design
- [ ] Explain the stale data problem in RAG
- [ ] Describe how to add document metadata + recency filtering
- [ ] Define Context Relevance, Faithfulness, Answer Relevance metrics
- [ ] Explain when to use RAG vs fine-tuning vs prompt engineering
- [ ] Discuss semantic vs fixed-size chunking trade-offs
- [ ] Describe multi-pass retrieval (vector search → temporal filter → ranking)

### Agentic AI System Design
- [ ] Explain principle of least privilege for agent permissions
- [ ] Describe staged rollout: staging → canary → full deployment
- [ ] List automatic rollback triggers (error rate, latency, CPU)
- [ ] Explain grounding multi-step agents in reality (query, verify, execute)
- [ ] Describe four layers of guardrails
- [ ] Compare single-agent vs multi-agent systems with examples

## Related Files

- **Main System Design Guide**: [../system-design-interview-answers.md](../system-design-interview-answers.md)
  - Database sharding vs replication
  - Deadlock in distributed systems
  - Rate limiting to prevent DDoS
  - Data consistency in distributed systems

## Resources

### RAG Evaluation
- [RAGAS Paper](https://arxiv.org/abs/2309.15217) - Retrieval-Augmented Generation Assessment
- Langchain RAG documentation
- Pinecone vector database docs

### Agentic AI
- [LangGraph](https://langchain-ai.github.io/langgraph/) - multi-agent orchestration
- [ReAct Pattern](https://arxiv.org/abs/2210.03629) - Reasoning + Acting
- AutoGPT, BabyAGI architectures

### Guardrails
- [Pydantic](https://docs.pydantic.dev/) - structured output validation
- [LLM Whisperer](https://github.com/andrewrreed/llm-whisperer) - agent safety patterns
- Anthropic's system instructions best practices

---

**Last Updated**: September 3, 2026
**Level**: Senior / Staff Engineer (Big 4 Consulting, Tech Lead interviews)
