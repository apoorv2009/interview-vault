# MyTemple — Architecture Diagrams

> Full system architecture · every service · every data flow  
> Source: `MyTemple_Architecture_Doc.pptx` · Updated June 2026

---

## Figure 1 · Full System Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   Mobile App                │     │   Web Browser                │
│   React Native 0.83 · Expo55│     │   Expo Web                   │
│   Android & iOS             │     │   Hosted on Vercel           │
└──────────────┬──────────────┘     └──────────────┬───────────────┘
               │ HTTPS                              │ HTTPS
               └────────────────┬───────────────────┘
                                 ▼
                    ┌────────────────────────────┐
                    │        Vercel CDN Edge      │
                    │  Serves web app             │
                    │  rewrites /api/* →          │
                    │  Cloudflare tunnel URL      │
                    └───────────────┬────────────┘
                                    │ HTTPS / rewrite /api/*
                                    ▼
                    ┌────────────────────────────┐
                    │   Cloudflare Quick Tunnel   │
                    │   QUIC / HTTP2              │
                    │   cloudflared → localhost   │
                    └───────────────┬────────────┘
                                    │ HTTP (local)
                                    ▼
          ┌─────────────────────────────────────────────────┐
          │         API Gateway · FastAPI · :8000            │
          │  JWT verify · rate limit · reverse-proxy         │
          │  INJECTS: X-User-Id · X-User-Role · X-Temple-Id │
          └──────┬──────────┬──────────┬──────────┬─────────┘
                 │          │          │           │ Docker DNS
         ┌───────▼──┐ ┌─────▼────┐ ┌──▼──────┐ ┌─▼──────────────┐
         │ Identity │ │Registrtn │ │  Admin  │ │  Aagam Mitra   │
         │  :8001   │ │  :8002   │ │  :8003  │ │    :8004       │
         │          │ │          │ │         │ │                │
         │ Users    │ │ Bookings │ │ Slots   │ │ AI chat · RAG  │
         │ JWT      │ │ Donations│ │ Events  │ │ Agents         │
         │ Argon2   │ │ Mbrships │ │ News    │ │ YouTube txcpts │
         │ Push tkns│ │ Razorpay │ │ Finance │ │                │
         └──────────┘ └──────────┘ └─────────┘ └───────┬────────┘
                                                        │ External HTTPS
                                          ┌─────────────┼─────────────┐
                                          ▼             ▼             ▼
                                      ┌───────┐   ┌─────────┐   ┌────────┐
                                      │ Groq  │   │Pinecone │   │ Gemini │
                                      │LLaMA 4│   │jain-text│   │embed   │
                                      │Scout  │   │  index  │   │  -001  │
                                      └───────┘   └─────────┘   └────────┘

                    ┌────────────────────────────────────────┐
                    │         Redis · :6379                   │
                    │    SHARED BY ALL SERVICES              │
                    │    Rate limiting · AOF persistence      │
                    └────────────────────────────────────────┘

                 Identity → Expo Push → FCM (Android) / APNS (iOS)
```

---

## Figure 2 · Request Flow — Phone to Backend

```
 ① Mobile App                 ② Vercel Edge              ③ Cloudflare Tunnel
 fetch("/api/v1/auth/signin") rewrite → tunnel URL       QUIC → localhost:8000
         │                          │                            │
         └──────────── HTTPS ───────┘                           │
                                                                 │
 ④ API Gateway                                                   │
 verify JWT · proxy ◄────────────────── HTTP (local) ───────────┘
         │
         │   JWT payload: { sub, role, temple_id, exp }
         │   Access token: 24h · Refresh token: 30d
         │
         │   INJECTS TO DOWNSTREAM:
         │   ┌─────────────────────────────┐
         │   │ X-User-Id:    usr_abc123    │
         │   │ X-User-Role:  devotee       │
         │   │ X-Temple-Id:  tmpl_001      │
         │   └─────────────────────────────┘
         │
         ▼
 ⑤ Backend Service
 (identity / admin / aagam-mitra)

Response travels back the same path ↑
```

---

## Figure 3 · Agent Orchestration Flow

```
User Message
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Security Layer                            │
│  14 hard-block regex (injection / jailbreak / code-exec)        │
│  RBAC: 8 admin-only patterns blocked for 'devotee'              │
│  PII-masked audit log written before model call                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │          Orchestrator           │
              │  Regex intent detection         │
              │  → route to 1–N agents          │
              └──┬──────────┬──────────┬───────┴───┐
    parallel route │          │          │           │
                   ▼          ▼          ▼           ▼
         ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
         │  Scripture   │ │TempleOps │ │Community│ │ YouTube  │
         │ Jain texts   │ │ Bookings │ │ News    │ │Transcript│
         │ Pinecone RAG │ │ Slots    │ │ Events  │ │API+Whspr │
         │   4 tools    │ │ Mbrship  │ │ Wall of │ │ 0 tools  │
         │              │ │ 7 tools  │ │  Fame   │ │          │
         └──────────────┘ └──────────┘ │ 4 tools │ └──────────┘
                                        └─────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │   Groq · LLaMA 4 Scout 17B     │
              │   Final Synthesis              │
              │   temperature 0.4 (multi-agent)│
              └────────────────────────────────┘
                               │
                               ▼
              TempleAssistantResponse + action_cards
```

---

## Figure 4 · RAG Pipeline — Indexing & Retrieval

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 INDEXING PHASE  (done once per PDF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin uploads Jain Scripture PDF
  POST /api/v1/ingest/upload (multipart/form-data)
              │
              ▼
        pypdf extraction
        page.extract_text() → re.sub('\s+',' ')
              │
              ▼
          Chunker
          chunk_size: 800 chars
          chunk_overlap: 100 chars
          → [{text, page_num, chunk_index}, …]
              │
              ▼
      Gemini Embedding
      gemini-embedding-001
      task_type: RETRIEVAL_DOCUMENT
      outputDimensionality: 2048
      batch_size: 100 texts/call
              │
              ▼
       Pinecone Upsert
       index: "jain-texts"
       id: "source:page:chunk"
       values: [float × 2048]
       metadata: {text, source, page}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RETRIEVAL PHASE  (every user question)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User Question: "What is Navakar Mantra?"
              │
              ▼
      Gemini Embed (QUERY)
      task_type: RETRIEVAL_QUERY   ← different from storage!
      → [float × 2048]
              │
              ▼
       Pinecone Query
       index.query(vector, top_k=8, include_metadata=True)
       → 8 passages with cosine similarity scores
              │
              ▼
       Groq Synthesis
       temperature: 0.3
       4-part answer: Context → Sacred Text → Meaning → Practical Wisdom
              │
              ▼
    Final Answer + citations + action_cards
```

**Chunking visualised:**
```
  ◄──────────────────── 800 chars ─────────────────────►
  ┌───────────────────────────────────────────────────────┐
  │                   Chunk 0                             │
  └────────────────────────────────────────────┬──────────┘
                                     ◄─100 ch overlap─►
                                     ┌──────────────────────────────────────────────┐
                                     │                Chunk 1                       │
                                     └──────────────────────────────────────────────┘
```

---

## Figure 5 · YouTube Transcript Pipeline

```
User shares YouTube URL
  extract video_id · detect type (Shanka / Pravachan)
              │
              ▼
  ┌─────────────────────────────────────┐
  │      LAYER 1 · PRIMARY (fast)       │
  │   youtube-transcript-api            │
  │   .fetch(video_id, ['hi','en'])     │
  │   creator & auto-generated captions │
  └─────────────────────┬───────────────┘
                        │ success → skip Layer 2
                        │ FAIL (no captions / live stream)
                        ▼
  ┌─────────────────────────────────────┐
  │    LAYER 2 · FALLBACK (30-120s)     │
  │   yt-dlp audio download             │
  │   + Whisper "base" model ASR        │
  │   needs FFmpeg on server            │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────┐
  │    Groq Formatting · temp 0.2       │
  │   Shanka Samadhan prompt  OR        │
  │   Pravachan prompt                  │
  │   raw_text[:8000] sent to Groq      │
  └─────────────────────┬───────────────┘
                        │
                        ▼
  Response: 1200-char preview
  Full raw_text stored in context['youtube_transcript']
  for follow-up RAG queries
```

**Transcript type detection:**
```
Message contains "shanka samadhan" / "jigyasa samadhan"
    → is_shanka = True  → SHANKA_SAMADHAN_PROMPT (labels: शंका: / समाधान:)

No shanka keyword
    → is_shanka = False → PRAVACHAN_PROMPT (verbatim Hindi)
```

---

## Figure 6 · Database Schema — Aagam Mitra

```
┌──────────────────────────────────┐
│         chat_messages            │
├──────────────────────────────────┤
│ id           UUID PK             │
│ user_id      idx                 │
│ temple_id    idx                 │
│ role         user | assistant    │
│ content      Text                │
│ created_at   UTC                 │
└──────────────────────────────────┘

┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  temple_knowledge_documents      │        │  temple_knowledge_chunks         │
├──────────────────────────────────┤        ├──────────────────────────────────┤
│ document_id    PK                │──── ◄──│ chunk_id        PK               │
│ temple_id                        │  CASCADE│ document_id     FK               │
│ source_type                      │        │ chunk_index     int              │
│ content        Text              │        │ content         Text (800 chars) │
│ content_checksum  SHA-256        │        │ embedding_json  [2048 floats]    │
└──────────────────────────────────┘        │ created_at      UTC              │
                                            └──────────────────────────────────┘

┌──────────────────────────────────┐
│  temple_knowledge_sync_state     │
├──────────────────────────────────┤
│ temple_id    PK                  │
│ synced_at    UTC                 │
│ last_checksum                    │
│ ttl          300 seconds         │
└──────────────────────────────────┘

Note: Pinecone holds 2048-dim vectors · SQL holds text + metadata
```

---

## Figure 7 · 4-Layer Security Gate

```
Incoming User Message
        │
        ▼
┌───────────────────────────────────────────────────────┐
│  CHECK 1 · Length Guard                               │
│  2 ≤ len(message) ≤ 2000                             │
│  else → HTTP 400                                      │
└──────────────────────────────┬────────────────────────┘
                               │ pass
                               ▼
┌───────────────────────────────────────────────────────┐
│  CHECK 2 · 14 Hard-Block Regex                        │
│  ▸ "ignore previous instructions"                     │
│  ▸ "act as DAN" / "you are now unrestricted"          │
│  ▸ "reveal your system prompt"                        │
│  ▸ <system> · [override] tag injection                │
│  ▸ "run python" / "exec bash"                         │
│  ▸ "list your database" / "show api keys"             │
│  ▸ + 8 additional patterns                            │
│  match → HTTP 400 · no model call ever                │
└──────────────────────────────┬────────────────────────┘
                               │ pass
                               ▼
┌───────────────────────────────────────────────────────┐
│  CHECK 3 · RBAC — 8 Admin-Only Patterns               │
│  ▸ "generate slots"    ▸ "member list"                │
│  ▸ "finance report"    ▸ "broadcast notification"     │
│  ▸ "approve/reject membership"                        │
│  ▸ + 3 additional patterns                            │
│  devotee role → HTTP 403                              │
└──────────────────────────────┬────────────────────────┘
                               │ pass
                               ▼
┌───────────────────────────────────────────────────────┐
│  CHECK 4 · PII Masking → Audit Log                    │
│  phone → [PHONE]        email → [EMAIL]               │
│  PAN   → [PAN]          Aadhaar → [AADHAAR]           │
│  UPI   → [UPI_ID]       user_id → SHA-256 first 12ch  │
│  then write audit row                                 │
└──────────────────────────────┬────────────────────────┘
                               │ cleared
                               ▼
                    Groq model call proceeds
```

**Security pattern counts:**
| Layer | Count | Action on Match |
|---|---|---|
| Hard-block (input guardrails) | 14 regex | HTTP 400 — no LLM call |
| Admin-only RBAC | 8 regex | HTTP 403 — devotee blocked |
| Soft-warn (logged only) | 3 regex | Logged, not blocked |
| PII masking | 7 regex | Replaced with [PHONE], [EMAIL] etc. |
| Hardened system prompt | 5 rules | Injected into every Groq call |

---

## Figure 8 · End-to-End Request Chain (Aagam Mitra)

```
  React Native App · Expo 55
  Chat screen tap
        │
        │ POST /api/v1/temples/{temple_id}/assistant/chat
        │ Authorization: Bearer <jwt>
        │ Content-Type: application/json
        │ Body:
        │ {
        │   "user_id":    "usr_abc123",
        │   "role":       "devotee",
        │   "message":    "What is the meaning of Navakar Mantra?",
        │   "temple_name": "Shri Digambar Jain Mandir",
        │   "history":   [← last 20 turns from component state]
        │ }
        │ HTTPS
        ▼
  Vercel Edge  (temple-frontend-pi.vercel.app)
  rewrite /api/* → Cloudflare Tunnel URL
        │ HTTPS
        ▼
  Cloudflare Quick Tunnel  (QUIC / HTTP2)
  cloudflared → localhost:8000
        │ HTTP (local)
        ▼
  API Gateway · FastAPI :8000
  verify JWT → inject X-User-Id, X-User-Role, X-Temple-Id
  proxy → aagam-mitra:8004 (Docker DNS)
        │
        ▼
  Aagam Mitra Service :8004
  → Security (4 gates)
  → Orchestrator (intent regex)
  → Agent(s) (tool-call loop)
  → Response
```

---

## Figure 9 · Orchestrator — Intent Classification

```
Compiled regex sets (run simultaneously, ~0ms):

  SET 1 · SCRIPTURE
  sutra, agam, mantra, karma, dharma, moksha, atma,
  navakar, tirthankar, scripture, आगम, सूत्र, ...

  SET 2 · TEMPLE_OPS
  book, slot, shantidhara, membership, donate,
  payment, cancel, timing, बुक, शांतिधारा, ...

  SET 3 · COMMUNITY
  news, event, wall of fame, notice, announcement,
  feedback, समाचार, ...

  SET 4 · YOUTUBE
  youtube.com/watch?v=  OR  youtu.be/  OR  youtube.com/shorts/

         ┌────────────────┬───────────────┐
         │                │               │
  1 intent matched  2+ intents matched  0 matched
         │                │               │
         ▼                ▼               ▼
  Single agent     asyncio.gather    Default to
  directly         all matched       TEMPLE_OPS
                   agents in parallel

Agent config:
┌────────────────┬──────┬──────┬───────┬───────────────────────────────┐
│ Agent          │ Iter │ Temp │ Tools │ Key Responsibility             │
├────────────────┼──────┼──────┼───────┼───────────────────────────────┤
│ A · Scripture  │  4   │ 0.5  │   1   │ RAG · Pinecone top-8          │
│ B · TempleOps  │  5   │ 0.5  │   7   │ Bookings, slots, payments     │
│ C · Community  │  4   │ 0.5  │   4   │ News, events, wall of fame    │
│ D · YouTube    │  1   │ 0.2  │   0   │ Transcript extract + format   │
└────────────────┴──────┴──────┴───────┴───────────────────────────────┘
```

---

## Figure 10 · Groq Tool-Call Loop

```
ROUND 1 — Request a tool
  Messages: [system_prompt, history×8, user_message]
  + tool_definitions[]
  + temperature: 0.5
  + tool_choice: "auto"
        │
        ▼ Groq returns:
  {
    "finish_reason": "tool_calls",
    "message": {
      "tool_calls": [{
        "id": "call_abc123",
        "function": {
          "name": "get_shantidhara_slots",
          "arguments": "{\"slot_date\": \"2026-01-15\"}"
        }
      }]
    }
  }
        │
        ▼ code executes tool → HTTP call → result
        │
        │ append to messages:
        │   {role:"assistant", tool_calls:[…]}
        │   {role:"tool", tool_call_id:"call_abc123", content:"[…json…]"}
        │
ROUND 2 — Final answer
        │
        ▼ Groq returns:
  {
    "finish_reason": "stop",
    "message": {
      "content": "Here are the available slots for Jan 15…"
    }
  }
        │
        ▼
  Return final text to caller ✓
```

---

## Figure 11 · Agent Swimlanes

```
AGENT A · Scripture · max 4 iterations · temp 0.5
  ─────────────────────────────────────────────────────────────────
  STEP 1: Groq decides → finish_reason="tool_calls"
                       → search_jain_texts({query})
  STEP 2: Embed query  → Gemini RETRIEVAL_QUERY · 2048-dim → float[]
  STEP 3: Query Pinecone → index.query(vector, top_k=8, include_metadata=True)
  STEP 4: Groq synthesises → 8 passages injected · temp 0.5 · min 120 words
  Output: 4-part answer: Context → Sacred Text → Meaning → Practical Wisdom

AGENT B · TempleOps · max 5 iterations · temp 0.5
  ─────────────────────────────────────────────────────────────────
  7 tools:
    get_shantidhara_slots    → GET  admin:8003/shantidhara/slots
    book_shantidhara_slot    → POST registration:8002/bookings
    get_my_bookings          → GET  registration:8002/bookings/me
    cancel_booking           → POST registration:8002/.../cancel
    get_membership_status    → GET  registration:8002/memberships/me
    submit_membership_request→ POST registration:8002/memberships
    get_temple_info          → GET  admin:8003/temples/{id}        (2 parallel calls)
                               GET  admin:8003/payment-profile/{id}

AGENT C · Community · max 4 iterations · temp 0.5
  ─────────────────────────────────────────────────────────────────
  4 tools:
    get_temple_news          → GET  admin:8003/news-feed   (top 5)
    get_events               → GET  admin:8003/events      (top 5)
    get_wall_of_fame         → GET  admin:8003/wall-of-fame(top 5)
    submit_feedback          → POST admin:8003/feedback

AGENT D · YouTube · max 1 iteration · temp 0.2
  ─────────────────────────────────────────────────────────────────
  Overrides BaseAgent.run() entirely — no tool-call loop
  L1: youtube-transcript-api.fetch(video_id, ['hi','en'])
       ↓ if fails:
  L2: yt-dlp + Whisper base → audio download → transcribe
       ↓
  Groq format · temp 0.2 · SHANKA or PRAVACHAN prompt
```

---

## Figure 12 · Temple Knowledge Sync (Live RAG)

```
sync_if_needed(temple_id) called before every AI response:

  ┌─────────────────────────┐
  │      TTL Gate           │
  │  < 300s since last sync │──► use SQLite cache (skip sync)
  │  ≥ 300s                 │──► full re-sync ↓
  └─────────────────────────┘
              │
              ▼
  6 PARALLEL CALLS (asyncio.gather):
  ┌──────────────────────────────────────────────────┐
  │  GET admin:8003/temples/{id}                     │
  │  GET admin:8003/shantidhara/slots                │
  │  GET admin:8003/news-feed                        │
  │  GET admin:8003/events                           │
  │  GET admin:8003/wall-of-fame                     │
  │  GET admin:8003/payment-profile/{id}             │
  └──────────────────────────────────────────────────┘
              │
              ▼
  For each document:
    new_checksum = SHA-256(content)
    if new_checksum == stored_checksum:
        skip (no re-embed, saves Gemini API cost)
    else:
        delete_old_chunks(document_id)
        embed_and_store(content)     ← chunk → embed → SQLite

  In-memory cosine search → top 4 (retrieval_limit=4)
```

---

## Figure 13 · Response Assembly

```
Agent returns final text
        │
        ▼
  1. Persist to SQLite
     INSERT user + assistant message
     TRIM to 100 rows per (user_id, temple_id)
        │
        ▼
  2. Action-card matching (keyword scan on user message)
     "book" / "shantidhara" / "slot"   → action_target: "book"
     "donate" / "payment"              → action_target: "donate"
     "news" / "update" / "notice"      → action_target: "home"
     admin + "publish"/"notification"  → action_target: "admin"
     (no match)                        → action_target: "chat"
        │
        ▼
  3. Return TempleAssistantResponse:
     {
       "message":      "The Navakar Mantra is…",
       "mode":         "agent",
       "citations":    [],
       "action_cards": [{ title, action_label, action_target }],
       "phase":        "temple_ai"
     }
        │
        ▼
  React Native renders chat bubble + tappable action chip
  📿 Book Shantidhara   🪔 Donate
```

---

## Service Inventory

| Service | Port | Framework | Key Libraries |
|---|---|---|---|
| API Gateway | :8000 | FastAPI 0.115+ | httpx 0.27 · pydantic-settings 2.4 · sqlalchemy 2.0 |
| Identity | :8001 | FastAPI 0.115+ | argon2-cffi 23 · sqlalchemy 2.0 · psycopg 3.2 |
| Registration | :8002 | FastAPI 0.115+ | httpx · redis 5.0 · sqlalchemy 2.0 |
| Admin | :8003 | FastAPI 0.115+ | httpx · redis 5.0 · sqlalchemy 2.0 |
| Aagam Mitra AI | :8004 | FastAPI 0.115+ | pinecone 5 · httpx · youtube-transcript-api 0.7 · yt-dlp · openai-whisper |

---

## Route Table — Gateway → Backend

| Method | Path | Proxied To | Auth |
|---|---|---|---|
| POST | /api/v1/auth/signup | identity:8001 | No |
| POST | /api/v1/auth/signin | identity:8001 | No |
| POST | /api/v1/auth/push-tokens/register | identity:8001 | JWT |
| GET | /api/v1/chat/{user_id}/{temple_id}/history | aagam-mitra:8004 | JWT |
| POST | /api/v1/temples/{id}/assistant/chat | aagam-mitra:8004 | JWT |
| POST | /api/v1/signup-requests/shantidhara-bookings | registration:8002 | JWT |
| POST | /api/v1/signup-requests/donations | registration:8002 | JWT |
| GET | /api/v1/temples/{id}/shantidhara/slots | admin:8003 | JWT |
| POST | /api/v1/temples/{id}/shantidhara/slots/generate | admin:8003 | Admin |
| GET | /api/v1/temples/{id}/finance/summary | admin:8003 | Admin |

---

## Groq Call — Temperature Reference

| Location | Temp | Reason |
|---|---|---|
| BaseAgent (all specialist agents) | 0.5 | settings.groq_temperature — balanced |
| rag.py (legacy scripture RAG) | 0.3 | Conservative — factual scripture answers |
| assistant.py (temple data synthesis) | 0.3 | Conservative — live factual data |
| orchestrator.py (multi-agent synthesis) | 0.4 | Balanced — combining multiple outputs |
| youtube.py (transcript formatting) | 0.2 | Must preserve transcript faithfully |

**Groq model:** `meta-llama/llama-4-scout-17b-16e-instruct`  
**Endpoint:** `api.groq.com/openai/v1/chat/completions`  
**Timeout:** 60s · **Tool choice:** `"auto"` · **History:** last 8 turns injected

---

## Storage Layout — All Services

| Service | DB File | Key Tables |
|---|---|---|
| Identity | docker-data/identity/temple_identity.db | users · refresh_tokens · user_push_tokens |
| Registration | docker-data/registration/temple_registration.db | memberships · bookings · donations · notifications |
| Admin | docker-data/admin/temple_admin.db | temples · shantidhara_slots · news_feed · events · finance · wall_of_fame |
| Aagam Mitra | docker-data/aagam-mitra/temple_ai.db | chat_messages · temple_knowledge_documents · temple_knowledge_chunks · sync_state |
| Pinecone (cloud) | index: jain-texts (2048-dim) | Jain scripture chunks — shared across all temples |

---

## Configuration Reference

| Setting | Default | Service |
|---|---|---|
| groq_model | meta-llama/llama-4-scout-17b-16e-instruct | aagam-mitra config.py |
| groq_temperature | 0.5 | aagam-mitra config.py (BaseAgent) |
| pinecone_index_name | jain-texts | aagam-mitra config.py |
| chunk_size_characters | 800 | aagam-mitra config.py |
| chunk_overlap_characters | 100 | aagam-mitra config.py |
| retrieval_limit | 4 | aagam-mitra config.py (temple knowledge) |
| sync_ttl_seconds | 300 | aagam-mitra config.py |
| upstream_timeout_seconds | 45.0 | aagam-mitra config.py |
| upstream_retry_attempts | 4 | aagam-mitra config.py |
| ACCESS_TOKEN_EXPIRE_HOURS | 24 | identity .env |
| REFRESH_TOKEN_EXPIRE_DAYS | 30 | identity .env |

---

## Library Versions

| Library | Version | Service | Purpose |
|---|---|---|---|
| fastapi | >=0.115,<1.0 | all | HTTP API framework |
| uvicorn[standard] | >=0.30,<1.0 | all | ASGI server |
| httpx | >=0.27,<1.0 | gateway, ai, reg | Async HTTP client |
| sqlalchemy | >=2.0,<3.0 | all | ORM |
| psycopg[binary] | >=3.2,<4.0 | all | PostgreSQL driver |
| pydantic-settings | >=2.4,<3.0 | all | Config from .env |
| redis | >=5.0,<9.0 | registration, admin, ai | Rate limit / cache |
| argon2-cffi | >=23,<24 | identity, reg | Password hashing |
| pinecone | >=5.0,<6.0 | aagam-mitra | Vector DB client |
| pypdf | >=4.0,<5.0 | aagam-mitra | PDF text extraction |
| youtube-transcript-api | >=0.7.0 | aagam-mitra | YouTube captions (Layer 1) |
| yt-dlp | >=2025.1,<2026.0 | aagam-mitra | YouTube audio download (Layer 2) |
| openai-whisper | >=20231117 | aagam-mitra | Whisper ASR (Layer 2) |
| reportlab | >=4.0,<5.0 | aagam-mitra | PDF transcript generation |
| expo | ~55.0.18 | temple-frontend | Build toolchain |
| react-native | 0.83.6 | temple-frontend | Native bridge |
| react | 19.2.0 | temple-frontend | UI rendering |
| expo-router | ~55.0.13 | temple-frontend | File-based routing |
| @react-native-firebase/app | ^24.0.0 | temple-frontend | Firebase SDK |
| expo-notifications | ~55.0.22 | temple-frontend | Push notifications |
| react-native-razorpay | ^3.0.0 | temple-frontend | Payment sheet |
| react-native-reanimated | 4.2.1 | temple-frontend | Animations |
| typescript | ~5.9.2 | temple-frontend | Type safety |
