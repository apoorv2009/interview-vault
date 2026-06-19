# A passenger swipes their card on a flight with no internet and the bank cannot be contacted. How do you approve the payment without a balance check and prevent fraud in an offline payment system?

**SIMPLE EXPLANATION — Read This First**

Short Answer: You can't verify the balance, so you don't try to — instead you approve against a pre-computed, conservative risk budget stored locally on the terminal, log the transaction with a cryptographically signed record, and reconcile against the real bank ledger the moment connectivity returns. This is the same problem EMV chip cards solve for "offline data authentication," applied at the system level: shift from real-time verification to bounded-risk approval plus eventual settlement.

- The core insight: This isn't a payments problem, it's a CAP theorem problem wearing a payments costume. You have a network partition (no internet) and must choose availability (approve the sale) over consistency (confirming real-time balance) — because refusing every offline sale is commercially unacceptable (failing the entire onboard service for every flight without satellite connectivity), and you can bound the downside risk instead.
- Offline risk budget, not "no check": The terminal isn't approving blindly — it enforces an offline floor limit (e.g., max $50 per offline transaction) and a cumulative offline exposure cap per card (track how many offline approvals this card has received since its last online check-in, decline beyond a velocity threshold). This is exactly how EMV chip terminals work today: every chip has an offline counter the terminal reads and compares against issuer-set limits baked into the card itself.
- Cryptographic commitment instead of a live check: The terminal generates a signed transaction record (card data + amount + timestamp + terminal ID, signed with the terminal's private key or via the EMV cryptogram on the card) — this is non-repudiable proof the transaction happened, preventing the merchant (airline) from disputing it later and giving the bank an auditable trail once reconciled.
- Reconciliation on reconnect: The moment the plane lands or gets satellite uplink, every queued offline transaction is batch-submitted to the bank/processor. This is where the actual balance check and fraud scoring finally happen — if a card is declined at this stage (insufficient funds, stolen card, fraud flag), the airline eats the loss for that one transaction, which is why the offline floor limit exists: it caps the airline's maximum exposure per card to a number they've decided is an acceptable cost of doing business.
- Fraud prevention without connectivity: Card-present cryptographic verification (EMV chip signature, not just magstripe) proves the physical card was present — the highest-value fraud control available offline, because it doesn't require a network call at all, only local verification of a signature the bank pre-provisioned onto the chip.

**DEEP DIVE — Technical Architecture Below**

## System Flow: Offline Approval → Online Reconciliation

```
┌──────────────────────────────────────────────────────────────────┐
│  IN-FLIGHT (no connectivity)                                       │
│                                                                       │
│  Card swipe/dip ──► Terminal verifies EMV cryptogram (offline)      │
│         │            against card's embedded issuer-signed data      │
│         ▼                                                            │
│  Check local risk budget:                                            │
│    - amount <= offline floor limit?                                  │
│    - card's offline-approval-count since last online check < N?      │
│    - card not on locally-cached hot-list (recently reported lost)?   │
│         │                                                             │
│         ▼ PASS                                                       │
│  Approve. Write signed transaction record to local durable log       │
│  (append-only, terminal-signed, includes card token + amount +       │
│  timestamp + monotonic counter to prevent replay)                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ aircraft lands / satellite link up
┌──────────────────────────────▼──────────────────────────────────┐
│  RECONCILIATION (connectivity restored)                            │
│                                                                       │
│  Batch-submit all queued offline transactions to acquirer/bank       │
│         │                                                             │
│         ▼                                                            │
│  Real balance check + real fraud scoring happens HERE, for the       │
│  first time, after the fact                                          │
│         │                                                             │
│    ┌────┴─────┐                                                      │
│    ▼          ▼                                                      │
│  Approved   Declined (insufficient funds / stolen card / fraud)      │
│  (normal)   → airline absorbs the loss for this one transaction      │
│             → card flagged; future offline approvals for this        │
│               card token tightened or blocked at next online sync    │
└──────────────────────────────────────────────────────────────────┘
```

## Risk Budget Design — The Key Parameters

| Parameter | Purpose | Typical approach |
| --- | --- | --- |
| Offline floor limit | Caps single-transaction exposure | Set per card scheme/issuer risk appetite, often $25–$100 |
| Cumulative offline counter | Caps total exposure per card across multiple offline approvals before forced online check | EMV's native "Lower/Upper Consecutive Offline Limit" mechanism |
| Velocity check | Detects abuse pattern even without balance data | e.g., 3+ offline approvals on the same card token within one flight = decline 4th |
| Local hot-list cache | Catches known-bad cards without a live call | Terminal syncs a Compromised/Lost card list whenever it last had connectivity; inherently stale, accepted trade-off |
| Cryptogram verification | Proves card authenticity offline | EMV chip's offline data authentication (CDA/SDA/DDA) — verified entirely against data on the card, no network needed |

## Why This Is a Distributed Systems Problem, Not a Payments-Specific One

```
Generic AP-under-partition pattern:        Applied here:
  - Bound the blast radius of being         - Offline floor limit + cumulative
    wrong while partitioned                   counter cap maximum loss per card
  - Use a durable local write-ahead log     - Signed offline transaction log,
    so nothing is lost when reconnecting      replayed to the bank on reconnect
  - Reconcile and resolve conflicts when    - Real balance/fraud check happens
    connectivity returns                      at reconciliation; declines are
                                                handled as after-the-fact losses,
                                                not blocked transactions
```

## Theoretical Framework — Interview Talking Points

- **CAP Theorem**: This is the textbook AP choice under partition. The aircraft network partition is real and unavoidable mid-flight; the system explicitly sacrifices consistency (no live balance truth) to preserve availability (the sale completes), bounding the downside with a pre-agreed risk budget rather than pretending consistency is still achievable.
- **PACELC**: Even when connectivity *is* available (ELC branch), there's a latency-vs-consistency choice: do you wait for a full online authorization round-trip (higher latency, fully consistent) or use the same offline-floor-limit logic for small amounts even when online, to keep checkout fast? Many real terminals use offline approval for small amounts even with connectivity present, purely for latency — this is the PACELC "L" being chosen over "C" even absent a partition.
- **Write Amplification**: The local durable log of offline transactions plus the eventual batch reconciliation against the bank's ledger is a deliberate two-phase write — write once locally (fast, no network), write again to the bank later (the "real" durable write). This is structurally identical to write-ahead logging in databases: the WAL entry is the fast local commit, the eventual flush to the canonical store is the amplified second write, and the gap between them is your consistency window.
- **Read/Write Trade-off**: Approving offline means skipping the read entirely (no balance check) — explicitly accepting the absence of a read in favor of write availability. This is the most aggressive end of the read/write trade-off spectrum: a system normally read-heavy for verification purposes is forced into write-only operation under partition, and the design must compensate with bounded risk rather than data.
- **Execution Trade-offs**: Reconciliation is asynchronous by necessity (batch submission after reconnect) — but it must be designed with idempotency (each offline transaction has a unique terminal-generated ID) so re-submitting the batch after a partial failure during reconciliation doesn't double-charge the cardholder. This connects directly back to the idempotency-key pattern used for duplicate-write prevention in any distributed write path.
