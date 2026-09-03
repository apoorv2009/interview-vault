# Agentic AI System Design Interview Guide

## Your AI agent fixed a production issue but the fix increased the blast radius. How would you prevent that safely?

**SIMPLE EXPLANATION — Read This First**

Short Answer: An AI agent fixing production issues without safety guardrails is a runaway process waiting to happen. Prevent blast radius escalation by: (1) **limiting agent permissions** (agent can only read logs, not modify infrastructure), (2) **requiring human approval** before any infrastructure change (no auto-deployment), (3) **testing in staging first** (agent proposes fix, you run it in staging, measure blast radius before prod), (4) **canary deployment** (if approved, roll out to 5% of traffic first, monitor for 30 min, then 100%), (5) **automatic rollback triggers** (if error rate spikes >10%, rollback immediately), and (6) **agent reasoning transparency** (log why the agent chose this fix, so you can audit the decision).

**Why It's Dangerous:**
- An AI agent with sudo access is like giving a junior engineer write access to production without code review
- Agents optimize for the immediate goal ("fix the error"), not for system-wide consequences
- Example: Agent sees "database query slow" → agent adds index → index causes INSERT performance to drop 50% → cascading failures in write-heavy services

**Production Safeguards (Blast Radius Prevention):**

1. **Permission Model: Principle of Least Privilege**
   ```
   ❌ WRONG: Agent has AWS IAM admin role
     → Agent can: terminate instances, delete databases, change security groups
     → One bad decision = full data center outage
   
   ✅ RIGHT: Agent has read-only permissions + approval queue
     - Agent can: read logs, query metrics, simulate fixes (dry-run)
     - Agent CANNOT: deploy, scale, modify configs without human approval
     - All writes go to approval queue for 5-min human review before execution
   ```

2. **Staged Rollout: Blast Radius Containment**
   ```
   Agent detects issue: "API latency +300ms"
   Agent proposes fix: "Add caching layer"
   
   Stage 1 — Staging Environment (agent-owned):
     - Deploy fix to staging
     - Run synthetic traffic (not real users)
     - Monitor for 15 minutes
     - Measure: latency, error rate, CPU, memory
     - If anything degrades: STOP, agent asks human for different fix
   
   Stage 2 — Canary (5% of prod traffic, human approved):
     - Human reviews: "Agent says add caching. Cost: $500/month. Risk: medium."
     - Human approves: "OK, roll out to 5%"
     - Monitor real user traffic for 30 minutes
     - Metrics: latency improvement, error rate stable, no new exceptions
     - If metrics good: continue to 100%
     - If anything wrong: auto-rollback, page on-call engineer
   
   Stage 3 — Full Rollout (if canary succeeds):
     - Deploy to 100% over 5 minutes
     - Alert fatigue avoided: if 5% didn't break, 100% unlikely to
   ```

3. **Automatic Rollback Triggers (Circuit Breaker)**
   ```
   Metrics Monitored in Real-Time:
     - Error rate: if > 5% for >1 min → rollback
     - P99 latency: if > 2x baseline for >2 min → rollback
     - CPU usage: if > 85% for >3 min → rollback
     - Memory pressure: if OOM events → rollback
     - Database connections: if pool exhausted → rollback
   
   Rollback Action (automatic, no human approval needed):
     - Revert configuration/code to previous known-good version
     - Notify on-call: "Agent's fix triggered rollback. Reason: [metric]. Previous version restored."
     - Quarantine the agent's fix for review
   ```

4. **Agent Reasoning Transparency: Audit Trail**
   ```
   Agent logs every decision:
   
   {
     "incident_id": "INC-20260903-12345",
     "detected_issue": {
       "symptom": "API latency p99 = 5s (baseline 200ms)",
       "root_cause_hypothesis": "Database query N+1 problem",
       "confidence": 0.78
     },
     "proposed_fix": {
       "type": "add_database_index",
       "table": "users",
       "columns": ["created_at", "status"],
       "estimated_impact": "+1% query latency improvement, +0.5GB storage",
       "estimated_blast_radius": "low - index is read-only, no impact on writes"
     },
     "blast_radius_analysis": {
       "write_performance": "no impact (index only on reads)",
       "storage_cost": "+$5/month",
       "query_latency": "expected -15% for filtered queries",
       "risk_level": "low"
     },
     "approvals": {
       "human_approved": true,
       "approved_by": "alice@company.com",
       "approved_at": "2026-09-03T14:30:00Z",
       "approval_comment": "Looks good. Index makes sense for this query pattern."
     },
     "execution": {
       "stage": "canary_5_percent",
       "started_at": "2026-09-03T14:31:00Z",
       "status": "success",
       "metrics_before": { "p99_latency": 5000, "error_rate": 0.02 },
       "metrics_after": { "p99_latency": 800, "error_rate": 0.01 },
       "blast_radius_actual": "none - improvement confirmed"
     }
   }
   
   Human can audit: "Why did the agent choose to add an index instead of query caching?"
   Answer: "Agent analyzed query patterns, found N+1 in most common query path,
            determined index < caching in terms of complexity and cost."
   ```

5. **Agent Authority Tiers (Role-Based)**
   ```
   Tier 1 — Read-only (diagnostic agent):
     - Can: read logs, query metrics, analyze error traces
     - Cannot: deploy, scale, modify anything
     - Approval needed: none
     - Use case: debugging, root cause analysis
   
   Tier 2 — Config changes (low-risk modifications):
     - Can: adjust timeouts, toggle feature flags, modify log levels
     - Cannot: scale infrastructure, delete resources, change security
     - Approval needed: single human sign-off (5 min)
     - Blast radius: bounded (config changes don't delete data)
   
   Tier 3 — Infrastructure changes (high-risk):
     - Can: add database indices, create caches, modify networking
     - Cannot: terminate instances, delete databases, change IAM
     - Approval needed: tech lead + on-call engineer
     - Blast radius: requires canary + monitoring
   
   Tier 4 — Destructive operations (nuclear):
     - Can: none (disabled by default)
     - Only enabled if explicitly approved + time-limited window
     - Blast radius: catastrophic
   ```

---

## How do you prevent an AI agent from hallucinating in a multi-step decision tree?

**SIMPLE EXPLANATION — Read This First**

Short Answer: Multi-step reasoning agents hallucinate by: (1) making up facts at intermediate steps ("I know the database has a users_cache table" when it doesn't), or (2) forgetting constraints from earlier steps. Prevent it by:
- **Grounding every step in real data**: Before taking action, agent queries actual state (run `SELECT * FROM information_schema.tables` to check if table exists, don't assume)
- **Explicit state tracking**: At each step, agent records "what I know for sure" vs "what I'm assuming"
- **Constraint checking**: Before step N, agent explicitly verifies all constraints from step N-1 still hold
- **Rollback on inconsistency**: If agent's assumption contradicts reality mid-execution, stop and ask human

**Example Hallucination in Multi-Step Agent:**

```
❌ WRONG: Hallucinating intermediate facts

Step 1: User asks: "Migrate all customer data to a new database"
Agent thinks:
  "I'll export from old DB → transform → import to new DB"

Step 2 (Agent assumes): "Old database has schema [X, Y, Z] with customer_id as primary key"
  (Agent never checked; schema is actually [A, B, C] with id as primary key)

Step 3 (Agent acts): Creates transformation script based on [X, Y, Z] schema
  (Script fails because actual columns are [A, B, C])

Step 4 (Agent hallucinates recovery): "I'll create the missing columns"
  (Creates wrong columns, data corruption)

✅ RIGHT: Ground every step in reality

Step 1: User asks: "Migrate all customer data to a new database"
Agent thinks:
  "I need to: (1) verify source schema, (2) verify destination exists, 
   (3) write transformation, (4) test on sample, (5) execute"

Step 2 (Agent queries reality): Run: "SELECT * FROM information_schema.COLUMNS WHERE TABLE_NAME='customers'"
  Result: columns are [id, email, name, created_at] (not [X, Y, Z])
  Agent updates its knowledge: "Source schema confirmed: [id, email, name, created_at]"

Step 3 (Agent verifies constraint): Checks: "Does destination database exist?"
  Query: "USE new_database; SELECT 1"
  Result: YES
  Agent logs: "Destination database verified"

Step 4 (Agent writes transformation): Based on CONFIRMED schema [id, email, name, created_at]
  Script created with correct columns

Step 5 (Agent tests): Runs transformation on 10 sample rows
  Result: 10 rows successfully transformed, no errors
  Agent: "Test passed. Safe to proceed to full migration."

Step 6 (Agent executes with human approval):
  Human reviews transformation logic
  Human approves
  Agent executes on full dataset
  All rows transformed correctly
```

**Implementation Pattern: Grounded Multi-Step Agent**

```python
class GroundedMultiStepAgent:
    def __init__(self, db_connection, llm):
        self.db = db_connection
        self.llm = llm
        self.execution_log = []
    
    def execute_plan(self, user_request):
        """
        Multi-step plan with reality-grounding at each step.
        """
        
        # Step 1: Plan (LLM generates high-level steps)
        plan = self.llm.generate_plan(user_request)
        # Example plan:
        # [
        #   {"step": 1, "action": "verify_source_schema", "params": {"table": "customers"}},
        #   {"step": 2, "action": "verify_destination", "params": {"database": "new_db"}},
        #   {"step": 3, "action": "transform_data", "params": {"...": "..."}},
        #   {"step": 4, "action": "validate_result", "params": {"...": "..."}}
        # ]
        
        # Step 2: Ground each step before execution
        known_facts = {}  # Track "what we know for sure"
        
        for step_info in plan:
            step_num = step_info["step"]
            action = step_info["action"]
            
            try:
                if action == "verify_source_schema":
                    # Query database, don't assume
                    schema = self.db.get_table_schema(step_info["params"]["table"])
                    known_facts[f"source_schema_step_{step_num}"] = schema
                    self.execution_log.append({
                        "step": step_num,
                        "action": action,
                        "result": "success",
                        "discovered_fact": f"Schema: {schema}"
                    })
                
                elif action == "verify_destination":
                    # Query destination, don't assume
                    exists = self.db.database_exists(step_info["params"]["database"])
                    if not exists:
                        raise Exception(f"Destination database {step_info['params']['database']} does not exist")
                    known_facts[f"destination_exists_step_{step_num}"] = True
                    self.execution_log.append({
                        "step": step_num,
                        "action": action,
                        "result": "success",
                        "verified": "destination database exists"
                    })
                
                elif action == "transform_data":
                    # Before transforming, verify schema from Step 1 still true
                    source_schema = known_facts.get("source_schema_step_1")
                    if not source_schema:
                        raise Exception("Source schema not verified. Cannot proceed.")
                    
                    # Generate transformation based on VERIFIED schema, not assumption
                    transform_script = self.generate_transform_script(source_schema)
                    known_facts[f"transform_script_step_{step_num}"] = transform_script
                    self.execution_log.append({
                        "step": step_num,
                        "action": action,
                        "result": "generated",
                        "script_based_on_verified_schema": source_schema
                    })
                
                elif action == "validate_result":
                    # Test on sample before full execution
                    sample_result = self.test_transform_on_sample(known_facts[f"transform_script_step_{step_num-1}"])
                    if sample_result["errors"] > 0:
                        raise Exception(f"Validation failed: {sample_result['errors']} errors on sample")
                    known_facts[f"validation_passed_step_{step_num}"] = True
                    self.execution_log.append({
                        "step": step_num,
                        "action": action,
                        "result": "success",
                        "sample_rows_tested": sample_result["rows_tested"],
                        "errors": 0
                    })
            
            except Exception as e:
                # If any step fails, halt and report
                self.execution_log.append({
                    "step": step_num,
                    "action": action,
                    "result": "failed",
                    "error": str(e),
                    "known_facts_at_failure": known_facts
                })
                
                # Ask human for help
                recovery = self.ask_human(
                    f"Step {step_num} failed: {e}\n"
                    f"Known facts: {known_facts}\n"
                    f"What should I do?"
                )
                
                if recovery == "rollback":
                    return {"status": "rolled_back", "log": self.execution_log}
                elif recovery == "retry_step":
                    # Agent re-attempts step with different approach
                    continue
                else:
                    return {"status": "halted_by_user", "log": self.execution_log}
        
        # All steps succeeded
        return {
            "status": "success",
            "known_facts": known_facts,
            "execution_log": self.execution_log
        }
    
    def ask_human(self, context_str):
        """
        Halt and ask human for decision.
        """
        print(f"\n[AGENT HALTED]\n{context_str}")
        # In production: create a ticket, page on-call, await response
        return input("User decision: ").strip()
```

**Hallucination Detection in Practice:**

```
Agent's Claim: "Table X has column Y"
Reality Check: Query information_schema
  Result: Column Y doesn't exist
Action: STOP. Log discrepancy. Ask human: "I expected column Y, but it doesn't exist. Proceed differently or abort?"

Agent's Claim: "I can join Table A and Table B on user_id"
Reality Check: Verify primary/foreign keys
  SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_NAME IN ('A', 'B') AND COLUMN_NAME = 'user_id'
Result: No foreign key defined
Action: WARN. Allow join with caution (full cross join risk) or require explicit approval.
```

---

## How do you design guardrails for an AI agent in production?

**SIMPLE EXPLANATION — Read This First**

Guardrails are boundaries and safety checks that keep an AI agent from doing harmful things. Think of them as "if the agent tries to do X, block it or ask a human first."

**Four Layers of Guardrails:**

1. **Instruction-level** (in the prompt)
   - "You can read logs but cannot delete databases"
   - "You must ask human approval before deploying to production"
   - Weakest guardrail (easily overridden by clever reasoning)

2. **Permission-level** (enforced by infrastructure)
   - Agent runs with limited IAM role: `ListLogs`, `DescribeInstances` only
   - Even if agent wants to delete a database, API call fails with 403 Forbidden
   - Stronger guardrail (agent can't bypass)

3. **Semantic-level** (monitored by observer)
   - Before agent executes any action, an observer LLM checks: "Is this action reasonable?"
   - Example: Agent plans "create 1000 new database replicas". Observer says "BLOCKED: creating 1000 replicas costs $100K and is unreasonable."
   - Medium strength (human can override if needed)

4. **Operational-level** (monitored by systems)
   - Automatic rollback if metrics degrade (error rate spikes, latency increases, etc.)
   - Rate limiting: agent can't execute more than 10 actions per minute
   - Canary deployment: changes go to 5% of traffic first
   - Strongest guardrail (automatic, no human intervention needed)

**Production Guardrails Implementation:**

```yaml
# Guardrails Configuration

instruction_guardrails:
  - "You can only read from these sources: production logs, metrics, error traces"
  - "You cannot deploy code directly; you can only propose fixes"
  - "If blast radius > high, you must ask for human approval"
  - "You must test in staging before proposing production changes"

permission_guardrails:
  # IAM role for agent
  aws_iam_role: "arn:aws:iam::ACCOUNT:role/ai-agent-production"
  permissions:
    - "logs:GetLogEvents"
    - "cloudwatch:GetMetricStatistics"
    - "rds:DescribeDBInstances"
  denied_permissions:
    - "ec2:TerminateInstances"
    - "rds:DeleteDBInstance"
    - "iam:AttachUserPolicy"

semantic_guardrails:
  observer_llm: "gpt-4-turbo"
  checks:
    - name: "Cost Impact"
      prompt: "Will this action cost more than $1000/month? If yes, block."
      block_if: "yes"
    
    - name: "Data Loss Risk"
      prompt: "Does this action risk deleting or corrupting data? If yes, block."
      block_if: "yes"
    
    - name: "Blast Radius"
      prompt: "How many users could be impacted by this change (1-100%)? If >20%, require approval."
      block_if: "> 20%"
    
    - name: "Reasonableness"
      prompt: "Does this action make sense given the detected issue? Rate: reasonable/questionable/absurd."
      block_if: "absurd"

operational_guardrails:
  rate_limits:
    actions_per_minute: 10
    deployments_per_hour: 5
    cost_per_day: "$500"
  
  canary_deployment:
    enabled: true
    stages:
      - percentage: 5
        duration_minutes: 30
        metrics: ["error_rate", "p99_latency", "cpu_usage"]
        rollback_threshold: { error_rate: 0.05, latency_p99: 2000 }
      
      - percentage: 25
        duration_minutes: 15
        metrics: ["error_rate", "p99_latency"]
        rollback_threshold: { error_rate: 0.03 }
      
      - percentage: 100
        duration_minutes: 5
        metrics: ["error_rate"]
  
  automatic_rollback:
    triggers:
      - metric: "error_rate"
        threshold: 5%
        duration: "1 minute"
        action: "rollback"
      
      - metric: "p99_latency"
        threshold: "2x baseline"
        duration: "2 minutes"
        action: "rollback"
      
      - metric: "memory_usage"
        threshold: 85%
        duration: "1 minute"
        action: "rollback"
  
  approval_workflow:
    required_for:
      - infrastructure_changes
      - code_deployments
      - config_modifications_above_threshold
    approval_time: "5 minutes max"
    approvers: ["on_call_engineer", "tech_lead"]

monitoring_guardrails:
  agent_action_log:
    logs_all: true
    retention: "90 days"
    alerts:
      - "too many failed attempts (>5 in 10 min)"
      - "unusual action pattern"
      - "permission denied (attempted escalation)"
  
  audit_trail:
    captures:
      - timestamp
      - action
      - parameters
      - approval_status
      - result
      - metrics_impact
    accessible_by: ["security_team", "devops", "incident_commander"]
```

**Guardrail Failure Handling:**

```
Agent attempts action:
  ├─ Permission guardrail check: Agent role has permission?
  │    ├─ NO → API call fails with 403 → Log attempt → Alert security team
  │    └─ YES → Proceed
  │
  ├─ Semantic guardrail check: Observer LLM validates reasonableness
  │    ├─ BLOCK → Log block reason → Ask human approval → If yes, unblock
  │    └─ ALLOW → Proceed
  │
  ├─ Operational guardrail check: Execute with monitoring
  │    ├─ Execute action
  │    └─ Monitor metrics for 5-30 seconds
  │
  ├─ Operational guardrail check: Rollback trigger?
  │    ├─ YES (metrics degrade) → Auto-rollback, alert on-call
  │    └─ NO → Action successful
  │
  └─ Audit trail: Log entire execution for review
```

---

## What's the difference between single-agent and multi-agent systems?

**SIMPLE EXPLANATION — Read This First**

| Aspect | Single Agent | Multi-Agent |
| --- | --- | --- |
| **What** | One LLM makes all decisions | Multiple specialized LLMs collaborate |
| **Example** | "Fix production outage" (one agent handles everything) | Agent 1 diagnoses (database team), Agent 2 proposes fix (performance team), Agent 3 deploys (devops team), Agent 4 validates (SRE team) |
| **Pros** | Simple, fast decisions, no coordination overhead | Better accuracy (specialists), handles complex problems, scales to different domains |
| **Cons** | Limited context, hallucination risk, bottleneck | Coordination complexity, latency (agents wait for each other), potential for agents to contradict |

**Single-Agent System:**
```
Input: "API is down, fix it"
Agent: Reads logs → determines root cause → proposes fix → deploys → validates
Output: "Fixed. Root cause was database connection pool exhaustion."
```

**Multi-Agent System:**
```
Input: "API is down, fix it"

Agent 1 (Diagnostician):
  - Reads metrics, logs, traces
  - Determines: "Database queries taking 30s (normal is 50ms)"
  - Proposes: "Database issue"
  - Passes to Agent 2

Agent 2 (Database Specialist):
  - Queries database metrics
  - Finds: "Connection pool at 95% capacity, 1000 queries queued"
  - Determines root cause: "Connection pool too small or slow queries"
  - Proposes fix: "Optimize slow queries OR increase pool size"
  - Passes to Agent 3

Agent 3 (Performance Engineer):
  - Analyzes slow queries
  - Finds: "N+1 SELECT problem in user endpoint"
  - Proposes: "Add missing database index"
  - Passes to Agent 4

Agent 4 (DevOps/Deployment Agent):
  - Creates database index in staging
  - Tests: latency improves 50x
  - Deploys to production (canary)
  - Monitors: no regression
  - Passes to Agent 5

Agent 5 (Validator/SRE):
  - Confirms: API latency back to normal
  - Verifies: no new errors, no data corruption
  - Closes incident

Output: "Fixed by optimizing slow queries (added database index on users.status). 
         Root cause: N+1 SELECT pattern. Prevention: code review for query patterns."
```

**Multi-Agent Coordination Patterns:**

1. **Sequential (pipeline)**
   - Agent 1 → Agent 2 → Agent 3 → Agent 4
   - Each agent depends on previous agent's output
   - Pro: clear dependencies
   - Con: slow (latency = sum of all agents)

2. **Parallel (fan-out)**
   - Agent 1 → (Agent 2, Agent 3, Agent 4 in parallel) → Agent 5
   - Multiple agents work simultaneously
   - Pro: faster
   - Con: coordination complexity (Agent 5 must reconcile conflicting outputs)

3. **Hierarchical (tree)**
   - Manager Agent decides which specialist to use
   - Example: "Is this a database issue?" → Route to Database Agent
             "Is this a network issue?" → Route to Network Agent
   - Pro: scalable
   - Con: manager must be smart enough to route correctly

**When to Use Multi-Agent:**
- Complex domains (incident response, system design, architecture)
- When specialists outperform generalists
- When domain knowledge is hard to encode (DevOps, SRE)
- When multiple perspectives improve accuracy

**When to Use Single-Agent:**
- Simple tasks (summarization, classification, straightforward bug fixes)
- Latency-sensitive (single agent is faster)
- Domain is well-defined and narrow

