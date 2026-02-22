# DECISIONS.md — Architecture Decisions (ADR-lite)

## Repo layout
- Monolithic repo:
  - `/frontend`: Angular + Ionic app
  - `/backend`: NestJS API

## Frontend architecture
### Angular
- Standalone only (no NgModules).
- Prefer modern Angular patterns (signals, inject()) and avoid deprecated APIs.

### State management
- SignalStore is the standard for state.
- Keep stores small and focused:
  - global/core stores under `src/app/store/**`
  - feature-specific state under `src/app/features/<feature>/**` when needed
- Derived/computed values should be computed (not stored redundantly).

### Folder boundaries (import rules)
- `core/**`: foundational services (auth, interceptors, guards, layout shell, storage, sync)
  - can import from `shared/**`
  - must NOT depend on `features/**`
- `shared/**`: reusable UI + utilities + models/pipes
  - must NOT import from `features/**` nor `core/**` (except shared models if already centralized)
- `features/**`: feature code (dashboard, budget, history, rules, settings)
  - can import from `shared/**`, `core/**`, and `store/**`
- `store/**`: app-wide stores (layout/theme/etc.)
  - can import from `core/**` and `shared/**`
  - should avoid importing feature code

## Styling decision
- Use Tailwind if present in repo; otherwise use existing Ionic utilities + current SCSS structure.
- Avoid large custom CSS; prefer utilities, tokens, and small scoped styles.

## Performance baseline
- OnPush for presentational components.
- No heavy template logic.
- TrackBy required for lists.
- Avoid memory leaks (async pipe / takeUntilDestroyed).

## Backend decisions
- NestJS:
  - strict DTO validation and consistent error mapping
  - safe logging (no secrets, no PII, no tokens)
  - role-based access via guards for protected endpoints
- Queries must be efficient, with pagination where needed.

## Quality gates (must pass to merge)
- Frontend: lint + strict typecheck + tests + build
- Backend: lint + typecheck + tests (and e2e for critical routes)