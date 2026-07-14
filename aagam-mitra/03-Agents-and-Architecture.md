# Agents & System Architecture — Interview Q&A

---

## 1. What is an AI agent? How is it different from a regular LLM call?

> **Why asked:** "Agent" is one of the most overused buzzwords in AI right now. Interviewers ask this to filter out people who just use the word vs people who can explain what it actually means in code. The clearest way to answer is side-by-side: regular LLM answers from training data, an agent calls live APIs and incorporates the results. Always give a concrete example from the project.

---

### **The Core Distinction: Knowledge vs Actions**

```
LLM CALL (Static Knowledge Only):
├─ User: "How do I book Shantidhara?"
├─ LLM thinks: "I was trained on general Jain temple info"
├─ LLM says: "Typically, you book through the temple administration"
├─ Problem: GENERIC (not specific to this temple)
├─ Problem: STALE (training data from 2023, things changed)
└─ Result: ❌ Not helpful (user can't actually book)

AGENT (Knowledge + Actions):
├─ User: "Show me available Shantidhara slots for January 15"
├─ Agent thinks: "I need LIVE data from this temple's database"
├─ Agent calls tool: get_shantidhara_slots(temple=kailash, date=2026-01-15)
├─ Tool returns: [9AM available, 2PM booked, 5PM available]
├─ Agent responds: "Available slots: 9AM, 5PM. Book now?"
└─ Result: ✅ Specific, current, actionable (user CAN book)
```

---

### **What "Agent" Actually Means**

```
DEFINITION:
An agent is an LLM that can:
1. Read the user's request
2. DECIDE whether to call a tool
3. CALL the tool (get real data)
4. INCORPORATE the results into its response
5. LOOP if it needs more info (check slots, then book)

NOT an agent:
├─ Just a chatbot (LLM answers from training data only)
├─ LLM + API (always calls API, no LLM decision-making)
└─ Scheduled job (runs on a timer, not responding to user)

Real agent:
├─ Groq LLM decides: "Do I need tools here?"
├─ Sometimes says YES: "I'll call get_slots"
├─ Sometimes says NO: "I know this from training data"
└─ Result: Smart, flexible, efficient
```

---

### **Real Example: Booking Flow**

```
USER SAYS: "Book me the 9AM slot tomorrow"

AGENT LOOP:

Iteration 1:
├─ Groq reads: "Book me the 9AM slot tomorrow"
├─ Groq decides: "I need to check slots first"
├─ Groq calls: get_shantidhara_slots(date=tomorrow)
└─ Tool returns: {9AM: available, 10AM: booked, 2PM: available}

Iteration 2:
├─ Groq reads: "Slots: 9AM available, 10AM booked, 2PM available"
├─ Groq decides: "Now I can book the 9AM slot"
├─ Groq calls: book_shantidhara_slot(slot_id=9AM, date=tomorrow)
└─ Tool returns: {booking_id: "bk_123", amount: ₹1100, status: confirmed}

Iteration 3:
├─ Groq reads: "Booking confirmed!"
├─ Groq decides: "I have the final answer, no more tools needed"
├─ Groq says: "✅ Booked! 9AM tomorrow, ₹1100"
└─ STOP (user has their answer)

RESULT: Agent made 3 decisions, called 2 tools, produced actionable result
```

---

### **Interview Summary**

"An agent is an LLM that can call APIs and decide WHEN to call them. Unlike a chatbot (training data only) or a script (always call API), an agent has agency — it reads the request, thinks 'do I need live data?', calls the right tool if yes, and synthesizes the results. In Aagam Mitra: asking about philosophy returns LLM knowledge (fast), asking to book runs a tool-call loop (get slots, then book). The key insight: agent = LLM + decision-making + tool calling."

---

## 2. Describe the 4 specialist agents in Aagam Mitra.

> **Why asked:** Having multiple agents with clear responsibilities is good system design — it's the "single responsibility principle" applied to AI. The interviewer wants to see you can explain what each agent does, why they're separate, and what the design tradeoffs are. The YouTubeAgent is interesting because it completely overrides `BaseAgent.run()` — be ready to explain why.

---

### **Why Multiple Agents? (The Principle)**

```
NAIVE APPROACH: One mega-agent with 12 tools
├─ ScriptureAgent + TempleOpsAgent + CommunityAgent = merged
├─ One agent, 12 tools
├─ Problem: Groq has to choose from 12 tools per request
├─ Result: Confusion, wrong tool calls, lower accuracy ❌

SMART APPROACH: Four specialists, each with 1-7 tools
├─ Each agent focuses on one domain
├─ ScriptureAgent has 1 tool (simple, focused)
├─ TempleOpsAgent has 7 tools (but all related to bookings/ops)
├─ Groq has to choose from fewer options
├─ Result: Clear intent, right tool, higher accuracy ✅

ANALOGY:
├─ Mega-agent = asking a doctor who is ALSO a car mechanic ALSO a lawyer
│  (they'll get confused about which role to play)
├─ Specialists = routing to the right expert
│  (doctor for medical, mechanic for cars, lawyer for law)
└─ Same principle: clearer domain = better decisions
```

---

### **The Four Agents: Purpose & Design**

```
AGENT 1: SCRIPTURE AGENT (Philosophy & Dharma)

Purpose:
├─ Jain scripture questions
├─ Spiritual guidance
├─ Philosophical inquiry
└─ "What does karma mean?" → Scripture Agent

Design:
├─ Tools: 1 (search_jain_texts → Pinecone)
├─ Temperature: 0.5 (balanced, some synthesis)
├─ Max iterations: 4 (search, synthesize, refine)
├─ Response format: 4-part (Context → Text → Meaning → Wisdom)
├─ Min length: 120 words (depth requirement)
└─ Why 1 tool? Scripture knowledge is static → simple flow

───────────────────────────────────────────

AGENT 2: TEMPLE OPS AGENT (Bookings & Membership)

Purpose:
├─ Booking Shantidhara slots
├─ Managing memberships
├─ Donations
├─ Temple info
└─ "Book me a slot" → TempleOps Agent

Design:
├─ Tools: 7
│  ├─ get_shantidhara_slots
│  ├─ book_shantidhara_slot
│  ├─ get_my_bookings
│  ├─ cancel_booking
│  ├─ get_membership_status
│  ├─ submit_membership_request
│  └─ get_temple_info
├─ Temperature: 0.5
├─ Max iterations: 5 (most complex — check slots, book, confirm)
└─ Why 5 iters? Booking is multi-step (check → book → confirm)

───────────────────────────────────────────

AGENT 3: COMMUNITY AGENT (News & Events)

Purpose:
├─ Temple news/announcements
├─ Upcoming events
├─ Wall of fame (donor highlights)
├─ User feedback
└─ "What's new at the temple?" → Community Agent

Design:
├─ Tools: 4
│  ├─ get_news
│  ├─ get_events
│  ├─ get_wall_of_fame
│  └─ submit_feedback
├─ Temperature: 0.5
├─ Max iterations: 4
└─ Why 4 tools? Different data sources, same domain

───────────────────────────────────────────

AGENT 4: YOUTUBE AGENT (Transcript Extraction)

Purpose:
├─ Extract YouTube pravachan (discourse) transcripts
├─ Format and clean transcripts
├─ Audio fallback (Whisper ASR)
└─ (Special: no conversational loop)

Design:
├─ Tools: 0 (no tool loop!)
├─ Temperature: 0.2 (faithful to source, no creativity)
├─ Max iterations: 1 (deterministic, not conversational)
├─ Special: Overrides BaseAgent.run() completely
├─ Process: YouTube captions → parse → fallback to Whisper
└─ Why different? Extraction ≠ reasoning (not a chat agent)
```

---

### **Key Design Choice: YouTubeAgent Bypass**

```
WHY YouTubeAgent doesn't use the standard agent loop:

Standard agent loop:
├─ Read user message
├─ Decide whether to call tools
├─ Call tools
├─ Synthesize response
└─ (Conversational, multiple iterations possible)

YouTube extraction:
├─ User provides: YouTube link
├─ Process: Extract captions or ASR
├─ Return: Formatted transcript
└─ (Deterministic, no LLM decision-making needed)

INSIGHT: Not every task fits the agent loop!
├─ Philosophy question = needs agent loop
├─ Extract transcript = just a data pipeline
├─ YouTubeAgent.run() does: download → ASR → format → return
└─ No Groq calls, no tool loop, just code
```

---

### **Interview Summary**

"Aagam Mitra has four specialist agents following the single-responsibility principle. ScriptureAgent (1 tool) handles philosophy — simple searches. TempleOpsAgent (7 tools) handles bookings — most complex, needs 5 iterations (check slots, book, confirm). CommunityAgent (4 tools) handles news/events. YouTubeAgent is special — it bypasses the agent loop entirely because transcript extraction is deterministic, not conversational. Multiple agents means fewer tools per agent, which means Groq makes better tool-call decisions. The design principle: each agent owns one domain, not all tasks need the LLM loop."

---

## 3. List all 12 tools and what HTTP calls they make.

> **Why asked:** Listing all tools shows you know your system in detail. This question often comes up as "walk me through what happens when a user asks to book a slot" — and you need to know which tool fires, what URL it calls, and what it returns. Interviewers at product companies especially like when you can trace a user action all the way to an HTTP call.

---

### **Why This Matters: System Knowledge**

```
GOOD ANSWER: "We have 12 tools across 4 agents"
GREAT ANSWER: "ScriptureAgent has search_jain_texts which calls Gemini + Pinecone.
             TempleOpsAgent has 7 tools: get_slots calls admin:8003, book_slot
             calls registration:8002/bookings, etc."
EXCELLENT: "When user says 'book me a slot', TempleOpsAgent runs:
           1. get_shantidhara_slots → admin:8003/slots
           2. book_shantidhara_slot → registration:8002/bookings
           3. Returns confirmation with booking_id"

The progression: memorize → understand → explain flow
Interviewers want level 3 (flow understanding).
```

---

### **All 12 Tools: By Agent and Capability**

**SCRIPTURE AGENT (1 tool — Knowledge):**

| Tool | Calls | Purpose | Returns |
|---|---|---|---|
| `search_jain_texts` | Gemini embed query → Pinecone | Semantic search of Jain texts | 8 passages + cosine scores |

**TEMPLE OPS AGENT (7 tools — Actions):**

| Tool | Calls | Purpose | Returns |
|---|---|---|---|
| `get_shantidhara_slots` | GET admin:8003/shantidhara/slots | Check slot availability | List of slots: time, price, status |
| `book_shantidhara_slot` | POST registration:8002/bookings | Make a booking | booking_id, amount, confirmation |
| `get_my_bookings` | GET registration:8002/bookings/me | View past/current bookings | List with dates, prices, status |
| `cancel_booking` | POST registration:8002/.../cancel | Cancel a booking | success/error, refund status |
| `get_membership_status` | GET registration:8002/memberships/me | Check membership tier | status, temple, renewal date |
| `submit_membership_request` | POST registration:8002/memberships | Start membership signup | subscription_id, payment_url |
| `get_temple_info` | GET admin:8003/temples/{id} (2 parallel) | Get temple details + payment methods | name, location, payment_methods |

**COMMUNITY AGENT (4 tools — Content):**

| Tool | Calls | Purpose | Returns |
|---|---|---|---|
| `get_temple_news` | GET admin:8003/news-feed | Latest temple announcements | Top 5 news items with dates |
| `get_events` | GET admin:8003/events | Upcoming events | Top 5 events with dates/times |
| `get_wall_of_fame` | GET admin:8003/wall-of-fame | Donor highlights | Top 5 entries: name, amount, date |
| `submit_feedback` | POST admin:8003/feedback | User feedback submission | confirmation, ticket_id |

---

### **Real Scenario: Tracing a Booking Request**

```
USER SAYS: "I want to book a Shantidhara slot for January 15"

SYSTEM FLOW:

Step 1: Orchestrator routes to TempleOpsAgent
Step 2: Agent Loop Iteration 1
├─ Agent calls: get_shantidhara_slots(date="2026-01-15")
├─ HTTP GET → admin:8003/shantidhara/slots?date=2026-01-15
├─ Returns: {
│    "slots": [
│      {"id": "slot_1", "time": "9:00 AM", "price": 1100, "status": "available"},
│      {"id": "slot_2", "time": "2:00 PM", "price": 1100, "status": "booked"},
│      {"id": "slot_3", "time": "5:00 PM", "price": 1100, "status": "available"}
│    ]
│  }
└─ Agent reads: "9AM and 5PM are available"

Step 3: Agent Loop Iteration 2
├─ User wants 9AM
├─ Agent calls: book_shantidhara_slot(slot_id="slot_1", date="2026-01-15")
├─ HTTP POST → registration:8002/bookings
├─ Body: {slot_id: "slot_1", user_id: "usr_123", temple_id: "kailash_main"}
├─ Returns: {
│    "booking_id": "bk_abc123",
│    "amount": 1100,
│    "status": "confirmed",
│    "timestamp": "2026-01-14T..."
│  }
└─ Agent reads: "Booking confirmed!"

Step 4: Agent says "✅ Booked! 9AM on January 15, ₹1100"

TRACE: User message → TempleOpsAgent → 2 HTTP calls → 2 services → Booked
```

---

### **Interview Summary**

"The 12 tools are distributed by domain: 1 in ScriptureAgent (search_jain_texts to Pinecone), 7 in TempleOpsAgent (slots, bookings, memberships), 4 in CommunityAgent (news, events, wall-of-fame, feedback). When a user books a slot, the flow is: get_shantidhara_slots (GET admin:8003) → book_shantidhara_slot (POST registration:8002). Each tool maps to a specific HTTP endpoint on a backend service. Knowing this maps AI to infrastructure."

---

## 4. What is the full system architecture? How do services communicate?

> **Why asked:** System design is a core interview topic. This question tests whether you understand the full picture — not just your one service, but how everything connects. Key points to mention: Cloudflare tunnel (why it's needed), Vercel rewrite (how the frontend decouples from tunnel URL changes), Docker internal DNS (how services find each other), and the API gateway (single point of JWT verification).

---

### **Architecture Philosophy: Monolith → Microservices**

```
WHY MICROSERVICES?

Monolith (bad for scaling):
├─ One codebase, one database
├─ Every feature touches every team's code
├─ One failure brings down everything
└─ Hard to scale: Scale the whole app, not one feature

Microservices (good for separation):
├─ 4 independent services, 4 databases
├─ Each team owns one service (Identity, Registration, Admin, Aagam Mitra)
├─ One service fails, others keep running
├─ Scale only what needs scaling
└─ Clear boundaries: JWT handling (Identity) vs bookings (Registration)

AAGAM MITRA CHOICE: Microservices behind an API Gateway
```

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

---

### **The Simplicity vs Abstraction Tradeoff**

```
OUR AGENT LOOP: ~40 lines of plain Python

for i in range(max_iterations):
    response = await call_groq(messages, tools)
    if response.finish_reason == "stop":
        return response
    execute_tools(response.tool_calls)
    append_to_messages()

LANGCHAIN/LANGGRAPH: Heavy abstraction layer

from langchain.agents import AgentExecutor
from langchain.agents import create_openai_tools_agent
agent = create_openai_tools_agent(llm, tools, prompt)
executor = AgentExecutor.invoke(...)

KEY QUESTION: Which is simpler?
├─ 40 lines of plain code: I can read it, modify it, debug it
├─ LangChain abstraction: Powerful but adds complexity
└─ For our simple loop: Custom wins
```

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

---

### **Security Pattern: Verify Once, Trust Downstream**

```
NAIVE APPROACH: Every service re-verifies JWT
├─ Service 1 (Identity): Verify token
├─ Service 2 (Registration): Verify token  
├─ Service 3 (Admin): Verify token
├─ Problem: Everyone needs JWT_SECRET_KEY
├─ Problem: More places to attack = bigger blast radius
└─ Result: ❌ Insecure (leaked secret = compromised everywhere)

SECURE APPROACH: Gateway verifies once
├─ Gateway (only entry point): Verify token
├─ Gateway: Extract user_id, role, temple_id
├─ Gateway: Inject into headers (X-User-Id, X-User-Role, X-Temple-Id)
├─ Backend services: TRUST the injected headers (no re-verification)
├─ Benefit: JWT secret only in gateway, not scattered across services
├─ Benefit: If a backend is compromised, attacker can't forge tokens
└─ Result: ✅ Secure (reduced attack surface)
```

**The Flow:**

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

---

### **Why Fast Hashing is Bad for Passwords**

```
WRONG APPROACH: Fast hash (MD5, SHA-256)
├─ Hash speed: 1 microsecond per attempt
├─ Attacker with GPU: Try 1 billion passwords/second
├─ Crack simple password: ~1 second ❌
└─ Result: Insecure

RIGHT APPROACH: Slow hash (Argon2)
├─ Argon2 parameters: 65MB RAM per attempt
├─ Attacker needs: 65MB × 1B attempts = Exabytes of RAM = impossible
├─ Crack simple password: ~1 week (even with GPU farm)
└─ Result: Secure ✅

KEY INSIGHT: For passwords, SLOW is GOOD
```

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

---

### **The Infrastructure Constraint**

```
CONSTRAINT: Backend runs on personal Windows machine (not AWS/GCP)
├─ Dynamic IP (changes when router restarts)
├─ No static IP option available
├─ No port forwarding possible (ISP blocks)
├─ No way to expose localhost:8000 directly
└─ Problem: React app on Vercel can't reach home server ❌

SOLUTION: Cloudflare tunnel (reverse proxy as a service)
├─ cloudflared daemon: Maintains persistent outbound connection to Cloudflare
├─ User gets: https://random-random-random.trycloudflare.com → localhost:8000
├─ No incoming firewall rules needed
├─ No static IP needed
└─ Result: React app on Vercel CAN reach home server ✅
```

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

---

### **Why Deterministic > AI-Generated**

```
BAD: AI generates action suggestions
├─ Same user question might suggest different screens each time
├─ Unpredictable behavior = confusing UX
└─ Hard to test (LLM is non-deterministic)

GOOD: Keyword matching on user message
├─ Same keywords = same action card always
├─ Predictable behavior = consistent UX
├─ Easy to test (just check keywords)
└─ Aagam Mitra uses this approach
```

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

---

### **Why Expo Over Direct FCM/APNS**

```
WITHOUT EXPO (Direct FCM + APNS):
├─ Handle Android: Integrate Firebase Cloud Messaging
├─ Handle iOS: Integrate Apple Push Notification service
├─ Different API for each platform
├─ Maintain two separate workflows
└─ Complex (need to know both platforms)

WITH EXPO:
├─ Expo Push Token: Unified identifier for both platforms
├─ One API: Send to Expo token, it handles FCM/APNS routing
├─ One workflow: Same code works for Android & iOS
└─ Simple (Expo abstracts platform details)
```

**The Full Pipeline:**

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
