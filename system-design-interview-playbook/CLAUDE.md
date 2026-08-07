# System Design Interview Repository — Project Instructions

Act as a System Design Interview Repository Creator. Process provided questions sequentially under these strict constraints:

## 1. Output Format
- All Q&A content lives in **one file**: `system-design-interview-answers.md`. This file is the **source of truth** — do **not** create a new `.md` file per question. For each new question, append:
  - A new `## <Question text>` section under the correct topic group in the body (see §5 for topic grouping and placement).
  - A matching `- [<Question text>](#<github-anchor-slug>)` entry in that topic's list inside the `## Table of Contents` section at the top of the file.
  - The anchor slug is GitHub's own heading-anchor algorithm: lowercase the heading text, strip everything that isn't a letter/digit/space/hyphen, then turn each remaining space into a hyphen (runs of hyphens are **not** collapsed — e.g. an em dash surrounded by spaces becomes `--`).
- Optionally, also generate a polished **`.docx`** export of the same content (color-coded headings, tables, code blocks, page breaks) for actual interview prep / printing, using the `docx` skill. The `.docx` is a derived artifact, not tracked in git (`.gitignore` excludes `*.docx`) — regenerate it from the `.md` if it goes stale.
- Within a question's section, render diagrams and command sequences as fenced code blocks (```), sub-headings as `###`/`####` (a question's own section heading is `##`, so everything inside it is nested one level deeper than it would be in a standalone file), and comparisons as markdown tables.

## 2. Deduplication
- Handle inputs idempotently. **Skip exact duplicates** — check `system-design-interview-answers.md` for the question text before adding.
- If a question is a variation of an existing one, **update the corresponding `##` section** to integrate the alternate phrasing rather than appending a new section.

## 3. Target Depth & Audience
- Write detailed, advanced architectures tailored for a **v17–18+ year Senior Staff / Principal Engineer**.
- Avoid entry-level summaries. Assume deep distributed systems knowledge.
- **Embed clear structural component diagrams** directly into the document (ASCII/text diagrams in fenced code blocks, or structured tables representing architecture layers).

## 4. Theoretical Frameworks
- Every answer **must include** an interview-ready section applying advanced distributed system theorems as strategic talking points. Relevant ones to consider:
  - **CAP Theorem** (Consistency, Availability, Partition Tolerance trade-offs)
  - **PACELC** (extends CAP with latency vs. consistency trade-off under normal operation)
  - **Write Amplification** (LSM trees, SSD implications, compaction costs, application-level fan-out)
  - **Read/Write trade-off analysis** (e.g., read-heavy vs. write-heavy workload design decisions)
  - **Execution trade-offs** (synchronous vs. asynchronous processing, fan-out strategies, etc.)

## 5. Topic Grouping
- Pick the topic group by subject matter (same buckets used throughout the file): Auth, Caching, Concurrency, Data Structures, DRM, E-Commerce, Git Workflow, Incident Response, Microservices, Payments, Pricing, Principal Engineer / Architecture, RAG, Reliability, Scaling, Security, Streaming, TTL & Expiry, Vector DB, Video Streaming.
- If a question doesn't fit any existing group, add a new `### <Topic>` group to the Table of Contents (alphabetically placed) and a matching question section in the body.

## 6. Git Workflow
- `system-design-interview-answers.md` is committed and pushed to `origin/main` after every update.
- `.docx` files are excluded via `.gitignore` — they are local artifacts only.
- Commit message format: `docs: add <topic> Q&A — <one-line description>`

## 7. Cowork Session Workflow (for Apoorv)
When running this from a Cowork session with screenshots of social media questions:
1. **Extract question text** from the screenshot.
2. **Check for duplicates** — `grep -i "<keyword>" system-design-interview-playbook/system-design-interview-answers.md`.
3. **Append the question** to `system-design-interview-answers.md` following rules 1–5 above (new `##` section + matching TOC entry, in the right topic group).
4. **Optionally create `.docx`** in `D:\Learning\Study Material\System Design\System Design Interview Questions and Answers\` using the `docx` skill (Node.js docx library via `node_modules/docx`).
5. **Commit and push** — stage only `system-design-interview-answers.md` (and `README.md`/`CLAUDE.md` if those also changed); exclude unrelated modified files.
   ```bash
   git add system-design-interview-playbook/system-design-interview-answers.md
   git commit -m "docs: add <topic> Q&A — <description>"
   git push
   ```

## 8. Scheduled Task
A daily scheduled task (`system-design-daily-processor`) runs at 9 AM to process any pending questions.
It is configured in the Cowork Scheduled sidebar.
