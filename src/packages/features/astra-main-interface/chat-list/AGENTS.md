## Purpose

- Own the reusable Astra main-interface chat-list experience.
- Keep Global, Current Character/Group, and Favorite chat lists behavior-aligned without section folders importing each other's internals.

## Owned Paths / Responsibilities

- `ChatListExperience.tsx` owns shared search, sorting controls, preview-line controls, incremental loading, empty states, row action wiring, export/actions drawer, category assignment drawer entry point, and Global/Current row adapters.
- `ChatCatalogRowActionDialog.tsx` owns chat-row rename/delete confirmation UI plus the shared chat identity header used by chat-list and category assignment surfaces.
- `chatMenuDisplayPreferences.ts` owns chat-list browser localStorage keys, defaults, guards, readers, and persistence helpers.
- `useChatCatalogEntryOpenController.ts` owns chat-list opening state and inline errors, and starts the shared chat-switch loading coordinator before Astra-initiated chat opens.

## Rules

- Use `astra-main-interface-chat-row*` as the shared row selector family for Global, Current, and Favorite chat rows. Current and Favorite scoped rows may keep `astra-main-interface-current-chat-row` as a root-only identity hook, but do not add `astra-main-interface-current-chat-row__*` child selectors.
- Keep Global and Current/Favorite storage keys compatible. Do not rename existing `astra_projecta.astra_main_interface.chat_menu.*` or `astra_projecta.astra_main_interface.current_chat_menu.*` keys without an explicit migration slice.
- Route category assignment persistence through `src/packages/core/st/chat-categories`; never write category assignments directly to `extensionSettings` here.
- Keep direct SillyTavern chat catalog access in `src/packages/core/st/chat-catalog` or `src/packages/core/st/current-chat-catalog`. This folder consumes stores, snapshots, and injected actions.
- Keep section-specific copy and store selection outside this folder. Section adapters pass copy keys, filter/sort adapters, stores, and action implementations into the chat-list experience.
- Favorite chat lists reuse the Current row adapter and Current preference contract until a separate Favorite preference contract is explicitly added.
- Keep CSS tests focused on selector presence and cursor/interaction affordance contracts, not hand-tuned visual property values.
- Do not hide the shared chat-switch overlay on successful opens here; the mobile `chat-switch-loading` coordinator owns successful hide timing after `CHAT_CHANGED` and message DOM settle.

## Update Triggers

- Update this file when chat-list storage keys, row selector contracts, drawer ownership, open feedback behavior, or section adapter responsibilities change.
