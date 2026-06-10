## Purpose

- Own reusable live-node bridges for SillyTavern native drawer roots that AstraProjecta needs to host inside Astra-owned surfaces.
- Keep reparent, keep-open-during-attach, replacement handling, and restore logic centralized under `packages/core/st`.

## Owned Paths / Responsibilities

- `createNativeDrawerBridge.ts` is the host-neutral bridge for a single SillyTavern drawer root selected by stable id.
- Tests in this folder own replacement, restore, attach, and missing-source coverage for the bridge contract.

## SillyTavern Touchpoints

- Allowed sources are public SillyTavern drawer roots such as `#user-settings-block`.
- A bridge here may observe `document.body` for source replacement and the attached drawer root for `class` mutations, but it must not mutate SillyTavern core code or clone the source subtree.

## Rules

- No clone: always move the live drawer node.
- No layout ownership: this folder does not decide mobile or desktop presentation; callers provide the Astra host.
- Capture origin parent, next sibling, and pre-attach class state before moving the node.
- Keep `openDrawer` normalization active only while attached to an Astra host.
- Restore the original node on close, replacement, and dispose.
- Add only cross-layer bridge hooks here; any CSS normalization belongs to the owning Astra surface.
