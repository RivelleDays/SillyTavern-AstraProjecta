## Purpose

- Own the current-chat message search/replace controller, mobile search UI fragments, and best-effort rendered message highlighting.

## SillyTavern Touchpoints

- Search reads the active `SillyTavern.getContext().chat` message bodies through core adapters only.
- Replace writes message text through the shared chat message edit adapter so active swipe text, message events, DOM updates, and chat saving follow the existing edit path.
- Highlighting is best-effort over currently rendered `#chat .mes .mes_text` nodes and must be fully cleared on close, unmount, or recompute.

## Rules

- Keep controller state session-local and in memory; do not persist queries, replace text, match indexes, undo, redo, or derived indexes in extension settings.
- Keep UI components framework-owned and side-effect-light; SillyTavern context access belongs in `src/packages/core/st`.
- Stable singular anchors belong in `contracts/dom.ts`; repeatable styling hooks use the `astra-chat-message-search` block.
- Search controls may replace the mobile top bar and composer only while the shared store is open.
