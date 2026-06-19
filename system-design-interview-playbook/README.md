# System Design Interview Playbook

A personal repository of advanced system design interview questions and answers, written at a Senior Staff / Principal Engineer depth.

## Structure

- One markdown file per question, named after the question text.
- Each answer includes: a plain-language explanation, an architecture deep dive with text/ASCII diagrams, and a theoretical frameworks section (CAP, PACELC, write amplification, read/write trade-offs, execution trade-offs) as interview talking points.

## Source of truth

Markdown (`.md`) is the source of truth here — plain text diffs cleanly in git, merges without binary conflicts, and is greppable. Polished `.docx` exports (color-coded headings, styled tables) can be generated from these files on demand for actual interview prep, but are not tracked in this repo (see `.gitignore`).

## Conventions

See `CLAUDE.md` for the full authoring rules (file naming, deduplication, depth target, required sections).
