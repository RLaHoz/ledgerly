# Skill: Interface Design — Token-Exact Mobile UI

## Purpose
Translate provided mockups/screenshots into production UI with strict visual parity:
- component-by-component light/dark parity
- mobile-first typography system
- systematic visual validation (not subjective matching)

## When to use
Use this skill for:
- theming changes (light/dark/system)
- spacing/typography/layout adjustments
- component visual refactors to match screenshots
- dashboard/settings card, tabs, form, and chart styling work

## Inputs expected
- Target screen(s) and route(s)
- Screenshot(s) or mockups
- Existing token files (theme variables, SCSS files)

## Workflow (must follow in order)

### 1) Extract design spec from source
- Build a mini spec from mockup:
  - colors (bg/card/text/icon/border/action)
  - spacing scale (outer padding, card padding, row spacing)
  - radius/shadow values
  - component states (default/active/disabled/error)

### 2) Define or map tokens
- Prefer semantic tokens (`--app-*`, feature-local tokens).
- Avoid hardcoded colors unless explicitly requested.
- Map every visual value to token(s) and keep per-theme overrides centralized.

### 3) Light/dark parity checklist (required)
For each component, verify both themes for:
- background + surface levels
- borders/rings/shadows
- icon + text contrast
- control states (selected, inactive, focused, disabled)
- card/list separators and emphasis colors

### 4) Mobile-first typography rules (required)
- Use a fixed scale table per role:
  - micro/caption/body/subheading/title/value
- For each text role define:
  - font-size (px), line-height, weight
- Apply consistently across components.
- Do not introduce ad-hoc sizes without mapping to a role.

### 5) Implementation discipline
- Keep styles component-scoped and minimal.
- Keep visual behavior deterministic across breakpoints.
- For Ionic controls, prefer CSS vars and `::part(...)` overrides only when required.

### 6) Systematic visual validation (required)
- Compare implementation vs mockup section-by-section:
  - header, nav/tabs, cards, controls, danger/success states.
- Report mismatches explicitly and fix them one by one.
- "Close enough" is not accepted when a concrete source is provided.

## Output format (required)
Return:
1) Decisions (2–5 bullets)
2) Exact files changed
3) Token changes summary (light/dark)
4) Validation checklist results (pass/fail per component)
5) Tests/typecheck status

## Blockers
- Hardcoded colors replacing available semantic tokens without reason
- Different visual logic between light and dark for same component state
- Typography scale drift (same role with inconsistent size/weight)
- Claiming parity without explicit checklist verification
