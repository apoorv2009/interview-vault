# JWT token exists but API still returns 401 Unauthorized. Why, and how do you debug it?

**SIMPLE EXPLANATION — Read This First**

Short Answer: The token exists but something about it is WRONG. A valid JWT must pass 4 checks in order: (1) is it formatted correctly, (2) is the signature valid, (3) are the time/issuer claims correct, (4) does the user have the required permissions. Failure at any step = 401.

- Most common reason #1 — Token expired: Every JWT has an "exp" (expiry) claim — a Unix timestamp. If current time > exp, the server rejects it. Decode your token and check: is the exp date in the past?
- Most common reason #2 — Wrong secret key: The JWT is signed with a secret. If the API server has a different secret than the auth server that created the token (e.g., dev config in production), the signature check fails.
- Most common reason #3 — Audience mismatch (aud): The token has an "aud" (audience) claim like "api.myapp.com". The server checks that this matches exactly. Even a trailing slash difference ("api.myapp.com" vs "api.myapp.com/") causes rejection.
- Most common reason #4 — Clock skew: The server's clock is ahead of the client's. A token that's valid on your laptop appears expired to the server.
- How to debug: Step 1: Decode the token (no verification needed): echo "eyJ..." | cut -d'.' -f2 | base64 -d. Read the exp, iss, and aud claims.
- How to debug: Step 2: Test with raw curl instead of your application: curl -H "Authorization: Bearer TOKEN" https://api/endpoint. This isolates app bugs from JWT bugs.
- How to debug: Step 3: Check server logs for the specific error — "ExpiredSignatureError", "InvalidAudienceError" etc. Most JWT libraries log the reason.

**DEEP DIVE — Technical Architecture Below**

## JWT Validation Pipeline — All 4 Gates

```
  Request arrives
      │
      ▼
  Gate 1: Token formatted correctly?
    Header.Payload.Signature — three parts, base64url encoded
      │ FAIL → 401 "Malformed token"
      ▼
  Gate 2: Signature valid?
    HMAC-SHA256(header.payload, secret) == signature?
      │ FAIL → 401 "Invalid signature" (wrong secret or tampered token)
      ▼
  Gate 3: Claims valid?
    exp > now?  (not expired)
    iss matches expected issuer?
    aud matches this service?
      │ FAIL → 401 "Invalid claims"
      ▼
  Gate 4: Authorized?
    Required role/scope in payload?
    Token in revocation blocklist?
      │ FAIL → 401 or 403
      ▼
  Request processed ✓
```

## All Root Causes — Ordered by Frequency

| Root Cause | How to Detect | Fix |
| --- | --- | --- |
| Token expired | Decode token: date -d @<exp> | Shorter TTL + refresh token flow |
| Wrong signing secret | InvalidSignatureError in logs | Ensure same secret in auth + API service |
| Audience (aud) mismatch | InvalidAudienceError in logs | Exact string match required — check trailing slashes |
| Issuer (iss) mismatch | InvalidIssuerError in logs | Exact string match required |
| Clock skew > 5 min | Token looks expired on server only | NTP sync; add leeway=30s to JWT decode |
| Wrong header format | Server receives null token | Must be "Authorization: Bearer <token>" |
| Token revoked | In Redis/DB blocklist | Check jti claim in blocklist |
| Wrong algorithm | Signature valid with wrong key type | Pin algorithm explicitly: algorithms=["RS256"] |
| Proxy stripping header | Server gets no Authorization header | Check ALB/nginx header forwarding config |

## Debugging Commands

```
# 1. Decode token (no verification)
echo "eyJhbGc..." | cut -d'.' -f2 | base64 -d | python3 -m json.tool
```

```
# 2. Check expiry
date -d @<exp_value_from_token>
```

```
# 3. Test with raw curl
curl -v -H "Authorization: Bearer $(cat token.txt)" https://api/endpoint
```

```
# 4. Check server logs
kubectl logs deployment/api | grep -E "jwt|401|Invalid" | tail -20
```

## Theoretical Framework — Interview Talking Points

- CAP Theorem (Token Revocation): Stateless JWT is AP: any server verifies without contacting a central authority. But revocation requires consistency. Short TTLs (accept eventual consistency — token expires soon) vs Redis blocklist (CP — adds latency but guarantees immediate revocation). Classic CAP trade-off mapped to a real product decision.
- PACELC: Under normal operation: pure stateless JWT gives minimum latency (no external call) but no revocation consistency. Adding Redis blocklist check adds ~1ms but guarantees immediate revocation. Pay the 1ms for security-critical tokens; skip it for low-risk short-lived tokens.
