# Capital Access — Production Operations & Deployment

> 🚀 **How to use this document:** This file covers how Capital Access operates at scale in production — logging, observability, CI/CD, feature deployment, and real-time operations. Read this after understanding the architecture and technical patterns.

**Quick Navigation:**
- Logging & Observability — App Insights + Splunk
- Report Generation Architecture
- CI/CD & DevOps
- Feature Toggles (Feature Flags) — Deployment Without Risk
- Deep Dive — CI/CD Pipeline Architecture
- Advanced Operations & Production Scenarios — Interview FAQ

---

## Logging & Observability — App Insights + Splunk

Two tools, two different jobs, tied together by one Correlation ID.

```
App Insights (distributed tracing / APM):
  Auto-instruments each microservice via its SDK
  On every incoming request, reads or creates a Correlation ID (W3C Trace Context header)
  That same Correlation ID is propagated on every downstream call the service makes —
    both synchronous REST calls AND Service Bus messages
  Gives you: the trace TIMELINE — which service called which, how long each hop took,
    where an exception was thrown, dependency call latency (e.g. SQL query took 120ms)

Splunk (centralized log aggregation):
  Every microservice ships structured logs (info/warn/error + payload context)
  Each log line is stamped with the SAME Correlation ID that App Insights is propagating
  Gives you: the actual LOG CONTENT — full request/response bodies, custom log
    messages, stack traces — searchable across every service in one query
  Also where ops dashboards and alerting live (error rate spikes, DLQ growth, etc.)

In practice, debugging a production issue:
  1. User reports a problem around a specific time / for a specific report job
  2. Pull the Correlation ID from the App Insights trace (or from the initial log line)
  3. Search that Correlation ID in Splunk → every log line, every service, one place
  4. Cross-reference back to App Insights if you need the TIMING view (which hop was slow)
    vs. Splunk for the CONTENT view (what exactly did each service log)
```

> ℹ️
> **Why both, not just one:** App Insights is excellent at "what's slow and where" — the trace graph — but it isn't built as a general-purpose log search tool across arbitrary structured fields. Splunk is excellent at "search everything, build a dashboard, alert on a pattern" but doesn't give you the automatic distributed-trace timeline out of the box. Using both, joined by a shared Correlation ID, gives you both views without forcing one tool to do the other's job.

Not all communication is synchronous. When ownership data changes, multiple downstream services need to react. We use **Azure Service Bus Topics** (pub/sub model) for this.

```
Example: S&P data feed updates ownership percentages for APPLE INC

Ownership Service:
  → updates Cosmos DB ✅
  → publishes "OwnershipChanged" event to Service Bus Topic

Subscribers receive their own copy (pub/sub, not queue):
  Targeting Service     → recalculates investor targeting scores for AAPL
  Notifications Service → checks user alert preferences → sends email/in-app alert

The Ownership Service does not know or care that Targeting and Notifications exist.
If a new "Analytics Service" is added tomorrow, it just subscribes to the topic.
Zero changes to Ownership Service.

This is the Pub/Sub pattern: one event → many independent reactions.
```

> ℹ️
> **Dead Letter Queue:** If Targeting Service is down when the event arrives, Azure Service Bus holds it in a Dead Letter Queue. When the service recovers, it processes the backlog. No ownership change is ever lost — guaranteed delivery.

```
Problem:
  Targeting scores are expensive to compute (ML scoring model runs on S&P's data)
  But the UI requests them constantly — every time a user opens an investor targeting page

Solution: Cache-Aside Pattern with Redis
  Request arrives → check Redis for cached score
  Cache HIT  → return in < 5ms ✅
  Cache MISS → fetch from Azure SQL → compute/enrich → store in Redis (TTL: 1 hour) → return

Invalidation:
  When OwnershipChanged event arrives (Service Bus) → Targeting Service
  → recomputes score → writes new score to Azure SQL → INVALIDATES Redis key
  → next request gets fresh score from SQL, re-caches it
```

```
Angular 18 SPA (Azure Static Web Apps)
├── Standalone Components (no NgModules — enables per-component tree-shaking)
├── Lazy-loaded Feature Modules
│   ├── Ownership Module        → calls Ownership Service
│   ├── Profiles Module         → calls Profiles Service
│   ├── Targeting Module        → calls Targeting Service (Redis-backed, fast)
│   ├── Contacts Module         → calls Contacts Service
│   ├── Notifications Module    → calls Notifications Service
│   └── 5+ more feature modules
├── Shared Core
│   ├── OktaAuthService         → wraps okta-auth-js, manages token lifecycle
│   ├── HTTP Interceptor        → attaches Bearer JWT to all outbound calls
│   ├── Role Guard              → decodes JWT roles claim, protects routes
│   ├── Tenant Config Service   → loads tenant feature flags after login
│   └── WCAG 2.1 component lib  → accessible data grids, modals, charts
├── NgRx Store
│   ├── Auth slice              → user identity, roles, tenant
│   ├── Feature slices          → one per lazy module, loaded on demand
│   └── UI slice                → loading states, notifications
└── Azure DevOps CI/CD
```

| Technology | Used for | Why chosen |
| --- | --- | --- |
| Okta | Identity / OIDC | Enterprise IdP, MFA, custom JWT claims, okta-auth-js SDK for Angular |
| Azure API Management (Gateway) | Single entry point for the SPA | Centralised JWT/tenant-claim validation, rate limiting, and routing instead of duplicating auth logic in every service for SPA-originated traffic |
| Azure Service Bus | Async inter-service events | Pub/Sub Topics, guaranteed delivery, Dead Letter Queue, native Azure |
| Azure Cosmos DB | Ownership time-series | Horizontally scalable, flexible schema, fast writes for high-volume financial data |
| Azure SQL | Profiles, Contacts, Targeting | Relational structure, ACID transactions, rich querying |
| Azure Redis Cache | Targeting score caching | Sub-millisecond reads, cache-aside pattern, TTL-based auto-expiry |
| Azure Blob Storage | Reports, exports, documents | Cheap, scalable object storage for non-queryable binary files |
| Azure Key Vault | Secrets management | No connection strings in code or config files — services fetch secrets at runtime |
| Azure App Insights | Distributed tracing / APM | Auto-instruments each service, propagates Correlation ID (W3C Trace Context), gives the timing/dependency view of one request across services |
| Splunk | Centralized log aggregation | Every service ships structured logs tagged with the same Correlation ID — the first place engineers search during an incident, across all services in one query |
| Azure Front Door | CDN + WAF + load balancing | Global edge, DDoS protection, SSL termination at the edge |
| Azure Static Web Apps | Hosting Angular SPA | Built-in CDN, CI/CD integration, free SSL, global distribution |
| Azure Functions | Report Worker (serverless) | Queue-triggered, auto-scales to queue depth, no idle server cost, aggregates data from all services and generates PDF/Excel reports |
| Azure Durable Functions | Multi-step report pipeline orchestration | Checkpointed, crash-safe workflow (generate → blob upload → SAS URL) without hand-rolled progress tracking |


---

## Report Generation Architecture

Capital Access clients — IR teams, investment banks — need to generate ownership reports, shareholder analytics reports, investor targeting summaries, and board-pack exports. These are not instant: they require pulling data from multiple services, generating a formatted PDF or Excel, and making it available for download. The key design decision is **async generation** — never block the user while a report builds.

```
STEP 1 — USER TRIGGERS REPORT
  Angular UI → POST /api/reports
              { reportType: "ownership-analysis", companyId: "AAPL", quarter: "Q2-2025" }
              Report Service saves job → DB: { jobId: "rpt-001", status: "PENDING" }
              Returns immediately → { jobId: "rpt-001" }   ← no waiting ✅

STEP 2 — JOB QUEUED (Azure Service Bus Queue — NOT a Topic)
  Report Service → publishes message to [report-generation-queue]
  Message: { jobId: "rpt-001", reportType, companyId, tenantId, requestedBy }

  WHY A QUEUE, NOT A TOPIC?
  Report generation is a TASK — exactly ONE worker should process each job.
  A Topic would fan-out to all subscribers → every worker generates the same report → wasteful.
  Queue = one message, one consumer. ✅

STEP 3 — WORKER PICKS UP JOB (Azure Function — Queue Trigger)
  Azure Function triggered automatically when message arrives in queue
  Serverless: scales out to N parallel instances if 50 reports queued simultaneously
  Updates job status → "IN_PROGRESS"

STEP 4 — DATA AGGREGATION (calls multiple microservices)
  Azure Function calls:
    Ownership Service  → ownership % history for AAPL, Q1–Q4 2025
    Profiles Service   → company profile, financials, sector, IR team
    Targeting Service  → current investor targeting scores and recommendations
    Contacts Service   → IR contacts for the report footer / distribution list
  Aggregates all data in memory → report data model ready

STEP 5 — REPORT GENERATION
  PDF:   uses document generation library (e.g. iTextSharp / QuestPDF / SSRS template)
  Excel: uses EPPlus / ClosedXML to build formatted workbook
  Output: byte[] of the generated file

STEP 6 — UPLOAD TO AZURE BLOB STORAGE
  Path: reports/{tenantId}/{jobId}/ownership-analysis-AAPL-Q2-2025.pdf
  Azure Blob Storage → object stored ✅
  Job record updated → { status: "COMPLETED", blobPath: "reports/..." }

STEP 7 — NOTIFY USER
  Azure Function publishes "ReportReady" event → Azure Service Bus Topic
  Notifications Service subscribes → sends in-app notification + email
  "Your Ownership Analysis report for AAPL is ready. Click to download."

STEP 8 — SECURE DOWNLOAD
  User clicks download → Angular calls GET /api/reports/rpt-001/download
  Report Service generates a SAS URL (Shared Access Signature):
    - Time-limited: expires in 15 minutes
    - Read-only: cannot write or delete
    - Scoped to exactly that blob: reports/{tenantId}/{jobId}/...
  Returns SAS URL to Angular → browser downloads directly from Blob Storage
  Blob Storage never publicly accessible — only via SAS URL
```

> ℹ️
> **Report generation is bursty.** At 9am when markets open, many IR teams trigger reports simultaneously. At 3pm it's quiet. A dedicated always-on VM or container wastes money 80% of the time. Azure Functions scale to zero when idle and spin up parallel instances automatically when the queue has 50 messages. Cost-efficient + elastic — no manual scaling configuration needed.

```
Option A — Polling (what we use for simplicity):
  Angular UI polls GET /api/reports/{jobId}/status every 3 seconds
  { status: "PENDING" } → { status: "IN_PROGRESS" } → { status: "COMPLETED" }
  On COMPLETED → show download button
  Simple to implement. Fine for reports that take 10–30 seconds.

Option B — SignalR (real-time push, more complex):
  Azure SignalR Service pushes status update directly to the Angular client
  No polling — notification arrives the instant the report is ready
  Better UX for longer reports (minutes), more infrastructure to manage
  Trade-off: added Azure SignalR dependency vs. polling simplicity
```

> ⚠️
> **Blob Storage is private — no public URLs.** A SAS (Shared Access Signature) URL is a cryptographically signed URL that grants time-limited, permission-scoped access to a specific blob. We generate it server-side (Report Service has the storage account key in Key Vault). The client gets a URL that works for 15 minutes then expires. Even if the URL leaks, it becomes useless after expiry. This means: no proxy cost (file streams direct from Blob Storage to browser), no auth header needed on the download request, and the blob remains private at all times.

```
Angular SPA
    │  POST /reports (async, returns jobId immediately)
    ▼
Report Service ──────────────────────► Azure SQL (jobs table: jobId, status, blobPath)
    │
    │ publish to queue
    ▼
[Azure Service Bus Queue: report-generation-queue]
    │
    │ Queue Trigger (auto-scales)
    ▼
Azure Function (Report Worker)
    ├── calls Ownership Service  ──► Cosmos DB
    ├── calls Profiles Service   ──► Azure SQL
    ├── calls Targeting Service  ──► Azure SQL + Redis
    └── calls Contacts Service   ──► Azure SQL
    │
    │ generates PDF / Excel bytes
    ▼
Azure Blob Storage  ←── uploads file (private container)
    │
    │ updates job status + blob path
    ▼
Azure SQL (jobs table: status=COMPLETED)
    │
    │ publishes "ReportReady" event
    ▼
Azure Service Bus Topic ──► Notifications Service ──► email + in-app alert
    │
    │ user clicks download
    ▼
Report Service generates SAS URL (15 min, read-only, single blob)
    │
    ▼
Browser downloads directly from Blob Storage via SAS URL ✅
```

**Q: Q: Why a Queue for report generation but a Topic for ownership change events?**

Answer:
        The fundamental difference is whether the message is a *task* or an *event*. Report generation is a task — "generate this specific report once, exactly one worker should do it." A Queue ensures exactly one consumer picks up each message. If I used a Topic, every subscribed worker instance would generate the same report — wasteful and wrong. An ownership change is an event — "something happened, tell everyone who cares." Multiple services (Targeting, Notifications) each need their own independent copy to react to. Topic fan-out is exactly right for that. Same Azure Service Bus, different pattern — Queue for tasks, Topic for events.

> 💡 This directly maps to the Queue vs Pub/Sub distinction — a perfect chance to show depth.

**Q: Q: What happens if the Azure Function crashes mid-report generation?**

Answer:
        Azure Service Bus handles this with message lock and retry. When the Function picks up a message, Service Bus locks it — no other consumer can claim it. If the Function crashes before completing, the lock expires after a configurable timeout (e.g. 5 minutes). Service Bus automatically re-delivers the message to another Function instance. We handle this safely because Step 4 (data aggregation) and Step 5 (PDF generation) are pure computation — no side effects. The only side-effecting steps are the Blob upload and the DB status update at the end. If those didn't happen, the retry will redo them cleanly. After a configured max retry count, the message moves to the Dead Letter Queue for manual inspection.

**Q: Q: How do you prevent one tenant's report job from seeing another tenant's data?**

Answer:
        The tenant ID is embedded in the Service Bus message from the original request, and it came from the validated JWT — so it's trustworthy. The Azure Function includes the tenant ID in every downstream API call. Each microservice filters all data by tenant ID at the query level. The Blob Storage path is scoped under the tenant ID: reports/{tenantId}/{jobId}/.... The SAS URL is generated for that exact blob path only. So even if someone guessed another tenant's jobId, the SAS URL would be for their tenant's path, which wouldn't match.

**Q: Q: How long are generated reports stored? What's your retention strategy?**

Answer:
        Azure Blob Storage Lifecycle Management policies handle this automatically. Reports are stored in Hot tier for 7 days — within that window, SAS URLs can be regenerated on demand if the user wants to re-download. After 7 days, the policy automatically moves blobs to Cool tier (cheaper storage, same access). After 90 days, blobs are deleted — clients are expected to save reports locally if they need them longer. This is a business decision, not a technical constraint, but the Lifecycle Management policy enforces it with zero application code.


---

## CI/CD & DevOps

```
Developer pushes to feature branch
         │
         ▼
[PR Branch Pipeline]
  ├── Lint (ESLint + Stylelint)
  ├── Unit Tests (Jest, coverage gate ≥ 80%)
  ├── Build (Angular 18 esbuild)
  └── Accessibility scan (axe-core automated)
         │ PR approved + all gates pass
         ▼
[Merge to develop]
  ├── Integration tests
  ├── SAST security scan
  └── Deploy to DEV environment
         │ QA sign-off
         ▼
[Deploy to Staging]
  ├── E2E tests (Cypress/Playwright)
  ├── Performance budget check (bundle size gate)
  └── Manual deployment gate (Lead approval)
         │ Release approved
         ▼
[Deploy to Production]
  └── Blue/Green deployment (zero downtime)
```

You worked with DevOps to define **deployment gates** — automated checks that must pass before a stage can proceed. The bundle size gate ensures no PR accidentally re-inflates the bundle after your 30% reduction. The accessibility scan runs axe-core automatically — accessibility regressions are caught in CI, not after release.

---


---

## Feature Toggles (Feature Flags) — Deployment Without Risk

Feature toggles are not optional at Capital Access — they are **mandatory for every new feature.** The principle is simple: code ships to production disabled, gets tested against real data and real traffic, then is gradually enabled to users.

### Why Feature Toggles Matter

**Without feature toggles, you have two bad choices:**

1. **Release to 100% of users immediately** — if there's a bug, all 2,500 clients are affected at once. Rollback means a new deployment + downtime.

2. **Hold features in a branch until "perfect"** — branches live for weeks, diverge from main, merge conflicts explode, and you end up testing against stale code.

**With feature toggles:**
- Deploy features disabled → testing doesn't wait for "release day"
- Gradually enable to 1% of users → catch bugs before they hit everyone
- Rollback is instantaneous (change a config flag, not a deployment)
- Production data validation happens before the feature is visible to users
- New engineers can work on features without fear of breaking production

### Implementation — Azure App Configuration

Capital Access stores feature toggles in **Azure App Configuration** (cloud-native config service).

```json
// Capital Access feature toggles (Azure App Configuration)
{
  "FeatureManagement": {
    "NewInvestorTargetingAlgorithm": {
      "Enabled": true,
      "Conditions": {
        "ClientFilter": {
          "Setting": {
            "TargetingBeta": ["spg-enterprise-001", "spg-enterprise-002"]
          }
        }
      }
    },
    "OwnershipChangeAlerts": {
      "Enabled": true,
      "Conditions": {
        "TimeWindow": {
          "Start": "2026-07-08T00:00:00Z",
          "End": "2026-12-31T23:59:59Z"
        }
      }
    },
    "AITextualAnalyticsV2": {
      "Enabled": false
    },
    "ESGDashboardRedesign": {
      "Enabled": true,
      "Conditions": {
        "Percentage": {
          "Value": 25
        }
      }
    }
  }
}
```

**Conditions explained:**
- `NewInvestorTargetingAlgorithm` — enabled only for 2 beta clients (by tenant ID)
- `OwnershipChangeAlerts` — enabled during Q3–Q4 (seasonal feature)
- `AITextualAnalyticsV2` — completely disabled, not rolled out yet
- `ESGDashboardRedesign` — enabled for 25% of requests (gradual rollout)

### Backend Implementation (C#)

```csharp
// Inject IFeatureManager into your service
public class TargetingService
{
    private readonly IFeatureManager _featureManager;
    private readonly ILogger<TargetingService> _logger;
    
    public TargetingService(IFeatureManager featureManager, ILogger<TargetingService> logger)
    {
        _featureManager = featureManager;
        _logger = logger;
    }
    
    public async Task<List<TargetScore>> CalculateScoresAsync(int companyId)
    {
        // Check if new algorithm is enabled for this company
        if (await _featureManager.IsEnabledAsync("NewInvestorTargetingAlgorithm", new TargetingContext { CompanyId = companyId }))
        {
            _logger.LogInformation("Using new ML targeting algorithm for company {CompanyId}", companyId);
            return await CalculateScoresAsync_MLBased(companyId);
        }
        else
        {
            _logger.LogInformation("Using legacy rules-based targeting for company {CompanyId}", companyId);
            return await CalculateScoresAsync_RulesBased(companyId);
        }
    }
}

// Context object for feature evaluation (Azure App Configuration uses this)
public class TargetingContext : IFeatureFilterMetadata
{
    public int CompanyId { get; set; }
    public string TenantId { get; set; }
}
```

### Frontend Implementation (Angular)

```typescript
// Angular service to check feature flags
@Injectable({ providedIn: 'root' })
export class FeatureToggleService {
  constructor(private http: HttpClient) {}
  
  // Fetch all feature flags once at app startup
  async getFeatureFlags(): Promise<Record<string, boolean>> {
    return this.http.get<Record<string, boolean>>('/api/features')
      .toPromise()
      .then(flags => this.store.set('featureFlags', flags));
  }
  
  isEnabled(featureName: string): boolean {
    const flags = this.store.get('featureFlags');
    return flags?.[featureName] ?? false;
  }
}

// Use in components
@Component({
  selector: 'app-investor-targeting',
  template: `
    <div *ngIf="isESGDashboardEnabled" class="esg-section">
      <app-esg-dashboard-redesigned></app-esg-dashboard-redesigned>
    </div>
    
    <div *ngIf="!isESGDashboardEnabled" class="esg-section">
      <app-esg-dashboard-legacy></app-esg-dashboard-legacy>
    </div>
  `
})
export class InvestorTargetingComponent implements OnInit {
  isESGDashboardEnabled: boolean;
  
  constructor(private features: FeatureToggleService) {}
  
  ngOnInit() {
    this.isESGDashboardEnabled = this.features.isEnabled('ESGDashboardRedesign');
  }
}
```

### Real Capital Access Example: "New Targeting Algorithm"

**Step 1 — Development Phase (Toggles all `Enabled: false`)**
```csharp
// New ML-based targeting algorithm is ready
public class NewTargetingAlgorithm
{
    private readonly IFeatureManager _featureManager;
    
    public async Task<List<InvestorScore>> ScoreAsync(Company company)
    {
        // Feature is disabled in production, so this code never runs
        // But it's deployed and ready
        return await _mlModel.PredictAsync(company);
    }
}
```

**Step 2 — Beta Testing (Enable for 2 internal clients)**
```json
"NewInvestorTargetingAlgorithm": {
  "Enabled": true,
  "Conditions": {
    "ClientFilter": {
      "Setting": {
        "TargetingBeta": ["spg-enterprise-001", "spg-enterprise-002"]
      }
    }
  }
}
```

Capital Access QA and the 2 beta clients use the new algorithm. Engineers monitor:
- Does the ML model produce reasonable scores?
- Do scores correlate with actual investor engagement?
- Is latency acceptable (ML inference is expensive)?
- Do edge cases (no historical data, new companies) work?

**Step 3 — Gradual Production Rollout (5% → 25% → 100%)**
```json
"NewInvestorTargetingAlgorithm": {
  "Enabled": true,
  "Conditions": {
    "Percentage": { "Value": 5 }
  }
}
```

Monday: Deploy with 5% rollout. Monitor Application Insights:
- Error rate for the 5% vs 95%?
- Latency P95 for ML scoring vs rules-based?
- User complaints/feedback?

If all green:
```json
"Percentage": { "Value": 25 }  // Wednesday: 25%
```

If issues appear, rollback instantly (no deployment needed):
```json
"Enabled": false  // Friday: kill it
```

**Step 4 — Full Rollout (100%) and Clean Up**
```json
"NewInvestorTargetingAlgorithm": {
  "Enabled": true
  // No conditions = 100% of traffic
}
```

Once fully rolled out and stable for 2+ weeks, remove the old code:
```csharp
// Delete the legacy ScoreAsync_RulesBased method
// Rename ScoreAsync_MLBased to just ScoreAsync
// Remove the feature flag check — ML is now the only way
```

### Managing Multiple Feature Toggles

Capital Access has dozens of toggles in flight at any time:

```json
{
  "Features": {
    "NewInvestorTargetingAlgorithm": { "Enabled": true, "Percentage": 50 },
    "OwnershipChangeAlerts": { "Enabled": true },
    "AITextualAnalyticsV2": { "Enabled": false },
    "ESGDashboardRedesign": { "Enabled": true, "Percentage": 25 },
    "EmailIntegrationWithGmail": { "Enabled": true, "ClientFilter": ["spg-enterprise-001"] },
    "ReportPdfExport": { "Enabled": true },
    "SentimentAnalysisEnrichment": { "Enabled": false },
    "CustomBrandingPerClient": { "Enabled": true },
    "AdvancedFilteringInDashboard": { "Enabled": false },
    "real-timeOwnershipNotifications": { "Enabled": true, "Percentage": 75 }
  }
}
```

**Dashboard for managing toggles:**
Engineers access Azure App Configuration portal to:
- View all flags and their current state
- Change percentages on-the-fly (no deployment)
- Add/remove client-specific enables
- See who changed what, when (audit log)

### Rollback Strategy

If something goes wrong after enabling a feature:

**Scenario: "New Targeting Algorithm at 25% is causing timeouts"**

```
Production Incident:
  2026-07-08 14:30 — P95 latency spikes to 5 seconds
  2026-07-08 14:31 — Oncall opens Application Insights
  2026-07-08 14:32 — Traces show new ML scoring is timing out (15s, no timeout set)
  2026-07-08 14:33 — Oncall disables feature in App Configuration

Result:
  No deployment needed
  No code rollback
  Zero-downtime rollback (seconds)
  Only the 25% of traffic on the new algorithm is affected; they fall back to rules-based
  
Post-incident:
  - Eng team adds timeout to ML model
  - Eng team batches feature for 1% rollout next time, not 5%
  - Toggle stays off until fix is validated
```

Without feature toggles, this would be:
1. Identify the bad code
2. Revert the commit / create a hotfix
3. Rebuild, test, push to staging
4. Deploy to production (5–10 minutes)
5. Verify rollback worked
6. Total time: 15–20 minutes of degraded service for all users

**With feature toggles: 90 seconds.**

### Best Practices

**1. Feature toggles are temporary — don't let them accumulate**
```csharp
// BAD: Toggle that's been in code for 6 months
if (await featureManager.IsEnabledAsync("NewDashboard")) { ... }

// GOOD: Remove it once fully rolled out and stable
// Just use the new code directly
```

Create a ticket to clean up toggles after 3–4 weeks of 100% rollout.

**2. Use consistent naming conventions**
```
✅ NewInvestorTargetingAlgorithm (feature name, not "toggle1" or "feature_x")
✅ EmailIntegrationWithGmail (descriptive)
✅ SentimentAnalysisEnrichment (what it does)

❌ test_feature
❌ new_thing
❌ temp_flag
```

**3. Log which branch was taken**
```csharp
if (await _featureManager.IsEnabledAsync("NewAlgorithm"))
{
    _logger.LogInformation("Using new ML targeting algorithm {TenantId}", tenantId);
    // use new code
}
else
{
    _logger.LogInformation("Using legacy rules-based targeting {TenantId}", tenantId);
    // use old code
}
```

When an issue appears, logs tell you exactly which code path was executing.

**4. Test both code paths**
```csharp
[Test]
public async Task CalculateScores_WithNewAlgorithmEnabled()
{
    _mockFeatureManager.Setup(f => f.IsEnabledAsync("NewAlgorithm"))
        .ReturnsAsync(true);
    var result = await _service.CalculateScoresAsync(123);
    Assert.That(result.Count, Is.GreaterThan(0));
}

[Test]
public async Task CalculateScores_WithNewAlgorithmDisabled()
{
    _mockFeatureManager.Setup(f => f.IsEnabledAsync("NewAlgorithm"))
        .ReturnsAsync(false);
    var result = await _service.CalculateScoresAsync(123);
    Assert.That(result.Count, Is.GreaterThan(0));
}
```

Both code paths must be tested — you need confidence that the fallback works.

### Interview Script

When the interviewer asks about deployment strategy:

> "Every new feature at Capital Access ships behind a feature toggle, disabled by default. The code is deployed to production running alongside existing code, but users never see it until it's been validated. We use Azure App Configuration to store toggles and can enable them gradually — start with 1% of requests, monitor Application Insights for errors and latency, then ramp to 5%, 25%, 100% as we gain confidence. If something breaks at any percentage, disabling the toggle takes seconds — no deployment, no downtime. This lets us deploy frequently and safely. We also test both code paths (toggle on/off) in unit tests, so we have confidence in the fallback."

---


---

## Deep Dive — CI/CD Pipeline Architecture

The CI/CD pipeline is the backbone of safe, frequent deployments at Capital Access. This section walks through exactly how code flows from a developer's laptop to production, what gates protect each stage, and what happens when things go wrong.

### End-to-End Pipeline Overview

```
Developer's Laptop
  │
  ├─→ git push origin feature/investor-alerts
  │
  ▼
[GITHUB / AZURE DEVOPS]
  ├─→ Webhook triggers pipeline
  │
  ▼
[STAGE 1: PR Validation Pipeline]
  ├─→ Lint (ESLint, Stylelint, Prettier)
  ├─→ Unit Tests (Jest coverage ≥ 80%)
  ├─→ Build (esbuild bundle)
  ├─→ Security scan (SonarQube, SAST)
  ├─→ Accessibility scan (axe-core)
  ├─→ Bundle size check (must not exceed baseline + 2%)
  │   └─→ GATE: All checks must pass or PR blocks merge
  │
  ├─→ Code Review + Approval
  │
  ▼
[STAGE 2: Merge to Main & Deploy to DEV]
  ├─→ Merge squash to main branch
  ├─→ Build Docker image
  ├─→ Push to Azure Container Registry (ACR)
  ├─→ Deploy to DEV environment
  │   └─→ Automatic, no manual gate
  ├─→ Run integration tests (real DB, real API calls)
  ├─→ Smoke tests (happy path sanity check)
  │   └─→ GATE: Integration tests must pass
  │
  ▼
[STAGE 3: Deploy to STAGING]
  ├─→ Manual trigger (developer / team lead)
  ├─→ Pull image from ACR
  ├─→ Blue-green deployment (canary slot)
  ├─→ Run E2E tests (Cypress / Playwright)
  ├─→ Performance testing (load test with k6)
  ├─→ Run security penetration tests
  │   └─→ GATE: E2E tests + security approval
  │
  ├─→ Manual QA sign-off (deployed to real staging environment)
  │   └─→ GATE: QA team validates against test cases
  │
  ▼
[STAGE 4: Deploy to PRODUCTION]
  ├─→ Manual approval + release notes (requires manager signature)
  ├─→ Health check on staging (is it still healthy?)
  ├─→ Pull image from ACR
  ├─→ Blue-green deployment (production slot)
  ├─→ Smoke tests in production (10-minute validation window)
  ├─→ Gradual traffic shift (0% old → 10% new → 25% new → 100% new)
  ├─→ Application Insights monitoring (5-minute check)
  │   └─→ GATE: Error rate < 1%, latency P95 < baseline
  │   └─→ If gate fails: automatic rollback (swap slots back)
  │
  ├─→ Post-deployment validation
  │   ├─→ Run production smoke tests
  │   ├─→ Check database migrations completed
  │   ├─→ Verify feature toggles didn't change unexpectedly
  │   └─→ Alert if deployment took longer than expected
  │
  ▼
[COMPLETE]
  ├─→ Slack notification: "✅ Deployment successful, all gates passed"
  ├─→ Post-incident review (if any gate failed and was manually overridden)
  └─→ Deployment log archived for audit
```

### Stage 1: PR Validation (Code Quality Gates)

**Trigger:** Developer pushes to feature branch and opens PR.

**What happens (in real time):**

```
2026-07-08 10:15:32 — git push origin feature/investor-alerts
  └─→ GitHub webhook fires → Azure DevOps pipeline starts

2026-07-08 10:15:45 — [Build Started]
  Pool: ubuntu-latest (Linux agent)
  
2026-07-08 10:15:50 — [Step: Checkout Code]
  ✅ Cloning repository...
  
2026-07-08 10:16:02 — [Step: Install Node Dependencies]
  npm ci --prefer-offline
  ✅ Installed 1,247 packages (89 MB)
  
2026-07-08 10:16:15 — [Step: Lint (ESLint + Prettier)]
  eslint src/**/*.ts src/**/*.tsx
  ✅ No linting errors
  
2026-07-08 10:16:22 — [Step: Run Unit Tests (Jest)]
  jest --coverage --passWithNoTests
  ────────────────────────────────────
  PASS  src/services/investor-alerts.service.spec.ts
  PASS  src/components/alert-dialog.spec.ts
  ────────────────────────────────────
  Coverage: 82.4% (target: ≥80%)
  ✅ All tests passed
  
2026-07-08 10:16:35 — [Step: Build (esbuild)]
  ng build --configuration production
  ✅ Built 6 chunks, bundle size: 485 KB (baseline: 475 KB, +2.1%)
  ⚠️ GATE CHECK: Bundle size increase ≤ 2%? YES ✅
  
2026-07-08 10:16:50 — [Step: Security Scan (SonarQube)]
  sonar-scanner -Dsonar.projectKey=capital-access-webapp
  ✅ No critical vulnerabilities found
  ✅ No code smells rated "Blocker"
  ✅ Code coverage meets threshold
  
2026-07-08 10:17:05 — [Step: Accessibility Scan (axe-core)]
  axe-core scan on build output
  ✅ No WCAG 2.1 AA violations
  ✅ All interactive elements keyboard-accessible
  
2026-07-08 10:17:15 — [Publish Build Artifacts]
  Zipping build folder → artifact "drop"
  ✅ Artifact size: 2.3 MB
  
2026-07-08 10:17:20 — [BUILD SUCCESSFUL]
  All gates passed ✅
  Result: PR is ready for code review
```

**Code Review Gate:**
```
GitHub PR Page:
  Author: alice@capital-access.com
  Title: "feature: investor ownership change alerts via email"
  Description: "Notifies IR teams when major shareholders sell positions"
  
  Checks: ✅ All checks passed
    ├─ Build passes (10:17 AM) ✅
    ├─ 2+ code reviews required (1/2 approved) ⏳
    └─ No merge conflicts ✅
  
  Team Lead Review (bob@capital-access.com):
    "Good implementation. Alert deduplication logic is solid.
     Confirmed alert fatigue won't happen. Approved ✅"
  
  Maintainer Approval (carol@capital-access.com):
    "LGTM. Follows our notification service patterns.
     Ready to merge 🚀"
```

### Stage 2: Merge to Main & Deploy to DEV

**Trigger:** PR approved + all gates pass → Developer clicks "Squash and Merge".

**What happens:**

```
2026-07-08 10:45:22 — [Merge Commit Created]
  GitHub squash-merges feature/investor-alerts → main
  Commit: 3a7f2c8 "feature: investor ownership change alerts via email"
  
  └─→ Webhook: main branch changed → Azure DevOps pipeline auto-triggers

2026-07-08 10:45:30 — [BUILD MICROSERVICES]
  
  Step 1: Build Ownership Service (.NET)
    dotnet build OwnershipService/OwnershipService.csproj --configuration Release
    ✅ Build successful
    
  Step 2: Build Notifications Service (.NET)
    dotnet build NotificationsService/NotificationsService.csproj --configuration Release
    ✅ Build successful
    
  Step 3: Run Backend Unit Tests
    dotnet test --configuration Release --logger trx
    ✅ OwnershipService.Tests: 47/47 passed
    ✅ NotificationsService.Tests: 63/63 passed
    
  Step 4: Build Docker Images
    docker build -f OwnershipService.Dockerfile -t capitalaccessacr.azurecr.io/ownership-service:3a7f2c8 .
    docker build -f NotificationsService.Dockerfile -t capitalaccessacr.azurecr.io/notifications-service:3a7f2c8 .
    ✅ Both images built (125 MB, 140 MB)
    
  Step 5: Push to Azure Container Registry (ACR)
    docker push capitalaccessacr.azurecr.io/ownership-service:3a7f2c8
    docker push capitalaccessacr.azurecr.io/notifications-service:3a7f2c8
    ✅ Images pushed
    
2026-07-08 10:48:15 — [DEPLOY TO DEV ENVIRONMENT]
  
  kubectl set image deployment/ownership-service \
    ownership-service=capitalaccessacr.azurecr.io/ownership-service:3a7f2c8 \
    -n dev
  ✅ Deployment updated
  
  kubectl set image deployment/notifications-service \
    notifications-service=capitalaccessacr.azurecr.io/notifications-service:3a7f2c8 \
    -n dev
  ✅ Deployment updated
  
  kubectl rollout status deployment/ownership-service -n dev
  ✅ New pods are ready
  
  2026-07-08 10:49:05 — [Run Integration Tests]
    Test environment: PostgreSQL test DB + test Okta tenant
    
    TestCase: InvestorAlerts.SendAlert_WhenOwnershipDrops()
      Database: Connected ✅
      Okta: Mock tenant auth ✅
      Alert service: Sending via SendGrid ✅
    ✅ 156 integration tests passed
    
  2026-07-08 10:50:30 — [Run Smoke Tests]
    GET https://ownership-service.dev.capital-access.local/health
    ✅ Service is healthy
    
    POST https://api.dev.capital-access.local/api/alerts/test
    ✅ Alert endpoint responds
    
  ✅ DEV DEPLOYMENT COMPLETE
```

**DEV environment is now live with the new feature (disabled by default):**
```
Azure App Configuration (DEV):
  "InvestorOwnershipAlerts": {
    "Enabled": false  ← Feature is OFF, code is deployed but not running
  }
```

Developers can manually enable it in DEV to test:
```bash
az appconfig kv set \
  --name capital-access-dev-config \
  --key "FeatureManagement:InvestorOwnershipAlerts:Enabled" \
  --value true
```

Then test the full flow in DEV before moving to staging.

### Stage 3: Deploy to STAGING (QA Validation)

**Trigger:** Team lead manually approves → clicks "Deploy to Staging" in Azure DevOps.

**What happens:**

```
2026-07-08 14:00:00 — [Manual Trigger: Deploy to Staging]
  Approved by: bob@capital-access.com (Team Lead)
  Release notes: "Investor ownership change alerts. Feature behind toggle."
  
2026-07-08 14:00:15 — [Pre-deployment Checks]
  
  ✅ Staging is healthy (current version running)
  ✅ All images exist in ACR
  ✅ Database migrations are applied in staging
  ✅ Staging feature toggles match production baseline
  
2026-07-08 14:00:30 — [Blue-Green Deployment: Create STAGING-CANARY Slot]
  
  Current (Blue):   ownership-service (v2.1.5, 10 pods)
  New (Green):      ownership-service-canary (v2.1.6, 2 pods)
  
  kubectl apply -f ownership-service-canary-deployment.yaml
  kubectl rollout status deployment/ownership-service-canary -n staging
  ✅ Canary pods are running (2/2 ready)
  
2026-07-08 14:01:00 — [Run E2E Tests Against Canary]
  
  Cypress test suite running:
    ✅ Login flow (Okta)
    ✅ Navigate to Investor Alerts (feature disabled)
    ✅ Alert not visible ✅ (toggle is off)
    
    Manual enable in staging config:
    az appconfig kv set ... InvestorOwnershipAlerts=true
    
    ✅ Alert UI appears
    ✅ Create alert rule
    ✅ Simulate ownership change
    ✅ Email sent to test user
    ✅ Alert marked as "read"
    
  Duration: 8 minutes
  ✅ All E2E tests passed
  
2026-07-08 14:09:15 — [Performance Test (k6 Load Test)]
  
  Simulate: 100 concurrent users viewing alerts for 5 minutes
  
  k6 run --vus 100 --duration 5m load-test.js
  
  Results:
    P50 latency: 120ms ✅
    P95 latency: 450ms ✅
    P99 latency: 800ms ✅
    Error rate: 0.2% ✅
    
  ✅ Performance acceptable (no degradation vs baseline)
  
2026-07-08 14:14:30 — [Security Penetration Test]
  
  OWASP ZAP scans the canary endpoint:
    ✅ No SQL injection vectors
    ✅ No XSS vulnerabilities
    ✅ No CSRF tokens missing
    ✅ Auth tokens properly validated
    
  ✅ Security gates passed
  
2026-07-08 14:20:00 — [Swap: Canary → Production Slot]
  
  If everything above is green, swap the slots:
  kubectl patch service ownership-service \
    -p '{"spec":{"selector":{"version":"v2.1.6"}}}'
  
  Traffic is now:
    Old (v2.1.5): 0 pods
    New (v2.1.6): 10 pods (all traffic)
  
  ✅ Staging now running v2.1.6
  
2026-07-08 14:20:15 — [QA Manual Testing in Staging]
  
  QA team has 2 hours to validate against test cases:
  
  Test Case 1: "Investor Alert Creation"
    ✅ User logs in
    ✅ Navigates to Alerts (feature disabled for QA user)
    ✅ Feature not visible ✅ (expected)
    ✅ Admin enables feature toggle
    ✅ Feature now visible ✅
    ✅ User creates alert rule
    ✅ Alert rule saved in DB
    ✅ PASS
    
  Test Case 2: "Alert Notification Email"
    ✅ Ownership changes in test DB
    ✅ Event published to Service Bus
    ✅ Notifications Service receives event
    ✅ Email sent to alert subscriber
    ✅ Email contains investor name + ownership %
    ✅ PASS
    
  QA Approval: "Ready for production ✅"
  
2026-07-08 16:30:00 — [STAGING DEPLOYMENT COMPLETE]
  Staging now running v2.1.6 with feature toggle OFF by default
```

### Stage 4: Deploy to PRODUCTION (With Monitoring)

**Trigger:** Manager approves release → clicks "Deploy to Production".

```
2026-07-08 17:00:00 — [Manual Release Approval]
  
  Release Manager Checklist:
    ✅ All gates passed (DEV, Staging, E2E, security)
    ✅ Release notes approved
    ✅ Rollback plan documented
    ✅ On-call engineer is standing by
    ✅ Slack #deployments channel notified
    
  Release initiated by: carol@capital-access.com (Release Manager)
  
2026-07-08 17:00:15 — [Pre-Production Checks]
  
  ✅ Production is healthy (health checks all green)
  ✅ All images in ACR
  ✅ Database migrations tested in staging
  ✅ Feature toggles: InvestorOwnershipAlerts = DISABLED
  ✅ No active incidents in production
  
2026-07-08 17:00:30 — [Blue-Green Deployment: Create PROD-CANARY]
  
  Current (Blue):   ownership-service (v2.1.5, 50 pods across availability zones)
  New (Green):      ownership-service-canary (v2.1.6, 5 pods in 1 AZ)
  
  kubectl apply -f ownership-service-prod-canary-deployment.yaml
  kubectl rollout status deployment/ownership-service-prod-canary -n prod
  ✅ Canary pods ready (5/5)
  
2026-07-08 17:01:00 — [Canary Smoke Tests]
  
  GET https://ownership-service.prod.capital-access.com/health
  ✅ Canary is responding
  
  GET https://api.prod.capital-access.com/api/owners/123?tenant=spg-001
  ✅ Canary returns data
  
  ✅ Smoke tests passed (1 minute)
  
2026-07-08 17:02:00 — [Gradual Traffic Shift: Canary (10%)]
  
  APIM config: Route 10% of traffic to canary, 90% to production
  
  kubectl set image deployment/ownership-service-canary-ingress \
    weight=10 target=100
  
  Monitoring (Application Insights):
  
  2026-07-08 17:02:05 — [+0:05 min]
    Canary pods:    Error rate 0.1%, P95 latency 140ms ✅
    Blue pods:      Error rate 0.05%, P95 latency 120ms ✅
    Difference:     Within acceptable range ✅
  
  2026-07-08 17:03:00 — [+1:00 min]
    Canary pods:    Error rate 0.08%, P95 latency 145ms ✅
    Blue pods:      Error rate 0.06%, P95 latency 118ms ✅
    Stable for 1 min ✅
  
2026-07-08 17:03:15 — [Gradual Traffic Shift: Canary (25%)]
  
  kubectl set image deployment/ownership-service-canary-ingress \
    weight=25 target=100
  
  2026-07-08 17:04:00 — [+1:15 min at 25%]
    Canary pods:    Error rate 0.09%, P95 latency 142ms ✅
    Increase requests 2.5×, latency flat ✅
  
2026-07-08 17:04:15 — [Gradual Traffic Shift: Canary (50%)]
  
  kubectl set image deployment/ownership-service-canary-ingress \
    weight=50 target=100
  
  2026-07-08 17:05:00 — [+2:00 min at 50%]
    Canary pods:    Error rate 0.07%, P95 latency 148ms ✅
    Healthy under 50% load ✅
  
2026-07-08 17:05:15 — [Gradual Traffic Shift: Canary (100%)]
  
  All traffic now routes to v2.1.6 canary
  Old v2.1.5 blue pods are drained
  
  kubectl patch service ownership-service \
    -p '{"spec":{"selector":{"version":"v2.1.6"}}}'
  
  2026-07-08 17:06:00 — [+3:00 min, 100% traffic shifted]
    Canary pods:      Error rate 0.06%, P95 latency 125ms ✅
    All v2.1.6 pods:  50 replicas healthy
    Drain old pods:   v2.1.5 pods shutting down gracefully
    
  ✅ PRODUCTION DEPLOYMENT COMPLETE
  
2026-07-08 17:06:30 — [Post-Deployment Validation]
  
  ✅ Health checks: All regions responding (US-East, EU-West, APAC)
  ✅ Database: No migration errors, schema correct
  ✅ Feature toggles: InvestorOwnershipAlerts still DISABLED ✅
  ✅ API latency: P95 = 125ms (baseline = 120ms, +4% acceptable)
  ✅ Error rate: 0.06% (target < 1%, we're at 0.06% ✅)
  ✅ No cascading failures in dependent services
  
2026-07-08 17:07:00 — [Notification]
  
  Slack #deployments:
  
    ✅ DEPLOYMENT SUCCESSFUL
    Service: ownership-service
    Version: v2.1.6
    Time to deploy: 6 minutes 30 seconds
    Regions: US-East ✅ | EU-West ✅ | APAC ✅
    Errors: 0.06% (all baseline noise)
    P95 latency: 125ms (baseline: 120ms, +4%)
    
    Deployment monitoring window: 10 minutes
    
    Old version: v2.1.5 (gracefully shut down)
    Rollback command: [If needed, click here] (one-click)
```

### What Happens If Something Goes Wrong

**Scenario: Error rate spikes to 5% during deployment**

```
2026-07-08 17:04:30 — [ALERT: High Error Rate Detected]
  
  Application Insights detects:
    Error rate: 0.1% baseline → 5.2% current ⚠️
    P95 latency: 120ms baseline → 850ms current ⚠️
    
  Automated gate check:
    Condition: Error rate < 1%?
    Actual: 5.2%?
    Result: GATE FAILED ❌
  
  On-Call Engineer alerted via PagerDuty:
    "Production deployment gate failed: error rate spike"
  
2026-07-08 17:04:45 — [AUTOMATIC ROLLBACK INITIATED]
  
  System automatically swaps slots back:
  
  kubectl patch service ownership-service \
    -p '{"spec":{"selector":{"version":"v2.1.5"}}}'
  
  Traffic shift:
    v2.1.6 (new): 100% → 0%
    v2.1.5 (old): 0% → 100%
  
  Rollback time: 30 seconds
  
  Post-rollback (10 seconds):
    Error rate: 5.2% → 0.08% ✅
    P95 latency: 850ms → 120ms ✅
    
  ✅ PRODUCTION RESTORED
  
2026-07-08 17:05:00 — [Post-Incident]
  
  Slack #incidents:
    🔴 ROLLBACK: ownership-service v2.1.6 → v2.1.5
    Reason: Error rate spike (5.2% detected at gate)
    Duration of outage: 30 seconds
    Current status: All services healthy ✅
    
    Oncall will investigate root cause.
    Deployment can be retried after fix is applied.
  
  Root cause analysis (next day):
    Code review found: Bug in new alert parsing logic
    Specific case: malformed alert object from old Service Bus message
    
    Fix: Deployed v2.1.7 (with backward-compat handling)
    Re-deployment: v2.1.7 passes all gates ✅
    Production: v2.1.7 deployed successfully ✅
```

### Real-Time Deployment Metrics

**Dashboard visible in real-time during deployment:**

```
Capital Access Deployment Dashboard (Azure DevOps)

Pipeline Status:
  Build:              ✅ SUCCESS (2m 15s)
  Unit Tests:         ✅ PASSED (47 tests)
  Integration Tests:  ✅ PASSED (156 tests)
  E2E Tests:          ✅ PASSED (23 tests)
  Security Scan:      ✅ PASSED (0 critical)
  
Dev Deployment:       ✅ COMPLETE (3m 40s)
Staging Deployment:   ✅ COMPLETE (8m 30s)
Production Deployment: ⏳ IN PROGRESS
  - Canary creation: ✅ (5 pods ready)
  - Smoke tests:     ✅ (passed in 1m)
  - Traffic 10%:     ✅ (1m 00s, stable)
  - Traffic 25%:     ✅ (1m 15s, stable)
  - Traffic 50%:     ⏳ (current, monitoring...)
  
Metrics (Live):
  Error Rate:        0.06% (target: < 1%)  ✅
  P95 Latency:       125ms  (baseline: 120ms, +4%) ✅
  P99 Latency:       240ms  (baseline: 250ms, -4%) ✅
  Requests/sec:      45K    (healthy)
  Success Rate:      99.94% ✅
  
Target Deployment Time:
  Canary to 100%: 5 minutes remaining
  Post-validation: 10 minutes monitoring
  Total: ~15 minutes remaining
```

### Common Interview Questions on CI/CD

**Q: What happens if a PR fails linting?**
A: The pipeline stops at the Lint stage. The developer gets a link to the failing check, fixes the linting errors locally, pushes again, and the pipeline re-runs automatically. The PR can't be merged until linting passes.

**Q: How do you handle database migrations during deployment?**
A: Migrations are versioned alongside the code (EF Core migrations). The deployment pipeline:
1. Applies migrations to staging first
2. Verifies rollback scripts work
3. Then deploys to production (migrations run as part of app startup)
If a migration fails, the app won't start, and health checks fail, triggering automatic rollback.

**Q: Can you deploy to just one microservice, or does the whole pipeline deploy everything?**
A: Each microservice is independently deployable. Each has its own pipeline. The Ownership Service pipeline doesn't touch the Notifications Service. This is crucial for scaling — you can deploy the Targeting Service 5 times a day without redeploying Contacts.

**Q: What if you need to deploy a hotfix urgently?**
A: The same pipeline runs. No skipping gates. However, you can:
1. Create a hotfix branch from main (not a feature branch)
2. Fast-track through code review (team lead + 1 approval, not 2)
3. Deploy to staging (1-2 hours of testing instead of full day)
4. Deploy to production with same gates (error rate, latency, health checks)
Even in urgent mode, you don't bypass the automated gates — you just move faster through the manual gates.

**Q: How do you coordinate deployments across multiple services?**
A: Each service is independent. If Ownership and Notifications are both deploying on the same day:
- Both deploy to dev automatically
- Both deploy to staging in parallel (separate pipelines)
- Both deploy to production, but sequenced (not simultaneously)
  - Ownership goes first (no dependents)
  - Then Notifications (depends on Ownership Service Bus topics)
This is orchestrated by deployment release trains (scheduled weekly windows).

**Q: What happens if feature toggles get out of sync?**
A: Feature toggles are versioned in source control (in a `config/toggles.json` file or via Azure App Configuration APIs that track history). Each deployment includes a snapshot of the toggle state. If someone manually edits a toggle in production and it causes issues, you can replay the correct state from source control.

---


---

## Advanced Operations & Production Scenarios — Interview FAQ

These are the questions that separate senior engineers from mid-level: not just *building* the system, but *operating* it at scale under real conditions.

### Q1. How do you manage traffic while keeping costs efficient, and monitor/troubleshoot failures?

**The Problem:**
Capital Access sees bursty traffic — quiet all day, then 9:00 AM (market open) all 2,500 IR teams hit the platform simultaneously to check overnight ownership changes. At 3:00 PM, traffic drops to 10% of peak. If we provision for peak, we waste 90% of infrastructure costs during off-peak. If we provision for average, we fail at 9 AM.

**The Solution — Auto-scaling + Reserved Capacity:**

We use Azure App Service auto-scaling rules:
```
Scale-out trigger: CPU > 70% for 5 minutes → add 1 instance (max 10)
Scale-in trigger: CPU < 30% for 10 minutes → remove 1 instance (min 2)
```

Baseline: 2-3 instances (covers off-peak and provides HA). During peak: scales to 8-10 instances. This costs 60% less than provisioning for peak 24/7.

**Cost Monitoring:**
- Set up Azure Cost Management alerts: notify if monthly spend exceeds budget
- Azure Advisor recommends rightsizing unused instances
- Log auto-scale events to Application Insights: track when scaling happened and why

**Failure Troubleshooting:**
- **Instance down**: App Service health probe (GET /health endpoint) detects and routes traffic around it
- **Slow response**: Application Insights shows which dependency is slow (DB, external API, cache miss)
- **High error rate**: Set alert in Azure Monitor: if error rate > 5% for 5 minutes, page oncall

**Interview line:**
> "We auto-scale based on CPU thresholds, which keeps costs low during off-peak and handles unpredictable spikes. We monitor with Application Insights — if a dependency times out, we see it immediately. Failed instances are automatically removed from the load balancer via health probes."

---

### Q2. How do you ensure success in high-traffic scenarios without overprovisioning? How do you pinpoint root cause?

**The Challenge:**
During a regulatory filing season quarter-end, ownership data updates surge. Without careful tuning, we'd over-scale and waste millions. With poor observability, root cause investigation takes hours.

**Pre-Production Load Testing:**
Before quarter-end, we load-test with a realistic spike:
```
Baseline: 1,000 QPS
Spike: 10,000 QPS for 30 minutes
Goal: P95 latency < 2s, no errors
```

We run this against production-like infrastructure and watch:
- **DB CPU**: Are queries efficient enough to handle 10× load?
- **Cache hit rate**: Does Redis cache hit 95%? If not, increase TTL or add more keys
- **Connection pool**: Does EF Core connection pooling hold steady, or are we exhausting the pool?

If something breaks, we fix it (add index, optimize query, increase cache) before the real spike hits.

**Application Site Configuration for Root Cause:**
Azure Application Insights gives us a distributed trace timeline:
```
Request: /api/targeting/scores?investors=500
├─ ASP.NET (50ms) ← controller execution
├─ Redis (5ms) ← cache hit, fast
├─ Azure SQL (1500ms) ← slow! Here's your bottleneck
└─ Service Bus (10ms)
```

We can see exactly which hop is slow. If it's the database, we check the execution plan. If it's an external API, we check if that service is degraded.

**Dynamic Threshold Adjustment:**
During actual traffic spikes, we don't use static thresholds. We use:
- **Predictive scaling**: Azure App Service can predict load based on historical patterns and scale *preemptively* before the spike hits
- **Custom metrics**: Log a metric `OutstandingOrdersInQueue` and scale when it exceeds 500 (don't wait for CPU to spike)

**Interview line:**
> "We load-test before known traffic spikes to find bottlenecks proactively. In production, Application Insights shows us exactly which dependency is slow — database, cache, or external call. We use custom metrics and historical patterns to scale preemptively, not reactively on CPU."

---

### Q3. How do you find the tracecode for scaling decisions? How do you set up distributed tracing?

**The Problem:**
A request from one Angular user flows through APIM → Ownership Service → Cosmos DB → Targeting Service → Azure SQL → back to the user. If it's slow, which hop took the time? With 2,500 tenants making requests, how do you find the slow one?

**The Solution — Correlation ID:**

At the Azure Front Door level, we generate or passthrough a `X-Correlation-ID` header:
```
Request: GET /api/targeting/scores
Headers: X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

This ID flows through **every** service call, **every** database query, **every** Service Bus message:

```csharp
// In APIM, set the correlation ID
context.Request.Headers.Add("X-Correlation-ID", Guid.NewGuid().ToString());

// In each microservice, extract it and log it
public class CorrelationIdMiddleware
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        var correlationId = ctx.Request.Headers["X-Correlation-ID"].ToString();
        ctx.Items["CorrelationId"] = correlationId;
        
        // All logs from this point forward include the correlation ID
        _logger.LogInformation("Processing request {CorrelationId}", correlationId);
        
        await _next(ctx);
    }
}

// In EF Core, log the correlation ID with the query
var query = _db.TargetingScores
    .Where(t => t.InvestorIds.Contains(investorId))
    .WithCorrelationId(correlationId)  // custom extension
    .ToListAsync();
```

**Application Insights Integration:**
```
Application Insights Dashboard:
Search by Correlation ID: 550e8400-e29b-41d4-a716-446655440000

Results:
├─ 2026-07-08 09:15:22.001 APIM [GET /api/targeting/scores] (50ms)
├─ 2026-07-08 09:15:22.051 Targeting Service [Call Ownership Service] (100ms)
├─ 2026-07-08 09:15:22.151 Ownership Service [Query Cosmos DB] (800ms) ← SLOW
├─ 2026-07-08 09:15:23.001 Targeting Service [Local calculation] (200ms)
└─ 2026-07-08 09:15:23.201 APIM [Response sent] (1,150ms total)
```

One search finds the entire request journey across all services.

**Interview line:**
> "We use a correlation ID that flows through the entire request — every service logs it, every database query tags it. In Application Insights, we search by correlation ID and see a timeline of every hop. This tells us exactly which service or database took the time. Without it, debugging distributed systems is guesswork."

---

### Q4. How do you adjust CPU thresholds dynamically during traffic spikes?

**The Challenge:**
Static thresholds break under stress. If we set "scale when CPU > 70%", at 9 AM when CPU jumps to 80% instantly, auto-scale reacts *after* the spike has already caused latency.

**The Solution — Predictive + Custom Metrics:**

**Azure App Service Predictive Scaling:**
```
Enable: App Service Plan → Scale out → Predictive scaling
Logic: "Based on historical usage at this day/time, scale to N instances 10 minutes early"

Example:
Every Tuesday at 8:50 AM, scale to 8 instances (peak is at 9:00 AM)
Every day at 6:00 PM, scale down to 2 instances
```

**Custom Metrics for Precise Trigger:**
Instead of watching generic CPU, watch what actually matters:
```csharp
// In Ownership Service: log a metric on how many pending recalculations we have
public class OwnershipService
{
    public async Task RecalculateAsync()
    {
        var pending = await _queue.GetApproximateCountAsync();
        _telemetryClient.GetMetric("PendingRecalculationQueue").TrackValue(pending);
        
        // Scale rule: if PendingRecalculationQueue > 500, add instances
        // This scales BEFORE latency appears, not after
    }
}
```

**Real-Time Threshold Adjustment:**
```
OnCall Engineer (9:00 AM on quarter-end)
  1. Sees PendingRecalculationQueue growing to 200 → 300 → 400
  2. Preemptively increases CPU scale-out threshold from 70% to 80% (gives App Service more headroom)
  3. Increases custom metric threshold: PendingRecalculationQueue from 500 to 800 (allows queue to buffer more)
  4. Monitors Application Insights for P95 latency
  5. If P95 latency stays < 2s, we're good
  6. If P95 latency creeps to 3s, roll back thresholds and call for more investigation
```

**Telemetry for Deeper Insight:**
```csharp
// Log not just CPU, but: queue depth, cache hit rate, DB connections in use
_telemetryClient.GetMetric("TargetingServiceCacheHitRate").TrackValue(0.96);
_telemetryClient.GetMetric("DbConnectionPoolUtilization").TrackValue(0.72);
_telemetryClient.GetMetric("OutstandingApiCalls").TrackValue(1200);

// These metrics tell us:
// - Cache is healthy (96% hit rate, no need to evict)
// - DB connections aren't exhausted (72% used, 28% headroom)
// - We have 1,200 requests in flight (is that normal for this load?)
```

**Interview line:**
> "We don't rely on static CPU thresholds. We use predictive scaling to preemptively scale before known traffic spikes, and custom metrics to scale on what matters (queue depth, connection pool usage) not generic CPU. During unexpected spikes, we monitor Application Insights telemetry and adjust thresholds on the fly if needed."

---

### Q5. How do you implement authentication and security across microservices? How do you manage secrets?

**The Challenge:**
6 microservices, each needs to authenticate API calls. Each needs database credentials, API keys, certificates. If we hardcode secrets in code, we fail every security audit. If we hardcode them in config files, we risk accidental commits to GitHub.

**The Solution — Managed Identity + Key Vault:**

**Service-to-Service Auth:**
```csharp
// Ownership Service needs to call Targeting Service
// Both services are registered as Managed Identities in Azure AD

// Ownership Service (caller)
var credential = new DefaultAzureCredential();
var client = new HttpClient();
var token = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "https://targetingservice.azurewebsites.net/.default" })
);
client.DefaultRequestHeaders.Authorization = 
    new AuthenticationHeaderValue("Bearer", token.Token);

var response = await client.GetAsync("https://targetingservice.azurewebsites.net/api/scores");

// Targeting Service (receiver)
// Middleware validates the JWT: issuer must be https://sts.windows.net/{tenantId}/
// aud (audience) must be our app's ID
// If valid, trust the claims and process the request
```

**Database Access:**
```csharp
// Instead of storing "password" in Key Vault:
var connectionString = await _keyVaultClient.GetSecretAsync("Ownership-DB-Connection");

// We use Managed Identity:
builder.Services.AddDbContext<OwnershipDbContext>(options =>
{
    var connection = new SqlConnection()
    {
        ConnectionString = "Server=ownership-sql.database.windows.net;Database=OwnershipDb;",
        AccessToken = await new DefaultAzureCredential().GetTokenAsync(
            new TokenRequestContext(new[] { "https://database.windows.net/.default" })
        ).Result.Token
    };
    options.UseSqlServer(connection);
});
```

**Secrets Management:**
```
Azure Key Vault stores only:
- Non-rotatable config (environment URLs, tenant IDs)
- Certificates for TLS
- API keys for third-party services (S&P Capital IQ)

NOT stored:
- Database passwords (use Managed Identity instead)
- JWT signing keys for our own tokens (certificates are stored, but keys are generated once and kept in-memory)
- Connection strings (constructed dynamically with Managed Identity token)
```

**Secret Rotation (Automatic):**
```
Third-party API keys (e.g., S&P Capital IQ, Okta):
1. Admin rotates key in the third-party service
2. Admin updates the secret in Key Vault
3. App Service automatically reloads the secret on next restart or via Key Vault refresh
4. No downtime, no manual intervention

Database passwords:
Not needed — Managed Identity tokens refresh automatically
```

**Interview line:**
> "We use Azure Managed Identity for database and service-to-service authentication — no passwords to manage. Third-party API keys are stored in Key Vault and rotated by updating the vault, not redeploying code. This keeps secrets out of the codebase entirely and makes rotation frictionless."

---

### Q6. How do you secure Key Vault and Azure without adding secrets to code?

**The Problem:**
To access Key Vault, you need credentials. But where do those credentials live? If you put them in code, you've just moved the problem.

**The Solution — Managed Identity:**

```csharp
// NO credentials needed. App Service has an identity assigned by Azure AD.
var credential = new DefaultAzureCredential();
var client = new SecretClient(new Uri("https://capital-access-kv.vault.azure.net/"), credential);

// This works because:
// 1. App Service has an identity (managed by Azure)
// 2. That identity has a role assignment in Key Vault: "Key Vault Secrets User"
// 3. Azure AD verifies the identity and grants access automatically
// 4. No credentials in code, config, or environment variables
```

**Setting up the permissions (one-time):**
```bash
# Create Managed Identity for the Ownership Service
az identity create --name OwnershipServiceIdentity --resource-group capital-access

# Assign the identity to the App Service
az webapp identity assign --resource-group capital-access --name ownership-service-app \
  --identities OwnershipServiceIdentity

# Grant the identity access to Key Vault
az keyvault set-policy --name capital-access-kv \
  --object-id $(az identity show --name OwnershipServiceIdentity -g capital-access --query principalId -o tsv) \
  --secret-permissions get

# Grant the identity access to Blob Storage
az role assignment create --assignee $(az identity show --name OwnershipServiceIdentity -g capital-access --query principalId -o tsv) \
  --role "Storage Blob Data Reader" \
  --scope /subscriptions/{subscriptionId}/resourceGroups/capital-access/providers/Microsoft.Storage/storageAccounts/reportblobs
```

**Certificate Rotation (automated):**
```csharp
// Certificates in Key Vault auto-renew 30 days before expiry
// App Service pulls the new cert on next restart
// No manual intervention needed

// For custom rotation:
public class CertificateRotationService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var cert = await _keyVaultClient.GetCertificateAsync("app-signing-cert");
            if (cert.Properties.ExpiresOn < DateTimeOffset.UtcNow.AddDays(30))
            {
                _logger.LogWarning("Certificate expires soon, alert oncall");
                // Send alert to monitoring
            }
            await Task.Delay(TimeSpan.FromDays(1), stoppingToken);
        }
    }
}
```

**Interview line:**
> "We use Managed Identity so credentials never leave Azure. Each microservice has an identity, which gets role assignments in Key Vault and Storage. The app calls DefaultAzureCredential() and Azure AD handles authentication behind the scenes. Certificates auto-renew in Key Vault without code changes."

---

### Q7. How do you integrate new features into existing systems with agile/DevOps practices?

**The Scenario:**
New feature: "Investor Alerts" — notify IR teams when a new investor opens a position. Spans multiple services: Ownership (detects change), Notifications (sends alert), Contacts (looks up email).

**The Approach:**

**Step 1 — Feature flags (not hard deployments):**
```csharp
[HttpPost("entities/{id}/alerts/subscribe")]
public async Task<IActionResult> SubscribeToAlerts(int id)
{
    if (!_featureManager.IsEnabledAsync("InvestorAlerts").Result)
        return StatusCode(501, "Feature not yet enabled");
    
    // Subscribe logic here
}

// In Azure App Configuration:
InvestorAlerts = false (in Prod) → true (in Dev) → true (in Staging after validation)
```

**Step 2 — Database migration (backward-compatible):**
```csharp
// Migration 1: Add the table (doesn't break existing code)
migrationBuilder.CreateTable(
    name: "InvestorAlerts",
    columns: new {
        Id = migrationBuilder.Column<int>(),
        InvestorId = migrationBuilder.Column<int>(),
        AlertType = migrationBuilder.Column<string>()
    }
);

// No code changes yet — the new table exists but isn't used
// Previous version of the app still runs fine
```

**Step 3 — Service logic (feature-flagged):**
```csharp
// Ownership Service publishes a new event type (only if flag is on)
public async Task RecalculateAsync()
{
    if (await _featureManager.IsEnabledAsync("InvestorAlerts"))
    {
        var message = new InvestorPositionOpened { InvestorId = 123, Date = now };
        await _serviceBus.PublishAsync(message);
    }
}
```

**Step 4 — Notifications Service subscribes (feature-flagged):**
```csharp
// Only process the event if the flag is on
public async Task Handle(InvestorPositionOpened @event)
{
    if (!await _featureManager.IsEnabledAsync("InvestorAlerts"))
        return;
    
    var alert = new Alert { InvestorId = @event.InvestorId };
    await _alertService.SendAsync(alert);
}
```

**Step 5 — Deploy without risk:**
```
Monday: Deploy all services with InvestorAlerts = false in Prod
        Run smoke tests (code is deployed, feature is off, no impact)
Tuesday: Enable in Staging, test with real data
Wednesday: Gradually enable in Prod (start at 10% of traffic via feature flag gradual rollout)
Thursday: 100% enabled if no issues
```

**Interview line:**
> "We use feature flags to decouple deployment from feature enablement. We deploy the code disabled, test it in staging, then gradually enable it in production. This lets us roll back with a config change (not a deployment) if something breaks, and it keeps deployments small and low-risk."

---

### Q8. How do you grant microservices access to Key Vault and Storage securely?

**Step-by-step walkthrough for "Ownership Service needs to read a secret from Key Vault":**

```bash
# Step 1: Create a Managed Identity for the service
az identity create \
  --resource-group capital-access \
  --name OwnershipServiceIdentity

# Step 2: Get the identity's object ID (used for role assignments)
IDENTITY_ID=$(az identity show \
  --name OwnershipServiceIdentity \
  --resource-group capital-access \
  --query principalId -o tsv)

# Step 3: Assign the identity to the App Service instance
az webapp identity assign \
  --resource-group capital-access \
  --name ownership-service-app \
  --identities OwnershipServiceIdentity

# Step 4: Grant the identity "Key Vault Secrets User" role (can read, cannot write)
az keyvault set-policy \
  --name capital-access-kv \
  --object-id $IDENTITY_ID \
  --secret-permissions get list

# Step 5: Grant the identity "Storage Blob Data Reader" role for backup files
az role assignment create \
  --assignee $IDENTITY_ID \
  --role "Storage Blob Data Reader" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/capital-access/providers/Microsoft.Storage/storageAccounts/capitalaccessblobs

# Verify permissions
az identity show-msi-details --id $IDENTITY_ID

# Test from the app
# var secret = await keyVaultClient.GetSecretAsync("ownership-s2s-key");
# If this works, the identity is properly configured ✅
```

**Why this is secure:**
- No credentials in code
- Identity is scoped to one service (Ownership Service can't access Targeting Service's secrets)
- Role is scoped to one permission ("Secrets User" = read-only, can't rotate or delete)
- Auditable: every access is logged in Azure AD audit logs with the service identity, timestamp, and resource

**Interview line:**
> "We assign each microservice a Managed Identity and grant it the minimal role (read-only for secrets, read-only for storage blobs). This is configured once in Azure CLI. The app uses DefaultAzureCredential() and Azure handles the authentication. Every access is auditable."

---

### Q9. How would you configure Managed Identity in code to securely access Key Vault and Blob Storage?

**Code walkthrough:**

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

// 1. Managed Identity for Key Vault
var credential = new DefaultAzureCredential();
var secretClient = new SecretClient(
    new Uri("https://capital-access-kv.vault.azure.net/"),
    credential
);

// 2. Load secrets at startup (once)
var dbConnectionString = await secretClient.GetSecretAsync("OwnershipDb-ConnectionString");
var jwtKey = await secretClient.GetSecretAsync("JWT-SigningKey");

// 3. Add DbContext with the retrieved connection string
builder.Services.AddDbContext<OwnershipDbContext>(options =>
{
    options.UseSqlServer(dbConnectionString.Value.Value);
});

// 4. Add Blob Storage client with Managed Identity
builder.Services.AddSingleton(
    new BlobContainerClient(
        new Uri("https://capitalaccess.blob.core.windows.net/ownership-backups"),
        credential
    )
);

var app = builder.Build();

// 5. Test that permissions work (fails fast if identity is misconfigured)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<OwnershipDbContext>();
    await dbContext.Database.ExecuteSqlAsync($"SELECT 1");
    Console.WriteLine("✅ Database connection successful");
}

app.Run();
```

**Handling secret expiration / rotation:**

```csharp
public class SecretRefreshService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SecretClient _keyVaultClient;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Every 24 hours, check if secrets are about to expire
                var jwtSecret = await _keyVaultClient.GetSecretAsync("JWT-SigningKey");
                var expiresIn = (jwtSecret.Properties.ExpiresOn ?? DateTimeOffset.MaxValue) - DateTimeOffset.UtcNow;
                
                if (expiresIn < TimeSpan.FromDays(7))
                {
                    // Alert oncall 7 days before expiry
                    _logger.LogWarning("JWT-SigningKey expires in {Days} days", expiresIn.Days);
                    // Send PagerDuty alert or Slack notification
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Secret refresh check failed");
            }
            
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
```

**Blob Storage upload with Managed Identity:**

```csharp
public class OwnershipBackupService
{
    private readonly BlobContainerClient _containerClient;
    
    public async Task BackupAsync(OwnershipData data)
    {
        var blobName = $"ownership-{DateTime.UtcNow:yyyy-MM-dd-HH-mm-ss}.json";
        var blobClient = _containerClient.GetBlobClient(blobName);
        
        // Serialize and upload
        var json = JsonSerializer.Serialize(data);
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
        
        // This uses Managed Identity — no connection string needed
        await blobClient.UploadAsync(stream, overwrite: true);
        
        // Set retention: delete after 90 days
        var blobProperties = await blobClient.GetPropertiesAsync();
        // Azure Blob lifecycle policy handles cleanup (configured at container level)
    }
}
```

**Interview line:**
> "I use DefaultAzureCredential() to get an identity token at startup, then pass it to SecretClient, DbContext, and BlobContainerClient. Secrets are loaded once from Key Vault. I monitor secret expiry and alert 7 days before. Blob Storage uploads use the same identity. No connection strings or passwords ever touch the code."

---

### Q10. How do you configure CI/CD for secure, environment-specific deployments with post-deployment validation?

**The Pipeline (Azure DevOps):**

```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  # Stage 1: Build & Test
  - stage: BuildTest
    jobs:
      - job: Build
        steps:
          - task: UseDotNet@2
            inputs:
              version: '8.0.x'
          
          - task: DotNetCoreCLI@2
            displayName: 'Restore packages'
            inputs:
              command: 'restore'
              projects: '**/*.csproj'
          
          - task: DotNetCoreCLI@2
            displayName: 'Build'
            inputs:
              command: 'build'
              arguments: '--configuration Release'
          
          - task: DotNetCoreCLI@2
            displayName: 'Run unit tests'
            inputs:
              command: 'test'
              arguments: '--configuration Release /p:CollectCoverage=true'
          
          - task: DotNetCoreCLI@2
            displayName: 'Publish'
            inputs:
              command: 'publish'
              publishWebProjects: true
              arguments: '--configuration Release --output $(Build.ArtifactStagingDirectory)'
          
          - task: PublishBuildArtifacts@1
            inputs:
              artifactName: 'drop'

  # Stage 2: Deploy to Staging
  - stage: DeployStaging
    dependsOn: BuildTest
    condition: succeeded()
    jobs:
      - deployment: Deploy
        displayName: 'Deploy to Staging'
        environment: 'Staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  displayName: 'Deploy App Service'
                  inputs:
                    azureSubscription: 'Capital-Access-Staging'
                    appType: 'webAppLinux'
                    appName: 'ownership-service-staging'
                    package: '$(Pipeline.Workspace)/drop/**/*.zip'
                
                - task: AzureAppServiceManage@0
                  displayName: 'Swap slots (blue-green)'
                  inputs:
                    azureSubscription: 'Capital-Access-Staging'
                    action: 'Swap Slots'
                    appName: 'ownership-service-staging'
                    resourceGroupName: 'capital-access-staging'
                    sourceSlot: 'staging'
                    targetSlot: 'production'

  # Stage 3: Smoke Tests (Post-Deploy Validation)
  - stage: SmokeTests
    dependsOn: DeployStaging
    condition: succeeded()
    jobs:
      - job: PostDeployValidation
        displayName: 'Post-Deployment Smoke Tests'
        steps:
          - task: UseDotNet@2
            inputs:
              version: '8.0.x'
          
          - script: |
              echo "Testing /api/health endpoint..."
              curl -v https://ownership-service-staging.azurewebsites.net/api/health
              
              echo "Testing database connectivity..."
              # Run a simple query against the DB
              
              echo "Testing Key Vault access..."
              # Verify Managed Identity can read a test secret
              
              echo "Testing Service Bus connectivity..."
              # Publish a test message to Service Bus
            displayName: 'Run smoke tests'
          
          - script: |
              echo "Checking Application Insights for errors..."
              # Query App Insights: if error rate > 1% in last 5 min, fail
              # az monitor metrics list --resource staging-app \
              #   --metric ErrorPercentage --interval PT5M --aggregation Average
            displayName: 'Check Application Insights'
          
          - task: PublishTestResults@2
            displayName: 'Publish test results'
            inputs:
              testResultsFormat: 'NUnit'
              testResultsFiles: '**/test-results.xml'

  # Stage 4: Deploy to Production (Manual Approval)
  - stage: DeployProduction
    dependsOn: SmokeTests
    condition: succeeded()
    jobs:
      - deployment: DeployProd
        displayName: 'Deploy to Production'
        environment: 'Production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  displayName: 'Deploy to Production'
                  inputs:
                    azureSubscription: 'Capital-Access-Production'
                    appType: 'webAppLinux'
                    appName: 'ownership-service-prod'
                    package: '$(Pipeline.Workspace)/drop/**/*.zip'
                
                - script: |
                    echo "Post-deployment validation..."
                    curl -v https://ownership-service.azurewebsites.net/api/health
                    
                    # Rollback if health check fails
                    if [ $? -ne 0 ]; then
                      echo "Health check failed, rolling back..."
                      az webapp deployment slot swap \
                        --name ownership-service-prod \
                        --resource-group capital-access \
                        --slot staging
                      exit 1
                    fi
                  displayName: 'Validate production deployment'

  # Stage 5: Production Smoke Tests (Continuous Monitoring)
  - stage: ProductionMonitoring
    dependsOn: DeployProduction
    condition: succeeded()
    jobs:
      - job: ContinuousMonitoring
        displayName: 'Monitor production for 10 minutes'
        steps:
          - script: |
              echo "Querying Application Insights for errors..."
              # SELECT COUNT(*) FROM exceptions 
              # WHERE timestamp > now - 10min
              # If > 0, page oncall
            displayName: 'Check for exceptions'
```

**Environment-Specific Configuration:**
```
# appsettings.staging.json
{
  "KeyVault": "https://capital-access-staging-kv.vault.azure.net/",
  "Database": "Server=staging-sql.database.windows.net;Database=OwnershipDb;",
  "ServiceBus": "https://capital-access-staging.servicebus.windows.net/",
  "FeatureFlags": {
    "InvestorAlerts": true,   // Test new features in staging
    "AdvancedMetrics": true,
    "RateLimiting": false     // Disabled in staging, enabled in prod
  }
}

# appsettings.production.json
{
  "KeyVault": "https://capital-access-kv.vault.azure.net/",
  "Database": "Server=prod-sql.database.windows.net;Database=OwnershipDb;",
  "ServiceBus": "https://capital-access.servicebus.windows.net/",
  "FeatureFlags": {
    "InvestorAlerts": false,  // Disabled until fully validated
    "AdvancedMetrics": false,
    "RateLimiting": true      // Strict rate limiting in prod
  }
}
```

**Interview line:**
> "We have a multi-stage pipeline: build/test → deploy to staging with blue-green swap → post-deploy smoke tests → manual approval → deploy to production → monitor for 10 minutes. Each environment has its own Key Vault and config. If health checks fail in production, we automatically rollback the slot swap."

---



> ℹ️
> **Always ask 2–3 good questions.** It shows genuine interest. Pick ones relevant to what they've discussed.

| Question | Why it's good |
| --- | --- |
| "How is the front-end team structured — are engineers aligned to features or to platform layers?" | Shows you care about team dynamics and working model |
| "What's the biggest technical debt the front-end team is dealing with right now?" | Gets real info about the actual codebase state |
| "How does the team balance new feature delivery with performance and security hardening?" | Shows maturity — you know both sides of the coin matter |
| "Is there a path toward micro-frontends or module federation, or is a monorepo SPA the long-term direction?" | Senior-level question about architectural roadmap |
| "How does accessibility compliance get validated — automated only or manual audits too?" | Relevant to regulated financial enterprise software |
