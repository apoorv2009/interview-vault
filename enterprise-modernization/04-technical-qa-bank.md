# Enterprise Modernization — 75-Question Technical Bank (Reference)

Generic "how would you approach this" technical Q&A — trade-offs and alternatives included. Not tied to a specific claimed personal incident; use for fluency and to reason from principles under follow-up questioning.

---

## Migration Strategy & Strangler Pattern (1-10)

**1. Why choose incremental modernization over a full rewrite?**
A rewrite bets the whole programme on a single, late cutover with no production feedback until the end; incremental modernization validates the target architecture in small, reversible increments while the legacy system keeps serving traffic. The trade-off is timeline — incremental is usually slower to fully complete — for a large reduction in blast radius per mistake.

**2. When would a full rewrite actually be the right call?**
When the system is small enough that a rewrite's timeline is genuinely short, when the legacy system is already effectively decommissioned in spirit (low traffic, about to be replaced by a different product entirely), or when the legacy codebase is so entangled that incremental extraction costs more engineering effort than a clean rebuild — rare in practice for large, live, revenue-critical systems.

**3. How do you sequence which modules migrate first?**
Dependency-map the portfolio, then prioritize high-business-value/low-technical-complexity modules first — they validate the pattern and deliver visible wins early. Leaf modules (few dependents) move before hub modules (many dependents), since a hub's consumers need to be ready first or it bottlenecks the whole programme.

**4. What's the biggest risk in the Strangler Fig data layer?**
Splitting the database too early, before establishing a sync mechanism — this creates silent data drift between old and new stores. The safer sequence is: new service reads shared tables directly first, then add sync (CDC or dual-write), then cut the write path over, and only then consider a fully separate store.

**5. How do you decide when to retire the legacy code path for a migrated module?**
Only after the new path has run under full production load for a defined bake period (commonly 2-4 weeks) with zero rollbacks — not immediately on cutover. Retiring too early removes the rollback safety net before you've actually proven you don't need it.

**6. How does API Management fit into a Strangler migration?**
It's the routing seam — a gateway in front of both legacy and new endpoints, routing per-route (not per-release) to whichever implementation currently owns that route. This is what makes cutover a config change (flip a routing rule) instead of a coordinated deployment.

**7. What's the rollback plan if a newly migrated module regresses in production?**
Flip the gateway routing rule for that specific route back to legacy — no redeploy needed, because the seam already knows how to reach both implementations. This is why the routing-seam pattern is preferred over a hard cutover with no seam.

**8. How do you handle a shared database table that three different modules still write to mid-migration?**
Identify which module should ultimately own that table, migrate the others to call that module's API instead of writing directly, one consumer at a time — effectively Strangler-Figging the data-write path itself, not just the API surface.

**9. What's the argument against "lift and shift" as the whole modernization strategy?**
It moves hosting risk (off aging on-prem hardware) without touching any of the actual technical debt — monolithic deployability, shared database, no automated testing, minimal observability all remain exactly as they were, just now running on a VM in Azure instead of on-prem.

**10. How do you keep business stakeholders confident during a multi-quarter incremental migration?**
Ship visible value every wave, not just at the end — each migrated module should be independently better (faster, more reliable, or newly testable) so stakeholders see continuous progress rather than a long quiet period followed by a single big reveal.

## AngularJS → Angular (11-20)

**11. What's the hybrid/ngUpgrade approach and why use it over a full separate rewrite?**
`@angular/upgrade/static` runs both frameworks in the same browser session, letting components interoperate via up/downgrade adapters, so shared state (auth session, user context) doesn't need to be duplicated across two separate apps during the transition. The cost is a real bundle-size/performance overhead while both frameworks run together — explicitly temporary infrastructure, removed once migration completes.

**12. Why is two-way `$scope` binding the hardest part of an AngularJS migration, not just a syntax change?**
It allows a controller to be mutated from multiple places (child directives, watches, async callbacks) with no explicit data-flow contract — migrating to Angular's `@Input()`/`@Output()` model forces an explicit, unidirectional contract, which usually means redesigning the component's responsibilities, not just translating syntax.

**13. What's the migration order — components, services, or routes first?**
Leaf components first (few dependencies, low coordination cost), shared services next (once downgraded/upgraded, dependents can migrate independently), routes last — switching the router to hand off migrated sections to Angular's router while `ngRoute`/`ui-router` still serves the rest.

**14. How do you handle authentication across the hybrid AngularJS/Angular boundary?**
Keep the token in a framework-agnostic store (cookie or `localStorage`), not inside either framework's internal state, with a single downgraded/upgraded auth service as the one source of truth for "is the user authenticated" — regardless of which framework rendered the current view.

**15. How does lazy loading actually reduce load time, mechanically?**
Angular's `loadChildren` splits feature modules into separate bundles fetched only on navigation to that route, instead of AngularJS's typical single-bundle-for-everything — so a user's initial load only downloads the code for the section they're actually using, not the entire application.

**16. What replaces `$http`/`$resource`, and what's the real migration challenge there?**
`HttpClient` returning RxJS observables — the challenge isn't syntax, it's the mental model shift from promise-based single-value async to observable streams, especially around cancellation (`unsubscribe`) and operators (`switchMap`, `debounceTime`) replacing manually-written debounce/throttle logic.

**17. How do route guards replace AngularJS's ad-hoc auth checks?**
`CanActivate` guards centralize authorization at the router level instead of each controller independently checking a token or role — a single point of truth for "can this user reach this route" instead of duplicated checks scattered through controllers.

**18. What are shared libraries for in this migration, and what goes in them?**
Cross-cutting UI components (buttons, form controls, layout shells) and cross-cutting services (auth, API client wrappers, HTTP error interceptors) extracted into a shared library consumed by every feature module — replacing code that was often copy-pasted or globally scoped in the AngularJS app.

**19. When would you choose a fully separate rewrite over the ngUpgrade hybrid approach for the frontend?**
When the migration is bundled with a full UX redesign anyway — if the new UI doesn't resemble the old one, there's little shared-component value to preserve, so the hybrid bridge's complexity isn't worth paying for.

**20. How do you validate that a migrated Angular component is functionally equivalent to its AngularJS predecessor before cutover?**
Side-by-side behavioral testing against the same test data/scenarios (ideally automated E2E coverage of the specific route), plus a feature-flagged gradual rollout so a small percentage of real traffic validates the new component before it's the only path.

## ASP.NET Framework → ASP.NET Core (21-30)

**21. What's the conceptual shift in the middleware pipeline, not just the syntax?**
`HttpModules`/`HttpHandlers` configured in `web.config` execute via an opaque IIS pipeline; ASP.NET Core's `app.UseX()` calls in `Program.cs` make pipeline order explicit and visible in one place — exception handling, auth, routing order become a deliberate, reviewable decision instead of implicit IIS-module ordering.

**22. Why does moving to built-in DI matter beyond just removing a third-party package?**
Framework apps often mix container-resolved and directly-`new`ed dependencies inconsistently; ASP.NET Core's `IServiceCollection` makes constructor injection the only path, which is a forcing function for testability — anything not injected can't be easily mocked.

**23. What's the practical benefit of the Options pattern over `web.config` `appSettings`?**
Strongly-typed, validated configuration — misconfiguration surfaces as a startup failure via `IValidateOptions<T>`, not as a runtime error the first time that setting is actually used, which could be days after a bad deploy.

**24. How do you handle authentication continuity during the migration, when legacy uses Forms Auth and the new API uses JWT?**
Either have the legacy app also issue/accept the same JWT format, or put both behind a shared auth gateway that normalizes to one token format for downstream consumers — the goal is one source of truth for "is this request authenticated," not two parallel auth systems.

**25. Why does API versioning become mandatory once Strangler Fig migration is in play, when it might have been optional before?**
The API gateway's routing seam needs to route `v1` calls to legacy and `v2` to the new service unambiguously — versioning is the mechanism the routing seam depends on, not a nice-to-have.

**26. What's the trade-off between an in-process `BackgroundService` and Service Bus + Function consumer for background work?**
`BackgroundService` is simpler with no extra infrastructure, but scales and fails with the web app — restarting or scaling the app restarts/impacts the background work too. Service Bus + Function decouples scaling and survives app redeploys, at the cost of added infrastructure and operational complexity.

**27. What does "structured logging" actually mean, concretely, versus what Framework apps typically had?**
`logger.LogInformation("Order {OrderId} processed", orderId)` produces a queryable field (`OrderId`) in the log backend, not just a formatted string — turning "find every log line for this order" into a structured query instead of a text search that breaks if the message format ever changes.

**28. Why move validation into FluentValidation instead of `ModelState.IsValid` checks scattered in controllers?**
Centralizes validation logic per model in one discoverable, testable place, instead of duplicating (and potentially inconsistently reimplementing) validation rules across every action that accepts that model.

**29. What's the practical value of `ProblemDetails` (RFC 7807) over a Framework app's typical error handling?**
A structured, machine-parseable error response (`type`, `title`, `status`, `detail`, `traceId`) that API consumers can handle programmatically, versus an HTML error page or an inconsistent ad-hoc JSON shape per controller — and the `traceId` links directly to the request's distributed trace for debugging.

**30. How do you migrate a Windows Service that polls a file share, specifically?**
Replace the polling loop with an event-driven trigger — a Blob Storage "blob created" trigger on an Azure Function if the file share is being replaced with Blob Storage, or a Service Bus message if the trigger is really "another part of the system finished its work" rather than "a file appeared."

## Azure Architecture & Service Selection (31-40)

**31. Why App Service over AKS for most of a legacy .NET modernization?**
App Service removes OS/patching ownership and gives built-in deployment slots for blue-green with no extra tooling. AKS adds real value once the team has genuine multi-service orchestration needs and existing Kubernetes operational maturity — introducing it *during* a legacy modernization multiplies risk for limited incremental benefit at moderate scale.

**32. Why migrate the application tier before the database tier, generally?**
Database migration introduces cutover risk (data sync, downtime windows) that's better absorbed once the Strangler routing seam is already proven at the application layer — sequencing the riskier move second, once the pattern and rollback mechanics are validated on lower-risk moves.

**33. Managed Instance vs. single database for Azure SQL — how do you decide?**
Managed Instance for close on-prem SQL Server feature compatibility (cross-database queries, SQL Agent jobs, certain security features) when the legacy app depends on those; single database (cheaper, simpler) when the app's SQL Server usage is already fairly standard and portable.

**34. When is Service Bus justified versus a simpler alternative?**
When work needs to survive a process restart, needs guaranteed delivery, or needs to decouple a slow consumer from a fast producer. A simple scheduled task that just needs to run reliably is often better served by a Function on a Timer trigger — Service Bus isn't a blanket replacement for every background job.

**35. When would you *not* introduce Azure Functions for background work?**
For latency-sensitive or continuously busy workloads — cold-start latency and execution-time limits make Functions a poor fit there; a hosted background worker (`BackgroundService` or a dedicated App Service) is better suited to constant, latency-sensitive load.

**36. What has to be true before API Management earns its complexity?**
Enough services and enough external consumers that inconsistent per-service API conventions (versioning, rate limiting, auth) become the actual pain point — introducing APIM for a two-service system is usually premature.

**37. When do you introduce Azure Front Door, and why not immediately?**
Once there's a real need for global routing, WAF, or multi-region failover — typically driven by DR requirements. For a single-region enterprise app, it's often deferred until DR planning makes it necessary rather than adopted reflexively.

**38. Why introduce Key Vault before the rest of the migration even starts?**
It's high-value, low-risk, and independent of everything else — centralizing secrets out of `web.config`/`appsettings.json` removes a real security liability (secrets in source-control history, duplicated across servers) regardless of what else has or hasn't migrated yet.

**39. How do you decide between Blob Storage and keeping file shares?**
File shares are usually just unstructured storage with extra operational overhead (Windows file server patching, backup, access management); Blob Storage removes that overhead with minimal application-code impact, making it a low-risk, high-value early move.

**40. What alternatives would you reject, and why, for the data-layer split?**
Rejecting a full database-per-service split from day one, in favor of shared-database-with-sync-then-split — splitting too early either duplicates data with no sync (drift risk) or blocks migration on solving distributed-data problems before there's evidence the service boundary is even right.

## Observability (41-48)

**41. Why is Application Insights usually the first observability investment?**
It auto-instruments HTTP requests, dependency calls, and exceptions with minimal setup, giving request-level visibility almost immediately — the fastest way to establish a monitoring baseline before deeper custom instrumentation.

**42. What problem do correlation IDs actually solve?**
They turn "search three services' separate logs and manually match timestamps" into "search one ID and see the request's full journey" — generated at the edge, propagated via a header through every downstream call, and stamped on every structured log line.

**43. What's the difference between correlation IDs and distributed tracing?**
Correlation IDs are the mechanism; distributed tracing is the capability they enable — a single trace view showing every hop a request took, with per-hop latency, so "which service in the chain is slow" is a direct answer instead of a guess.

**44. What makes a log "structured" versus just detailed?**
Typed fields (`{OrderId}`, `{DurationMs}`) that are independently queryable in the log backend, versus a formatted string that requires text search and breaks if the message format changes — structured logging is what makes "show me every failed order for this user in the last hour" a query, not a grep.

**45. What should a health check endpoint actually check?**
The app's real dependencies (database reachable, downstream service reachable, disk space) — not just "the process is running," since a process that's up but can't reach its database is not actually healthy and shouldn't stay in the load balancer's rotation.

**46. How many dashboards should a team maintain, and why?**
A small number, each purpose-built per audience — an on-call dashboard (error rate, latency, saturation), a business dashboard, a cost dashboard — rather than one sprawling dashboard trying to serve everyone, which in practice serves no one well.

**47. What's the criterion for whether something should page someone, versus just log?**
Whether it requires action right now. An alert that doesn't require someone to act immediately is noise that trains the team to ignore the channel — which is exactly how a genuinely important alert gets missed later.

**48. How does distributed tracing change the root-cause-analysis process?**
It replaces manually reconstructing a timeline from disconnected per-server logs with following one correlation ID through an end-to-end transaction view — RCA becomes "read the trace," not "detective work."

## CI/CD & Production Readiness (49-56)

**49. What are the essential stages of a production-grade CI/CD pipeline?**
Build → test → static-analysis gate → deploy-to-staging → automated smoke test → manual approval gate (for production) → deploy-to-production — triggered on every merge, not run manually per release.

**50. Why Infrastructure as Code instead of manually configuring Azure resources?**
Reproducibility and reviewability — "what does production actually look like" is answered by reading source control (and every change goes through PR review) instead of auditing the portal, where drift between environments accumulates invisibly.

**51. How does a blue-green deployment via App Service slots actually work, mechanically?**
Deploy the new version to a staging slot, run automated smoke tests against it while production traffic still hits the current slot, then swap — the swap is near-instantaneous and trivially reversible (swap back) if something's wrong.

**52. What's the difference between a feature flag and an environment-specific config value?**
A feature flag toggles behavior at runtime for specific users/percentages without a redeploy, decoupling deployment from release; environment config is fixed per environment at deploy time. Flags are what let you deploy a new implementation dark and validate it gradually under real traffic.

**53. Why must a database migration be backward-compatible with the previous app version for at least one release?**
So code and schema can be rolled back independently — if a release deploys code and migrates schema in a way the old code can't run against, you lose the ability to roll back code without also reverting the schema, which removes your fastest recovery option during an incident.

**54. What's wrong with environment-specific `if` branches in code (`if (environment == "Production")`)?**
The same binary should be deployable to any environment unchanged, with only configuration differing — environment-specific logic in code means you're not actually testing the same artifact you'll deploy to production, undermining the whole point of a staging environment.

**55. Why does an incident-response runbook need to exist before an incident, not be written during one?**
The first time someone encounters a given failure mode is the worst time to be inventing the response process from scratch, under pressure, often at 2am — the runbook needs to already answer "what do I check first" before that moment.

**56. What makes a DR plan trustworthy versus theoretical?**
It's been tested via an actual failover drill, not just documented — an untested DR plan is a hypothesis about what would happen, not a demonstrated capability, and failover mechanics have a way of breaking in ways nobody predicted until they're actually exercised.

## Security (57-64)

**57. Why move from Forms Authentication to Azure AD / Entra ID OIDC?**
Centralizes identity management on a standard, well-audited platform instead of custom authentication code the team has to secure and maintain themselves — and it's a prerequisite for consistent auth across a growing number of services, rather than each one reimplementing its own.

**58. What's the difference between the OAuth flows used for a SPA versus service-to-service calls?**
Authorization-code flow with PKCE for the Angular SPA (a public client, no stored secret) versus client-credentials flow for service-to-service calls (a confidential client that can hold a secret or, better, use Managed Identity instead of a secret at all).

**59. What does JWT validation actually check, and why does each check matter?**
Signature (was this token actually issued by our identity provider, not forged), expiry (is it still valid), audience (was it issued for this specific API, not a different one), and issuer (did it come from the expected identity provider) — skipping any one of these opens a specific, real attack.

**60. What problem does Managed Identity solve that a stored service-principal secret doesn't?**
It eliminates the entire class of "a secret expired and nobody rotated it" incidents — Azure manages the identity's credential lifecycle itself, so the application never stores, or needs to rotate, a credential for talking to other Azure resources.

**61. How do Key Vault references in App Service configuration actually work?**
The App Service configuration holds a reference (`@Microsoft.KeyVault(...)`), not the secret itself; at runtime, App Service fetches the current value from Key Vault using its Managed Identity — the secret is never baked into a deployment artifact or visible in the portal's configuration blade as plaintext.

**62. What's the difference between resource-level RBAC and application-level RBAC, and why do you need both?**
Resource-level RBAC controls what a service's identity can do to Azure resources (least-privilege Key Vault/SQL access); application-level RBAC controls what an authenticated user can do within the application (role/claim-based endpoint authorization) — one without the other leaves either the infrastructure or the application layer unprotected.

**63. Why is `[Authorize(Policy = ...)]` preferred over scattered `if (user.Role == "Admin")` checks?**
Centralizes authorization logic into named, testable policies defined once, instead of duplicating (and potentially inconsistently reimplementing) role checks across every endpoint that needs them — a policy change updates one place, not every scattered check.

**64. How does automated secret rotation actually avoid requiring a redeploy?**
The application fetches the current secret value from Key Vault at runtime (via Managed Identity) rather than reading it once at startup and caching it indefinitely — so when Key Vault rotates the underlying credential, the next fetch simply returns the new value.

## Performance (65-70)

**65. What's the actual mechanism behind async/await fixing a "slow under load, CPU low" symptom?**
Blocking calls (`.Result`, `.Wait()`) tie up thread-pool threads that could otherwise serve other requests; under load, the thread pool exhausts and requests queue waiting for a free thread even though the CPU itself isn't saturated — converting to true async frees threads to serve other work while waiting on I/O.

**66. Why can adding indexes based on a guess actually make things worse?**
Every index adds write overhead (the index has to be maintained on every insert/update) — indexing without profiling actual query patterns risks adding write cost for a read pattern that doesn't actually occur often, netting a performance loss rather than a gain.

**67. What's the actual problem with `OFFSET`-based pagination at scale, mechanically?**
The database still has to scan and discard all the skipped rows before returning the requested page — at high offsets (deep pagination), this scan cost grows with the offset itself. Keyset/cursor pagination (`WHERE Id > @lastSeenId`) avoids the scan entirely by seeking directly.

**68. What has to be decided before adding a cache, not after?**
The invalidation strategy — how does a cached entry get updated or removed when the underlying data changes. Adding a cache without deciding this first is how stale-data bugs happen; the caching mechanism itself is the easy part.

**69. Why is `SqlBulkCopy`/batched inserts dramatically faster than row-by-row `SaveChanges()` in a loop?**
Each `SaveChanges()` call is a separate round trip (and often a separate transaction) to the database; batching collapses many round trips into one, which is usually the dominant cost difference at scale, not raw insert speed.

**70. What's the risk of an unbounded in-memory aggregation in a background job, specifically?**
Memory grows with the size of the *input* dataset rather than the *output* — as the underlying table grows over time, the same job that worked fine for months eventually runs out of memory, often traced back to a `.ToList()` on an unbounded EF Core query.

## Testing & Code Quality (71-75)

**71. Why gate new code strictly on quality metrics but not pre-existing legacy code?**
Gating all code (including untouched legacy) on a coverage/quality threshold would make the pipeline impossible to ship anything through — legacy debt should be visible and tracked, but the gate needs to apply to what's actually changing, or teams will find ways to bypass a gate that blocks unrelated work.

**72. What's the testing-pyramid shape, and why keep E2E tests thin?**
Many fast, isolated unit tests; fewer integration tests exercising real dependencies; a small set of E2E tests covering only the critical user journeys — E2E suites are slow and flaky at scale, so they should validate the paths that matter most, not attempt full coverage.

**73. What's the economic argument for shift-left testing?**
A bug caught by a unit test costs minutes to fix; the same bug caught in manual QA costs hours; caught in production, it costs an incident — pushing checks earlier in the pipeline (ideally pre-merge) catches issues at their cheapest point to fix.

**74. Why should technical debt reduction get a reserved percentage of sprint capacity, rather than being prioritized ad hoc?**
Ad hoc prioritization against feature work almost always loses to features with visible business value — a reserved capacity slice (a common pattern is 15-20% per sprint) is what actually makes debt reduction happen consistently instead of remaining a permanent good intention that's never scheduled.

**75. What's the actual difference integration tests catch that unit tests with mocked dependencies can't?**
Behavior that only emerges from real component interaction — a repository method that's individually correct in isolation but produces an N+1 query pattern when it hits a real EF Core context and real relationships, for example, which a mocked-dependency unit test would never surface.
