#!/usr/bin/env python3
"""
generate_toc.py — Regenerates README.md for the system-design-interview-playbook folder.

Scans all .md files in the same directory (skipping README.md, CLAUDE.md, and this
script itself), groups them by topic prefix, and writes a grouped Table of Contents.

Re-run this script whenever files are renamed or added:
    python generate_toc.py
"""

import os
import re
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
README_PATH = os.path.join(SCRIPT_DIR, "README.md")

SKIP_FILES = {"readme.md", "claude.md", "generate_toc.py"}

# Longest-prefix-first — sort by prefix length descending so more-specific
# prefixes match before shorter ones (e.g. "data-structures" before "data").
PREFIX_TO_TOPIC = [
    ("principal-engineer", "Principal Engineer / Architecture"),
    ("data-structures", "Data Structures"),
    ("microservices",   "Microservices"),
    ("idempotency",     "Concurrency"),
    ("concurrency",     "Concurrency"),
    ("reliability",     "Reliability"),
    ("streaming",       "Streaming"),
    ("vectordb",        "Vector DB"),
    ("security",        "Security"),
    ("incident",        "Incident Response"),
    ("payments",        "Payments"),
    ("pricing",         "Pricing"),
    ("caching",         "Caching"),
    ("scaling",         "Scaling"),
    ("video",           "Video Streaming"),
    ("auth",            "Auth"),
    ("rag",             "RAG"),
    ("ttl",             "TTL & Expiry"),
    ("drm",             "DRM"),
    ("git",             "Git Workflow"),
]
# Sort longest prefix first to ensure greedy matching
PREFIX_TO_TOPIC.sort(key=lambda x: len(x[0]), reverse=True)


def topic_for(filename):
    base = filename.lower()
    for prefix, topic in PREFIX_TO_TOPIC:
        if base.startswith(prefix):
            return topic
    return "Other"


def file_title(filepath):
    """Return the first non-blank line of a file, stripped of leading #/* chars."""
    try:
        with open(filepath, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    return re.sub(r'^[#*\s]+', '', line).strip()
    except OSError:
        pass
    return os.path.splitext(os.path.basename(filepath))[0]


def collect_entries():
    groups = defaultdict(list)
    for fname in sorted(os.listdir(SCRIPT_DIR)):
        if not fname.endswith(".md"):
            continue
        if fname.lower() in SKIP_FILES:
            continue
        fpath = os.path.join(SCRIPT_DIR, fname)
        topic = topic_for(fname)
        title = file_title(fpath)
        groups[topic].append((title, fname))
    # Sort entries within each group by filename
    for topic in groups:
        groups[topic].sort(key=lambda x: x[1])
    return groups


def render_readme(groups):
    lines = []
    lines.append("# System Design Interview Playbook\n")
    lines.append(
        "Concise, interview-ready deep-dives on system design, distributed systems, "
        "and engineering fundamentals. Every file covers one question end-to-end.\n"
    )

    lines.append("---\n")
    lines.append("## Table of Contents\n")

    for topic in sorted(groups.keys()):
        lines.append(f"### {topic}\n")
        for title, fname in groups[topic]:
            lines.append(f"- [{title}]({fname})\n")
        lines.append("\n")

    lines.append("---\n")
    lines.append("## Structure\n")
    lines.append(
        "Files follow a `<topic>-<slug>.md` naming convention so a flat directory "
        "listing clusters naturally by topic:\n"
    )
    lines.append("\n")
    lines.append("| Prefix | Topic |\n")
    lines.append("|--------|-------|\n")
    seen = set()
    for prefix, topic in sorted(PREFIX_TO_TOPIC, key=lambda x: x[1]):
        if topic not in seen:
            lines.append(f"| `{prefix}` | {topic} |\n")
            seen.add(topic)
    lines.append("\n")
    lines.append(
        "> **After renaming or adding files**, rerun `python generate_toc.py` "
        "from inside this folder to keep the README in sync.\n"
    )

    return "".join(lines)


if __name__ == "__main__":
    groups = collect_entries()
    content = render_readme(groups)
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    total = sum(len(v) for v in groups.values())
    print(f"README.md written — {total} files across {len(groups)} topics.")
