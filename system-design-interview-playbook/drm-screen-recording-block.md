# You try to screen record Netflix but only get a black screen. Why?

*Alternate phrasing covered by this answer: "How does Netflix prevent users from screen recording its content?"*

**SIMPLE EXPLANATION — Read This First**

Short Answer: Netflix never even "sees" your screen recording attempt. The operating system (Windows/Android/iOS) itself refuses to capture that part of the screen because Netflix has flagged its video window as "protected content".

- Analogy: Imagine your phone has a special window tint that makes it invisible to cameras, but you can still see through it. Netflix's video window has the digital equivalent of that tint. Screen recorders just see a black rectangle.
- Layer 1 — HDCP (hardware): The video signal travelling from your GPU to your monitor is encrypted. External capture cards (like Elgato) can't decode it without the right keys. That's why capture cards show black for Netflix.
- Layer 2 — Decryption inside secure hardware: Netflix video is AES-encrypted. The decryption happens inside a hardware "secure enclave" (Widevine L1). The decrypted pixels are sent directly to the GPU — they NEVER touch normal app memory. Your OS cannot see them.
- Layer 3 — OS compositor (the main one for software recording): Netflix tells the OS: "Mark this window as protected." When OBS or any screen recorder tries to capture the screen, the OS compositor (the part of the OS that draws windows) replaces Netflix's window with a solid black rectangle before handing it to the recorder.
- Windows: Uses DXGI Protected Content API. OBS gets a black box at the Netflix window coordinates.
- Android: Netflix calls FLAG_SECURE on its Activity. Android's SurfaceFlinger excludes this window from screen captures and recent-apps thumbnails.
- iOS: Apple automatically blocks ReplayKit from capturing any AVPlayerLayer with DRM content — built into the OS.
- Why black instead of an error?: The OS doesn't fail the recording — it just fills that rectangle with black. This prevents fingerprinting of DRM systems and doesn't crash your recorder.

**DEEP DIVE — Technical Architecture Below**

## The Full Defense Stack

```
┌──────────────────────────────────────────────────────────┐
│  Layer 4: Legal (DMCA) — civil/criminal deterrent        │
│                                                           │
│  Layer 3: App Flag                                        │
│    Windows: DXGI Protected Content → black in OBS        │
│    Android: FLAG_SECURE → black in screen recorder       │
│    iOS:     AVPlayerLayer → blocked by ReplayKit         │
│                                                           │
│  Layer 2: CDM (Widevine L1) in hardware TEE              │
│    Decrypts in secure enclave → pixels never in RAM      │
│                                                           │
│  Layer 1: HDCP on display bus                            │
│    Blocks hardware capture cards                         │
└──────────────────────────────────────────────────────────┘
```

## Widevine Security Levels

| Level | Where Decryption Happens | Max Resolution |
| --- | --- | --- |
| L1 | Inside hardware secure enclave (TEE) | 4K HDR — for premium Netflix |
| L3 | In software — for rooted/unlocked devices | 480p or 720p (deliberately capped) |

## Theoretical Framework — Interview Talking Points

- Defense in Depth: No single layer is bulletproof. HDCP alone can be defeated with certain hardware. FLAG_SECURE alone can be bypassed on rooted devices. Widevine L1 alone requires hardware support. The stack works because an attacker must defeat ALL layers simultaneously.
- CAP Theorem (DRM License Revocation): License revocation is CP: Netflix prioritizes consistency (a revoked device cannot play) over availability (device gets 403 during pa