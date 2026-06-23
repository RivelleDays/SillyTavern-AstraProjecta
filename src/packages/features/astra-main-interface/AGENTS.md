## Purpose

- Own the AstraProjecta entry / Astra main interface content.
- Keep future entry-page behavior out of the mobile panel shell so the content can grow independently.

## Owned Paths / Responsibilities

- `AstraMainInterface.tsx` owns the feature root rendered inside the mobile Astra main interface panel, first-level scope routing, and body switching.
- `AstraMainInterfaceScopeStrip.tsx` owns the compact first-level avatar scope strip used by the mobile panel header.
- `chat-list/` owns shared chat-list search, sort, pagination, display preferences, reusable row overlay state, row action dialogs, export/actions drawer, open-with-loading feedback, and Global/Current row adapters.
- `chat-categories/` owns shared Astra category UI, category trees, create rows, category assignment drawer behavior, and category-page chat row rendering.
- `global/` owns Global page tabs, Global tab defaults, Global route descriptors, Global chat-list adapter wiring, and the Global category page composition.
- `current-context/` owns Current Character/Group page tabs, Current tab defaults, Current route descriptors, Current scoped chat-list adapter wiring, and Current category page composition.
- `favorite-context/` owns Favorite character/group page tabs, Favorite tab defaults, Favorite route descriptors, Favorite scoped chat-list composition, and Favorite category page composition.
- `astra-main-interface.css` owns the Astra main-interface feature styling imported through `src/styles/globals.css`.
- `index.ts` owns the public exports for this feature.

## Rules

- Keep mobile shell placement in `src/app/mobile/astra-main-interface-panel`.
- Keep first-level navigation behavior feature-owned, even when the rendered controls are placed in the mobile panel header through the panel shell's header content slot.
- Preserve first-level scope ordering: Global is fixed first, Current Character/Group is fixed second, and favorite character/group scopes follow inside a horizontally scrollable Astra `ScrollArea`.
- Treat favorite scope values such as `favorite:character:<id>` and `favorite:group:<id>` as Astra body-routing metadata when supplied through controlled state. User clicks on Favorite scope buttons are an explicit native-activation feature: route the entity through the core chat-catalog activation action, keep the existing scope on failure, and collapse successful activation to `current-context` before closing the panel.
- Keep Favorite activation transaction state in the main-interface feature. The scope strip may coordinate chat-switch loading, single-flight button disabling, success close, and failure toast behavior, but it must not implement SillyTavern selectors or context verification locally.
- Consume favorite character/group header data from `src/packages/core/st/favorite-chat-entities`; do not duplicate favorite detection, group collage resolution, HotSwap sorting, or current-entity exclusion in this feature.
- Render the first-level scope strip as compact icon/avatar buttons. Do not add hero backgrounds, large titles, visible avatar labels, search buttons, or update buttons to this strip without a separate product slice.
- Keep top-level, Global, Current Character/Group, and Favorite tab state in memory only unless a later slice explicitly adds a persisted route or preference contract.
- Use the mobile panel's single secondary tabs list-frame as the active section's smooth-tabs host. Global, Current Character/Group, and Favorite page tabs must share that generic frame instead of introducing separate section-specific frame DOM.
- Keep secondary tab values, defaults, and route descriptors section-owned. The parent feature root may compose descriptors and ask a section for the active route key, but it must not hardcode child tab values such as shared `chats`/`categories` assumptions.
- Route all chat category persistence through `src/packages/core/st/chat-categories`; feature code may compose category UI and chat catalog snapshots but must not write directly to `extensionSettings`.
- Reuse `chat-categories/` for Global, Current, Favorite, and chat-row category drawer UI instead of creating section-specific category widgets.
- Reuse `chat-list/` for Global, Current, and Favorite chat-list flows instead of sharing list internals through `global/`, `current-context/`, or `favorite-context`.
- Keep direct SillyTavern chat catalog access in `src/packages/core/st/chat-catalog` for Global and `src/packages/core/st/current-chat-catalog` for Current/Favorite scoped bodies; this feature consumes adapter snapshots and actions.
- Chat menu display preferences are `chat-list/` browser localStorage values. Global and Current use separate keys under `astra_projecta.astra_main_interface.chat_menu.*` and `astra_projecta.astra_main_interface.current_chat_menu.*`. Favorite currently reuses Current chat-list controls until a separate Favorite preference contract is added.
- Use `astra-main-interface-chat-row*` as the shared chat row selector family for Global, Current, and Favorite rows. Current and Favorite scoped rows may keep `astra-main-interface-current-chat-row` as a root-only identity hook, but must not add `astra-main-interface-current-chat-row__*` child selectors.
- Do not place SillyTavern native main-interface route hosts here; those belong in `src/packages/features/sillytavern-interface`.
- Keep route descriptors compact and colocated with the section that owns the corresponding tabs.
- Chat settings shortcuts and preview loading are deferred to later slices.
