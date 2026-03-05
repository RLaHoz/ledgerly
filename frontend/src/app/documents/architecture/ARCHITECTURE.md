# Architecture Overview

## Monorepo Context
- `frontend/`: Angular + Ionic mobile-first client
- `backend/`: NestJS API for future auth/sync

## Frontend Stack
- Angular 20+ standalone APIs
- Ionic 8 standalone components
- NgRx SignalStore for app and feature state
- Dexie/IndexedDB for offline-first persistence
- SCSS design tokens for theming
- ApexCharts for analytics visualizations

## Design Principles
- Single source of truth for state
- Explicit boundaries (`core`, `shared`, `features`, `store`)
- Side effects isolated in services/use-cases
- Strong typing and strict TS mode
- Performance as default (OnPush, computed derivations, low nesting)

## Frontend Boundaries
- `core/**`: foundational services and infra
- `shared/**`: reusable UI/utilities/models
- `features/**`: domain feature modules (dashboard, history, rules, budget, settings)
- `store/**`: global app stores

## Data Strategy
Current:
- Offline-first data with Dexie (IndexedDB)

Future:
- NestJS + PostgreSQL cloud sync
- Auth + role model
- conflict resolution and reconciliation logs

## Theming Strategy
- `ThemeStore` controls mode state
- `ThemeService` handles side effects (storage, root class, system preference)
- Modes: `light`, `dark`, `system`

## API Strategy (Future)
- REST contracts with explicit DTO validation
- Prisma data access layer
- paginated queries and secure logging

## Non-functional Targets
- Reliable offline behavior
- sub-second interactions for common flows
- quality gates on every PR
- baseline accessibility coverage for all core screens
