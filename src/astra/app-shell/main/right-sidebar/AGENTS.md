# AstraProjecta Right Sidebar Guide (src/astra/app-shell/main/right-sidebar)

Scope: Everything under this folder. This guide documents structure, contracts, and the custom integration patterns for the right sidebar. It extends the root AGENTS.md, src/astra/AGENTS.md, and src/astra/app-shell/AGENTS.md.

Use English for code, docs, and comments. Follow the project conventions in the root AGENTS.md (factories over classes, tokens, no direct React in ST-owned DOM, etc.).

## Purpose
- Present character/group context and tools without fighting SillyTavern’s DOM ownership.
- Bridge legacy ST drawers into Astra surfaces (AI Settings, Backgrounds) while keeping ST scripts functional.
- Provide compact, event-driven panels: Entity Info, Lore, Chat Info, Backgrounds, Character Portrait.

## Anatomy

```
right-sidebar/
├─ index.js                         # Public exports for the right sidebar module
├─ rightSidebar.js                  # Factory: compose controller + view
├─ rightSidebarController.js        # State + persistence + event-driven label updates
├─ rightSidebarView.js              # DOM: buttons, panels, ARIA, trigger registry
├─ runtime/
│  └─ createRightSidebarRuntime.js  # Orchestrator: buttons in primary bar, AI Settings hydration, lore wiring
├─ state/
│  └─ loreState.js                  # Persisted options + ephemeral lore state
├─ panels/
│  ├─ lore-info/                    # Lore UI: tabs, accordion, controls, services
│  ├─ chat-info/                    # Chat Info tabs (Author's Note + advanced controls; Studio removed)
│  ├─ portrait/                     # Zoomed avatar + expressions stub + avatar dataset
│  └─ entity-info/                  # Entity info panel (character/group) + toolbar tabs
```

CSS files live next to their features (e.g., `panels/lore-info/loreInfo.css`, `panels/entity-info/entityInfo.css`, `panels/portrait/characterPortrait.css`). Use kebab-case for CSS and lowerCamelCase for JS. Keep styles scoped to Astra containers and classes.

## Core Contracts

Controller (`rightSidebarController.js`)
- State shape: `{ activePanel: string|null, lastPanel: string, isOpen: boolean }`.
- Methods:
  - `togglePanel(panelId?)` – Toggle open/close; if provided, switches to `panelId` or closes when same.
  - `openPanel(panelId)` / `closePanel()` – Explicit controls.
  - `setLastPanel(panelId)` / `getLastPanel()` – Remember last used panel.
  - `setPanelIds(ids: string[])` / `isValidPanelId(id)` – Whitelist of available panels.
  - `setPersistHandler(fn)` – Called with `{ activePanel, lastPanel, isOpen }` when state changes.
  - `subscribe(listener)` – State updates.
  - `getEntityInfoLabel()` / `subscribeToEntityInfoLabel(listener)` – Dynamic label for entity-info triggers.
- ST events: Subscribes to `CHAT_CHANGED`, `CHARACTER_PAGE_LOADED`, `CHARACTER_EDITED`, `GROUP_UPDATED`, `CHAT_DELETED`, `GROUP_CHAT_DELETED` to refresh labels.

View (`rightSidebarView.js`)
- Creates the aside (`#rightSidebar`) + content region + panel DOMs.
- Exposes buttons (primary bar right): `loreButton`, `chatInfoButton`, `backgroundButton`, `portraitButton`.
- Panels and IDs:
  - `lore` – Worlds/Lorebooks.
  - `chatInfo` – Author's Note + advanced controls (Studio tab retired).
  - `backgrounds` – Backgrounds drawer host.
  - `portrait` – Character avatar + expressions placeholder.
  - `entityInfo` – Character/Group info (toggled via triggers; not in the 4-button cluster).
- ARIA and semantics: Buttons toggle `aria-expanded`, active classes; entity-info triggers receive `aria-haspopup`, `aria-controls` and keyboard support (`Enter`/space) if not native buttons.
- Trigger registry: `registerEntityInfoTrigger(el)` wires clicks/keys to toggle entity-info and keeps labels in sync.
- External events:
  - `TOGGLE_ENTITY_INFO_PANEL_EVENT` – See `panels/entity-info/events/eventNames.js`. Listen on `document`.
  - `OPEN_CHARACTER_PORTRAIT_PANEL_EVENT` – See `panels/portrait/events/eventNames.js`. Listen on `document`.

Runtime (`runtime/createRightSidebarRuntime.js`)
- Injects buttons into the main primary bar right cluster via `primaryBarSlot.registerView({ id: 'chat', render })`.
- Hydrates the AI Settings left panel when its tab exists using `renderAiSettings()` and ports legacy drawers listed in `DRAWER_MAPPINGS`.
- Ports `Backgrounds` drawer into `rightSidebar.backgroundDrawerHost`.
- Wires Lore controller and UI, exposes persist handlers:
  - `persistHandlers.shell(fn)` – store shell-wide persistence.
  - `persistHandlers.rightSidebar(fn)` – store right-sidebar view state.
- Register surfaces:
  - `registers.hydrateAiSettingsTab()` – Call when the sidebar has mounted.
  - `registers.registerLoreCounters()` – Optional: pass secondary-tab heading elements for counts.

## Panels: Responsibilities & Integration

### Entity Info (panels/entity-info/)
- Purpose: Show character/group metadata, with toolbar tabs for sub-views.
- Meta resolution: `resolveEntityMeta(resolveCurrentEntity)` returns `{ name, type: 'character'|'group'|null, hasEntity, entity, isGroup }`.
- Views:
  - Character view: `views/characterView.js` – Showcase header (cover/avatar/name), token stat read from ST DOM, tabs: Profile, Card Info (Description/Personality/Scenario), Character Book (placeholder), Gallery.
  - Group view: `views/groupView.js` – Name, member count, description, member list.
- Markdown rendering in Character view:
  - Prefer ST `messageFormatting` when available; fall back to marked/showdown/markdown-it, else a conservative inline+paragraph renderer.
  - Always sanitize HTML (uses `DOMPurify` when present); avoid `dangerouslySetInnerHTML`.
- Local preference: Card tab view mode persists via `localStorage` per field (`preview` vs `raw`).
- Events: Subscribes to ST events listed under Controller to keep data fresh.

### Lore Info (panels/lore-info/)
- UI entry: `buildLoreUI()` composes three tabs: Overview, Active, Potential.
- State: `state/loreState.js` persists sort modes and matching options; exposes ephemeral state for working buffers.
- Controls:
  - Sort: `flat` vs `world` for Active/Potential lists separately.
  - Toggles: Case-sensitive, Whole word (Potential only).
  - Expand/Collapse for each list.
- Controller: `createLorePanelController()` provides `renderActiveList*`, `renderPotentialList*`, `updateLoreMatches`, `expandAllIn`, `collapseAllIn`, `setActiveLoreTab`, `hookTextareaListeners`, `subscribeWorldInfoEvents`.
- Dependencies injected by runtime: `{ SlashCommandParser, CFG, debounce, eventSource, eventTypes }`.
- Counters: `registerLoreCounters(elements)` connects heading badges for Overview and primary controls.

### Chat Info (panels/chat-info/)
- Tabs:
  - Author’s Note: Rehomes `div[name="floatingPromptHolder"]`.
  - Advanced Controls: Segmented tabs which rehome ST panels (CFG scale, logprobs panel).
- Removed: The former Studio tab (connection status/context usage) has been retired; connection profile switching and context usage now live in the chat send-form toolbar. Do not reintroduce Studio UI here.

### Backgrounds (ported drawer)
- Ported via `portDrawerInto('Backgrounds', rightSidebar.backgroundDrawerHost)` during runtime hydration.
- If the drawer is absent, log a `[AstraProjecta]` console warning and keep the panel minimal.

### Character Portrait (panels/portrait/)
- Shows a zoomed avatar extracted from the chat area.
- Interactions:
  - Click a message avatar in the chat to set/refresh the zoomed portrait.
  - External trigger: `OPEN_CHARACTER_PORTRAIT_PANEL_EVENT` opens the panel.
- Dataset: `utils/messageAvatarDataset.js` collects avatar metadata; refreshes on ST events.
- Expressions tab is a placeholder to be populated by future features.

## Primary Bar Right Cluster
- Runtime registers a `chat` cluster with four icon buttons (lore, chat-info, backgrounds, portrait).
- Add new button by extending `registerView` render output; ensure it calls `rightSidebar.toggleRightSidebar('<panelId>')`.

## Drawers & AI Settings
- Central mapping: `DRAWER_MAPPINGS` in `runtime/createRightSidebarRuntime.js`.
  - Each mapping: `{ id, title, heading, icon }`, where `id` is the legacy ST drawer ID.
- `hydrateAiSettingsTab()`:
  - Ports configured drawers into an internal staging container and passes them to `renderAiSettings()` alongside `sidebarHeader`.
  - Maintains ST script ownership of drawer contents; do not mutate their internals directly.
- When ST adds a new AI settings block that belongs in this tab, extend `DRAWER_MAPPINGS`.

## Accessibility & Semantics
- Buttons and triggers manage `aria-expanded` and `aria-controls` consistently.
- Non-button clickable elements are made keyboard-activatable and receive `role="button"` + `tabindex="0"`.
- Panel visibility is handled by setting `display: none` on inactive panels and synchronizing trigger states.

## Mobile Considerations
- Right sidebar features are desktop-first. Keep interactions idempotent if mobile layout is active.
- Mobile redirects right sidebar panels into a vaul Drawer (`createMobileRightSidebarDrawer()`); currently Lore, Entity Info, Chat Info, Backgrounds, and Portrait participate. Extend `allowedPanelIds` in the runtime when adding new panels.
- Drawer mounts under `#astraMobileOverlayHost` (falls back to `body`); state still flows from the same controller. If you add a new panel to Drawer flow, extend the allowed ids in the runtime.
- CSS hides the Drawer handle for the Entity Info panel via `mobile/rightSidebarDrawer.css` using `:has(#entityInfoPanel)`. Keep selectors scoped to mobile to avoid desktop regressions.
- Avoid forcing panel opens during mobile transitions; let the shell/mobile runtime manage visibility.

## Extending

Add a new panel
1) Create a panel factory
- Place under `right-sidebar/<feature>/index.js`.
- Export `create<Feature>(deps)` that returns `{ panel: HTMLElement, ...optional APIs }`.

2) Register in the view
- Add DOM host and button (if part of the 4-button cluster) in `rightSidebarView.js`.
- Include `panel` in `rightSidebarPanelElements` and, if needed, a trigger.

3) Whitelist panel id
- In the view initialization, ensure `controller.setPanelIds(Object.keys(rightSidebarPanelElements))` includes your id.

4) Wire from runtime (optional)
- If you need shell/AI Settings/state wiring, add hooks in `createRightSidebarRuntime()` and expose persistent handlers if needed.

Port an additional ST drawer into AI Settings
- Extend `DRAWER_MAPPINGS` with `{ id: '<drawerId>', title, heading, icon }`.
- Call `registers.hydrateAiSettingsTab()` after sidebars mount.

Expose external triggers (custom events)
- Preferred: import event names and dispatch simple events.

```js
// Toggle entity info panel from anywhere (no payload expected)
import { TOGGLE_ENTITY_INFO_PANEL_EVENT } from '@/astra/app-shell/main/right-sidebar/panels/entity-info/events/eventNames.js'
document.dispatchEvent(new Event(TOGGLE_ENTITY_INFO_PANEL_EVENT))

// Open character portrait panel
import { OPEN_CHARACTER_PORTRAIT_PANEL_EVENT } from '@/astra/app-shell/main/right-sidebar/panels/portrait/events/eventNames.js'
document.dispatchEvent(new Event(OPEN_CHARACTER_PORTRAIT_PANEL_EVENT))
```

## Styling
- Keep styles scoped to the right sidebar containers: `#rightSidebar`, `.entity-info-panel`, `.lore-*`, `.chat-context-usage`, etc.
- Use tokens from `src/astra/styles/theme.css`. Do not hard-code colors/spacing/typography.
- Prefer BEM-ish modifiers: `block__element--variant`.

## Testing (Vitest)
- Controller
  - Toggle/open/close transitions; last-panel logic; persistence callback payloads.
  - Entity label recompute on mocked ST events.
- View
  - ARIA attributes toggle on buttons; `display: none` handling on panels; `registerEntityInfoTrigger()` keyboard behavior.
- Lore
  - Sort/toggle state updates; expand/collapse; counters update via `registerLoreCounters()`.
- Chat Info
  - Context usage with mocked `promptManager.tokenHandler`; fallback behavior without it.
  - Profiles mirroring from a stubbed `#connection_profiles` node.

## Pre‑Merge Checklist (Right Sidebar)
- Panel IDs included in `setPanelIds()` and reflected in `rightSidebarPanelElements`.
- Buttons wired and `aria-*` states verified.
- AI Settings drawers mapped correctly; hydration function called after sidebars mount.
- Backgrounds drawer host present; fallback logs a `[AstraProjecta]` warning when missing.
- Entity Info markdown sanitation verified (DOMPurify or fallback); no raw `innerHTML` from untrusted sources.
- No added globals; all ST integration uses context + events.

## Troubleshooting
- Buttons do nothing
  - Ensure `controller.setPanelIds()` contains your panel id and the view’s `applyPanelState()` runs on subscribe.
- Entity Info label stuck
  - Confirm ST events are reaching the controller; call `controller.refreshEntityInfoLabel()`.
- AI Settings empty
  - Check `DRAWER_MAPPINGS` ids match ST drawer ids; ensure `registers.hydrateAiSettingsTab()` runs after sidebar panels mount.
- Backgrounds panel blank
  - ST may not have the drawer; log shows a warning. The panel remains valid without content.
- Context usage shows dashes
  - `promptManager.tokenHandler` not ready. The view gracefully degrades until ST loads the token handler.

---

Keep this document in sync with implementation changes. If you alter runtime wiring, add or change panels, or adjust event flows, update this guide with a short recipe and the contract changes.
