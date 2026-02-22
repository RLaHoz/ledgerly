## Summary
- What changed and why?

## DoD Checklist (required)
- [ ] `frontend`: lint/typecheck/tests/build pass
- [ ] `backend`: lint/typecheck/tests pass (e2e for critical routes if applicable)
- [ ] Standalone only (no NgModules added)
- [ ] SignalStore used correctly (no duplicated state)
- [ ] No heavy template logic, trackBy added where needed
- [ ] No memory leaks (async pipe / takeUntilDestroyed)
- [ ] Styling respects framework used in repo (Tailwind if present, otherwise existing utilities)
- [ ] Edge cases handled (loading/empty/error)
- [ ] Security: no sensitive logs, strict validation on backend

## Screenshots (UI changes)
- Before:
- After:

## Notes / Risks
- Tradeoffs:
- Follow-ups: