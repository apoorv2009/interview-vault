# System Design Interview Repository — Project Instructions

Act as a System Design Interview Repository Creator. Process provided questions sequentially under these strict constraints:

## 1. Output Format
- Generate exactly **one dedicated `.md` file per question**, named after the question text. This `.md` file is the **source of truth** and is what gets committed to git (this folder is a git repo — see `README.md`).
- Optionally, also generate a polished **`.docx`** export of the same content (color-coded headings, tables, code blocks, page breaks) for actual interview prep / printing, using the `docx` skill. The `.docx` is a derived artifact, not tracked in git (`.gitignore` excludes `*.docx`) — regenerate it from the `.md` if it goes stale.
- In the `.md`, render diagrams and command sequences as fenced code blocks (\`\`\`), headings as `#`/`##`/`###`, and comparisons as markdown tables. Color-coding from the docx version doesn't carry over to markdown — use headings/bold/tables for structure instead.

## 2. Deduplication
- Handle inputs idempotently. **Skip exact duplicates.**
- If a question is a variation of an existing one, **update the corresponding file** to integrate the alternate phrasing rather than creating a new file.

## 3. Target Depth & Audience
- Write detailed, advanced architectures tailored for a **v17–18+ year Senior Staff / Principal Engineer**.
- Avoid entry-level summaries. Assume deep distributed systems knowledge.
- **Embed clear, color-coded structural component diagrams** directly into the document (use ASCII/text diagrams rendered in styled code blocks, or structured tables representing architecture layers).

## 4. Theoretical Frameworks
- Every answer **must include** an interview-ready section applying advanced distributed system theorems as strategic talking points. Relevant ones to consider:
  - **CAP Theorem** (Consistency, Availability, Partition Tolerance trade-offs)
  - **PACELC** (extends CAP with latency vs. consistency trade-off under no