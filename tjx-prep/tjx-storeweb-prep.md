# TJX StoreWeb Modernization — Interview Prep

Role: Senior Staff Engineer – StoreWeb Modernization (TJX India, Hyderabad). JD: `Desktop\TJX\TJX_StoreWeb_JD.md`. Resume sent: `Desktop\TJX\Apoorv_Jain_Resume_TJX_StoreWeb_v6`.

## Table of Contents
- [Story 1 + 2 — The Wells Fargo Migration (full interview answer)](#story-1--2--the-wells-fargo-migration-full-interview-answer)
  - [Part 1 — Intro / setup](#part-1--intro--setup-40-sec)
  - [Part 2 — Portfolio triage with the 6 Rs](#part-2--portfolio-triage-with-the-6-rs-30-sec)
  - [Part 3 — The Strangler-Fig seam](#part-3--the-strangler-fig-seam-30-sec)
  - [Part 4 — Keeping data consistent: SQL Server CDC](#part-4--keeping-data-consistent-sql-server-cdc-60-90-sec)
  - [Part 5 — Cutover choreography](#part-5--cutover-choreography-45-sec)
  - [Part 6 — Governance, result, and lesson](#part-6--governance-result-and-lesson-30-sec)
- [Follow-up grill questions](#follow-up-grill-questions)
- [TJX bridge lines](#tjx-bridge-lines)

---

## Story 1 + 2 — The Wells Fargo Migration (full interview answer)

Tell it in this order. Each part stands alone, so you can stop wherever the interviewer cuts in. Full telling ≈ 4–5 min; short version = Parts 1, 3, 4 headline, 6.

### Part 1 — Intro / setup (~40 sec)
"At Wipro, I was the Application Architect on Wells Fargo's cloud migration programme. Wells Fargo had 500+ internal applications — employee-facing line-of-business apps, not customer-facing banking — most of them 8 to 15 years old: ASP.NET MVC and Web API on .NET Framework, AngularJS front ends, shared on-prem SQL Server databases, and Windows Services polling file shares for background work.

Every release was a big, risky, manual deployment; a schema change in a shared database meant negotiating with every team that touched those tables; background-job failures were invisible until a business user complained.

Because every app was internal, the scaling challenge wasn't unpredictable public traffic — employee load is predictable, business hours across US time zones. The challenge was portfolio scale: 500+ apps, shared databases, cross-app dependencies, inside a regulated bank that couldn't tolerate disruption to daily operations.

I owned the application and data-tier assessment, target-state architecture, migration sequencing, and the governance model. A delivery team with a tech lead per wave executed against it — none reporting to me."

### Part 2 — Portfolio triage with the 6 Rs (~30 sec)
"With 500+ apps, not everything deserves the same treatment, so the first step was triage. We inventoried dependencies and technical debt with Azure Migrate, then classified every app by business value and change frequency using the 6 Rs: retire what nobody used, retain what had to stay on-prem, rehost low-value stable apps as a plain lift-and-shift, replatform the middle tier onto App Service and Azure SQL, and reserve full refactoring — the Strangler-Fig path — for high-value apps that changed often, where the debt was actually costing us. That kept expensive refactoring effort where it paid back."

### Part 3 — The Strangler-Fig seam (~30 sec)
"For the refactor bucket, we didn't rewrite. We put Azure API Management — in internal VNet mode, since nothing was public — in front of both legacy and new endpoints and routed per route, not per release. Cutting over a route was a routing-rule change, not a redeploy, and rolling back was flipping it back. We sequenced high-value, low-complexity apps first and leaf nodes before hubs, so nothing moved before its dependencies were ready. Identity moved from on-prem AD to Entra ID via Azure AD Connect, so employees kept single sign-on throughout."

### Part 4 — Keeping data consistent: SQL Server CDC (~60–90 sec)
"The hardest seam was data, because these apps shared databases. If a new service owns a table but other legacy apps still read and write it, you can't just give the new service its own database — that's how you get two databases silently drifting apart.

We ran it in phases:
- **Phase 1 — read from legacy.** The new service first read directly from the legacy tables. One source of truth, fastest to ship.
- **Phase 2 — SQL Server CDC, one way.** We enabled Change Data Capture on the legacy tables. CDC reads the transaction log, so it captures every committed change — including writes from other legacy apps and batch jobs we didn't own — in commit order, with no change to legacy code. A sync process read the change tables by LSN range, applied idempotent upserts into the new Azure SQL store, and persisted its LSN watermark so it could resume exactly where it left off. Legacy stayed the source of truth.
- **Phase 3 — flip the write path.** Once reconciliation was clean, the new service took over writes, and we reversed the sync direction so legacy stayed current for the apps still reading it — and so rollback stayed possible. We tagged sync-originated writes so they weren't captured and echoed back, to prevent loops.
- **Phase 4 — retire.** After a 2–4 week bake with no rollback, we stopped the reverse sync and moved the remaining legacy readers onto the new API.

Underneath all of it was reconciliation: row counts and checksums per table and key range, compared on a schedule and before every cutover, with alerts on drift.

Why CDC rather than application dual-write? Dual-write means two writes that aren't atomic — one succeeds, one fails, and you drift with no record of it — and it means modifying old, fragile legacy code in every app that writes the table. CDC is log-based, ordered, replayable from a watermark, and needs no legacy code change. The trade-offs we managed: a few seconds of replication lag, CDC retention — if the reader stalls past the cleanup window you lose changes, so we alerted on lag — and schema changes needing a new capture instance."

### Part 5 — Cutover choreography (~45 sec)
"Internal-only helped here: we could schedule cutovers outside US business hours, when load was near zero. Each cutover followed a fixed runbook: confirm CDC lag near zero and reconciliation green, take a short write freeze, let in-flight work drain, run a final sync to zero lag, flip the APIM write routes to the new service, turn on reverse sync, run smoke tests, and watch dashboards through the next business day. Rollback was the same steps backwards: flip the route back — legacy was current because of reverse sync."

### Part 6 — Governance, result, and lesson (~30 sec)
"I didn't personally migrate 500 apps — the leverage was defining the target pattern once and putting an architecture review gate on every wave: observable by default, a rollback path defined before the wave started, reconciliation green before cutover. The result was a phased migration with zero unplanned downtime and no data loss.

The hardest part wasn't technical — it was stopping teams from 'modernizing everything while we're in there,' because that turns a low-risk wave back into a mini-rewrite."

---

## Follow-up grill questions

| They ask | Key points to hit |
|---|---|
| "How does SQL Server CDC actually work?" | Capture job reads the transaction log, writes before/after rows to change tables with an LSN per change; consumers query change functions by LSN range (all changes or net changes); cleanup job purges after a retention window. |
| "What if the sync process is down for a day?" | It resumes from its persisted LSN watermark — as long as retention covers the outage. That's why lag alerts fire well before retention runs out. |
| "How was the sync idempotent?" | Upsert keyed on the primary key, applied in LSN order; replaying a range produces the same end state. |
| "How did you stop reverse sync from echoing changes back?" | Sync writes were tagged (dedicated sync identity / origin marker) and filtered out of capture processing. |
| "What did reconciliation catch?" | Use a real example you remember. If none comes to mind, describe the class of issue it exists for (writes arriving through an unexpected path, a stalled reader) — reconciliation is what proves the sync, instead of trusting it. |
| "When would you use dual-write?" | Only with an outbox: write the business change and an outbox record in one local transaction, then publish asynchronously — never two independent writes from app code. |
| "Why not take downtime and do one big data migration?" | Shared tables meant other apps depended on them continuously; a big-bang data move has no rollback and validates nothing until the end. |
| "Did all 500 apps go Strangler?" | No — 6 Rs triage. Strangler only for high-value, high-change apps. |
| "Why internal APIM, not public?" | Employee-only apps — no public surface; internal VNet mode, private endpoints, on-prem reachability over ExpressRoute/VPN. |
| "How did scaling work?" | Predictable business-hours load → right-sized App Service plans with scheduled autoscale instead of peak provisioning. |

---

## TJX bridge lines
- "That's the playbook I'd bring to StoreWeb — the difference is thousands of stores with variable connectivity, so the data-sync problem extends to the edge."
- "StoreWeb almost certainly has the same shared-database coupling; CDC-based sync with reconciliation is how I'd extract domains like Inventory without a big-bang cutover."
- "Unlike Wells Fargo's internal apps, store traffic peaks are business-critical — so cutover windows would follow store hours per time zone, and rollout would go pilot stores → regional rings."
