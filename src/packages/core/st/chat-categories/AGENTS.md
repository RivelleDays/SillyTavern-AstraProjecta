## Purpose

- Own the SillyTavern extension-settings backed chat category store for AstraProjecta.
- Keep global and owner-scoped category persistence independent from chat catalog fetching and UI rendering.

## Storage Contract

- Persist under `extensionSettings.astra_projecta.chatCategories`.
- Schema version `1` stores `categories.byId`, `categories.order.global`, `categories.order.owner`, `categories.chatOrder`, and `chatMap`.
- Chat membership keys are existing `ChatCatalogEntry.key` values and must not invent a second chat identity format.
- Stored state must be safe to normalize and discard when malformed.
- Keep category names, scopes, order, and `chatKey -> categoryIds` membership as the canonical settings payload.
- Do not store full chat objects, message previews, search indexes, last-message snapshots, or other large derived data in category settings.
- If category-related derived data grows large, add a separate adapter or cache layer while preserving the minimal settings schema as the canonical source of truth.

## Name Contract

- Category names are user-facing labels, not ids.
- Normalize category names by trimming leading and trailing whitespace before validation, duplicate checks, and persistence.
- Names must be non-empty after trimming, at most 64 Unicode code points, and free of control characters.
- Allow ordinary Unicode, including CJK text and emoji.
- Enforce case-insensitive uniqueness within the same category scope only. The same display name may exist in a different global or owner scope.
- Persist the trimmed display name and a normalized `nameKey` used only for duplicate detection and lookup.

## Scope Contract

- Chat categories are flat. Do not add parent ids, children arrays, path strings, recursive traversal, or nested category semantics to this schema.
- `global` categories apply to every character and group chat catalog.
- `owner` categories are scoped to exactly one `ownerType` plus `ownerId`, where `ownerType` is `character` or `group`.
- A category must not move between `global` and `owner` scopes through rename, reorder, assignment, or drag behavior.
- Same-scope operations must not inspect UI labels to infer scope; use stored `scope`, `ownerType`, and `ownerId`.

## Ordering Contract

- `categories.order.global` is the durable order for global categories.
- `categories.order.owner[ownerKey]` is the durable order for categories owned by one character or group, where `ownerKey` is derived from `ownerType` and `ownerId`.
- `categories.chatOrder[categoryId]` is the durable order for chat keys inside one category.
- Missing or malformed order data must normalize by keeping valid stored ids first, dropping missing or duplicate ids, and appending any valid unsorted ids by the fallback category order.
- `setCategoryChatOrder()` owns chat ordering inside an existing category.
- Category-level reorder fields already exist, but the public store mutation for category reordering is still missing. Add a focused store method before implementing category drag UI; do not mutate `categories.order.*` from feature code.
- Future drag reorder must stay within the same category scope. Dragging must not convert an owner category into a global category, or a global category into an owner category.

## Rules

- Read and write only through `SillyTavern.getContext()` and `saveSettingsDebounced()`.
- Do not fetch chats, open chats, import SillyTavern browser modules, or render React from this folder.
- Keep `global` categories available to every chat and `owner` categories scoped to one character or group.
- Continue using existing `ChatCatalogEntry.key` values for membership identity unless a future migration explicitly changes the chat identity contract.
- Failed validation such as empty names, duplicate names, invalid scopes, and missing ids must not write settings.
- Successful mutations must dispatch `CHAT_CATEGORIES_CHANGE_EVENT` so multiple mounted Astra surfaces stay in sync.
- Mutations must return typed success or failure results instead of throwing for normal validation failures.
- Deleting a category must remove it from category order, chat order, and every chat membership list.
- Assigning categories to a chat must drop unknown category ids, de-duplicate ids, preserve valid order from the caller, and remove empty chat-map entries.
- Astra-owned chat rename and delete flows must update category membership through `moveChatKey()` and `removeChatKey()`.
- Native SillyTavern or other-extension chat rename/delete reconciliation is a future cleanup slice unless a stable SillyTavern event contract is added.
- Cacheable or derived catalog data belongs in the chat catalog adapters, not in this store.

## Normalization And Migration

- Every read should tolerate missing settings, unknown versions, malformed records, invalid scopes, empty names, unknown category ids, duplicate ids, and stale chat keys.
- Normalization may discard malformed data, but must not throw into UI callers.
- Keep schema changes versioned and idempotent. Future migrations should preserve valid user categories, memberships, and order whenever possible.
- Do not add compatibility imports from older extensions or SillyTavern internals here; migration from external data should be an explicit adapter slice.

## Update Triggers

- Update this file whenever the category schema, chat key shape, mutation contract, SillyTavern touchpoints, or cross-surface event behavior changes.
