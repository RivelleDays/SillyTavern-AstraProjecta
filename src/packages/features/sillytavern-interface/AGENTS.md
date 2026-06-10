## Purpose

- Own the right-side SillyTavern interface system for AstraProjecta mobile.
- Keep SillyTavern tool route descriptors, live host surfaces, route navigation, route icons, and SillyTavern interface CSS together as one feature package.

## Owned Paths / Responsibilities

- `contracts/` owns stable SillyTavern interface DOM ids, trigger ids, and storage keys.
- `routes/` owns route descriptors, route storage, subheader storage, and descriptor types.
- `panel-shell/` owns `MobileSillyTavernInterfacePanel`, active-page resolution, panel navigation visibility, scroll restoration, and the SillyTavern-specific panel shell rendered inside the low-level `MobilePagePanel` primitive.
- `route-navigation/` owns inline main-navigation presentation plus inactive legacy navigation sheet presentation.
- `sillytavern-hosts/` owns SillyTavern interface scoped hosting for live SillyTavern drawer and companion roots through shared core bridges.
- `tools/ai-settings`, `tools/persona-management`, and `tools/character-management` own tool-specific tabs, native bridge orchestration, and tests.
- `icons/` owns route SVG assets and raw SVG loading contracts reused by send-form main-menu tiles.
- `sillytavern-interface.css` owns SillyTavern interface feature selectors; shared primitive and native drawer normalization remains in `src/styles/shadcn-overrides.css`.

## Rules

- Do not import from `src/packages/features/chat-session/send-form`; send-form may open SillyTavern interface routes, but this package must stay independent from send-form UI.
- Keep `MobilePagePanel` as a low-level primitive; SillyTavern panel header, subheader, footer controls, footer accessory navigation, titles, route icons, tabs, and native hosts belong here.
- Keep SillyTavern panel layout selectors under `sillytavern-interface-panel__*`; do not reuse Astra main-interface panel shell selectors.
- Native drawer and companion hosts must move live SillyTavern nodes only while their route is active and restore on route switch, close, or unmount.
- Use stable `sillytavern-interface-panel*` ids for automation, tests, and cross-team communication.
- CSS-reading tests in this package may verify selectors, token names, and removed legacy selectors only. Do not assert exact visual CSS property values.
