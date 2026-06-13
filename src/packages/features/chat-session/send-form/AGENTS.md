## Purpose

- Own the AstraProjecta mobile chat composer shell inside SillyTavern's single-chat input surface.
- Keep `#form_sheld` wrapping, textarea reparent/restore behavior, quick shortcut composition, native quick-reply wrapper bridging, and chat input UI together.

## Owned Paths / Responsibilities

- The `contracts/` subfolder owns native send-form anchor ids, Astra host ids, drawer ids, storage keys, and shortcut descriptors.
- The `host/` subfolder owns mount/unmount bootstrap, `#mobile-chat-composer-shell` wrapping, native host ordering, and textarea reparent/restore lifecycle.
- The `shell/` subfolder owns React view composition for the composer wrapper, chat input, and shortcuts row.
- The `bridges/` subfolder owns quick shortcut click-through, native quick-reply bar reparent/restore, native options click-through, and shared send-form focus-release compatibility helpers.
- This feature owns the SillyTavern interface trigger wiring only; the panel shell, descriptors, ids, and route icons live under `src/packages/features/sillytavern-interface/`.
- The `context-usage/` subfolder owns the shortcut popover surface and presentation helpers for context-usage summaries.
- The `main-menu/` subfolder owns the current-chat drawer presentation and static tile metadata. Route SVG assets live under `src/packages/features/sillytavern-interface/icons/`.
- The `options-menu/` subfolder owns the mobile send-form menu taxonomy, visibility rules, and action bridge for `mobile-send-form-menu-button`.
- The `extensions-menu/` subfolder owns the live DOM bridge between the mobile send-form drawer and SillyTavern's native `#extensionsMenu`.

## SillyTavern Touchpoints

- Wrap native `#form_sheld` in Astra-owned `#mobile-chat-composer-shell` while mounted, and restore `#form_sheld` to its original parent/sibling ordering on teardown.
- Mount the composer host `#mobile-chat-composer-host` inside `#send_form` before `#nonQRFormItems`.
- Render `#mobile-chat-input-host` inside the composer input region, `#mobile-chat-quick-replies-host` inside the chat input textarea slot, and `#mobile-chat-shortcuts-host` inside the composer shortcuts region; the composer host owns outer mobile spacing.
- Reparent `#send_textarea` only while mounted, and restore it before `#rightSendForm` on teardown.
- Reparent native `#qr--bar` only while mounted, and restore it to its original parent/sibling ordering on teardown when the origin still exists.
- Observe native shortcut/send-button visibility without mutating unrelated ST nodes.
- Bridge the current-user chat settings override action through SillyTavern's existing `#char-management-dropdown #set_chat_character_settings` option for character chats and `#rm_group_scenario` button for group chats. Missing native targets must no-op.

## Rules

- Mount/unmount must stay idempotent.
- Missing ST anchors must cleanly no-op.
- Keep Quick Reply as a restore-safe native bridge attached to the chat input quick-reply slot; the Astra composer wrapper owns the input surface, bottom shortcuts region, rounded group shape, and shortcuts visibility state.
- Treat `#qr--bar` as a native node owned by SillyTavern Quick Reply; Astra only provides the mobile wrapper host and restore-safe bridge.
- Keep the semantic mobile chat DOM contract stable for the composer and input hosts while this compatibility slice is active.
- The current-chat drawer in this folder is presentation-only: it consumes the core current-chat identity store and must not rebuild identity resolution locally.
- Do not move SillyTavern interface title/content logic back into send-form; this folder only opens and closes the SillyTavern interface surface.
- Keep `mobile-chat-main-menu__trigger` scoped to opening the Astra-owned drawer; main-menu tiles are currently visual-only, and any future actions beyond stable identity display belong in separate modules, not this first drawer.
