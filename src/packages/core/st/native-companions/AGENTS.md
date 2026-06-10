## Purpose

- Own reusable live-node bridges for SillyTavern companion roots that are not drawers but must be hosted inside Astra-owned surfaces.
- Keep reparent, replacement handling, attribute preservation, and restore logic centralized under `packages/core/st`.

## Owned Paths / Responsibilities

- `createNativeCompanionBridge.ts` is the host-neutral bridge for a single SillyTavern companion root selected by stable id.
- Tests in this folder own replacement, restore, attach, missing-source, and original attribute preservation coverage for the bridge contract.

## SillyTavern Touchpoints

- Allowed sources are public, stable SillyTavern DOM roots such as `#completion_prompt_manager_popup`.
- A bridge here may observe `document.body` for source replacement, but it must not mutate SillyTavern core code or clone the source subtree.

## Rules

- No clone: always move the live companion node.
- No presentation ownership: callers provide the Astra host and owning surface CSS.
- Capture origin parent, next sibling, class, style, and bridge attributes before moving the node.
- Restore the original node on route switch, close, replacement, and dispose.
- Keep `openDrawer`-based visibility normalization opt-in for companions that are still driven by SillyTavern drawer animation code.
- Add only cross-layer bridge hooks here; any visual normalization belongs to the owning Astra surface.
