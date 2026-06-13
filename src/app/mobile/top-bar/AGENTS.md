## Purpose

- Own the AstraProjecta mobile chat top bar and the reversible wrapper around SillyTavern's native `#sheld`.
- Keep top-bar identity display separate from send-form shortcuts, drawers, and input-row behavior.

## SillyTavern Touchpoints

- Source node: native `#sheld`.
- Target host: Astra-owned `#mobile-chat-session-shell`, with `#mobile-chat-top-bar-host` before `#sheld`.
- Restore path: unmount must move `#sheld` back to its original parent and next sibling before removing the shell.
- Lifecycle trigger: `createMobileChatSessionRuntime` mounts this feature only while layout mode resolves to mobile.
- Fallback behavior: missing `#sheld`, pre-existing shell, or already-wrapped `#sheld` must no-op cleanly.
- Cleanup guarantees: React root, current-chat identity store, first-open main-interface stores, wrapper host, and stored DOM references must be disposed on unmount.

## Rules

- Consume `createCurrentChatIdentityStore`; do not resolve character/group identity locally.
- Keep `mobile-chat-top-bar__astra-main-trigger` as the trigger for the Astra-owned main interface panel.
- The main interface panel lives under `src/app/mobile/astra-main-interface-panel`; top-bar may trigger it but must not own its content or constants.
- Top-bar may coordinate first-open store creation for the main-interface panel so expensive or chat-catalog-backed data paths start only after the panel has opened once.
- First-open store coordination may include the shared Global chat catalog store, favorite entity metadata store, and reusable scoped chat catalog store. Dispose them together with the top-bar React lifecycle.
- Top-bar must not own favorite character/group selection rules, scope sorting, current-entity exclusion, or scoped body behavior. Those belong to `src/packages/core/st/favorite-chat-entities` and `src/packages/features/astra-main-interface`.
- Hide SillyTavern native top bars only through mobile-scoped CSS under `body.astra-projecta-mobile-layout`.
