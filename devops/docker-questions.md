# Docker & Container Deployment — Interview Preparation

**Context**: Containerised the Notification and Shareholding microservices on the Entity Management System project for consistent dev/prod environments.
**Sourced from**: Virtusa Round 1 (Technical).

---

## Table of Contents

1. [Q1. Dockerfile — multi-stage build for a .NET microservice](#q1-dockerfile--multi-stage-build-for-a-net-microservice)
2. [Q2. How did you deploy the microservice? (full pipeline)](#q2-how-did-you-deploy-the-microservice-full-pipeline)

---

### Q1. Dockerfile — multi-stage build for a .NET microservice?

```dockerfile
# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ShareholdingService/ShareholdingService.csproj", "ShareholdingService/"]
RUN dotnet restore "ShareholdingService/ShareholdingService.csproj"
COPY . .
WORKDIR "/src/ShareholdingService"
RUN dotnet publish -c Release -o /app/publish

# Stage 2: Runtime (smaller image)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443
COPY --from=build /app/publish .
USER app
ENTRYPOINT ["dotnet", "ShareholdingService.dll"]
```

Key decisions:
- **Multi-stage build** — the SDK image (~700 MB) is only present during the build stage; the final runtime image (~200 MB) uses the much smaller ASP.NET runtime base, keeping the shipped image lean.
- **Non-root user** — `USER app` before `ENTRYPOINT`, so the container doesn't run as root (security hardening — limits blast radius if the container is compromised).
- **`.dockerignore`** — excludes `bin/`, `obj/`, `*.user` files to keep the build context small and avoid stale artifacts leaking into the image.

For local development, a `docker-compose.yml` spins up the API + SQL Server + a Service Bus emulator together with a single `docker-compose up`, so the whole dependency graph runs without touching cloud resources.

---

### Q2. How did you deploy the microservice? (full pipeline)

**1. Build & test** (Azure DevOps pipeline):
```
dotnet build && dotnet test        # unit + integration tests must pass
docker build -t acrname.azurecr.io/shareholding-svc:$(Build.BuildId) .
docker push acrname.azurecr.io/shareholding-svc:$(Build.BuildId)
```

**2. Infrastructure** — Azure Container Apps for serverless, auto-scaling containers without managing Kubernetes directly; AKS (Azure Kubernetes Service) was used in an earlier project where full cluster-level control was needed.

**3. YAML deploy step:**
```yaml
- task: AzureContainerApps@1
  inputs:
    azureSubscription: 'Prod-Connection'
    containerAppName: 'shareholding-service'
    resourceGroup: 'entity-mgmt-rg'
    imageToDeploy: 'acrname.azurecr.io/shareholding-svc:$(Build.BuildId)'
```

**4. Config & secrets** — environment variables injected via the Container App's environment configuration; secrets (connection strings, signing keys) pulled from Azure Key Vault via Managed Identity, never hard-coded or stored as plain pipeline variables.

**5. Zero-downtime** — Container Apps performs a rolling replacement by default, shifting traffic to the new revision gradually only after a configured health probe (`GET /health` → `200 OK`) passes.

**6. Post-deploy verification** — an Application Insights availability test pings `/health` every 5 minutes, and a smoke-test step in the pipeline calls a safe read endpoint and asserts `HTTP 200` before the deployment is considered complete.

**Why Container Apps over full AKS for this service**: the team didn't need custom scheduling, node pool management, or service mesh — Container Apps gives auto-scaling and revision-based rollout with a fraction of the operational overhead, and AKS is reserved for scenarios that genuinely need that level of control.
