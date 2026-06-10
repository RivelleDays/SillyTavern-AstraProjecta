## Purpose

- Own the Global area of the Astra main interface.
- Keep Global page tabs separate from Current Character/Group scoped pages.

## Owned Paths / Responsibilities

- `GlobalAstraMainInterface.tsx` owns the Global tab strip, tab values, default tab, route descriptors, and page switching.
- `GlobalChatListPage.tsx` owns the Global chat-list adapter: Global catalog store selection, Global filter/sort functions, Global chat actions, Global copy keys, and Global display preference wiring into `../chat-list`.
- `GlobalChatCategoriesPage.tsx` composes the shared category UI with the shared Global chat catalog store.

## Rules

- Keep Global tab state controlled by the parent Astra main-interface root.
- Keep Global tab values and route descriptors local to this folder so Global pages can diverge from Current Character/Group pages without parent-level route branching.
- Use `src/packages/features/astra-main-interface/chat-categories` for category UI and `src/packages/core/st/chat-categories` for category persistence.
- Use `src/packages/features/astra-main-interface/chat-list` for chat-list flow, controls, row action dialogs, export/actions drawer, and open-with-loading feedback.
- Keep Global chat list and Global categories on the same `ChatCatalogStore` instance when both pages are mounted from `GlobalAstraMainInterface`.
- Keep chat catalog data access routed through `src/packages/core/st/chat-catalog`.
- Keep Global rows on the `astra-main-interface-chat-row*` selector family by using the Global row adapter in `chat-list`.
- Keep user-facing copy in `locales/en.json` through typed i18n keys.
