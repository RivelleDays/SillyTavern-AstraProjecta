## Purpose

- Own the Phase 1 product assembly for AstraProjecta.
- Compose mobile chat/session surfaces, mobile layout hosts, and any mobile-only view orchestration without forcing those assumptions onto desktop or shared layers.

## Owned Paths / Responsibilities

- Mobile shell layout, host creation, mount order, teardown order, and mobile-only view composition.
- Mobile-specific runtime guards for viewport-driven activation.
- Mobile-owned wrappers around controlled bridges that are needed to present SillyTavern surfaces inside the mobile experience.
- `top-bar/` owns the mobile wrapper around native `#sheld`.
- `astra-main-interface-panel/` owns the left-side mobile Astra main-interface shell; content belongs in `packages/features/astra-main-interface`.
- `sillytavern-interface-panel/` owns the right-side mobile SillyTavern interface assembly wrapper, including the open/active-route controller and the mobile implementation of the neutral send-form adapter. Panel implementation remains in `packages/features/sillytavern-interface`.

## Structure Tree

```text
src/app/mobile/
├─ AGENTS.md
├─ runtime/         # mobile runtime bootstrapping
├─ top-bar/         # native #sheld wrapper and top bar
├─ astra-main-interface-panel/ # left-side Astra main-interface shell
├─ sillytavern-interface-panel/ # right-side SillyTavern interface assembly
├─ styles/          # planned mobile-only CSS
└─ utils/           # planned mobile-only helpers
```

## SillyTavern Touchpoints

- Mobile may bridge SillyTavern-owned DOM only when it is necessary for compatibility or required user flow continuity.
- A mobile bridge must record these fields in the owning module or nearby documentation:
    - source selector or source node contract
    - target AstraProjecta host
    - restore path on teardown
    - event source or lifecycle trigger
    - fallback behavior
    - no-op condition when the source is missing
    - cleanup guarantees for listeners, observers, and moved nodes
- Prefer event-driven synchronization over polling when SillyTavern exposes a usable lifecycle event.

## Allowed Patterns

- Mobile-first decisions for Phase 1, even if desktop stays skeletal.
- Additive AstraProjecta hosts that can mount, remount, and unmount safely.
- Idempotent mount/unmount logic.
- Relying on `body.astra-projecta-base-ui-body` for mobile runtime tokens instead of copying theme tokens onto feature selectors.
- Explicit overflow handling and proactive `ScrollArea` use for drawers, menus, sheets, side panels, and long content regions.
- Keeping bridge logic close to the mobile shell that owns the user experience.
- Keeping mobile CSS tests structural only: selector/host/data-attribute contracts may be tested, but hand-tuned CSS values must remain editable without changing tests.

## Forbidden Patterns

- Reparenting or mutating SillyTavern DOM without a documented restore path.
- Assuming desktop will use the same DOM layout, selectors, or shell composition.
- Hiding missing SillyTavern nodes with silent failure that leaves broken half-mounted UI. Missing anchors must fall back to a clean no-op path.
- Pushing mobile-owned DOM contracts into `app/shared`.
- Encoding exact mobile CSS visual values in tests instead of leaving them to human tuning.

## Naming Rules

- Use `astra-projecta-*` only for global runtime hosts that mobile creates on behalf of the whole product.
- Use shorter mobile-local names for mobile-only hosts, CSS tokens, and state hooks when ownership is obvious from folder context.
- Stable mobile diagnostics or automation anchors may use `id`; repeated regions must use `class`.

## Update Triggers

- Update this file when mobile bridge policy changes, a new stable mobile host is introduced, or the mobile layout lifecycle gains new invariants.
- Add deeper `AGENTS.md` files only when a mobile subfolder gains rules that are too detailed for this overview.

## Verification Checklist

- Confirm mobile still owns Phase 1 assembly decisions.
- Confirm every bridge rule requires source, target, restore, trigger, fallback, no-op, and cleanup documentation.
- Confirm idempotent mount/unmount behavior is still mandatory.
- Confirm `ScrollArea` and overflow evaluation remain explicit requirements.
- Confirm mobile CSS test coverage protects structure only, not visual property values.
