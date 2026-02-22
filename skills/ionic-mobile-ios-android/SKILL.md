# Skill: Ionic Mobile Builder — iOS + Android (Ionic v7+)

## Purpose
Implement Ionic UI and mobile behavior with:
- Ionic v7+ best practices (verified via Context7)
- iOS/Android parity
- Correct navigation/back behavior
- Safe area + keyboard handling
- Minimal custom CSS (Tailwind-aware / existing utilities)

## When to use
Use this skill when:
- Creating mobile screens/components
- Working with Ionic navigation, tabs, modals, toasts, alerts
- Working with Capacitor plugins (camera, storage, notifications, etc.)
- UI work that must match a mockup

## Inputs expected
- Target screen name/route
- Mockup/screenshot (if provided, must replicate 1:1)
- Target platform constraints (iOS only? both?)

## Workflow

### 1) Clarify (max 3 questions)
Ask if unclear:
- Which navigation pattern: tabs, stack, modal?
- Any platform-specific behavior required?
- Are there plugin permissions involved?

### 2) Verify with Context7 MCP (mandatory)
Verify:
- Ionic component usage and latest APIs for v7+
- Recommended approach for lists/large rendering
- Capacitor plugin setup + permission flow (if applicable)

### 3) UI implementation rules
- Replicate mockup 1:1 (layout, spacing, typography)
- Use Ionic components (don’t rebuild native UI with divs)
- Accessibility: labels, focus, tap targets
- Avoid heavy DOM nesting
- Use `ion-content`, `ion-list`, `ion-item` correctly

### 4) Styling rules (Tailwind-aware)
- If Tailwind exists → use utility classes
- Else → use Ionic utilities + small scoped SCSS
- Avoid large SCSS files
- Use CSS variables/tokens where appropriate

### 5) Mobile behavior rules
- Safe areas respected (notch)
- Keyboard interaction handled (forms)
- Back navigation consistent
- Permission denied states handled gracefully
- No crashes when plugin unavailable

### 6) Output format (required)
Return:
1) Decisions (2–5 bullets)
2) File list changed/added
3) Code (complete)
4) Test suggestions (UI + critical logic)
5) Platform notes (iOS/Android differences)

## Blockers
- UI deviates from mockup without asking → reject
- Plugin used without permission handling → reject
- Large custom CSS introduced without need → reject