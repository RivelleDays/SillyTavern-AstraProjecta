# Message Actions (Chat)

## Purpose & Scope
- Hosts all Astra chat message action surfaces: revisions/continues history, swipe pager, and message editing controls.
- Entry point: `initializeMessageActions()` wires both revisions (continue history) and editing controls.
- Lives alongside SillyTavern chat DOM; only operates inside Astra-owned action containers created via `ensureActionContainer`.

## Directory Map
- `context/`: shared chat context, DOM helpers, and `ensureActionContainer` slot creation.
- `state/`: continue/revision state helpers (`continueState.js`).
- `continue/`: continue/revision features (operations + hosts + React components).
- `editing/`: edit-mode controls (hosts + React components).
- `swipe/`: swipe pager host + UI.
- `meta/`: message-level adornments (meta row, custom header above `mesAvatarWrapper`).
- `messageActions.css`: styling layer for all controls (revision buttons, pager, edit bars).
- `index.js`: exports `initializeMessageActions`, `initializeMessageRevisions`, and `initializeMessageEditing`.

## Naming & Styling
- Action container prefix: `astra-messageActions*` (`__left/right`, `__leftDefault`, `__leftEdit`, `__rightDefault`, `__rightEdit`).
- Slots (from `ensureActionContainer`): `__toggleHost` (edit toggle), `__primaryHost` (revision bar), `__historyHost`, `__swipeHost`, `__rightEditHost`.
- Meta row (above actions): `.astra-messageMeta` with `__left` / `__right` for message details (ID, timer, token count, timestamp).
- Revision actions: `astra-revisionBar`, `astra-revisionButton`.
- Swipe pager: `astra-swipePager*` (button + counter).
- Compact icon buttons: `astra-messageActions__iconButton--compact` (used by edit toggle and compact revision buttons).
- Editing bars: `.astra-editActionsLeft/Right` retained for clarity.

## Integration Points
- `ensureActionContainer` normalizes action slots per message; attaches `data-astra-editing` to toggle default vs edit slots.
- Message meta host renders ID/timer/token/timestamp into the meta row; hide items via `body.no-*` classes to respect SillyTavern toggles.
- Continue/overlay host uses the slots to place revision bar + history trigger; swipe host uses `__swipeHost`; editing host uses toggle + edit slots.
- Tooltip components rely on shadcn tooltip provider; class names scoped above to avoid leaking into SillyTavern UI.

## Events & Observers
- Hosts subscribe to SillyTavern events: message render/edit/swipe, generation start/stop, chat changed (see respective host files).
- MutationObservers watch `#chat` for node/class changes; avoid duplicating observers outside these hosts.
- Keep initialization idempotent: `initializeMessageActions` guards re-entry; do not add global listeners elsewhere.

## Initialization Flow
- Bootstrap calls `initializeMessageActions({ getContext })`, which:
  - `initializeMessageRevisions` → sets up continue operations, overlay host, actions host, and swipe pager wiring.
  - `initializeMessageEditing` → sets up edit toggle and edit mode action bar.
- All modules depend on `context/chatMessageContext` for SillyTavern context access; avoid direct `SillyTavern` globals elsewhere.

## Gotchas / Notes
- Styling renames consolidated under `messageActions`; if adding new classes, mirror the token usage and keep prefixes consistent.
- Overlay/tree components still use `astra-continue*` naming inside the overlay—okay while the dialog semantics stay “continue/revisions”.
- When altering class names, update: `ensureActionContainer`, CSS selectors, and any component/host that injects className strings.
- Edit toggle currently uses the compact icon style; if you change its appearance, ensure swipe pager buttons remain visually distinct.
- Right-side actions rely on flex `order` in `messageActions.css` to keep Edit ahead of More actions (history first, swipe last); update those rules if new right-side hosts are introduced.

## Mirror SillyTavern Native Flow
- Investigate upstream DOM flow before changing chat actions: review ST native edit/continue/swipe logic (selectors, event hooks, button semantics) and mirror it instead of re-implementing. Key sources: `public/scripts/script.js` (messageEdit, swipe), `public/scripts/events.js`, and the chat renderer markup.
- DOM parity over reshuffle: keep Astra inserts inside Astra-owned containers (`ensureActionContainer`); do not move or mutate ST-owned nodes. Trigger native actions (messageEdit, swipe_left/right, regenerate) rather than new logic to stay aligned with stable ST behavior.
- React/jQuery coexistence: mount React only in Astra slots; avoid ST-managed nodes (chat list, legacy drawers). MutationObservers already watch `#chat`; avoid adding parallel observers that might fight ST jQuery mutations.
- Event alignment: subscribe to ST lifecycle/events already used by the native flow (MESSAGE_EDITED, MESSAGE_SWIPED, GENERATION_* etc.) instead of DOM polling. Keep init idempotent to prevent duplicate handlers.
- Regression checks: when renaming classes/slots, update `ensureActionContainer`, CSS selectors, and host/components together, and verify the “edit release” flow (finish/cancel before new edit) remains identical to ST’s default behavior.
