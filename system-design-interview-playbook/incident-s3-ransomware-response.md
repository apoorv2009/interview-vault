# Your CTO calls at 3 AM. Your entire S3 bucket just got encrypted. Ransom note in metadata. First 15 minutes?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Do NOT start recovering data yet. The attacker may still have access — restoring now means they re-encrypt your restored data. The first 15 minutes are: stop the bleeding, lock them out, preserve evidence. Recovery comes after.

- T+0 — Do not pay, do not touch the bucket: Payment is a CISO + Legal decision. Never made in the first 15 minutes. Open an incident Slack channel. Page security, CISO, Legal.
- T+1 — Find and kill the compromised credential: The attacker used an AWS access key to encrypt your files. That key is still active. Find it in CloudTrail (AWS logs) and immediately deactivate it. Do not delete — preserve it as evidence.
- T+3 — Lock the bucket: Apply an emergency policy to the S3 bucket that DENIES all PutObject and DeleteObject calls from everyone. This stops any ongoing encryption, even if the attacker has other keys you haven't found yet.
- T+5 — Check if recovery is possible: Was S3 Versioning turned on? If YES: every original file still exists as a previous version — the attacker just wrote new encrypted files ON TOP of the originals. You can restore everything. If NO + no backups: bad situation.
- T+8 — Preserve evidence BEFORE touching anything: Export CloudTrail logs. Save the list of object versions. Do this BEFORE any cleanup — you need this for forensics, insurance, and to understand how they got in.
- T+10 — Scope the attack: Check if other S3 buckets, RDS databases, EC2 instances, or Secrets Manager were also accessed. One compromised key often means more damage than you first see.
- T+15 — Only NOW start recovery: All of the above must be done first. Only after the attacker is locked out do you start restoring data.
- Most impactful prevention: S3 Versioning + MFA Delete. With these on, ransomware becomes a 2-hour cleanup instead of a potential catastrophe. Turn these on TODAY for every important bucket.

**DEEP DIVE — Technical Architecture Below**

## Recovery Decision Tree

| S3 Versioning Status | Recovery Path |
| --- | --- |
| Versioning ON + MFA Delete ON ✓✓ | Best case. Attacker couldn't delete version history. Restore from previous versions. 2-hour cleanup. |
| Versioning ON ✓ | Original versions exist. Bulk restore by copying old versionId over current. ~2–4 hours. |
| Versioning OFF + AWS Backup exists | Restore from last backup snapshot. Assess data loss since last backup (RPO). |
| Versioning OFF + Cross-Region Replica | Check if replication happened before the attack. May be able to restore from replica. |
| Versioning OFF + No backup | May be unrecoverable without paying. Engage incident response firm. Hard lesson. |

## T+1: Finding the Compromised Credential

```
# AWS CloudTrail: who encrypted the files?
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutObject \
  --start-time "2024-01-15T02:00:00Z"
  | jq '.Events[].CloudTrailEvent' | jq '.userIdentity.accessKeyId'
```

```
# Output: AKIAIOSFODNN7EXAMPLE  ← this is the attacker's key
```

```
# Immediately deactivate (not delete - preserve for forensics)
aws iam update-access-key --access-key-id AKIA... --status Inactive
```

## T+3: Emergency Bucket Lockdown

```
aws s3api put-bucket-policy --bucket your-bucket --policy '{
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": ["s3:PutObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::your-bucket/*"
  }]
}'
# This blocks ALL writes to the bucket immediately
```

## Prevention — What Should Have Been in Place

```
  Most impactful controls (implement these NOW):
```

```
  1. S3 Versioning + MFA Delete ON
     → Ransomware becomes recoverable instead of catastrophic
```

```
  2. Least-privilege IAM
     → CI/CD key should NOT have s3:PutObject on prod data bucket
```

```
  3. AWS GuardDuty S3 Protection
     → Detects anomalous mass PutObject BEFORE bucket is fully encrypted
```

```
  4. Cross-account backup bucket
     → Separate AWS account = attacker with YOUR keys cannot reach it
```

## Theoretical Framework — Interview Talking Points

- Defense in Depth: The attack succeeded because of a single point of failure: one compromised key with overly broad permissions + no versioning. Correct architecture has no single exploitable path: even with valid credentials, MFA Delete requires a second factor; Object Lock prevents overwrite regardless of credentials; cross-account backup is inaccessible from the compromised account.
- Write Amplification (Versioning Cost): S3 versioning multiplies storage: every PutObject stores a new version alongside all previous ones. An attacker encrypting 10,000 objects doubles your storage (10,000 encrypted + 10,000 originals). This write amplification IS the recovery mechanism — the attacker's writes are stored ALONGSIDE yours, not INSTEAD OF them.
- CAP Theorem: S3 Object Lock in Compliance mode is CP: under any conditions (even with valid admin credentials), writes that violate the retention period are rejected. This trades marginal write latency (lock policy check) for ironclad data immutability. An explicit, correct P+ELC choice for compliance data.
