Notes for `createRightSidebarRuntime.js`:
- `DRAWER_MAPPINGS` drives which SillyTavern drawers are ported into the AI Settings tab; each entry supplies `{ id, title, heading, icon }` metadata for tabs and headings.
- Persistence hooks are exposed via `persistHandlers.shell(fn)` and `persistHandlers.rightSidebar(fn)`. Callers provide a handler that accepts `{ activePanel, lastPanel, isOpen }` for the right sidebar; shell persistence is left to the consumer.
