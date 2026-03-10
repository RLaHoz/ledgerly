# Contributing to Ledgerly

Thanks for contributing.

## Prerequisites
- Node.js LTS
- npm
- Git

## Local Setup
```bash
# frontend
cd frontend
npm install
npm run typecheck
npm run test

# backend
cd ../backend
npm install
npm run test
```

## Branching Strategy
- `main`: stable releases
- `develop`: integration branch
- `feature/*`: new functionality
- `fix/*`: bug fixes

## Commit Convention
Use Conventional Commits.

Examples:
- `feat(history): add filtering by owner`
- `fix(budget): correct percentage calculation`
- `chore(ci): add frontend typecheck step`

## Pull Request Process
1. Create PR against `develop` unless release/hotfix requires another target.
2. Fill `.github/pull_request_template.md` fully.
3. Ensure quality gates pass.
4. Request review from code owners.

## Required Quality Gates
- Frontend: `lint`, `typecheck`, `tests`, `build`
- Backend: `lint`, `typecheck`, `tests`

## Coding Standards
- Angular standalone only
- SignalStore for state
- No heavy logic in templates
- No untyped `any` unless justified
- Handle loading/empty/error edge cases

## What to include in each PR
- Clear problem statement
- Scope and non-goals
- Tests (happy path + edge + error)
- Screenshots for UI changes
- Risks and follow-ups

## Issues for new contributors
Look for labels:
- `good first issue`
- `help wanted`
- `documentation`
