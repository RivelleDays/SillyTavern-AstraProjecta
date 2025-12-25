# Home View Agent Notes

## Purpose & Scope
- The files in `src/astra/app-shell/main/main-area/views/home/` render the SillyTavern “home” workspace inside the Astra shell.
- `homeView.js` owns the lifecycle of `#astraMainHomeView`: it sets `data-tab-id="home"`, toggles the primary heading slot for the breadcrumb (entity view) or hides it (browser view), and defers the main UI to the character browser runtime. Do not mount additional UI outside this container—other modules rely on it existing even when hidden.
- `homeCharacterBrowser.js` re-exports the browser runtime so other modules can keep their import path while the implementation lives under `browser/*`. Treat this file as the stable entry point—view-specific logic belongs in the `browser/` subtree. The runtime mounts the React search/filters row plus the card grid.
- `homeRouteStore.js` tracks the local “home view router” (`browser` vs `entity` view). Sidebar quick entries set the route to `entity` (with snapshot metadata) and homeView renders a breadcrumb heading plus an entity placeholder panel. Returning to `browser` keeps search/filter state intact.

## Browser Runtime Structure
- `browser/runtime/createHomeCharacterBrowser.js` handles orchestration: event listeners, refresh scheduling, DOM containers, search/filter controls, and coordination with card renderers. Keep it focused on state + lifecycle (grid recompute, stores, event hooks).
- Cards live in `browser/cards/*`. `createHomeCharacterCard.js` is the DOM factory (hero/cover, overlays, metadata, hover/focus affordances) while `homeCardData.js` contains derived data helpers (snapshots, creator info, tag signatures). Extend these modules when adding content to cards instead of expanding the runtime.
- Shared helpers under `browser/shared/` collect cross-cutting utilities (drag/drop guards, scroll persistence, avatar cache busting). If a feature needs to touch SillyTavern DOM or caching behaviour, add a helper in this folder so every renderer stays in sync.
- Grid layout is coordinated by `homeCardGridController.js` (column count, resize observers, sidebar transition watcher) plus `homeCardDensityStore.js` (user-selected columns). Keep density logic here; the runtime just wires the store and recomputes tracks.
- `homeCardTokenBridge.js` watches `#result_info_total_tokens` for the active chat and feeds precise token counts into cards; `homeCardTokenDisplay.js` reads/writes the per-character token cache and shows estimates until a precise value arrives.

## Data & Events
- All character data flows through `src/astra/shared/characters/characterData.js`. `createHomeCharacterBrowser` calls:
  - `collectCharacters` with the tag resolver so every consumer sees identical metadata.
  - `registerCharacterEventListeners` and `createCharacterRefreshScheduler` to debounce refreshes on ST events (`APP_READY`, `CHARACTER_*`, `CHAT_CHANGED`, etc.).
  - `getCharacterStats` → `createCharacterStatsLookup` to hydrate chat counts after the grid renders. Any new per-card data should follow this fetch/cache pattern or live in `characterData`.
- Search, sort, filter, and density state live in `views/home/state/*` stores:
  - `homeCharacterSearchStore.js` (query, sort choices, Fuse-backed ordering, localStorage persistence).
  - `homeTagFilterStore.js` (bridges SillyTavern’s `entitiesFilter` handle; keeps selected/excluded tag ids in sync).
  - `homeFavoriteFilterStore.js` (include/exclude/ignore favorite-only filter).
  - `homeCardDensityStore.js` (column count with legacy width mapping).
  - `homeCharacterBrowserStatsStore.js` (visible/total counts surfaced to the heading).
- Tokens: `homeCardTokenDisplay.js` estimates counts from prompt fields/data_size and caches precise values. `homeCardTokenBridge.js` listens to `#result_info_total_tokens` mutations and updates the active character’s card (and cache) with a labeled source id/label.
- Cards currently do **not** switch chats when clicked—intentionally read-only until UX decides otherwise. If you add interactions, wire them through the same selectors (`selectCharacterById`, `openCharacterChat`) already abstracted in the sidebar cards.

## Character Details Field Map
- Character Info
  - Description → `data.description`
  - Greeting Message → `data.first_mes`
  - Alternate Greetings → `data.alternate_greetings` (array)
- Character Behavior
  - Example Messages → `data.mes_example`
  - Scenario → `data.scenario`
  - Character’s Note (Depth Prompt) → `data.extensions.depth_prompt` (fields: `prompt`, `depth`, `role`)
    - Role picker uses `ResponsiveDialog` on mobile to avoid stacked dropdown issues; desktop stays with shadcn Select.
  - Talkativeness → `data.talkativeness` (numeric slider value; see `talkativeness_default`)
  - Personality → `data.personality`
- Prompt Overrides
  - Main Prompt → `data.system_prompt`
  - Post-History Instructions → `data.post_history_instructions`
- Creator’s Metadata
  - Creator (Created by) → `data.creator`
  - Character Version → `data.character_version`
  - Creator’s Notes → `data.creator_notes`
  - Tags to Embed → `data.tags` (array or comma-delimited string depending on source)
- Tokenization expectations: SillyTavern uses the active tokenizer (OpenAI/LLaMA/Claude/etc.) via `/api/tokenizers/*/count` for precise counts; only falls back to `guesstimate` on tokenizer failure. Precise counts in Astra’s home view currently arrive only for the active chat (via `#result_info_total_tokens`); other characters rely on estimates or cached values unless you call the tokenizer directly.

## Character Details Implementation Notes
- Do not switch chats to show another character’s data. Avoid `selectCharacterById` (clears chat and changes `this_chid`); read from `characters[id]` directly.
- Handle shallow entries: call `unshallowCharacter(id)` (server `/api/characters/get`) before reading details to ensure fields like `data_size` and prompt text are loaded.
- Editing without chat switches: use `/api/characters/merge-attributes` (see `cardActionsController`) to patch `data`/extensions for a given avatar/name; emit `CHARACTER_EDITED` or refresh `getCharacters()` to keep UI in sync.
- Token counts: precise totals for a character only stream for the active chat via `homeCardTokenBridge` observing `#result_info_total_tokens`. For other characters, use `homeCardTokenDisplay` estimates or invoke the tokenizer directly (`countTokensOpenAIAsync` et al.) if you need precise counts per field without switching chats.
- Data availability surfaces: `collectCharacters` pulls the global `characters` array; metadata like tags comes from `resolveCharacterTagsResolver`. Keep the Details view read-only unless explicitly writing back through the merge API.
- Preserve caches: token cache slots key on character identity + version + field hash (`homeCardTokenDisplay`). If you mutate prompt fields, consider clearing or refreshing the cache for that character to avoid stale counts.

## Layout & Styling
- Global styling lives in `homeView.css`. Key rules:
  - Cards use a hero cover with overlayed name/actions. `showcase` keeps a stacked content column (`.astra-home-card__content`) below the hero; `classic-portrait` nests `.astra-home-card__headerSlot` + `.astra-home-card__content` inside the hero overlay so the grid rows stay visually even.
  - Tags default to a single row and expand to two on hover/focus. Adjust `--home-card-tag-row-height` and keep new text inside `.astra-home-card__info`.
  - Grid density is controlled via CSS vars set by `homeCardGridController` (`--home-card-grid-track-size`, `--home-card-grid-columns`) plus tokenized spacings. The slider in `HomeCardDensityControl` drives column count; avoid hard-coding widths.
  - Message counts use the Lucide “messages-square” icon (`.astra-home-card__messagesIcon`). Token counts render via `.astra-home-card__tokenEstimate` with accuracy state (`data-token-accuracy`).
- Keep padding/margins tokenized (use `var(--space-*)`, `var(--radius-*)`, etc.). Only add literal values when there’s no matching token and document them.
- SillyTavern listens for drag/drop on the whole body to import character cards. To prevent accidental imports when users drag media around the home grid, both `.astra-home-card__avatar` and `.astra-home-card__notes` call `preventCharacterImportDrop()`; their media elements are forced to `draggable=false`. If you add new media surfaces, reuse the helper so events don’t bubble to SillyTavern’s importer.

## Extensibility Guidelines
- When adding new controls (filters, sort options, density tweaks), extend the existing stores/components (`views/home/state/*`, `components/*`) instead of sprinkling DOM in the runtime. Keep shared logic reusable between desktop (popover) and mobile (drawer) surfaces.
- Runtime already owns the only renderer (grid). If you introduce another layout, add a clear registration path and keep layout-specific work isolated from the orchestration layer; update `browser/index.js` accordingly.
- Any new async work should tie into the existing `refreshToken` guard so race conditions don’t revert the DOM after a newer refresh finishes.
- Prefer non-destructive updates when possible—if you need to preserve scroll position, use the same pattern as the sidebar cards (capture container scrollTop before reflow).
- Card actions are split across small modules: `HomeCardActions.jsx` orchestrates state, `HomeCardActionMenu.jsx` renders the favorite/menu buttons (and portals into `slots.menu` when present), and `dialogs/` contains `SourceConfirmDialog.jsx` and `ReplaceCharacterDialog.jsx`. The responsive dialog wrapper now lives at `src/astra/shared/ui/ResponsiveDialog.jsx`. Shared helpers (icons, drag/drop utils, portal host resolver) live beside these components. Extend these files rather than re-inlining SVGs or dialog markup so future tweaks stay centralized.
- Token cache/bridge: if you add token-dependent UI, read from `homeCardTokenDisplay`/`homeCardTokenBridge` instead of querying SillyTavern DOM directly, and preserve the source id/label metadata when writing cache entries.

## Testing & Validation
- Run `npm run lint` after changes; the home view mixes DOM + React controls, so eslint coverage is the first guard.
- Add unit tests for new store logic (search/sort/filter/density/state persistence) rather than duplicating data helpers in the runtime. Character data regressions belong under `src/astra/shared/characters`.
- Manual QA checklist:
  1. Load SillyTavern with varied character metadata (creator notes, tags, versions, message stats, token-heavy cards). Confirm cards render correctly and token estimates show; switch chats to see precise token updates propagate.
  2. Exercise search + sort + tag filters + favorite filters + density slider. Confirm counts in the heading update, filters persist, and grid columns recompute during sidebar transitions/resizes.
  3. Test desktop (popover) vs mobile (<768px) filter surfaces (drawer). Verify tag/favorite filters, dialogs, and sliders stay usable and do not break scroll.
  4. Trigger ST events (rename character, edit card, swap chats, TAGS_UPDATED) and verify the browser refreshes via shared event hooks.
  5. Smoke card actions: favorite toggle, source open/confirm dialog, replace from URL/file (happy path + error surfaces). Ensure drag/drop on notes/avatars does not import cards inadvertently.
