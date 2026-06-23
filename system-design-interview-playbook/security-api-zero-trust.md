What Measures Would You Take to Protect APIs from Unauthorized Access in a Microservices Architecture?

*Alternate phrasing covered by this answer: "Attackers bypass your 'rate limiting' using multiple IPs — how do you protect your API in production?"*

Zero Trust. Defense in Depth. Shift-Left Security.

**Target Level: Senior Staff / Principal Engineer (17–18+ YOE)**

# 1. Start With a Threat Model, Not a Checklist

A Senior Staff answer doesn't open with 'use OAuth2.' It opens by framing the threat surface. In a microservices architecture, the attack surface is fundamentally different from a monolith:

- North-South traffic: External clients hitting the API Gateway. Classic auth boundary.
- East-West traffic: Service-to-service calls inside the cluster. Often implicitly trusted — this is the critical blind spot.
- Compromised internal service: Lateral movement threat. A breach in a low-privilege service should not grant access to high-privilege APIs.
- Token exfiltration: JWTs or API keys stolen from environment variables, logs, or network sniffing.
- Supply-chain attacks: Malicious dependencies that exfiltrate secrets or make unauthorized API calls.

# 2. Defense-in-Depth Architecture Diagram

```
  ┌──────────────────────────────────────────────────────────┐
  │                    EXTERNAL CLIENTS                      │
  └────────────────────────┬─────────────────────────────────┘
                           │ HTTPS (TLS 1.3)
  ┌────────────────────────▼─────────────────────────────────┐
  │                  WAF / DDoS Protection                   │ ← CloudFront/Cloudflare
  └────────────────────────┬─────────────────────────────────┘
                           │
  ┌────────────────────────▼─────────────────────────────────┐
  │                    API GATEWAY                           │
  │  ● JWT validation (RS256/ES256)                          │
  │  ● OAuth 2.0 token introspection / OIDC ID Token verify  │
  │  ● Rate limiting (per user, per IP, per API key)         │
  │  ● Request validation (JSON Schema, size limits)         │
  │  ● API key management (hashed storage, rotation)        │
  └──────────────┬──────────────┬────────────────────────────┘
                 │  mTLS        │  mTLS
  ┌──────────────▼──┐  ┌────────▼────────┐  ┌──────────────┐
  │  Order Service  │  │ Payment Service  │  │ User Service │
  │  ● OPA policy   │  │ ● OPA policy     │  │ ● OPA policy │
  │  ● RBAC check   │  │ ● PCI-DSS scope  │  │ ● ABAC check │
  └──────────────┬──┘  └────────┬─────────┘  └──────┬───────┘
                 └──────────────┴───────────────────┘
                         Service Mesh (Istio)
                    SPIFFE Workload Identity + mTLS
  ┌───────────────────────────────────────────────────────────┐
  │  Secrets: Vault / AWS Secrets Manager / GCP Secret Manager│
  │  Audit: CloudTrail / OPA decision logs / SIEM pipeline    │
  └───────────────────────────────────────────────────────────┘
```

# 3. Authentication at the API Gateway

## 3.1 OAuth 2.0 + OpenID Connect (OIDC)

The standard for delegated authorization and identity federation. Key flows at scale:

- Authorization Code + PKCE: For browser and mobile clients. PKCE mitigates auth code interception.
- Client Credentials: For M2M (service-to-service) where no user context is needed.
- Token Exchange (RFC 8693): Downscoping tokens when a user-facing request fans out to internal services with narrower scopes.

## 3.2 JWT Validation Best Practices

| JWT Concern | Implementation | Security Note |
| --- | --- | --- |
| Algorithm | Use RS256 or ES256 (asymmetric). Never HS256 in distributed systems — requires sharing the secret with every service. | Reject tokens signed with HS256 or 'none' algorithm. |
| Signature Verification | Verify against the JWKS endpoint (/.well-known/jwks.json). Cache public keys with TTL. Rotate keys with overlap period. | Never trust a JWT without signature verification. |
| Claims Validation | Validate iss (issuer), aud (audience), exp (expiry), iat (issued-at). Reject tokens with future iat or past exp. | Clock skew tolerance: max 5 seconds. |
| Token Revocation | Short-lived access tokens (15 min). Refresh tokens with rotation. Token introspection endpoint for real-time validity check. | Maintain a denylist for high-value revocations (logout, compromise). |

# 4. Authorization: RBAC, ABAC, and OPA

## 4.1 Role-Based Access Control (RBAC)

Assign permissions to roles; assign roles to subjects. Sufficient for most CRUD-level authorization. Embedded in JWT claims (roles or groups). Enforced at the gateway and optionally at the service layer.

## 4.2 Attribute-Based Access Control (ABAC)

Fine-grained policies based on subject attributes (user tier, department), resource attributes (data classification, owner), and environmental attributes (time, IP, device). Required for multi-tenant SaaS and regulated industries.

## 4.3 Open Policy Agent (OPA)

Decouples policy from code. Policies written in Rego; services query OPA as a sidecar or central policy engine via the /v1/data API. Key advantage: policies can be updated without service redeployment.

- Deployment: OPA as sidecar (low latency, no network hop) or centralized (easier policy management).
- Integration: Envoy external authorization filter calls OPA before forwarding requests — zero application code change.
- Audit: Every OPA decision is loggable. Decision logs shipped to SIEM for compliance.

# 5. East-West Security: Service-to-Service

## 5.1 Mutual TLS (mTLS)

Every service gets a cryptographic identity. mTLS ensures both client and server authenticate each other. In Istio, certificates are issued and rotated automatically via the SPIFFE/SPIRE framework — services get a SPIFFE Verifiable Identity Document (SVID).

- Certificate rotation: 24-hour TTL, rotated every 12 hours. Automatic via Istio Citadel / cert-manager.
- Identity: SPIFFE ID format: spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>
- Policy: AuthorizationPolicy in Istio restricts which SVIDs can call which service methods — enforced at the Envoy sidecar, not in application code.

## 5.2 Zero Trust Principles Applied

Never trust, always verify — even for internal traffic. In practice:

- No implicit trust based on network location (VPC membership does not equal trust).
- Least-privilege service accounts: Each service has a unique Kubernetes ServiceAccount with minimal RBAC permissions.
- Workload isolation: NetworkPolicy restricts pod-to-pod communication to declared paths only.
- Just-in-time access: Short-lived credentials for database access (Vault Dynamic Secrets) rather than long-lived passwords.

# 6. Rate Limiting, Throttling, and DDoS Mitigation

| Mechanism | Implementation | Security Purpose |
| --- | --- | --- |
| Per-user rate limit | Sliding window counter in Redis. Key: user_id:endpoint:window. Reject with 429 + Retry-After header. | Prevents credential stuffing and API abuse. |
| Per-IP rate limit | Token bucket algorithm. Penalize subnet blocks on repeated violations. | DDoS first line of defense at gateway or CDN edge. |
| Per-API-key quota | Daily/monthly quota with leaky bucket. Quota state in Redis or DynamoDB. | Enforcement for third-party developers and SLA tiers. |
| Adaptive throttling | Circuit breaker per downstream service. If downstream error rate > threshold, throttle upstream callers proactively. | Prevents cascading overload during partial outages. |
| Bot mitigation | CAPTCHA challenges on anomalous patterns. ML-based bot scoring (Cloudflare Bot Management, AWS WAF). | Layer before JWT validation to reduce load on auth services. |

# 6.1 Defeating Distributed Rate-Limit Bypass (Multi-IP Attacks)

Per-IP rate limiting is a necessary but insufficient control — a Senior Staff answer should immediately name its failure mode: an attacker with a botnet, residential proxy pool, or cloud-IP rotation rents thousands of distinct source IPs and stays under the per-IP threshold on every single one, while the aggregate request rate against the endpoint is still attack-scale. Per-IP limiting alone is defeated by construction, not by a configuration bug — the fix is to stop keying rate limits on the one signal the attacker fully controls.

```
Naive defense (broken):                    Layered defense (correct):
  limit(ip) < threshold?  → allow            score = f(ip, device_fp, account,
  10,000 IPs × 1 req/IP                              session_age, behavior, ASN)
  = 10,000 req/sec through the gate           limit(account) AND limit(device_fp)
                                               AND anomaly(velocity, geo-jump)
                                               AND global_budget(endpoint)
```

| Layer | Key the limiter on | Defeats |
| --- | --- | --- |
| Per-IP (baseline) | source IP, sliding window in Redis | Single-source brute force only |
| Per-account / per-API-key | authenticated identity, not network identity | Multi-IP rotation against one account |
| Device fingerprint | TLS JA3 hash, canvas/WebGL fingerprint, header entropy | New-account-per-request farms |
| Behavioral / velocity | request shape, mouse/keystroke timing, time-of-day deviation | Scripted traffic mimicking legitimate IPs |
| Global endpoint budget | total RPS across all keys for a sensitive endpoint (e.g. /login, /reset-password) | Low-and-slow distributed attacks under every per-key threshold |
| Network reputation | ASN, datacenter-vs-residential classification, known proxy/Tor exit lists | Cheap cloud-IP rotation (most botnets rent from a handful of ASNs) |
| Proof-of-work / CAPTCHA escalation | triggered only when the above layers raise risk score | Raises attacker cost without friction for legitimate users |

The architectural point to make explicit in an interview: rate limiting is not one control, it is a **risk-scoring pipeline** with multiple independent signals, because any single signal (IP, in particular) is something the attacker can manufacture in bulk for near-zero marginal cost. The global endpoint budget is the layer most teams skip and the one that actually caps blast radius — even if every per-key check passes, a circuit breaker on total RPS to `/login` prevents 10,000 distinct "legitimate-looking" keys from collectively taking the service down or exhausting a downstream dependency (e.g., the auth DB).

Engineering trade-off worth naming: behavioral/fingerprint signals reduce false negatives but increase false positives against legitimate users on shared NAT (corporate networks, mobile carriers) — tune thresholds asymmetrically (stricter on write/auth endpoints, looser on read endpoints) rather than applying one global policy.

# 7. Secrets Management

Hardcoded secrets in source code or environment variables are the #1 cause of credential leaks. Production-grade secrets management:

- HashiCorp Vault: Dynamic secrets (per-request DB credentials with TTL), PKI engine for cert issuance, AppRole or Kubernetes Auth for service identity.
- AWS Secrets Manager / GCP Secret Manager: Managed rotation, automatic cross-account replication, IAM-based access control.
- Kubernetes Secrets: Encrypted at rest with KMS (envelope encryption). Mounted as volumes, not env vars (avoid /proc/*/environ exposure).
- Secret scanning: Git pre-commit hooks (detect-secrets, truffleHog) + CI pipeline secret scanning. Rotate immediately on detection.

**8. Theoretical Frameworks — Interview Talking Points**

## CAP Theorem Applied to Security Infrastructure

Authentication and authorization services are CP systems — they must be consistent (a revoked token must be revoked everywhere) and partition-tolerant. Availability is sacrificed in the rare case of auth service partition:

- Implication: If the token introspection endpoint is unavailable, fail closed (deny the request) rather than fail open (allow). Availability is sacrificed for consistency.
- Mitigation: Short-lived JWTs with embedded claims reduce dependency on the introspection endpoint. The trade-off: revocation propagation delay = token TTL.
- Interview insight: The tension between 'fail closed = security' and 'fail open = availability' is a CAP trade-off. State your stance and justify it based on the security classification of the resource.

## PACELC and Latency vs Consistency in Auth

Under normal operation (no partition), adding security layers imposes latency:

- Each JWT validation: ~1ms (public key cache hit). First call: ~50ms (JWKS endpoint fetch).
- OPA policy evaluation: 1-5