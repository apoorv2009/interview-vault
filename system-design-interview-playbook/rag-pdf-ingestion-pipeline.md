# Your client gives you 5000 PDFs with text, tables, charts and scanned images. Build a RAG chatbot that answers accurately.

**SIMPLE EXPLANATION — Read This First**

Short Answer: A beginner says "chunk the PDFs and store embeddings." That fails immediately. Real PDFs are messy — scanned pages have no text, tables get destroyed by naive splitting, charts are invisible to text parsers. You need a 10-step pipeline that handles each content type separately.

- What is RAG: Retrieval Augmented Generation. Instead of the AI guessing from training data, you: (1) find relevant chunks from your documents, (2) hand them to the AI as context, (3) the AI answers ONLY from that context. Accurate + citable.
- Why naive chunking fails: If you blindly split every PDF into 500-token chunks: scanned PDFs return empty text (no text layer), tables get split mid-row (numbers lose their meaning), charts are completely invisible, multi-column layouts mix unrelated paragraphs together.
- Step 1 — Classify each PDF: Before extracting, detect: does this page have a real text layer, or is it a scanned image? Route each page to the right extractor.
- Step 2 — OCR for scanned pages: If no text layer: rasterize the page at 300 DPI, run OCR (Tesseract for free, AWS Textract for production quality). Now scanned text becomes searchable.
- Step 3 — Extract tables as structured units: Tables must NEVER be split. Extract them as whole Markdown tables using Camelot or Tabula. A table is always stored as one single chunk.
- Step 4 — Describe charts with AI: Send chart images to GPT-4o or Claude Vision: "Describe this chart, extract axis labels, values, and key trends." Store the text description as a searchable chunk.
- Step 5 — Smart chunking: Split by section headings and paragraph boundaries, not by token count. Store parent sections AND child paragraphs (hierarchical chunking) for best context.
- Step 6 — Embed and store: Convert each chunk to a vector (number array) using an embedding model. Store in a vector database (Pinecone, Weaviate).
- Step 7 — Hybrid retrieval: Use BOTH semantic search (finds similar meaning) and keyword search/BM25 (finds exact terms and numbers). Merge results. This is much more accurate than semantic alone.
- Step 8 — Rerank: A second AI model re-scores the top retrieved chunks against the actual question. Top embedding matches are not always the best context. Reranking fixes this.
- Step 9 — Generate answer: Feed the top chunks + the user's question to the LLM with the instruction: "Answer ONLY from the provided context. Cite your sources."
- Step 10 — Hallucination control: If the reranker scores are all low (nothing relevant found), return "I don't have enough information" instead of making something up.

**DEEP DIVE — Technical Architecture Below**

## Full Architecture

```
  5000 PDFs
      │
      ▼
  ┌──────────────────────────────────────────────────────────┐
  │              INGESTION PIPELINE (runs once)               │
  │                                                           │
  │  Per page:                                                │
  │    Has text layer? → PyMuPDF / pdfplumber                 │
  │    Scanned image?  → OCR (Tesseract / AWS Textract)      │
  │    Has table?      → Camelot / Tabula → Markdown table   │
  │    Has chart?      → GPT-4o Vision → text description    │
  │          │                                                │
  │  Smart Chunking (section + paragraph aware)              │
  │          │                                                │
  │  Embedding (text-embedding-3-large / BGE)                │
  │          │                                                │
  │  Vector DB (Pinecone) + BM25 Index                       │
  └──────────────────────────────────────────────────────────┘
      │
      ▼
  ┌──────────────────────────────────────────────────────────┐
  │              QUERY PIPELINE (real-time)                   │
  │                                                           │
  │  User question                                            │
  │      → Hybrid Retrieval (semantic + BM25)                │
  │      → Reranker (cross-encoder)                          │
  │      → Top 5 chunks + metadata + citations               │
  │      → LLM: "Answer ONLY from this context"              │
  │      → Answer + source citations                         │
  └──────────────────────────────────────────────────────────┘
```

## Why Naive Chunking Destroys Table Accuracy

A table cell ripped out of context — "Revenue: 4.2M" — means nothing without its row and column headers. Always store tables as single atomic chunks.

```
# WRONG: fixed-size chunking destroys tables
chunks = split_every_500_tokens(document_text)  ← BAD
```

```
# CORRECT: tables as atomic chunks, never split
for table in extract_tables(pdf_page):
    chunks.append({
        "text": table.to_markdown(),  # entire table as one chunk
        "type": "table",
        "page": table.page_number
    })
```

## Hybrid Retrieval: Why Both Semantic + Keyword

| Search Type | Finds | Misses |
| --- | --- | --- |
| Semantic only | "Revenue increased significantly" when query is "did sales grow?" | Exact codes, numbers, product names |
| BM25/Keyword only | Exact term "FY2023" or "Appendix B" | Paraphrases, synonyms, conceptual matches |
| Hybrid (both) | Both meaning AND exact terms | Almost nothing — best accuracy |

## Hallucination Prevention

```
SYSTEM_PROMPT = """
Answer ONLY based on the provided context chunks.
If the answer is not in the context, say: "I don't have enough information."
Always cite the source document name and page number.
For numbers: quote the exact figure from the source.
"""
```

## Theoretical Framework — Interview Talking Points

- Read/Write Trade-off: The ingestion pipeline is a massive write-time investment: OCR, table extraction, vision AI for charts, hierarchical chunking, dual indexing. This transforms every query into a fast CDN-like lookup. Write cost paid once per document; read benefit realized for every query (potentially thousands per document).
- Write Amplification: Processing one PDF creates: original file + extracted text + OCR output + table JSON + chart descriptions + embedding vectors + BM25 index entries. 4–5x write amplification is intentional — each derived representation optimizes a different retrieval path.
- CAP Theorem: The vector index is AP during updates: queries continue from current index while new documents are being ingested. For a 5000-PDF knowledge base where documents change infrequently, brief eventual consistency is correct. New documents appear in search results with ~seconds delay — acceptable.
- PACELC (Embedding Model Updates): When upgrading the embedding model, ALL existing vectors become incompatible. Correct solution: blue/green index deployment — build new index in parallel, validate accuracy, swap alias. This avoids the L/C dilemma: don't choose between stale vectors (latency win) or index downtime (consistency win). Build both, swap atomically.
