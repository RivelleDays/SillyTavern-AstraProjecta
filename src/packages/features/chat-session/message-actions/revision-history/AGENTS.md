## Purpose

- Own the AstraProjecta Message Revision History Drawer UI.
- Keep this folder as a thin, lazy UI layer over `packages/core/st` revision adapters.
- Preserve SillyTavern compatibility by displaying loaded chat state only; never scan chat files from disk or depend on server plugins.

## Owned Paths / Responsibilities

- The inline last-message history trigger is rendered by the parent `RevisionBar`; this folder owns the lazy Drawer opened after a history item is selected.
- `RevisionHistoryDrawer.tsx`: lazy tree Drawer for the selected history item.
- CSS for this UI lives in the parent `message-actions.css` under `.astra-revisionHistory*` selectors.
- User-facing copy lives in `locales/en.json` under `messageActions.revisionHistory.*`; regenerate `src/types/i18n.d.ts` through `npm run i18n`.

## Architecture

- Availability is supplied by `createChatMessageRevisionHistoryStore()` / `readChatMessageRevisionHistorySnapshot()` in `packages/core/st/chatMessageRevisionHistory.ts`.
- The Drawer must build full tree data only after the user opens a selected item. Use `readChatMessageRevisionTreeSnapshot({ messageId, swipeIndex })`; do not pre-read every message tree from the action list.
- Tree rows are rendered from `displayRoots`, not directly from the storage-shaped `roots` list:
    - `nativeSwipe` rows represent the true original text for the selected SillyTavern swipe when Astra or legacy root data exists, falling back to native `message.swipes[]` only for native swipe-only history.
    - Full root-replacement `regenerate` and `edit` rows may be promoted beside the original as peer top-level entries while keeping their original path such as `[0, 0]`.
    - `continue`, partial `edit`, and other descendant rows stay nested under the display root they extend.
- Applying rows must go through `applyChatMessageRevisionPath({ messageId, path })`. UI code must not mutate `context.chat`, `message.mes`, `swipes`, `swipe_id`, or Astra revision storage directly.

## SillyTavern Touchpoints

- Source chat root: `#chat`.
- Source message selector: `#chat .mes[mesid]`.
- Public message metadata used by the history snapshot may include `.mesIDDisplay`, `.mesAvatarWrapper`, `.mes_avatar`, `.avatar`, and `.ch_name`.
- Applying a path updates the SillyTavern message text DOM through the core adapter and emits relevant SillyTavern events through `eventSource` when available.
- Native SillyTavern swipes remain the canonical candidate list for native swipe-only history. Once Astra or legacy revision roots exist, the stored root text is the canonical original for Revision History display and apply behavior. Astra-owned history is stored additively under `message.astra_projecta.revisionHistory.roots`, with legacy `message.continueHistory` read as fallback by core adapters.

## Rules

- Keep the Drawer lazy. Do not add background indexing, whole-chat tree construction, chat-file reads, or import-time migration.
- Keep this folder UI-only. Data normalization, legacy fallback, storage writes, swipe deletion alignment, and event handling belong in `packages/core/st`.
- Use stable paths from core tree nodes. `[swipeIndex]` selects a native SillyTavern swipe; deeper paths select an Astra revision under that swipe.
- Keep controls accessible: trigger labels must come from typed i18n keys, tree rows must keep `role="treeitem"`, and collapse controls must not trigger row apply clicks.
- Keep visual edits scoped to `.astra-revisionHistory*` selectors and parent message action layout selectors. Do not style SillyTavern-owned message content directly from this folder.
