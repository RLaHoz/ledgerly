# Definition Of Done (Global)

## Code and Architecture
- Standalone Angular only (no NgModules)
- SignalStore patterns respected (single source of truth)
- No duplicated derived state
- No heavy business logic in templates
- Presentational components use `ChangeDetectionStrategy.OnPush`

## Quality Gates
- Frontend: `lint`, `typecheck`, `tests`, `build` pass
- Backend: `lint`, `typecheck`, `tests` pass (plus e2e for critical routes)
- No `any` without documented justification
- No memory leaks (use `async` pipe or managed cleanup)

## UX and Mobile
- iOS/Android parity validated for changed flows
- Safe area and navigation behavior verified
- Empty/loading/error states implemented
- Accessibility basics: labels, focus order, touch targets

## Security and Privacy
- No secrets in code/history/logs
- No sensitive financial data in unsafe logs
- Validation and error mapping aligned with standards

## Testing
Each feature includes:
- 1 happy path test
- 1 edge case test
- 1 error path test

## Documentation
- Feature behavior documented where needed
- Roadmap/backlog updated if scope changed
- PR checklist completed
