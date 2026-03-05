# Ledgerly Roadmap (Macro Phases)

## Vision
Build a mobile-first, offline-first personal finance control platform that can evolve from local-only usage into cloud-synced collaboration.

## Phase 0 (Week 0) - OSS Baseline
Objective: make the project ready for external contributions.

Deliverables:
- Contribution governance (`CONTRIBUTING`, issue templates, CODEOWNERS, SECURITY)
- CI quality gates documented and enforced
- Definition of Done and PR standards

## Phase 1 (Weeks 1-4) - UI Infrastructure + Offline Core
Objective: stable app shell, theme system, and local data platform.

Sprints:
- Sprint 1: Layout + Theme + Design Tokens
- Sprint 2: Dexie infrastructure + repositories + CRUD base
- Sprint 3: History module + filters + editing + performance
- Sprint 4: Rules engine + auto categorization

## Phase 2 (Weeks 5-8) - Complete Financial Core
Objective: production-grade budgeting and real dashboard insights.

Sprints:
- Sprint 5: Budget engine
- Sprint 6: Dashboard with real data
- Sprint 7: Split mode (feature-flagged)
- Sprint 8: Reports (PDF/Excel)

## Phase 3 (Weeks 9-12) - Intelligence + Hardening
Objective: high-value insights and release hardening.

Sprints:
- Sprint 9: Insights and financial health score v1
- Sprint 10: End-of-month projection + savings goals
- Sprint 11: quality hardening (a11y/perf/error handling)
- Sprint 12: OSS beta release readiness

## Phase 4 (Weeks 13-16) - API + Sync Foundations
Objective: backend contracts and incremental sync architecture.

Sprints:
- Sprint 13: NestJS foundation + Prisma + PostgreSQL
- Sprint 14: Auth + roles + protected contracts
- Sprint 15: Sync protocol and conflict strategy
- Sprint 16: integration tests and API hardening

## Phase 5 (Weeks 17-20) - Cloud Sync Productization
Objective: robust cloud sync and release candidate.

Sprints:
- Sprint 17: cloud sync v1 (upload/download)
- Sprint 18: retries + observability + error mapping
- Sprint 19: conflict resolution UX + reconciliation logs
- Sprint 20: release candidate

## Release Gates
A phase closes only if all are true:
- CI gates pass (`lint`, `typecheck`, `tests`, `build`)
- performance budget respected
- critical user flows validated
- security/privacy checklist complete
