# AstraProjecta Mobile Guide (src/astra/mobile)

This guide documents the mobile shell: how it mounts, how layout and visibility are controlled, what APIs are exposed, and how to integrate with SillyTavern events. It complements the root AGENTS.md and src/astra/AGENTS.md.

## Purpose & Scope
- Provide a responsive mobile experience (<600px) without fighting SillyTavern’s jQuery-managed DOM.
- Own only Astra containers and body classes; never render React into ST-owned nodes.
- Keep bootstrap idempotent: mounting/unmounting must be safe on repeated calls and while media queries change.

## High‑Level Architecture
- Shell runtime
  - `runtime/createMobileRuntime.js` – Public entry to compose the mobile shell; maps layout helpers and class names.
  - `runtime/shell.js` – Core implementation: mounts hosts, toggles body classes, inserts close button, wires media query, gestures, and sidebar interactions.
- State helpers
  - `state/layoutState.js` – Exposes `MOBILE_LAYOUT_CLASS`, `MOBILE_MAIN_VISIBLE_CLASS` and `createSyncMainVisibilityFromChat()` for chat‑driven visibility.
  - `state/layout.js` – DOM mutations for show/hide/reset main area and `isMobileLayoutActive()`.
- UI helpers
  - `ui/elements.js` – `createMobileOverlayHosts()` for container nodes and `createMobileMainCloseButton()` for the header back button.
  - `ui/mobileChatHeader.js` – Builds the mobile chat header, mirrors entity identity/lore/info controls, and temporarily wraps `#form_sheld` in `#mobileFormShellWrapper` while the mobile layout is active.
- Utilities
  - `utils/device.js` – `MOBILE_MEDIA_QUERY` = `'(max-width: 600px)'`, `getMobileMediaQuery()`, `isMobile()`.
  - `utils/swipeHandlers.js` – Generic swipe/wheel adapter (not required by the shell, which has its own gesture logic).
- Styles
  - `styles/index.css` → `styles/mobile.css` → `styles/mobile/*` slices for structure, sidebar, chat, overlays.

## DOM Anchors & Classes
- Body classes
  - `MOBILE_LAYOUT_CLASS` = `astra-mobile-layout` – Enables mobile layout rules.
  - `MOBILE_MAIN_VISIBLE_CLASS` = `astra-mobile-main-visible` – Indicates the main content is visible (sidebar hidden).
  - ST classes respected: `sidebar-expanded`, `sidebar-fully-collapsed`.
- Mobile hosts (created by `createMobileOverlayHosts()`)
  - `#astraMobileOverlayHost` – Root mobile overlay container.
  - `#astraMobileSidebarHost` – Receives `#leftSidebar`.
  - `#astraMobileMainHost` – Receives `#contentColumn`.
- Portal root
  - Use `ensureAstraPortalHost()` (default id `astraPortalRoot`) for dropdowns/popovers/drawers so floating layers stay alive when `appWrapper` is hidden and content is moved under `#astraMobileOverlayHost`.
- Buttons
  - `#mobileMainCloseButton` – Back/home icon button prepended to `primaryBarLeft` when in mobile.
  - `#mobileChatHeader` – Mobile-only container that holds the cloned identity trigger plus lore/chat info buttons.
  - `#mobileFormShellWrapper` – Gradient wrapper that nests `#mobileChatHeader` together with `#form_sheld` during mobile layout activation.

## Public API Overview
- `createMobileRuntime({ appWrapper, contentColumn, leftSidebar, primaryBarLeft, getCurrentChatId, sidebarNavStore })`
  - Returns
    - `initializeLayout()` – Detects device, applies initial classes, wires media query, mounts/unmounts hosts.
    - `attachSidebarInteractions({ chatManagerNavigateEvent }?)` – Shows main area when a chat list item or provided navigation event fires.
    - `attachTouchGestures()` – Enables left‑swipe to hide main area when visible.
    - `syncMainVisibilityFromChat()` – Hides main area when no chat is active (calls `createSyncMainVisibilityFromChat`).
    - `isLayoutActive()` – Alias of `isMobileLayoutActive()`.
    - `showMainArea()` / `hideMainArea()` / `resetMainArea()` – Visibility controls with ARIA management.
    - `MOBILE_LAYOUT_CLASS` / `MOBILE_MAIN_VISIBLE_CLASS` – Exposed for style/logic coordination.

Notes
- `initializeLayout()` internally checks `isMobile()` and `matchMedia` availability; it also inserts/removes the mobile close button in `primaryBarLeft`.
- `sidebarNavStore?.setIsExpanded(...)` is kept in sync with ST’s `sidebar-fully-collapsed` class.

## Lifecycle & Event Wiring
Bootstrap recipe (pseudo‑code):

```js
import { createMobileRuntime } from '@/astra/mobile'

const mobile = createMobileRuntime({
  appWrapper: document.getElementById('appWrapper'),
  contentColumn: document.getElementById('contentColumn'),
  leftSidebar: document.getElementById('leftSidebar'),
  primaryBarLeft: document.getElementById('primaryBarLeft'),
  getCurrentChatId: ctx.getCurrentChatId,
  sidebarNavStore,
})

const { mobileMediaQuery } = mobile.initializeLayout()
const detachSidebarInteractions = mobile.attachSidebarInteractions({
  chatManagerNavigateEvent: 'chat-manager:navigate', // optional, when available
})
const detachGestures = mobile.attachTouchGestures()

// Event bus hooks
eventSource.on(event_types.CHAT_CHANGED, mobile.syncMainVisibilityFromChat)
eventSource.on(event_types.CHAT_DELETED, mobile.syncMainVisibilityFromChat)
eventSource.on(event_types.GROUP_CHAT_DELETED, mobile.syncMainVisibilityFromChat)

// Cleanup on teardown
// detachSidebarInteractions(); detachGestures();
```

Idempotency
- Calling `initializeLayout()` or the attachers multiple times is safe; duplicate event listeners are avoided by returning teardown functions for callers to manage.

## Behavior Details
- Mount/unmount flow
  - When mobile media query matches, `mount()` moves `#leftSidebar` and `#contentColumn` into Astra mobile hosts and hides the original `#appWrapper`.
  - On desktop, `unmount()` returns nodes back to `#appWrapper` and clears mobile classes.
  - `createMobileChatUiController()` clones the chat identity UI, inserts `#mobileChatHeader`, and restores `#form_sheld` to its original parent when the layout exits mobile mode.
- Visibility
  - `showMobileMainArea()` adds `astra-mobile-main-visible`, sets `#contentColumn[aria-hidden=false]` and `#leftSidebar[aria-hidden=true]`.
  - `hideMobileMainArea()` removes the class, flips ARIA state, and ensures sidebar interaction.
  - `resetMobileMainArea()` clears both ARIA attributes and visible class.
- Close button
  - Inserted only when mobile layout is active; clicking it triggers `hideMainArea()`.
- Gestures
  - `attachTouchGestures()` listens for one‑finger horizontal drags on `#contentColumn` and hides main area when swiped left; vertical deltas > 60px are ignored to avoid scroll conflicts.
- Sidebar interactions
  - Clicking a `.chat-manager-chat-list-item` or receiving a provided navigate event shows the main area (useful after choosing a chat).
  - Nav rail selection only calls `showMainArea()` for workspace tabs (`world-info`, `extensions`, etc.); choosing `chat` keeps the sidebar visible, and selecting the already-active tab is ignored to avoid flicker.

## Styling Guidance
- Scope all rules under the mobile body classes and host IDs; avoid leaking into ST components.
- Tokens: use `src/astra/styles/theme.css` variables (colors, spacing, typography). Do not hard‑code values.
- Structure
  - `styles/mobile/structure.css` – Positioning for `#leftSidebar` and `#contentColumn`, transitions, ARIA‑driven visibility.
  - `styles/mobile/sidebar.css` – Nav rail repositioning, mobile footer rail, icon sizing.
  - `styles/mobile/chat.css` – Chat form sizing; textarea constraints.
  - `styles/mobile/overlays.css` – Overlay dimensions (character popup, AI settings, etc.).
  - `styles/mobile/chat-header.css` – Styles the mobile chat header, gradient wrapper, resized lore/info icons, and chevron affordance.
- If you change the breakpoint, update both CSS `@media (max-width: 600px)` and `utils/device.MOBILE_MEDIA_QUERY`.

## Accessibility
- ARIA
  - Main area and sidebar toggle `aria-hidden` to reflect current visibility.
  - Keep focus management in mind: when hiding main area, leave focusable controls in the sidebar; when showing main area, ensure its header or primary field is focusable.
- Motion
  - Transitions favor cubic‑bezier easing and are short; avoid adding large delays.
- Identity trigger
  - The cloned `#mobileCharacterIdentity` button registers with the right sidebar controller; keep the aria-label/title in sync so users know it's interactive.

## Testing Checklist (Vitest / JSDOM)
- Stub `window.matchMedia` to control `isMobile()` and `getMobileMediaQuery()`.
- Verify class toggles on `document.body` for layout and visibility.
- Assert ARIA attributes on `#contentColumn` and `#leftSidebar` under show/hide/reset.
- Simulate gesture sequences to confirm left‑swipe hides main area only when visible.
- Ensure `attachSidebarInteractions()` responds to clicks on `.chat-manager-chat-list-item`.
- Assert nav rail selection toggles visibility only for workspace tabs and leaves the chat tab in the sidebar unless a chat list item is chosen.
- Confirm idempotency by calling `initializeLayout()` and attachers twice and validating no duplicate effects.

## Do / Don’t
- Do
  - Use `createMobileRuntime()` from bootstrap and keep it the single coordinator for mobile behavior.
  - Consult `isMobileLayoutActive()` before mutating mobile visibility.
  - Wire ST events to `syncMainVisibilityFromChat()` for empty‑chat cases.
  - Keep new UI contained within mobile hosts; never mutate ST DOM outside these containers.
- Don’t
  - Don’t render React into ST‑owned nodes or rely on ST classnames for logic beyond documented ones.
  - Don’t add global resets or override ST selectors broadly.
  - Don’t change IDs (`astraMobile*`, `mobileMainCloseButton`, `mobileChatHeader`, `mobileFormShellWrapper`) or body class names; other code relies on them.

## Troubleshooting
- Main area never shows
  - Check that `MOBILE_LAYOUT_CLASS` is on `<body>`, and that `#contentColumn` exists and is moved under `#astraMobileMainHost`.
- Sidebar not interactive
  - Ensure `aria-hidden` flips to `false` when main area hides; verify no overlay prevents clicks.
- Layout stuck in mobile/desktop after resize
  - Ensure `matchMedia` listener is attached; confirm `getMobileMediaQuery()` returns a valid list.
- Back button missing
  - Verify `primaryBarLeft` is passed to the runtime and that `createMobileMainCloseButton()` is prepended on mobile.

## Change Notes
- When altering breakpoint or class names, update:
  - `utils/device.js` (media query)
  - `styles/mobile/*.css` (media rules)
  - Any logic/tests that depend on `MOBILE_LAYOUT_CLASS` / `MOBILE_MAIN_VISIBLE_CLASS`.
- Chat header update: introduced `ui/mobileChatHeader.js` and `styles/mobile/chat-header.css`; mobile layout now wraps `#form_sheld` in `#mobileFormShellWrapper`, adds `#mobileChatHeader`, and mirrors lore/chat info buttons with 20px icons.
- Nav rail behavior: mobile nav rail no longer forces the chat pane open; only workspace tabs reveal the main content area and repeated tab selections no-op.
- Home tab placement: mobile nav rail moves the SillyTavern home tab into the visible middle row while keeping a single-row layout.
- Primary bar cleanup: only `mobileMainCloseButton` remains as back control; chat header stays above the send form; home entity uses the standard heading (no extra bar). Quick-list dispatch still triggers `astra:home-route:entity-open` and route sync shows main area on entity view.

## Contributing
- Follow project conventions in the root AGENTS.md.
- Keep this guide in sync with implementation changes; add recipes when introducing new interactions or hosts.
