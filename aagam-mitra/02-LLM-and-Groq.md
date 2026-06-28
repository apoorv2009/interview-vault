# LLM & Groq Integration — Interview Q&A

> Real values from `aagam-mitra-service/app/core/config.py` and agent files.

---

## 1. What LLM does Aagam Mitra use and why Groq?

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

**Key insight for interview:** Why 0.2 for YouTube? Because the formatting step must not paraphrase or add words — it's a transcription task, not a generation task. Lower temperature = more faithful to input.

---

## 3. Explain the full Groq API call structure used in agents.

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

data = response.json()
choice = data["choices"][0]
finish_reason = choice["finish_reason"]  # "stop" or "tool_calls"
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

The tool-call loop is a multi-round conversation where the LLM alternates between deciding what to do and receiving tool results:

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

    return AgentResult(response="Could not complete in max iterations")
```

**Max iterations by agent:**
- ScriptureAgent: 4
- TempleOpsAgent: 5 (more complex — may need to check slots, then book)
- CommunityAgent: 4
- YouTubeAgent: 1 (overrides run() entirely — no tool loop)

---

## 5. How do you inject chat history into agent calls? Why only 8 turns?

```python
# chat_history.py
async def get_history_for_agent(user_id, temple_id, n_turns=8):
    messages = await get_last_n_messages(user_id, temple_id, limit=n_turns*2)
    # Returns list of {role, content} dicts
    return messages

# In agent.run():
last_8_turns = await get_history_for_agent(context.user_id, context.temple_id)
messages = [{"role": "system", "content": system_prompt}] + last_8_turns + [user_msg]
```

**Why 8 turns (16 messages), not more?**

| Turns | Context quality | Token cost | Latency |
|---|---|---|---|
| 4 | Loses thread | Low | Fast |
| **8** | **Captures most conversations** | **Moderate** | **~1.5s** |
| 20 | Best | High ($0.003/query) | Slow |

8 turns captures ~95% of real conversational context. Most human conversations stay on topic for fewer than 8 exchanges before the subject changes.

**Storage:** Last 100 messages stored per (user_id, temple_id). 100 is hard-trimmed after every new message pair is inserted.

---

## 6. What is `tool_choice: "auto"` and when would you use `"required"` or a specific tool name?

```python
# "auto" — Groq decides whether to call a tool or answer directly
"tool_choice": "auto"

# "required" — Groq MUST call at least one tool (useful when you always need data)
"tool_choice": "required"

# Specific tool — force Groq to call this exact tool
"tool_choice": {"type": "function", "function": {"name": "search_jain_texts"}}
```

**In Aagam Mitra we use `"auto"` because:**
- Sometimes the answer is in chat history (no tool needed)
- Sometimes a direct question about Jain philosophy can be answered from training data
- Groq is good at deciding when retrieval adds value

**When you'd use `"required"`:** If you're building a booking agent that should *always* check availability before confirming — you'd force the tool call to prevent the LLM from guessing.

---

## 7. How do you define tools for Groq? Show the schema for one tool.

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
- `description` on each parameter tells Groq *what to put in it*
- `required` list controls what Groq must always provide
- Bad descriptions = Groq calls wrong tool or passes wrong arguments

---

## 8. How does parallel tool execution work?

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
Groq might return:
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
            # 5xx → retry
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

```python
# orchestrator.py — module-level compiled patterns (compiled once at import time)
INTENT_PATTERNS = {
    "scripture":  re.compile(r"\b(sutra|mantra|karma|dharma|moksha|आगम|...)\b", re.IGNORECASE),
    "temple_ops": re.compile(r"\b(book|slot|shantidhara|membership|...)\b", re.IGNORECASE),
    "community":  re.compile(r"\b(news|event|wall of fame|feedback|...)\b", re.IGNORECASE),
    "youtube":    re.compile(r"https?://(?:www\.)?youtu(?:be\.com|\.be)/...", re.IGNORECASE),
}

# Agent singletons (created once at startup)
_AGENTS = {
    "scripture":  ScriptureAgent(),
    "temple_ops": TempleOpsAgent(),
    "community":  CommunityAgent(),
    "youtube":    YouTubeAgent(),
}

async def route(message, history, context):
    matched = [k for k, p in INTENT_PATTERNS.items() if p.search(message)]
    if not matched:
        matched = ["temple_ops"]  # default

    if len(matched) == 1:
        return await _AGENTS[matched[0]].run(message, history, context)

    # Multiple intents → parallel
    results = await asyncio.gather(*[
        _AGENTS[k].run(message, history, context) for k in matched
    ])

    # Synthesise with Groq (temperature=0.4)
    return await _synthesise(results, context)
```
