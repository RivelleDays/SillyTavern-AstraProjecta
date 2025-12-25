# AstraProjecta Agent Notes

## Project Overview
- Frontend redesign of the SillyTavern interface that ships as the `AstraProjecta` third-party extension.
- Focuses on modernizing UX/UI while preserving compatibility with the SillyTavern backend (`staging` branch or newer).
- Targets desktop (1280×720 to 1920×1080) and mobile (<600px width) form factors; tablet layout is not yet optimized.

## Build and Test Commands
- Install dependencies: `npm install`
- Start development server (webpack dev server): `npm run dev`
- Production build: `npm run build`
- Lint source files (ESLint via react-app config): `npm run lint`
- Run unit tests (Vitest): `npm test`

## Code Style Guidelines
- JavaScript/JSX, React 18, and Tailwind CSS are the main stack; prefer functional components and hooks.
- Follow the `eslint-config-react-app` ruleset (see `.eslintrc` in `package.json`).
- Keep components small and focused; colocate related UI logic within `src/astra/...` subdirectories.
- Favor handcrafted CSS for layout and styling; lean on Tailwind utility classes only where required by `src/components/ui`.
- Reference the design tokens in `src/astra/styles/theme.css` (and related theme files) instead of hard-coding colors, spacing, or typography values; introduce new tokens when necessary.
- Add concise comments only where intent is non-obvious (complex logic, side-effects, integrative behavior).

## Testing Instructions
- Unit/integration tests use Vitest (`vitest.config.js`). Run `npm test` for a one-off pass or `npx vitest --watch` for iterative development.
- Prefer testing UI logic through component-level tests (e.g., React Testing Library) and pure functions with isolated unit tests.
- When introducing new stateful behavior, provide coverage for both happy-path and regression-prone edge cases.
- Validate builds locally before packaging for SillyTavern—ensure `dist/` contains the expected assets after `npm run build`.

## Security Considerations
- Do not commit SillyTavern server credentials, API keys, or personal access tokens. Use environment variables or user-local configuration instead.
- Treat data flowing from SillyTavern (characters, lore, chats) as untrusted input; sanitize any dynamic HTML and avoid `dangerouslySetInnerHTML` unless strictly necessary.
- Keep dependencies updated; review third-party updates (icons, UI kits) for license compatibility and security advisories.
- Follow SillyTavern extension sandboxing expectations—avoid privileged browser APIs and respect user privacy settings.

## Project Conventions
- **File naming:** feature modules use lowerCamelCase filenames for JS (e.g., `rightSidebarView.js`) and kebab-case for CSS (`chat-manager.css`). React/TSX under `src/components/ui` follow PascalCase component exports.
- **Module pattern:** non-React UI pieces expose factory helpers like `createRightSidebarView` that return DOM nodes plus lifecycle hooks. Extend these factories instead of rewriting to classes.
- **Import style:** prefer `@/` alias for root-scoped shared utilities and relative paths within the same feature folder. Keep extension paths shallow to avoid brittle `../../..` chains.
- **Styling system:** core styling lives in `src/astra/styles` and feature-local `.css` files that lean on custom properties, nested selectors, and BEM-ish modifiers (`block__element--variant`). Tailwind utilities are reserved for the `src/components/ui` library.
- **Design tokens:** prefer the CSS custom properties defined in `src/astra/styles/theme.css` (and its imports) to keep color, typography, and spacing consistent. Extend the token set before introducing literal values.
- **Iconography:** pull inline icons from `lucide-react` (already installed) whenever possible so the UI stays visually consistent; only reach for other icon sets if lucide lacks the needed glyph.
- **State & events:** global/shared state should compose the stores in `src/astra/state`. UI components typically receive an event source or controller object; reuse those channels instead of introducing new globals.

## Runtime Bootstrap & Entry Points
- `src/index.js` is the bundle entry SillyTavern loads from `manifest.json`; it imports global styles (`src/styles/globals.css`, `src/astra/style.css`) then invokes `initializeAstraRuntime()` from `src/astra/bootstrap.js` once the DOM is ready.
- The bootstrap returns the assembled runtime object; check the return value and log through `[AstraProjecta]` if initialization fails (matches existing guard).
- DOMContentLoaded handling mirrors SillyTavern’s extension loader. If you add async setup work, keep the bootstrap idempotent—multiple calls should no-op after the runtime is live.
- Any new lifecycle touch points should hang off `initializeAstraRuntime()` rather than adding listeners in `src/index.js` so we maintain a single boot coordinator.
- Workspace selection is coordinated through `workspaceBridge.setMode` (wired from `createShell()` to `assembleLayout()`); calling it switches the `primaryBarRight` registration, restores the right sidebar snapshot for the active workspace (`chat`, `world-info`, `extensions`), and updates layout-only affordances such as `bg1`.
- `primaryBarLeft` renders `[sidebarToggleButton] + [primaryTitleDivider] + [characterSection] + [primaryTitleSlot]`. The divider is a dedicated `div` (`#primaryTitleDivider.astra-primary-divider`) so do not reintroduce pseudo-element separators.
- Non-chat headings must come from `createPrimaryHeadingNode()` (`src/astra/app-shell/main/main-area/services/primaryHeading.js`) and mount via `applyPrimaryHeadingToSlot()`. These helpers assign readable IDs per nav (e.g., `sillyTavernPrimaryHeading`, `worldsLorebooksPrimaryHeading`) and toggle the divider visibility; avoid using the legacy `.sts-heading` classes.

## UI Component Library (`src/components/ui`)
- Houses the shadcn/vaul React primitives (`select.tsx`, `drawer.tsx`) plus shared Tailwind helpers (`src/lib/utils.ts`).
- These components only mount inside Astra-owned containers; never target SillyTavern-managed DOM. Compose them via React portals or isolated roots as needed.
- Tailwind utility usage is limited to this folder. Extend via `components.json` and run the shadcn generator when adding new primitives; keep custom styling in the co-located `.tsx` file or in `src/styles/globals.css` if tokens are required.
- Shared wrappers attach `data-astra-component` markers and `.astra-*` classes (e.g., `.astra-dialog`, `.astra-drawer`) so our CSS overrides stay scoped—mirror that pattern when creating new primitives.
- Consult `src/components/ui/AGENTS.md` for detailed wrapper rules, naming, and override guidance specific to this directory.
- Utility `cn()` merges class names with Tailwind awareness—lean on it instead of ad-hoc string concatenation.

## Styling Layers & CSS Pipeline
- `src/astra/style.css` is the Astra stylesheet entry. It imports feature-level CSS slices (`styles/theme.css`, right sidebar bundles, sidebar shells, etc.). Add new layout or feature styles by creating targeted files under `src/astra/...` and importing them here.
- `src/components/ui/astra/shadcn-overrides.css` centralizes Astra-specific overrides for shadcn/vaul components; the selectors assume the `.astra-*` classes/data attributes injected by the wrappers.
- `src/styles/globals.css` configures Tailwind base layers and shared CSS variables consumed by the shadcn components. Tokens here complement (not replace) the Astra design tokens—mirror values when bridging the two systems.
- Keep project-wide tokens in `src/astra/styles/theme.css`; if you introduce new color or spacing values for React components, define matching CSS custom properties and use them via Tailwind’s `theme.extend` when practical.
- Avoid global resets beyond what already exists; scope overrides beneath Astra containers to prevent SillyTavern regressions.

## Sidebar Panels Topology
- All sidebar panels register through `src/astra/app-shell/sidebar/panels/index.js`, which exports renderers for AI settings, persona/character management, user settings, and chat management.
- Desktop nav sections live in `src/astra/app-shell/main/navigation/navConfig.js`. The top rail renders the SillyTavern brain button (`id: 'home'`) before `chat`, `world-info`, and `extensions`; the brain icon is an inline SVG that follows `currentColor`, so adjust colors via `navRail.css`.
- The chat management feature is further modularized under `panels/chat-management/` (categories, current chats, notifications, quick switch, shared utilities). Follow this layout when adding new chat tools to keep controllers, stores, and UI separated.
- Shared panel helpers (e.g., `createChatListController`, `bindEntityAvatar`) live in `panels/chat-management/shared/`. Reuse these before creating new state holders.
- When adding a new panel, provide a renderer that accepts the shell-provided container and respects the persistence hooks defined in `sidebarState`.

## Right Sidebar & AI Settings Drawers
- `src/astra/app-shell/main/right-sidebar/runtime/createRightSidebarRuntime.js` composes the right sidebar, registers lore/portrait/chat info buttons, ports SillyTavern drawers, and exposes persistence handlers.
- Drawer migration uses `preparePortedDrawers()` and `portDrawerInto()`; update the `DRAWER_MAPPINGS` array when SillyTavern adds new blocks that belong in the AI settings tab.
- `renderAiSettings()` in `panels/aiSettings.js` receives the ported drawers, creates secondary tabs, and repositions the `#completion_prompt_manager_popup` between desktop and mobile layouts. When adjusting drawer behavior, keep the MutationObserver and media query flow intact so late-mounting DOM from SillyTavern remains supported.
- Right sidebar controllers expose APIs (`controllers.lore`, `registers.hydrateAiSettingsTab`) for other modules. Wire new behavior through these registries rather than reaching into DOM nodes directly.
- The right sidebar controller now exposes `getStateSnapshot()` / `applySnapshot()`. `assembleLayout()` persists a snapshot per workspace before switching modes so buttons/panels remain independent across Chat, Worlds/Lorebooks, and Extensions.

## Mobile Runtime Notes
- Mobile-specific orchestration lives under `src/astra/mobile/` (runtime, state, UI, utils). `createMobileRuntime()` handles layout switching and overlays; state utilities manage classes such as `MOBILE_LAYOUT_CLASS` that desktop logic checks before toggling sidebars.
- `mobile/utils/device.js` exports `getMobileMediaQuery()` and `isMobile()`; use these helpers instead of recreating matchMedia logic so the sidebar/AI settings relocation stays consistent.
- Any feature that changes visibility based on layout should consult the mobile state helpers (`showMobileMainArea`, `hideMobileMainArea`, etc.) to avoid desynchronizing the mobile shell.
- Mobile nav rail is now independent: `createMobileNavRail()` (`src/astra/mobile/ui/mobileNavRail.js`) renders into `#mobileSidebarNavRail` while the mobile shell is mounted. `createMobileShellRuntime()` temporarily detaches the desktop `#sidebarNavRail`, mounts the mobile rail, and restores the desktop version when returning to wide layouts. The mobile rail mirrors `sidebarNavStore` snapshots and always injects the `chat` button into the middle section immediately after `ai-settings` / `user-settings` so the primary actions stay centered. On mobile, selecting the `chat` nav item only updates the active tab; workspace tabs such as `world-info` / `extensions` are the ones that reveal the main content area, while the chat pane is opened via chat list interactions.

## AI Agent Guidelines
- **Follow existing patterns:** before building new UI or data flows, inspect sibling modules (e.g., `src/astra/app-shell/main/right-sidebar/*`, `src/astra/app-shell/sidebar/panels/*`) and keep naming, structure, and DOM IDs consistent.
- **Consult documentation:** skim `README.md`, this `AGENTS.md`, and any feature-level comments before large changes. When integrating with SillyTavern, check upstream extension docs to avoid breaking assumptions.
- **Linting & formatting:** after every code change run `eslint --fix --quiet`. Resolve any remaining lint errors manually before considering the task complete.
- **Testing cadence:** execute `npm test` (or focused Vitest suites) when modifying state management, utilities, or DOM behavior. Add coverage for new edge cases instead of relying solely on manual verification.
- **Update documentation:** whenever you add reusable components, adjust architecture, or learn project-specific quirks, update `AGENTS.md` or related docs to keep future agents in sync.
- **Logging discipline:** restrict logging to actionable `console.error` / `console.warn` calls prefixed with `[AstraProjecta]`. Remove or downgrade any `console.log` debug output before submitting changes.
- **Communicate assumptions:** flag uncertainties or risky refactors in your summary so Rivelle can confirm intent before merging.
- **Language quality:** write code, comments, and documentation in clear, concise English to keep communication consistent.

## Nested Documentation
- `src/astra/AGENTS.md` drills into the runtime implementation (bootstrap glue, stores, right sidebar anatomy). Review it before altering Astra internals; this root file focuses on high-level policies and cross-cutting conventions.
- `src/astra/app-shell/main/main-area/views/home/AGENTS.md` covers the SillyTavern home view shell, character-card browser wiring, and layout/styling rules for `astraMainHomeView`.
- Keep the two documents in sync—when you teach future agents a new pattern in the runtime guide, add a pointer or short summary here so contributors know where to look.

## SillyTavern Overview (For Astra Devs)
- Core stack: vanilla JavaScript modules with heavy jQuery usage across UI (e.g., select2, toastr, jQuery plugins).
- Extension loader: SillyTavern dynamically injects each extension’s CSS/JS via `manifest.json`.
  - CSS is added as a `<link>` tag; JS is loaded as `type="module"` scripts.
  - Paths are relative to the extension folder under `public/scripts/extensions`.
- Global context: `globalThis.SillyTavern.getContext()` returns ST services, settings, and the event bus.
- Event bus: `eventSource` and `event_types` power lifecycle and UI hooks. Prefer events over DOM polling.

Quick recipe:

```js
const ctx = globalThis.SillyTavern?.getContext?.();
if (ctx) {
  const { eventSource, event_types } = ctx;
  eventSource.on(event_types.APP_READY, () => {
    // Bootstrap Astra here
  });
}
```

## React × jQuery Coexistence
SillyTavern owns and mutates large portions of the DOM via jQuery. To avoid conflicts:

- Do
  - Mount React only into Astra-owned containers (e.g., `#astra-projecta-react-root`) or elements you create.
  - Keep SillyTavern-owned nodes as source of truth; update via ST services/events, not React renders.
  - When integrating legacy drawers/panels, use Astra helpers to move/lock them instead of ad‑hoc re-parenting.
  - Scope all styles under Astra containers or dedicated body classes; rely on design tokens from `src/astra/styles/theme.css`.
  - Prefer `console.error`/`console.warn` with the `[AstraProjecta]` prefix for actionable logs only.

- Don’t
  - Don’t render React into ST-managed nodes (chat list, legacy drawers, toolbars). jQuery will clash.
  - Don’t rename/remove ST IDs/classes that its scripts query with jQuery selectors.
  - Don’t introduce global CSS resets. Avoid `dangerouslySetInnerHTML` unless strictly necessary (sanitize first).

## Extension Lifecycle & Events
- Initialization
  - Wait for `APP_READY` to bootstrap Astra’s runtime (context and DOM anchors are stable).
  - Use `EXTENSIONS_FIRST_LOAD`/`SETTINGS_LOADED` to hydrate settings/state that depend on other extensions.
- Reactive hooks to consider
  - `CHAT_CHANGED`, `MESSAGE_*`, `GROUP_UPDATED` for content and header refreshes.
  - `SETTINGS_UPDATED`, `EXTENSION_SETTINGS_LOADED` for UI/state persistence.
- Cleanup
  - If you attach ad‑hoc listeners or observers, remove them on teardown (EventEmitter supports `removeListener`).

Sample wiring:

```js
const { eventSource, event_types } = SillyTavern.getContext();
eventSource.on(event_types.APP_READY, initializeAstraRuntime);
eventSource.on(event_types.CHAT_CHANGED, () => updateCharacterDisplay());
```

### SillyTavern event quick reference

_Source of truth: `public/scripts/events.js` in the SillyTavern repo. Re-check the upstream file whenever SillyTavern updates; this table only highlights the events we hook most often._

- **Boot & settings:** `APP_READY`, `EXTENSIONS_FIRST_LOAD`, `SETTINGS_LOADED(_BEFORE|_AFTER)`, `SETTINGS_UPDATED`, `EXTENSION_SETTINGS_LOADED`, `MOVABLE_PANELS_RESET`, `IMPERSONATE_READY`.
- **Chat session & messages:** `CHAT_CHANGED`, `CHAT_CREATED`, `CHAT_DELETED`, `GROUP_CHAT_CREATED`, `GROUP_CHAT_DELETED`, `MESSAGE_SENT`, `MESSAGE_RECEIVED`, `MESSAGE_SWIPED`, `MESSAGE_UPDATED`, `MESSAGE_FILE_EMBEDDED`, `MESSAGE_EDITED`, `MESSAGE_DELETED`, `MESSAGE_SWIPE_DELETED`, `MESSAGE_REASONING_EDITED`, `MESSAGE_REASONING_DELETED`, `MORE_MESSAGES_LOADED`, `USER_MESSAGE_RENDERED`, `CHARACTER_MESSAGE_RENDERED`, `CHARACTER_FIRST_MESSAGE_SELECTED`.
- **Generation pipeline:** `GENERATION_AFTER_COMMANDS`, `GENERATION_STARTED`, `GENERATION_STOPPED`, `GENERATION_ENDED`, `GENERATE_BEFORE_COMBINE_PROMPTS`, `GENERATE_AFTER_COMBINE_PROMPTS`, `GENERATE_AFTER_DATA`, `STREAM_TOKEN_RECEIVED` (and the deprecated `SMOOTH_STREAM_TOKEN_RECEIVED` alias), `STREAM_REASONING_DONE`, `SD_PROMPT_PROCESSING`.
- **Characters, groups, world info:** `GROUP_UPDATED`, `GROUP_MEMBER_DRAFTED`, `GROUP_WRAPPER_STARTED`, `GROUP_WRAPPER_FINISHED`, `CHARACTER_EDITOR_OPENED`, `CHARACTER_EDITED`, `CHARACTER_PAGE_LOADED`, `CHARACTER_DELETED`, `CHARACTER_DUPLICATED`, `CHARACTER_RENAMED`, `CHARACTER_RENAMED_IN_PAST_CHAT`, `CHARACTER_GROUP_OVERLAY_STATE_CHANGE_(BEFORE|AFTER)`, `OPEN_CHARACTER_LIBRARY`, `WORLDINFO_SETTINGS_UPDATED`, `WORLDINFO_UPDATED`, `WORLDINFO_FORCE_ACTIVATE`, `WORLDINFO_ENTRIES_LOADED`, `WORLD_INFO_ACTIVATED`.
- **Model / preset / API changes:** `CHATCOMPLETION_SOURCE_CHANGED`, `CHATCOMPLETION_MODEL_CHANGED`, `TEXT_COMPLETION_SETTINGS_READY`, `CHAT_COMPLETION_SETTINGS_READY`, `CHAT_COMPLETION_PROMPT_READY`, `MAIN_API_CHANGED`, `OAI_PRESET_CHANGED_(BEFORE|AFTER)`, `OAI_PRESET_IMPORT_READY`, `OAI_PRESET_EXPORT_READY`, `PRESET_CHANGED`, `PRESET_DELETED`, `PRESET_RENAMED`, `PRESET_RENAMED_BEFORE`, `CHARACTER_MANAGEMENT_DROPDOWN`.
- **Attachments, tools, secrets & misc:** `FILE_ATTACHMENT_DELETED`, `MEDIA_ATTACHMENT_DELETED`, `IMAGE_SWIPED`, `TOOL_CALLS_PERFORMED`, `TOOL_CALLS_RENDERED`, `SECRET_WRITTEN`, `SECRET_EDITED`, `SECRET_ROTATED`, `SECRET_DELETED`, `FORCE_SET_BACKGROUND`, `ONLINE_STATUS_CHANGED`, `EXTRAS_CONNECTED`, `CONNECTION_PROFILE_(LOADED|CREATED|UPDATED|DELETED)`.

Refer back to `Writing-Extensions.md` for more examples that show how `eventSource` listeners interact with `SillyTavern.getContext()` and avoid re-importing SillyTavern modules directly.

## Manifest & Assets
- `manifest.json` controls how SillyTavern loads this extension:
  - `js`: path to the built ESM bundle (e.g., `dist/index.js`).
  - `css`: stylesheet for Astra (e.g., `dist/style.css`).
  - `loading_order`: relative load priority among extensions.
  - Optional: `requires`, `optional`, `dependencies`, `minimum_client_version`, `i18n` mappings.
- Keep output files under `dist/` and ensure paths remain stable; SillyTavern resolves them relative to the extension directory.
- Store bundled SVGs and similar static art under `src/astra/assets/` (e.g., `src/astra/assets/branding/ST-brain.svg`) so Webpack can include them via `new URL('@/astra/assets/branding/ST-brain.svg', import.meta.url).href` or CSS-relative imports.
- Favor a conservative `loading_order` to avoid races with extensions that move shared UI.

## CSS Isolation & Tokens
- Scope Astra styles under stable containers or body classes used by the runtime (e.g., `#astra-projecta-react-root`, `body.astra-mobile-layout`).
- Use design tokens from `src/astra/styles/theme.css` (spacing, typography, colors, surfaces). Extend tokens rather than hard-coding values.
- Avoid leaking styles into SillyTavern components; don’t override ST selectors unless intentionally integrating a specific widget.

## Interop Patterns
- Primary integration point: `SillyTavern.getContext()`.
  - Read settings and invoke services through the context rather than duplicating logic.
  - Communicate via `eventSource` and `event_types` to follow ST lifecycle.
- DOM integration
  - Use Astra utilities for moving/locking legacy drawers instead of direct jQuery/React mutations.
  - Treat ST DOM as mutable by jQuery; prefer event-driven updates over querying class names periodically.
- Shared libraries (`SillyTavern.libs`) expose lodash, localforage, Fuse, DOMPurify, Handlebars, moment, showdown, etc.—import from there instead of bundling duplicates. Add a `global.d.ts` shim (see `Writing-Extensions.md`) if you want IDE intellisense for the `SillyTavern` global in TypeScript-aware tooling.

## State persistence & SillyTavern data surfaces
- **Extension-scoped settings:** keep a namespace inside `SillyTavern.getContext().extensionSettings` (e.g., `extensionSettings.astra_projecta`) and use `saveSettingsDebounced()` after mutations. Rehydrate defaults defensively so new keys exist when users upgrade.
- **Chat metadata:** store chat-specific data in `chatMetadata`; never hold a long-lived reference (the object swaps on `CHAT_CHANGED`). Call `saveMetadata()` to persist and listen for `CHAT_CHANGED` to refresh caches.
- **Character cards:** use `writeExtensionField(characterId, key, value)` to persist Astra-specific data on Character Card v2 exports. Remember `characterId` is an array index that is `undefined` in group chats—guard before writing.
- **Preset extension fields:** obtain the preset manager via `getPresetManager()` and call `writePresetExtensionField`/`readPresetExtensionField` for API-specific overrides. Handle `PRESET_CHANGED`/`MAIN_API_CHANGED` to keep UI in sync.

## Localization, commands, and macros
- Localization strings can be injected at runtime with `addLocaleData(locale, map)` or via the manifest `i18n` block pointing to JSON files. Keys cannot override SillyTavern defaults, so keep Astra keys distinct.
- Register slash commands through `SlashCommandParser.addCommandObject(SlashCommand.fromProps(...))` instead of the legacy `registerSlashCommand`. Provide metadata (`returns`, argument definitions, help markup) so autocomplete and `/help` stay accurate.
- Use `registerMacro(name, valueOrFn)` / `unregisterMacro(name)` to expose lightweight macro substitutions (character cards, prompts, STscript, etc.). Macro callbacks must be synchronous; avoid registering large numbers to keep regex passes fast.

## Prompt interceptors & Extras API
- To mutate or block generations, declare `generate_interceptor` in `manifest.json` and expose a matching `globalThis.myInterceptor = async (...) => { ... }`. Interceptors run in ascending `loading_order` and should await asynchronous work before returning.
- You can emit SillyTavern events yourself via `eventSource.emit('customEvent', payload)` if Astra needs to fan out state to other extensions—prefer this to ad-hoc globals so listeners can opt in.
- The Extras API helper `doExtrasFetch()` (fed by `getApiUrl()`) still works but the Extras stack is deprecated—call it only when bridging legacy tools and wrap requests in feature flags so Astra works without Extras connectivity.

## Troubleshooting
- React rendered into ST-owned nodes → flicker, duplicate handlers, or lost state. Fix: mount only in Astra containers.
- Global CSS bleeding into ST widgets → broken layouts. Fix: scope under Astra containers; rely on tokens.
- Race with other extensions → elements missing on mount. Fix: defer work to `APP_READY` and check after `EXTENSIONS_FIRST_LOAD`.
