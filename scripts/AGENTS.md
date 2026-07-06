## Purpose

- Own repository automation scripts run from the project root.

## Rules

- `manage-i18n.mjs` syncs `locales/en.json` to `src/types/i18n.d.ts` and fails on unused keys.
- `check-st-shared-helpers.mjs` enforces the canonical shared ST helper list; update it with `src/packages/core/st/shared.ts` per `src/packages/core/st/AGENTS.md`.
- `generate-scoped-tailwind-preflight.mjs` emits the scoped preflight consumed by `src/styles`.
