## Purpose

- Own the mobile assembly wrapper for the right-side SillyTavern interface panel.
- Bridge `packages/features/sillytavern-interface` into mobile runtime composition without making `chat-session/send-form` import the panel implementation.

## Responsibilities

- Own the mobile open/active-route controller used by the send-form adapter.
- Mount and unmount `MobileSillyTavernInterfacePanel` through an Astra-owned portal host.
- Create the send-form adapter methods: `openCurrentPage`, `openRoute`, and `renderRouteIcon`.
- Preserve stored route behavior, including AI Settings child-page resolution, by delegating to the sillytavern-interface route storage helpers.

## Rules

- This folder may import both the SillyTavern interface feature implementation and the send-form adapter contract because it is an app-level composition boundary.
- Do not move panel DOM ids, native host ids, route descriptors, storage keys, or route icon implementation into this folder.
- Do not expose mobile DOM selectors through `src/app/shared`.
- Mount, unmount, and dispose must clean up pending animation-frame or timeout opens.
