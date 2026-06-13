## Purpose

- Own the current-chat main-menu drawer, static tile metadata, and related tests.

## Rules

- Keep this drawer presentation-only: it consumes core current-chat stores and does not rebuild identity resolution locally.
- Co-locate tile definitions under this folder. Tile metadata uses `src/app/shared/sillytavern-interface/` route/icon keys; icon rendering is supplied by the injected send-form adapter.
- Keep `mobile-chat-main-menu__trigger` scoped to opening the Astra-owned drawer.
- Keep current-chat action dialogs feature-local while mobile is still stabilizing. `ResponsiveDialog` may live under `src/components/ui/astra` as a primitive compatibility wrapper, but rename/delete/category business UI should not move to `src/app/shared` until a real desktop or cross-platform caller exists.
- Action overlays must be controlled siblings of `MobileChatMainMenuDrawer`, not nested drawers inside its content. Close the main drawer first, then open the sibling dialog on a later frame to avoid Vaul focus and teardown races.
- Keep the main-menu Drawer structural ids feature-local and stable: `mobile-chat-main-menu-drawer-header`, `mobile-chat-main-menu-drawer-body`, `mobile-chat-main-menu-drawer-scrollable-content`, `mobile-chat-main-menu-drawer-content`, and `mobile-chat-main-menu-drawer-footer`.
- Main-menu tiles route only to Astra-owned SillyTavern interface page keys. Do not use these tiles to move, open, or mutate SillyTavern native settings roots.
- Keep `Persona management` in `.mobile-chat-main-menu-drawer__current-user-action` routed to the SillyTavern interface persona route; do not add a duplicate Persona Management grid tile unless the product design changes.
- Do not import production code from `src/packages/features/sillytavern-interface`; this drawer calls the injected adapter and stays presentation-only.
