# YouTube has the same video in 1080p and 144p. Does the server store separate files for each quality?

**SIMPLE EXPLANATION — Read This First**

Short Answer: YES — YouTube stores separate encoded versions for each quality. BUT they are not stored as full files. Each quality is broken into small 2-second chunks, and audio is stored separately (once) and shared across all qualities.

- Step 1 — Original Upload: When a creator uploads a video, YouTube saves the original file.
- Step 2 — Transcoding: YouTube's servers automatically convert the original into multiple versions: 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 4K. Each version uses a different resolution and bitrate (lower quality = smaller file size).
- Step 3 — Segmented Storage: Each quality version is broken into small 2-second chunks and stored separately. Not one big file — thousands of tiny pieces.
- Step 4 — Adaptive Streaming (DASH): When you watch, YouTube doesn't send the whole video. It sends one chunk at a time. It measures your internet speed after each chunk and switches quality automatically. Fast connection = 1080p chunks. Slow connection = 360p chunks. This is why quality changes smoothly while watching.
- Smart trick: audio stored once: The audio track is stored ONCE and shared by all quality levels. A 1080p viewer and a 144p viewer both get the same audio file. This saves huge amounts of storage.
- Multiple codecs too: YouTube actually stores each quality in multiple video formats: H.264 (older devices), VP9 (Chrome, 50% smaller than H.264), AV1 (newest, 30% smaller than VP9). More storage but better quality/speed for each user's device.

**DEEP DIVE — Technical Architecture Below**

## Upload to Playback Pipeline

```
  Creator uploads raw video
        │
        ▼
  Transcoding Farm (runs in parallel)
  ┌──────────────────────────────────────────────────┐
  │  H.264:  144p / 360p / 720p / 1080p             │
  │  VP9:    144p / 360p / 720p / 1080p             │
  │  AV1:    360p / 720p / 1080p / 4K               │
  │                                                  │
  │  Audio:  AAC / Opus — ONE SET for all qualities  │
  └──────────────────────────────────────────────────┘
        │
        ▼
  Google Cloud Storage (chunked segments):
    /video/{id}/vp9/1080p/seg_0001.webm
    /video/{id}/vp9/144p/seg_0001.webm
    /video/{id}/audio/en/aac/seg_0001.m4a  ← shared
```

## How DASH Adaptive Streaming Works

The player fetches a manifest file listing all available qualities. Every 2 seconds it downloads one video chunk + one audio chunk, then measures download speed and picks the next quality.

```
<!-- DASH manifest: player chooses quality per chunk -->
<Representation id="144p"  bandwidth="100000">  ← slow connection
<Representation id="720p"  bandwidth="2500000"> ← medium connection
<Representation id="1080p" bandwidth="5000000"> ← fast connection
```

```
<!-- Audio: ONE representation shared across all video qualities -->
<Representation id="aac_128k" bandwidth="128000">
```

## Storage Per 10-Minute Video

| Quality | VP9 Size | AV1 Size |
| --- | --- | --- |
| 144p | ~8 MB | ~5 MB |
| 720p | ~190 MB | ~125 MB |
| 1080p | ~380 MB | ~250 MB |
| 4K | ~2.3 GB | ~1.5 GB |
| Total (all codecs × all qualities) | ~3–6 GB |  |

YouTube has ~800M videos. Total storage is in the exabytes. The demuxed audio trick (one audio file per language, not one per quality) alone saves hundreds of petabytes.

## Theoretical Framework — Interview Talking Points

- Read/Write Trade-off: Extreme read optimization: pre-transcode every quality at upload time (heavy write cost once) so every playback is a fast CDN lookup (zero compute). Trade-off: exabyte storage cost vs. sub-10ms segment serving latency for billions of concurrent viewers.
- Write Amplification: Storing a video at ~5 GB (all codecs × qualities) vs ~750 MB for 1080p H.264 alone = ~7x write amplification. Periodic re-encoding from H.264 to AV1 adds more write amplification — but ongoing storage savings justify the one-time cost.
- CAP Theorem: Video segment delivery is AP. CDN serves cached segments even if stale. For content that rarely changes post-upload, this is correct — a "stale" segment IS the correct segment.
