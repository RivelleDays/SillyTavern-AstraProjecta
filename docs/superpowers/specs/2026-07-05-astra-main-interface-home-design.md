# Astra Main Interface Home Design

## Status

Approved for implementation planning. The selected visual direction is **A. Compact dashboard** from the local demo at `.superpowers/brainstorm/37114-1783180809/content/astra-home-approaches-v1.html`.

## Goal

Add a Global `Home` tab to AstraProjecta's mobile Astra main interface. `Home` appears before `Chats`, becomes the default Global tab, and provides a compact launch surface for SillyTavern routes, a reserved carousel area, the three most recent global chats, and grouped external resource links.

The implementation must preserve AstraProjecta's current ownership boundaries: mobile panel shell code stays thin, main-interface content stays feature-owned, SillyTavern panel opening stays app-level, and chat opening continues through the existing chat-catalog flow.

## Current Context

- `src/app/mobile/astra-main-interface-panel` owns the mobile panel shell only.
- `src/packages/features/astra-main-interface/AstraMainInterface.tsx` owns first-level scope routing and delegates Global section tabs to `global/GlobalAstraMainInterface.tsx`.
- `src/packages/features/astra-main-interface/global/GlobalAstraMainInterface.tsx` currently owns the Global tab descriptors and defaults. Its current tab order is `Chats`, then `Categories`, and the current default is `Chats`.
- `src/packages/features/astra-main-interface/chat-list` owns reusable chat-list behavior and the chat-opening feedback controller.
- `src/app/mobile/sillytavern-interface-panel` owns the right-side SillyTavern interface panel controller and exposes an adapter with `openRoute`.
- `src/packages/features/chat-session/send-form/main-menu/tiles.tsx` already defines the six SillyTavern shortcut route descriptors and label splitting used by the chat main menu drawer.
- `src/components/ui/shadcn/separator.tsx` exposes the local shadcn `Separator` wrapper. The vertical shortcut dividers should use `orientation="vertical"`.

## Non-Goals

- Do not implement carousel behavior, carousel data loading, or carousel controls in this slice.
- Do not add desktop-specific assembly or make desktop requirements affect the Phase 1 mobile baseline.
- Do not move native SillyTavern drawers or route hosts into `astra-main-interface`.
- Do not duplicate low-level chat activation logic in Home.
- Do not add new persistent Home route storage unless a later slice asks for persisted secondary tab state.
- Do not introduce exact CSS-value tests for visual tuning.

## User Experience

### Tab Placement

The Global secondary tabs become:

1. `Home`
2. `Chats`
3. `Categories`

`Home` is the default Global tab. Existing Current and Favorite tab defaults remain unchanged.

### Compact Dashboard Layout

The Home tab uses a compact dark dashboard layout inside the existing Global tab scroll surface.

The section order is:

1. SillyTavern shortcut row
2. Reserved carousel area
3. Recent chats
4. External links

The layout should stay dense enough for mobile use while matching the approved mockup's quiet dashboard feel. It should avoid hero-page treatment, decorative ambient motion, and large marketing-style sections.

## Functional Requirements

### 1. SillyTavern Shortcut Row

Home shows one adaptive row with six shortcut buttons:

- AI Settings
- User Settings
- Lorebook
- Extensions
- Backgrounds
- Character Management

Each button shows a route icon above concise English text. Buttons share the available row width. Low-opacity vertical separators appear between neighboring buttons using the local `Separator` component with `orientation="vertical"`.

Clicking a shortcut opens `sillytavern-interface-panel` on the matching route:

- AI Settings -> `SILLYTAVERN_INTERFACE_ROUTES.aiSettings`
- User Settings -> `SILLYTAVERN_INTERFACE_ROUTES.userSettings`
- Lorebook -> `SILLYTAVERN_INTERFACE_ROUTES.lorebook`
- Extensions -> `SILLYTAVERN_INTERFACE_ROUTES.extensions`
- Backgrounds -> `SILLYTAVERN_INTERFACE_ROUTES.backgrounds`
- Character Management -> `SILLYTAVERN_INTERFACE_ROUTES.characterManagement`

The route-opening behavior must delegate through the existing mobile SillyTavern interface adapter so AI Settings keeps stored child-page behavior and native drawer handling remains owned by `sillytavern-interface`.

### 2. Carousel Reserved Area

Home includes a visible reserved area for a future carousel. The area has stable selectors and simple copy indicating it is reserved. It does not fetch data, rotate slides, animate, or expose controls.

### 3. Recent Chats

Home shows a `Recent Chats` section containing the three most recent global chat catalog entries.

The section header has:

- left: icon plus English title `Recent Chats`
- right: `View all` plus `ChevronRight`

Clicking `View all` switches the Global tab to `Chats`.

Each recent chat row is clickable and opens the corresponding chat using the same global chat open contract as the Global Chats list. The open flow must close `astra-main-interface-panel` in the same cases the full chat list closes it, including already-current chats. Chat-switch loading remains owned by the existing chat-switch loading coordinator through `useChatCatalogEntryOpenController`.

Each recent chat row shows:

- top: chat name, using the chat id fallback already used by chat rows when needed
- middle: last-message preview clamped to two lines
- bottom: avatar, entity name, and last-message time

The Home recent row intentionally omits row menu actions, category actions, delete/rename/export controls, and the full chat-list footer. It may reuse shared avatar rendering and selector family conventions, but it should not render `.astra-main-interface-chat-row__action-button--menu` or `astra-main-interface-chat-row__footer`.

### 4. External Links

Home shows grouped links:

#### SillyTavern

- GitHub repository: `https://github.com/SillyTavern/SillyTavern`
- Documentation: `https://docs.sillytavern.app/`
- Official Discord: `https://discord.gg/sillytavern`
- Official Reddit: `https://www.reddit.com/r/SillyTavernAI/`

#### AstraProjecta

- GitHub repository: `https://github.com/RivelleDays/SillyTavern-AstraProjecta`
- Discord server: `https://discord.gg/bb35eB5Zgr`
- Rivelle: `https://bio.site/rivelle`

This group must explicitly state that AstraProjecta is a third-party SillyTavern extension and that these links are not official SillyTavern channels.

#### Supported Extensions

- SillyTavern Character Library: `https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary#sillytavern-character-library`

External links open in a new browser context with `target="_blank"` and `rel="noreferrer"`.

## Proposed Architecture

### Global Tab Routing

Extend `GlobalAstraMainInterfaceTabValue` to include `home`.

Update `DEFAULT_GLOBAL_ASTRA_MAIN_INTERFACE_TAB_VALUE` to `home`.

Update Global route descriptors so route order is:

- `global-home`
- `global-chats`
- `global-categories`

`getGlobalAstraMainInterfaceRoutes()` and `getGlobalAstraMainInterfaceRouteKey()` should continue deriving from the descriptor list.

### Home Page Component

Add a Global-owned page component at `src/packages/features/astra-main-interface/global/GlobalHomePage.tsx`.

This component owns:

- Home dashboard composition
- shortcut descriptor rendering
- recent chat row rendering
- external link rendering
- switching to `Chats` through `onRequestChatsTab`

It consumes:

- the resolved global `ChatCatalogStore`
- global `openChat` implementation
- `onRequestClose`
- a SillyTavern route opener callback
- route icon renderer

It should not create its own global chat catalog store when `GlobalAstraMainInterface` already resolved one. This keeps Home and Chats backed by the same snapshot and refresh lifecycle.

### SillyTavern Interface Adapter Propagation

The app-level mobile composition already owns the SillyTavern panel adapter for send-form shortcuts. The same adapter capability should be passed into `AstraMainInterface` so Home can request route opens without importing mobile panel implementation details.

Use these public prop names:

```ts
interface AstraMainInterfaceProps {
	onSillyTavernInterfaceRouteOpen?: (
		routeKey: SillyTavernInterfaceRouteKey,
	) => void;
	renderSillyTavernInterfaceRouteIcon?: SendFormSillyTavernInterfaceAdapter["renderRouteIcon"];
}
```

The app-level mobile runtime must wire these props from the existing SillyTavern interface panel adapter. Feature UI must not import from `src/app/mobile/sillytavern-interface-panel`.

### Shortcut Descriptors

Define Home shortcut descriptors in `src/packages/features/astra-main-interface/global/homeShortcuts.ts`.

The descriptor list uses shared route and icon-key types from `src/app/shared/sillytavern-interface`, but it must not live in `src/app/shared/sillytavern-interface` because that folder owns only portable route/icon-key contracts and explicitly excludes route descriptors or feature UI policy.

The descriptor list must reference `SILLYTAVERN_INTERFACE_ROUTES` instead of duplicating route string constants. It mirrors the six shortcut labels and label-line behavior from `send-form/main-menu/tiles.tsx` by using Home-owned descriptor fields, but Home must not import from chat-session send-form files.

### Recent Chat Data Flow

`GlobalAstraMainInterface` should resolve one global `ChatCatalogStore` and pass it to both Home and Chats.

Home reads the store with `useSyncExternalStore`, orders entries with `sortChatCatalogEntries(entries, "most-recent")`, and slices the first three entries.

Opening a recent chat uses `useChatCatalogEntryOpenController` with:

- `openEntry` from the Global `openChat` prop/default
- `onRequestClose` from main interface props
- no `refreshOnOpenSuccess`, matching the Global Chats list default

Home should show a compact empty/loading/error state when the catalog is loading, empty, or errored. Empty and error states should be concise and should not introduce blocking dialogs.

## Styling

Add Home selectors to `src/packages/features/astra-main-interface/astra-main-interface.css`.

Selector naming should follow existing BEM conventions under the feature scope, for example:

- `.astra-main-interface-home`
- `.astra-main-interface-home__shortcut-row`
- `.astra-main-interface-home__shortcut`
- `.astra-main-interface-home__shortcut-separator`
- `.astra-main-interface-home__carousel-slot`
- `.astra-main-interface-home__section-header`
- `.astra-main-interface-home__recent-list`
- `.astra-main-interface-home__recent-row`
- `.astra-main-interface-home__links`

Clickable Astra-owned controls must have explicit enabled and disabled cursor rules where applicable.

The design should use existing shadcn/Astra tokens and derived color tokens. Do not add ad hoc color-token families or one-off tint suffixes outside the canonical token ramp.

## i18n

All user-facing English copy should be added to `locales/en.json` and consumed through typed `translateAstra` keys.

Expected key groups include:

- `astraMainInterface.global.tabs.home`
- `astraMainInterface.home.shortcuts.*`
- `astraMainInterface.home.carousel.*`
- `astraMainInterface.home.recent.*`
- `astraMainInterface.home.links.*`

Run the repository i18n generation/check flow as required by the existing build pipeline after adding keys.

## Accessibility

- Home is contained in the existing tab panel semantics from `AstraSmoothTabs`.
- Shortcut buttons have accessible labels matching their visible labels.
- `View all` is a button with a clear accessible label.
- Recent chat rows expose keyboard activation with Enter and Space, matching existing chat-row behavior.
- External links have meaningful text and safe external-link attributes.
- Decorative icons and separators are hidden from assistive technology.

## Testing

Add focused tests for:

- Global route descriptor order includes `global-home` first.
- Global default tab is `home`.
- `Home`, `Chats`, and `Categories` render in that order.
- Shortcut buttons render with route icons, labels, and vertical separator elements.
- Clicking a shortcut calls the route opener with the correct `SillyTavernInterfaceRouteKey`.
- `View all` switches the active Global tab to `Chats`.
- Home renders at most three recent chats, ordered by most recent chat time.
- Clicking a Home recent chat calls the injected global open function and closes the main interface through the existing open controller behavior.
- Recent rows do not render row menu action controls or the full chat-row footer.
- External links and the AstraProjecta third-party disclaimer render.
- CSS selector tests cover Home selectors and cursor affordance contracts without asserting hand-tuned visual values.

Run before declaring implementation complete:

```sh
npm run format
npm run test:run
npm run build
```

All three commands must finish with zero warnings and zero errors.

## Handoff Notes

This design only approves the Compact dashboard direction and implementation planning. It does not approve changing SillyTavern core files, adding server plugins, or implementing carousel behavior.
