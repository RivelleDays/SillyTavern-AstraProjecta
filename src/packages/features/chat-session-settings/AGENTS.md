## Purpose

- Own the Chat Settings bottom drawer and its settings content (currently: Chat Background).
- Keep this independent from `sillytavern-interface`: it uses shared Astra UI primitives, but has its own DOM id/class namespace and settings storage.

## Owned Paths / Responsibilities

- `contracts/dom.ts` owns this drawer's stable DOM ids (`astra-chat-session-settings-drawer*`).
- `drawer/` owns `ChatSessionSettingsDrawer`, built on the shared Astra `Drawer` primitive.
- `chat-background/` owns the Chat Background settings tab content (blur/opacity sliders) and reads/writes `packages/core/st/chat-background-appearance`.

## SillyTavern Touchpoints

- This feature does not touch SillyTavern DOM directly. Background appearance persistence and the `#bg1` CSS variable bridge live in `packages/core/st/chat-background-appearance`; this feature only renders controls bound to that store.

## Rules

- Keep `chat-session-settings-drawer__*` and `chat-session-settings__*` selectors independent from `sillytavern-interface-panel__*` and `astra-main-interface-panel__*`. Do not reuse those selectors here, and do not let other features reuse these.
- Reuse the shared Astra `Drawer` primitive; do not fork drawer behavior here.
- Must not import from `src/app/mobile` or from `src/packages/features/sillytavern-interface`.
- Top-bar owns only the trigger button id; this feature owns the drawer id and all drawer-internal constants (mirrors the existing `chat-session` boundary rule).

## Verification Checklist

- Confirm drawer selectors stay independent from `sillytavern-interface-panel__*`.
- Confirm background settings reads/writes go through `packages/core/st/chat-background-appearance`, not ad hoc `extensionSettings` access here.
- Confirm the shared Astra `Drawer` remains reused, not forked.
