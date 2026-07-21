# Capital Access — Technical Deep Dives

> 📚 **How to use this document:** This file contains comprehensive deep dives into all technical patterns, services, and architectural decisions in Capital Access. Read this after understanding the high-level architecture in `capital-access-interview-story.md`. Each deep dive is self-contained.

**Quick Navigation:**
- Deep Dive — Azure App Service (Microservices Hosting)
- Deep Dive — Microservices Patterns & Strategies
- Deep Dive — CQRS Pattern (Ownership Data)
- Deep Dive — Okta (Identity / OIDC)
- Deep Dive — Azure Service Bus
- Deep Dive — Azure Functions (Triggers, Bindings, Hosting)
- Deep Dive — Durable Functions
- Deep Dive — Azure Cosmos DB
- Deep Dive — EF Core 8 (IR Engagement & Activity Service)

---

## Deep Dive — Azure App Service (Microservices Hosting)

Azure App Service is the compute tier where all 6 microservices (Ownership, Profiles, Targeting, Contacts, Notifications, Report) run. It is not a container orchestration platform like Kubernetes — it's a managed Platform-as-a-Service (PaaS) that handles the operational complexity of VMs, load balancing, patching, and auto-scaling transparently.

### Why Azure App Service Instead of AKS or VMs?

**Compared to VMs (Azure VMs):**
- VMs require manual OS patching, security updates, and dependency management — each patch is an operational decision and a risk vector
- Capital Access serves 2,500+ regulated clients; every unpatched VM is a compliance audit question
- VMs force you to manage infrastructure — provisioning, decommissioning, networking — that scales linearly with team size
- **App Service abstracts the OS away:** Microsoft patches automatically, certification is simpler, and you focus on code

> **Anticipate this follow-up:** *"But Virtual Machine Scale Sets (VMSS) can autoscale too — so why not VMs?"* — True, and worth saying so directly rather than getting caught out by it. VMSS gives metric-based and schedule-based autoscaling structurally similar to App Service's. **Autoscaling capability was never the differentiator.** The actual reason is *operational ownership of the layer underneath the scaling*: with VMSS you still own OS patching, VM image management, and networking/NSG configuration yourself. With App Service, Microsoft owns everything below the application layer. For a team serving 2,500+ regulated clients, that patching/compliance ownership — not scaling — is what tips the decision toward App Service.

**Compared to AKS (Azure Kubernetes Service):**
- AKS is optimized for systems with 50+ microservices, complex inter-service networking, and polyglot workloads
- Capital Access has 6 microservices, all C# / .NET — we don't need Kubernetes's flexibility
- AKS operators spend time on: service mesh configuration, RBAC policies, node auto-scaling, pod placement constraints, helm charts, network policies
- **App Service is simpler:** deploy a .NET app, it runs; add instances for load — done
- Kubernetes introduces operational risk: a misconfigured ingress, a CrashLoop pod, or a node-drain can cascade failures. Simpler systems have fewer failure modes.

**When to reconsider:**
- If you grow to 50+ services and need service-to-service mesh networking, AKS makes sense
- If you need OS-level customization (custom kernel settings, specialized drivers), VMs are required
- For this interview context at 6 services on a PaaS, App Service is the right call

### How App Service Hosting Works

**Deployment model:**
```
Your .NET 8 microservice (e.g., Ownership Service)
        ↓
Published as Azure App Service Plan (Linux, B2 instance type)
        ↓
App Service instances (2-3 baseline, auto-scale to 5-10)
        ↓
Built-in load balancer routes requests across instances
        ↓
Each instance runs your app in a Kestrel web server
        ↓
Database connections to Azure SQL via Entity Framework Core
```

**Instance types and scaling:**
```
B2 Instance Type (Burstable):
- 2 CPU cores
- 3.5 GB RAM
- Pricing: ~$44/month per instance

Standard Instance Type (S1):
- 1 CPU core
- 1.75 GB RAM  
- Pricing: ~$70/month per instance

P1V2 Instance Type (Premium):
- 1 CPU core
- 3.5 GB RAM
- Pricing: ~$100/month per instance
- Includes custom domains, staging slots, auto-scale

For Capital Access: Use S1 or B2 baseline (2-3 instances per service).
Each instance handles ~2,000-5,000 concurrent requests depending on workload.
With 6 microservices × 3 instances = 18 instances total for baseline HA.
During peak traffic (9:00 AM), scale to 6-8 instances per service = 36-48 instances total.
```

**Built-in load balancing:**
Azure App Service automatically distributes incoming requests across instances using round-robin:
```
Request 1 → Instance 1
Request 2 → Instance 2
Request 3 → Instance 3
Request 4 → Instance 1 (round-robin repeats)
```

This means APIM doesn't need to know about individual instances — it sends all requests to the single App Service DNS name (e.g., `ownership-service.azurewebsites.net`), and App Service handles the distribution internally. This is fundamentally different from Kubernetes, where you explicitly manage Service resources and selector labels.

**Health checks & auto-remediation:**
```csharp
// Every App Service app should expose a /health endpoint
[HttpGet("/health")]
public IActionResult HealthCheck()
{
    return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
}
```

App Service's built-in load balancer pings `/health` every 30 seconds per instance:
- If response is 200, instance is healthy → receives traffic
- If response is non-200 or timeout → instance is removed from the load balancer
- If an instance crashes or becomes unresponsive, it's automatically replaced (within a few minutes)

This is passive health checking — App Service doesn't take action if a single request fails, only if the entire instance becomes unhealthy.

**Auto-scaling configuration:**

```json
{
  "scaleRules": [
    {
      "metricName": "CpuPercentage",
      "threshold": 70,
      "scaleOutInterval": "PT5M",
      "scaleOutStepSize": 1,
      "maxInstances": 10
    },
    {
      "metricName": "CpuPercentage",
      "threshold": 30,
      "scaleInInterval": "PT10M",
      "scaleInStepSize": 1,
      "minInstances": 2
    }
  ]
}
```

Translation:
- When CPU > 70% for 5 minutes, add 1 instance (up to max 10)
- When CPU < 30% for 10 minutes, remove 1 instance (down to min 2)
- Min 2 instances ensures HA even at 0 traffic
- Max 10 instances caps runaway cost during unexpected spikes

**Custom scaling metrics (beyond just CPU):**

Instead of relying solely on CPU (which can be misleading — async code has low CPU but high latency), you can auto-scale on:

```csharp
// In your service, track custom metrics
public class OwnershipServiceHealthCheck : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context)
    {
        var queueDepth = await _serviceBus.GetQueueDepthAsync("ownership-recalc-queue");
        var telemetryClient = new TelemetryClient();
        telemetryClient.GetMetric("QueueDepth").TrackValue(queueDepth);
        
        if (queueDepth > 1000)
            return HealthCheckResult.Degraded("Queue backing up");
        
        return HealthCheckResult.Healthy();
    }
}

// Auto-scale rule: if QueueDepth > 500, scale out
// This scales preemptively before the queue overwhelms the system
```

### Deployment to App Service

**Via Azure CLI:**
```bash
# Build and publish your .NET app
dotnet publish -c Release -o ./publish

# Create a ZIP package
cd publish && zip -r ../app.zip . && cd ..

# Deploy to App Service
az webapp deployment source config-zip \
  --resource-group capital-access \
  --name ownership-service-app \
  --src app.zip

# Restart the app
az webapp restart \
  --resource-group capital-access \
  --name ownership-service-app
```

**Via Azure DevOps CI/CD pipeline (recommended for Capital Access):**
```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildAndPublish
        steps:
          - task: DotNetCoreCLI@2
            inputs:
              command: 'publish'
              projects: '**/OwnershipService.csproj'
              arguments: '--configuration Release'
              publishWebProjects: false
              outputDir: '$(Build.ArtifactStagingDirectory)'
          
          - task: PublishBuildArtifacts@1
            inputs:
              artifactName: 'drop'

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployAppService
        displayName: 'Deploy to Ownership Service App'
        environment: 'Production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: 'Capital-Access-Production'
                    appType: 'webAppLinux'
                    appName: 'ownership-service-app'
                    package: '$(Pipeline.workspace)/drop/**/*.zip'
                    deploymentMethod: 'zipDeploy'
                
                - script: |
                    # Wait for deployment and verify
                    for i in {1..10}; do
                      STATUS=$(curl -s https://ownership-service-app.azurewebsites.net/health)
                      if [ "$STATUS" == "200" ]; then
                        echo "✅ Deployment successful"
                        exit 0
                      fi
                      sleep 5
                    done
                    echo "❌ Deployment health check failed"
                    exit 1
                  displayName: 'Post-deployment health check'
```

### Multi-tenancy on App Service

Capital Access is a multi-tenant system, but **multi-tenancy is not handled by infrastructure — it's enforced in code.**

```csharp
// In your middleware or service layer, enforce tenant isolation
public class TenantMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, ILogger<TenantMiddleware> logger)
    {
        // Extract tenant from JWT claims
        var tenantId = ctx.User.FindFirst("tenant_id")?.Value;
        
        if (string.IsNullOrEmpty(tenantId))
        {
            logger.LogWarning("Request without tenant_id claim");
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }
        
        // Store in items so services can access
        ctx.Items["TenantId"] = tenantId;
        await _next(ctx);
    }
}

// In your DbContext, use global query filters to isolate data per tenant
public class OwnershipDbContext : DbContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var tenantId = _httpContextAccessor.HttpContext?.Items["TenantId"]?.ToString();
        
        modelBuilder.Entity<Ownership>()
            .HasQueryFilter(o => o.TenantId == tenantId);
        
        // Every query on Ownership automatically filters by tenant
        // No way to query cross-tenant data, even by accident
    }
}
```

All 6 App Service instances run the same code but with the tenant ID enforced at the middleware and database layer. There's no need for separate App Service instances per tenant — one set of instances serves all 2,500 tenants.

### Networking & Security

**By default, App Service is internet-accessible.** Requests come through:
1. **Azure Front Door** (public entry point, WAF, DDoS)
2. **APIM** (JWT validation, rate limiting, routing)
3. **App Service** (your code)

**Optional: Virtual Network integration** — if you want to restrict App Service to private network traffic only:
```bash
# Add App Service to a Virtual Network subnet
az webapp vnet-integration add \
  --resource-group capital-access \
  --name ownership-service-app \
  --vnet myvnet \
  --subnet mysubnet

# Now the app can only be reached from within the VNet
# (APIM must also be in the VNet, or routable to it)
```

For Capital Access, we don't need VNet isolation because:
- All traffic through APIM is validated
- Tenant data is isolated in code (via global query filters)
- Azure SQL is protected by firewall rules that allow only App Service IPs

**Environment-specific config:**
```xml
<!-- .csproj -->
<ItemGroup>
  <None Update="appsettings.*.json" CopyToOutputDirectory="PreserveNewest" />
</ItemGroup>
```

```json
{
  "appsettings.production.json": {
    "KeyVault": "https://capital-access-kv.vault.azure.net/",
    "Database": "Server=capital-access-prod.database.windows.net;Database=OwnershipDb;",
    "Logging": {
      "LogLevel": {
        "Default": "Information",
        "Microsoft": "Warning"
      }
    }
  },
  "appsettings.staging.json": {
    "KeyVault": "https://capital-access-staging-kv.vault.azure.net/",
    "Database": "Server=capital-access-staging.database.windows.net;Database=OwnershipDb;",
    "Logging": {
      "LogLevel": {
        "Default": "Debug"
      }
    }
  }
}
```

App Service automatically picks the right config based on the `ASPNETCORE_ENVIRONMENT` variable (set in App Service settings).

### Common Interview Questions on App Service

**Q: What happens if an instance crashes?**
A: App Service's health check detects it's unhealthy (no 200 response on `/health`), removes it from the load balancer, and spins up a replacement instance from the App Service Plan. Requests in flight on the crashed instance fail (connections are severed), but new requests go to healthy instances. This is why you should make API calls idempotent or use distributed transactions (see Outbox Pattern).

**Q: Can two requests hit the same instance?**
A: Yes, round-robin is stateless. The same instance can handle consecutive requests from different users. This is fine as long as your app is stateless (which it should be) — store session data in Redis or cookies, not in-memory.

**Q: What's the difference between scaling up (bigger instance) and scaling out (more instances)?**
A:
- **Scale up:** B2 → S1 (more CPU/RAM per instance). Manual, requires restart.
- **Scale out:** 2 instances → 5 instances (more instances, same size). Automatic via auto-scale rules.
For Capital Access, prefer scaling out (auto-scale) over up (manual). Horizontal scaling is simpler to reason about and can handle traffic spikes automatically.

**Q: How do you do zero-downtime deployments?**
A: Use **slots** — App Service lets you have a "staging" slot running a previous version while you deploy the new code to a "production" slot, then swap them atomically:
```bash
# Deploy new code to staging slot
az webapp deployment source config-zip \
  --resource-group capital-access \
  --name ownership-service-app \
  --slot staging \
  --src app.zip

# Run smoke tests against staging
curl https://ownership-service-app-staging.azurewebsites.net/health

# If healthy, swap slots (production ← staging)
az webapp deployment slot swap \
  --resource-group capital-access \
  --name ownership-service-app \
  --slot staging

# Old code stays in staging, ready to swap back if issues
```

**Q: What's the difference between Restart, Stop, and Deallocate?**
A: 
- **Restart** — recycle the process but keep the VM running (seconds, you're still billed)
- **Stop** — gracefully shut down, VM still allocated (still billed, used for testing)
- **Deallocate** — turn off the VM, stop billing (used for dev/test to save money)

For production, you only use Restart (during deployments). Stop/Deallocate are for non-production to save costs.

---


---

## Deep Dive — Microservices Patterns & Strategies in Capital Access

Capital Access didn't start as 6 microservices. The platform evolved into this architecture through deliberate decomposition driven by **bounded contexts** (Domain-Driven Design) and operational need. This section covers the patterns that make microservices work at scale.

### Service Decomposition Strategy — Why 6 Services?

Each of Capital Access's 6 microservices owns a **bounded context** — a distinct business capability with clear responsibility and minimal cross-service knowledge:

| Service | Bounded Context | Why Separate? |
|---------|-----------------|---------------|
| **Ownership Service** | "Who owns what shares, and how is it changing?" | Highest write volume (regulatory filings, continuous updates). Needs CQRS to separate writes from expensive read queries. Publishes ownership-change events that drive downstream intelligence. |
| **Profiles Service** | "Company metadata — financials, sectors, IR teams" | Relatively static (updated quarterly or on news events). No high-frequency updates, so doesn't compete with operational traffic. Can be cached aggressively. |
| **Targeting Service** | "ML scoring — which investors are likely buyers for this company?" | Compute-intensive (scores are expensive). Needs independent scaling. Reads heavily from Redis cache; updates only on ownership/profile changes (async). |
| **Contacts Service** | "IR contacts, investor contact details, meeting history" | CRM data — fundamentally relational (contacts → companies, attendees → meetings, follow-ups → tasks). Benefits from SQL's ACID guarantees and rich query capability. No cross-tenant data sharing. |
| **Notifications Service** | "Alerts, alerts delivery status, email/in-app rendering" | High write volume (millions of alert events per day), low query complexity. Uses Table Storage (partition key = user ID + day, super scalable). Independent scaling. |
| **Report Service** | "Report job orchestration, status tracking, result storage" | Sits on the boundary between user request (synchronous) and long-running work (asynchronous). Owns the job queue, coordinates the Report Worker function. Can be deployed independently of the actual report-generation computation. |

**Key principle: One service = one database. Never share databases across services.** This forces clean boundaries and prevents accidental coupling through the database layer.

```
❌ WRONG (Monolithic database):
    All services → Shared "capital_access" DB
    Problem: If Targeting needs a schema change, it affects Contacts queries
    Problem: A slow report query locks ownership updates
    
✅ RIGHT (Database per service):
    Ownership Service → ownership_db (Cosmos DB)
    Profiles Service → profiles_db (SQL)
    Targeting Service → targeting_db (SQL) + Redis cache
    Contacts Service → contacts_db (SQL)
    Notifications Service → notifications_table (Table Storage)
    Report Service → reports_db (SQL)
    
    Problem solved: Each service scales independently
                   Schema changes are isolated
                   Ownership updates never block report queries
```

### SAGA Pattern — Distributed Transactions Across Services

**The Problem:**
Creating an **Engagement** (a meeting between an IR team and an investor) requires coordinating multiple services:
1. **Contacts Service**: Create or retrieve the investor contact record
2. **Profiles Service**: Validate the company exists and is still active
3. **Ownership Service**: Check current ownership (is this investor likely to be interested?)
4. **Engagement Service**: Create the engagement record
5. **Notifications Service**: Send notification to the IR team and investor

All 5 operations must **succeed together or all fail together** (ACID guarantee). But they're spread across 5 different databases with no shared transaction context.

Traditional databases have transactions (ACID). Microservices don't — you need a **SAGA pattern** to orchestrate distributed transactions.

**Two SAGA Approaches:**

### **SAGA Option 1: Orchestration (Command-Driven)**

One service (Engagement Service) acts as a **choreographer** — it issues commands and waits for responses:

```
User creates engagement via API
    │
    ▼
Engagement Service (Orchestrator)
    │
    ├─→ Command: "ValidateInvestorContact" → Contacts Service
    │       ✅ Contact exists or created
    │
    ├─→ Command: "ValidateCompany" → Profiles Service
    │       ✅ Company active
    │
    ├─→ Command: "CheckOwnership" → Ownership Service
    │       ✅ Ownership data retrieved
    │
    ├─→ Command: "CreateEngagementRecord" → Local DB
    │       ✅ Record created
    │
    └─→ Command: "SendEngagementNotification" → Notifications Service
            ✅ Notification queued

Result: ✅ Engagement successfully created
```

**Rollback (if something fails):**
```
User creates engagement via API
    │
    ▼
Engagement Service (Orchestrator)
    │
    ├─→ Command: "ValidateInvestorContact" → Contacts Service ✅
    ├─→ Command: "ValidateCompany" → Profiles Service ✅
    ├─→ Command: "CheckOwnership" → Ownership Service ❌ FAILS
    │
    ▼
Engagement Service detects failure
    │
    ├─→ Compensating Action: "RollbackContactCreation" → Contacts Service
    │       (Undo the contact created in step 1)
    │
    └─→ Compensating Action: "RollbackCompanyValidation" → Profiles Service
            (Undo any side effects)

Result: ❌ Engagement creation failed, all partial changes undone
```

**Code Example:**

```csharp
public class CreateEngagementOrchestrator
{
    private readonly IContactsService _contactsService;
    private readonly IProfilesService _profilesService;
    private readonly IOwnershipService _ownershipService;
    private readonly EngagementDbContext _dbContext;
    private readonly INotificationsService _notificationsService;
    
    public async Task<Result<Engagement>> CreateAsync(CreateEngagementRequest request)
    {
        // Step 1: Validate investor contact
        var contactResult = await _contactsService.GetOrCreateContactAsync(
            request.InvestorId, request.TenantId
        );
        if (!contactResult.Success)
            return Result.Failed($"Contact validation failed: {contactResult.Error}");
        
        // Step 2: Validate company exists
        var companyResult = await _profilesService.ValidateCompanyAsync(
            request.CompanyId, request.TenantId
        );
        if (!companyResult.Success)
            return Result.Failed($"Company validation failed: {companyResult.Error}");
        
        // Step 3: Check ownership (read-only, no rollback needed)
        var ownershipResult = await _ownershipService.GetOwnershipAsync(
            request.CompanyId, request.InvestorId
        );
        if (!ownershipResult.Success)
            return Result.Failed($"Ownership check failed: {ownershipResult.Error}");
        
        // Step 4: Create engagement record (in local DB)
        var engagement = new Engagement
        {
            TenantId = request.TenantId,
            CompanyId = request.CompanyId,
            InvestorId = request.InvestorId,
            ScheduledDate = request.ScheduledDate,
            Status = "Scheduled"
        };
        
        _dbContext.Engagements.Add(engagement);
        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // If engagement creation fails, we didn't call external services yet
            // (transaction not started yet), so no compensation needed
            return Result.Failed($"Failed to create engagement: {ex.Message}");
        }
        
        // Step 5: Send notification (best-effort, can be retried independently)
        try
        {
            await _notificationsService.SendEngagementCreatedNotificationAsync(
                engagement, request.TenantId
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning($"Failed to send notification for engagement {engagement.Id}: {ex.Message}");
            // Don't fail the whole operation, notification can be retried
        }
        
        return Result.Success(engagement);
    }
}
```

**Pros:** Simple orchestration logic lives in one place. Easy to debug.
**Cons:** Orchestrator becomes a bottleneck. If Orchestrator crashes mid-SAGA, you need compensating transaction cleanup logic (manual recovery).

### **SAGA Option 2: Choreography (Event-Driven)**

Services react to events from other services. No central orchestrator:

```
User creates engagement via API → Engagement Service
    │
    ▼
Engagement Service publishes: "EngagementCreationRequested" event
    │
    ├─→ Contacts Service listens: "Is this contact valid?"
    │   │   ✅ Contact exists or created
    │   └─→ Publishes: "ContactValidated" event
    │
    ├─→ Profiles Service listens: "Is this company valid?"
    │   │   ✅ Company active
    │   └─→ Publishes: "CompanyValidated" event
    │
    ├─→ Ownership Service listens: "Check ownership"
    │   │   ✅ Ownership data retrieved
    │   └─→ Publishes: "OwnershipChecked" event
    │
    ├─→ Engagement Service listens to all "Validated" events
    │   │   Once all three arrive → Create engagement record
    │   └─→ Publishes: "EngagementCreated" event
    │
    └─→ Notifications Service listens: "Send engagement notification"
            Publishes: "NotificationSent" event

Result: ✅ Engagement successfully created (all events received)
```

**Rollback (if something fails):**
```
User creates engagement
    │
    ▼
"EngagementCreationRequested" published
    │
    ├─→ Contacts Service: ✅ ContactValidated
    ├─→ Profiles Service: ✅ CompanyValidated
    └─→ Ownership Service: ❌ ValidationFailed
    
    ▼
Ownership Service publishes: "OwnershipValidationFailed" event
    │
    ▼
Engagement Service listens and publishes: "EngagementCreationFailed" event
    │
    ├─→ Contacts Service hears failure → Publishes "ContactRollbackInitiated"
    ├─→ Profiles Service hears failure → Publishes "CompanyValidationRolledBack"
    └─→ Notifications Service hears failure → Does NOT send notification

Result: ❌ Engagement creation failed, all services cleaned up independently
```

**Code Example (Choreography):**

```csharp
// Engagement Service publishes an event
public class EngagementService
{
    private readonly IServiceBusPublisher _serviceBus;
    
    public async Task RequestEngagementCreationAsync(CreateEngagementRequest request)
    {
        var evt = new EngagementCreationRequested
        {
            TenantId = request.TenantId,
            CompanyId = request.CompanyId,
            InvestorId = request.InvestorId,
            ScheduledDate = request.ScheduledDate,
            CorrelationId = Guid.NewGuid() // Track this saga through all services
        };
        
        await _serviceBus.PublishAsync(evt);
        // Don't await response — choreography is async
    }
}

// Contacts Service listens and reacts
public class ContactsEventHandler
{
    public async Task Handle(EngagementCreationRequested evt)
    {
        var contact = await _contactsDb.GetOrCreateAsync(evt.InvestorId, evt.TenantId);
        
        if (contact == null)
        {
            // Validation failed
            await _serviceBus.PublishAsync(new ContactValidationFailed
            {
                CorrelationId = evt.CorrelationId,
                Reason = "Investor not found"
            });
            return;
        }
        
        // Validation succeeded
        await _serviceBus.PublishAsync(new ContactValidated
        {
            CorrelationId = evt.CorrelationId,
            ContactId = contact.Id
        });
    }
}

// Engagement Service waits for all validations, then acts
public class EngagementCreationSaga
{
    private readonly EngagementDbContext _dbContext;
    private readonly IServiceBusPublisher _serviceBus;
    
    // Track in-flight sagas by correlation ID
    private ConcurrentDictionary<Guid, SagaState> _inFlightSagas = new();
    
    public async Task OnContactValidated(ContactValidated evt)
    {
        var saga = _inFlightSagas[evt.CorrelationId];
        saga.ContactValidated = true;
        
        await CheckIfAllValidationsCompleteAsync(evt.CorrelationId);
    }
    
    public async Task OnCompanyValidated(CompanyValidated evt)
    {
        var saga = _inFlightSagas[evt.CorrelationId];
        saga.CompanyValidated = true;
        
        await CheckIfAllValidationsCompleteAsync(evt.CorrelationId);
    }
    
    public async Task OnOwnershipChecked(OwnershipChecked evt)
    {
        var saga = _inFlightSagas[evt.CorrelationId];
        saga.OwnershipChecked = true;
        
        await CheckIfAllValidationsCompleteAsync(evt.CorrelationId);
    }
    
    private async Task CheckIfAllValidationsCompleteAsync(Guid correlationId)
    {
        var saga = _inFlightSagas[correlationId];
        
        if (!saga.AllValidated)
            return; // Wait for all validations
        
        // All validations passed — create engagement
        var engagement = new Engagement
        {
            TenantId = saga.TenantId,
            CompanyId = saga.CompanyId,
            InvestorId = saga.InvestorId,
            ScheduledDate = saga.ScheduledDate
        };
        
        _dbContext.Engagements.Add(engagement);
        await _dbContext.SaveChangesAsync();
        
        // Publish success
        await _serviceBus.PublishAsync(new EngagementCreated
        {
            CorrelationId = correlationId,
            EngagementId = engagement.Id
        });
        
        _inFlightSagas.TryRemove(correlationId, out _);
    }
}
```

**Pros:** Loosely coupled. Services don't know about the SAGA; they just react to events. Highly scalable.
**Cons:** Harder to understand the overall flow (it's implicit in event handlers). Debugging is trickier (you need correlation IDs everywhere).

### **Orchestration vs Choreography — Which Does Capital Access Use?**

**Capital Access uses a hybrid approach:**

- **Choreography** for reactive, event-driven workflows (ownership changes trigger targeting recalculation, notifications)
- **Orchestration** for coordinated, sequential workflows (report generation aggregating multiple services)

```
Choreography Example:
    Ownership changes → Event published → Targeting & Notifications independently react
    
Orchestration Example:
    User requests report → Report Service orchestrates calls to:
        1. Ownership Service (get data)
        2. Profiles Service (get metadata)
        3. Targeting Service (get scores)
        4. Contacts Service (get attendees)
    Once all 4 respond, generate PDF
```

**Decision matrix:**
| Scenario | Use | Reason |
|----------|-----|--------|
| **Multiple services reacting to a single event** | Choreography | Ownership change → Targeting + Notifications both need to react independently |
| **Coordinated sequence that needs rollback** | Orchestration | Report generation: must collect data from 4 services in order, with error handling |
| **Asynchronous broadcast** | Choreography | "Profile updated" → any service interested can subscribe |
| **Request-response with timeout** | Orchestration | HTTP REST call with SLA (must respond within N seconds) |

### Idempotency & Eventual Consistency

In a microservices architecture, **you can't guarantee immediate consistency** across all services. When an ownership change happens:

```
T0: Ownership Service updates DB ✅
T1: Event published to Service Bus ✅
T2: Targeting Service receives event → starts recalculating scores
T3: Meanwhile, user queries Targeting Dashboard
     → Old scores still there (not updated yet)
     → This is OK — "eventual consistency"

T4: Targeting Service finishes calculation, stores new scores ✅
T5: User queries again → new scores visible ✅
```

Eventual consistency means **by "eventually" (seconds to minutes), all services converge to the same truth**. This is fundamentally different from ACID transactions where consistency is immediate.

**Problem: What if a message is processed twice?**

```
Service Bus publishes: "OwnershipChanged: AAPL 5% → 6%"

Targeting Service receives it:
  T0: Increment score by 0.5 ✅
  T1: Confirm receipt to Service Bus ✅
  
But network hiccup — message retried:
  T2: Targeting Service receives same message again
  T3: Increments score by 0.5 again (now +1.0, wrong!)
  
Result: AAPL score is 1.0 higher than it should be
```

**Solution: Idempotency (same message can be processed multiple times safely)**

```csharp
public async Task OnOwnershipChanged(OwnershipChangedEvent evt)
{
    // Use idempotency key = messageId + operation
    var idempotencyKey = $"{evt.MessageId}:update-targeting-scores";
    
    // Check if we've already processed this message
    var existingRecord = await _idempotencyStore.GetAsync(idempotencyKey);
    if (existingRecord != null)
    {
        _logger.LogInformation($"Message {evt.MessageId} already processed, skipping");
        return; // Already processed, don't do it again
    }
    
    // Process the message
    var targetingScores = await CalculateNewScoresAsync(evt.CompanyId);
    await _dbContext.UpdateScoresAsync(targetingScores);
    
    // Record that we've processed this message
    await _idempotencyStore.RecordAsync(idempotencyKey, DateTime.UtcNow);
}
```

Every message has a **unique ID** (messageId from Service Bus). If the same message arrives twice, the service checks "did I already process this?" and skips if yes.

### Circuit Breaker Pattern — Cascading Failures

**The Problem:**
Targeting Service depends on Ownership Service (to get ownership data). If Ownership Service becomes slow or unresponsive:

```
User requests: "Score all investors for AAPL"
    │
    ▼
Targeting Service calls: GET /api/ownership/aapl
    │
    ├─→ Ownership Service is slow (15s response time)
    ├─→ Targeting Service waits 15s
    ├─→ Timeout? Retry? Timeout again?
    │
    ▼
Eventually, Targeting Service has 1,000 hanging requests
    waiting for Ownership Service to respond
    
Result: Targeting Service crashes (memory exhausted)
        → Targeting Dashboard is down
        → Even though Ownership Service is only slow (not down)
        → Cascading failure
```

**Solution: Circuit Breaker**

Think of a circuit breaker like an electrical breaker in your home:
- **Closed** (normal): Requests flow through
- **Open** (failure detected): Stop sending requests, return error immediately
- **Half-open** (recovery): Try one request; if it succeeds, close; if fails, open again

```csharp
// Install Polly NuGet package
// dotnet add package Polly

var circuitBreakerPolicy = Policy.Handle<HttpRequestException>()
    .Or<TimeoutException>()
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: 5,  // Fail 5 times, then open
        durationOfBreak: TimeSpan.FromSeconds(30) // Stay open for 30s
    );

var timeoutPolicy = Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(5));

// Combine policies
var fallbackPolicy = Policy<HttpResponseMessage>
    .Handle<BrokenCircuitException>()
    .FallbackAsync<HttpResponseMessage>(
        async (_) => new HttpResponseMessage(System.Net.HttpStatusCode.ServiceUnavailable)
    );

var policyWrap = Policy.WrapAsync(timeoutPolicy, circuitBreakerPolicy, fallbackPolicy);

// Use in Targeting Service
public async Task<List<InvestorScore>> ScoreAsync(int companyId)
{
    try
    {
        var response = await policyWrap.ExecuteAsync(
            () => _httpClient.GetAsync($"https://ownership-service/api/ownership/{companyId}")
        );
        
        if (!response.IsSuccessStatusCode)
            return await GetCachedScoresAsync(companyId); // Fallback to cache
        
        var ownership = await response.Content.ReadAsAsync<OwnershipData>();
        return await CalculateScoresAsync(companyId, ownership);
    }
    catch (BrokenCircuitException)
    {
        _logger.LogError("Circuit breaker open: Ownership Service unreachable");
        return await GetCachedScoresAsync(companyId); // Graceful degradation
    }
}
```

**Real timeline with Circuit Breaker:**

```
T0: Ownership Service is healthy → Circuit CLOSED
T1: Request 1 fails (timeout) → Failure count: 1
T2: Request 2 fails (timeout) → Failure count: 2
T3: Request 3 fails (timeout) → Failure count: 3
T4: Request 4 fails (timeout) → Failure count: 4
T5: Request 5 fails (timeout) → Failure count: 5 → Circuit OPENS
T6: Request 6 → Circuit is OPEN → Rejected immediately, returns cached score
T7: Request 7 → Circuit is OPEN → Rejected immediately, returns cached score
...
T30: 30 seconds passed → Circuit moves to HALF-OPEN
T31: Probe request to Ownership Service → Succeeds! → Circuit CLOSES
T32: Request 8 → Circuit is CLOSED → Proceeds normally
```

Without Circuit Breaker: Request 6+ would hang for 5 seconds each, depleting connection pool.
With Circuit Breaker: Request 6+ returns immediately with cached data.

### API Versioning & Backward Compatibility

Capital Access services must evolve without breaking clients. When Ownership Service needs to add a new field:

**Option 1: Additive Changes (Safest)**
```csharp
// Old API response (v1)
{
  "ownershipPercent": 5.2,
  "lastUpdate": "2026-07-08"
}

// New API response (still v1, backward compatible)
{
  "ownershipPercent": 5.2,
  "lastUpdate": "2026-07-08",
  "confidence": 0.95  // New field, but clients that ignore it still work
}
```

Clients that expect only `ownershipPercent` and `lastUpdate` continue working. New clients use `confidence`. No versioning needed.

**Option 2: Major Changes (Versioning Required)**
```csharp
// API v1 (old)
GET /api/v1/ownership/123
{
  "ownershipPercent": 5.2,
  "companyId": 123
}

// API v2 (new schema, major change)
GET /api/v2/ownership/123
{
  "shares": 15000000,
  "sharesOutstanding": 2600000000,
  "ownershipPercent": 5.77,  // Calculated differently
  "confidence": 0.99,
  "dataSource": "EDGAR"
}

// Keep v1 running for backward compatibility
// Clients can gradually migrate to v2
```

APIM routes based on version:
```yaml
/api/v1/* → ownership-service:8080/v1/*
/api/v2/* → ownership-service:8080/v2/*
```

Both versions run simultaneously in the same App Service. Clients choose when to upgrade.

---


---

## CQRS Pattern — Ownership Data

Capital Access uses CQRS (Command Query Responsibility Segregation) in the Ownership and Engagement services to solve a concrete read/write contention problem.

![CQRS Azure Architecture](../system-design-interview-playbook/microservice/cqrs-azure-architecture.svg)

### The Problem

At quarter-end, regulatory filings (13-F, EDGAR) are ingested in bulk — thousands of `UpdateOwnership` commands per minute. At the same time, institutional clients are actively reading the Ownership Dashboard. Without CQRS, both workloads hit the same Azure SQL database: write lock contention makes every dashboard read slow or time out exactly when clients need the data most.

### The Solution — Two Models, Two Databases

```
WRITE SIDE (Azure SQL):
  Commands → Command Handler (MediatR) → validates → writes to Azure SQL
  → publishes OwnershipUpdatedEvent to Azure Service Bus

EVENT PIPELINE (async, ~100–500ms lag):
  Azure Service Bus Queue → Azure Functions (Read DB Updater)
  → projects to Cosmos DB in UI-optimized document shape

READ SIDE (Cosmos DB):
  Query Handler (MediatR) → point-read from Cosmos DB by tenantId partition key
  → sub-10ms response, zero joins, no contention with write side
```

### Commands and Queries

| Side | Examples |
|------|----------|
| Commands → Azure SQL | `UpdateOwnership`, `CreateEngagement`, `AddToTargetingList` |
| Queries → Cosmos DB | `GetOwnershipDashboard`, `GetEngagementReport`, `GetTargetingList` |

### AWS → Azure Service Mapping

| AWS (original diagram) | Azure equivalent |
|------------------------|-----------------|
| Apache Kafka | Azure Event Hubs (Kafka-compatible) |
| Lambda (Event Processor) | Azure Functions |
| SQS Queue | Azure Service Bus Queue |
| Lambda (Read DB Updater) | Azure Functions (Service Bus trigger) |
| Read DB (DynamoDB) | Azure Cosmos DB |
| Write DB | Azure SQL |
| Microservice pods | Azure App Service (multiple instances with built-in load balancing) |

### Microservice Deployment — App Service with Built-in Load Balancing

Each of the six microservices runs on **Azure App Service** with 2-3 instances for high availability, auto-scaling to 5-10 instances during peak load (based on CPU and memory thresholds). App Service includes **built-in load balancing** — traffic is automatically distributed across instances by the platform. No explicit load balancer configuration is needed.

From APIM's perspective, each microservice is a single endpoint (e.g., `ownership-service.azurewebsites.net`). APIM routes API requests to that endpoint; App Service's platform-level load balancer transparently distributes the request to one of the running instances. If an instance fails, App Service automatically routes traffic around it. This architecture is simple, scalable, and requires zero Kubernetes knowledge or operational overhead.

---

### Security Considerations — Why App Service Over VMs or AKS?

**The common interview question: "Why didn't you choose VMs or Kubernetes for more control?"**

For a multi-tenant SaaS platform like Capital Access serving 2,500 enterprises, **App Service is actually MORE secure than VMs, not less.**

**Patch Management (Critical for SaaS):**
- **App Service**: Microsoft patches the OS and runtime automatically. We never miss a patch.
- **VMs**: We are responsible for patching. One missed patch = potential exploit. For a platform serving regulated enterprises, this is an unacceptable liability.
- **AKS**: Microsoft manages the control plane, but node OS patching is a shared responsibility. More complex operationally.

**Multi-tenant Data Isolation:**
This isn't an infrastructure concern — it's handled at the application layer (JWT tenant claims, database row-level security, APIM's tenant validation). All three platforms handle this identically if the application layer is correct.

**Secrets Management:**
All three integrate with Azure Key Vault via Managed Identity. No security difference. Our connection strings, API keys, and signing certificates are encrypted in Key Vault, not in code or environment variables.

**Network Isolation & DDoS:**
- **App Service**: Private endpoints (zero internet exposure) + Azure Front Door's WAF + built-in DDoS protection.
- **VMs**: Requires manual setup of network security groups, firewall rules. Higher chance of misconfiguration.
- **AKS**: Network policies and service mesh options (Istio), but requires Kubernetes security expertise.

**Compliance & Audit (SOC2, ISO):**
- **App Service**: Easier to audit because it's managed. Microsoft publishes compliance certifications and security posture management reports. Auditors see a simpler attack surface.
- **VMs**: We're responsible for OS-level hardening, patching history, security baselines. Auditors dig deep into OS configs, patch records, and access controls. Much heavier lift.
- **AKS**: Complex audit surface — more APIs, more control-plane access patterns, more things auditors need to review.

**The Real Risk with VMs:**
Operational burden becomes a security liability. Someone has to own patch Tuesday every month. Someone has to monitor CVE feeds. If that person is on vacation when a critical CVE (CVSS 9.0) drops, we're exposed for days. For a regulated SaaS, this is unacceptable risk. App Service eliminates this operational risk entirely.

**When I'd reconsider this decision:**
- **VMs**: If we needed OS-level customization (running legacy Windows Services, custom kernel modules, specialized drivers). We don't — our services are standard .NET Core microservices.
- **AKS**: If we were running 50+ microservices where container density and fine-grained network policies matter, OR if we needed a service mesh for complex traffic management. For 6 services, Kubernetes adds complexity without security benefit.

**Interview line to use:**
> "App Service reduces security risk by removing operational burden. Fewer moving parts means fewer things to misconfigure, fewer patch management cycles to miss, and a smaller audit surface. For a multi-tenant SaaS, operational simplicity IS security."

---

### Eventual Consistency — How We Handle It

The Cosmos DB read model is typically 100–500ms behind the write side. The UI shows a **"Last updated: 10:00:00"** timestamp on the dashboard so clients know the data age — it's a transparency feature, not a bug. For compliance or audit use cases where strong consistency is required, we read directly from Azure SQL.

If Cosmos DB is ever corrupted or needs rebuilding, we replay all events from the Azure SQL event store — the dashed "Recreate Read DB" flow in the diagram.

### Interview Line

> "We use CQRS in Capital Access specifically because of quarter-end bulk ingestion from regulatory filings. At quarter-end we're processing thousands of ownership updates per minute. If reads and writes shared the same Azure SQL database, lock contention would kill dashboard performance exactly when institutional clients need it most. So the write side commits to Azure SQL and publishes a domain event. An Azure Function picks that event off a Service Bus queue and projects it into a Cosmos DB document — pre-shaped with company names already joined in, sorted shareholders, everything the dashboard needs. When the Angular dashboard loads, it hits Cosmos DB via a partition-key point read — sub-10 milliseconds, completely isolated from the write storm happening on Azure SQL. The trade-off is eventual consistency — typically a few hundred milliseconds. We surface that as a 'last updated' timestamp on the UI."

---


---

## OIDC Authentication with Okta — Deep Dive

This is the most technically rich part of your S&P work. Expect detailed follow-up here. Be confident — you implemented the full auth flow.

> ℹ️
> OAuth2 = authorisation framework (who can access what). OIDC = adds identity layer on top (who are you). For Capital Access, you need both — authenticate the user AND control what data/features they see based on their role and client subscription. OIDC gives you both in one flow. Okta is the Identity Provider — it handles the OIDC protocol, MFA, session management, and token issuance.

```
1. USER OPENS APP
   Angular SPA loads → checks for valid access token in memory
   No token / token expired → initiate OIDC login

2. LOGIN REDIRECT
   App redirects → Okta-hosted login page
   User authenticates (password + MFA if enforced by Okta policy)
   Okta issues: ID Token + Access Token + Refresh Token

3. TOKEN RECEIVED
   App receives tokens via redirect callback
   ID Token  → decode claims: user identity, name, email, tenant/org ID
   Access Token → short-lived (60 min), sent in Bearer header on every API call
   Refresh Token → long-lived, used to get new access token silently

4. SILENT RENEWAL (the tricky part)
   Access token expires → BEFORE expiry, app silently requests new token
   Uses Okta's refresh token flow (or silent SSO via hidden iframe)
   User sees nothing — seamless experience
   Angular Timer service triggers renewal at (expiry - 5 minutes)

5. ROLE-SCOPED ACCESS CONTROL
   Access token contains "groups" or custom "roles" claim (configured in Okta)
   e.g. roles: ["capital_access.investor_targeting", "capital_access.reporting"]
   Angular Route Guard reads roles claim
   Routes not in the user's role list → redirect to Unauthorised page
   10+ feature modules each have their own role guard

6. HTTP INTERCEPTOR
   Every outbound HTTP call → interceptor attaches "Authorization: Bearer {token}"
   On 401 → interceptor attempts token refresh via Okta → retry original request once
   On second 401 → force logout
```

> ⚠️
> **Never store tokens in localStorage.** localStorage is readable by any JS on the page — XSS attack steals your token. We store access tokens in memory (JavaScript variable) and use Okta's refresh token flow to get new ones. Session survives page refresh because Okta also issues an SSO session cookie that the silent renewal flow uses.

```
Access Token JWT Payload (decoded, issued by Okta):
{
  "uid":   "okta-user-id",
  "cid":   "okta-client-id",
  "tid":   "tenant-id",           ← identifies which client company (custom claim in Okta)
  "roles": ["investor_targeting", "shareholder_analytics"],  ← custom claim configured in Okta
  "sub":   "user@clientcompany.com",
  "iss":   "https://s&pglobal.okta.com/oauth2/default",     ← Okta issuer
  "exp":   1718000000             ← expiry timestamp
}

Angular Route Config:
{
  path: 'investor-targeting',
  component: InvestorTargetingComponent,
  canActivate: [RoleGuard],
  data: { requiredRole: 'investor_targeting' }  ← checked against JWT roles claim
}
```

> 🚩
> **Why this is hard:** Migrating auth on a live multi-tenant SaaS is like changing the locks on a building while people are inside. If anything breaks, 2,500+ companies lose access instantly.

| Before (SAML) | After (Okta OIDC) |
| --- | --- |
| XML-based token (SAML Assertion) | JSON-based JWT (compact, stateless) |
| SP-initiated redirect to IdP login page | OIDC Authorization Code flow with PKCE |
| Session managed server-side | Token in memory, silent renewal via Okta refresh token |
| No fine-grained role claims | Custom claims (tenant ID, roles) configured in Okta authorization server |
| Single backend validation approach | Each microservice validates JWT independently via Okta JWKS endpoint |

- Replaced the SAML redirect flow with Okta OIDC using the **okta-auth-js** SDK
- Built the HTTP Interceptor to attach `Bearer JWT` to every outbound request and handle 401 retry
- Implemented silent token renewal — Angular Timer triggers refresh 5 minutes before expiry
- Built Role Guards reading custom claims from the JWT to gate each feature module
- Used **per-tenant feature flags** to roll the migration tenant-by-tenant — if one tenant had issues, we could roll back without touching others

> ⚠️
> **Important boundary to set clearly in the interview:** User migration from SAML to Okta (provisioning accounts, syncing directories) was handled by a separate platform/infrastructure team. My ownership was end-to-end on the frontend auth flow and the per-tenant rollout strategy.

> 🗣️ **Say this:**
>
> The trickiest thing I've worked on was the SAML to Okta OIDC migration. We were moving auth on a live platform serving 2,500+ companies — if anything broke, nobody could log in. My ownership was the frontend side: I replaced the SAML redirect flow with Okta's OIDC flow using okta-auth-js, built the HTTP interceptor to attach Bearer JWTs and handle token refresh on 401, and implemented silent token renewal so users never see an unexpected logout. The riskiest part was the cutover. We handled it using per-tenant feature flags — we migrated one tenant at a time, so we could roll forward or roll back per client without a full outage. The user provisioning side was handled by a separate infra team, so I can speak to the frontend auth flow in detail.


---

## Deep Dive — Okta (Identity / OIDC)

> ℹ️
> **Your ownership boundary:** The Okta authorization server was configured by the platform/security team. Your ownership is the full frontend integration — okta-auth-js SDK, OIDC flow, token lifecycle, HTTP interceptor, role guards, and the SAML→Okta migration on the Angular side.

Okta is an enterprise Identity Provider (IdP). Instead of Capital Access managing usernames and passwords itself, all authentication is delegated to Okta. Okta handles login pages, MFA enforcement, session management, and token issuance. Capital Access trusts whatever Okta says about the user.

| Concern | Who handles it |
| --- | --- |
| Username / password storage | Okta |
| MFA (enforced for every user) | Okta policy |
| Login page UI | Okta-hosted page |
| Token issuance (JWT) | Okta authorization server |
| Custom claims (tenant ID, roles) | Okta authorization server (configured by platform team) |
| Frontend token consumption, role guards, interceptor | You (Angular) |

> ⚠️
> **Both scenarios exist in production — knowing both is what separates senior candidates.**

```
SCENARIO 1 — Silent Renewal (user is active, token nearing expiry)
  Access token has 60-minute lifetime
  Angular Timer triggers 5 minutes before expiry
  okta-auth-js calls Okta token endpoint in the background using the refresh token
  New access token returned silently → stored in memory
  User sees nothing — completely seamless

SCENARIO 2 — Full Redirect to Okta (session fully expired)
  User closes app and reopens after a long gap
  OR refresh token itself has expired (longer-lived, e.g. 24h, but not infinite)
  No valid token in memory, no valid refresh token
  Angular detects this on app init → redirects user to Okta login page
  User authenticates (password + MFA) → Okta redirects back with new tokens
  App resumes where the user left off (redirect_uri with state param)
```

```
localStorage  ❌
  Readable by ANY JavaScript on the page
  XSS attack injects malicious script → reads token → sends to attacker's server
  Token stolen = attacker impersonates user until token expires

Memory (JavaScript variable)  ✅
  Only accessible by our application code
  XSS attack cannot reach it (no DOM/storage API to read JS variables)
  Survives page navigation within the SPA
  Lost on full page refresh → Scenario 2 (redirect to Okta) kicks in

sessionStorage  ⚠️ (not used)
  Survives refresh but cleared on tab close
  Still vulnerable to XSS in same ways as localStorage
```

```
Angular HTTP Interceptor (runs on EVERY outbound request):

  1. Request arrives at interceptor
  2. Call OktaAuthService.getAccessToken()
     → returns token from memory
  3. Clone request, add header: Authorization: Bearer {token}
  4. Forward to service

  On 401 response back:
  5. Attempt silent token refresh (okta-auth-js refresh token call)
  6. If refresh succeeds → retry original request once with new token
  7. If refresh fails (refresh token expired) → force logout → redirect to Okta
```

```
JWT Access Token contains custom claims (set by Okta authorization server):
{
  "tid":   "tenant-abc-123",           ← which company (tenant)
  "roles": ["investor_targeting",      ← which modules they can access
            "shareholder_analytics",
            "reporting"]
  "sub":   "user@clientcompany.com",
  "exp":   1718000000
}

Angular Route Guard:
  User navigates to /investor-targeting
  RoleGuard.canActivate() fires
  Reads "roles" claim from JWT
  "investor_targeting" present? → allow
  Not present? → redirect to /unauthorised

  This is UI-level convenience, NOT security.
  Real security: backend microservice validates the same JWT independently.
```

```
Before (SAML):                        After (Okta OIDC):
  XML-based assertions               JWT (compact JSON)
  Server-side session management     Stateless — each service validates JWT locally
  SP-initiated redirect flow         OIDC Authorization Code + PKCE flow
  No fine-grained role claims        Custom claims (tenant, roles) in every JWT

What I did on the Angular side:
  → Replaced SAML redirect handling with okta-auth-js OIDC flow
  → Built HTTP Interceptor (Bearer JWT on all requests, 401 retry)
  → Implemented silent token renewal via refresh token
  → Built Role Guards reading JWT claims
  → Per-tenant feature flags for gradual rollout (one tenant at a time)
     → could roll back any single tenant without platform-wide outage

User provisioning (moving accounts from SAML to Okta) → handled by infra team.
My ownership: frontend auth flow end-to-end.
```

**Q: Q: What is the difference between OAuth2 and OIDC?**

Answer:
        OAuth2 is an authorisation framework — it answers "what can this app access on behalf of the user?" It issues access tokens. OIDC (OpenID Connect) is a layer on top of OAuth2 that adds identity — it answers "who is this user?" It adds an ID Token (a JWT containing user identity claims like name, email, and in our case tenant ID and roles). We need both for Capital Access: we need to know who the user is (OIDC) and control what they can do (OAuth2 scopes + custom role claims). Okta implements both in a single flow.

> 💡 Simple version: OAuth2 = authorisation (what). OIDC = authentication + authorisation (who + what).

**Q: Q: Why store tokens in memory and not localStorage?**

Answer:
        localStorage is accessible by any JavaScript on the page. If there's an XSS vulnerability anywhere in the application — a third-party library, an injected script — the attacker can read the token and impersonate the user. Memory (a JavaScript variable) is not accessible via any browser storage API, so an XSS attack cannot reach it. The downside is that tokens are lost on a hard page refresh, but we handle that gracefully: on app init, if no token exists in memory, we check for a valid Okta SSO session and silently renew, or redirect to Okta login. For a regulated financial platform, the security trade-off is clearly worth it.

**Q: Q: How does silent token renewal work? What if it fails?**

Answer:
        We run a timer that triggers 5 minutes before the access token expires. At that point, okta-auth-js makes a background call to Okta's token endpoint using the refresh token. Okta validates the refresh token and returns a new access token — the user sees nothing. If the silent renewal fails — because the refresh token has also expired, or Okta is unreachable — the interceptor catches the 401 on the next API call, attempts the refresh one more time, and if that also fails, forces a logout and redirects the user to the Okta login page. We also handle the case where a user reopens the app after a long gap: on app init we always check token validity first, and redirect to Okta immediately if there's nothing valid in memory.

**Q: Q: How does MFA work — is it handled in Angular?**

Answer:
        No — MFA is entirely handled by Okta. When the user is redirected to the Okta-hosted login page, Okta's own policy evaluates whether MFA is required (it is, for every user in our case). Okta presents the MFA challenge — TOTP, push notification, SMS — and only issues tokens after the user passes. Our Angular app never sees the MFA step at all. This is one of the key benefits of a hosted IdP like Okta: we get enterprise MFA, adaptive policies, and compliance out of the box without building any of it ourselves.

> 💡 If asked "did you implement MFA?" — the honest answer is no, Okta handles it. That's correct and shows you understand the architecture.

**Q: Q: What is PKCE and why does it matter?**

Answer:
        PKCE stands for Proof Key for Code Exchange. In the OIDC Authorization Code flow, the app generates a random secret (code verifier), hashes it (code challenge), and sends the hash to Okta with the initial auth request. When Okta returns the authorization code and the app exchanges it for tokens, it also sends the original code verifier. Okta verifies they match. This prevents an attacker who intercepts the authorization code from being able to exchange it for tokens — because they don't have the original code verifier. For a browser-based SPA, PKCE is mandatory because there is no server-side secret to protect the token exchange. okta-auth-js handles PKCE automatically.

**Q: Q: How did you handle the SAML to Okta migration without downtime?**

Answer:
        We used per-tenant feature flags. Rather than switching all 2,500+ clients at once, we migrated one tenant at a time. Each tenant had a flag that controlled whether their auth flow used the old SAML redirect or the new Okta OIDC flow. We started with internal test tenants, validated everything, then gradually rolled out to production clients. If a specific tenant had issues, we flipped their flag back to SAML without affecting anyone else. The user provisioning side was handled by the infra team. My side — the Angular auth flow — was ready ahead of the tenant rollout so each migration was just a flag change.


---

## Deep Dive — Azure Service Bus

> ℹ️
> **Your ownership:** You don't manage the Service Bus infrastructure itself (provisioning, scaling tier, network rules) — that's set up once by the platform team. Your ownership is using it correctly from each microservice: publishing events, subscribing, handling retries/idempotency, and reasoning about why a Queue vs a Topic was used in a given case.

| Concept | What it is, in one line |
| --- | --- |
| **Namespace** | The top-level container in Azure for your whole messaging setup — like a folder that holds all your Queues and Topics. One namespace (e.g. `apoorv-capitalaccess-sb1`) can hold many Queues and Topics. You connect to a namespace, then talk to a specific Queue/Topic inside it. |
| **Queue** | A point-to-point channel. One message → exactly ONE consumer processes it. Used for tasks/jobs where work should happen exactly once (e.g. `report-generation-queue`). |
| **Topic** | A publish/subscribe (pub/sub) channel. One message published → every Subscription attached to that Topic gets its OWN independent copy. Used for events where multiple services each need to react independently (e.g. `ownership-changed`). |
| **Subscription** | A "mailbox" attached to a Topic. Each subscriber service (Targeting, Notifications) has its own Subscription on the same Topic — that's what makes the fan-out work. Without a Subscription, a Topic has nowhere to deliver messages to. |
| **Dead Letter Queue (DLQ)** | An automatic "failed messages" holding area, built into every Queue and every Subscription. If a message fails to be processed successfully too many times (exceeds Max Delivery Count), Service Bus moves it here automatically instead of retrying forever. Lets you inspect what went wrong without blocking the rest of the queue. |

> ⚠️
> **How they relate:** Namespace contains Queues and Topics. A Topic contains one or more Subscriptions. Every Queue and every Subscription has its own DLQ attached automatically — DLQ is not a separate thing you create, it always exists alongside.

```
PEEK — look only, zero side effects
  Message stays in the queue untouched. Delivery count unchanged.
  Can peek the same message any number of times.

RECEIVE (Peek-Lock — what real app code uses)
  Message gets LOCKED (hidden from other consumers) but NOT deleted yet.
  You now have a time window (Lock Duration) to decide:
    → Complete    : message deleted for good (you finished processing successfully)
    → Abandon     : lock released, message goes back to queue, Delivery Count +1
    → do nothing  : lock silently expires — SAME effect as Abandon, Delivery Count +1
    → Dead-letter : send straight to DLQ (e.g. you know this message is malformed)

RECEIVE-AND-DELETE (simpler, riskier — not used in production code here)
  Message deleted the INSTANT it's received. No second chance if processing then fails.
  Fire-and-forget. We don't use this for report jobs — Peek-Lock is safer.
```

> ✅
> **Why this matters for Capital Access:** The Report Worker (Azure Function) uses Peek-Lock semantics under the hood. If it crashes mid-PDF-generation after receiving a message but before completing it, the lock expires and the job automatically comes back for another attempt — no job is silently lost just because one worker instance died.

```
Message enters queue → Delivery Count = 0
  Worker receives it, fails (crash / exception / lock timeout) → back to queue, Delivery Count = 1
  Worker receives it again, fails again → Delivery Count = 2
  ... repeats ...
  Delivery Count exceeds Max Delivery Count (default 10)
  → Service Bus AUTOMATICALLY moves the message to the Dead Letter Queue
  → It stops being retried — sits aside for manual inspection
  → Rest of the queue keeps moving — one "poison message" can't block everything behind it
```

| Alternative | Why it wasn't the right fit |
| --- | --- |
| **Kafka** | Built for massive-scale event streaming (millions of events/sec, replay, long retention). Capital Access has moderate event volume — Kafka would be operational overkill, plus it needs separate cluster management we don't need. |
| **RabbitMQ** | Third-party, self-hosted — we'd own patching, scaling, and uptime ourselves. Service Bus is native Azure: integrates with Managed Identity, Key Vault, and App Insights out of the box, with no separate infrastructure to run. |
| **A "plain" custom queue (e.g. DB table as queue)** | No built-in message locking, retry, or Dead Letter handling — we'd have to build all of that ourselves and it's easy to get subtly wrong (duplicate processing, lost messages under crashes). |
| **Azure Service Bus (chosen)** | Fully managed (no servers to provision or patch), supports both Queue (task) and Topic/Subscription (event fan-out) patterns natively, built-in message locking + retry + DLQ, and scales automatically — we just create the namespace and use it. |

> ⚠️
> **"At-least-once" delivery, not "exactly-once":** Service Bus guarantees a message will be delivered at least once — but under certain failure timing (e.g. worker completes the work but crashes before calling Complete), the same message can be redelivered. Consumers must be idempotent — check an event/message ID before reprocessing, so retried messages don't cause duplicate side effects (e.g. don't regenerate and re-upload the same report twice).

**Q: Q: What's the difference between a Queue and a Topic in Service Bus?**

Answer:
        A Queue is point-to-point — one message, exactly one consumer processes it. We use this for tasks where doing the work twice would be wrong or wasteful, like `report-generation-queue`. A Topic is publish/subscribe — one message gets fanned out to every Subscription attached to that Topic, each getting its own independent copy. We use this for events, like `ownership-changed`, where multiple services (Targeting, Notifications) each need to react independently without knowing about each other.

**Q: Q: What happens if a consumer crashes while processing a message?**

Answer:
        When a consumer receives a message under Peek-Lock (the default for real application code), Service Bus locks it so no one else can take it, but doesn't delete it yet. If the consumer crashes before calling Complete, that lock simply expires after the configured Lock Duration, and Service Bus automatically makes the message visible again for another consumer to pick up. Its delivery count increments each time this happens. If it keeps failing past Max Delivery Count, it's automatically moved to the Dead Letter Queue rather than retried forever.

**Q: Q: How do you prevent the same message from being processed twice?**

Answer:
        Service Bus guarantees at-least-once delivery, not exactly-once — so duplicates are possible in edge cases (e.g. the consumer finishes work but crashes right before calling Complete). We make our consumers idempotent: each message carries a unique ID (or we use the jobId/eventId already in the payload), and before processing we check whether that ID has already been handled. If it has, we skip reprocessing and just acknowledge the message. This way a redelivered message is safe even if the original processing already succeeded.

> 💡 This is a very common follow-up — always pair "guaranteed delivery" with "and that's why idempotency matters" to show depth.

**Q: Q: Why Service Bus instead of Kafka or RabbitMQ?**

Answer:
        Kafka is built for very high-throughput event streaming with replay and long retention — that's more capability than we need for Capital Access's moderate event volume, and it adds real operational overhead (managing a cluster). RabbitMQ is a strong option too, but it's third-party and self-hosted, meaning we'd own its uptime, scaling, and patching ourselves. Azure Service Bus is fully managed — we provision a namespace and Microsoft handles the infrastructure — and it integrates natively with the rest of our Azure stack: Managed Identity for auth instead of connection strings, Key Vault for secrets, and App Insights for tracing messages end-to-end. For our scale, that native integration and zero infrastructure management mattered more than Kafka's raw throughput ceiling.

**Q: Scenario: A report job message keeps failing every time a specific worker picks it up. What happens, and how would you investigate?**

Answer:
        Each failed attempt increments that message's delivery count and it bounces back to the queue. After it exceeds Max Delivery Count, Service Bus automatically moves it to the Dead Letter Queue — it stops blocking other jobs behind it. To investigate, I'd go to the Dead Letter sub-queue, inspect the message body and properties (including any exception details we logged via App Insights using the message's Correlation ID), and figure out why it consistently fails — e.g. malformed jobId, a tenant whose data is in an unexpected state, or a bug in the worker for a specific report type. Once fixed, I could resubmit that specific message from the DLQ back into the main queue for reprocessing.

**Q: Scenario: You need to add a brand-new "Audit Service" that should also react every time ownership data changes, without touching any existing service. How?**

Answer:
        Because we use a Topic (`ownership-changed`) rather than direct service-to-service calls, this is simple: I'd just create a new Subscription on the existing Topic for the Audit Service. It immediately starts receiving its own independent copy of every ownership-changed event going forward. The Ownership Service that publishes the event needs zero changes — it doesn't know or care how many subscribers exist. This is exactly the decoupling benefit of pub/sub over direct calls.


---

## Deep Dive — Azure Functions (Triggers, Bindings, Hosting)

> ℹ️
> **Where this fits:** This covers "plain" (non-Durable) Azure Functions — the fundamentals behind the Report Worker before it became an orchestration, and the building blocks Durable Functions itself sits on top of. Know this section first; Durable Functions (DD4) is the specialised extension built on top of these same primitives.

> ⚠️
> **It's a piece of code that runs when something happens, and you don't manage a server for it.** You write one method, decorate it with a trigger (what causes it to run — a queue message, an HTTP call, a timer), and Azure handles provisioning, scaling, and patching the infrastructure underneath it. You pay (in Consumption plans) only for the time your code actually executes.

| Concept | What it means |
| --- | --- |
| **Trigger** | What causes the function to run. Exactly one per function — e.g. `[ServiceBusTrigger]`, `[HttpTrigger]`, `[TimerTrigger]`, `[BlobTrigger]`. The trigger also usually delivers the input data (e.g. the queue message body). |
| **Input binding** | Declarative way to pull in extra data the function needs, without writing SDK boilerplate — e.g. read a row from Table Storage matching an ID from the trigger payload. |
| **Output binding** | Declarative way to send data out — e.g. return a value and have it automatically written to a Queue or Blob, instead of manually instantiating a client SDK and calling Send. |

> ✅
> In our codebase we mostly use the trigger plus our own service calls (e.g. Blob SDK inside an Activity) rather than declarative output bindings for everything — that's a valid choice too. Bindings are a convenience layer, not a requirement; you can always drop down to the SDK directly when you need more control (e.g. generating a SAS URL with specific options).

| Plan | Scaling behaviour | When to use |
| --- | --- | --- |
| **Consumption** | Scales to zero when idle, automatically adds instances as load increases, pay-per-execution | Bursty, unpredictable workloads — exactly our Report Worker, which is busy at market open and idle afterward |
| **Premium** | Pre-warmed instances (no cold start), still elastic, supports VNET integration | Latency-sensitive functions where even a 1–2s cold start is unacceptable, or you need private networking to a VNET-restricted resource |
| **Dedicated (App Service Plan)** | Runs on VMs you already pay for continuously, no cold start, no extra scale-out cost model | You already have spare capacity on an App Service Plan and want predictable, always-on cost instead of consumption billing |

> ⚠️
> **Cold start:** On Consumption, if no instance has handled a request recently, the platform has to spin one up before your code runs — adds latency (could be seconds, more for .NET if JIT-heavy). For our async report jobs, a cold start adds a little delay before the worker picks up the queue message, but since the whole flow is already async and polled, it's invisible to the user.

```
In-Process Model (older):
  Your function code runs INSIDE the same process as the Functions host.
  Tightly coupled to whatever .NET version the host itself runs.
  Simpler binding object model, but you're stuck on host-supported .NET versions.

Isolated Worker Model (current, what our project uses):
  Your function code runs in its OWN separate worker process.
  Communicates with the host process over gRPC.
  Lets you run a newer/different .NET version than the host requires.
  Full control over the dependency injection container (Program.cs sets it up
  explicitly, like a normal ASP.NET Core app) — you're not limited to the
  host's built-in DI.
  This is the model Microsoft is investing in going forward.
```

| Trigger | Used for | Why this one |
| --- | --- | --- |
| `ServiceBusTrigger` | Function1 — picks up report-generation-queue messages | Queue semantics fit a task that should be processed exactly once per message; auto-scales with queue depth |
| `OrchestrationTrigger` | ReportOrchestrator | Durable Functions-specific trigger — marks a function as the workflow definition the Durable Task framework drives via replay |
| `ActivityTrigger` | GenerateReport, WriteToBlob, GenerateSasUrl | Marks a function as a unit of real work the orchestrator can schedule and await |

```
Scale controller monitors the trigger source (e.g. Service Bus queue length):
  Queue has 1 message    → 1 function instance handles it
  Queue has 50 messages   → scale controller spins up multiple instances
                            in parallel, each pulling and processing
                            different messages concurrently
  Queue drains to 0       → instances scale back down to zero over time

This is why a Consumption-plan Function is a good fit for bursty, unpredictable
load — Report Worker demand at 9am market open vs. 3pm is wildly different,
and we don't pay for idle capacity or manually configure autoscale rules.
```

**Q: Q: What's the difference between a trigger and a binding?**

Answer:
        A trigger is what causes the function to execute — every function has exactly one (a queue message arriving, an HTTP request, a timer firing). A binding is a declarative way to read additional input or write output without hand-writing SDK calls — for example, an input binding could fetch a row from Table Storage matching an ID from the trigger payload, and an output binding could write your return value straight to a Blob or Queue. The trigger always implies an input as well; bindings are the optional extra wiring around it.

**Q: Q: Why did the project use the isolated worker model instead of in-process?**

Answer:
        The isolated worker model runs our function code in its own process, separate from the Functions host, communicating over gRPC. That decouples our .NET version from whatever version the host itself requires, gives us a normal ASP.NET Core-style Program.cs where we configure dependency injection explicitly, and it's the model Microsoft is actively investing in going forward — in-process is effectively the legacy path now. For a project that wants to stay current on .NET versions without waiting on host support, isolated is the right default.

**Q: Q: What's a cold start, and does it matter for this workload?**

Answer:
        On a Consumption plan, instances scale to zero when idle. The first request after idle time has to wait for a new instance to spin up before the function runs — that's the cold start, and it can add a noticeable delay, especially for .NET workloads with JIT compilation. For our Report Worker, it doesn't really matter: the entire pipeline is already asynchronous — the client gets a jobId immediately and polls for status — so an extra second or two before the worker actually starts processing is invisible to the end user. If this were a latency-sensitive synchronous API, I'd consider a Premium plan instead, which keeps pre-warmed instances around specifically to avoid this.

**Q: Q: How does a Consumption-plan Function scale automatically?**

Answer:
        The platform's scale controller watches the trigger source — for a queue trigger, that's queue length and the rate messages are arriving. If the queue backs up, it spins up additional function instances in parallel, each pulling and processing different messages, up to a configured maximum. As the queue drains, instances scale back down, eventually to zero. We don't write any autoscale rules ourselves — it's driven by the trigger type automatically, which is exactly why a bursty workload like report generation (heavy at market open, quiet later) fits Consumption well.

**Q: Q: When would you choose a Premium or Dedicated plan instead of Consumption?**

Answer:
        Premium, if cold start latency is unacceptable for the use case — it keeps pre-warmed instances ready — or if the function needs VNET integration to reach a network-restricted resource, which Consumption doesn't support. Dedicated (running on an existing App Service Plan) makes sense if we already have spare, paid-for compute sitting there and want predictable always-on costs rather than the variable per-execution billing of Consumption. For our Report Worker specifically, the bursty nature and tolerance for a small startup delay made Consumption the right default — we'd only revisit that if cold starts became a measured problem.

**Q: Scenario: A teammate suggests writing all the report-pipeline glue logic directly inside one big function instead of using bindings/triggers at all. What would you push back on?**

Answer:
        You can absolutely write everything procedurally inside one function body, and for a tiny one-off task that's fine — but for a job that needs to react to a queue, scale with load, and potentially survive crashes mid-pipeline, you lose a lot for free. The trigger gives you automatic scale-out tied to queue depth without writing polling code yourself. Splitting the work into discrete steps (even before going Durable) makes each piece testable and reusable. And it sets you up cleanly to move to a Durable orchestration later — which we did — without redesigning the worker model. I'd push back gently: a single monolithic function works today, but it's a dead end if the pipeline grows another step or needs crash recovery.

**Q: Scenario: The Report Worker function is timing out on very large reports before it can finish all the work. What are your options?**

Answer:
        A few angles. First, check the plan's max execution timeout — Consumption has a default (commonly 5 minutes, configurable up to 10) where Premium/Dedicated can run unbounded; if the report generation is legitimately long-running, moving off Consumption removes the hard ceiling. Second, and more architecturally — this is exactly the case for Durable Functions: instead of one function doing all the work in one execution, break it into Activity steps (generate → upload → finalize) so each step is its own bounded unit of work and the overall job isn't limited by a single function's timeout, since the orchestrator coordinates across multiple executions rather than one long one. That's part of why we evolved this worker into a Durable orchestration.

> 💡 This question is a natural bridge into the Durable Functions section (DD4) — use it to pivot there if asked as a follow-up.


---

## Deep Dive — Durable Functions

> ℹ️
> **Where this fits:** The report generation worker (Section 3b) started as a single Azure Function reacting to one queue message. As the pipeline grew more steps — generate → upload to blob → produce a SAS URL — we evolved the worker into a **Durable Function orchestration** so each step is independently checkpointed and the whole job survives a crash or restart without redoing finished work.

> ⚠️
> **Think of it as a recipe with a notebook.** Normally, if the app crashes halfway through a report job, you lose everything and start over. Durable Functions writes down every finished step in a notebook (stored in Azure Storage) as it goes — "Step 1 done, here's the result." If the process crashes or restarts, it doesn't redo the work, it reads the notebook and resumes from the next step.

```
Durable Functions is built on the Durable Task Framework — it uses EVENT SOURCING, not snapshots.

Every time the orchestrator awaits something (an activity call, a timer, an
external event), the framework:
  1. Appends an event to a History log for that orchestration instance
  2. Persists that history to the configured storage account (AzureWebJobsStorage)
  3. Pauses the orchestrator until the awaited work completes

When the awaited work finishes, the framework wakes the orchestrator back up
and REPLAYS the function from the top:
  - Every previously-completed step returns its cached result instantly from
    history (no real work re-executes)
  - Only the first NOT-YET-completed step actually runs for real

This is why orchestrator code must be deterministic — no DateTime.Now,
Guid.NewGuid(), or direct I/O inside the orchestrator itself. Anything like
that has to go through context.CurrentUtcDateTime, or live inside an Activity,
otherwise replay produces different results each time and history desyncs.
```

| Storage artifact | Purpose |
| --- | --- |
| **Instances / History table** | One row per orchestration instance; the full event history (what ran, what it returned) that replay reads from |
| **Control queue** | The orchestrator's own queue — wakes it up when an activity result or timer fires |
| **Work-item queue** | Where Activity functions pick up the actual jobs the orchestrator schedules |
| **Large-message blob container** | Used automatically when an activity's input/output is too large to fit in a queue message |

```
CLIENT FUNCTION (Service Bus Trigger — Function1)
  Receives message from report-generation-queue
  Calls: client.ScheduleNewOrchestrationInstanceAsync("ReportOrchestrator", payload)
  Returns immediately — does NOT wait for the report to finish ✅

ORCHESTRATOR FUNCTION (ReportOrchestrator)
  [OrchestrationTrigger] TaskOrchestrationContext context
  string content  = await context.CallActivityAsync
("GenerateReport", input);
  string blobPath = await context.CallActivityAsync
("WriteToBlob", content);
  string sasUrl   = await context.CallActivityAsync
("GenerateSasUrl", blobPath);
  return sasUrl;

  Each "await" is a checkpoint:
    - GenerateReport completes → history records the result → checkpoint written
    - If the process crashes here, on restart the orchestrator REPLAYS,
      sees GenerateReport already has a result in history, skips re-running it,
      and resumes at WriteToBlob — not from the very beginning.

ACTIVITY FUNCTIONS ([ActivityTrigger])
  GenerateReport   → builds report content
  WriteToBlob      → uploads to Azure Blob Storage, returns blob path
  GenerateSasUrl   → returns a time-limited SAS URL for download
```

> ✅
> You could call three plain functions in sequence from the trigger function itself, but then YOU own the crash-recovery logic — tracking which step completed, persisting that somewhere, and writing the resume logic by hand. Durable Functions gives you that checkpointing for free: the framework persists progress after every awaited step, and replay-based resume is built into the runtime. It is the managed version of the "saga / workflow with a tracking table" pattern people otherwise hand-roll.

| Pattern | Fits Durable Functions because… |
| --- | --- |
| Function chaining | Sequential steps where each step's output feeds the next, and you want each step durable/retryable independently — exactly the report pipeline |
| Fan-out / fan-in | Kick off N parallel activities (e.g. generate sections of a report concurrently), then aggregate once all complete |
| Async HTTP APIs | Client kicks off a long job and polls a status endpoint instead of holding a connection open — Durable Functions has a built-in HTTP status-polling pattern |
| Human interaction / approval | Orchestration can pause for minutes, hours, or days waiting for `WaitForExternalEvent` (e.g. a manager approving a report before it's sent) |
| Stateful entities | Durable Entities act like small stateful actors holding state across calls — less relevant here, more common in IoT/counter scenarios |

> 🚩
> **When it's overkill:** A single quick operation that finishes in well under a second and doesn't need to survive a crash gains nothing from Durable Functions — it just adds storage and orchestration overhead for no benefit. Use a plain function there.

> 🗣️ **Say this:**
>
> We evolved the report worker from a single queue-triggered function into a Durable Function orchestration once the pipeline grew multiple sequential steps — generate the report, upload it to blob storage, then produce a SAS URL. The trigger function now just schedules an orchestration instance and returns immediately. The orchestrator calls each step as an Activity function and awaits the result. Durable Functions checkpoints progress after every step into Azure Storage using an event-sourcing model, so if the process crashes mid-pipeline, it doesn't restart from scratch — on recovery it replays the orchestration history, instantly skips the steps that already completed, and resumes exactly where it left off. That gave us crash-safe, resumable report generation without hand-rolling our own progress-tracking table.

**Q: Q: What problem do Durable Functions solve that a plain Azure Function doesn't?**

Answer:
        A plain function is stateless and atomic — if it crashes partway through a multi-step job, that progress is gone and you start the whole thing over. Durable Functions adds a persistent, checkpointed workflow on top of functions: after every awaited step (an Activity call, a timer, an external event), the framework writes that step's result to storage. If the process restarts, the orchestrator replays from history, instantly resumes anything already completed, and only does real work from the first incomplete step onward. It turns a multi-step pipeline into something that survives crashes and redeploys without you writing your own progress-tracking logic.

**Q: Q: How does the orchestrator "remember" what it already did? Where is that state stored?**

Answer:
        It's event sourcing, not a snapshot. Every orchestration instance has a history log of events — "activity X started," "activity X completed with result Y" — persisted in the storage account configured by `AzureWebJobsStorage` (an Instances/History table, plus control and work-item queues the framework manages). When the orchestrator wakes up, it doesn't resume execution mid-function the way a thread would — it replays the orchestrator code from the top. Every step already present in history returns its cached result immediately instead of re-running; the first step without a recorded result is the one that actually executes.

> 💡 Mention "event sourcing" and "replay" explicitly — these are the two terms interviewers are listening for.

**Q: Q: Why can't I just call DateTime.Now or Guid.NewGuid() inside the orchestrator function?**

Answer:
        Because the orchestrator function body gets re-executed (replayed) every time it wakes up, it has to be deterministic — given the same history, it must produce the same sequence of calls every time. If the orchestrator called `DateTime.Now` directly, replay would get a different value each time and could schedule a different activity than it did originally, desynchronising it from its own history. The framework provides deterministic equivalents instead — `context.CurrentUtcDateTime` for time, or you push any genuinely non-deterministic work (random numbers, real I/O, current time) into an Activity function, where it's only executed once and the result is the thing that gets recorded in history.

**Q: Q: What's the difference between an Orchestrator function and an Activity function?**

Answer:
        The Orchestrator (`[OrchestrationTrigger]`) defines the workflow — what steps run, in what order, with what logic between them — but it must stay deterministic and side-effect free, because it gets replayed. Activities (`[ActivityTrigger]`) are where the real work and side effects happen — calling an external API, writing to Blob Storage, hitting a database. Each Activity call from the orchestrator runs exactly once for real; only its already-known result gets replayed afterward, never the Activity code itself.

**Q: Q: What's the trigger function's job if the orchestrator does all the real work?**

Answer:
        The trigger function (our Service Bus-triggered Function1) is just the entry point — it calls `DurableTaskClient.ScheduleNewOrchestrationInstanceAsync` with the incoming payload and returns immediately. It doesn't wait for the report to finish; it just hands off a durable "ticket" represented by an instance ID. That keeps the Service Bus message processed quickly — Service Bus doesn't hold a lock open for however long the whole report pipeline takes, it's released as soon as scheduling succeeds.

**Q: Scenario: The Function host crashes right after "WriteToBlob" completes but before "GenerateSasUrl" runs. What happens when it restarts?**

Answer:
        Because `WriteToBlob` already completed and its result was checkpointed to history before the crash, nothing is lost. On restart, the Durable Task framework picks the orchestration instance back up from the control queue, replays the orchestrator function from the top, and for both `GenerateReport` and `WriteToBlob` it sees a completed result in history and returns those instantly without re-executing them — so the report isn't regenerated and the blob isn't re-uploaded. It reaches `GenerateSasUrl`, finds no result for that step yet, and actually executes it for the first time. The job resumes from exactly the next undone step, not from scratch.

> 💡 This is the single most likely scenario question — answer it by walking through replay step-by-step like this, naming which steps replay from cache vs which step actually runs.

**Q: Scenario: Product asks you to add a 4th step that generates three report sections in parallel before assembling the final PDF. How would Durable Functions handle that?**

Answer:
        That's the fan-out/fan-in pattern. Inside the orchestrator, instead of one `await` per Activity, I'd start all three section-generation Activity calls without awaiting each individually — `context.CallActivityAsync` three times into a list of tasks — then `await Task.WhenAll(tasks)` to wait for all three to complete before moving on to the assembly step. The framework checkpoints each of the three results independently in history, so even here, if the process crashes after two of three sections finish, replay resumes only the section that hadn't completed, not all three.

**Q: Scenario: A client wants the report job to pause and wait for a manager's approval before the SAS URL is emailed out, possibly hours or days later. How would you implement that with Durable Functions?**

Answer:
        I'd add an `await context.WaitForExternalEvent("ApprovalReceived")` step in the orchestrator after report generation and before the final notification step. The orchestration instance effectively suspends — it costs nothing while waiting, there's no thread or function execution sitting idle — until something raises that event for that specific instance ID, typically via a separate HTTP-triggered function that the manager's "Approve" link calls, which in turn calls `client.RaiseEventAsync(instanceId, "ApprovalReceived", ...)`. The orchestrator then wakes up, replays up to that point, sees the event was received, and proceeds to the notification step. This is exactly the human-interaction pattern Durable Functions is designed for — long waits without keeping infrastructure busy.

**Q: Q: Doesn't replaying the orchestrator function every time waste compute, especially for a long pipeline with many steps?**

Answer:
        It looks wasteful but isn't, in practice. Replaying already-completed steps doesn't re-run their actual work — it's just reading cached results out of history and returning them, which is cheap in-memory bookkeeping, not real I/O. The cost only shows up as the orchestrator function getting "re-entered" more times as the history grows, which the framework mitigates internally (it doesn't literally redo the whole walk every single time in the simplest cases). For genuinely very long-running orchestrations with thousands of steps, Microsoft's guidance is to use sub-orchestrations to keep individual histories smaller — but for a 3–4 step pipeline like ours, this is a non-issue.


---

## Deep Dive — Azure Cosmos DB

> ℹ️
> **Where it sits in the architecture:** Cosmos DB holds the Ownership time-series data — high write volume, schema that can vary slightly between data providers, and a query pattern that's almost always "history for one company." That profile is what makes a flexible-schema, horizontally-scalable document store the right fit, versus Azure SQL which we use for the genuinely relational Profiles/Contacts/Targeting data.

A globally distributed, multi-model PaaS database. You don't provision servers — you provision throughput (Request Units, or RU/s), and Cosmos handles partitioning, replication, and scaling underneath. One account can expose data through different APIs: **Core (SQL) API** (native document model, the default), API for MongoDB, API for Cassandra, Gremlin (graph), Table API, and a separate distributed-Postgres offering (vCore, built on Citus). We use Core (SQL) API — it's the standard fit for a greenfield .NET stack with no migration constraint pulling toward another API.

| Setting | Value | Why |
| --- | --- | --- |
| Database | `OwnershipDb` | — |
| Container | `OwnershipHistory` | — |
| Partition key | `/companyId` | Almost every real query is "history for company X" — keeps those reads in a single partition (cheap), avoids a hot partition (e.g. partitioning by `quarter` would pile every company's quarter-end writes onto one partition) |
| Id design | `{companyId}-{quarter}` e.g. `AAPL-2025-Q2` | Self-describing id; uniqueness in Cosmos is actually the combination of **id + partition key**, not id alone, so embedding the partition value avoids accidental collisions |
| Consistency | Session (default) | Read-your-own-writes within a session without paying cross-region Strong-consistency latency — a few seconds of staleness across regions is fine for ownership reporting |
| Throughput | Dedicated container-level, autoscale | Report-generation and quarterly refresh cycles are bursty, not constant — autoscale avoids both throttling and paying for idle peak capacity |

```
CosmosClient client = new CosmosClient(connectionString);
Container container = client.GetDatabase("OwnershipDb").GetContainer("OwnershipHistory");

// Point read — cheapest possible op, ~1 RU, needs id + partition key
var item = await container.ReadItemAsync<OwnershipRecord>(
    id: "AAPL-2025-Q2", partitionKey: new PartitionKey("AAPL"));

// Query — SQL-like syntax over JSON documents
var query = new QueryDefinition(
    "SELECT * FROM c WHERE c.companyId = @companyId")
    .WithParameter("@companyId", "AAPL");
var iterator = container.GetItemQueryIterator<OwnershipRecord>(query);

// Upsert — insert-or-replace, idempotent (important for at-least-once delivery from Service Bus)
await container.UpsertItemAsync(record, new PartitionKey(record.CompanyId));
```

| Operation | Cost | Why |
| --- | --- | --- |
| Point read (`ReadItemAsync` with id + partition key) | Lowest | Goes straight to the exact document, no query engine involved |
| Query filtered on partition key | Low | Stays within a single physical partition |
| Query NOT filtered on partition key | High | Cross-partition scatter-gather — fans out to every partition and merges results |
| `GROUP BY` / aggregates without partition key filter | High | Same scatter-gather problem, plus aggregation overhead |

> ⚠️
> **RU/s in one line:** Request Units are Cosmos's normalized cost unit (CPU+memory+IO) for any operation. You provision RU/s (or use autoscale/serverless); exceed the budget and requests get throttled (HTTP 429) rather than just slowing down — so RU awareness is a reliability concern, not just a cost one.

> ✅
> A feature like "show ownership changes across ALL companies in the last 24 hours" is inherently cross-partition and expensive to query live. The better pattern is the **Change Feed** — a continuous, ordered stream of inserts/updates per partition that a separate Azure Function or reader consumes continuously, pushing results into a pre-computed summary container or downstream queue. Turns an expensive ad-hoc scan into a cheap, pre-built read path.

> 🗣️ **Say this:**
>
> We use Cosmos DB's Core API for ownership time-series data because it's high write volume, the schema can vary slightly between data providers, and almost every query is "give me history for one company" — a profile that fits a flexible-schema, horizontally-scalable document store better than a fixed relational table. We partitioned by companyId specifically to avoid a hot-partition problem and keep our most common query pattern single-partition. We use Session consistency since we don't need cross-region strong consistency for ownership reporting, and we lean on point reads over queries wherever we already know the id, since that's the cheapest possible RU cost.

**Q: Q: What problem does Cosmos DB solve that Azure SQL doesn't, in your architecture?**

Answer:
        Ownership data is high-volume, time-series, and the schema occasionally varies between data providers — exactly the profile where a flexible-schema, horizontally-scalable document store outperforms a fixed relational schema. Azure SQL is the right tool for Profiles/Contacts/Targeting because that data is genuinely relational with strict structure and needs joins and ACID guarantees across related tables. Different data shapes, different tools.

**Q: Q: How did you choose the partition key for the OwnershipHistory container, and why does it matter?**

Answer:
        We partitioned by companyId. Almost every real query pattern is "give me ownership history for company X," so keeping all of a company's documents in one logical partition makes those reads single-partition and cheap. The partition key is the single most consequential design decision in Cosmos DB — it determines both query efficiency and write distribution, and it can't be changed after creation without migrating to a new container.

> 💡 Partition key choice is the #1 thing interviewers probe on Cosmos DB — always have a concrete reason tied to your real query pattern, not just "it seemed reasonable."

**Q: Q: What's a Request Unit (RU), and why should an engineer care about it day to day?**

Answer:
        An RU is Cosmos's normalized cost unit covering CPU, memory, and IO for an operation — every read, write, and query consumes a measurable number of RUs based on document size and operation complexity. You provision RU/s (or use autoscale/serverless), and if your application exceeds that budget, requests get throttled (HTTP 429) rather than just slowing down. RU awareness directly drives both cost and reliability — a badly-designed query that scans across partitions can burn far more RUs than an equivalent well-targeted one.

**Q: Q: What's the difference between a point read and a query, cost-wise?**

Answer:
        A point read (ReadItemAsync with both id and partition key) goes straight to the exact document — the cheapest possible operation. A query, even one scoped to a single partition, goes through the query engine and costs more. A cross-partition query (no partition key in the filter) is the most expensive, since Cosmos fans out to every physical partition and merges results. Always prefer a point read over a query when you already know the id and partition key.

**Q: Q: What consistency levels does Cosmos DB offer, and which would you pick for ownership data?**

Answer:
        Five levels: Strong, Bounded Staleness, Session (the default), Consistent Prefix, and Eventual — a tradeoff between consistency, latency, availability, and throughput. For ownership data, Session consistency is right: within a single client session you always read your own latest writes, but you're not paying the cross-region latency cost of Strong consistency, which ownership reporting doesn't need.

**Q: Q: Cosmos DB supports multiple APIs — Core/SQL, MongoDB, Cassandra, Gremlin, Table. Why Core/SQL here?**

Answer:
        It's the native, default model — document-based, queried with SQL-like syntax, with full first-class SDK support in .NET. The other APIs mainly exist for migration scenarios — you already have a Mongo or Cassandra app and want to move to Cosmos without rewriting the data access layer. We're greenfield on Azure with a .NET stack, so there's no migration constraint pulling toward another API.

**Q: Scenario: A teammate suggests partitioning the container by "quarter" instead of "companyId," since quarter is simpler. What's your concern?**

Answer:
        That creates a hot partition. Every company's data for the current quarter would land on the same partition, so during the heaviest ingestion period — quarter-end, when every data provider sends updates — all writes pile onto one partition's throughput budget while other partitions sit idle. Cosmos can't fix this after the fact; partition key choice is fixed at container creation. I'd confirm the real query pattern is "by company," which it is, and keep companyId as the partition key.

> 💡 This is the most common Cosmos scenario question — always frame your answer around the actual read/write pattern, not a "simpler-sounding" key.

**Q: Scenario: Your report generation job calls the same Cosmos write twice due to a Service Bus message redelivery (at-least-once delivery). What breaks, and how do you prevent it?**

Answer:
        If the code uses CreateItemAsync, the second call throws a 409 Conflict, since the same id already exists in that partition — a safety net, but it needs explicit handling or the retry looks like a failure. The cleaner fix is UpsertItemAsync instead of CreateItemAsync for this kind of pipeline — insert-or-replace is naturally idempotent, so redelivery just overwrites the same document with the same data, no error, no special-casing needed.

**Q: Scenario: A new feature needs "show every ownership change across all companies in the last 24 hours" — inherently cross-company. How do you support that without a slow cross-partition scan every time?**

Answer:
        I'd reach for the Change Feed instead of querying the container directly. It gives a continuous, ordered stream of inserts/updates per partition, which a separate Azure Function or dedicated reader can consume continuously and push into a separate summary container or downstream queue purpose-built for that "last 24 hours, all companies" shape. That turns an expensive ad-hoc cross-partition query into a cheap, pre-computed read path.

**Q: Scenario: RU consumption is suddenly spiking and reports are timing out. How would you diagnose it?**

Answer:
        First, the portal's Metrics blade — check normalized RU consumption and 429 throttling rate over time to confirm it's a throughput ceiling issue, not something else like network. Then Data Explorer's Query Stats on the suspect queries to see actual RU charge per call — that usually reveals a query that lost its partition-key filter, or a new access pattern doing cross-partition scans. Fix is either tightening the query to include the partition key, adding a more targeted index, or increasing provisioned RU/s (or moving to autoscale) if the load genuinely grew.


---

## Deep Dive — EF Core 8 (IR Engagement & Activity Service)

> ℹ️
> **Where it fits:** The Contacts Service tracks *who* your investors are — contact profiles, scheduled meetings. The Engagement & Activity Service tracks *what happened* — meeting outcomes, discussion notes, follow-up tasks, and engagement effectiveness scores. This "what happened" data feeds the AI Textual Analytics module (sentiment scoring on outcome notes) and drives board-level IR engagement reports.

### Why this service exists

IR teams at public companies run hundreds of investor touchpoints per year — roadshows, non-deal roadshows (NDRs), earnings calls, one-on-one meetings. Capital Access had a gap: the Contacts Service records *that* a meeting was scheduled, but not *what happened* when it occurred. IR teams needed:

1. Structured outcome recording — what was discussed, which investors attended, who no-showed
2. Follow-up task tracking — materials to send, follow-up meetings to schedule
3. Engagement effectiveness measurement — correlate investor meetings with ownership changes
4. Board reporting — quarterly IR activity reports for corporate governance

We built the Engagement & Activity Service as a dedicated microservice with Azure SQL and EF Core 8 (Code-First) as its data access layer.

---

### Code-First vs DB-First — the decision

| | Code-First | DB-First |
| --- | --- | --- |
| Schema ownership | C# model classes are the source of truth; EF generates the schema | Existing database is the source of truth; EF generates C# classes from it |
| Schema changes | EF migrations — tracked in git, applied in CI/CD pipeline | Hand-written DDL scripts or database project |
| Fits when | Greenfield service, team owns schema evolution | Existing production database, DBA-managed schema |
| Trade-off | Schema lives with the code — easy to evolve, but needs careful migration discipline | No up-front schema work, but changes are harder to track and automate |

**We chose Code-First.** The Engagement Service is a greenfield microservice — no existing database to reverse-engineer. The product team iterates the data model frequently (new activity types, new engagement dimensions), so migrations tracked in git and auto-applied in CI/CD is far safer than coordinating hand-written DDL with every deploy.

---

### Entity model

```csharp
// Aggregate root
public class EngagementActivity
{
    public Guid Id { get; private set; }
    public string TenantId { get; private set; }           // multi-tenancy: every row scoped to a tenant
    public string CompanyId { get; private set; }           // external reference to Profiles Service
    public ActivityType ActivityType { get; private set; }
    public EngagementStatus Status { get; private set; }

    public DateTime ScheduledAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    public string? AgendaNotes { get; private set; }
    public string? OutcomeNotes { get; private set; }

    public bool IsDeleted { get; private set; }             // soft delete — compliance, audit trail
    public byte[] RowVersion { get; private set; }          // optimistic concurrency token

    private readonly List<AttendeeRecord> _attendees = new();
    public IReadOnlyCollection<AttendeeRecord> Attendees => _attendees.AsReadOnly();

    private readonly List<FollowUpTask> _followUpTasks = new();
    public IReadOnlyCollection<FollowUpTask> FollowUpTasks => _followUpTasks.AsReadOnly();

    // Domain method — state transition with invariant enforcement
    public void Complete(string outcomeNotes)
    {
        if (Status != EngagementStatus.Scheduled)
            throw new InvalidOperationException("Only scheduled activities can be completed.");
        Status = EngagementStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        OutcomeNotes = outcomeNotes;
    }

    public void SoftDelete() => IsDeleted = true;
}

public class AttendeeRecord
{
    public Guid Id { get; private set; }
    public Guid EngagementActivityId { get; private set; } // FK to parent activity
    public string InvestorContactId { get; private set; }  // external ref to Contacts Service (no cross-DB FK)
    public AttendanceStatus Attendance { get; private set; }
    public decimal? SentimentScore { get; private set; }   // populated later by AI Textual Analytics
}

public class FollowUpTask
{
    public Guid Id { get; private set; }
    public Guid EngagementActivityId { get; private set; }
    public string TaskType { get; private set; }           // "SendMaterials" | "ScheduleFollowUp" | "ProvideFeedback"
    public DateTime DueDate { get; private set; }
    public string AssignedTo { get; private set; }
    public bool IsCompleted { get; private set; }
    public bool IsDeleted { get; private set; }
}

public enum ActivityType  { Roadshow, NDR, EarningsCall, OneOnOne, GroupPresentation }
public enum EngagementStatus { Scheduled, InProgress, Completed, Cancelled }
```

---

### DbContext — global query filters for multi-tenancy and soft delete

```csharp
public class EngagementDbContext : DbContext
{
    private readonly string _tenantId;

    // ICurrentTenantService resolves the tenant ID from the HTTP context's JWT claim
    // DbContext lifetime: Scoped (one instance per HTTP request)
    public EngagementDbContext(DbContextOptions<EngagementDbContext> options,
                               ICurrentTenantService tenantService)
        : base(options)
    {
        _tenantId = tenantService.TenantId;
    }

    public DbSet<EngagementActivity> EngagementActivities => Set<EngagementActivity>();
    public DbSet<FollowUpTask> FollowUpTasks => Set<FollowUpTask>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // GLOBAL QUERY FILTER 1 — multi-tenancy
        // Every LINQ query to EngagementActivities automatically includes:
        //   AND TenantId = '{_tenantId}' AND IsDeleted = 0
        // Client A can NEVER see Client B's activities — enforced at the ORM layer.
        modelBuilder.Entity<EngagementActivity>()
            .HasQueryFilter(e => e.TenantId == _tenantId && !e.IsDeleted);

        // GLOBAL QUERY FILTER 2 — soft delete on follow-up tasks
        modelBuilder.Entity<FollowUpTask>()
            .HasQueryFilter(t => !t.IsDeleted);

        // OPTIMISTIC CONCURRENCY — maps to SQL Server ROWVERSION column
        // If two users try to complete the same meeting simultaneously,
        // the second SaveChanges() throws DbUpdateConcurrencyException
        modelBuilder.Entity<EngagementActivity>()
            .Property(e => e.RowVersion)
            .IsRowVersion();

        // Store enum as string — readable in DB, stable if enum integer values change
        modelBuilder.Entity<EngagementActivity>()
            .Property(e => e.ActivityType)
            .HasConversion<string>();
    }
}

// Registration in Program.cs (DI):
builder.Services.AddDbContext<EngagementDbContext>(options =>
    options.UseSqlServer(connectionString)); // Scoped lifetime by default
```

---

### Entity states — the change tracker

EF Core's change tracker monitors every entity loaded from the database. On `SaveChanges()`, it generates SQL based on the current state of each tracked entity.

| State | Meaning | SQL on SaveChanges() |
| --- | --- | --- |
| **Added** | New entity, not yet persisted | `INSERT` |
| **Modified** | Loaded from DB, one or more properties changed | `UPDATE` (only changed columns) |
| **Deleted** | Marked for deletion | `DELETE` |
| **Unchanged** | Loaded from DB, no changes detected | None |
| **Detached** | Not being tracked at all | None |

```csharp
// State walkthrough for completing an engagement meeting:

// Step 1: load entity — State = Unchanged
var activity = await _context.EngagementActivities
    .Include(e => e.FollowUpTasks)
    .FirstOrDefaultAsync(e => e.Id == activityId);

Console.WriteLine(_context.Entry(activity).State); // Unchanged

// Step 2: call domain method — change tracker detects property changes
activity.Complete(outcomeNotes);

Console.WriteLine(_context.Entry(activity).State); // Modified
// Change tracker knows: Status, CompletedAt, OutcomeNotes changed

// Step 3: save — EF generates minimal UPDATE:
//   UPDATE EngagementActivities
//   SET Status = 'Completed', CompletedAt = @now, OutcomeNotes = @notes
//   WHERE Id = @id AND RowVersion = @originalVersion  ← optimistic concurrency
await _context.SaveChangesAsync();
// If RowVersion changed between load and save → DbUpdateConcurrencyException

// Soft delete (we never issue DELETE for compliance):
activity.SoftDelete();             // State: Modified (IsDeleted: false → true)
await _context.SaveChangesAsync(); // UPDATE SET IsDeleted = 1  (NOT a DELETE statement)
```

---

### Tracking vs No-Tracking queries

```csharp
// TRACKED (default) — for write operations
// EF monitors every property. On SaveChanges(), generates precise UPDATE for what changed.
// Cost: each entity consumes memory in the change tracker.
public async Task CompleteActivityAsync(Guid activityId, string outcomeNotes)
{
    var activity = await _context.EngagementActivities
        .Include(e => e.FollowUpTasks) // eager load — prevents N+1 on FollowUpTasks
        .FirstOrDefaultAsync(e => e.Id == activityId);
    // Global filter applied: WHERE TenantId = '...' AND IsDeleted = 0

    activity.Complete(outcomeNotes);
    await _context.SaveChangesAsync();
}

// NO-TRACKING — for read-only report queries
// AsNoTracking(): EF skips the change-tracking overhead entirely
// Result: ~30% faster on large result sets, lower memory usage
// Trade-off: you cannot call SaveChanges() on these entities
public async Task<List<EngagementSummaryDto>> GetBoardReportDataAsync(string companyId, int year)
{
    return await _context.EngagementActivities
        .AsNoTracking()
        .Where(e => e.CompanyId == companyId
                 && e.Status == EngagementStatus.Completed
                 && e.ScheduledAt.Year == year)
        .Include(e => e.Attendees)
        .Select(e => new EngagementSummaryDto  // projection — fetch only needed columns
        {
            ActivityId   = e.Id,
            ActivityType = e.ActivityType.ToString(),
            CompletedAt  = e.CompletedAt!.Value,
            AttendeeCount = e.Attendees.Count(a => a.Attendance == AttendanceStatus.Present)
        })
        .ToListAsync();
}

// RULE OF THUMB:
// Command (create, update, delete) → tracked (default)
// Query (report, list, display)    → AsNoTracking()
```

---

### Concurrency — optimistic locking with RowVersion

```csharp
// Two IR team members open the same roadshow meeting simultaneously.
// Both click "Mark Complete" — the second one should fail gracefully.

public async Task CompleteActivitySafeAsync(Guid activityId, string notes)
{
    try
    {
        var activity = await _context.EngagementActivities
            .FirstOrDefaultAsync(e => e.Id == activityId);

        activity.Complete(notes);
        await _context.SaveChangesAsync();
        // EF adds: WHERE Id = @id AND RowVersion = @loadedRowVersion
        // First save: RowVersion matches → success → DB increments RowVersion
        // Second save: RowVersion no longer matches → throws DbUpdateConcurrencyException
    }
    catch (DbUpdateConcurrencyException ex)
    {
        // The row was changed by another user between our load and our save
        // Options:
        // 1. Reload and retry (database wins)
        // 2. Return 409 Conflict to the API caller and let the user decide
        throw new BusinessException("This meeting was updated by another user. Please refresh.");
    }
}
```

---

### Integration with existing architecture

```
Angular UI
    │  POST /api/engagements/{id}/complete
    ▼
Engagement Service
    ├── EF Core: loads EngagementActivity (tracked)
    ├── Calls activity.Complete(outcomeNotes) → state = Modified
    ├── SaveChangesAsync() → UPDATE in Azure SQL
    │
    │  Publishes EngagementCompletedEvent → Azure Service Bus Topic
    ▼
AI Textual Analytics Service (subscribes)
    ├── Runs sentiment model on OutcomeNotes
    ├── Calls back: PATCH /api/engagements/{attendeeId}/sentiment
    └── Engagement Service: updates SentimentScore on AttendeeRecord → SaveChanges()

Report Service (on board-report request)
    └── Calls GET /api/engagements/board-summary?companyId=&year= → AsNoTracking() query
```

> ℹ️
> **No cross-service DB joins.** The AttendeeRecord stores `InvestorContactId` as a plain string ID — not a foreign key into the Contacts Service database. If we need to display investor name + contact details alongside engagement data, we join them in the application layer: load engagement data from the Engagement Service, then hydrate investor details from the Contacts Service via a separate REST call. This maintains data ownership boundaries between microservices.

---

**Q: Why Code-First over DB-First for this service?**

Answer:
        Code-First was the right choice because the Engagement Service is greenfield — there's no existing database schema to reverse-engineer. The data model evolves with the product: when we added SentimentScore to AttendeeRecord or introduced the FollowUpTask entity, we simply ran `dotnet ef migrations add SentimentScore`, committed the migration file to git, and it ran automatically during the next Azure DevOps deployment pipeline. DB-First would have meant hand-writing DDL scripts for every schema change and coordinating them separately from the application code. Code-First keeps the schema and the code in lockstep, with migrations as the audit trail.

**Q: What is the lifetime DbContext should be registered with and why?**

Answer:
        Scoped — one DbContext instance per HTTP request. AddDbContext<T>() registers it as Scoped by default, which is correct for a web API. A single request might create a meeting, load it back, update its status, and save — all within one DbContext instance sharing the same change tracker and transaction. If you register it as Singleton, all requests share one instance: change tracker state leaks between requests, concurrent requests corrupt the tracker, and connection pooling assumptions break. If you register it as Transient, you get a new DbContext for every injected service within the same request, so they have separate change trackers and can't participate in the same transaction or see each other's uncommitted changes. Scoped is the only lifetime that gives you one consistent unit of work per request.

**Q: How do global query filters prevent one tenant from seeing another tenant's engagement data?**

Answer:
        We resolve the tenant ID from the validated JWT at the start of each HTTP request and inject it into the DbContext constructor via ICurrentTenantService. Global query filters on the EngagementActivity entity automatically append `WHERE TenantId = '{tenantId}'` to every LINQ query that touches that table — the developer writing the query doesn't have to remember to filter. Even if someone writes `_context.EngagementActivities.ToListAsync()` with no filter at all, the global filter makes it `WHERE TenantId = 'ClientA' AND IsDeleted = 0`. If a developer does need to bypass the filter — for example, an admin reporting job that runs cross-tenant — they explicitly call `.IgnoreQueryFilters()`, which is a visible opt-out rather than an invisible opt-in. That asymmetry means forgetting to filter is the safe default.

**Q: What is optimistic concurrency and how does RowVersion implement it?**

Answer:
        Optimistic concurrency assumes conflicts are rare — it doesn't lock the row when you load it, but it checks at save time whether the row changed while you were working. In EF Core, marking a property as `.IsRowVersion()` maps to a SQL Server `ROWVERSION` column that the database auto-increments on every write. When EF generates the UPDATE, it adds `WHERE Id = @id AND RowVersion = @valueWeLoadedEarlier`. If another user saved the row between our load and our save, the RowVersion no longer matches, the UPDATE affects zero rows, and EF throws `DbUpdateConcurrencyException`. In the Engagement Service this protects against two IR team members simultaneously completing the same meeting — one succeeds, the other gets a 409 and is told to refresh. The alternative — pessimistic locking with SELECT FOR UPDATE — holds a database lock for the duration, which is risky on a multi-tenant SaaS under any real concurrent load.

**Q: Why don't you use a Repository pattern wrapping EF Core's DbContext?**

Answer:
        We deliberated this. The Repository pattern made a lot more sense in the pre-ORM world where it abstracted raw ADO.NET or Dapper calls behind a consistent interface, and especially for testability where you'd swap the repository for an in-memory fake. With EF Core, DbContext already IS a unit of work with change tracking, and DbSet<T> already IS a queryable repository over each entity. Wrapping it in another Repository layer adds indirection without adding value — you end up creating a leaky abstraction where your repository methods gradually accumulate every query variant the application needs, and you lose the composability of IQueryable. We test the data access layer with the EF Core InMemory provider or a dedicated test database (via TestContainers), not by mocking a repository. The team decision was: use DbContext directly in service classes for straightforward cases, extract query objects or specifications only when a specific query becomes complex enough to warrant it.

---

