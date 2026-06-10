## Purpose

- Own the SillyTavern-backed scoped chat catalog for the currently active character/group and explicit Astra-selected character/group scopes.
- Translate `/api/chats/search` responses into reusable `ChatCatalogEntry` rows without depending on Global chat catalog state.

## SillyTavern Touchpoints

- Resolves the active character or group through `SillyTavern.getContext()` for Current views.
- Resolves explicit `character:<id>` and `group:<id>` targets through `SillyTavern.getContext()` for Favorite body views.
- Calls `/api/chats/search` with an empty query and either the resolved character `avatar_url` or resolved `group_id`.
- Uses public request headers, thumbnail helpers, and event bus names exposed by the SillyTavern extension context.

## Rules

- Do not bridge or scrape SillyTavern's native `select_chat_popup` DOM.
- Do not fetch all Global recent chats and filter them for Current or Favorite scoped views.
- Keep cache payloads per entity, versioned, and safe to discard.
- Ignore stale async refresh results when the active or explicit entity changes or a newer request wins.
- `createCurrentChatCatalogStore()` tracks the current SillyTavern entity and may refresh immediately when that active entity exists.
- `createScopedChatCatalogStore()` starts empty and must not fetch until `setEntity()` receives an explicit character/group scope.
- Keep UI rendering, local search widgets, and CSS selectors in feature folders.
