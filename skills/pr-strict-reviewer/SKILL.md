# Skill: PR Strict Reviewer — Blockers/Majors/Minors + DoD Gate

## Purpose
Review a PR/diff with strict standards:
- Angular standalone only
- SignalStore correctness
- Performance, security, maintainability
- Architecture boundaries (core/shared/features/store)
- Tests & CI readiness

## When to use
Use this skill when:
- Reviewing a PR
- Reviewing a set of changed files
- Validating merge readiness

## Inputs expected
- PR description / goal
- Diff or list of changed files
- Any relevant screenshots (for UI changes)

## Review workflow

### 1) Restate intent
Summarize what the PR is trying to do in 2–4 lines.

### 2) Categorize findings
Report findings grouped by severity:
- **BLOCKER**: must fix before merge
- **MAJOR**: should fix before merge
- **MINOR**: can follow-up

### 3) Check DoD (required)
Fail the PR if any is missing:
- lint/typecheck/tests/build pass (or evidence)
- No NgModules introduced
- SignalStore used correctly (no duplicated derived state)
- No heavy template logic
- No memory leaks
- trackBy used where relevant
- Styling follows project approach (Tailwind-aware)
- Edge cases covered
- Security checks: no secrets, safe logging, strict validation (backend)

### 4) Provide actionable fixes
For each BLOCKER/MAJOR:
- Explain why it’s a problem (short)
- Suggest exact fix
- Provide small code snippet if useful

### 5) Final decision
End with:
- ✅ **Approve**
- ⚠️ **Approve with changes**
- ❌ **Request changes** (if any BLOCKER)

## Blocker rules (automatic fail)
- Added NgModule / AppModule
- Unsubscribed RxJS subscriptions
- Imports violating boundaries (shared -> feature, core -> feature, etc.)
- `any` introduced without justification
- Sensitive data logged / secrets committed
- UI changes without matching mockup (when mockup provided)