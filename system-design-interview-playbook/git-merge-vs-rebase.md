# Your branch is 200 commits behind main. What will you do — merge or rebase?

**SIMPLE EXPLANATION — Read This First**

Short Answer: It depends on ONE key question — is this branch shared with other developers, or is it yours alone? If it's yours alone: rebase. If others are using it too: merge. Never rebase a shared branch.

- What does MERGE do: It creates a new "merge commit" that combines your changes with main. Your existing commits are untouched. History shows the branches merged at a point in time. Safe for everyone.
- What does REBASE do: It replays your commits one by one on top of the latest main. Result: a clean, straight line of history. BUT — every commit gets a new ID (SHA). Anyone else who has your branch will be confused because the commits they know have changed.
- The 200 commits behind part: 200 commits behind sounds scary but the number that matters is: how many files do YOU and MAIN both touch? That determines how many conflicts you'll face. Run a dry run first.
- Use REBASE when: Branch is yours alone. You want clean history. You have a few commits to replay. You're preparing a PR for review.
- Use MERGE when: Branch is shared with teammates. You need to record WHEN the integration happened. Too many conflicts to resolve per-commit. It's a long-lived release branch.
- NEVER use --force, use --force-with-lease: If you rebase and need to push: use --force-with-lease instead of --force. It refuses to overwrite if someone else has pushed since your last fetch.
- Cardinal rule: NEVER rebase a shared branch. Rebasing rewrites commit IDs. Everyone else on that branch will see their history diverge and will have to reset --hard. This causes chaos.

**DEEP DIVE — Technical Architecture Below**

## Visual: What Each Operation Does

```
Before:
  main:  A─B─C─D─E─F  (200 commits)
          \
  yours:  X─Y─Z  (your 3 commits, written weeks ago)
```

```
After MERGE:                          After REBASE:
  main:  A─B─C─D─E─F                   main:  A─B─C─D─E─F
          \            \                                    \
  yours:  X─Y─Z────────M                yours:              X'─Y'─Z'
  (M = merge commit, new SHAs on X/Y/Z = same)    (new SHAs, clean line)
```

|  | MERGE | REBASE |
| --- | --- | --- |
| History | Shows real branching — when things happened | Linear — clean story, like it was always one line |
| Your commit SHAs | Unchanged | All new SHAs |
| Conflicts | Resolve once in the merge commit | Resolve once per commit (potentially N times) |
| Safe for shared branches? | YES — always | NO — rewrites SHAs others depend on |
| git bisect friendly? | Noisier (merge commits) | Clean — every commit testable in isolation |

## The Recommended Workflow for Your Situation

```
# Step 1: Find out how bad the conflicts are (dry run)
git fetch origin
git merge --no-commit --no-ff origin/main
git diff --stat HEAD  # see which files conflict
git merge --abort     # undo the dry run
```

```
# Step 2a: If branch is YOURS ALONE — rebase
git rebase -i HEAD~3      # optional: squash your WIP commits first
git rebase origin/main
git push --force-with-lease origin your-branch
```

```
# Step 2b: If branch is SHARED — merge
git merge origin/main
git push origin your-branch
```

## Theoretical Framework — Interview Talking Points

- Write Amplification: Interactive rebase + squash is explicit write amplification: rewriting N WIP commits into 1 clean commit. Analogous to LSM-tree compaction — extra write I/O now pays off in read efficiency (cleaner git log, easier code review).
- CAP (Distributed VCS): Git is a distributed system with eventual consistency. Rebase is a consistency operation (linear, authoritative history). Merge is an availability operation (never blocks, always produces a valid result even with conflicts). Long-lived shared branches use merge for the same reason AP systems avoid locks.
