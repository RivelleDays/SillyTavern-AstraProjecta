## Purpose

- Define the split UI layer for AstraProjecta.
- Keep CLI-managed upstream shadcn sources separate from Astra-owned shared helpers, icon entrypoints, and portal-aware composition.

## Owned Paths / Responsibilities

- `shadcn/`: CLI-managed upstream shadcn sources.
- `shared/`: Astra-owned shared helpers such as icon policy and portal-aware overlays.
- `astra/`: Astra-owned SillyTavern compatibility wrappers that intentionally sit outside vendored shadcn sources.

## Structure Tree

```text
src/components/ui/
├─ AGENTS.md
├─ dependency-hygiene.test.ts     # enforces vendored-shadcn allowlist
├─ shadcn/
│  └─ AGENTS.md
├─ shared/
│  └─ AGENTS.md
└─ astra/
   └─ 8 compatibility wrappers; see astra/AGENTS.md
```

## SillyTavern Touchpoints

- UI wrappers should not own SillyTavern business logic or raw SillyTavern integration.
- If a primitive needs special container or focus handling because of AstraProjecta runtime constraints, keep the UI contract in `shared/` and the runtime ownership in `packages/core/runtime` or `app/mobile`.

## Allowed Patterns

- Default feature imports to `@/components/ui/shadcn/*` for upstream shadcn components.
- If a same-name Astra wrapper exists and the surface needs SillyTavern-specific stability, prefer the Astra version over the vendored shadcn twin.
- Feature-owned Drawer and ResponsiveDialog surfaces should use `@/components/ui/astra` exports so portal scope, focus handoff, close lifecycle, and SillyTavern global CSS hardening stay centralized.
- Drawer, panel, popup, and overlay-hosted dropdown menus must use `@/components/ui/astra/dropdown-menu` instead of the vendored shadcn dropdown so menu content follows Astra portal and layering rules in SillyTavern.
- Keep neutral Astra-owned helpers under `@/components/ui/shared/*`.
- Prefer neutral containers with explicit classes over `h1`, `h2`, or `h3` in Astra-owned UI surfaces because SillyTavern heading styles can leak into extension content.
- Keep `@/components/ui/astra` narrow and compatibility-focused rather than growing into a general wrapper dump.
- `@/components/ui/astra/smooth-tabs` is the explicit exception for touch-first mounted content tabs; keep it isolated from Shadcn Tabs and `shared/sliding-tabs`.
- Local icon exports that centralize Lucide usage through the shared UI layer.
- Use the official shadcn/Vaul drawer shape for bottom drawers, then layer Astra helpers on top rather than inventing a parallel popup API.
- When composing shadcn `Button` through Radix/Vaul `asChild` close primitives, preserve `data-variant` and `data-size` metadata and fix SillyTavern global button conflicts through `src/styles/shadcn-overrides.css`.
- Dark-mode-first tokens and classes.
- Assuming `data-astra-projecta-ui-root` gives scoped preflight and local portal scope only.
- Proactive `ScrollArea` evaluation for long or clipped feature content, but keep the shared drawer primitive aligned with the official shadcn/Vaul structure rather than embedding scroll containers inside the wrapper.
- Small presentation helpers that reduce duplication across features without pulling in feature state.
- CSS fixes for vendored shadcn components through `src/styles/shadcn-overrides.css`, not inline edits to upstream files.

## Forbidden Patterns

- Direct `lucide-react` imports from feature folders when the icon should come through this layer.
- Raw third-party primitive usage from feature code when a local wrapper should exist here.
- Feature business logic, SillyTavern selectors, or product-layout assumptions inside UI wrappers.
- Adding new wrapper code under `src/components/ui/astra` unless it is a documented SillyTavern compatibility exception.
- Treating `data-astra-projecta-ui-root` as a replacement for the runtime body-class theme contract.
- Editing vendored shadcn source files under `src/components/ui/shadcn` without explicit approval.

## Naming Rules

- Wrapper names should follow the Shadcn primitive or the local UI responsibility they expose.
- Keep icon imports centralized through the shared UI layer.
- Use semantic class names and keep `astra-projecta-*` reserved for cross-layer contracts rather than local presentational trivia.

## Update Triggers

- Update this file when the UI wrapper policy changes, icon entry rules change, overflow handling standards change, or a new primitive category becomes standard.

## Verification Checklist

- Confirm this folder still documents the split between vendored shadcn sources and Astra-owned wrappers.
- Confirm same-name Astra wrapper precedence is explicit for SillyTavern-adapted surfaces.
- Confirm `src/components/ui/astra` remains narrowly scoped to documented compatibility wrappers.
- Confirm Lucide usage is centralized through the shared UI layer.
- Confirm dark-mode-first and `ScrollArea` evaluation rules remain explicit.
- Confirm feature logic and SillyTavern integration are still forbidden here.
