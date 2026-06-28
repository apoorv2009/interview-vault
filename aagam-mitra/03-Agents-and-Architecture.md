# Agents & System Architecture — Interview Q&A

---

## 1. What is an AI agent? How is it different from a regular LLM call?

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

**Key difference:** An agent can take **actions** — call APIs, query databases, perform computations — and incorporate results into its response. A plain LLM only generates text from its weights.

---

## 2. Describe the 4 specialist agents in Aagam Mitra.

### ScriptureAgent
- **Purpose:** Jain philosophy, scripture, dharma questions
- **Tools:** 1 — `search_jain_texts(query)` → Pinecone semantic search
- **Max iterations:** 4
- **Temperature:** 0.5
- **Response format:** 4-part structure — Context → Sacred Text → Meaning → Practical Wisdom
- **Quality rule:** Minimum 120 words enforced

### TempleOpsAgent
- **Purpose:** Bookings, memberships, donations, temple info
- **Tools:** 7 (see full list in question 3)
- **Max iterations:** 5 (most complex — may check slots → verify → book)
- **Temperature:** 0.5

### CommunityAgent
- **Purpose:** News, events, wall of fame, feedback
- **Tools:** 4 — `get_news`, `get_events`, `get_wall_of_fame`, `submit_feedback`
- **Max iterations:** 4
- **Temperature:** 0.5

### YouTubeAgent
- **Purpose:** Extract and format YouTube pravachan/shanka samadhan transcripts
- **Tools:** 0 — completely overrides `BaseAgent.run()`
- **Max iterations:** 1
- **Temperature:** 0.2 (formatting, not generation)
- **Special:** Dual-layer transcript extraction (captions → Whisper ASR fallback)

---

## 3. List all 12 tools and what HTTP calls they make.

| Tool | Agent | HTTP Call | Returns |
|---|---|---|---|
| `search_jain_texts` | Scripture | Gemini embed → Pinecone query | 8 passages + scores |
| `get_shantidhara_slots` | TempleOps | GET admin:8003/shantidhara/slots | Available slot list |
| `book_shantidhara_slot` | TempleOps | POST registration:8002/bookings | booking_id, amount |
| `get_my_bookings` | TempleOps | GET registration:8002/bookings/me | Booking history |
| `cancel_booking` | TempleOps | POST registration:8002/.../cancel | success/error |
| `get_membership_status` | TempleOps | GET registration:8002/memberships/me | status, temple |
| `submit_membership_request` | TempleOps | POST registration:8002/memberships | subscription_id |
| `get_temple_info` | TempleOps | GET admin:8003/temples/{id} (2 parallel) | name, location, payment |
| `get_temple_news` | Community | GET admin:8003/news-feed | Top 5 news items |
| `get_events` | Community | GET admin:8003/events | Top 5 events |
| `get_wall_of_fame` | Community | GET admin:8003/wall-of-fame | Top 5 entries |
| `submit_feedback` | Community | POST admin:8003/feedback | Confirmation |

---

## 4. What is the full system architecture? How do services communicate?

```
React Native App (Expo 55)
  ↓ HTTPS
Vercel CDN (hosts web app, rewrites /api/* to tunnel)
  ↓ HTTPS
Cloudflare Quick Tunnel (exposes localhost:8000 to internet)
  ↓ HTTP (localhost)
API Gateway :8000 (FastAPI)
  - Verifies JWT on every protected route
  - Injects X-User-Id, X-User-Role, X-Temple-Id headers
  - Proxies to 4 backend services via Docker internal DNS
  ↓ HTTP (Docker internal network)
  ├── Identity Service :8001     — Users, JWT, Argon2, push tokens
  ├── Registration Service :8002 — Bookings, donations, memberships, Razorpay
  ├── Admin Service :8003        — Slots, news, events, finance, wall of fame
  └── Aagam Mitra AI :8004       — AI chat, RAG, agents, YouTube
           ↓ HTTPS (external)
           ├── Groq API          — LLaMA 4 Scout 17B inference
           ├── Pinecone          — Vector search (jain-texts index)
           └── Gemini API        — Text embeddings (2048-dim)

Shared: Redis :6379 (rate limiting, AOF persistence)
```

**Inter-service DNS:** Docker Compose internal network. Services reference each other as `http://temple-admin:8003`, `http://temple-registration:8002` — resolved by Docker's internal DNS.

---

## 5. Why a custom agent loop instead of LangChain/LangGraph?

We deliberately chose **NOT** to use LangChain or LangGraph.

**Our custom agent loop is ~40 lines.** At that size, a framework adds more complexity than it removes:

| Capability | LangChain | Our code |
|---|---|---|
| LLM call | `ChatGroq(model=...)` | `httpx.post(GROQ_URL, ...)` |
| Tool definition | `@tool` decorator | Plain dict with JSON schema |
| Agent loop | `AgentExecutor.invoke()` | `for i in range(max_iterations)` |
| Parallel tools | Hidden in framework | `asyncio.gather(...)` — explicit |
| Debugging | Must understand abstractions | Read the 40 lines directly |

**When LangGraph WOULD be worth it:**
- Complex conditional branching (if confidence < 0.7, try different tool)
- Human-in-the-loop (pause for admin approval mid-booking)
- Streaming intermediate steps to the UI
- State persistence across disconnected sessions

None of these are current requirements. If we add them, we'd migrate to LangGraph at that point.

---

## 6. How does the API Gateway handle JWT verification?

```
Request arrives: POST /api/v1/temples/{id}/assistant/chat
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Gateway middleware:
  1. Extract token from Authorization header
  2. Verify signature with JWT_SECRET_KEY using HS256 algorithm
  3. Decode payload: { sub: "usr_abc123", role: "devotee", temple_id: "tmpl_001", exp: 1750086400 }
  4. Check exp (expiry) — 401 if expired
  5. Inject headers for downstream:
     X-User-Id: usr_abc123
     X-User-Role: devotee
     X-Temple-Id: tmpl_001
  6. Proxy request to aagam-mitra:8004

Backend services TRUST these headers — they don't re-verify the JWT.
Only the gateway holds the JWT secret.
```

**Token lifetimes:**
- Access token: 24 hours
- Refresh token: 30 days

---

## 7. How does password hashing work in the Identity Service?

**Library:** `argon2-cffi` (Argon2id algorithm)

**Why Argon2 over bcrypt/MD5?**
- **Memory-hard:** Requires large RAM — makes GPU/ASIC attacks impractical
- **Tunable:** Can increase difficulty as hardware improves
- **PHC winner:** Won the Password Hashing Competition 2015

```python
from argon2 import PasswordHasher
ph = PasswordHasher()

# Registration:
hashed = ph.hash("user_password")
# Stores: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

# Sign-in:
try:
    ph.verify(stored_hash, provided_password)  # True or raises
except VerifyMismatchError:
    raise HTTPException(401, "Invalid credentials")
```

---

## 8. How does the Cloudflare tunnel work? Why not expose the server directly?

**The problem:** The backend runs on a Windows machine with a home internet connection — dynamic IP, no port forwarding, no static IP.

**Solution: Cloudflare Quick Tunnel**
```
cloudflared tunnel --url http://localhost:8000
→ Assigns URL: https://clinton-sen-ireland-descriptions.trycloudflare.com
→ Cloudflare maintains a persistent outbound connection (QUIC protocol)
→ Incoming requests from the internet flow back through this connection
→ No firewall rules, no static IP, no port forwarding needed
```

**Architecture trick:** The app never hardcodes the tunnel URL. Only `vercel.json` has it:
```json
{
  "rewrites": [{
    "source": "/api/:path*",
    "destination": "https://<tunnel>.trycloudflare.com/api/:path*"
  }]
}
```
When the tunnel URL changes (after restart), only `vercel.json` needs updating + Vercel redeploy. The React Native app always calls its own Vercel domain — never the tunnel URL directly.

---

## 9. What action cards are and how they are generated?

Action cards are tappable UI chips shown below AI responses that deep-link to app screens.

They are NOT generated by the AI — they're determined by **keyword scanning the user's message** in code:

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

**Why keyword-based, not AI-based?** Deterministic — the same message always produces the same action card. AI-based would be nondeterministic and could suggest wrong navigation.

---

## 10. How does the push notification system work end to end?

```
1. USER SIGNS IN:
   Expo.Notifications.requestPermissionsAsync()
   Expo.Notifications.getExpoPushTokenAsync({ projectId: "5b6ce96b-..." })
   → "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

   POST /api/v1/auth/push-tokens/register
   Body: { user_id, expo_push_token, platform: "android", device_label }
   → Stored in Identity Service: user_push_tokens table

2. ADMIN POSTS ANNOUNCEMENT:
   Admin Service fetches all push tokens for temple members
   GET http://temple-identity:8001/internal/push-tokens/by-users

   POST https://exp.host/--/api/v2/push/send
   Body: {
     "to": ["ExponentPushToken[xxx]", ...],
     "title": "Paryushana Dates Announced",
     "body": "Begins August 20",
     "data": { "category": "announcement", "temple_id": "tmpl_001" }
   }
   → Expo Push → FCM (Android) / APNS (iOS) → Device

3. NOTIFICATION INBOX:
   Also stored in Registration service notifications table
   GET /api/v1/signup-requests/notifications/me → loads inbox in app
```

**Retry config (Admin Service):** 4 attempts, 30s → 60s exponential backoff, 30s timeout per request.
