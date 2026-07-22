# How to Study This Repo — Fixing "I Know It But Can't Explain It"

**The problem this guide addresses**: understanding a topic well enough to recognize a correct answer when reading it is not the same skill as generating that answer out loud, from scratch, under interview pressure. This repo is full of polished written answers — reading them builds recognition, not retrieval. This guide is about closing that specific gap.

---

## Why This Happens (it's not a knowledge problem)

**Recognition vs. recall.** Reading a good answer and generating one from scratch under pressure are two different cognitive skills. Recognizing an answer as correct feels like understanding, and it is a real form of understanding — but it doesn't train verbal, real-time retrieval, which is a separate skill entirely.

This has a name in cognitive psychology: the **illusion of explanatory depth** — people consistently overestimate how well they understand something until forced to explain it out loud, step by step, without notes. The moment you try to speak it, you discover exactly where the understanding was actually thin. That's not a personal flaw — it's how understanding feels from the inside for everyone, until it's been tested by speaking it.

Layer on top of that: **interview pressure consumes working memory**. Cognitive bandwidth that would normally organize a clean answer gets spent managing nerves instead — which is exactly why rambling ("so... I mean... so that means...") shows up heavily even on topics genuinely well understood (see [recording-5-verdict-and-drill.md](recording-5-verdict-and-drill.md) — the Saga pattern answer was strong in content, weak in delivery, for exactly this reason).

---

## The Fix — Train Retrieval, Not Recognition

### 1. Stop re-reading. Start reciting from memory, out loud.
Re-reading a file in this repo feels productive but is passive — it's recognition, not retrieval. The actual training exercise: **close the file, say the answer out loud from memory, then open the file and check what was missed.** This single change — closing the tab before speaking — is the highest-leverage fix available.

### 2. Record yourself and listen back.
Uncomfortable, but the fastest way to hear filler words and false starts — because in the moment of speaking, they're not perceptible (the brain is busy generating the next sentence), but on playback they're obvious. This is exactly how a real interview recording becomes useful for debrief, per the [mock-interview-debrief](.) folder's whole purpose.

### 3. Use a fixed structural template so structure and content aren't both being invented live.
Under pressure, simultaneously figuring out *what* to say and *how to organize* saying it doubles the cognitive load — which is exactly what produces rambling. Fix: pre-commit to a shape and drill it until automatic, so under pressure only the content needs filling in, not the structure:
```
DEFINITION → PROBLEM → SOLUTION → EXAMPLE → TRADE-OFF
```
(This is the same shape used throughout [design-patterns-questions.md](../design-patterns/design-patterns-questions.md)'s "How to Answer Any Pattern Question" section, and the "Say this first" one-liners throughout [recording-5-verdict-and-drill.md](recording-5-verdict-and-drill.md).)

### 4. Train under mild pressure, not just calm review.
This is *state-dependent retrieval* — a skill trained calmly, alone, at a desk doesn't automatically transfer to a stressed, evaluated, real-time setting. Retrieval has to be rehearsed under conditions that resemble the real thing: timed, out loud, ideally with someone (or an AI) actually pushing back — not just read silently.

### 5. Get quizzed out of order, not in the sequence things were written.
Reviewing a file top to bottom repeatedly builds fluency with the *sequence*, not genuine on-demand retrieval from a random cue — which is exactly what a real interviewer does (they never ask in the order studied). Get quizzed in random order, ideally with follow-up pressure layered on top, the way a real interviewer pushes on an initial answer.

### 6. After reading a polished answer, close it and rewrite the opening line unaided.
Reading a well-constructed answer and being able to construct an equally good one live, under your own generation, are different skills. The fix: after reading the "Say this first" line for any question, close it, and try to say your own version from memory — even if it's rougher. The effort of reconstructing it is what builds the retrieval pathway. Comparing to the polished version afterward is useful; skipping straight to reading it every time isn't.

---

## A Suggested Weekly Rhythm

```
Pass 1 (new material):  Read the question + answer once. Understand it.
Pass 2 (next day):      Close the file. Say the answer out loud from memory.
                         Open the file, compare, note the gap.
Pass 3 (few days later): Get quizzed on it out of order — by a mock interview
                         tool, a peer, or an AI roleplay — with follow-up
                         pressure, not just the original question restated.
Pass 4 (before the real interview): Record yourself answering it once, live,
                         under a timer. Listen back once. Fix ONE delivery
                         habit at a time — don't try to fix everything at once.
```

---

## The Reassurance

This gap is extremely common for strong senior engineers specifically — the day-to-day job is *doing* the work, not *narrating* it to an evaluator in real time under a clock. The knowledge being present isn't in question; what's missing is rehearsal reps of retrieval-under-pressure specifically. That's fully trainable, and it typically closes fast with deliberate out-loud practice, because it's a performance skill layered on top of real knowledge — not a knowledge deficit underneath a performance skill.
