# Ledgerly

Mobile-first personal/couple finance control system.

## Product Positioning
Ledgerly is not only an expense tracker. It is an offline-first financial control system with:
- Rules-based categorization
- Budget engine
- Split mode (couple/shared)
- Actionable insights and reporting

## Monorepo Layout
- `frontend/`: Angular + Ionic app (Standalone + SignalStore)
- `backend/`: NestJS API (future sync/auth phases)
- `docs/`: roadmap, architecture, contributor documentation

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

## Delivery Planning
- High-level roadmap: `docs/roadmap/ROADMAP.md`
- Sprint-by-sprint plan: `docs/roadmap/SPRINT_BACKLOG.md`
- Definition of Done: `docs/roadmap/DEFINITION_OF_DONE.md`

## Architecture
- Architecture overview: `docs/architecture/ARCHITECTURE.md`
- Data model baseline: `docs/architecture/DATA_MODEL.md`

## Contributing
Read `CONTRIBUTING.md` before opening issues or pull requests.
