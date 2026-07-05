# LLM & Groq Integration — Interview Q&A

> Real values from `aagam-mitra-service/app/core/config.py` and agent files.

---

## 1. What LLM does Aagam Mitra use and why Groq?

> **Why asked:** Provider choice signals whether you evaluated options or just used the default. Interviewers want to hear a cost + performance justification. The key numbers to remember: Groq is ~45x cheaper than GPT-4o and 5–10x faster because it uses custom LPU chips. Also important: Groq's API is OpenAI-compatible, so switching providers requires changing one line, not rewriting code.

**Model:** `meta-llama/llama-4-scout-17b-16e-instruct`
**Provider:** Groq (not OpenAI, not self-hosted)

**Why Groq:**
- **Speed:** Groq uses custom LPU (Language Processing Unit) chips — 5–10x faster inference than GPU-based providers
- **Cost:** ~$0.11/M input tokens vs OpenAI GPT-4o at $5/M
- **OpenAI-compatible API:** Same request/response format as OpenAI — easy to swap providers
- **Typical response time:** 400–800ms for a tool decision, 600–1200ms for a full answer

**Groq API endpoint:**
```
POST https://api.groq.com/openai/v1/chat/completions
Authorization: Bearer {groq_api_key}
```

---

## 2. What is temperature and what values do you use where?

> **Why asked:** Anyone can say "temperature controls randomness." The impressive answer is knowing *why different parts of your system use different values*. YouTube transcript formatting uses 0.2 because you need faithfulness to the source — the LLM must not add or paraphrase. Scripture answers use 0.5 because the LLM needs some creative latitude to synthesise multiple passages into a coherent response. Be ready to justify each value.

Temperature controls how **random** the model's token selection is:
- `0.0` = always pick the highest-probability token (deterministic, repetitive)
- `0.5` = balanced randomness
- `1.0+` = creative but potentially incoherent

**Aagam Mitra temperature map:**

| Location | Value | Why |
|---|---|---|
| `config.py` (BaseAgent default) | 0.5 | Balanced — used by all specialist agents |
| `rag.py` (legacy scripture RAG) | 0.3 | Conservative — factual scripture answers |
| `assistant.py` (temple data) | 0.3 | Conservative — live factual data |
| `orchestrator.py` (synthesis) | 0.4 | Slightly creative — combining multiple outputs |
| `youtube.py` (transcript formatting) | 0.2 | Most conservative — must stay faithful to source text |

---

## 3. Explain the full Groq API call structure used in agents.

> **Why asked:** Many developers use LangChain and never see the raw API call. If you can show the exact JSON payload including the `tools` array, `tool_choice`, and both possible response shapes (`"stop"` vs `"tool_calls"`), you demonstrate you understand the protocol at a level most candidates don't. This comes up especially in senior roles where you may need to debug why the LLM called the wrong tool.

```python
# From BaseAgent._call_groq()
payload = {
    "model":       "meta-llama/llama-4-scout-17b-16e-instruct",
    "messages":    messages,      # [system, history_8_turns, user, tool_results...]
    "temperature": 0.5,
    "tools":       tool_definitions,  # list of function schemas
    "tool_choice": "auto",            # Groq decides when to call tools
}

async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json=payload,
    )
```

**Response when Groq wants to call a tool:**
```json
{
  "finish_reason": "tool_calls",
  "message": {
    "role": "assistant",
    "tool_calls": [{
      "id": "call_abc123",
      "type": "function",
      "function": {
        "name": "get_shantidhara_slots",
        "arguments": "{\"slot_date\": \"2026-01-15\"}"
      }
    }]
  }
}
```

**Response when Groq gives the final answer:**
```json
{
  "finish_reason": "stop",
  "message": {
    "role": "assistant",
    "content": "Here are the available slots for January 15..."
  }
}
```

---

## 4. What is the tool-call loop and how many iterations does it support?

> **Why asked:** The tool-call loop is the heart of how agents work. Interviewers want to know you understand it's not magic — it's a `for` loop that keeps calling the LLM until it says `"stop"`. Understanding `max_iterations` shows you know agents can get stuck in loops (e.g., tool keeps failing, LLM keeps retrying), and you've set a guard against infinite cycles.

```python
async def run(self, user_message, history, context) -> AgentResult:
    messages = [system_prompt] + last_8_turns + [user_message]

    for iteration in range(self.max_iterations):  # 4 or 5 depending on agent
        response = await self._call_groq(messages, tools)

        if response.finish_reason == "stop":
            return AgentResult(response=response.content)  # DONE

        elif response.finish_reason == "tool_calls":
            # Execute ALL tool calls in parallel
            results = await asyncio.gather(*[
                self.tool_dispatch(tc.function.name,
                                   json.loads(tc.function.arguments),
                                   context)
                for tc in response.tool_calls
            ])

            # Append tool call + results to messages
            messages.append(response.message)
            for tc, result in zip(response.tool_calls, results):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result)
                })
            # Loop again — Groq now sees the tool results
```

**Max iterations by agent:**
- ScriptureAgent: 4
- TempleOpsAgent: 5 (most complex — may need to check slots, then book)
- CommunityAgent: 4
- YouTubeAgent: 1 (overrides `run()` entirely — no tool loop)

---

## 5. How do you inject chat history into agent calls? Why only 8 turns?

> **Why asked:** History management is a real engineering problem in chat applications — too little and the AI forgets context, too much and you blow your token budget or slow down every response. Interviewers want to see that you made a deliberate choice based on tradeoffs, not just picked a number. The answer "8 turns captures 95% of real conversations" shows you actually thought about this.

```python
# In agent.run():
last_8_turns = await get_history_for_agent(context.user_id, context.temple_id, n_turns=8)
messages = [{"role": "system", "content": system_prompt}] + last_8_turns + [user_msg]
```

**Why 8 turns (16 messages), not more?**

| Turns | Context quality | Token cost | Latency |
|---|---|---|---|
| 4 | Loses thread quickly | Low | Fast |
| **8** | **Captures most conversations** | **Moderate** | **~1.5s** |
| 20 | Best | High ($0.003/query) | Slow |

8 turns captures ~95% of real conversational context. Most human conversations stay on topic for fewer than 8 exchanges before the subject changes.

**Storage:** Last 100 messages stored per (user_id, temple_id). Trimmed automatically after every new message pair is saved.

---

## 6. What is `tool_choice: "auto"` and when would you use `"required"` or a specific tool name?

> **Why asked:** This is a nuance most people miss. `"auto"` means the LLM decides when to use tools — sometimes it will answer directly from training data without calling any tool. `"required"` forces at least one tool call. Knowing when to use each one shows you understand that blindly forcing tool calls can actually hurt response quality.

```python
# "auto" — Groq decides whether to call a tool or answer directly
"tool_choice": "auto"

# "required" — Groq MUST call at least one tool
"tool_choice": "required"

# Specific tool — force Groq to call exactly this tool
"tool_choice": {"type": "function", "function": {"name": "search_jain_texts"}}
```

**In Aagam Mitra we use `"auto"` because:**
- Sometimes the answer is already in chat history (no tool needed)
- Sometimes a Jain philosophy question can be answered from training data
- Groq is good at deciding when retrieval adds real value

**When you'd use `"required"`:** If building a booking agent that should *always* check live availability before confirming — you'd force the tool call to prevent the LLM from making up slot availability.

---

## 7. How do you define tools for Groq? Show the schema for one tool.

> **Why asked:** Tool definitions are where agent quality lives or dies. A vague `description` field causes the LLM to call the wrong tool or pass wrong arguments. Interviewers want to see that you treat these definitions carefully — the `description` on a tool is essentially a prompt that tells the LLM *when* and *how* to use it.

Tools follow the OpenAI function-calling JSON schema format:

```python
{
    "type": "function",
    "function": {
        "name": "get_shantidhara_slots",
        "description": "Get available Shantidhara slots for a temple. "
                       "Use when user asks about booking, available dates, or Shantidhara times.",
        "parameters": {
            "type": "object",
            "properties": {
                "temple_id": {
                    "type": "string",
                    "description": "The temple ID from context"
                },
                "slot_date": {
                    "type": "string",
                    "description": "Date in YYYY-MM-DD format. "
                                   "Omit to get all upcoming slots."
                }
            },
            "required": ["temple_id"]
        }
    }
}
```

**Key design tips:**
- `description` on the function tells Groq *when* to call it — this is critical
- `description` on each parameter tells Groq *what format to use*
- `required` array controls what Groq must always provide
- Bad descriptions = Groq calls wrong tool or passes wrong arguments

---

## 8. How does parallel tool execution work?

> **Why asked:** Most agent tutorials show sequential tool execution. If you mention `asyncio.gather` to run multiple tool calls simultaneously, it signals you've thought about performance. This question often leads to a follow-up about "what happens if one tool fails?" — make sure you know the answer (individual errors are caught per tool, others still complete).

When Groq returns multiple `tool_calls` in one response, we execute them all simultaneously:

```python
results = await asyncio.gather(*[
    self.tool_dispatch(tc.function.name,
                       json.loads(tc.function.arguments),
                       context)
    for tc in response.tool_calls
])
```

**Real example:** User asks "Show me temple info and available slots"
Groq returns:
```json
"tool_calls": [
    {"function": {"name": "get_temple_info", "arguments": "..."}},
    {"function": {"name": "get_shantidhara_slots", "arguments": "..."}}
]
```
Both HTTP calls fire simultaneously → ~30ms instead of ~60ms sequential.

**`get_temple_info` itself also runs 2 parallel calls:**
```python
profile, payment = await asyncio.gather(
    GET admin:8003/temples/{id},
    GET admin:8003/payment-profile/{id}
)
```
So a single user question can trigger up to 4 simultaneous HTTP calls.

---

## 9. What retry logic does the service use for downstream HTTP calls?

> **Why asked:** In microservice architectures, downstream services fail. An interviewer asking this wants to know you've handled partial failures — not just the happy path. The specific formula `min(8.0, 1 + attempt)` shows you understand exponential-style backoff with a cap, which prevents a single failed call from blocking a user for too long.

```python
def _retry_delay(attempt: int) -> float:
    return min(8.0, float(1 + attempt))
# attempt 1 → 2.0s, attempt 2 → 3.0s, attempt 3 → 4.0s, attempt 7+ → 8.0s cap

async def _get_json(url: str) -> dict:
    for attempt in range(settings.upstream_retry_attempts):  # 4 attempts
        try:
            response = await client.get(url, timeout=45.0)
            if response.status_code < 500:
                return response.json()
            # 5xx → retry (server error, may recover)
        except httpx.HTTPError:
            pass
        if attempt < settings.upstream_retry_attempts - 1:
            await asyncio.sleep(_retry_delay(attempt + 1))
    raise last_exception
```

**Key values:**
- `upstream_timeout_seconds`: 45.0 per individual call
- `upstream_retry_attempts`: 4
- Max total wait: 2+3+4 = 9 seconds before giving up

---

## 10. How does the orchestrator route to multiple agents in parallel?

> **Why asked:** The orchestrator is the "brain" that decides which specialist to invoke. Questions about it reveal whether you understand intent classification, routing logic, and what happens when intents overlap. The key insight here is that we use pre-compiled regex (not another LLM call) for routing — this makes routing nearly instant (~1ms) and deterministic.

```python
# Compiled once at module load time (not per request)
INTENT_PATTERNS = {
    "scripture":  re.compile(r"\b(sutra|mantra|karma|dharma|moksha|आगम|...)\b", re.IGNORECASE),
    "temple_ops": re.compile(r"\b(book|slot|shantidhara|membership|...)\b", re.IGNORECASE),
    "community":  re.compile(r"\b(news|event|wall of fame|feedback|...)\b", re.IGNORECASE),
    "youtube":    re.compile(r"https?://(?:www\.)?youtu(?:be\.com|\.be)/...", re.IGNORECASE),
}

async def route(message, history, context):
    matched = [k for k, p in INTENT_PATTERNS.items() if p.search(message)]
    if not matched:
        matched = ["temple_ops"]  # default for unrecognised queries

    if len(matched) == 1:
        return await _AGENTS[matched[0]].run(message, history, context)

    # Multiple intents → parallel execution, then synthesise
    results = await asyncio.gather(*[
        _AGENTS[k].run(message, history, context) for k in matched
    ])
    return await _synthesise(results, context)  # Groq, temperature=0.4
```
