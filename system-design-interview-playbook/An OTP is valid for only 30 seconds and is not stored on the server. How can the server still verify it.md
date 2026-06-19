# An OTP is valid for only 30 seconds and is not stored on the server. How can the server still verify it?

**SIMPLE EXPLANATION — Read This First**

Short Answer: The server doesn't need to store the OTP because both the phone and the server do the SAME math at the SAME time using the SAME secret. They arrive at the same 6-digit number independently.

- Real-world analogy: Imagine you and a friend both have the same cookbook. You agree: "Every 30 seconds, we both open to the page number = minutes since midnight." You both see the same page without calling each other. That page number is the OTP.
- The shared secret (K): When you set up Google Authenticator (scan the QR code), you are receiving a secret key K. The server also stores this K. This is the ONLY time K is ever sent — setup time, never again.
- The time component (T): T = floor(current Unix time / 30). Both your phone and the server calculate T independently. Because they use the same clock, they get the same T.
- The math: OTP = last 6 digits of HMAC-SHA1(K, T). HMAC is a cryptographic function — same inputs always give same output. Server runs the same calculation, compares to what you typed.
- Clock drift tolerance: The server also checks T-1 and T+1 (±30 seconds). If your phone clock is slightly off, the code still works.
- Replay prevention: Server stores only "last T value used". If you try the same OTP twice in the same 30-second window, the server sees T ≤ last_used_T and rejects it.

**DEEP DIVE — Technical Architecture Below**

## The Math

```
  T = floor( unix_timestamp / 30 )       ← same on phone AND server
  OTP = Truncate( HMAC-SHA1(K, T) )      ← same result on both sides
```

```
  K = shared secret (set once at QR code scan)
  T = which 30-second window we are in
```

## Enrollment — The Only Time the Secret is Sent

```
  Phone                                     Server
  ─────                                     ──────
  Scans QR code                             Generates K (random 160 bits)
  ← receives K once ──────────────────────  Stores K encrypted in DB
  Stores K in Keychain/Keystore
```

```
  ✓ K is NEVER sent again after this point.
```

## Every Login — Verification Flow

```
  Phone                                     Server
  ─────                                     ──────
  T = floor(now / 30)                       T = floor(now / 30)
  OTP = HMAC-SHA1(K, T) → "482391"
```

```
  User types "482391" →─────────────────►  computes HMAC-SHA1(K, T)
                                           compares → MATCH → login OK
```

```
  No OTP was ever stored on the server.
```

## SMS OTP vs TOTP

|  | TOTP (Google Authenticator) | SMS OTP |
| --- | --- | --- |
| Server stores OTP? | NO — only shared secret K | YES — in Redis with TTL |
| Works offline? | Yes — pure math, no network | No — needs SMS delivery |
| SIM swap attack? | Not vulnerable | Critically vulnerable |
| Code transmission | Never transmitted after setup | Sent over SMS every login |

## Theoretical Framework — Interview Talking Points

- CAP Theorem: TOTP verification is CP. During a network partition, the server can still verify OTPs with no external dependency — just K and the clock. SMS OTP is AP: it prefers availability (best-effort SMS delivery) but consistency breaks when SMS fails.
- Stateless Design: TOTP enables stateless verification servers — any instance can verify any user's OTP given the encrypted secret. No coordination needed between servers. SMS OTP requires shared Redis for code storage. At scale, TOTP's statelessness is a major operational advantage.
