# AGENTS.md — Global Agent Instructions (Repo Root)

## Golden rule
- If any requirement is ambiguous, ask up to 3 questions before generating code. Do not guess.

## Mandatory Context Check
- Before any analysis or code change, you MUST read this `AGENTS.md` and all relevant `SKILL.md` files for the task.
- At the beginning of each response, include this exact line:
  - `AGENT-CHECK: AGENTS.md and relevant SKILL.md reviewed.`

## Sources of truth (Context7 MCP)
- Always use Context7 MCP to verify:
  - Angular/Ionic/Nest syntax, APIs, deprecations, version differences
  - RxJS operators and lifecycle patterns
  - Capacitor plugins and permission flows
- Prefer official docs (Angular → Ionic → Nest → TypeScript/RxJS → official repos).

## Project defaults
- Repo is monolithic: `/frontend` and `/backend`.
- TypeScript strict is mandatory.
- Prefer clarity + maintainability + performance.
- DRY, SOLID (when it improves clarity), early returns, low nesting, descriptive naming.
- Handle edge cases (null/empty/loading/error/permission denied).

---

# FRONTEND (Angular + Ionic)

## Angular rules (mandatory)
- Standalone only. No NgModules.
- Use modern Angular APIs (inject(), signals, takeUntilDestroyed(), etc.) as recommended by current docs.
- Presentational components: `ChangeDetectionStrategy.OnPush`.
- Avoid heavy logic in templates; compute in TS (signals/computed/selectors).
- Lists must use `trackBy` where applicable.
- No memory leaks:
  - prefer `async` pipe
  - or `takeUntilDestroyed()` when manual subscription is unavoidable.
- Typed reactive forms preferred. Complex validations must be extracted into pure helper functions.

## State management
- Standard is SignalStore.
- Single source of truth. Avoid duplicated state between components and store.
- Derivations via computed/selectors; keep store small and focused.
- Long/complex logic belongs in helpers/use-cases/services, not inside component templates.

## Styling rules (Tailwind-aware)
- Before writing styles, detect the repo styling approach:
  1) If Tailwind is present (tailwind config or deps), use Tailwind utilities.
  2) Otherwise, use existing Ionic utilities + SCSS approach already in the project.
- Avoid large custom CSS. Prefer utilities, tokens, CSS variables, and small component-scoped styles.
- Use modern CSS patterns (variables, logical properties, grid/flex, clamp()).
- If a mockup/screenshot is provided: replicate UI 1:1 (spacing, typography, layout). If any visual detail is unclear, ask.

## Interface design skill (mandatory for UI tasks)
- For any UI/layout/theming task, use `skills/interface-design/SKILL.md` before implementing.
- Then execute implementation with `skills/ionic-mobile-ios-android/SKILL.md`.
- If `interface-design` is unavailable, explicitly follow the fallback protocol below.

### Fallback protocol (if skill unavailable)
- Light/dark parity checklist (component-by-component):
  - Background, card, border/shadow/ring, icon color, text hierarchy, button states, inputs/select/toggle states.
  - Header, tabs/footer, and safe-area behavior must match both themes.
- Mobile-first typography rules:
  - Define exact px size + weight + line-height per UI role (caption/body/title/value).
  - Keep one canonical scale and apply consistently per component.
  - Do not upscale text heuristically; every size change must map to the defined scale.
- Systematic visual validation (not "looks similar"):
  - Compare screenshot vs implementation block-by-block.
  - Validate spacing, radius, color, stroke, and state colors with explicit tokens/values.
  - Only consider done when mismatches are enumerated and resolved.

## Ionic mobile rules (iOS + Android)
- Follow Ionic v7+ recommended patterns (verify with Context7 MCP).
- Maintain iOS/Android parity.
- Respect safe areas, keyboard behavior, navigation stack/back behavior.
- Permissions (Capacitor): request minimum required, handle denied states, never crash.

## Platform-aware UI rules
- Detect platform before implementing UI/layout:
  - If project uses Ionic (`@ionic/angular` dependency or `ion-` components present): enforce notch-safe layout (safe-area insets) and responsive behavior.
  - If project is Angular-only (no Ionic): enforce responsive layout only.
- Ionic notch-safe is mandatory:
  - Use `env(safe-area-inset-top/right/bottom/left)` in relevant layout containers.
  - Avoid content overlap with fixed headers/tab bars.
  - Ensure `viewport-fit=cover` is present when applicable.

---

# BACKEND (NestJS)

## Nest rules
- Controllers: IO only (request/response). No business logic.
- Services/use-cases: application logic.
- DTO validation must be strict (whitelist/forbidNonWhitelisted/transform).
- Consistent error mapping and safe logging (no secrets / no tokens).
- Auth/roles guards for protected routes.
- Efficient queries, pagination; avoid N+1.

---

# Output expectations (every code answer)
Provide:
1) Decisions taken (2–5 bullets)
2) Full code (no broken placeholders)
3) Perf + security considerations (only relevant ones)
4) Tests: at least happy path + 1 edge case + 1 error case (or state why missing)
