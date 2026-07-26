# Enterprise Modernization — Frontend & Backend Migration Mechanics (Reference)

**What this file is:** the concrete "how" of an AngularJS→Angular migration and an ASP.NET Framework→ASP.NET Core migration. Generic technical reference, not a personal incident narrative.

---

## Part A — AngularJS → Angular Migration

### Migration approach: `@angular/upgrade` hybrid, not a rewrite

The standard low-risk approach is the **hybrid/ngUpgrade pattern**: run AngularJS and Angular in the same browser session simultaneously during the transition, using `@angular/upgrade/static` to let the two frameworks interoperate — AngularJS components can be used inside Angular templates and vice versa via up/downgrade adapters. This is the Strangler Fig pattern applied to the frontend: the AngularJS app keeps running for routes not yet migrated, while migrated routes render Angular components, and users never see a seam.

**Practical sequencing:**
1. **Bootstrap Angular alongside AngularJS** in the same `index.html`, with a root `UpgradeModule` bridging the two.
2. **Migrate leaf components first** — components with few dependencies on shared AngularJS services are the cheapest to convert and prove the pattern works without much coordination.
3. **Migrate shared services next**, since once a service is downgraded for AngularJS consumption (or upgraded for Angular consumption), every component depending on it can be migrated independently afterward.
4. **Migrate routes last, module by module**, switching the router configuration to hand off to Angular's router for converted sections while AngularJS's `ngRoute`/`ui-router` continues to serve the rest.
5. **Remove the hybrid bridge only once 100% of the surface is Angular** — running two frameworks has a real bundle-size and performance cost, so the hybrid mode is explicitly temporary infrastructure, not a permanent target state.

### Why not a parallel rewrite instead?

A common alternative is building the new Angular app entirely separately and cutting over page-by-page via a reverse-proxy route split (no shared browser session, no hybrid bridge). This avoids the ngUpgrade complexity entirely, at the cost of: (1) duplicating shared state/session handling across two completely separate apps during the transition, and (2) losing any in-page component reuse between old and new during the migration window. The hybrid approach is generally preferred when the app has significant shared state (auth session, user context, in-flight form data) that would be painful to duplicate; the separate-apps approach is preferred when the legacy and target UIs are different enough (e.g., a full UX redesign alongside the framework migration) that sharing isn't valuable anyway.

### Key technical differences that drive the actual migration work

- **Two-way `$scope` binding → unidirectional data flow with `@Input()`/`@Output()`.** This is the single biggest source of real refactoring work, not a syntax change — an AngularJS controller that mutates `$scope` from multiple places (a child directive, a watch, an async callback) has to be redesigned around explicit inputs and emitted events. This is exactly where "modular, testable components" comes from: forcing explicit data flow is what makes a component unit-testable in isolation.
- **Controllers + `$scope` → component classes with TypeScript.** Adds compile-time type safety, which catches a category of runtime bugs AngularJS's dynamic `$scope` access couldn't.
- **`$http`/`$resource` → `HttpClient` with RxJS observables.** Requires rethinking callback-based async code as observable streams — a real learning curve for teams used to promise-based `$http`, especially around cancellation (`unsubscribe`) and operators (`switchMap`, `debounceTime`) replacing manual debounce/throttle logic.
- **`ngRoute`/`ui-router` → Angular Router.** Route guards (`CanActivate`) replace ad-hoc `resolve` + manual auth checks scattered in controllers — this is also where **authentication** gets centralized: a single `AuthGuard` protecting routes, rather than each controller independently checking a token.
- **No lazy loading in most AngularJS apps → route-level lazy loading with Angular modules.** AngularJS typically ships as one bundle; Angular's `loadChildren` lazy-loads feature modules on navigation. This is usually where the biggest measurable frontend performance win comes from — initial bundle size drops substantially because users only download the code for the section of the app they're actually using.
- **Ad-hoc shared code → shared libraries (Angular workspace / Nx-style libs).** Cross-cutting UI components (buttons, form controls, layout shells) and cross-cutting services (auth, API client wrappers, error interceptors) get extracted into a shared library consumed by every feature module — replacing what was often copy-pasted or globally-scoped code in the AngularJS app.

### Authentication during the transition

Because both frameworks run in the same browser session during the hybrid phase, the auth token/session needs to be readable by both — typically solved by keeping the token in a framework-agnostic store (a cookie, or `localStorage`/`sessionStorage`) rather than in either framework's internal state, with a downgraded Angular auth service exposed to AngularJS (or vice versa) so there's exactly one source of truth for "is the user logged in" regardless of which framework rendered the current view.

---

## Part B — ASP.NET Framework → ASP.NET Core Migration

### Middleware pipeline

ASP.NET Framework's `HttpModules`/`HttpHandlers` (configured in `web.config`, executed via a fairly opaque IIS pipeline) become an explicit, ordered middleware pipeline in `Program.cs` (`app.UseX()` calls). This is a real conceptual shift, not just a syntax port: middleware order is now explicit and visible in one place — exception handling, authentication, routing, and custom middleware (like correlation-ID stamping) all have a deliberate position in the pipeline, which is itself a code-review point ("why is this middleware before/after that one") rather than implicit IIS-module ordering.

### Dependency injection

ASP.NET Framework apps typically bolt on a third-party container (Unity, Autofac, Ninject) via a custom `DependencyResolver`, often inconsistently — some code resolves via the container, some code still `new`s dependencies directly. ASP.NET Core has DI built into the framework itself (`IServiceCollection`), which removes the "which resolution mechanism does this code path use" ambiguity and makes constructor injection the only path — a real forcing function for testability, since anything not injected can't be easily mocked in a test.

### Configuration

`web.config`'s XML-based `appSettings`/`connectionStrings`, environment-specific `web.Release.config` transforms → the Options pattern (`IOptions<T>`) backed by `appsettings.json` + `appsettings.{Environment}.json` + environment variables + (critically) Key Vault for secrets. The important behavior change: configuration becomes strongly typed and validated at startup (via `IValidateOptions<T>` or data annotations) instead of failing at first use somewhere deep in a request — misconfiguration surfaces as a startup failure, not a 2am production bug.

### Authentication

ASP.NET Framework commonly used Forms Authentication or a custom `OWIN` bearer-token setup. ASP.NET Core standardizes on the `Microsoft.AspNetCore.Authentication` middleware with JWT bearer tokens validated against an identity provider (Azure AD / Entra ID via `AddMicrosoftIdentityWebApi`, or a generic OIDC provider) — see file 3 for the full security picture. The migration-specific detail: during the transition, both the legacy Forms-Auth-protected pages and the new JWT-protected API need to recognize the same authenticated session, usually solved by having the legacy app also issue/accept the same JWT (or by putting both behind a shared auth gateway that normalizes to one token format for downstream consumers).

### API versioning

ASP.NET Framework Web API often had no explicit versioning strategy — breaking changes just broke callers. ASP.NET Core's `Asp.Versioning` package (or a simple URL-segment convention, `/api/v2/...`) makes versioning explicit, which matters specifically during a Strangler migration: the API Management gateway (file 1) needs to route `v1` calls to legacy and `v2` calls to the new service unambiguously, so versioning isn't optional once the Strangler pattern is in play — it's the mechanism the routing seam depends on.

### Background processing

Windows Services polling file shares/database tables → `IHostedService`/`BackgroundService` for in-process background work, or Azure Functions/Service Bus consumers for out-of-process, scalable async work (file 1). The key trade-off to be able to articulate: an in-process `BackgroundService` is simpler and has no extra infrastructure, but it scales and fails with the web app itself (if the app restarts, the background work restarts too, and it competes for the same resources as request handling); a Service Bus + Function consumer is more infrastructure but scales independently and survives the web app being redeployed or scaled to zero.

### Logging

Per-server text files / `System.Diagnostics.Trace` → structured logging via `ILogger<T>` with a provider like Serilog, writing structured (not just string-interpolated) log events to Application Insights. The critical behavioral upgrade is **structured** logging — `logger.LogInformation("Order {OrderId} processed for {UserId}", orderId, userId)` produces queryable fields (`OrderId`, `UserId`) in the log backend, not just a formatted string, which is what makes "find every log line for this specific order" a query instead of a grep.

### Validation

Manual `if`-check validation scattered through controller actions and `ModelState.IsValid` checks → `FluentValidation` validators registered in DI and run automatically via a pipeline filter, keeping validation logic in one discoverable place per model instead of duplicated across every action that accepts that model.

### Exception handling

Framework's `Application_Error` in `Global.asax` (a single, coarse global handler, often just logging and showing a generic error page) → ASP.NET Core's exception-handling middleware (`UseExceptionHandler`) paired with `ProblemDetails` responses (RFC 7807) — giving API consumers a structured, machine-parseable error response (`type`, `title`, `status`, `detail`, `traceId`) instead of an HTML error page or an inconsistent ad-hoc JSON error shape per controller. The `traceId` in `ProblemDetails` is also the direct link to the observability story in file 3 — a client-reported error can be traced straight to its distributed trace via that ID.
