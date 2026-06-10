## Purpose

- Own the Current Character/Group area of the Astra main interface.
- Keep scoped Current UI separate from Global chat-list and category pages.

## Owned Paths / Responsibilities

- `CurrentContextPage.tsx` owns the Current Character/Group smooth tab strip, tab values, default tab, route descriptors, and scoped category page composition.
- `CurrentChatListPage.tsx` owns the Current/Favorite scoped chat-list adapter: scoped catalog store selection, scoped filter/sort functions, scoped chat actions, scoped copy keys, and Current preference wiring into `../chat-list`.

## Rules

- Use `packages/core/st/current-chat-catalog` for scoped Current chat data. Do not fetch the Global recent-chat catalog and filter it in this feature.
- Use `src/packages/features/astra-main-interface/chat-categories` for category UI and `src/packages/core/st/chat-categories` for category persistence.
- Use `src/packages/features/astra-main-interface/chat-list` for shared chat-list flow, controls, row action dialogs, export/actions drawer, and open-with-loading feedback.
- Current category pages must show owner-scoped categories for the active character/group plus global categories, but chat rows inside each category must come only from the scoped Current chat catalog snapshot.
- Do not bridge or scrape SillyTavern's native `select_chat_popup` DOM from this folder.
- Current and Favorite chat rows use the shared `astra-main-interface-chat-row*` child selector family from `chat-list`. They may keep `astra-main-interface-current-chat-row` as a root-only identity hook, but must not add `astra-main-interface-current-chat-row__*` child selectors.
- Keep Current Character/Group secondary tab state controlled by the parent Astra main-interface root.
- Keep Current Character/Group tab values and route descriptors local to this folder so scoped pages can diverge from Global pages without parent-level route branching.
- Use the shared mobile secondary tabs list-frame portal target when the mobile shell provides it; do not create a Current-only panel frame.
- Keep user-facing copy in `locales/en.json` through typed i18n keys.
