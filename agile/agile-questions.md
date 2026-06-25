# Agile Practices — Interview Preparation

---

## Definition of Ready (DoR) vs Definition of Done (DoD)

**Definition of Ready** — criteria a user story must meet BEFORE the team commits to it in a sprint.
```
A story is READY when:
✅ Acceptance criteria defined and understood by the team
✅ Story is estimated (story points assigned)
✅ Dependencies identified and resolved
✅ UI/UX mockups available (if applicable)
✅ No blockers or open questions
✅ Small enough to complete in one sprint

Capital Access example:
"As a tenant manager, I want to filter engagements by date range"
→ Ready when: filter fields defined, API contract agreed, mock available,
              estimated at 3 points, no dependency on unfinished auth work
```

**Definition of Done** — criteria every story must meet BEFORE it's considered complete.
```
A story is DONE when:
✅ Code written and reviewed (PR approved)
✅ Unit tests written and passing
✅ Integration tests passing
✅ Code coverage maintained (≥ 80%)
✅ No critical SonarQube issues
✅ Deployed to Dev environment
✅ Acceptance criteria verified by QA
✅ Documentation updated (if API changed)
✅ Product Owner sign-off

DoR = "can we start?"    DoD = "can we ship?"
```

---

## Estimation Techniques

### Story Points
Relative measure of effort/complexity — NOT hours.
- Team estimates how complex a story is relative to a reference story
- Accounts for complexity, uncertainty, and effort together
- Velocity: average story points completed per sprint → used for forecasting

### Planning Poker
```
1. PO reads the user story
2. Each team member picks a card (secretly)
3. All reveal simultaneously — avoids anchoring bias
4. Outliers explain their reasoning
5. Re-estimate until consensus (no need for exact match, close enough)
6. Benefits: team alignment, surfaces hidden complexity, everyone engaged
```

### Fibonacci Sequence in Story Points
```
1, 2, 3, 5, 8, 13, 21, 34, 55...

Why Fibonacci and not 1,2,3,4,5?
→ Reflects human uncertainty: the larger the task, the less precise the estimate
→ Gap between 13 and 21 forces acknowledgment of significant difference
→ If you debate between 8 and 9, the difference is meaningless for planning
→ Stories > 13 points should be split (too big for one sprint)

Capital Access: we use 1,2,3,5,8,13 — anything 13+ gets broken down
```

### T-Shirt Sizing
```
XS / S / M / L / XL / XXL

Used for: early-stage estimation, roadmap planning, epics (not individual stories)
Faster than Fibonacci — no debate between 5 and 8
Later converted to story points for sprint planning
```

### Ideal Days
```
How many days would this take if you worked on it uninterrupted with no meetings?
Less common — doesn't account for team dynamics, interruptions, or complexity
Story points are preferred
```

---

## Sprint Ceremonies

| Ceremony | When | Purpose |
|----------|------|---------|
| Sprint Planning | Start of sprint | Select stories, estimate, commit to sprint goal |
| Daily Standup | Every day | What did I do? What will I do? Any blockers? |
| Sprint Review | End of sprint | Demo working software to stakeholders |
| Sprint Retrospective | End of sprint | What went well? What to improve? |
| Backlog Refinement | Mid-sprint | Groom upcoming stories, clarify, estimate |
