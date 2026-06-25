## Purpose

- Own the Favorite character/group body pages inside the Astra main interface.
- Keep Favorite body rendering separate from the header favorite-entity data adapter and from SillyTavern native chat activation.

## Owned Paths / Responsibilities

- `FavoriteContextPage.tsx` owns Favorite secondary tabs, route descriptors, Favorite scoped chat-list composition through the Current/Favorite chat-list adapter, and Favorite category page composition.

## Rules

- Favorite page activation receives an Astra scope value such as `favorite:character:<id>` or `favorite:group:<id>` from the parent feature root.
- Use `src/packages/core/st/current-chat-catalog` scoped store support for lazy `/api/chats/search` loading. Do not call chat APIs from this folder directly.
- Reuse shared chat-list row actions for open, rename, delete, and export. Favorite body pages do not own header activation; the parent main-interface scope controller activates a clicked Favorite character/group, then routes successful switches through `current-context` without closing the main-interface panel.
- Use `src/packages/features/astra-main-interface/chat-list` through `CurrentChatListPage` for Favorite chat-list flow. Favorite currently reuses Current row selectors and Current preference keys until a separate Favorite preference contract is added.
- Use `src/packages/features/astra-main-interface/chat-categories` for category UI and `src/packages/core/st/chat-categories` for category persistence.
- Favorite category pages must show only owner-scoped categories for the selected favorite character/group, and chat rows inside each category must come only from that favorite's scoped chat catalog snapshot. Global categories remain available through chat row category assignment drawers, not the Favorite category page.
- Keep this folder free of favorite detection, favorite sorting, avatar resolution, or visible favorite selection. Those rules belong to `src/packages/core/st/favorite-chat-entities`.
