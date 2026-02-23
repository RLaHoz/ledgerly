# Ledgerly

Mobile-first personal finance control system.

## Product Positioning
Ledgerly is not only an expense tracker. It is an offline-first financial control system with:
- Rules-based categorization
- Budget engine
- Split mode (couple/shared)
- Actionable insights and reporting

## Monorepo Layout
- `frontend/`: Angular + Ionic app (Standalone + SignalStore)
- `backend/`: NestJS API (future sync/auth phases)
- `frontend/src/app/documents/`: roadmap, architecture, contributor documentation

## Getting Started
### Frontend
```bash
cd frontend
npm install
npm run typecheck
npm run test
npm run build
```

### Backend
```bash
cd backend
npm install
npm run test
```

## Standards
This repository follows:
- `AGENTS.md` for implementation standards
- `DECISIONS.md` for architecture decisions
- Conventional Commits
- CI quality gates (`lint`, `typecheck`, `tests`, `build`)

## Agent And Skill Files
This project uses two important guidance layers for AI-assisted development and team consistency.

### `AGENTS.md` (project operating rules)
- Defines global engineering standards for this repository.
- Establishes architecture constraints, coding quality, and output expectations.
- Reduces ambiguity for contributors by making conventions explicit.

Use when:
- Starting work in the repo.
- Making architectural or style-sensitive changes.
- Reviewing whether a change aligns with team rules.

Benefits:
- Consistent code quality and patterns.
- Faster onboarding for new contributors.
- Fewer review cycles due to clearer expectations.

### `SKILL.md` files under `skills/*` (task-specific playbooks)
- Each skill is a focused workflow for a specific type of task.
- Examples in this repo:
  - `skills/angular-standalone-signalstore/SKILL.md`
  - `skills/ionic-mobile-ios-android/SKILL.md`
  - `skills/pr-strict-reviewer/SKILL.md`
- They standardize how to execute recurring tasks (build feature, mobile UI work, strict PR review).

Use when:
- A task clearly matches a defined skill.
- You want a repeatable checklist for implementation/review.

Benefits:
- Reusable delivery process across projects.
- Better predictability for outcomes and quality.
- Clear specialization without losing project-wide standards.

### Practical guidance for future projects
- Keep one `AGENTS.md` at repo root as the source of truth.
- Add `skills/<topic>/SKILL.md` for repeated workflows.
- Keep skills narrow, actionable, and test-driven.
- Treat both files as versioned engineering process documentation, not temporary notes.

## Delivery Planning
- High-level roadmap: `roadmap/ROADMAP.md`
- Sprint-by-sprint plan: `roadmap/SPRINT_BACKLOG.md`
- Definition of Done: `roadmap/DEFINITION_OF_DONE.md`

## Architecture
- Architecture overview: `architecture/ARCHITECTURE.md`
- Data model baseline: `architecture/DATA_MODEL.md`

## Contributing
Read `CONTRIBUTING.md` before opening issues or pull requests.
