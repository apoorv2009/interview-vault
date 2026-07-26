# Enterprise Modernization — Principal Engineer Leadership Question Bank (Reference)

**What this file is:** generic leadership/architecture questions with a framework for answering each — not pre-written fake stories. Where a real story from your vault fits, it's pointed to directly so you use your actual experience, not an invented one. See `behavioural/behavioural-answers.md` for the full real stories referenced here.

---

## Ownership & Architecture Governance

**"How do you own architecture for a system you don't have direct authority over every team building on?"**
*Framework:* separate "define the standard" from "enforce the standard." Definition is a design/writing exercise (a short doc, a reference implementation); enforcement works best as an objective gate (an architecture review checkpoint, a CI check) rather than a person having to personally approve every PR. Real material: the AIS Angular-standards-across-6-teams story, and the Wipro Cloud Migration Programme's governance-gate pattern (behavioural-answers.md, Story D and the Wipro story).

**"How do you decide what belongs in a shared platform/standard versus what each team should own independently?"**
*Framework:* shared when the cost of divergence is high (auth, observability, deployment pipeline shape — inconsistency here creates real operational risk) and low when the cost of divergence is low (internal implementation details within a team's own bounded context). Over-centralizing the latter creates unnecessary coordination overhead; under-centralizing the former creates the operational inconsistency a Principal Engineer is specifically supposed to prevent.

**"Tell me about a time you had to define an architecture with incomplete information."**
*Framework:* name the specific unknowns, describe how you designed for reversibility given those unknowns (a seam that could be changed later, a pilot before full rollout) rather than waiting for certainty that wasn't coming. Real material: the JTI-TERA offline-first sync story (Story E), or the Wipro Cloud Migration Programme's wave-based sequencing itself, which is inherently a bet under incomplete information about how each app in the portfolio will actually behave once touched.

## Influence Without Authority

**"How do you get multiple teams to align on a technical direction when you can't mandate it?"**
*Framework:* evidence over authority — a pilot with measured results beats an argument from seniority. Make adoption cheap (a starter template, a linting config) rather than costly (a rewrite), since teams say yes to low-friction asks even when unconvinced, and the results convince them afterward. Real material: Story D (AIS Angular standards across 6 teams).

**"Describe a disagreement with a peer at your level where you didn't have positional authority to just decide."**
*Framework:* agree in advance on what evidence would resolve it, rather than continuing to argue from priors — this reframes a disagreement from "whose opinion wins" to "what does the data say," which is resolvable, whereas the former often isn't. Real material: the Capital Access Service-Bus-vs-synchronous-call disagreement (behavioural-answers.md, Q16/Q26).

**"How do you handle a recommendation that gets rejected?"**
*Framework:* document the reasoning at the time (not to relitigate, but so it's available later), and don't keep pushing after a decision is made — if you were right, the evidence usually surfaces on its own, and having written it down earlier makes revisiting it easy rather than looking like hindsight. Real material: the Capital Access dedicated-database-rejected-then-revisited story (Q40).

## Engineering Strategy & Prioritization

**"How do you balance modernization work against feature delivery pressure?"**
*Framework:* avoid framing it as either/or — sequence debt-reduction work to run in parallel with feature work where possible (validate in the background, cut over without a freeze), and where a genuine trade-off exists, quantify the cost of *not* doing the modernization (rising incident rate, infrastructure cost, onboarding friction) so it's compared against feature value in the same terms instead of being an abstract "quality" argument. Real material: the AIS SQL-to-Azure-SQL-Managed-Instance migration run in parallel with feature delivery (Q5, Q30).

**"How do you decide the sequencing of a multi-quarter modernization roadmap?"**
*Framework:* dependency-map first (what blocks what), then within the resulting order, prioritize by business-value/technical-complexity — high-value, low-complexity pieces first to build momentum and prove the approach, genuinely hard or low-value pieces last or explicitly descoped. See `01-architecture-and-migration-strategy.md` section 3 for the full sequencing logic.

**"How do you know when a modernization programme is actually done, or when to call it good enough?"**
*Framework:* tie "done" to measurable exit criteria defined at the start (every module through the routing seam, legacy code path fully retired, or a defined subset explicitly descoped with a documented reason) rather than an open-ended "keep improving" — an unscoped modernization effort never has a moment where stakeholders can confidently say it succeeded.

## Modernization-Specific Leadership

**"How do you convince a skeptical stakeholder that a migration is worth the risk and cost?"**
*Framework:* lead with the cost of the status quo in terms they already track (infrastructure spend, incident frequency, time-to-ship), not with a technical purity argument — "this reduces our infrastructure cost by X and lets us ship features Y% faster" lands with a business stakeholder in a way "this is cleaner architecture" doesn't. Real material: the AIS migration ROI framing (Q5), the Capital Access bundle-size business-impact framing (Q20).

**"How do you handle a team that's resistant to changing patterns they're comfortable with?"**
*Framework:* resistance is often really "I don't trust this won't break something" — address the trust gap directly (a scoped trial, a measured comparison, an easy rollback), rather than arguing the technical merits harder. Real material: Story A (AI-adoption trial with measured comparison), the AIS pilot-team pattern (Story D).

**"What's your approach to mentoring engineers through a modernization effort, specifically?"**
*Framework:* the skill gap in a modernization is usually conceptual (a new mental model — async streams instead of promises, unidirectional data flow instead of two-way binding), not syntactic — teach the mental model explicitly on a worked example before handing off ownership, rather than expecting the new pattern to be absorbed from a migration guide alone. See `02-frontend-and-backend-migration-mechanics.md` for the specific conceptual shifts worth calling out by name (Angular standalone components, RxJS observables vs. promises, explicit middleware pipeline).

## Production Excellence

**"How do you build a culture where production readiness isn't an afterthought?"**
*Framework:* make readiness criteria a gate, not a checklist someone might skip under deadline pressure — health checks, rollback plan, and monitoring wired up as conditions of a release being marked deployable, enforced by the pipeline itself rather than trusted to a person remembering.

**"Tell me about driving an observability investment before there was a specific incident forcing it."**
*Framework:* frame the cost of *not* having it — mean-time-to-diagnose without correlation IDs/tracing versus with it — as the business case, since "we might need this someday" rarely wins budget on its own, but "our last three incidents each took 4+ hours to diagnose because we couldn't trace a request across services" does. Real material: the Capital Access correlation-ID/Application Insights story (Q12).

**"How do you run an incident postmortem so the same failure mode doesn't recur?"**
*Framework:* the postmortem output should be a specific, assigned, trackable change (a code-review checklist item, a new alert, a pagination fix) — not just a narrative of what happened. A postmortem that ends at "we understand what went wrong" without a structural change is a missed opportunity. Real material: the Capital Access production-outage postmortem (Q24).

**"How do you decide what deserves a page versus just a logged event?"**
*Framework:* whether it requires action right now, from a specific person, immediately — anything else is a dashboard metric or a next-business-day review item. Over-paging trains people to ignore the channel, which is how a real incident gets missed later. See `03-engineering-excellence-observability-security.md` section 5.

## Closing the Interview Strong

**"What would you do in your first 90 days on a legacy modernization programme like this one?"**
*Framework, in order:* (1) establish an observability baseline on the *legacy* system first, so "is the new system actually better" is measurable, not assumed; (2) inventory and dependency-map the application portfolio; (3) pick one high-value, low-complexity module as the first Strangler wave, to prove the pattern end-to-end (routing seam, rollback, bake period) before scaling it across the whole portfolio; (4) only then build the multi-quarter roadmap, informed by what the first wave actually taught you — not before.
