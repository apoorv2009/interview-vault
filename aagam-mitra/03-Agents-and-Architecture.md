# Agents & System Architecture — Interview Q&A

---

## 1. What is an AI agent? How is it different from a regular LLM call?

> **Why asked:** "Agent" is one of the most overused buzzwords in AI right now. Interviewers ask this to filter out people who just use the word vs people who can explain what it actually means in code. The clearest way to answer is side-by-side: regular LLM answers from training data, an agent calls live APIs and incorporates the results. Always give a concrete example from the project.

**Regular LLM call:**
```
User: "How do I book Shantidhara?"
LLM:  "I don't have access to your temple's booking system..."
(Answers from training data only — may be wrong or generic)
```

**Agent:**
```
User: "Show me available Shantidhara slots for January 15"
Agent → calls tool: get_shantidhara_slots(date="2026-01-15")
      → gets LIVE data from temple database
Agent: "Available slots for Jan 15:
        - Pratima 1 (Adinath): 7:00 AM — ₹1,100 — AVAILABLE
        - Pratima 3 (Shantinath): 7:00 AM — ₹1,100 — AVAILABLE"
```

**Key difference:** An agent can take **actions** — call APIs, query databases, perform computations — and incorporate real-time results into its response.

---

## 2. Describe the 4 specialist agents in Aagam Mitra.

> **Why asked:** Having multiple agents with clear responsibilities is good system design — it's the "single responsibility principle" applied to AI. The interviewer wants to see you can explain what each agent does, why they're separate, and what the design tradeoffs are. The YouTubeAgent is interesting because it completely overrides `BaseAgent.run()` — be ready to explain why.

### ScriptureAgent
- **Purpose:** Jain philosophy, scripture, dharma questions
- **Tools:** 1 — `search_jain_texts(query)` → Pinecone semantic search
- **Max iterations:** 4
- **Temperature:** 0.5
- **Response format:** 4-part structure — Context → Sacred Text → Meaning → Practical Wisdom
- **Quality rule:** Minimum 120 words enforced

### TempleOpsAgent
- **Purpose:** Bookings, memberships, donations, temple info
- **Tools:** 7 (get_slots, book_slot, get_bookings, cancel, get_membership, submit_membership, get_temple_info)
- **Max iterations:** 5 (most complex — may check slots then book in 2 rounds)
- **Temperature:** 0.5

### CommunityAgent
- **Purpose:** News, events, wall of fame, feedback
- **Tools:** 4 — `get_news`, `get_events`, `get_wall_of_fame`, `submit_feedback`
- **Max iterations:** 4
- **Temperature:** 0.5

### YouTubeAgent
- **Purpose:** Extract and format YouTube pravachan/shanka samadhan transcripts
- **Tools:** 0 — completely overrides `BaseAgent.run()` (no tool loop needed)
- **Max iterations:** 1
- **Temperature:** 0.2 (formatting task, not generation)
- **Special:** Dual-layer transcript extraction (native captions → Whisper ASR fallback)

---

## 3. List all 12 tools and what HTTP calls they make.

> **Why asked:** Listing all tools shows you know your system in detail. This question often comes up as "walk me through what happens when a user asks to book a slot" — and you need to know which tool fires, what URL it calls, and what it returns. Interviewers at product companies especially like when you can trace a user action all the way to an HTTP call.

| Tool | Agent | HTTP Call | Returns |
|---|---|---|---|
| `search_jain_texts` | Scripture | Gemini embed → Pinecone query | 8 passages + scores |
| `get_shantidhara_slots` | TempleOps | GET admin:8003/shantidhara/slots | Available slot list |
| `book_shantidhara_slot` | TempleOps | POST registration:8002/bookings | booking_id, amount |
| `get_my_bookings` | TempleOps | GET registration:8002/bookings/me | Booking history |
| `cancel_booking` | TempleOps | POST registration:8002/.../cancel | success/error |
| `get_membership_status` | TempleOps | GET registration:8002/memberships/me | status, temple |
| `submit_membership_request` | TempleOps | POST registration:8002/memberships | subscription_id |
| `get_temple_info` | TempleOps | GET admin:8003/temples/{id} (2 parallel calls) | name, location, payment |
| `get_temple_news` | Community | GET admin:8003/news-feed | Top 5 news items |
| `get_events` | Community | GET admin:8003/events | Top 5 events |
| `get_wall_of_fame` | Community | GET admin:8003/wall-of-fame | Top 5 entries |
| `submit_feedback` | Community | POST admin:8003/feedback | Confirmation |

---

## 4. What is the full system architecture? How do services communicate?

> **Why asked:** System design is a core interview topic. This question tests whether you understand the full picture — not just your one service, but how everything connects. Key points to mention: Cloudflare tunnel (why it's needed), Vercel rewrite (how the frontend decouples from tunnel URL changes), Docker internal DNS (how services find each other), and the API gateway (single point of JWT verification).

```
React Native App (Expo 55) / Web Browser (Vercel)
  ↓ HTTPS
Vercel CDN — rewrites /api/* to Cloudflare tunnel URL
  ↓ HTTPS
Cloudflare Quick Tunnel — exposes localhost:8000 to internet
  ↓ HTTP (local)
API Gateway :8000 (FastAPI)
  - Verifies JWT, injects X-User-Id / X-User-Role / X-Temple-Id headers
  - Proxies to 4 backend services via Docker internal DNS
  ├── Identity :8001     — Users, JWT, Argon2 passwords, push tokens
  ├── Registration :8002 — Bookings, donations, memberships, Razorpay
  ├── Admin :8003        — Slots, news, events, finance, wall of fame
  └── Aagam Mitra :8004  — AI chat, RAG, agents, YouTube transcripts
           ↓ External HTTPS
           ├── Groq API   — LLaMA 4 Scout 17B inference
           ├── Pinecone   — Vector search (jain-texts index)
           └── Gemini API — Text embeddings (2048-dim)

Shared across services: Redis :6379 (rate limiting, AOF persistence)
```

---

## 5. Why a custom agent loop instead of LangChain/LangGraph?

> **Why asked:** This is a nuanced question that tests your ability to evaluate tools critically. The wrong answer is "we didn't know about LangChain" or "LangChain is bad." The right answer explains that for our use case the custom code is simpler than the abstraction layer, and you know exactly when you *would* adopt LangGraph (streaming, human-in-the-loop, complex branching). Show that you evaluated the choice, not just defaulted to custom.

Our custom agent loop is **~40 lines of plain Python**. At that size, a framework adds more complexity than it removes:

| Capability | LangChain/LangGraph | Our custom code |
|---|---|---|
| LLM call | `ChatGroq(model=...)` | `httpx.post(GROQ_URL, ...)` |
| Tool definition | `@tool` decorator | Plain dict with JSON schema |
| Agent loop | `AgentExecutor.invoke()` | `for i in range(max_iterations)` |
| Parallel tools | Hidden in framework | `asyncio.gather(...)` — explicit |
| Debugging | Must understand abstractions | Read the 40 lines directly |

**When LangGraph WOULD be worth it:**
- Complex conditional branching (if confidence < 0.7, try a different search strategy)
- Human-in-the-loop (pause for admin approval mid-booking)
- Streaming intermediate steps to the UI in real time
- State persistence across disconnected multi-session tasks

None of these are current requirements. Migration path is clear if any of them become needed.

---

## 6. How does the API Gateway handle JWT verification?

> **Why asked:** JWT is standard knowledge but the architectural pattern here — gateway verifies, backends trust injected headers — is a specific design choice worth understanding. It means backend services never see the raw token and never need the JWT secret. This reduces the blast radius if a backend service is compromised, since it can't forge tokens.

```
Request: POST /api/v1/temples/{id}/assistant/chat
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Gateway:
  1. Extract token from Authorization header
  2. Verify signature with JWT_SECRET_KEY (HS256 algorithm)
  3. Decode payload: { sub: "usr_abc123", role: "devotee", temple_id: "tmpl_001", exp: ... }
  4. Check exp — 401 if expired
  5. Inject downstream headers:
     X-User-Id: usr_abc123
     X-User-Role: devotee
     X-Temple-Id: tmpl_001
  6. Proxy to aagam-mitra:8004

Backend services TRUST these injected headers — they never re-verify the JWT.
Only the gateway holds JWT_SECRET_KEY.
```

**Token lifetimes:**
- Access token: 24 hours
- Refresh token: 30 days

---

## 7. How does password hashing work in the Identity Service?

> **Why asked:** Password storage is a security fundamental. MD5 and SHA-256 are wrong answers — they're fast, which is bad for passwords. Argon2 is the modern correct answer. Interviewers want to hear "memory-hard" — it means even with a GPU farm, brute-forcing an Argon2 hash is impractical because each attempt needs gigabytes of RAM.

**Library:** `argon2-cffi 23.x` (Argon2id algorithm)

**Why Argon2 over bcrypt/MD5:**
- **Memory-hard:** Requires large RAM per attempt — GPU/ASIC brute-force attacks become impractical
- **Time-tunable:** Difficulty can be increased as hardware improves
- **PHC winner:** Won the Password Hashing Competition 2015 — the academic consensus choice

```python
from argon2 import PasswordHasher
ph = PasswordHasher()

# Registration — hash and store:
hashed = ph.hash("user_password")
# Stored: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

# Sign-in — verify:
try:
    ph.verify(stored_hash, provided_password)  # True or raises
except VerifyMismatchError:
    raise HTTPException(401, "Invalid credentials")
```

---

## 8. How does the Cloudflare tunnel work? Why not expose the server directly?

> **Why asked:** This is an infrastructure question that comes up when the interviewer sees you're running a production app on a home/office machine rather than a cloud VM. It's a common real-world pattern for small-scale deployments and prototypes. The key architecture insight to mention: the Vercel rewrite is the only place that needs updating when the tunnel URL changes — the app itself never sees the tunnel URL.

**The problem:** The backend runs on a Windows machine with a home internet connection — dynamic IP, no port forwarding, no static IP.

**Cloudflare Quick Tunnel solution:**
```
cloudflared tunnel --url http://localhost:8000
→ URL assigned: https://clinton-sen-ireland-descriptions.trycloudflare.com
→ Cloudflare keeps a persistent outbound connection using QUIC protocol
→ Incoming traffic flows back through this connection to localhost:8000
→ No firewall rules, no static IP, no port forwarding needed
```

**Key design:** Only `vercel.json` contains the tunnel URL:
```json
{
  "rewrites": [{
    "source": "/api/:path*",
    "destination": "https://<tunnel>.trycloudflare.com/api/:path*"
  }]
}
```
When tunnel URL changes, update `vercel.json` + redeploy Vercel. React Native app always calls its own Vercel domain — it never hardcodes the tunnel URL.

---

## 9. What are action cards and how are they generated?

> **Why asked:** This reveals whether your AI chat is "just a chatbot" or a properly integrated product. Action cards that deep-link to app screens make the AI feel like a native part of the app, not a bolt-on. The interesting detail here is that we use keyword matching on the *user's message* (not the AI's response) — this makes the behaviour deterministic and testable, unlike AI-generated navigation suggestions.

Action cards are tappable UI chips below AI responses that deep-link to specific app screens.

They are generated by **keyword scanning the user's message in code** — not by the AI:

```python
lowered = user_message.lower()

if any(kw in lowered for kw in ["book", "shantidhara", "slot", "calendar"]):
    return ActionCard(action_target="book", title="Book Shantidhara", action_label="Book Now")

elif any(kw in lowered for kw in ["donate", "donation", "payment"]):
    return ActionCard(action_target="donate", title="Make a Donation")

elif any(kw in lowered for kw in ["news", "update", "notice", "wall of fame"]):
    return ActionCard(action_target="home", title="View Temple Updates")

elif role == "admin" and any(kw in lowered for kw in ["publish", "notification"]):
    return ActionCard(action_target="admin", title="Open Admin Dashboard")

else:
    return ActionCard(action_target="chat")  # stay on chat screen
```

**Why keyword-based, not AI-generated?** Deterministic — same message always produces same action card. AI-generated navigation would be nondeterministic and could suggest the wrong screen.

---

## 10. How does the push notification system work end to end?

> **Why asked:** Push notifications span multiple systems (client SDK, token storage, sending service, platform delivery). Interviewers use this to test whether you understand the full pipeline — many developers only know one part of it. The important distinction: Expo Push Token is an intermediary that abstracts FCM (Android) and APNS (iOS) into one unified API, so you don't need to maintain separate integrations for each platform.

```
STEP 1 — USER SIGNS IN:
  Expo.Notifications.requestPermissionsAsync()
  Expo.Notifications.getExpoPushTokenAsync({ projectId: "5b6ce96b-..." })
  → "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

  POST /api/v1/auth/push-tokens/register
  Body: { user_id, expo_push_token, platform: "android", device_label }
  → Stored in Identity Service: user_push_tokens table

STEP 2 — ADMIN POSTS ANNOUNCEMENT:
  Admin Service fetches all push tokens for temple members
  GET http://temple-identity:8001/internal/push-tokens/by-users

  POST https://exp.host/--/api/v2/push/send
  Body: {
    "to": ["ExponentPushToken[xxx]", "ExponentPushToken[yyy]"],
    "title": "Paryushana Dates Announced",
    "body":  "Begins August 20",
    "data":  { "category": "announcement", "temple_id": "tmpl_001" }
  }
  → Expo Push → FCM (Android) / APNS (iOS) → Device

STEP 3 — INBOX:
  Notification also stored in Registration service notifications table
  GET /api/v1/signup-requests/notifications/me → loads inbox in app
```

**Retry config (Admin Service):** 4 attempts, 30s → 60s exponential backoff, 30s timeout per request.
