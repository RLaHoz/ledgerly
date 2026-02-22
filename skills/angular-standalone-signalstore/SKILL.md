# Skill: Angular Feature Builder — Standalone + SignalStore

## Purpose
Create or refactor Angular code following this repo standards:
- Standalone only (no NgModules)
- SignalStore standard
- TS strict, clean architecture, minimal nesting, early returns
- Performance + maintainability first

## When to use
Use this skill when the task involves:
- Creating a new feature under `src/app/features/**`
- Refactoring components/services/stores
- Adding routes, forms, interceptors, guards
- Any non-trivial Angular work

## Inputs expected
- Feature name and goal (or user story)
- Any mockup/screenshot (if UI)
- Existing related files (if refactor)

## Workflow (must follow in order)

### 1) Clarify (max 3 questions)
If missing any of these, ask:
- Which feature folder? (`features/<name>`)
- Routing changes needed?
- Data source/API contract known?
- UI mockup exactness required?

### 2) Verify with Context7 MCP (mandatory)
Before coding, verify:
- Angular v20+ recommended APIs for the task
- SignalStore patterns for state updates/derived state
- RxJS lifecycle patterns (takeUntilDestroyed/async pipe)
- Typed reactive forms patterns (if forms)

### 3) Architecture & placement
Follow boundaries:
- `core/**`: foundational, no dependency on `features/**`
- `shared/**`: reusable UI/utils/models, no importing from features
- `features/**`: feature-specific code
- `store/**`: app-wide stores (layout/theme/etc.)

### 4) Implementation rules (non-negotiable)
- Standalone components only
- Presentational components use OnPush
- No heavy logic in templates
- Lists: `trackBy` where needed
- No `any`
- Extract complex logic to helpers (pure functions)
- Prefer O(n) or O(n log n); avoid unnecessary nested loops
- Handle edge cases: loading/empty/error/null/undefined

### 5) State rules (SignalStore)
- Single source of truth
- Prefer computed/selectors for derived values
- No duplicated derived state
- Actions should be small and intention-revealing

### 6) Output format (required)
Return:
1) Decisions (2–5 bullets)
2) File list changed/added (with paths)
3) Code (complete, compilable)
4) Tests: happy path + 1 edge + 1 error case (or explain why missing)
5) Perf/security notes (only relevant)

## Quality checklist (blockers)
- Any NgModule introduced → reject and fix
- Template includes complex expressions/logic → refactor to TS
- Missing cleanup for subscriptions → fix (async pipe / takeUntilDestroyed)
- Missing typing/DTOs/interfaces → add types
- CSS too large or ignores project styling approach → fix