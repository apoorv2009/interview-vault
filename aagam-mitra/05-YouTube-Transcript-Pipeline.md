# YouTube Transcript Pipeline — Interview Q&A

---

## 1. How does the YouTube transcript extraction work?

Aagam Mitra supports sharing YouTube pravachan/shanka-samadhan videos directly in chat. The system extracts the transcript using a **dual-layer strategy**:

### Layer 1 — Native Captions (fast, ~200–500ms)
```python
from youtube_transcript_api import YouTubeTranscriptApi

api = YouTubeTranscriptApi()
transcript = api.fetch(video_id, languages=["hi", "en"])
raw_data = transcript.to_raw_data()
# Returns: [{"text": "णमो अरिहंताणं", "start": 0.5, "duration": 1.2}, ...]

raw_text = " ".join(item["text"] for item in raw_data)
```

**Works when:** Creator uploaded subtitles, or YouTube auto-generated captions exist.  
**Fails when:** Private video, no captions, live stream.

### Layer 2 — yt-dlp + Whisper ASR (slower, 30–120s)
```python
import yt_dlp, whisper

# Download audio only (no video download)
ydl_opts = {"format": "bestaudio/best", "outtmpl": "/tmp/audio_{id}.%(ext)s"}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([youtube_url])
# Saves: /tmp/audio_abc123.webm or .m4a

# Transcribe with OpenAI Whisper (local model, no API cost)
model = whisper.load_model("base")
result = model.transcribe(audio_file_path, language="hi", task="transcribe")
raw_text = result["text"]
```

**Why Whisper "base" model?**
- Runs on CPU (no GPU required on the server)
- ~150MB model size — practical to load per request
- Good Hindi accuracy for pravachans
- 5–10x faster than "large" model

---

## 2. What is the LLM formatting layer and why temperature=0.2?

After extracting `raw_text` via Layer 1 or 2, we pass it through Groq for cleanup:

```python
async def _llm_format_transcript(raw_text: str, system_prompt: str) -> str:
    sample = raw_text[:8000]  # cap input — RAG uses full raw_text separately
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={
                "model": settings.groq_model,
                "temperature": 0.2,       # ← lowest in the system
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": sample},
                ],
            },
        )
        return resp.json()["choices"][0]["message"]["content"]
    # On any failure: return raw_text unchanged
```

**Why 0.2 (not 0)?**
- 0.0 = completely deterministic, sometimes repetitive
- 0.2 = near-deterministic but with slight flexibility for formatting decisions
- This is a **transcription task** — the LLM must stay faithful to the source, not paraphrase

**What the formatting does:**
- Removes filler sounds (अं…, हं…, तो…)
- Collapses mechanical repetitions (chanting echoes)
- Corrects Jain Prakrit spellings (णमो अरिहंताणं not नमो अरिहंतों)
- For Shanka Samadhan: adds शंका: / समाधान: labels

---

## 3. How do you detect whether a video is a Shanka Samadhan vs Pravachan?

```python
_SHANKA_KEYWORDS = re.compile(
    r"shanka[\s_-]?samadhan|jigyasa[\s_-]?samadhan"
    r"|शंका[\s-]?समाधान|जिज्ञासा[\s-]?समाधान",
    re.IGNORECASE,
)

# Detection from user's MESSAGE (not the video title)
is_shanka = bool(_SHANKA_KEYWORDS.search(user_message))
format_prompt = _SHANKA_SAMADHAN_PROMPT if is_shanka else _PRAVACHAN_PROMPT
```

**The user has to tell us the type** by including keywords like "shanka samadhan" in their message alongside the YouTube URL. We don't analyze the video title automatically.

---

## 4. What are the two system prompts for transcript formatting?

### SHANKA_SAMADHAN_PROMPT (9 rules)
Critical rules for Q&A format pravachans:
1. Label every question: `शंका:`
2. Label every answer: `समाधान:`
3. Never invent or restructure questions
4. Preserve interrogative structure exactly (क्यों, कैसे, क्या)
5. Normalize Jain mantras to canonical Prakrit forms
6. **Anti-repetition rule:** Never output same word/sentence >2 times in a row
7. Remove filler sounds (अं, हं, तो) unless they change meaning
8. Preserve oral teaching style — no summarizing
9. FAIL-SAFE: Never return empty response; output at least one clean occurrence

### PRAVACHAN_PROMPT
Simpler rules for single-speaker discourse:
1. Verbatim Hindi transcription
2. Correct Jain Prakrit spellings (`णमो अरिहंताणं` not `नमो अरिहंतों`)
3. Correct terminology: विषापहार, अतिशय, जिन शासन, तीर्थंकर, समवशरण
4. Preserve original Sanskrit/Prakrit/Hindi mix — do not translate
5. Output clean structured Devanagari

---

## 5. How does the transcript get stored for follow-up RAG queries?

```python
# After extraction and formatting:
context.context["youtube_transcript"] = transcript_text   # full raw text
context.context["youtube_video_id"]  = video_id
context.context["youtube_url"]       = youtube_url
context.context["transcript_extracted_at"] = datetime.now().isoformat()
```

**Why store full `transcript_text` (not `formatted_text`)?**

The formatted text has filler words removed and Prakrit corrected. For RAG follow-up queries ("What did he say about karma in this video?"), we want the full original text — no information loss.

If the user later asks a question about the video, the orchestrator detects that context has a `youtube_transcript` and uses it as additional context for the answer.

---

## 6. How do you extract video IDs from different YouTube URL formats?

```python
@staticmethod
def _extract_youtube_url(text: str) -> str | None:
    # youtube.com/watch?v=ID
    match = re.search(r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/watch?v={match.group(1)}"

    # youtu.be/ID (short URL)
    match = re.search(r"youtu\.be/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://youtu.be/{match.group(1)}"

    # youtube.com/shorts/ID
    match = re.search(r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/shorts/{match.group(1)}"

    # youtube.com/embed/ID
    match = re.search(r"youtube\.com/embed/([a-zA-Z0-9_-]{11})", text)
    if match:
        return f"https://www.youtube.com/embed/{match.group(1)}"

    return None
```

YouTube video IDs are always exactly **11 characters** — alphanumeric plus `-` and `_`.

---

## 7. What happens when the video is a live stream?

```python
except Exception as e:
    error_msg = str(e)
    if "live or archived live stream" in error_msg.lower():
        return AgentResult(
            response=(
                "**This is a live or archived live stream.**\n\n"
                "Live videos don't have transcripts until after the stream ends. "
                "Please share the video link again after YouTube processes the "
                "recording (usually within a few hours)."
            ),
            agent_name=self.name,
        )
```

Both Layer 1 (youtube-transcript-api raises `TranscriptsDisabled`) and Layer 2 (yt-dlp fails on incomplete live stream) would fail. We catch the specific error message and return a helpful, actionable response.

---

## 8. Where are transcripts saved?

```python
# YouTubeTranscriptAgent saves to disk:
output_dir = "/data/youtube_transcripts"  # Docker volume mount

# Files created:
transcript_{video_id}.txt   # raw text
transcript_{video_id}.pdf   # formatted PDF (via reportlab)
```

This allows:
- Re-serving the transcript without re-extracting (cache)
- Downloading the formatted PDF from the app
- Admin review of past transcripts

The Docker volume `./docker-data/youtube-transcripts` maps to `/data/youtube_transcripts` inside the container — persists across container restarts.
