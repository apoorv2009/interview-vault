# System Design Interview Repository — Project Instructions

Act as a System Design Interview Repository Creator. Process provided questions sequentially under these strict constraints:

## 1. Output Format
- Generate exactly **one dedicated `.md` file per question**, named after the question text. This `.md` file is the **source of truth** and is what gets committed to git (this folder is a git repo — see `README.md`).
- Optionally, also generate a polished **`.docx`** export of the same content (color-coded headings, tables, code blocks, page breaks) for actual interview prep / printing, using the `docx` skill. The `.docx` is a derived artifact, not tracked in git (`.gitignore` excludes `*.docx`) — regenerate it from the `.md` if it goes stale.
- In the `.md`, render diagrams and command sequences as fenced code blocks (```), headings as `#`/`##`/`###`, and comparisons as markdown tables. Color-coding from the docx version doesn't carry over to markdown — use headings/bold/tables for structure instead.

## 2. Deduplication
- Handle inputs idempotently. **Skip exact duplicates.**
- If a question is a variation of an existing one, **update the corresponding file** to integrate the alternate phrasing rather than creating a new file.

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

## 5. File Naming
- Use a `<topic>-<slug>.md` convention so files cluster naturally by topic in directory listings. Examples:
  - `auth-jwt-401-debugging.md`
  - `microservices-insurance-order-fanout.md`
  - `ecommerce-inventory-inconsistency.md`
- After adding files, update `README.md` TOC manually (or run `python generate_toc.py`).

## 6. Git Workflow
- All `.md` files are committed and pushed to `origin/main` after creation.
- `.docx` files are excluded via `.gitignore` — they are local artifacts only.
- Commit message format: `docs: add <slug> — <one-line description>`

## 7. Cowork Session Workflow (for Apoorv)
When running this from a Cowork session with screenshots of social media questions:
1. **Extract question text** from the screenshot.
2. **Check for duplicates** — `ls system-design-interview-playbook/ | grep -i <keyword>`.
3. **Create the `.md` file** in `system-design-interview-playbook/` following rules 1–5 above.
4. **Optionally create `.docx`** in `D:\Learning\Study Material\System Design\System Design Interview Questions and Answers\` using the `docx` skill (Node.js docx library via `node_modules/docx`).
5. **Update `README.md` TOC** — add to the correct section, or create a new `### Section` if the topic is new.
6. **Commit and push** — stage only the new/updated `.md` and `README.md`; exclude unrelated modified files.
   ```bash
   git add system-design-interview-playbook/<new-file>.md system-design-interview-playbook/README.md system-design-interview-playbook/CLAUDE.md
   git commit -m "docs: add <slug> — <description>"
   git push
   ```

## 8. Scheduled Task
A daily scheduled task (`system-design-daily-processor`) runs at 9 AM to process any pending questions.
It is configured in the Cowork Scheduled sidebar.
