## Purpose

- Own SillyTavern state adapters used by AstraProjecta features.
- Keep DOM/state observation, event subscriptions, and snapshot contracts centralized under `packages/core`.

## Owned Paths / Responsibilities

- `context.ts` for safe `SillyTavern.getContext()` access.
- Snapshot readers and stores for current-user avatar, current chat identity, shared chat avatar resolution, primary send action, quick shortcuts, message actions, and future chat-session adapters.
- `current-chat-catalog/` owns the scoped chat catalog for the currently active character/group and explicit Astra-selected character/group scopes, including per-entity cache and `/api/chats/search` normalization.
- `chat-categories/` owns extension-settings backed global and owner-scoped chat category persistence, membership maps, and chat key maintenance.
- `favorite-chat-entities/` owns the favorite character/group entity snapshot used by future Astra main-interface header navigation, including favorite detection, chat-catalog stat aggregation, current-entity exclusion, default capping, and scope-value helpers.
- `chat-message-revisions/` owns extracted single-message Revision History helpers and is the migration target for storage, baseline capture, generation transactions, operations, tree reading, and store code.
- Message Revision History core ownership:
    - `chatMessageRevisionData.ts` owns the storage adapter. It reads Astra namespaced history from `message.astra_projecta.revisionHistory.roots`, falls back to legacy `message.continueHistory`, writes only to the Astra namespace, and removes derived runtime pointers (`continueSwipe`, `continueSwipeId`, `_astraContinueCachedText`) from newly touched messages.
    - `chatMessageRevisionHistory.ts` owns the read-only all-message Revision history availability snapshot. It may inspect current loaded chat messages and public message DOM metadata, but it must not hydrate, normalize, or mutate SillyTavern chat message data.
    - `chatMessageRevisionTree.ts` owns the lazy selected-message tree snapshot used by the Drawer. It returns storage-shaped native SillyTavern swipe roots in `roots`, and returns selected-swipe presentation rows in `displayRoots`, where the true original root and full root-replacement variants such as Regenerated rows can appear as peer top-level entries while keeping their original storage paths.
    - `chatMessageRevision.ts` owns write actions: continue, regenerate, undo, applying a revision path, applying a native swipe path, and keeping namespaced roots aligned when SillyTavern deletes a native swipe.
- `chatMessageDeletion.ts` owns narrow public-context message deletion calls used by Astra-owned UI surfaces. Astra-owned UI must collect confirmation before calling this adapter; the adapter itself only validates input and calls `SillyTavern.getContext().deleteMessage`.
- `chatMessageEdit.ts` owns Astra message edit draft reads and save/copy/move mutations. It uses public `SillyTavern.getContext()` fields only, including `chat`, formatting helpers, event surfaces, `printMessages`, and chat save functions; it must not import private SillyTavern edit modules or depend on native edit textarea DOM.
- Shared adapter utilities that stay product-layout agnostic.
- `native-drawers/` for reusable live-node bridges that port SillyTavern-owned drawer roots into Astra-owned hosts while preserving restore paths.
- `native-companions/` for reusable live-node bridges that port SillyTavern-owned non-drawer companion roots into Astra-owned hosts while preserving restore paths and original attributes.

## Folder Rules

- `chat-avatar/` owns reusable character/group avatar URL resolution and group member collage thumbnail data.
- `chat-identity/` is the only home for current chat role/group identity resolution and chat filename fallback order.
- `favorite-chat-entities/` owns favorite character/group list derivation and may consume `chat-avatar`, `SillyTavern.getContext()`, and existing global `ChatCatalogEntry[]` data only.
- Feature/UI code must not re-read `group.avatar_url`, manually compose group member thumbnails, or invent its own current-chat filename fallback chain.
- Consumers should depend on the exported current-chat snapshot/store contract instead of rebuilding identity state locally.

## SillyTavern Touchpoints

- Adapters here may observe public DOM anchors like `#send_textarea` or `#user_avatar_block` only when no public event/state API exists.
- Every adapter must degrade to a clean fallback snapshot when ST context or anchors are missing.
- Canonical persisted data should use documented SillyTavern extension surfaces where practical: `extensionSettings` plus `saveSettingsDebounced()` for global extension state, and `chatMetadata` plus `saveMetadata()` only for state truly bound to the active chat.
- Message Revision History reads only the currently loaded `SillyTavern.getContext().chat`; it must not scan chat files, index disk data, perform whole-chat migrations, add server endpoints, or import SillyTavern core modules directly.
- Current chat catalog may call `/api/chats/search` only for the resolved active character/group or an explicit Astra-selected character/group scope. It must not bridge `select_chat_popup`, scan the global `/api/chats/recent` catalog for Current/Favorite views, or introduce a server plugin dependency.
- Chat categories may read and write only `extensionSettings.astra_projecta.chatCategories` through `SillyTavern.getContext()` and `saveSettingsDebounced()`. They must not fetch chat lists, add server endpoints, or introduce a server plugin dependency.
- Favorite chat entities must not call chat APIs, import SillyTavern browser modules, scrape `#HotSwapWrapper`, or reuse `favsToHotswap()`. It may reuse only the stable HotSwap ideas of favorite filtering and the `25`-item cap.
- SillyTavern native swipe data is canonical for candidate rows: `message.swipes`, `message.swipe_id`, and optional `message.swipe_info`. Astra revision data is additive and namespaced under `message.astra_projecta.revisionHistory.roots`.
- Legacy `message.continueHistory` remains read-only compatibility input. If an Astra write touches a legacy-only message, clone compatible roots into namespaced storage and leave the original legacy field in place.
- All-message history detection must include user, assistant, and system messages with detectable native swipes, namespaced Astra revision records, or legacy `continueHistory` records. It must stay separate from the last-message `chatMessageRevision` action store.
- Revision adapters may subscribe to SillyTavern context events when exposed through `eventTypes` / `event_types`: `CHAT_CHANGED`, render events, generation start/stop, `MESSAGE_EDITED`, `MESSAGE_SWIPED`, `MESSAGE_SWIPE_DELETED`, `MESSAGE_UPDATED`, and `MESSAGE_DELETED`.
- Current SillyTavern reference points, for orientation only: the public browser-side type declarations define message `swipes`, `swipe_info`, and `swipe_id`; the browser runtime creates/backfills swipes around `ensureMessageSwipes`, changes active swipe around `setSwipeId`, and deletes swipes in `deleteSwipe`, which emits `MESSAGE_SWIPE_DELETED`.
- Message edit adapters may update the active `message.swipes[message.swipe_id]`, optional `message.extra.reasoning`, visible `.mes_text` fallback DOM, and public context events such as `MESSAGE_EDITED`, optional reasoning events, and `MESSAGE_UPDATED`, then save the current chat.
- Native drawer and companion bridges may observe public roots such as `#user-settings-block` and `#completion_prompt_manager_popup`, but they must remain host-neutral and must never assume a mobile- or desktop-specific layout container.
- Shared event type declarations should include SillyTavern lifecycle names such as `APP_INITIALIZED` and `APP_READY` when adapters depend on startup or ready sequencing; feature modules still own their own startup guard behavior.

## Rules

- Keep snapshot/store outputs serializable and feature-friendly.
- Keep feature-specific rendering and CSS out of this folder.
- Prefer narrow selectors and event subscriptions over generic polling.
- `localStorage` and `localforage` may cache derived indexes or snapshots, but must not be the only source of truth for user-owned AstraProjecta data.
- Future sidecar JSON storage must be wrapped behind a core adapter, degrade gracefully when unavailable, and avoid server-plugin or custom-backend requirements.
- Keep Message Revision History performance lazy: action host rendering may do shallow availability checks only; full tree building belongs in `chatMessageRevisionTree.ts` and should run only after a specific history item is opened.
- Treat `[swipeIndex]` paths as true original/root selection in user-facing apply flows when Astra or legacy root data exists; only fall back to mutable native swipe text for native swipe-only history. Treat deeper paths as Astra revision node selection. Undo flows may explicitly apply a root revision path without changing native swipe semantics.
- Do not persist derived runtime pointers for revision history. Derive active state from each root's `active` path.
- Reusable native drawer bridges must preserve the live source node, capture origin parent/sibling/class state before attach, keep `openDrawer` normalization scoped to the attached period only, and restore on close, replacement, or dispose.
