## Purpose

- Own shared Astra main-interface category UI for Global, Current Character/Group, Favorite scopes, and chat-row assignment drawers.
- Keep category presentation reusable while persistence stays in `src/packages/core/st/chat-categories`.
- Keep chat categories flat. Any tree or accordion wording in this folder describes presentation and grouping only, not nested category data.

## Owned Paths / Responsibilities

- Category create rows, scope selectors, category accordion/tree rendering, category chat rows, and assignment drawer staging.
- Cross-section category UI behavior shared by `global/`, `current-context/`, and `favorite-context/`.
- UI-only helpers for deriving owner/global category groups from `ChatCategoryStore` snapshots and `ChatCatalogEntry` lists.
- Future category and category-chat reorder controls, while persistence and normalization remain in `ChatCategoryStore`.

## Rules

- Persist category changes only through `ChatCategoryStore`; do not read or write `extensionSettings` directly here.
- Use staged draft state in assignment drawers. Checkbox changes must not persist until the user activates Save; Close must cancel the draft.
- Global categories are available everywhere. Owner categories must be scoped by `ownerType` plus `ownerId` and must only render with chats from the currently supplied catalog entries.
- Category UI must treat owner/global sections as flat groups. Do not add nested category controls, parent pickers, recursive folder rendering, breadcrumb paths, or folder-style inheritance.
- Same category display names may appear in different scopes. UI duplicate messages should reflect the store result instead of doing independent scope inference.
- Category create and rename flows must follow the store name contract: trim, non-empty, 64 Unicode code points maximum, no control characters, Unicode/CJK/emoji allowed, and same-scope case-insensitive uniqueness.
- Category pages must render large categories incrementally. Initial category chat rows are capped at 50 with an explicit Load more action.
- Keep all user-facing strings in `locales/en.json` and access them through typed i18n keys.
- Keep CSS assertions limited to stable structure and cursor/interaction affordances, not exact visual values.
- Category row actions such as create, rename, delete, assign, and future reorder must stay accessible through button, checkbox, dialog, drawer, or menu primitives from the local UI wrapper layer.
- Global category rename/delete actions are the first category management action slice. Keep them implemented through scope-aware shared category UI so Current/Favorite owner-scoped category actions can reuse the same drawer and store pathways after the Global layout and behavior settle.
- Do not enable Current/Favorite owner-scoped category rename/delete buttons until that later slice explicitly defines their layout, copy, and scope-specific behavior.
- Category assignment drawers must keep create-category support scoped to the current drawer context and must not persist draft checkbox changes until Save.
- Category pages must render category chat rows from the supplied `ChatCatalogEntry[]` only. Do not fetch chats or hydrate chat metadata from this folder.
- Astra-owned chat rename/delete synchronization belongs to the shared chat-list flow calling `moveChatKey()` and `removeChatKey()`. Native SillyTavern or other-extension reconciliation is a future cleanup slice, not a hidden UI responsibility here.

## Future Drag Sorting

- Use `@dnd-kit` for future drag sorting through an Astra-owned React adapter or primitive; do not use SillyTavern SortableJS, jQuery Sortable, or feature-local drag implementations.
- Do not standardize on `react-sortable-hoc`; its upstream project is maintenance-only and depends on React DOM behavior that is expected to be removed in future React versions.
- Drag interactions must support pointer, touch, and keyboard sorting, and must respect reduced-motion expectations.
- Persist reorder only after a committed sort action. Intermediate drag state should remain local UI state.
- Category reorder must stay within the same scope. Global categories reorder only within global order; owner categories reorder only within their own owner scope.
- Category chat reorder must persist through `categories.chatOrder` by calling a store mutation such as `setCategoryChatOrder()`.
- Category-level drag UI must wait for a dedicated store method for reordering `categories.order.global` and `categories.order.owner`; do not write those structures directly from React components.
- Drag handles, drop indicators, and sortable item selectors are interaction contracts. Cover their stable selectors and cursor affordances with focused tests, but do not assert hand-tuned visual values.

## Update Triggers

- Update this file when category UI ownership, assignment staging, owner/global grouping, name validation, incremental rendering, drag sorting, or category action behavior changes.
