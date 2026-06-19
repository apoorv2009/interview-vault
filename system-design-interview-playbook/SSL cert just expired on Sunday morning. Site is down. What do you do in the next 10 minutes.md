# SSL cert just expired on Sunday morning. Site is down. What do you do in the next 10 minutes?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Don't panic. Verify the problem, tell your team, then fix it. The order matters — jumping straight to fixing without understanding the scope can make things worse.

- What is an SSL cert: It's like a digital ID card that proves your website is who it claims to be. Browsers refuse to connect to sites with expired ID cards — that's the black "Not Secure" error users see.
- T+0 — Confirm it's really the cert: Before touching anything, verify. SSL expiry looks like DNS failure or a bad deployment. Run: openssl s_client -connect yourdomain.com:443 and read the dates.
- T+1 — Announce the incident: Open a Slack incident channel. Page the team. Even if you are alone, write it down. This creates an audit trail and prevents two people from making conflicting changes.
- T+2 — Buy time if possible: If HTTP (non-secure) is tolerable for 10 mins for your service, temporarily disable the HTTPS redirect so users can at least access the site. Skip this for banking/payments.
- T+3 — Renew the cert: Let's Encrypt: run certbot renew. AWS ACM: check DNS validation record in Route53. Cloudflare: their edge cert covers you automatically even if origin expired.
- T+7 — Deploy and verify: Reload nginx/Apache, then test from outside your network using curl -vI https://yourdomain.com.
- T+10 — Restore HTTPS and monitor: Re-enable the HTTPS redirect. Watch your monitoring dashboard go green. Schedule a post-mortem.
- Bigger lesson: This should NEVER happen. Use AWS ACM or Let's Encrypt — both auto-renew for free. Set alerts at 60, 30, 14, and 7 days before expiry.

**DEEP DIVE — Technical Architecture Below**

## Renewal Paths Comparison

| Cert Provider | How to Fix | Time |
| --- | --- | --- |
| Let's Encrypt | sudo certbot renew --force-renewal && sudo nginx -s reload | < 1 min |
| AWS ACM | Check DNS CNAME validation record in Route53. ACM auto-renews if present. | 1–5 min |
| Cloudflare | Edge cert stays valid regardless of origin. Temporarily switch SSL mode to "Full". | Immediate |
| CA-issued (DigiCert etc.) | Hardest on Sunday. Generate CSR → wait for CA. Use Cloudflare as emergency mitigation. | 15 min – hours |

## Prevention Architecture

```
  Correct setup — certs should NEVER expire:
```

```
  ┌──────────────────────────────────────────────────┐
  │  AWS ACM / Let's Encrypt   → auto-renews, free   │
  │  Cloudflare edge cert      → never expires       │
  │  Alert at 60d/30d/14d/7d   → multiple warnings   │
  │  Lambda cert-checker cron  → daily external scan │
  └──────────────────────────────────────────────────┘
```

## Theoretical Framework — Interview Talking Points

- Availability (CAP): SSL expiry is a total availability failure. Prevention must treat cert renewal as a hard SLA. Managed services (ACM, Cloudflare) encode this as infrastructure-level guarantees, removing humans from the critical path.
- Execution Trade-off: Cert renewal must be async and automated. The failure mode here is a manual process. Remove humans from the hot path entirely.
