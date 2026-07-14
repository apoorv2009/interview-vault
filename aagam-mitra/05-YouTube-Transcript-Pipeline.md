# YouTube Transcript Pipeline — Interview Q&A

---

## 1. How does the YouTube transcript extraction work?

> **Why asked:** Building something on top of YouTube's transcript system is a real engineering challenge because it can fail in many ways — no captions, live stream, private video, language not available. Having a fallback strategy (Layer 2 with Whisper) shows you thought about reliability, not just the happy path. The dual-layer approach is the most interesting architectural decision here and should be the centrepiece of your answer.

---

### **Dual-Layer Fallback Strategy: Fast + Reliable**

```
Layer 1: YouTube API (200-500ms)
  → Works if captions exist
  → Fails if no captions (private, live, etc)
  
Layer 2: yt-dlp + Whisper (30-120s)
  → Falls back on Layer 1 failure
  → Downloads audio, transcribes locally
  → Works on ANY video with sound
  
Result: Never return "unable to extract" (or only as last resort)
```

The system uses a **dual-layer strategy** — Layer 1 is fast, Layer 2 is the fallback:

### Layer 1 — Native YouTube Captions (200–500ms)
```python
from youtube_transcript_api import YouTubeTranscriptApi

api = YouTubeTranscriptApi()
transcript = api.fetch(video_id, languages=["hi", "en"])
raw_data = transcript.to_raw_data()
# Returns: [{"text": "णमो अरिहंताणं", "start": 0.5, "duration": 1.2}, ...]

raw_text = " ".join(item["text"] for item in raw_data)
```

**Works when:** Creator uploaded subtitles, or YouTube auto-generated captions exist.
**Fails when:** Private video, no captions, or live stream.

### Layer 2 — yt-dlp + Whisper ASR (30–120 seconds)
```python
import yt_dlp, whisper

# Download audio only — no video, much smaller file
ydl_opts = {"format": "bestaudio/best", "outtmpl": "/tmp/audio_{id}.%(ext)s"}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([youtube_url])

# Transcribe with local Whisper model (no API call, no cost)
model = whisper.load_model("base")
result = model.transcribe(audio_file_path, language="hi", task="transcribe")
raw_text = result["text"]
```

**Works on:** Any video with audio, even with no captions at all.
**Limitations:** Needs FFmpeg installed on the server, takes 30–120s depending on video length.

---

## 2. What is the LLM formatting layer and why temperature=0.2?

> **Why asked:** The raw transcript from either layer (especially Whisper) is messy — repeated words, filler sounds, no paragraph breaks, wrong spellings of Jain Prakrit terms. Passing it through a low-temperature LLM is an elegant solution that cleans the text without losing meaning. The temperature choice (0.2 — the lowest in the system) is what shows you understand the difference between generation tasks and transcription tasks.

---

### **Low Temperature (0.2) for Transcription ≠ Generation**

```
Generation task (high temp): "Write a blog post about Karma" → T=0.7-0.9
Transcription task (low temp): "Clean up messy transcript" → T=0.2
  Why low? Don't add creativity, just fix spelling/remove fillers
  Never paraphrase, never summarize
```

After extracting `raw_text`, we pass it through Groq for cleanup:

```python
async def _llm_format_transcript(raw_text: str, system_prompt: str) -> str:
    sample = raw_text[:8000]  # cap — RAG uses the full raw_text separately
    resp = await groq_client.post(
        GROQ_CHAT_URL,
        json={
            "model":       settings.groq_model,
            "temperature": 0.2,   # ← lowest temperature in the whole system
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": sample},
            ],
        },
    )
    return resp.json()["choices"][0]["message"]["content"]
    # On any failure: return raw_text unchanged — graceful degradation
```

**Why 0.2?** This is a **transcription task**, not a generation task. The LLM must:
- Stay faithful to what was actually said
- Fix Jain Prakrit spellings (णमो अरिहंताणं, not नमो अरिहंतों)
- Remove filler words (अं, हं, तो) without adding anything new
- Never paraphrase or summarise

Higher temperature would introduce creative variation — exactly what we don't want here.

---

## 3. How do you detect whether a video is a Shanka Samadhan vs Pravachan?

> **Why asked:** This is a domain-specific design decision. The interviewer wants to see that you've understood the actual use case well enough to implement type detection. The key insight: we detect from the *user's message text* (not the video title or content) — because the user tells us what kind of video it is when they share it. This is simpler and more reliable than trying to analyse the video.

---

### **Content-Type Detection: Ask User, Don't Analyze**

```
Bad: Try to analyze video content to guess if it's Q&A or lecture
Good: User tells us in their message ("shanka samadhan" or not)
  → Detect from text: regex for keywords
  → Use different format prompts per type
  → Shanka Samadhan has labels (शंका: / समाधान:), Pravachan is verbatim
```

```python
_SHANKA_KEYWORDS = re.compile(
    r"shanka[\s_-]?samadhan|jigyasa[\s_-]?samadhan"
    r"|शंका[\s-]?समाधान|जिज्ञासा[\s-]?समाधान",
    re.IGNORECASE,
)

# Detection is from the user's chat message — not the video title
is_shanka = bool(_SHANKA_KEYWORDS.search(user_message))
format_prompt = _SHANKA_SAMADHAN_PROMPT if is_shanka else _PRAVACHAN_PROMPT
video_type   = "Shanka Samadhan" if is_shanka else "Pravachan"
```

**Example:**
```
User: "Please transcribe this shanka samadhan video: https://youtu.be/abc123"
→ is_shanka = True  →  uses SHANKA_SAMADHAN_PROMPT
→ output has शंका: / समाधान: labels

User: "Can you get the transcript of this: https://youtu.be/xyz789"
→ is_shanka = False  →  uses PRAVACHAN_PROMPT
→ output is clean verbatim Hindi
```

---

## 4. What are the two system prompts for transcript formatting?

> **Why asked:** Having type-specific prompts instead of one generic prompt is good design — different content types need different formatting rules. Interviewers asking this want to see that you've thought carefully about what rules matter for each type. The anti-repetition rule in the Shanka Samadhan prompt is particularly worth mentioning — Whisper often repeats words when audio quality is poor, and you need to explicitly tell the LLM to collapse those.

---

### **Type-Specific Formatting: Shanka vs Pravachan**

```
Shanka Samadhan: Label Q&A format
  शंका: (question) / समाधान: (answer)
  Anti-repetition rule (Whisper echo fix)
  
Pravachan: Verbatim transcription
  No labels, just clean original text
  Correct Jain spellings (णमो अरिहंताणं)
  Preserve mix of Sanskrit/Prakrit/Hindi
```

### SHANKA_SAMADHAN_PROMPT — Key rules:
1. Label every question as `शंका:` — label every answer as `समाधान:`
2. Never invent or restructure questions — preserve interrogative structure exactly
3. Normalize Jain mantras to canonical Prakrit forms
4. **Anti-repetition rule:** Never output the same word or sentence more than twice in a row — if Whisper produced echo/repetition, collapse to one occurrence
5. Remove filler sounds (अं, हं, तो) unless they change meaning
6. Preserve oral teaching style — no summarising, no editorialising
7. **Fail-safe:** Never return empty — output at least one clean occurrence even if content was collapsed

### PRAVACHAN_PROMPT — Key rules:
1. Verbatim Hindi transcription — word for word
2. Correct Jain Prakrit spellings: `णमो अरिहंताणं` not `नमो अरिहंतों`
3. Correct terminology: विषापहार, अतिशय, जिन शासन, तीर्थंकर, समवशरण
4. Preserve original Sanskrit/Prakrit/Hindi mix — do not translate any word
5. Output clean structured Devanagari only — no English, no markdown

---

## 5. Why is the raw transcript stored separately from the formatted transcript?

> **Why asked:** This data storage decision shows you understand the difference between "display data" and "retrieval data." The formatted text is good for reading — filler words removed, labels added — but it has less information than the raw text. For follow-up RAG queries ("what did he say about karma at the 10-minute mark?"), the raw text is better. Mentioning this tradeoff signals you think about downstream uses, not just the immediate task.

---

### **Two Versions: UI Display vs RAG Retrieval**

```
Formatted: Clean, labeled, no filler → Display in UI
Raw: Full original text, all filler → Use in RAG searches
Why both? Formatted loses info (filler=temporal markers)
RAG needs max text for retrieval quality
```

```python
# After extraction:
formatted_text = await self._llm_format_transcript(transcript_text, format_prompt)

# Show formatted version in UI (clean, labelled)
response = self._format_response(formatted_text, ...)

# Store RAW version for follow-up RAG queries
context.context["youtube_transcript"] = transcript_text   # ← full original
context.context["youtube_video_id"]   = video_id
context.context["youtube_url"]        = youtube_url
```

**Why raw, not formatted?**
- Formatted text has filler words removed — loses temporal markers ("uh, at this point...")
- Formatted text collapsed repetitions — loses exact phrasing for quote matching
- RAG works better with more text — raw has 100% of the original content
- If the user asks "what did he say about karma?" we want to search the complete transcript

---

## 6. How do you extract video IDs from different YouTube URL formats?

> **Why asked:** Users paste URLs in many formats — short links, shorts, embeds, standard watch URLs. If you only handle `youtube.com/watch?v=`, you'll break on `youtu.be/` links. Interviewers use this to check whether you handled edge cases. The key fact: YouTube video IDs are always exactly 11 characters (alphanumeric + `-` and `_`).

---

### **URL Format Handling: 4 Regex Patterns**

```
Formats to handle:
- youtube.com/watch?v=ID
- youtu.be/ID
- youtube.com/shorts/ID
- youtube.com/embed/ID

Video ID always: [a-zA-Z0-9_-] × 11 chars
```

```python
@staticmethod
def _extract_youtube_url(text: str) -> str | None:
    # Standard: youtube.com/watch?v=ID
    match = re.search(r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"

    # Short: youtu.be/ID
    match = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://youtu.be/{match.group(1)}"

    # Shorts: youtube.com/shorts/ID
    match = re.search(r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/shorts/{match.group(1)}"

    # Embedded: youtube.com/embed/ID
    match = re.search(r"youtube\.com/embed/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/embed/{match.group(1)}"

    return None
```

**YouTube video ID format:** Always exactly 11 characters — `[a-zA-Z0-9_-]`. This is used as part of the Pinecone vector ID and the saved transcript filename.

---

## 7. What happens when the video is a live stream?

> **Why asked:** Error handling quality separates good engineers from great ones. The interviewer is checking whether you return a generic "error occurred" or an actually helpful message. The live stream case is interesting because it's a *predictable* failure — we know exactly what it means and can give the user a specific time estimate and action to take.

---

### **Error Handling: Specific > Generic**

```
Bad: "Could not extract transcript. Try again."
Good: "This is a live stream. Transcripts available after YouTube processes (usually within a few hours). Share link again when ready."

Check for: "live or archived live stream" error string
Return actionable guidance with time estimate
```

```python
except Exception as e:
    error_msg = str(e)

    # Specific, predictable failure — give actionable guidance
    if "live or archived live stream" in error_msg.lower():
        return AgentResult(
            response=(
                "**This is a live or archived live stream.**\n\n"
                "Live videos don't have transcripts until the stream ends. "
                "Please share the video link again after YouTube processes the "
                "recording (usually within a few hours)."
            ),
        )

    # Generic failure — list possible causes
    return AgentResult(
        response=(
            "Could not extract the transcript. Possible reasons:\n"
            "- Video has disabled subtitles/captions\n"
            "- Currently live stream (wait for it to finish)\n"
            "- System lacks FFmpeg for audio extraction\n\n"
            f"Details: {error_msg}"
        ),
    )
```

Both Layer 1 (youtube-transcript-api) and Layer 2 (yt-dlp) fail on live streams — Layer 1 raises `TranscriptsDisabled`, Layer 2 can't get a complete audio file. We detect the specific error string and return an appropriate message.

---

## 8. Where are transcripts saved and why?

> **Why asked:** Persistence decisions show you think about performance and reuse. If someone sends the same YouTube URL twice, re-downloading and re-transcribing wastes 30–120 seconds and bandwidth. Saving to disk with a predictable filename (by video ID) means you can check if it already exists before re-processing. Mentioning the Docker volume means you know data persists across container restarts.

---

### **Caching: Reuse Transcripts by Video ID**

```
Save to: /data/youtube_transcripts/  (Docker volume = persistent)
Pattern: transcript_{video_id}.txt, transcript_{video_id}.pdf

Why? 
1. Cache hit → skip 30-120s extraction (same video sent twice)
2. Download → admin/devotee can download formatted PDF
3. Audit trail → temple reviews past transcripts
4. Persistence → data survives container restarts
```

```python
# Saved to Docker volume:
output_dir = "/data/youtube_transcripts"   # maps to ./docker-data/youtube-transcripts

# Files created per video:
transcript_{video_id}.txt   # raw text — used for RAG
transcript_{video_id}.pdf   # formatted PDF — can be downloaded from app
```

**Why save to disk?**
- **Cache:** Same video URL shared twice → serve from disk, skip re-extraction
- **Download:** Admin or devotee can download the formatted PDF
- **Audit:** Temple can review past transcripts
- **Persistence:** Docker volume survives container restarts — data is not lost on redeploy

**File naming by video ID** (not URL) ensures a canonical, collision-free filename regardless of which URL format was used to share the video.
