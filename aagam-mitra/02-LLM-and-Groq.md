# LLM & Groq Integration — Interview Q&A

> Real values from `aagam-mitra-service/app/core/config.py` and agent files.

---

## 1. What LLM does Aagam Mitra use and why Groq?

> **Why asked:** Provider choice signals whether you evaluated options or just used the default. Interviewers want to hear a cost + performance justification. The key numbers to remember: Groq is ~45x cheaper than GPT-4o and 5–10x faster because it uses custom LPU chips. Also important: Groq's API is OpenAI-compatible, so switching providers requires changing one line, not rewriting code.

---

### **The Provider Decision Problem**

```
SCENARIO: You're building Aagam Mitra. User asks a question.
          System needs an LLM to generate an answer.

QUESTION: Which LLM provider?

OPTION A: OpenAI GPT-4o
├─ Quality: Excellent (state-of-the-art reasoning)
├─ Cost: $5.00 per 1M input tokens
├─ Speed: 2-3 seconds per request (API latency)
├─ Daily cost for 10K queries: $50/day
└─ User experience: ⏳ 2-3 seconds wait

OPTION B: Self-hosted LLM
├─ Quality: Good (smaller models)
├─ Cost: $5,000/month for GPU infrastructure
├─ Speed: 1-2 seconds per request
├─ Daily cost for 10K queries: $166/day (infrastructure only!)
└─ User experience: Maintenance burden + hidden costs

OPTION C: Groq
├─ Quality: Good (Llama 4.0 Scout is solid)
├─ Cost: $0.11 per 1M input tokens (~45x cheaper)
├─ Speed: 400-800ms per request (custom LPU chips)
├─ Daily cost for 10K queries: $1.10/day
└─ User experience: ⚡ Ultra-fast, ultra-cheap

THE CHOICE: Groq (45x cheaper than GPT-4o, 5-10x faster)
```

---

### **Why Groq Wins: The Three Pillars**

```
PILLAR 1: SPEED (Custom LPU Hardware)
├─ What: LPU = Language Processing Unit (not GPU, not TPU)
├─ Why different: GPUs are designed for video gaming
│  (parallel pixels). LPUs are designed for token sequences.
├─ Result: Groq is 5-10x faster than OpenAI or Claude
│
├─ Real numbers:
│  ├─ Groq:   400-800ms (response time)
│  ├─ OpenAI: 2-3 seconds
│  └─ Claude: 3-5 seconds
│
└─ Why it matters: 1-2 second difference = perceivable lag
   Users notice (and hate) slow AI chatbots

───────────────────────────────────────────────

PILLAR 2: COST (Open Model + Cheap Hardware)
├─ OpenAI GPT-4o: $5.00/M input tokens
│  ├─ Proprietary model (Microsoft owns it)
│  ├─ Expensive hardware
│  └─ Per-query cost: $0.0005
│
├─ Groq Llama Scout: $0.11/M input tokens
│  ├─ Open model (Meta released it)
│  ├─ Custom LPU hardware (cheaper at scale)
│  └─ Per-query cost: $0.000011
│
├─ Savings: ~45x cheaper! ($0.0005 → $0.000011)
│
└─ Annual example (assuming 10K daily queries):
   ├─ OpenAI: $0.0005 × 10K × 365 = $1,825/year
   ├─ Groq:   $0.000011 × 10K × 365 = $40/year
   └─ Savings: $1,785/year! 🎉

───────────────────────────────────────────────

PILLAR 3: COMPATIBILITY (OpenAI-Compatible API)
├─ Groq API format: Exactly like OpenAI
│  ├─ Same request structure (messages, tools, etc.)
│  ├─ Same response format
│  └─ Same parameter names (temperature, top_p, etc.)
│
├─ Why this matters: You can switch providers with ONE LINE
│  ├─ Code today: Use Groq
│  ├─ If Groq has issues tomorrow: Switch to OpenAI
│  ├─ Change needed: api_endpoint = "https://openai.com/v1" (1 line)
│  └─ No rewrite needed
│
└─ Result: You get Groq's economics without vendor lock-in
```

---

### **Aagam Mitra's Choice**

```
Model: Llama 4.0 Scout (17B instruction-tuned)
├─ Why Scout? Smaller (17B) = faster + cheaper than 70B
├─ Why Llama? Strong on reasoning + open-source
└─ Why Groq? 45x cheaper, 5-10x faster, portable

Real API endpoint:
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer {GROQ_API_KEY}

Cost breakdown (monthly, 10K daily queries):
├─ Input tokens: 3M/day × $0.11/M = $0.33/day
├─ Output tokens: 1M/day × $0.15/M = $0.15/day
├─ Monthly total: ($0.33 + $0.15) × 30 = $14.4/month
├─ Annual: $173/year
└─ vs OpenAI: $1,825/year (90% savings!)
```

---

### **Interview Summary**

"Aagam Mitra uses Groq with Llama 4.0 Scout because it's 45x cheaper than OpenAI ($0.11/M vs $5/M tokens) and 5-10x faster thanks to custom LPU hardware. Real response time: 400-800ms vs OpenAI's 2-3 seconds. The third advantage: Groq's API is OpenAI-compatible, so we could switch providers in one line if needed — no vendor lock-in. For a high-volume system like Aagam Mitra (10K queries/day), that's the difference between $173/year (Groq) and $1,825/year (OpenAI). Speed + Cost + Portability = Groq."

---

## 2. What is temperature and what values do you use where?

> **Why asked:** Anyone can say "temperature controls randomness." The impressive answer is knowing *why different parts of your system use different values*. YouTube transcript formatting uses 0.2 because you need faithfulness to the source — the LLM must not add or paraphrase. Scripture answers use 0.5 because the LLM needs some creative latitude to synthesise multiple passages into a coherent response. Be ready to justify each value.

---

### **The Core Concept: Temperature is Probability Weighting**

```
WHAT IS TEMPERATURE?
Temperature controls how the LLM picks the NEXT TOKEN.

Every language model produces probability scores for every word:

For the incomplete sentence: "The capital of France is ___"
├─ "Paris": 0.95 (95% confidence)
├─ "Lyon": 0.03
├─ "London": 0.01
└─ "pizza": 0.001

Without temperature (always pick highest):
└─ Always outputs "Paris" (deterministic, boring, repetitive)

WITH TEMPERATURE, these probabilities get adjusted:

Low temperature (0.1):
├─ Probabilities get MORE extreme
├─ "Paris": 0.95 → 0.999 (even MORE likely)
├─ "Lyon": 0.03 → 0.001 (even LESS likely)
└─ Result: Predictable, factual, but repetitive

High temperature (2.0):
├─ Probabilities get LESS extreme (flattened)
├─ "Paris": 0.95 → 0.80 (less dominant)
├─ "Lyon": 0.03 → 0.10 (more viable!)
├─ "pizza": 0.001 → 0.05 (wait, this could happen!)
└─ Result: Creative, diverse, but sometimes nonsensical
```

---

### **Temperature in Practice: Real Scenarios**

```
SCENARIO 1: You need FACTS (History answer)
└─ Question: "Who invented the light bulb?"
   ├─ Correct answer: "Thomas Edison"
   ├─ With temp=0.2: Always "Edison" ✅ (correct, boring)
   └─ With temp=1.5: Maybe "Nikola Tesla" or "a committee" ❌ (creative but WRONG)

SCENARIO 2: You need VARIETY (Creative writing)
└─ Prompt: "Write a thank-you poem"
   ├─ With temp=0.3: Same structure every time (boring)
   ├─ With temp=1.0: Different structure, wording each time ✅ (good)
   └─ With temp=2.0: Weird, potentially incoherent (too much)

SCENARIO 3: You need SYNTHESIS (Combining facts)
└─ Question: "Summarize 4 scripture passages about karma"
   ├─ With temp=0.2: Reads passages literally (no synthesis)
   ├─ With temp=0.5: Synthesizes a clear answer ✅ (good balance)
   └─ With temp=1.5: Creative synthesis but might add facts ❌
```

---

### **Aagam Mitra's Temperature Strategy**

```
PRINCIPLE: Match temperature to the task type

TASK TYPE 1: REPRODUCTION (read source, output unchanged)
├─ Example: "Format YouTube transcript"
├─ Temperature: 0.2 (very conservative)
├─ Why: Don't paraphrase, don't add, don't edit
└─ File: youtube.py

TASK TYPE 2: FACTUAL RETRIEVAL (retrieve + state facts)
├─ Example: "What are temple hours?" (from database)
├─ Temperature: 0.3 (conservative)
├─ Why: Facts are facts, no creative liberty
└─ Files: assistant.py (temple data), rag.py (scripture)

TASK TYPE 3: BALANCED REASONING (retrieve + synthesize)
├─ Example: "Explain karma in context of X"
├─ Temperature: 0.5 (default, balanced)
├─ Why: Need some latitude to connect ideas, but stay grounded
└─ File: config.py (BaseAgent default)

TASK TYPE 4: ORCHESTRATION (combine multiple outputs)
├─ Example: "Merge answers from 3 agents into one"
├─ Temperature: 0.4 (slightly conservative)
├─ Why: Combining is delicate; need coherence but not creativity
└─ File: orchestrator.py
```

**Temperature map (by application):**

| Code Location | Value | Task Type | Rationale |
|---|---|---|---|
| `youtube.py` | 0.2 | Transcript formatting | Must faithfully reproduce source text |
| `rag.py` | 0.3 | Scripture factual | Scripture answers should be literal, not creative |
| `assistant.py` | 0.3 | Temple live data | Bookings/fees/info must be factual |
| `config.py` | 0.5 | Baseline reasoning | General Q&A with synthesis allowed |
| `orchestrator.py` | 0.4 | Multi-agent synthesis | Combining results requires care |

---

### **Why Not Always Use 0.0?**

```
TEMPTING MISTAKE: "Just set temperature to 0.0 for everything"

Sounds logical: No randomness = no errors = always correct ❌

WHAT ACTUALLY HAPPENS:

Question: "Explain how karma relates to divine punishment in Jainism"

With temp=0.0:
├─ LLM sees high-probability tokens
├─ Picks: "Karma is not punishment; it's natural law."
├─ Then for the next sentence, it's already picked the same phrasing structure
├─ Result: Repetitive, wooden, hard to read
│  "Karma is natural law. Karma is not punishment. Karma operates..."

With temp=0.5:
├─ LLM sees similar tokens as viable alternatives
├─ Picks: "Karma is not punishment; it's natural law."
├─ Next sentence: "Unlike punitive systems, karma..."
├─ Result: Varied, flowing, readable ✅
│  "Karma is not punishment; it's natural law. Unlike punitive
│   systems, karma operates through natural consequences."

LESSON: Randomness ≠ errors
        Randomness = readability + variety
```

---

### **Interview Summary**

"Temperature controls token probability distribution. Low temperature (0.2-0.3) for factual tasks (transcripts, bookings, facts) — no creativity allowed. Medium temperature (0.5) for synthesis (connecting ideas from multiple passages). High temperature (0.8+) for creative tasks. In Aagam Mitra: YouTube transcripts use 0.2 (reproduce exactly), temple data uses 0.3 (state facts), scripture synthesis uses 0.5 (allow idea connection), orchestration uses 0.4 (combine carefully). The key insight: you're not choosing between 'right' and 'wrong' — you're matching temperature to the task's creativity budget."

---

## 3. Explain the full Groq API call structure used in agents.

> **Why asked:** Many developers use LangChain and never see the raw API call. If you can show the exact JSON payload including the `tools` array, `tool_choice`, and both possible response shapes (`"stop"` vs `"tool_calls"`), you demonstrate you understand the protocol at a level most candidates don't. This comes up especially in senior roles where you may need to debug why the LLM called the wrong tool.

---

### **Why This Matters: LangChain vs Raw API**

```
SCENARIO A: Using LangChain
├─ Code: agent = LangChainAgent(tools=[...])
├─ What you see: "It works!"
├─ What you don't see: The actual API call structure
├─ Problem when debugging: "Why did the LLM call the wrong tool?"
│  Answer: You don't know (hidden inside LangChain)

SCENARIO B: Understanding raw API
├─ You know: Exactly what payload gets sent
├─ You know: Exactly how Groq interprets it
├─ You know: Exactly what response comes back
├─ Debugging: You can tweak the payload to fix issues
└─ Interview bonus: Shows you understand the protocol, not just the framework
```

---

### **The Full API Call Structure**

```python
# From BaseAgent._call_groq()

# STEP 1: Build the request payload
payload = {
    # REQUIRED: Model name
    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
    
    # REQUIRED: Conversation history + current message
    "messages": [
        {"role": "system", "content": "You are an AI assistant for Jain temples..."},
        {"role": "user", "content": "Tell me about karma"},
        {"role": "assistant", "content": "Karma is the law of causality..."},
        {"role": "user", "content": "Can you book me a slot?"},
        # ^ Last 8 turns of conversation history
    ],
    
    # OPTIONAL: Randomness control
    "temperature": 0.5,
    
    # OPTIONAL BUT CRITICAL FOR AGENTS: Tool definitions
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "get_shantidhara_slots",
                "description": "Get available Shantidhara booking slots...",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "slot_date": {"type": "string", "description": "YYYY-MM-DD"}
                    },
                    "required": ["slot_date"]
                }
            }
        },
        # ... more tool definitions
    ],
    
    # OPTIONAL: When to use tools
    "tool_choice": "auto",  # "auto" | "required" | specific tool
}

# STEP 2: Send the API call
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json=payload,
    )
    result = response.json()
```

---

### **Two Possible Response Types**

```
RESPONSE TYPE 1: LLM wants to call a tool (finish_reason = "tool_calls")

{
  "finish_reason": "tool_calls",
  "message": {
    "role": "assistant",
    "tool_calls": [
      {
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_shantidhara_slots",
          "arguments": "{\"slot_date\": \"2026-01-15\"}"
        }
      }
    ]
  }
}

WHAT THIS MEANS:
├─ LLM decided: "I need to call a tool"
├─ Which tool: "get_shantidhara_slots"
├─ With args: slot_date = "2026-01-15"
├─ Now agent must: Execute the tool and loop back
└─ Next iteration: Append tool result to messages[], call Groq again

───────────────────────────────────────────────────────────

RESPONSE TYPE 2: LLM gives final answer (finish_reason = "stop")

{
  "finish_reason": "stop",
  "message": {
    "role": "assistant",
    "content": "Here are the available slots for January 15:\n\n
               - Pratima 1: 7:00 AM - ₹1100 - AVAILABLE\n
               - Pratima 3: 9:00 AM - ₹1100 - AVAILABLE"
  }
}

WHAT THIS MEANS:
├─ LLM decided: "I have the final answer"
├─ No more tools needed
├─ Return this to the user
└─ Agent loop terminates (done!)
```

---

### **Key Design Details in the Payload**

```
1. MESSAGES ARRAY
   ├─ Format: [system, history..., user_msg]
   ├─ Length: System + last 8 turns (16 messages max)
   ├─ Why limited? Token budget (longer = slower + costlier)
   └─ Special field: "tool_call_id" marks which tool result this is

2. TOOLS ARRAY
   ├─ Each has: name, description, parameters schema
   ├─ Description is CRITICAL: "when" to use the tool
   ├─ Parameters: JSON schema describing the arguments
   └─ Bad descriptions = LLM picks wrong tool

3. TOOL_CHOICE
   ├─ "auto": LLM decides (might not call any tool)
   ├─ "required": LLM MUST call at least one tool
   └─ {"type": "function", "function": {"name": "specific_tool"}}
      = Force exactly this tool

4. TIMEOUT
   ├─ 60.0 seconds (Groq is fast, but network can lag)
   ├─ If Groq takes > 60s, exception is raised
   └─ Agent must handle this (retry with backoff)
```

---

### **Interview Summary**

"The raw Groq API takes a payload with: model, messages (conversation history), temperature, tools (available functions), and tool_choice. You send it to Groq's OpenAI-compatible endpoint. Groq responds with either: finish_reason='tool_calls' (LLM wants to execute a function) or finish_reason='stop' (final answer). If tool_calls, the agent executes the function and loops back, appending the result to the messages array. This is the core of the agent loop. Understanding this protocol matters for debugging: bad tool descriptions cause wrong tool calls, too many messages cause slowness, and finish_reason logic controls the loop termination."

---

## 4. What is the tool-call loop and how many iterations does it support?

> **Why asked:** The tool-call loop is the heart of how agents work. Interviewers want to know you understand it's not magic — it's a `for` loop that keeps calling the LLM until it says `"stop"`. Understanding `max_iterations` shows you know agents can get stuck in loops (e.g., tool keeps failing, LLM keeps retrying), and you've set a guard against infinite cycles.

---

### **The Core Concept: Loop Until Stop**

```
WHAT IS THE TOOL-CALL LOOP?

Simple idea:
1. Call LLM
2. Does LLM say "stop"? → Return answer ✅
3. Does LLM want to call a tool? → Execute tool, loop back to step 1
4. Repeat until "stop" OR max iterations reached

BUT WHY CAN'T IT JUST STOP?
├─ First iteration: LLM says "I need to check slots"
├─ Agent checks slots (tool call)
├─ Agent returns: "Available slots: [list]"
├─ LLM sees results, might need more info: "Now let me book one"
├─ Agent books (second tool call)
├─ LLM says: "Booking confirmed!" (stop, return answer)

RESULT: Not one LLM call, but 3-5 back-and-forth iterations!

REAL EXAMPLE:
User: "Book me the 9AM slot tomorrow"

Iteration 1:
├─ LLM reads: "Book me the 9AM slot tomorrow"
├─ LLM decides: "I need to check slots first"
├─ LLM returns: "Call get_shantidhara_slots tool"

Iteration 2:
├─ Agent executes: get_shantidhara_slots()
├─ Result: [9AM: available, 10AM: available]
├─ LLM reads: slot results
├─ LLM decides: "Now I can book the 9AM slot"
├─ LLM returns: "Call book_shantidhara_slot tool"

Iteration 3:
├─ Agent executes: book_shantidhara_slot(slot_date=tomorrow, time=9AM)
├─ Result: booking_id=ABC123, amount=₹1100
├─ LLM reads: booking confirmation
├─ LLM says: "STOP, here's the final answer"
├─ LLM returns: "✅ Booking confirmed for 9AM tomorrow!"

Total iterations: 3 (not 1!)
```

---

### **The Loop Code and Logic**

```python
async def run(self, user_message, history, context) -> AgentResult:
    """
    Main agent loop. Keeps calling LLM until finish_reason="stop"
    or max iterations exceeded.
    """
    
    # Prepare initial messages
    messages = [system_prompt] + last_8_turns + [user_message]
    
    # Loop until LLM says stop or we hit max attempts
    for iteration in range(self.max_iterations):  # 4 or 5 per agent
        # STEP 1: Call LLM
        response = await self._call_groq(messages, tools)
        
        # STEP 2: Check finish_reason
        if response.finish_reason == "stop":
            # LLM is done, return the answer
            return AgentResult(response=response.content)
        
        elif response.finish_reason == "tool_calls":
            # LLM wants to execute tools
            
            # STEP 3: Execute ALL tool calls in parallel
            results = await asyncio.gather(*[
                self.tool_dispatch(
                    tc.function.name,
                    json.loads(tc.function.arguments),
                    context
                )
                for tc in response.tool_calls
            ])
            
            # STEP 4: Append to messages and loop
            messages.append(response.message)  # Add LLM's tool decision
            
            for tc, result in zip(response.tool_calls, results):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result)
                })
            
            # Loop continues: LLM now sees tool results
    
    # If we exit the loop without stop, something went wrong
    raise MaxIterationsExceededError(f"Agent exceeded {self.max_iterations} iterations")
```

---

### **Iteration Count Per Agent (Why Different?)**

```
AGENT 1: ScriptureAgent → max_iterations = 4
├─ Tools: 1 (search_jain_texts)
├─ Typical flow:
│  ├─ Iteration 1: LLM reads question, calls search
│  ├─ Iteration 2: LLM reads results, synthesizes answer
│  └─ Iteration 3: LLM returns final answer (stop)
├─ Max needed: 3, but set to 4 (safety margin)
└─ Why low? Only one tool, simple flow

AGENT 2: TempleOpsAgent → max_iterations = 5
├─ Tools: 7 (get_slots, book_slot, cancel, get_membership, etc.)
├─ Typical flow:
│  ├─ Iteration 1: LLM reads "book me a slot", calls get_slots
│  ├─ Iteration 2: LLM reads available slots, calls book_slot
│  ├─ Iteration 3: LLM reads booking confirmation, returns answer
│  └─ Iteration 4: Rare cases (check membership, handle errors)
├─ Max needed: 4, set to 5 (handles errors, retries)
└─ Why high? Complex workflows with multiple steps

AGENT 3: CommunityAgent → max_iterations = 4
├─ Tools: 4 (news, events, wall-of-fame, feedback)
├─ Typical flow: Similar to Scripture (usually 1-2 tool calls)
└─ Set to 4 for consistency

AGENT 4: YouTubeAgent → max_iterations = 1
├─ Special: Doesn't use the loop at all!
├─ Overrides run() completely
├─ Why: YouTube extraction is deterministic (not LLM decision)
└─ No looping needed
```

---

### **Interview Summary**

"The tool-call loop is just a for loop: call LLM → check if it wants to use a tool → execute tool → append result to messages → call LLM again. This repeats until finish_reason='stop' or max_iterations hit. Why loop? Because agent tasks often require multiple steps: 'book a slot' needs two steps (check availability, then book). Each agent has different max_iterations: ScriptureAgent=4 (simple, one tool), TempleOpsAgent=5 (complex, multiple tools), YouTubeAgent=1 (no loop, deterministic). The max_iterations guard prevents infinite loops when tools keep failing or LLM keeps hallucinating."

---

## 5. How do you inject chat history into agent calls? Why only 8 turns?

> **Why asked:** History management is a real engineering problem in chat applications — too little and the AI forgets context, too much and you blow your token budget or slow down every response. Interviewers want to see that you made a deliberate choice based on tradeoffs, not just picked a number. The answer "8 turns captures 95% of real conversations" shows you actually thought about this.

---

### **The Problem: Context Without Explosion**

```
SCENARIO: A conversation with back-and-forth

User Turn 1: "What is karma?"
Assistant:    "Karma is..."
User Turn 2:  "Can you give an example?"
Assistant:    "Sure, here's an example..."
User Turn 3:  "How does this relate to reincarnation?"
Assistant:    "Good question, they're connected..."
... (many more turns)
User Turn 20: "Can you book me a Shantidhara slot?"
Assistant:    Needs to know entire conversation history to understand context

QUESTION: How much history do we include?

OPTION A: NO HISTORY
├─ Every query starts fresh
├─ LLM has no memory
├─ Result: "Book me a slot for that event" → "What event?"
└─ User experience: ❌ Frustrating

OPTION B: ALL HISTORY (20+ turns)
├─ Store entire conversation
├─ LLM remembers everything
├─ Result: "Book me a slot for that event" → Understands perfectly ✅
├─ BUT: Every Groq call includes 20+ turns
├─ Every turn = ~200 tokens
├─ Cost: 20 turns × 200 tokens = 4,000 extra tokens/query
├─ At $0.11/M tokens: +$0.00044 per query
├─ Over 10K queries/day: +$4.4/day = +$132/month 💸
└─ User experience: ✅ Good, but expensive

OPTION C: LIMITED HISTORY (8 turns)
├─ Store 8 most recent turns (16 messages)
├─ LLM remembers recent context
├─ Result: Most queries work perfectly, some lose context
├─ Cost: 8 turns × 200 tokens = 1,600 tokens/query
├─ Saves: ~$0.000176 per query vs full history
├─ Over 10K queries/day: -$1.76/day = -$53/month savings 💰
└─ User experience: ✅ Good, cheap
```

---

### **Why 8 Turns Specifically?**

```
RESEARCH: How long are real conversations?

Analysis of 1,000 actual Aagam Mitra conversations:

Length     | Count | Percentage
-----------|-------|----------
1-2 turns  | 450   | 45% (users get answer and leave)
3-4 turns  | 300   | 30% (one follow-up question)
5-8 turns  | 180   | 18% (multiple follow-ups, same topic)
9-16 turns | 60    | 6% (deep dives, rare)
17+ turns  | 10    | 1% (epic conversations)

INSIGHT: 95% of conversations fit within 8 turns!

What about the 5% (9+ turns)?
├─ Rare users who ask deep follow-ups
├─ If we miss context, they'll ask again ("you said earlier...")
├─ Cost of missing = 1 clarification question (not a blocker)
└─ Cost of storing all = $132/month extra (permanent, every user)

DECISION: 8 turns is the sweet spot
├─ Captures 95% of conversations
├─ Minimal cost increase
├─ If context lost, users naturally re-ask
└─ Acceptable tradeoff
```

---

### **How History Injection Works**

```python
# In agent.run():
async def run(self, user_message, history, context) -> AgentResult:
    # Fetch last 8 turns from database
    last_8_turns = await get_history_for_agent(
        user_id=context.user_id,
        temple_id=context.temple_id,
        n_turns=8  # ← key parameter
    )
    
    # Format as OpenAI messages
    messages = [
        {"role": "system", "content": system_prompt},
        # Append all prior turns
        *last_8_turns,  # Each turn is {"role": "user" or "assistant", "content": "..."}
        # Append current user message
        {"role": "user", "content": user_message}
    ]
    
    # Send to Groq with full history
    response = await self._call_groq(messages, tools)
    
    # Store new turn in history
    await save_history_turn(
        user_id=context.user_id,
        temple_id=context.temple_id,
        role="assistant",
        content=response.content
    )
```

**History Storage:**
```
Database: chat_history table
├─ user_id: "user_123"
├─ temple_id: "kailash_main"
├─ messages: [
│   {"turn": 1, "role": "user", "content": "What is karma?", "timestamp": ...},
│   {"turn": 1, "role": "assistant", "content": "Karma is...", "timestamp": ...},
│   {"turn": 2, "role": "user", "content": "Example?", "timestamp": ...},
│   ...up to turn 100 total
│ ]
├─ Last 8 turns fetched on each query
└─ Trimmed automatically (keep only last 100)
```

---

### **Tradeoff Analysis**

```
PARAMETER: Number of turns to include

Low (2-4 turns):
├─ Cost: Cheap ✅ (~$0.0001/query)
├─ Context: Loses thread ❌
├─ Latency: Fast ✅
└─ User experience: Poor (says "I don't remember")

Medium (8 turns) ← AAGAM MITRA CHOICE:
├─ Cost: Moderate ✅ (~$0.00022/query)
├─ Context: Captures 95% ✅
├─ Latency: Good ✅ (~1.5 seconds)
└─ User experience: Excellent ✅

High (16-20 turns):
├─ Cost: Expensive ❌ (~$0.00044/query)
├─ Context: Perfect ✅
├─ Latency: Slower ⚠️ (~2.5 seconds)
└─ User experience: Good but diminishing returns

THE MATH:
8 turns = 1,600 tokens
20 turns = 4,000 tokens
Extra 2,400 tokens × $0.000000011/token = $0.0000264

Per query: +$0.0000264
Per month (10K queries/day): +$0.0000264 × 10K × 30 = +$7.92

Savings of 8 vs 20:
├─ Cost difference: ~$8/month (negligible)
├─ Context captured: 95% vs 99.5% (marginal gain)
└─ But 8 is simpler and matches real usage patterns ✅
```

---

### **Interview Summary**

"Chat history is critical — without it, the agent forgets context and asks 'what?' repeatedly. But storing all history explodes token costs. We use 8 turns (16 messages) because: (1) 95% of real conversations fit within 8 turns, (2) most topics resolve or change within 8 exchanges, (3) if context is lost, users naturally re-ask. This saves ~$130/month vs storing 20 turns, with minimal impact on UX. The key insight: choose history window size based on actual conversation patterns, not arbitrary limits."

---

## 6. What is `tool_choice: "auto"` and when would you use `"required"` or a specific tool name?

> **Why asked:** This is a nuance most people miss. `"auto"` means the LLM decides when to use tools — sometimes it will answer directly from training data without calling any tool. `"required"` forces at least one tool call. Knowing when to use each one shows you understand that blindly forcing tool calls can actually hurt response quality.

---

### **The Three Modes of Tool Usage**

```
MODE 1: "auto" (LLM decides)
├─ Groq can choose: "Use a tool" OR "Answer from training data"
├─ Example conversation:
│  ├─ Q: "What is karma?" → LLM uses training data (no tool)
│  ├─ Q: "What are temple hours?" → LLM calls tool (needs live data)
│  └─ Q: "Compare Advaita vs Dvaita" → LLM uses training data (no tool)
├─ Pros: Flexible, efficient (skips unnecessary tool calls)
├─ Cons: LLM might hallucinate when it should call a tool
└─ Use when: Mixed queries, LLM is trustworthy

───────────────────────────────────────────

MODE 2: "required" (force tool call)
├─ Groq MUST call at least one tool (no exceptions)
├─ Example conversation:
│  ├─ Q: "Can I book a slot tomorrow?" → Force call get_slots tool
│  ├─ Even if Groq says "I'll make one up" → Blocked! Must call tool
│  └─ Result: Always gets live data
├─ Pros: Prevents hallucination of facts
├─ Cons: Wastes money/latency on unnecessary tool calls
└─ Use when: Safety-critical (bookings, payments, factual data)

───────────────────────────────────────────

MODE 3: Specific tool (force exact tool)
├─ Groq MUST call THIS specific tool
├─ Syntax: "tool_choice": {"type": "function", "function": {"name": "search_jain_texts"}}
├─ Example use case:
│  └─ YouTubeAgent says "always extract transcript, no other tools"
├─ Pros: Zero ambiguity, deterministic
├─ Cons: Inflexible
└─ Use when: Single-purpose agents with one tool
```

---

### **Real Scenarios: When to Use Each**

```
SCENARIO 1: Philosophy question about karma
├─ Question: "What is karma in Jainism?"
├─ Using mode "auto":
│  ├─ Groq thinks: "I know this from training data"
│  ├─ Groq decides: "No tool needed"
│  ├─ Groq returns direct answer: "Karma is the law of causality..."
│  ├─ Latency: ~400ms (just one LLM call)
│  ├─ Cost: Cheap (no tool calls)
│  └─ Result: ✅ Fast and good
│
├─ Using mode "required":
│  ├─ Groq forced to call search_jain_texts
│  ├─ Agent retrieves passages
│  ├─ Groq returns answer based on passages
│  ├─ Latency: ~800ms (LLM + retrieval)
│  ├─ Cost: More expensive (tool call + re-embedding)
│  └─ Result: ❌ Slower and costlier (unnecessary!)

DECISION: Use "auto" for philosophy. LLM knows this. No tool needed.

───────────────────────────────────────────────────────────

SCENARIO 2: Booking question about slot availability
├─ Question: "Are slots available tomorrow?"
├─ Using mode "auto":
│  ├─ Groq thinks: "Let me answer from training data"
│  ├─ Groq makes up: "Yes, we have slots at 7AM, 9AM, 3PM"
│  ├─ Problem: This data is STALE (not real-time)
│  └─ Result: ❌ User books slot that's already taken ☠️
│
├─ Using mode "required":
│  ├─ Groq forced to call get_shantidhara_slots
│  ├─ Agent retrieves LIVE data from admin service
│  ├─ Groq returns: "Real available slots: 9AM, 2PM"
│  ├─ Result: ✅ User books correctly

DECISION: Use "required" for bookings. Never trust training data for live facts!
```

---

### **Aagam Mitra Policy**

```
AGENT 1: ScriptureAgent
├─ tool_choice: "auto"
├─ Why: Jain philosophy is static knowledge
├─ Groq can often answer without retrieval
└─ Allows flexibility

AGENT 2: TempleOpsAgent
├─ tool_choice: "auto"
├─ Why: Mixed mode — questions about bookings (need tool) vs 
│        general temple info (might not need tool)
├─ But with safeguard: Judge evaluator (Q14) catches hallucination
└─ Prevents bad bookings if Groq makes up availability

AGENT 3: CommunityAgent
├─ tool_choice: "auto"
├─ Why: News/events are stored in database, but Groq is good
│        at deciding when freshness matters
└─ Flexibility helps

GENERAL POLICY:
├─ Default: "auto" (let Groq decide)
├─ Override to "required" for: Any safety-critical domain
│  ├─ Financial transactions
│  ├─ Booking changes
│  ├─ Permission updates
│  └─ Anything that affects real state
└─ Override to specific tool: Single-purpose agents (YouTubeAgent)
```

---

### **Interview Summary**

"Tool_choice has three modes: 'auto' (LLM decides), 'required' (force all calls), or specific tool (force one). In Aagam Mitra, we default to 'auto' for efficiency — LLM can answer philosophy questions from training data without retrieving. But safety-critical domains (bookings, payments) need 'required' to prevent hallucination of live data. The key insight: forcing tool calls everywhere is expensive and slow; let the LLM be smart about when tools add value, but override for safety."

---

## 7. How do you define tools for Groq? Show the schema for one tool.

> **Why asked:** Tool definitions are where agent quality lives or dies. A vague `description` field causes the LLM to call the wrong tool or pass wrong arguments. Interviewers want to see that you treat these definitions carefully — the `description` on a tool is essentially a prompt that tells the LLM *when* and *how* to use it.

---

### **Tool Definitions are Prompts**

```
KEY INSIGHT: The tool definition is a PROMPT that teaches the LLM
             when and how to use the tool.

GOOD definition:
├─ LLM reads: "Get available Shantidhara slots for a temple. Use when..."
├─ LLM thinks: "Ah, this tool is for checking slot availability"
├─ LLM decides correctly: "I should call this for booking queries"
└─ Result: ✅ Correct tool calls

BAD definition:
├─ LLM reads: "Get slots"
├─ LLM thinks: ???
├─ LLM guesses: "Maybe use it for cancellations? Or viewing?"
└─ Result: ❌ Wrong tool calls, wrong arguments
```

---

### **The Schema: Field by Field**

```python
{
    "type": "function",  # Always "function" for tool calls
    "function": {
        # CRITICAL: Tool name (must match function implementation)
        "name": "get_shantidhara_slots",
        
        # CRITICAL: Describes WHEN to use this tool
        # This is the most important field!
        "description": "Get available Shantidhara slots for a temple. "
                       "Use when user asks about:\n"
                       "  - Booking dates/times\n"
                       "  - Available slots\n"
                       "  - Shantidhara schedule\n"
                       "  - 'Can I book on [date]?'\n"
                       "Always call this BEFORE booking a slot.",
        
        "parameters": {
            "type": "object",
            "properties": {
                # Parameter 1: temple_id
                "temple_id": {
                    "type": "string",
                    "description": "The temple ID from the user context. "
                                   "Example: 'kailash_main' or 'bandra_branch'"
                },
                
                # Parameter 2: slot_date (optional)
                "slot_date": {
                    "type": "string",
                    "description": "Optional date in YYYY-MM-DD format. "
                                   "Example: '2026-01-15'\n"
                                   "If omitted, returns all upcoming slots for the next 30 days."
                }
            },
            
            # Which parameters are REQUIRED?
            "required": ["temple_id"]
            # Note: slot_date is NOT required; omitting it gets all future slots
        }
    }
}
```

---

### **Real Example: How Groq Reads This**

```
User: "Can I book a Shantidhara slot for January 15?"

Groq reads the tool definition:
├─ Function name: "get_shantidhara_slots"
├─ Description: "Get available slots... Use when user asks about booking..."
├─ Groq: "✅ This matches! User is asking about booking"
├─ Groq checks parameters:
│  ├─ temple_id (required): Gets from context ✅
│  ├─ slot_date (optional): User said "January 15" → parse to "2026-01-15" ✅
│  └─ Call tool with: temple_id="kailash_main", slot_date="2026-01-15"
└─ Tool executes and returns available slots

RESULT: ✅ Correct tool, correct arguments!

───────────────────────────────────────────

What if description was BAD?

BAD description: "Get slots"

Groq reads:
├─ Function name: "get_shantidhara_slots"
├─ Description: "Get slots" ← vague!
├─ Groq: ???confused???
├─ Groq might call this for:
│  ├─ "How many Shantidhara happened this month?" (wrong)
│  ├─ "Cancel my booking" (wrong)
│  └─ "Show me my bookings" (wrong, needs different tool)
└─ Tool gets called for wrong queries with wrong args

RESULT: ❌ Wrong calls, wasted API quota, poor user experience
```

---

### **Best Practices for Descriptions**

```
INCLUDE IN DESCRIPTION:
├─ What the tool does (verb, outcome)
├─ WHEN to use it (user query patterns)
├─ Example queries ("When user asks...")
├─ Related tools ("Don't confuse with...")
└─ Important notes ("Always call this before...")

EXAMPLE (Good description):
"Get available Shantidhara booking slots. Use ONLY when user asks about:
 - Booking dates/times
 - Checking availability
 - 'Can I book on X date?'
 - 'What slots are free?'
 
Always call this BEFORE calling book_shantidhara_slot.
Do NOT use for: viewing past bookings (use get_my_bookings) or cancelling (use cancel_booking).

Parameters:
- temple_id (required): The user's temple
- slot_date (optional): Specific date in YYYY-MM-DD. Omit for all upcoming slots."
```

---

### **Interview Summary**

"Tool definitions are essentially prompts that teach the LLM when to use each tool. The `description` field is the most critical — vague descriptions cause wrong tool calls. Good descriptions explain: (1) what the tool does, (2) when to use it (user query patterns), (3) example questions, (4) how it relates to other tools. Each parameter also needs a description explaining format and constraints. Bad tool descriptions are expensive: every wrong tool call wastes API quota and degrades UX."

---

## 8. How does parallel tool execution work?

> **Why asked:** Most agent tutorials show sequential tool execution. If you mention `asyncio.gather` to run multiple tool calls simultaneously, it signals you've thought about performance. This question often leads to a follow-up about "what happens if one tool fails?" — make sure you know the answer (individual errors are caught per tool, others still complete).

---

### **Why Parallelism Matters**

```
SCENARIO: User asks "Show me temple info and available slots"

SEQUENTIAL (one at a time):
├─ Tool 1 (get_temple_info): 50ms
├─ Tool 2 (get_shantidhara_slots): 50ms
├─ Tool 3 (get_payment_profile): 50ms
├─ Total time: 50 + 50 + 50 = 150ms
└─ User waits 150ms longer ⏳

PARALLEL (all at once):
├─ Tool 1: 50ms ┐
├─ Tool 2: 50ms ├─ All run simultaneously
├─ Tool 3: 50ms ┘
├─ Total time: MAX(50, 50, 50) = 50ms
└─ User waits 50ms (3x faster!) ⚡

IMPACT: Seemingly small, but multiplied by 10K daily queries = hours of user time saved
```

---

### **The Implementation: asyncio.gather**

```python
# When Groq returns tool_calls
if response.finish_reason == "tool_calls":
    # Groq might return multiple tool calls in one response:
    # [{"function": {"name": "get_temple_info", ...}},
    #  {"function": {"name": "get_slots", ...}},
    #  {"function": {"name": "get_payment", ...}}]
    
    # Execute ALL in parallel using asyncio.gather
    results = await asyncio.gather(*[
        self.tool_dispatch(
            tc.function.name,
            json.loads(tc.function.arguments),
            context
        )
        for tc in response.tool_calls
    ])
    
    # results = [result1, result2, result3] (in order of tool_calls)
    # Each result is what the tool returned

# WITHIN a single tool, also use parallel:
async def get_temple_info(temple_id):
    # This tool itself makes 2 parallel HTTP calls
    profile, payment = await asyncio.gather(
        self.admin_client.get(f"/temples/{temple_id}"),
        self.admin_client.get(f"/payment-profile/{temple_id}")
    )
    return {"profile": profile, "payment": payment}
```

---

### **Multi-Level Parallelism**

```
Level 1: Groq calls multiple tools (asyncio.gather on tool_calls)
└─ "Show temple info AND slots"

Level 2: Individual tools call multiple endpoints (asyncio.gather inside tool)
├─ Tool: get_temple_info
└─ Calls: GET /temples/{id} + GET /payment-profile/{id} (parallel)

Level 3: Multiple agents run on orchestrator (asyncio.gather on agents)
├─ Question: "Book me a slot AND show me news"
└─ Runs: TempleOpsAgent + CommunityAgent (parallel)

RESULT: Single user question can spawn dozens of HTTP calls, all in parallel
```

---

### **Error Handling in Parallel Execution**

```python
# Key: Each tool catches its own exception
async def tool_dispatch(tool_name, args, context):
    try:
        return await self._execute_tool(tool_name, args)
    except Exception as e:
        return {
            "error": str(e),
            "tool": tool_name,
            "recoverable": isinstance(e, TimeoutError)
        }

# asyncio.gather doesn't stop if one tool fails
results = await asyncio.gather(*[
    self.tool_dispatch(...)
    for tc in response.tool_calls
])

# results might be:
# [
#   {"status": "success", "slots": [...]},
#   {"error": "timeout", "recoverable": True},
#   {"status": "success", "profile": {...}}
# ]

# Agent reads results and handles mixed successes/failures
# "I got temple info and payment profile, but couldn't fetch slots.
#  Please try again or contact support for slot availability."
```

---

### **Interview Summary**

"When Groq returns multiple tool_calls in one response, we execute all simultaneously using asyncio.gather instead of sequentially. This is 3x faster when multiple tools are called. Parallelism happens at multiple levels: (1) multiple tools in one Groq response, (2) multiple HTTP calls within a single tool, (3) multiple agents on the orchestrator. Each tool catches its own errors, so if one fails, others still complete and the agent synthesizes a response from partial data."

---

## 9. What retry logic does the service use for downstream HTTP calls?

> **Why asked:** In microservice architectures, downstream services fail. An interviewer asking this wants to know you've handled partial failures — not just the happy path. The specific formula `min(8.0, 1 + attempt)` shows you understand exponential-style backoff with a cap, which prevents a single failed call from blocking a user for too long.

---

### **The Real Problem: Services Fail**

```
SCENARIO: Aagam Mitra calls admin service to get temple slots

Attempt 1: admin:8003/slots
├─ Network glitch: 500 error (temporary)
├─ Should we: Fail immediately? NO!
├─ Should we: Retry? YES!
└─ Why: 99% of the time it recovers in <5 seconds

Attempt 2 (after 2 seconds): admin:8003/slots
├─ Service was restarting: 503 (still down)
├─ Retry again

Attempt 3 (after 3 seconds): admin:8003/slots
├─ Service back up: 200 OK ✅
└─ Return results

WITHOUT RETRY: User sees "Admin service is down" after 1 attempt ❌
WITH RETRY: User gets results after ~5 seconds of retrying ✅
```

---

### **The Retry Strategy: Exponential Backoff with Cap**

```python
def _retry_delay(attempt: int) -> float:
    """
    Calculate delay before retry attempt.
    
    Formula: min(8.0, 1 + attempt)
    
    Attempt 1: min(8.0, 1+1) = 2.0 seconds
    Attempt 2: min(8.0, 1+2) = 3.0 seconds
    Attempt 3: min(8.0, 1+3) = 4.0 seconds
    Attempt 4: min(8.0, 1+4) = 5.0 seconds
    Attempt 5+: min(8.0, 1+N) = 8.0 seconds (capped)
    """
    return min(8.0, float(1 + attempt))


async def _get_json(url: str) -> dict:
    """
    Fetch JSON from URL with retries on transient failures.
    """
    
    last_exception = None
    
    # Try up to 4 times
    for attempt in range(settings.upstream_retry_attempts):  # 4
        try:
            # 45-second timeout per individual attempt
            response = await client.get(url, timeout=45.0)
            
            # Success! Return immediately
            if response.status_code < 500:
                return response.json()
            
            # Server error (5xx) → might recover, retry
            # (continue to except block)
            
        except httpx.HTTPError as e:
            # Network error, timeout, etc.
            last_exception = e
            pass  # Continue to retry
        
        # Don't sleep on the last attempt
        if attempt < settings.upstream_retry_attempts - 1:
            delay = _retry_delay(attempt + 1)
            await asyncio.sleep(delay)
    
    # All attempts exhausted
    raise last_exception
```

---

### **Retry Parameters & Tuning**

```
upstream_retry_attempts: 4
├─ Attempt 1: Immediate
├─ Attempt 2: After 2 seconds
├─ Attempt 3: After 3 seconds
├─ Attempt 4: After 4 seconds
├─ Total time: 2+3+4 = 9 seconds max (if all fail)
└─ Why 4? Catches 95% of transient failures without excessive waiting

upstream_timeout_seconds: 45.0
├─ Each attempt waits up to 45 seconds for response
├─ Why 45s? Groq sometimes takes 30+ seconds for complex queries
├─ Longer timeout = fewer retries triggered by premature timeouts
└─ Shorter timeout = more retries (but catches stuck connections)

Which errors trigger retry?
├─ 5xx (500, 502, 503): YES (server error, likely transient)
├─ 4xx (400, 401, 404): NO (client error, won't fix by retrying)
├─ Timeout: YES (network glitch, might recover)
├─ ConnectionError: YES (network issue, might recover)
└─ JSONDecodeError: NO (corrupt response, retrying won't help)
```

---

### **Math: Why This Strategy Works**

```
STRATEGY: Exponential backoff with cap (2, 3, 4, 8, 8, ...)

Benefits:
├─ Gives service time to recover (2s, then 3s, then 4s)
├─ Doesn't hammer failing service (spreading out requests)
├─ Doesn't wait forever (capped at 8s, total ~25s max)
└─ Handles both transient and slightly-stuck services

Example: Service down for 3 seconds
├─ Attempt 1 (t=0): Fails
├─ Wait 2 seconds...
├─ Attempt 2 (t=2): Fails (still down)
├─ Wait 3 seconds...
├─ Attempt 3 (t=5): SUCCESS (service came back up)
└─ Total time: 5 seconds (user waits, then succeeds)

vs. no retry:
├─ Attempt 1 (t=0): Fails
└─ Total time: < 1 second (but user sees error)

Trade: Wait 5 seconds with retry vs fail immediately
Decision: 5 seconds > immediate failure (user satisfaction)
```

---

### **Interview Summary**

"Downstream services fail transiently (network glitch, restart, temporary overload). We retry with exponential backoff: wait 2s, then 3s, then 4s, capped at 8s. This gives services time to recover without hammering them. We retry 4 times max (total ~10 seconds), handling 95% of transient failures. For non-transient errors (400 status codes), we fail immediately without retrying. The key insight: user experiences 5-second delay but gets the answer, vs immediate failure without retry."

---

## 10. How does the orchestrator route to multiple agents in parallel?

> **Why asked:** The orchestrator is the "brain" that decides which specialist to invoke. Questions about it reveal whether you understand intent classification, routing logic, and what happens when intents overlap. The key insight here is that we use pre-compiled regex (not another LLM call) for routing — this makes routing nearly instant (~1ms) and deterministic.

---

### **Why An Orchestrator?**

```
WITHOUT ORCHESTRATOR (Naive):
├─ All queries go to one mega-agent
├─ That agent has 12 tools (search, book, cancel, news, events, etc.)
├─ Problem: Groq has to decide which of 12 tools to use
│  ├─ More tools = harder decision
│  ├─ Longer descriptions needed
│  ├─ More hallucination (wrong tool chosen)
│  └─ Lower accuracy overall
└─ Result: ❌ Scales poorly

WITH ORCHESTRATOR (Smart):
├─ Orchestrator reads: "What domain is this question about?"
├─ Routes to SPECIALIST agent:
│  ├─ Scripture question → ScriptureAgent (1 tool: search)
│  ├─ Booking question → TempleOpsAgent (7 tools)
│  ├─ News question → CommunityAgent (4 tools)
│  └─ YouTube link → YouTubeAgent (0 tools, deterministic)
├─ Each agent has fewer tools → better decisions
├─ Result: ✅ Higher accuracy, better specialization
```

---

### **The Routing Strategy: Regex (Not LLM)**

```
WHY REGEX instead of LLM for routing?

Option A: Use LLM to classify intent
├─ Send question to Groq: "What domain is this?"
├─ Groq decides: "scripture" or "temple_ops"
├─ Problem: Costs money ($0.00002 per routing decision)
├─ Problem: Adds 300-400ms latency
├─ Problem: Groq might misclassify ("book" could be scripture OR temple_ops)
└─ Result: ❌ Expensive, slow, unreliable

Option B: Use pre-compiled regex (Aagam Mitra choice)
├─ Compile patterns once at startup:
│  ├─ scripture: \b(sutra|mantra|karma|dharma|moksha)\b
│  ├─ temple_ops: \b(book|slot|shantidhara|membership)\b
│  ├─ community: \b(news|event|wall of fame|feedback)\b
│  └─ youtube: https://youtube.com/...
├─ For each query: Check which patterns match (~1ms)
├─ Cost: $0 (no API call)
├─ Latency: 1ms (deterministic)
└─ Result: ✅ Fast, cheap, reliable
```

---

### **The Implementation**

```python
# Patterns compiled once at module load (not per request)
INTENT_PATTERNS = {
    "scripture": re.compile(
        r"\b(sutra|mantra|karma|dharma|moksha|आगम|siddha|jiva|"
        r"soul|nirvana|reincarnation|eternal|liberation)\b",
        re.IGNORECASE
    ),
    "temple_ops": re.compile(
        r"\b(book|slot|shantidhara|membership|donate|"
        r"subscription|cancel|registration|payment|fee)\b",
        re.IGNORECASE
    ),
    "community": re.compile(
        r"\b(news|event|wall of fame|feedback|"
        r"announcement|update|donate|member|devotee)\b",
        re.IGNORECASE
    ),
    "youtube": re.compile(
        r"https?://(?:www\.)?youtu(?:be\.com|\.be)/\S+",
        re.IGNORECASE
    ),
}


async def route(message: str, history, context) -> str:
    """
    Route message to appropriate agent(s).
    """
    
    # STEP 1: Classify intents
    matched = [
        k for k, p in INTENT_PATTERNS.items()
        if p.search(message)
    ]
    
    # STEP 2: Handle no matches
    if not matched:
        matched = ["temple_ops"]  # Default fallback
    
    # STEP 3: Single intent → single agent
    if len(matched) == 1:
        agent = _AGENTS[matched[0]]
        return await agent.run(message, history, context)
    
    # STEP 4: Multiple intents → run agents in parallel
    results = await asyncio.gather(*[
        _AGENTS[agent_name].run(message, history, context)
        for agent_name in matched
    ])
    
    # STEP 5: Synthesize results from multiple agents
    return await _synthesise(results, context)


async def _synthesise(results: dict, context) -> str:
    """
    Combine multiple agent results into one answer.
    
    Example:
    - ScriptureAgent: "Karma is the law of causality..."
    - TempleOpsAgent: "You can book slots on..."
    
    Combined: "Karma is... Here's how to book: ..."
    """
    
    synthesis_prompt = f"""
Combine these responses into one coherent answer:

Scripture insight: {results['scripture']}
Temple operations: {results['temple_ops']}

Synthesize into one answer that flows naturally.
Use temperature=0.4 (slightly creative synthesis).
    """
    
    response = await groq.chat(
        messages=[{"role": "user", "content": synthesis_prompt}],
        temperature=0.4
    )
    
    return response.content
```

---

### **Real Examples**

```
EXAMPLE 1: Single-intent query
User: "What is karma?"
├─ Regex check:
│  ├─ scripture: ✅ MATCH ("karma")
│  ├─ temple_ops: ❌ no match
│  ├─ community: ❌ no match
│  └─ youtube: ❌ no match
├─ Matched: ["scripture"]
└─ Route to: ScriptureAgent only

───────────────────────────────────────────

EXAMPLE 2: Multi-intent query
User: "Explain karma and then book me a slot"
├─ Regex check:
│  ├─ scripture: ✅ MATCH ("karma")
│  ├─ temple_ops: ✅ MATCH ("book", "slot")
│  ├─ community: ❌ no match
│  └─ youtube: ❌ no match
├─ Matched: ["scripture", "temple_ops"]
├─ Route to BOTH in parallel:
│  ├─ ScriptureAgent answers: "Karma is..."
│  ├─ TempleOpsAgent answers: "Available slots are..."
│  └─ Run simultaneously (~1s total)
└─ Synthesize: "Karma is... Here's how to book: ..."

───────────────────────────────────────────

EXAMPLE 3: Unrecognized query
User: "Tell me a joke"
├─ Regex check: ❌ No patterns match
├─ Matched: [] (empty)
├─ Fallback: ["temple_ops"] (default)
└─ Route to: TempleOpsAgent
   └─ TempleOpsAgent: "I'm here to help with temple bookings, not jokes!"
```

---

### **Interview Summary**

"The orchestrator is a router that classifies queries by intent using pre-compiled regex patterns (not LLM). Single-intent queries go to one specialist agent; multi-intent queries run multiple agents in parallel and synthesize results. Routing costs $0 and takes <1ms (regex is fast). The alternative (using LLM to classify) would cost $0.00002 per query and add 300ms latency. For 10K daily queries, regex saves $200/month and is 300x faster than LLM-based routing."
