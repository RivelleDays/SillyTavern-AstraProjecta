## Purpose

- Own the SillyTavern-backed favorite character/group entity list used by the Astra main-interface header selector.
- Keep favorite detection, avatar resolution, current-entity exclusion, and aggregate chat statistics in one reusable adapter.
- Prepare data for Astra-owned routing without making this adapter render UI or activate SillyTavern chats.

## Owned Paths / Responsibilities

- `index.ts` owns favorite entity snapshot reading, scope-value helpers, optional store wiring, and the default visible favorite cap.
- `index.test.ts` owns behavior coverage for favorite sources, avatar data, aggregate sorting, current-entity exclusion, caps, fallbacks, and scope parsing.
- This folder owns only favorite entity metadata. The visible avatar strip, horizontal `ScrollArea`, active styling, and panel body rendering belong to feature/app layers.

## SillyTavern Touchpoints

- Read character and group metadata only through `SillyTavern.getContext()`.
- Character favorite status is true only when `character.fav` or `character.data.extensions.fav` is boolean `true` or string `"true"`.
- Group favorite status is true only when `group.fav` is boolean `true` or string `"true"`.
- Use existing `src/packages/core/st/chat-avatar` helpers for character thumbnails, custom group avatars, and group member collage URLs.
- Use existing `ChatCatalogEntry[]` snapshots for chat counts, total message counts, and latest-message timestamps. Do not fetch recent chats here.
- If a `ChatCatalogStore` is supplied to the optional store, subscribe to it and derive ordering from its current snapshot; do not create a second global chat catalog request.
- Event subscriptions may refresh local metadata on public context events such as character edits, group updates, settings updates, and chat changes, but they must stay coalesced and dispose cleanly.

## Sorting And Scope Rules

- Default visible favorite limit is `25`, matching SillyTavern HotSwap's hard cap rationale without depending on HotSwap DOM or implementation.
- The visible cap applies only after fixed header entries: Global remains first, Current Character/Group remains second, and scrollable favorites follow.
- Exclude the active character/group from the scrollable favorite list because the current context is represented by the fixed second entry.
- Sort visible favorites by total message count descending, then latest message timestamp descending, then entity name, then scope value for stable ties.
- Missing or null message counts contribute `0`; missing latest-message timestamps sort as older than known timestamps.
- Favorite body scopes use `favorite:character:<id>` and `favorite:group:<id>` values. These scope values are Astra routing metadata only and must not trigger SillyTavern HotSwap behavior by themselves.

## Forbidden Patterns

- Do not import `/script.js`, `/scripts/RossAscends-mods.js`, `favsToHotswap()`, or other SillyTavern browser modules from this adapter.
- Do not scrape or reuse `#HotSwapWrapper`, `.hotswap`, `.character_select`, `.group_select`, or Character Management DOM nodes.
- Do not call `/api/chats/recent`, `/api/chats/search`, or character/group write endpoints from this folder.
- Do not perform SillyTavern active chat switching here. The Astra main-interface feature owns Favorite header click behavior and delegates native activation to `src/packages/core/st/chat-catalog`; this adapter remains metadata-only.
- Do not add React components, CSS selectors, `ScrollArea`, or visual affordance code in this folder.

## Failure Behavior

- Missing `SillyTavern.getContext()`, malformed `characters`, or malformed `groups` must produce an empty snapshot, not throw into feature UI.
- Missing avatar metadata should fall back through `chat-avatar` behavior.
- Storage and network are intentionally out of scope. This adapter should remain cheap to construct after the main-interface panel opens.

## Performance Rules

- Keep snapshot reads linear in character count, group count, and supplied chat catalog entry count.
- Build avatar lookup maps once per snapshot so group collage resolution does not repeatedly scan all characters.
- Coalesce event-driven store refreshes with a microtask and clear every event listener on dispose.
- Do not instantiate this data path before the mobile main-interface panel has opened at least once.

## Update Triggers

- Update this file whenever favorite source fields, scope-value shape, sorting policy, cap policy, SillyTavern touchpoints, or future body-switch behavior changes.
