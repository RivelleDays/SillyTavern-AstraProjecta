## Purpose

- Own the SillyTavern-backed global chat catalog adapter for AstraProjecta.
- Translate `/api/chats/recent` responses and `SillyTavern.getContext()` entities into feature-safe chat entries.

## SillyTavern Touchpoints

- Consumes `SillyTavern.getContext()` for `characters`, `groups`, `getRequestHeaders`, `getThumbnailUrl`, `eventSource`, `eventTypes`, `executeSlashCommandsWithOptions`, `selectCharacterById`, `openCharacterChat`, `openGroupChat`, `saveSettingsDebounced`, `characterId`, `groupId`, `chatId`, and `getCurrentChatId`.
- `contracts/dom.ts` is the single audit point for native character/group row selectors and their jQuery/native click activation fallback.
- Fetches `/api/chats/recent` with SillyTavern request headers and an empty JSON body to load the complete recent-chat set.
- Uses the public event bus to refresh on chat, message, and group changes when event names are exposed.
- Uses a CharacterLibrary-inspired target-first jump pattern for inactive character/group chat opens: set the target `character.chat` or `group.chat_id` before native activation so SillyTavern does not first load the entity's previous chat.
- Uses public slash-command execution only as the inactive-group fallback when the native CharacterLibrary-style group row activation is unavailable or cannot be verified. If slash execution is unavailable, the group name is ambiguous, or the post-activation context cannot verify the requested group, the adapter returns a typed failure instead of importing SillyTavern core internals.
- `unstable-st-internals.ts` is the only allowed home for undocumented SillyTavern browser module imports used by arbitrary catalog-row rename/delete actions. Keep `/script.js`, `/scripts/group-chats.js`, and private export names out of `index.ts` and feature code.

## Failure Behavior

- Missing or malformed context produces an empty/error snapshot instead of throwing into the UI.
- Root chats and orphaned chats are excluded because this slice can only jump to resolved character or group chats.
- Missing open-chat APIs return typed failure results so the feature can keep the panel open and show an inline error.
- Missing rename/delete browser internals return typed failure results so callers can keep the action dialog open and show toast feedback. The unstable bridge should emit a warn-once diagnostic with `[AstraProjecta]` and any available SillyTavern version metadata.

## Rules

- Keep category, preview-loading, and per-entity menu behavior out of this adapter until later slices add those contracts.
- Keep chat jump, ordering, and loading behavior aligned with the documented target-first pattern without adding another extension as a runtime dependency.
- Keep raw native character/group list selectors out of `index.ts`; target-first activation must resolve and trigger rows through `contracts/dom.ts`.
- Keep arbitrary chat rename/delete operations lazy and action-scoped; do not add per-row module imports, subscriptions, or metadata hydration for the full catalog. Public SillyTavern extension surfaces do not currently expose arbitrary inactive-chat rename/delete, so this unstable bridge is a narrow exception rather than a general precedent.
- Keep cache payloads versioned and safe to discard.
