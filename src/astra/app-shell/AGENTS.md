# AstraProjecta App Shell Guide (src/astra/app-shell)

This guide focuses on the app shell: the left sidebar, main area, and right sidebar runtime. It extends the root AGENTS.md and src/astra/AGENTS.md by documenting local structure, patterns, and integration rules for this subtree.

Scope: All files under `src/astra/app-shell/**`.

## Workspace Layers and Legacy Modules
- Workspace tabs: `home` (SillyTavern landing), `chat` (primary chat), `world-info`, `extensions`.
- `world-info` and `extensions` are currently ST drawer shims only (port `WorldInfo` and `rm_extensions_block`), not Astra-native views.
- Legacy modules (middle nav): `ai-settings`, `user-settings`, `character-management`, `persona-management`; keep them under `sidebar/modules/legacy` and reuse the existing drawer wiring.
- Workspace mode switching stores a per-workspace right-sidebar snapshot (home/chat/world-info/extensions) and repositions `bg1` into the chat column; keep `setWorkspaceMode` calls intact when changing nav ids so snapshots and background placement stay in sync.

## Architecture Overview
- Left Sidebar: Navigation rail + panel content area. Top nav panels live in `sidebar/panels/*`; secondary panels (AI/User/Persona/etc.) live in `sidebar/modules/*`.
- Main Area: Header shell (identity, primary dropdown), main navigation orchestration, dedicated view presenters (chat/home), and ST drawer surfaces.
- Home view runtime details live under `main/main-area/views/home/browser/*`; see `main/main-area/views/home/AGENTS.md` before tweaking the character browser or introducing new home layouts.
- Right Sidebar: Entity info, lore, backgrounds, and portrait panels, driven by a small controller/view pair plus a runtime coordinator.
- Primary bar right slot: `layout/primaryBarRightSlot.js` registers per-workspace button groups (e.g., right-sidebar toggles) and re-renders on mobile state changes; add new workspace actions through this slot instead of hard-coding the header.
- Event-driven: All integration with SillyTavern (ST) flows through the context (`SillyTavern.getContext()`), its `eventSource`, and feature stores.
- Factory pattern: Non-React modules export `create*()` or `render*()` helpers returning DOM nodes and small controller APIs. Avoid classes.
- Persona connections (home sidebar): `HomeSidebarQuickCharacters` resolves the active persona id from `deps.userAvatar` → `context.chatMetadata.persona` → `personas.js`’s `user_avatar` export (not a global). Keep this chain intact when refactoring; SillyTavern does not expose `user_avatar` on `globalThis`.

## Folder Topology

```
src/astra/app-shell
├─ main/
│  ├─ layout/                # High-level composition of sidebar + main area
│  │  └─ composeMain.js      # Returns elements/actions/state used by bootstrap runtime
│  ├─ main-area/             # Header shell, primary navigation, entity context, views
│  │  ├─ services/           # Drawer/view switch helpers (e.g., mainAreaSwitch.js)
│  │  ├─ state/              # Entity context + primary nav state
│  │  └─ views/              # Chat/Home view presenters + shared view utilities
│  ├─ navigation/            # Nav rail definitions + drawer mapping for main area
│  └─ right-sidebar/         # Right sidebar: controller/view + panels (lore/chat/portrait)
└─ sidebar/
   ├─ panels/                # Top-level nav panels (Home/Chat + drawer-backed stubs for Worlds/Extensions)
   │  ├─ home/               # Home panel renderer
   │  ├─ chat/               # Chat panel feature modules (categories, current, quick switch, notifications, shared)
   │  ├─ world-info/         # Stub; main area ports the WorldInfo drawer
   │  └─ extensions/         # Stub; main area ports the rm_extensions_block drawer
   ├─ modules/               # Secondary panels (AI settings, user/persona/character tools, etc.)
   │  └─ legacy/             # ST drawer-backed modules (AI/User/Character/Persona)
   └─ state/                 # Sidebar nav rail + panel state machine
```
- `sidebar/modules/character-cards/` holds the Character Cards renderer (CSS + panel). It is not exported from `modules/index.js` yet; treat it as experimental wiring when deciding registration.

## Key Contracts and Surfaces
- `composeMain.createMainContent(deps)`
  - Returns `elements`, `actions`, `state`, `watchers` for the shell.
  - Consumes ST context/deps injected by bootstrap.
- `layout/primaryBarRightSlot.createPrimaryBarRightSlot(opts)`
  - Registers named views for the primary bar right cluster; handles mobile/desktop swaps and exposes `registerView`/`activateView`/`unregisterView`.
- `sidebar/sidebarShell.createSidebarShell(opts)`
  - Builds left sidebar DOM + manages active panel and expansion state.
  - Exposes `actions.initializeSidebarPanels()` and `state.getSidebarTabContent()`.
- `main/main-area/mainAreaModule.createMainAreaModule(opts)`
  - Manages header identity, primary dropdown, avatar/name refresh.
  - Exposes `actions.resolveCurrentEntity()` used by the right sidebar.
- `main/main-area/services/mainAreaSwitch.js`
  - Provides `updateMainForTab()` and `switchMainToDrawer()` used by the module injection.
  - Delegates to view presenters before porting drawers so layout state stays consistent.
- `main/right-sidebar/runtime/createRightSidebarRuntime(opts)`
  - Composes right sidebar, ports drawers, wires lore controller/UI.
  - Exposes `registers.hydrateAiSettingsTab()`, `persistHandlers.*`, and right-sidebar snapshot APIs (`getStateSnapshot`/`restoreStateSnapshot` via the controller) used during workspace switches.

## Adding or Modifying Sidebar Panels
Panels render into the left sidebar content area and follow the `render*` pattern.

1) Create a renderer
   - Location: `sidebar/modules/<feature>.js` for middle/bottom nav panels. Reserve `sidebar/panels/*` for the top nav set (Home/Chat plus future Worlds/Extensions stubs).
   - Existing chat panel modules live in `sidebar/panels/chat/` and are surfaced through `sidebar/panels/index.js`; keep new chat-specific helpers there to stay aligned with `main-area/views/chat`.
   - Export named function `render<Feature>(container, ctx)` that mutates `container` and returns optional `{ tabsApi }` if using secondary tabs.
   - Use `ctx.createSecondaryTabs` when you need tabbed content. Keep headings synced with `sidebarHeader`.

2) Register the panel
   - Add an export in `sidebar/modules/index.js` (or `sidebar/panels/index.js` if you are creating a new top nav panel).
   - Add a nav entry in `main/navigation/navConfig.js` under a section (`top`, `middle`, `bottom`).
   - To hide a panel from the nav rail but keep it routable from the main area, set `sidebar.includeInNavRail: false`.

3) Hydration and drawers
   - When your panel depends on a legacy ST drawer, request it via `ctx.portDrawerInto('<drawerId>', targetNode)`.
   - Use `ctx.enforceDrawerAlwaysOpen('<drawerId>')` if the drawer scripts collapse unexpectedly.

4) State and persistence
   - Read/write shared state through `src/astra/state` stores. Do not introduce ad-hoc globals.
   - For panel-local UI state (e.g., last tab), persist via the sidebar state’s `setPersistHandler()` if needed.

## Adding or Modifying Right Sidebar Behavior
The right sidebar is orchestrated by a controller (`rightSidebarController.js`) and a view (`rightSidebarView.js`), composed by `createRightSidebar()` and then wired by the runtime (`runtime/createRightSidebarRuntime.js`).

Common tasks:

- Add a new panel button and view content
  - Extend `rightSidebarView.js` to create panel DOM and a corresponding button.
  - Include the new panel in the `rightSidebarPanelElements` map and ensure the controller is aware of the panel id via `controller.setPanelIds()`.

- Port an ST drawer into the right sidebar
  - Add an entry to `DRAWER_MAPPINGS` in `runtime/createRightSidebarRuntime.js` for AI Settings tabs.
  - Or port on-demand: `portDrawerInto('<drawerId>', rightSidebar.<hostElement>)`.

- Listen to ST events
  - Subscribe via the controller or view using `eventSource` and `event_types` injected by the runtime.
  - For entity label/avatar updates, prefer the controller’s subscription hooks (`subscribeToEntityInfoLabel`).

- Persistence
  - Use `rightSidebar.setPersistHandler(handler)` to persist view state (open/closed, active/last panel).
  - Use `persistHandlers.shell(handler)` from the runtime to persist shell-wide state as needed.

## Main Area Navigation and Drawers
- Navigation contracts live in `main/navigation/navConfig.js`:
  - `NAVIGATION_TAB_IDS` – whitelist for main-area navigation (`chat`, `world-info`, `extensions`).
  - `MAIN_AREA_DRAWERS` – ST drawers that the main area can surface (`WorldInfo`, `rm_extensions_block`).
  - `NAVIGATION_SECTIONS` – source of truth for left nav and main area activation behavior.
- Headings: use `createPrimaryHeadingNode()` + `applyPrimaryHeadingToSlot()` for non-chat headings (handles divider visibility and nav-scoped ids). Avoid the legacy `.sts-heading` elements.
- `main-area/mainAreaModule.js`
  - Updates identity UI on `CHAT_CHANGED` and other ST events.
  - Exposes `createMainAreaUpdateContext()` with helpers required by drawer porting (title slots, waiters, DOM targets).
- View presenters
  - `main-area/views/chat` and `main-area/views/home` expose `show*View` / `hide*View` helpers for Astra-owned DOM.
  - Shared helpers live under `main-area/views/shared` (`hideDrawers` keeps ST drawers aligned with Astra's state).
  - Add new views by creating `views/<feature>/<feature>View.js` exporting `show<Feature>View(deps)` (plus optional hide helper) and referencing it via `navConfig` (`main.type: 'view'`, `main.viewId`).
- Drawer usage
  - Use `updateMainForTab(tabId, /*forceHome=*/false, context)` from `main-area/services/mainAreaSwitch.js` when activating `world-info` or `extensions`.
  - Use `portDrawerInto` and `enforceDrawerAlwaysOpen` to integrate the ST-provided drawer nodes.

## State, Stores, and Persistence
- Sidebar state machine: `sidebar/state/sidebarState.js` holds expansion, active tab, and persistence hooks.
- Right sidebar controller: persists open/close + last/active panel via `setPersistHandler`.
- Workspace snapshots: `bootstrap/runtime.js` saves/restores a right-sidebar snapshot per workspace via `getStateSnapshot`/`restoreStateSnapshot`, with defaults for home/chat/world-info/extensions; keep this in mind if you change panel ids or snapshot shape.
- Avoid storing DOM nodes in state; store serializable snapshots only. Persist through handlers provided by the runtime (`persistHandlers`) or feature stores in `src/astra/state`.

## Event Wiring and ST Interop
- Always acquire ST services through the bootstrap-provided `context` (`SillyTavern.getContext()`).
- Listen to events via `eventSource.on(event_types.*)`. Typical events: `APP_READY`, `CHAT_CHANGED`, `CHARACTER_PAGE_LOADED`, `GROUP_UPDATED`, `CHAT_DELETED`.
- Do not mutate ST-managed DOM directly. When you need ST widgets, port them using helpers from `src/astra/utils/dom.js`.

## Styling, Tokens, and CSS Scope
- Keep styles local to this subtree (`sidebar/*.css`, `main/right-sidebar/**/*.css`, `main/main-area/*.css`).
- Use design tokens from `src/astra/styles/theme.css`. Avoid literal color/spacing values; add tokens first if needed.
- Scope selectors beneath Astra containers (e.g., `#leftSidebar`, `#rightSidebar`, or header shells). Do not target ST global selectors unless porting a specific widget intentionally.

## Accessibility and UX
- Button semantics: Non-button triggers must add `role="button"`, be focusable, and respond to `Enter`/`Space` (see `rightSidebarView.registerEntityInfoTrigger`).
- Aria states: Maintain `aria-pressed`, `aria-expanded`, and `aria-controls` in nav rail buttons and sidebar triggers.
- Keyboard focus: Ensure newly added controls are reachable and visible on focus.

## Logging and Errors
- Use `console.warn` / `console.error` only with the `[AstraProjecta]` prefix and actionable messages.
- Swallow noisy errors from ST DOM races; prefer retries guarded by `waitUntilCondition` or MutationObserver with explicit teardown.

## Testing Guidance
- Panel renderers: test that containers are populated, headings are synced, and drawers are ported into the expected targets.
- Right sidebar controller: unit test state transitions (`togglePanel`, `openPanel`, `closePanel`, `setLastPanel`) including no-op cases.
- Entity context: test `resolveCurrentEntity`, name/label formatting, and avatar fallback logic.
- Event wiring: stub `eventSource` and verify that handlers update the intended UI through the exposed APIs.

## Do / Don’t
- Do
  - Follow factory helpers that return nodes + small APIs.
  - Keep cross-module communication via explicit `actions/state` contracts.
  - Port, don’t reimplement, ST drawers and respect their lifecycle.
- Don’t
  - Don’t render into ST-owned nodes or rename/remove ST IDs/classes.
  - Don’t leak global listeners; always provide cleanup when attaching observers or events.
  - Don’t introduce new global singletons; compose through runtime injection.

## Quick Recipes

Activate a left sidebar panel from code:

```js
// inside composeMain consumer
const shell = createMainContent(deps)
shell.actions.setActiveSidebarTab('chat')
```

Open the right sidebar portrait panel:

```js
const { rightSidebar } = createRightSidebar(/*opts*/)
rightSidebar.openRightSidebarPanel('portrait')
```

Port a legacy ST drawer into AI Settings (right sidebar):

```js
// Extend mapping in main/right-sidebar/runtime/createRightSidebarRuntime.js
const DRAWER_MAPPINGS = [
  // ...
  { id: 'AdvancedFormatting', title: 'Advanced', heading: 'AI Response Formatting', icon: 'type' },
  { id: 'my_custom_drawer', title: 'Custom', heading: 'My Drawer', icon: 'wrench' },
]
```

Render a new sidebar panel with tabs:

```js
// sidebar/modules/myFeature.js
export function renderMyFeature(container, { createSecondaryTabs, sidebarHeader }) {
  const { tabsApi } = createSecondaryTabs({
    header: sidebarHeader,
    items: [
      { id: 'overview', title: 'Overview', content: document.createElement('div') },
      { id: 'details', title: 'Details', content: document.createElement('div') },
    ],
  })
  container.append(tabsApi.elements.root)
  return { tabsApi }
}
```

## Pre‑Merge Checklist (App Shell)
- Panel changes
  - Nav entry added/updated in `navigation/navConfig.js`.
  - `render*` wired in `sidebar/modules/index.js` (or `sidebar/panels/index.js` for top nav panels) and `initializeSidebarPanels()` covers it.
  - Drawers, if any, ported via `portDrawerInto()` to the correct host.
- Right sidebar changes
  - Panel id registered and controller aware (`setPanelIds`).
  - Persistence implemented via `setPersistHandler` if state should survive reloads.
  - Snapshot compatibility checked if adjusting controller state shape (workspace switching uses `getStateSnapshot`/`restoreStateSnapshot`).
  - Event subscriptions added with teardown where applicable.
- Styling
  - Tokens used; no leaked global selectors.
  - Desktop and mobile class guards respected (don’t toggle on mobile unless intended).
- Testing
  - Unit tests for controller transitions or critical utilities.
  - Rendering tests for panels using DOM helpers.

## Troubleshooting
- Right sidebar buttons do nothing
  - Confirm the controller knows the panel id (`setPanelIds`) and `applyPanelState` runs with latest snapshot.
- Drawer content missing or collapses
  - Ensure `portDrawerInto('<id>', host)` returns a node and consider `enforceDrawerAlwaysOpen('<id>')`.
- Persona avatar not updating in nav rail
  - Confirm `personaAvatarWatcher.addTarget(img)` runs and that the image element hasn’t been replaced by ST.
- Active tab inconsistencies between nav rail and main area
  - Make sure `sidebar.actions.setActiveSidebarTab` is wired to the nav rail buttons and that `createMainAreaNavigation({ onActiveTabChange })` receives the setter returned by `mainArea.state.setActiveMainAreaTab`.

—
Keep this document focused on `src/astra/app-shell` specifics. Broader runtime and policy details live in the root AGENTS.md and `src/astra/AGENTS.md`.
