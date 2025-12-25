# AstraProjecta Module Guide (src/astra)

Use this note to navigate the Astra runtime code. The root AGENTS.md covers global policies; this file focuses on the src/astra implementation.

## Entry Points & Boot Flow
- `bootstrap.js` – Exposes `initializeAstraRuntime()`. Patches fetch (`installFetchNormalizer`) then boots once.
- `bootstrap/runtime.js` – Wires stores, creates the shell, instantiates the right sidebar, attaches global event handlers.
- `bootstrap/context.js` – Resolves SillyTavern context and DOM anchors (`#sheld`, `#chat`).
- `bootstrap/events.js` – Central event dispatcher: debounced character refresh, lore init/hydration, AI Settings hydration, and mobile visibility sync.

## Folder/File Map

```
src/astra
├─ bootstrap/                  # Boot + DI glue (context, stores, shell, events)
│  ├─ context.js               # Resolve ST context + DOM anchors
│  ├─ events.js                # Subscribe to ST events, drive UI updates
│  ├─ runtime.js               # Compose stores/shell/right-sidebar + mount
│  ├─ shell/index.js           # Build top-level shell (left sidebar + main + right slot)
│  └─ stores.js                # Create per-feature stores (nav/global/lore)
├─ app-shell/
│  ├─ main/                    # Main area + right sidebar
│  │  ├─ layout/               # Main-area composition
│  │  │  └─ composeMain.js     # Returns elements/actions/state for the shell
│  │  ├─ main-area/            # Header, navigation, drawers
│  │  │  └─ views/             # Home/chat view modules and helpers
│  │  ├─ navigation/           # Nav definitions (icons, drawer mapping)
│  │  └─ right-sidebar/        # Right sidebar: entity info, lore, portrait
│  └─ sidebar/                 # Left rail + panel rendering + state
│     ├─ panels/               # AI/User/Character/Persona/Chat panels
│     └─ state/                # Sidebar state machine (expand/collapse/active tab)
├─ mobile/                     # Mobile shell (media query, gestures, overlays)
├─ shared/                     # Reusable UI (secondaryTabs, banners, icons, swipe)
├─ state/                      # Lightweight stores, CFG constants, global store
├─ styles/                     # Theme tokens and layout CSS
└─ utils/                      # DOM/avatar/fetch helpers
```

## Shell Composition Highlights
- `app-shell/main/layout/composeMain.js` – Assembles main area + left sidebar. Returns:
  - `elements` – refs for left sidebar, header slots, identity nodes
  - `actions` – `initializeSidebarPanels()`, `setActiveSidebarTab()`, `toggleSidebarExpansion()`, `closeChat()`, `updateCharacterDisplay()`, `resolveCurrentEntity()`, `getEntityName()`, `getEntityNameLower()`, `setAiSettingsTabsApi()`, `subscribeCharacterDisplay()`
  - `state` – `getActiveSidebarTab()`, `getIsSidebarExpanded()`, `setSidebarExpanded()`, `setPersistHandler()`, `getSidebarTabContent()`, `MAIN_AREA_DRAWERS`
- `app-shell/main/main-area/mainAreaModule.js` – Controls header identity, nav switching, primary heading, and character metadata:
  - `updateCharacterDisplay()` – re-fetch avatar/name/group counts after chat changes
  - `resolveCurrentEntity()` / `getEntityNameLower()` – used by lore + right-sidebar
  - `createMainAreaUpdateContext()` – prepared deps for drawer syncing and workspace-aware primary heading updates
- `app-shell/main/main-area/views/` – Contains standalone view modules (`home`, `chat`, shared helpers). Use these to render non-drawer experiences without touching SillyTavern-owned DOM.
  - `home/homeView.js` – Renders the Home shell and boots the Home Character Browser (React components under `views/home/components`). Avoid auto-opening right sidebar panels.
- `app-shell/sidebar/sidebarShell.js` – Builds nav rail + panel regions; ports legacy drawers; manages tab switching.
  - `state.getSidebarTabContent()` returns a container map used by right-sidebar to hydrate AI settings.
- `app-shell/main/navigation/navConfig.js` – Defines nav rail sections. The desktop top stack renders the SillyTavern brain icon (`id: 'home'`) ahead of `chat`, `world-info`, and `extensions`; the brain SVG inherits `currentColor`, so tweak hues through `navRail.css` tokens rather than inline fills.
- `app-shell/main/right-sidebar/runtime/createRightSidebarRuntime.js` – Bridges shell and right sidebar. Registers the “primary bar right” cluster, ports drawers, exposes lore controller methods, builds the mobile drawer, and returns persist handlers plus `getStateSnapshot`/`restoreStateSnapshot` for workspace switching.
- Workspace coordination – `bootstrap/runtime.js` wires `workspaceBridge.setMode()` to register per-workspace primary-bar-right clusters, move `bg1`, and restore right sidebar snapshots for `home`/`chat`/`world-info`/`extensions`.

## SillyTavern Data Sources
- Context and events
  - `bootstrap/context.js` – `getBootstrapContext()` resolves `globalThis.SillyTavern.getContext()` to obtain `{ eventSource, event_types, getCurrentChatId, openGroupChat, openCharacterChat, ... }`.
  - `bootstrap/events.js` – Subscribes to `eventSource.on(event_types.*)` for `CHAT_CHANGED`, `CHARACTER_PAGE_LOADED`, `CHARACTER_EDITED`, `GROUP_UPDATED`, `CHAT_DELETED`, `GROUP_CHAT_DELETED`, `APP_READY`. Triggers UI updates like `updateCharacterDisplay()`, `rightSidebar.updateEntityInfo()`, lore matches/badges, and mobile visibility sync.
- Characters and groups
  - `bootstrap/shell/index.js` – Injects key ST exports into the shell:
    - `getPastCharacterChats` from `script.js`
    - `getGroupPastChats`, `groups`, `selected_group`, `openGroupById` from `group-chats.js`
    - `timestampToMoment`, `waitUntilCondition` from `utils.js`
  - `app-shell/main/main-area/mainAreaModule.js` – `createEntityContext(getContext, getGroups, getSelectedGroup)` provides:
    - `resolveCurrentEntity()`, `getEntityName()`, `getEntityNameLower()`, `getGroupMemberCount()`
- Avatars
  - Persona (user) avatar: `utils/personaAvatar.js`
    - Sources: `getThumbnailUrl('persona', id, true)` from `script.js`; fallback to `getUserAvatar(id)` and `power_user.personas`
    - `createPersonaAvatarWatcher()` watches `<img>` elements and refreshes on `APP_READY`, `CHAT_CHANGED`, `SETTINGS_UPDATED`
  - Character/group avatar:
    - `main-area/services/avatarUtils.js` with `createEntityContext().getEntityAvatarSources()`
    - `updateCharacterDisplay()` applies avatar; falls back to a default on error
- Chat name
  - `app-shell/main/main-area/mainAreaModule.js` – Uses `getCurrentChatId()` to show the current chat file name; toggles `.requires-chat` elements; updates titles and descriptions

Practical guidance: inject ST-provided APIs via deps objects (as `composeMain.js` does) to keep modules testable and decoupled.

## Right Sidebar Anatomy
- `rightSidebarController.js` – Manages open/close state, last active panel, and entity-info label updates; exposes `setPersistHandler` for persistence.
- `rightSidebarView.js` – Builds DOM and binds event handlers; exposes UI-oriented API used by lore and avatar controllers.
- `loreInfo/`
  - `state/loreState.js` – Persists sort modes and match flags via `createStateStore`.
  - `services/` + `ui/` – Rendering and badge controls; accessed via a lore controller returned from the runtime.
- `characterPortrait/` and `entityInfo/` – Zoomed avatar view, metadata tabs, and click handlers.
- Runtime extras: `createRightSidebarRuntime()` hydrates AI Settings tabs from ported drawers, exposes a mobile drawer wrapper, and surfaces `getStateSnapshot()` / `restoreStateSnapshot()` so workspace switches can restore the sidebar state.

## Filesystem/DOM Scanning & Compatibility
- Drawer porting
  - Always use `utils/dom.js`: `portDrawerInto(idOrNode, target)` and `enforceDrawerAlwaysOpen()` to move legacy ST drawers into Astra containers without class regressions.
  - Right sidebar runtime pre-ports known drawers (`left-nav-panel`, `rm_api_block`, `AdvancedFormatting`).
- Scanning guidance
  - Prefer ST APIs + existing DOM over filesystem reads. If elements mount late, use `waitUntilCondition()` before operating.
  - If you must add scanning logic, place small, testable helpers in `src/astra/utils` and keep them dependency-injected.
- Fetch normalization
  - `utils/fetchNormalizer.js` normalizes inputs like `:7860/...` to absolute URLs using the current origin; installed once during bootstrap.

## State & Persistence
- `state/cfg.js` – Shared config for sizes, swipe thresholds, lore panel IDs.
- `state/globalStateStore.js` – LocalStorage-backed global store with `hydrate()` and `isHydrated()`; emits changes safely.
- `state/sidebarNavStore.js` – External-store compatible snapshot for the nav rail; call `setSections()` before rendering buttons.
- `state/store.js` – Generic LocalStorage adapter used by lore state and others; supports async setters during hydration.
- Workspace persistence – `bootstrap/runtime.js` captures `rightSidebar.getStateSnapshot()` per workspace (`chat`, `world-info`, etc.) and restores via `restoreStateSnapshot()` when `workspaceBridge.setMode()` switches modes.

## Shared UI & Utilities
- `shared/components/*` – DOM-first factories (tabs, instruction banner, custom selects) used by non-React shells/right sidebar. Keep these React-free to avoid clashes with SillyTavern’s jQuery-managed DOM.
- `shared/ui/*` – React wrappers around shadcn/vaul primitives (ResponsiveDialog, dropdown menu, select) with Astra tokens/z-index baked in; consume only from React surfaces.
- `shared/components/secondaryTabs.js` – Swipe-aware tab system with optional external heading slot; API: `setActive()`, `updateCurrentHeading()`, `next()`, `prev()`
- `shared/icons/lucide.js` – `getLucideIconMarkup(name, options)` for consistent, accessible icons
- `utils/dom.js` – Drawer hoisting utilities
- `utils/personaAvatar.js` – Persona avatar watcher
- `utils/fetchNormalizer.js` – Fetch URL sanitizer

## Quick Reference: Common Functions
- Shell/navigation
  - `createShell()` – Assembles the top-level shell; returns `elements/actions/state/watchers/slots/mobile`
  - `createMainContent()` – Provides shell actions such as `initializeSidebarPanels()`, `setActiveSidebarTab()`, `toggleSidebarExpansion()`, `closeChat()`, `updateCharacterDisplay()`, `resolveCurrentEntity()`, `setAiSettingsTabsApi()`, `subscribeCharacterDisplay()`
  - `createSidebarState()` – Controls expand/collapse/active tab state and persistence
- Right sidebar/Lore
  - `createRightSidebarRuntime()` – Registers primary bar right tools, ports drawers, exposes lore controller
  - `createLoreState()` / `createLorePanelController()` / `buildLoreUI()` – State + render + hooks
- Mobile
  - `createMobileRuntime()` – Public entry for layout switching; exposes `initializeLayout()`, `attachSidebarInteractions()`, `attachTouchGestures()`, `syncMainVisibilityFromChat()`
  - `createMobileNavRail()` – Normalizes nav sections for mobile; always inserts the `chat` button after `ai-settings`/`user-settings` so the middle rail mirrors desktop priorities (mounted internally by the runtime).
  - `createSyncMainVisibilityFromChat()` – Utility to hide main area when no chat is active
- Utilities
  - `portDrawerInto()` / `enforceDrawerAlwaysOpen()` – Drawer management
  - `createPersonaAvatarWatcher()` – Sync persona avatar
  - `getLucideIconMarkup()` – Consistent SVG
  - `installFetchNormalizer()` – Normalize fetch URLs

## Working Tips
- Follow dependency-injection patterns (accept `deps` objects) to keep modules testable.
- Persist new state via `createStateStore` or extend `createGlobalStateStore`; hydrate before emitting.
- Add sidebar/right-sidebar features via `initializeSidebarPanels()` or `createRightSidebarRuntime()` so persistence and mobile mounting remain intact.
- When touching mobile code, align thresholds with `CFG.swipe` and confirm class names match mobile styles.

## Data Flow Diagram

```text
SillyTavern.getContext()
          │
          ▼
  bootstrap/context.getBootstrapContext()
          │
          ├─► eventSource/event_types ──► bootstrap/events.registerCoreHandlers()
          │                                 │
          │                                 ├─► updateCharacterDisplay()
          │                                 ├─► rightSidebarRuntime.updateEntityInfo()
          │                                 ├─► mobileRuntime.syncVisibility()
          │                                 └─► loreController.refreshMatches()
          │
          ├─► services (getCurrentChatId, groups, api helpers)
          │        │
          │        └─► bootstrap/runtime.initializeAstraRuntime()
          │                 │
          │                 ├─► composeMain() / createShell()
          │                 │        │
          │                 │        ├─► setActiveSidebarTab(), resolveCurrentEntity()
          │                 │        └─► portDrawerInto(), getSidebarTabContent()
          │                 │
          │                 └─► createStateStore() instances
          │                          │
          │                          ├─► sidebarNavStore.onChange() ──► sidebarShell.render()
          │                          ├─► loreState.onChange() ──► loreUI.updateMatches()
          │                          └─► globalStateStore.onChange() ──► shellRuntime.persist()
          │
          └─► waitUntilCondition(), timestampToMoment, fetch normalizer
                   │
                   └─► shared/utils consumers (avatar watchers, fetch pipelines)
```

- **Event flow**: ST emits lifecycle (`APP_READY`, `CHAT_CHANGED`, etc.) and bootstrap/events routes them to shell/right-sidebar/mobile controllers, which read or hydrate state stores before triggering UI updates.
- **State flow**: Stores created in `bootstrap/runtime` or feature runtimes hydrate from localStorage, accept updates from event handlers/actions, then notify UI modules through subscribed callbacks.
- **UI flow**: Shell/right-sidebar/mobile modules expose actions (`setActiveSidebarTab`, `rightSidebar.updateEntityInfo`, etc.). Event handlers or user interactions call these actions, which read the latest store snapshots and apply DOM changes via composed views.

## Utilities Guide
- **DOM scanning**: Keep queries scoped to Astra-owned roots (`#astra-projecta-*`) and favor cached lookups passed into helpers over repeated `document.querySelector` calls. When waiting on SillyTavern DOM, reuse `waitUntilCondition()` or mutation observers with explicit teardown so we avoid idle polling.
- **SillyTavern API wrapping**: Retrieve services through `SillyTavern.getContext()` once per module, guard against `undefined`, and expose lightweight wrappers that return plain data instead of leaking ST objects downstream. Normalize async calls, handle rejected promises with `[AstraProjecta]`-prefixed warnings, and surface cancellation hooks where ST might dispose controllers mid-flight.
- **Testing utilities**: Prefer Vitest with React Testing Library for component helpers, stubbing the ST context via factory functions so tests operate on deterministic data. Use DOM test IDs that mirror production selectors, and cover both success and failure branches for async wrappers to catch regressions in store hydration or event wiring.

## shadcn/ui Integration
- Shared primitives inside `src/components/ui/` must attach `data-astra-component="<Name>"` plus `.astra-<name>` (and optional modifier) classes to their root surfaces/overlays. Dialog and Drawer already emit `.astra-dialog`, `.astra-dialog__overlay`, `.astra-drawer`, `.astra-drawer__overlay`, and `.astra-drawer__handle` so CSS can stay token-driven without leaking into SillyTavern DOM.
- Keep Astra-specific overrides inside `src/components/ui/astra/shadcn-overrides.css`. Update this slice when a primitive needs a new hook rather than scattering styles beside every feature.
- When you add another shadcn primitive, follow the same pattern: expose a wrapper that composes Tailwind classes but always includes the Astra class/id/data attribute so downstream modules inherit styling automatically.

## Drag-and-Drop Safety
- SillyTavern’s base app registers a body-level `DragAndDropHandler` that imports character files anywhere in the window. Astra neutralizes that inside `#contentColumn` by calling `installCharacterImportDropGuard()` (`bootstrap/guards/preventCharacterImportDrop.js`) during bootstrap.
- When you need an Astra-owned dropzone to keep functioning (e.g., gallery uploaders in the right sidebar), set `data-astra-allow-character-drop="true"` on the node or attach your own handler before the event bubbles. Otherwise, the guard will `preventDefault()`/`stopPropagation()` and the importer will never see the drop.
