## Purpose

- Own the Chat Settings bottom drawer and its settings content (sections: Chat Messages, Message Input, Chat Background).
- Keep this independent from `sillytavern-interface`: it uses shared Astra UI primitives, but has its own DOM id/class namespace and settings storage.

## Owned Paths / Responsibilities

- `contracts/dom.ts` owns this drawer's stable DOM ids (`astra-chat-session-settings-drawer*`).
- `drawer/` owns `ChatSessionSettingsDrawer`, built on the shared Astra `Drawer` primitive.
- `SettingsSectionGroup.tsx` owns the feature-local section wrapper: semantic section, plain section title, and rounded settings-card container shared across settings sections.
- `chat-background/` owns the Chat Background settings tab content (blur/opacity sliders) and reads/writes `packages/core/st/chat-background-appearance`.
- `chat-message/` owns the Chat Messages settings tab content (line-height / text-align button groups) and reads/writes `packages/core/st/chat-message-appearance`.
- `message-input/` owns the Message Input settings tab content, including `MessageInputSettingsTab.tsx` and the shortcuts-toolbar visibility toggle wired to the send-form visibility state.
- `chat-session-settings.css` and `chat-session-settings.css.test.ts` own this feature's structural selector contract.

## SillyTavern Touchpoints

- This feature does not touch SillyTavern DOM directly. Appearance persistence and the CSS-variable bridges live in `packages/core/st`: the `#bg1` blur/opacity bridge in `chat-background-appearance`, and the `.mes_text`/`.mes_reasoning` `--astra-mes-line-height` / `--astra-mes-text-align` bridge in `chat-message-appearance`. The Chat Messages tab and drawer also read/write `packages/core/st/chat-message-interaction` for the long-press action. This feature only renders controls bound to those stores.

## Rules

- Keep `chat-session-settings-drawer__*` and `chat-session-settings__*` selectors independent from `sillytavern-interface-panel__*` and `astra-main-interface-panel__*`. Do not reuse those selectors here, and do not let other features reuse these.
- Reuse the shared Astra `Drawer` primitive; do not fork drawer behavior here.
- Must not import from `src/app/mobile` or from `src/packages/features/sillytavern-interface`.
- Top-bar owns only the trigger button id; this feature owns the drawer id and all drawer-internal constants (mirrors the existing `chat-session` boundary rule).

## Verification Checklist

- Confirm drawer selectors stay independent from `sillytavern-interface-panel__*`.
- Confirm background settings reads/writes go through `packages/core/st/chat-background-appearance`, not ad hoc `extensionSettings` access here.
- Confirm the shared Astra `Drawer` remains reused, not forked.
