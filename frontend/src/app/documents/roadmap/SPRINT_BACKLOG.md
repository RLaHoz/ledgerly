# Sprint Backlog (Execution Plan)

## Sprint 1 - Layout and Theme
Goal: visual baseline and stable shell.

Tickets:
- `S1-T1` App shell (`LayoutPage`, header, tabs footer, child routes)
- `S1-T2` `LayoutUiStore` (`activeTab`, `headerVm`, route sync)
- `S1-T3` `ThemeStore` (`mode`, `effectiveMode`, persistence)
- `S1-T4` SCSS token system (`--app-bg`, `--app-surface`, text, border)
- `S1-T5` Theme application on root element + dark/light/system toggle

Acceptance:
- Theme switching works without layout breakage
- Tabs navigation stable
- No console errors
- Mobile Lighthouse >= 90 on key screen

## Sprint 2 - Dexie Data Layer
Goal: reliable offline persistence.

Tickets:
- `S2-T1` Dexie setup with versioning and migration strategy
- `S2-T2` Repositories (`Transactions`, `Rules`, `Budgets`, `Settings`)
- `S2-T3` Initial seed data
- `S2-T4` Base transaction CRUD
- `S2-T5` Repository unit tests (happy, edge, failure)

Acceptance:
- Data survives reload/restart
- No backend dependency for core flows
- migration path documented

## Sprint 3 - History Module
Goal: usable and performant transaction history.

Tickets:
- `S3-T1` History page UI and route integration
- `S3-T2` Connect list to repositories and store
- `S3-T3` Reactive filters (owner, category, type, date range)
- `S3-T4` Edit/delete transactions
- `S3-T5` Performance validation with 1000 records

Acceptance:
- Filtering is instant under normal load
- edit/delete flows covered by tests

## Sprint 4 - Rules Engine
Goal: automatic transaction categorization.

Tickets:
- `S4-T1` Rules management UI (CRUD)
- `S4-T2` Matching engine (`keyword -> rule`)
- `S4-T3` Apply rule automatically on transaction create
- `S4-T4` Manual override from History
- `S4-T5` Rule matching tests and precedence rules

Acceptance:
- New transaction can auto-categorize
- Manual override always available

## Sprint 5 - Budget Engine
Goal: real budgeting core.

Tickets:
- `S5-T1` Budget UI per rule
- `S5-T2` Spent aggregation by period (`monthly`, `quarterly`, `yearly`)
- `S5-T3` Usage %, progress bars, over-budget indicator
- `S5-T4` Alert thresholds (80% and 100%)

Acceptance:
- Budgets calculate correctly across period boundaries

## Sprint 6 - Real Dashboard
Goal: dashboard powered by real data.

Tickets:
- `S6-T1` Total spent/remaining/savings metrics
- `S6-T2` Month-over-month comparison
- `S6-T3` ApexCharts integration for trend/category views
- `S6-T4` Empty/loading/error states

Acceptance:
- Dashboard reflects repository data in real time

## Sprint 7 - Split Mode (Feature Flag)
Goal: couple/shared financial logic.

Tickets:
- `S7-T1` `splitModeEnabled` + `splitType` feature flags
- `S7-T2` Equal and proportional split calculation
- `S7-T3` Owner-aware totals and balances
- `S7-T4` Split-specific dashboard widgets

Acceptance:
- Split can be enabled/disabled without regressions

## Sprint 8 - Reports
Goal: professional exports.

Tickets:
- `S8-T1` Monthly/quarterly report generation
- `S8-T2` PDF export
- `S8-T3` Excel export
- `S8-T4` Breakdown by rule and owner

Acceptance:
- Export files open correctly and match displayed metrics

## Sprint 9 - Insights v1
Goal: automatic actionable insights.

Tickets:
- `S9-T1` Spending anomaly detector baseline
- `S9-T2` Financial health score v1
- `S9-T3` Insight cards in dashboard

## Sprint 10 - Forecasting
Goal: short-term projection value.

Tickets:
- `S10-T1` End-of-month spending projection
- `S10-T2` Savings goal forecast and gap calculation
- `S10-T3` "what changed" indicators for user feedback

## Sprint 11 - Quality Hardening
Goal: pre-beta stability.

Tickets:
- `S11-T1` A11y audit and fixes
- `S11-T2` Performance profiling and optimization
- `S11-T3` Error boundary and offline resilience review
- `S11-T4` E2E critical path tests

## Sprint 12 - OSS Beta Readiness
Goal: external adoption readiness.

Tickets:
- `S12-T1` Contributor onboarding docs
- `S12-T2` Good first issues curation
- `S12-T3` Changelog/release process baseline
- `S12-T4` Beta release checklist execution
