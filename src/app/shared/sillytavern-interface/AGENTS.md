## Purpose

- Own portable SillyTavern interface route and icon-key contracts shared across app assembly and feature packages.

## Rules

- Keep this folder free of DOM selectors, storage keys, route descriptors, React components, and panel implementation details.
- Export stable route keys, default route key, route key types, icon keys, and icon key types.
- Feature packages may consume these contracts, but feature-local implementation details must stay in their owning feature folders.
