## Purpose

- Own the live DOM bridge between AstraProjecta mobile send-form UI and SillyTavern's native `#extensionsMenu`.

## Rules

- Treat `#extensionsMenu` as the only source of truth for extension menu items and handlers.
- Do not clone, remap, or rebuild native extension items into an Astra-specific data model.
- Keep Astra-owned drawer chrome outside the native `#extensionsMenu` subtree.
- Preserve native ids/classes inside the bridged subtree, especially `.extension_container`, `.extensionsMenuExtensionButton`, and `*_wand_container`.
- Only reparent the live `#extensionsMenu` while the drawer is open, and restore it to its original parent/sibling on close, replacement, or cleanup.
- Keep bridge logic feature-local; do not promote extension-menu-specific behavior into shared drawer wrappers unless another feature proves the same need.
