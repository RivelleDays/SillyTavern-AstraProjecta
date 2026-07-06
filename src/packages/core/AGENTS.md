## Purpose

- Own SillyTavern integration and runtime infrastructure for AstraProjecta.
- Keep framework glue, lifecycle wiring, adapter boundaries, and compatibility guards out of feature and UI wrapper layers.

## Owned Paths / Responsibilities

- `SillyTavern.getContext()` access patterns and typed wrapper contracts.
- Event bus integration and lifecycle subscriptions.
- Extension settings access and normalization for `astra_projecta`.
- `constants.ts` owns shared core constants used across runtime, adapters, and features.
- `i18n.ts` owns the core SillyTavern-backed translation bridge. Features must use it instead of scattering raw `translate(text, key)` calls across feature files.
- `layout-mode/` owns the centralized Astra mobile-layout activation contract and future manual override normalization.
- `runtime/` owns global body-class contracts, portal/root infrastructure, and runtime bootstrap helpers.
- `st/` owns SillyTavern state adapters; see `st/AGENTS.md`.

## Structure Tree

```text
src/packages/core/
├─ AGENTS.md
├─ constants.ts                # shared core constants
├─ i18n.ts                     # translation bridge
├─ layout-mode/                # shared mobile-layout activation contract
├─ runtime/                    # body-class and UI-root runtime infrastructure
└─ st/                         # SillyTavern state adapters
```

## SillyTavern Touchpoints

- Prefer public extension surfaces first: `manifest.json`, lifecycle hooks, `SillyTavern.getContext()`, exposed event bus, exposed settings, and public browser-side utilities.
- Every adapter or runtime helper that depends on SillyTavern must document:
    - consumed public API, event, or selector
    - why the dependency is needed
    - expected failure mode
    - fallback or compatibility behavior
    - whether the gap should be reported upstream
- If a required capability is unavailable through public extension surfaces, stop, report it, and suggest an upstream PR only when justified.

## Allowed Patterns

- Centralized selector registries or constants when multiple consumers depend on the same stable SillyTavern anchor.
- Compatibility guards for missing APIs, version drift, or absent DOM anchors.
- Adapter outputs that features can consume without re-reading raw SillyTavern globals.
- Narrow, explicit interfaces over clever abstractions.

## Forbidden Patterns

- Feature view code, Shadcn wrappers, or product layout composition in `core`.
- Importing `src/app/*` product assembly from `core`; app layers inject concrete runtimes into core-hosted infrastructure instead.
- Hiding undocumented DOM assumptions inside generic-sounding helpers.
- Reaching into SillyTavern internals when a public extension surface exists.
- Letting features bypass core and scatter duplicate selector/event logic without a clear reason.

## Naming Rules

- Name modules after the contract they provide, not after the temporary caller that first needed them.
- Keep selector and event names explicit.
- Use `astra_projecta` for settings namespaces and `[AstraProjecta]` for actionable warnings or errors.

## Update Triggers

- Update this file when a new SillyTavern integration category is introduced, public/private API boundaries change, or selector/event documentation rules change.

## Verification Checklist

- Confirm `core` still owns SillyTavern integration and runtime infrastructure.
- Confirm production `core` source does not import app-layer assembly.
- Confirm each adapter rule requires consumed API/selector/event documentation and fallback behavior.
- Confirm feature views and Shadcn wrappers are still explicitly forbidden here.
