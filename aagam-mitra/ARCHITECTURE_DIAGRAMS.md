# MyTemple — Architecture Diagrams

> Full system architecture · every service · every data flow  
> Source: `MyTemple_Architecture_Doc.pptx` · Updated June 2026

---

## Figure 1 · Full System Architecture

```mermaid
flowchart TD
    App["React Native App<br/>Expo 55 · RN 0.83<br/>Android & iOS"]
    Web["Web Browser<br/>Expo Web<br/>Hosted on Vercel"]
    Vercel["Vercel CDN Edge<br/>Serves web app<br/>rewrites /api/* → Cloudflare tunnel"]
    CF["Cloudflare Quick Tunnel<br/>QUIC / HTTP2<br/>cloudflared → localhost:8000"]
    GW["API Gateway · FastAPI · :8000<br/>JWT verify · rate limit · reverse-proxy<br/>INJECTS: X-User-Id · X-User-Role · X-Temple-Id"]

    subgraph SVC["DOCKER SERVICES — internal DNS on temple-network"]
        ID["Identity · :8001<br/>Users · JWT · Argon2<br/>Push tokens"]
        REG["Registration · :8002<br/>Bookings · Donations<br/>Memberships · Razorpay"]
        ADM["Admin · :8003<br/>Slots · News · Events<br/>Finance · Wall of Fame"]
        AI["Aagam Mitra AI · :8004<br/>Chat · RAG · Agents<br/>YouTube transcripts"]
    end

    subgraph EXT["EXTERNAL APIs"]
        Groq["Groq<br/>LLaMA 4 Scout 17B<br/>AI inference"]
        Pine["Pinecone<br/>jain-texts index<br/>Vector DB"]
        Gem["Gemini<br/>embedding-001<br/>2048-dim embeddings"]
    end

    Redis["Redis · :6379<br/>Rate limiting · AOF persistence<br/>SHARED BY ALL SERVICES"]
    Push["Expo Push<br/>→ FCM (Android)<br/>→ APNS (iOS)"]

    App -- HTTPS --> Vercel
    Web -- HTTPS --> Vercel
    Vercel -- "rewrite /api/*" --> CF
    CF -- "HTTP (local)" --> GW
    GW -- Docker DNS --> ID
    GW -- Docker DNS --> REG
    GW -- Docker DNS --> ADM
    GW -- Docker DNS --> AI
    AI -- HTTPS --> Groq
    AI -- HTTPS --> Pine
    AI -- HTTPS --> Gem
    ID -- push tokens --> Push
    SVC --- Redis

    classDef client fill:#1D4ED8,color:#fff,stroke:#1339A8
    classDef proxy fill:#374151,color:#fff,stroke:#1F2937
    classDef gateway fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef svc fill:#003057,color:#fff,stroke:#001933
    classDef ai fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef ext fill:#065A82,color:#fff,stroke:#044268
    classDef shared fill:#15803D,color:#fff,stroke:#0E5529
    classDef push fill:#92400E,color:#fff,stroke:#5C2800

    class App,Web client
    class Vercel,CF proxy
    class GW gateway
    class ID,REG,ADM svc
    class AI ai
    class Groq,Pine,Gem ext
    class Redis shared
    class Push push
```

---

## Figure 2 · Request Flow — Phone to Backend

```mermaid
flowchart TD
    Step1["① Mobile App<br/>fetch('/api/v1/auth/signin')<br/>Authorization: Bearer JWT"]
    Step2["② Vercel Edge<br/>rewrite → Cloudflare tunnel URL"]
    Step3["③ Cloudflare Quick Tunnel<br/>QUIC → localhost:8000"]
    Step4["④ API Gateway · :8000<br/>Verify JWT signature (HS256)<br/>Decode: sub · role · temple_id · exp<br/>Access token: 24h · Refresh: 30d"]
    Headers["INJECTS TO DOWNSTREAM<br/>X-User-Id: usr_abc123<br/>X-User-Role: devotee<br/>X-Temple-Id: tmpl_001"]
    Step5["⑤ Backend Service<br/>identity / admin / aagam-mitra<br/>Trusts injected headers — never re-verifies JWT"]

    Step1 -- HTTPS --> Step2
    Step2 -- HTTPS --> Step3
    Step3 -- "HTTP (local)" --> Step4
    Step4 --> Headers
    Headers --> Step5

    classDef client fill:#1D4ED8,color:#fff,stroke:#1339A8
    classDef proxy fill:#374151,color:#fff,stroke:#1F2937
    classDef gateway fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef inject fill:#92400E,color:#fff,stroke:#5C2800
    classDef backend fill:#003057,color:#fff,stroke:#001933

    class Step1 client
    class Step2,Step3 proxy
    class Step4 gateway
    class Headers inject
    class Step5 backend
```

---

## Figure 3 · Agent Orchestration Flow

```mermaid
flowchart TD
    Msg["User Message"]

    subgraph SEC["SECURITY — 4 sequential checks before any model call"]
        S1["① Length Guard<br/>2 ≤ len ≤ 2000 · else HTTP 400"]
        S2["② 14 Hard-Block Regex<br/>Injection · jailbreak · code-exec<br/>match → HTTP 400"]
        S3["③ RBAC — 8 Admin Patterns<br/>devotee role → HTTP 403"]
        S4["④ PII Masking → Audit Log<br/>phone/email/PAN/Aadhaar masked<br/>user_id → SHA-256 first 12 chars"]
    end

    Orch["Orchestrator<br/>Compiled regex intent detection<br/>routes to 1–N agents in parallel"]

    AgA["Agent A · Scripture<br/>Jain texts · Pinecone RAG<br/>4 iterations · temp 0.5<br/>1 tool"]
    AgB["Agent B · TempleOps<br/>Bookings · Slots · Membership<br/>5 iterations · temp 0.5<br/>7 tools"]
    AgC["Agent C · Community<br/>News · Events · Wall of Fame<br/>4 iterations · temp 0.5<br/>4 tools"]
    AgD["Agent D · YouTube<br/>Transcript API + Whisper ASR<br/>1 iteration · temp 0.2<br/>overrides BaseAgent.run()"]

    Synth["Groq · LLaMA 4 Scout 17B<br/>Final Synthesis · temp 0.4 (multi-agent)<br/>TempleAssistantResponse + action_cards"]

    Msg --> S1 --> S2 --> S3 --> S4 --> Orch
    Orch -- "scripture keywords" --> AgA
    Orch -- "booking/slot/membership" --> AgB
    Orch -- "news/events/feedback" --> AgC
    Orch -- "youtube.com URL" --> AgD
    AgA --> Synth
    AgB --> Synth
    AgC --> Synth
    AgD --> Synth

    classDef msg fill:#374151,color:#fff,stroke:#1F2937
    classDef sec fill:#B91C1C,color:#fff,stroke:#7F1010
    classDef orch fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef scripture fill:#92400E,color:#fff,stroke:#5C2800
    classDef ops fill:#003057,color:#fff,stroke:#001933
    classDef community fill:#14532D,color:#fff,stroke:#0A3A1E
    classDef youtube fill:#7C2D12,color:#fff,stroke:#4C1A0A
    classDef synth fill:#6B21A8,color:#fff,stroke:#4A1570

    class Msg msg
    class S1,S2,S3,S4 sec
    class Orch orch
    class AgA scripture
    class AgB ops
    class AgC community
    class AgD youtube
    class Synth synth
```

---

## Figure 4 · RAG Pipeline — Indexing & Retrieval

```mermaid
flowchart TD
    subgraph IDX["INDEXING PHASE — done once per PDF upload"]
        PDF["Admin uploads Jain Scripture PDF<br/>POST /api/v1/ingest/upload"]
        Pypdf["pypdf extraction<br/>page.extract_text() → clean whitespace"]
        Chunk["Chunker<br/>chunk_size: 800 chars<br/>chunk_overlap: 100 chars"]
        EmbedD["Gemini Embedding<br/>gemini-embedding-001<br/>task_type: RETRIEVAL_DOCUMENT<br/>2048-dim · batch 100/call"]
        Upsert["Pinecone Upsert<br/>index: 'jain-texts'<br/>id = source:page:chunk<br/>metadata: {text, source, page}"]
    end

    subgraph RET["RETRIEVAL PHASE — every user question"]
        Q["User Question<br/>'What is Navakar Mantra?'"]
        EmbedQ["Gemini Embed (QUERY)<br/>task_type: RETRIEVAL_QUERY<br/>→ [float × 2048]"]
        Search["Pinecone Query<br/>index.query(vector, top_k=8)<br/>cosine similarity · HNSW index"]
        Passages["8 Retrieved Passages<br/>text + source + similarity score"]
        GroqR["Groq Synthesis · temp 0.3<br/>LLaMA 4 Scout 17B<br/>4-part answer: Context → Sacred Text<br/>→ Meaning → Practical Wisdom"]
        Ans["Final Answer + citations + action_cards"]
    end

    PDF --> Pypdf --> Chunk --> EmbedD --> Upsert
    Q --> EmbedQ --> Search --> Passages --> GroqR --> Ans

    classDef upload fill:#1D4ED8,color:#fff,stroke:#1339A8
    classDef process fill:#003057,color:#fff,stroke:#001933
    classDef vector fill:#065A82,color:#fff,stroke:#044268
    classDef llm fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef output fill:#14532D,color:#fff,stroke:#0A3A1E

    class PDF upload
    class Pypdf,Chunk process
    class EmbedD,Upsert,EmbedQ,Search,Passages vector
    class GroqR llm
    class Ans output
```

---

## Figure 5 · YouTube Transcript Pipeline

```mermaid
flowchart TD
    URL["User shares YouTube URL<br/>Extract video_id · detect Shanka / Pravachan"]

    L1["LAYER 1 · Primary (200–500ms)<br/>youtube-transcript-api<br/>.fetch(video_id, ['hi','en'])<br/>creator + auto-generated captions"]

    L2["LAYER 2 · Fallback (30–120s)<br/>yt-dlp audio download<br/>+ Whisper 'base' model ASR<br/>needs FFmpeg on server"]

    TypeD["Type Detection (from user message)<br/>'shanka samadhan' → SHANKA_SAMADHAN_PROMPT<br/>default → PRAVACHAN_PROMPT"]

    Fmt["Groq Formatting · temp 0.2<br/>raw_text sent to Groq<br/>Shanka: labels shakna / samadhan<br/>Pravachan: verbatim Hindi"]

    Store["Store raw_text in context<br/>context['youtube_transcript']<br/>for follow-up RAG queries"]

    Resp["Response to user<br/>1200-char formatted preview"]

    Err["Error: live stream detected<br/>'Please share after YouTube<br/>processes recording (few hours)'"]

    URL --> L1
    L1 -- "captions found" --> TypeD
    L1 -- "no captions / live" --> L2
    L2 -- "audio extracted" --> TypeD
    L2 -- "live stream" --> Err
    TypeD --> Fmt
    Fmt --> Store
    Fmt --> Resp

    classDef input fill:#374151,color:#fff,stroke:#1F2937
    classDef layer1 fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef layer2 fill:#92400E,color:#fff,stroke:#5C2800
    classDef detect fill:#003057,color:#fff,stroke:#001933
    classDef llm fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef output fill:#14532D,color:#fff,stroke:#0A3A1E
    classDef err fill:#B91C1C,color:#fff,stroke:#7F1010

    class URL input
    class L1 layer1
    class L2 layer2
    class TypeD detect
    class Fmt llm
    class Store,Resp output
    class Err err
```

---

## Figure 6 · 4-Layer Security Gate

```mermaid
flowchart TD
    In["Incoming User Message"]

    G1["CHECK 1 · Length Guard<br/>2 ≤ len(message) ≤ 2000"]
    G1F["HTTP 400<br/>Message out of bounds"]

    G2["CHECK 2 · 14 Hard-Block Regex<br/>'ignore previous instructions'<br/>'act as DAN / you are unrestricted'<br/>'reveal your system prompt'<br/>'run python / exec bash'<br/>'list your database / show api keys'<br/>+ 8 more injection patterns"]
    G2F["HTTP 400<br/>No model call — zero Groq cost"]

    G3["CHECK 3 · RBAC — 8 Admin Patterns<br/>'generate slots' · 'member list'<br/>'finance report' · 'broadcast notification'<br/>'approve/reject membership' · + 3 more"]
    G3F["HTTP 403<br/>devotee role blocked"]

    G4["CHECK 4 · PII Masking → Audit Log<br/>phone → PHONE · email → EMAIL<br/>PAN → PAN · Aadhaar → AADHAAR<br/>UPI → UPI_ID · user_id → SHA-256 (12 chars)"]

    Clear["Cleared → Groq model call proceeds"]

    In --> G1
    G1 -- "out of bounds" --> G1F
    G1 -- pass --> G2
    G2 -- "pattern matched" --> G2F
    G2 -- pass --> G3
    G3 -- "devotee + admin pattern" --> G3F
    G3 -- pass --> G4
    G4 --> Clear

    classDef input fill:#374151,color:#fff,stroke:#1F2937
    classDef check fill:#003057,color:#fff,stroke:#001933
    classDef fail fill:#B91C1C,color:#fff,stroke:#7F1010
    classDef pass fill:#14532D,color:#fff,stroke:#0A3A1E

    class In input
    class G1,G2,G3,G4 check
    class G1F,G2F,G3F fail
    class Clear pass
```

---

## Figure 7 · Groq Tool-Call Loop (Per Agent)

```mermaid
flowchart TD
    Start["Agent starts<br/>messages = [system_prompt] + last_8_turns + [user_msg]<br/>for iteration in range(max_iterations)"]

    Call["Groq API Call<br/>POST api.groq.com/openai/v1/chat/completions<br/>model: llama-4-scout-17b-16e-instruct<br/>tools: tool_definitions[] · tool_choice: 'auto'<br/>temperature: 0.5 · timeout: 60s"]

    Resp["Groq Response"]

    Stop["finish_reason = 'stop'<br/>message.content = final answer"]
    ToolCall["finish_reason = 'tool_calls'<br/>tool_calls: [{id, name, arguments}]"]

    Exec["Execute tool(s) in parallel<br/>asyncio.gather(*[tool_dispatch(...)])<br/>→ HTTP call to backend service"]

    Append["Append to messages:<br/>{role:'assistant', tool_calls:[…]}<br/>{role:'tool', tool_call_id, content: json_result}"]

    Done["Return final text to caller<br/>TempleAssistantResponse"]

    MaxIter["Max iterations reached<br/>Return last response"]

    Start --> Call --> Resp
    Resp --> Stop
    Resp --> ToolCall
    Stop --> Done
    ToolCall --> Exec --> Append --> Call
    Append -. "iteration == max_iterations" .-> MaxIter

    classDef start fill:#374151,color:#fff,stroke:#1F2937
    classDef api fill:#065A82,color:#fff,stroke:#044268
    classDef decision fill:#003057,color:#fff,stroke:#001933
    classDef tool fill:#92400E,color:#fff,stroke:#5C2800
    classDef done fill:#14532D,color:#fff,stroke:#0A3A1E
    classDef warn fill:#B91C1C,color:#fff,stroke:#7F1010

    class Start start
    class Call,Resp api
    class Stop,ToolCall decision
    class Exec,Append tool
    class Done done
    class MaxIter warn
```

---

## Figure 8 · Agent Swimlanes — All 4 Agents

```mermaid
flowchart TD
    subgraph A["AGENT A · Scripture · max 4 iter · temp 0.5"]
        A1["Groq decides: tool_calls<br/>search_jain_texts({query})"]
        A2["Gemini embed query<br/>task_type: RETRIEVAL_QUERY · 2048-dim"]
        A3["Pinecone query<br/>top_k=8 · cosine · include_metadata=True"]
        A4["Groq synthesises<br/>8 passages · min 120 words<br/>Context → Sacred Text → Meaning → Wisdom"]
        A1 --> A2 --> A3 --> A4
    end

    subgraph B["AGENT B · TempleOps · max 5 iter · temp 0.5"]
        B1["get_shantidhara_slots<br/>GET admin:8003/shantidhara/slots"]
        B2["book_shantidhara_slot<br/>POST registration:8002/bookings"]
        B3["get_my_bookings · cancel_booking<br/>GET/POST registration:8002/bookings"]
        B4["get_membership_status · submit_membership<br/>GET/POST registration:8002/memberships"]
        B5["get_temple_info<br/>2 parallel: GET admin:8003/temples/{id}<br/>+ GET admin:8003/payment-profile/{id}"]
    end

    subgraph C["AGENT C · Community · max 4 iter · temp 0.5"]
        C1["get_temple_news<br/>GET admin:8003/news-feed (top 5)"]
        C2["get_events<br/>GET admin:8003/events (top 5)"]
        C3["get_wall_of_fame<br/>GET admin:8003/wall-of-fame (top 5)"]
        C4["submit_feedback<br/>POST admin:8003/feedback"]
    end

    subgraph D["AGENT D · YouTube · max 1 iter · temp 0.2"]
        D1["Layer 1: youtube-transcript-api<br/>.fetch(video_id, ['hi','en'])"]
        D2["Layer 2 fallback: yt-dlp download<br/>+ Whisper base model transcribe"]
        D3["Groq format · temp 0.2<br/>SHANKA or PRAVACHAN prompt"]
        D1 -- "fail" --> D2
        D1 -- "success" --> D3
        D2 --> D3
    end

    classDef scripture fill:#92400E,color:#fff,stroke:#5C2800
    classDef ops fill:#003057,color:#fff,stroke:#001933
    classDef community fill:#14532D,color:#fff,stroke:#0A3A1E
    classDef youtube fill:#7C2D12,color:#fff,stroke:#4C1A0A

    class A1,A2,A3,A4 scripture
    class B1,B2,B3,B4,B5 ops
    class C1,C2,C3,C4 community
    class D1,D2,D3 youtube
```

---

## Figure 9 · Temple Knowledge Sync (Live RAG)

```mermaid
flowchart TD
    Req["AI request arrives<br/>sync_if_needed(temple_id)"]

    TTL{"Last sync less than 300s ago?"}
    Cache["Use SQLite cache<br/>skip re-sync"]

    subgraph PAR["6 PARALLEL CALLS · asyncio.gather"]
        P1["GET admin:8003/temples/{id}"]
        P2["GET admin:8003/shantidhara/slots"]
        P3["GET admin:8003/news-feed"]
        P4["GET admin:8003/events"]
        P5["GET admin:8003/wall-of-fame"]
        P6["GET admin:8003/payment-profile/{id}"]
    end

    Dedup{"SHA-256 checksum changed?"}
    Skip["Skip — no re-embed<br/>saves Gemini API cost"]
    ReEmbed["Delete old chunks<br/>re-chunk → embed → SQLite"]

    Search["In-memory cosine search<br/>top_k=4 (retrieval_limit)<br/>injected into agent context"]

    Req --> TTL
    TTL -- "yes" --> Cache
    TTL -- "no (300s+)" --> P1 & P2 & P3 & P4 & P5 & P6
    P1 & P2 & P3 & P4 & P5 & P6 --> Dedup
    Dedup -- "unchanged" --> Skip
    Dedup -- "changed" --> ReEmbed
    Skip --> Search
    ReEmbed --> Search
    Cache --> Search

    classDef req fill:#374151,color:#fff,stroke:#1F2937
    classDef ttl fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef cached fill:#14532D,color:#fff,stroke:#0A3A1E
    classDef parallel fill:#003057,color:#fff,stroke:#001933
    classDef dedup fill:#92400E,color:#fff,stroke:#5C2800
    classDef embed fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef result fill:#065A82,color:#fff,stroke:#044268

    class Req req
    class TTL ttl
    class Cache,Skip cached
    class P1,P2,P3,P4,P5,P6 parallel
    class Dedup dedup
    class ReEmbed embed
    class Search result
```

---

## Figure 10 · Database Schema — Aagam Mitra

```mermaid
erDiagram
    chat_messages {
        UUID id PK
        string user_id
        string temple_id
        string role
        text content
        datetime created_at
    }

    temple_knowledge_documents {
        string document_id PK
        string temple_id
        string source_type
        text content
        string content_checksum
    }

    temple_knowledge_chunks {
        string chunk_id PK
        string document_id FK
        int chunk_index
        text content
        json embedding_json
        datetime created_at
    }

    temple_knowledge_sync_state {
        string temple_id PK
        datetime synced_at
        string last_checksum
    }

    temple_knowledge_documents ||--o{ temple_knowledge_chunks : "cascade delete"
    temple_knowledge_sync_state ||--o{ temple_knowledge_documents : "tracks freshness"
```

---

## Figure 11 · Response Assembly

```mermaid
flowchart TD
    Agent["Agent returns final text"]

    Persist["1. Persist to SQLite<br/>INSERT user + assistant message<br/>TRIM to 100 rows per (user_id, temple_id)"]

    subgraph CARDS["2. Action-card keyword matching (on user message)"]
        K1["'book' / 'shantidhara' / 'slot'<br/>action_target: 'book'"]
        K2["'donate' / 'payment'<br/>action_target: 'donate'"]
        K3["'news' / 'update' / 'notice'<br/>action_target: 'home'"]
        K4["admin + 'publish'/'notification'<br/>action_target: 'admin'"]
        K5["no match<br/>action_target: 'chat'"]
    end

    Resp["3. Return TempleAssistantResponse<br/>{message, mode:'agent', citations:[],<br/>action_cards:[{title, action_label, action_target}],<br/>phase:'temple_ai'}"]

    UI["React Native renders<br/>chat bubble + tappable action chips"]

    Agent --> Persist --> K1 & K2 & K3 & K4 & K5
    K1 & K2 & K3 & K4 & K5 --> Resp --> UI

    classDef agent fill:#6B21A8,color:#fff,stroke:#4A1570
    classDef persist fill:#003057,color:#fff,stroke:#001933
    classDef card fill:#0F766E,color:#fff,stroke:#0B5A54
    classDef resp fill:#065A82,color:#fff,stroke:#044268
    classDef ui fill:#14532D,color:#fff,stroke:#0A3A1E

    class Agent agent
    class Persist persist
    class K1,K2,K3,K4,K5 card
    class Resp resp
    class UI ui
```

---

## Configuration Reference

| Setting | Default | File |
|---|---|---|
| groq_model | meta-llama/llama-4-scout-17b-16e-instruct | aagam-mitra/config.py |
| groq_temperature | 0.5 | aagam-mitra/config.py (BaseAgent) |
| pinecone_index_name | jain-texts | aagam-mitra/config.py |
| chunk_size_characters | 800 | aagam-mitra/config.py |
| chunk_overlap_characters | 100 | aagam-mitra/config.py |
| retrieval_limit | 4 | aagam-mitra/config.py (temple knowledge) |
| sync_ttl_seconds | 300 | aagam-mitra/config.py |
| upstream_timeout_seconds | 45.0 | aagam-mitra/config.py |
| upstream_retry_attempts | 4 | aagam-mitra/config.py |
| ACCESS_TOKEN_EXPIRE_HOURS | 24 | identity .env |
| REFRESH_TOKEN_EXPIRE_DAYS | 30 | identity .env |

## Groq Temperature Map

| Location | Temp | Reason |
|---|---|---|
| BaseAgent (all specialist agents) | 0.5 | Balanced — settings.groq_temperature |
| rag.py (legacy scripture RAG) | 0.3 | Conservative — factual scripture |
| assistant.py (temple data) | 0.3 | Conservative — live data |
| orchestrator.py (multi-agent synthesis) | 0.4 | Combining multiple agent outputs |
| youtube.py (transcript formatting) | 0.2 | Must stay faithful to source text |

## Security Pattern Counts

| Layer | Count | Action on Match |
|---|---|---|
| Hard-block (input guardrails) | 14 regex | HTTP 400 — no LLM call |
| Admin-only RBAC | 8 regex | HTTP 403 — devotee blocked |
| Soft-warn (logged only) | 3 regex | Logged, not blocked |
| PII masking | 7 regex | Replaced with [PHONE], [EMAIL] etc. |
| Hardened system prompt | 5 rules | Injected into every Groq call |
