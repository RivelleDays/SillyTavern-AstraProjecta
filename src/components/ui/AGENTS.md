# AstraProjecta UI Component Notes (`src/components/ui`)

Use this guide when adding or modifying shadcn/vaul primitives inside the UI library. It captures the Astra-specific preferences so every wrapper behaves consistently.

## Wrapper Responsibilities
- Each primitive should stay close to the upstream shadcn recipe but add:
  - A stable `data-astra-component="<Name>"` marker on the primary surface so downstream tools can target it.
  - Root-level `.astra-<name>` classes (and optional BEM-ish elements like `__overlay`, `__handle`) that the overrides layer hooks onto.
  - Any event glue needed to integrate with SillyTavern (portals, containers, focus scope). Keep this logic inside the wrapper instead of individual features.
- Prefer composition through `cn()` for Tailwind class merging. Avoid ad-hoc template strings—consistency keeps diffs tidy.
- When you need bespoke behavior (e.g., slot-based headers), expose light wrappers (`DialogShell`, `DrawerShell`) right next to the primitive so features can opt in without duplicating class names.

## Styling & Overrides
- Shared overrides live in `src/components/ui/astra/shadcn-overrides.css`. This file is imported from `src/astra/style.css`, ensuring every Astra surface receives the same treatment.
- Extend the overrides file when adding new Astra selectors. Keep everything token-driven by referencing `src/astra/styles/theme.css` custom properties.
- If a primitive requires local Tailwind tweaks, keep them scoped to the component file but still emit the Astra class so overrides can layer on top.

## Toggle & Tooltip Interop
- `toggle.jsx` must stay wrapped with `React.forwardRef` and pass the ref to `TogglePrimitive.Root`; Radix tooltips/popovers rely on the trigger ref when `asChild` is used. Preserve this pattern when adjusting classes or props.
- Prefer the shared `Tooltip` component for hover hints; avoid native `title` attributes on buttons/toggles to prevent duplicate tooltips and inconsistent positioning. Keep accessible labels via `aria-label` where needed.

## Tooltip Copy Style
- Use Sentence case with a short verb-led phrase (2–5 words) to describe the action clearly, e.g., `Create new character card`, `Import character from file`, `Create new chat group`.
- For filtered counts, append at the end with a hyphenated suffix: `Open filters - 3 active`.
- For tri-state toggles (favorites, etc.), keep consistent verbs: `Include favorites` / `Exclude favorites` / `Ignore favorites`.
- Always use the Tooltip component (no native `title`); keep `aria-label` for accessibility.

## Folder Layout
- `src/components/ui/` – Source of truth for all shadcn/vaul primitives + helpers.
- `src/components/ui/astra/` – Astra-specific assets (currently `shadcn-overrides.css`). Use this folder for any future Astra-only helpers so they stay colocated with the primitives yet clearly labeled.

## Workflow Reminders
- Run `npx shadcn-ui@latest add <component>` (via `components.json`) only when you need new primitives; otherwise keep manual edits minimal to ease upstream diffing.
- After editing a primitive, run `npm run lint -- --fix --quiet` to satisfy the project-wide lint requirement.
- Document any new Astra selectors in `AGENTS.md` (root) or `src/astra/AGENTS.md` if they affect runtime behavior, so other contributors know they exist before renaming/removing them.

## Breadcrumb notes
- `src/components/ui/breadcrumb.jsx` tags the root with `data-astra-component="Breadcrumb"` plus `.astra-breadcrumb*` markers (`__list`, `__item`, `__link`, `__page`, `__separator`, `__ellipsis`). Target these selectors in overrides instead of redefining feature-local breadcrumb CSS.

## ButtonGroup helper
- `src/components/ui/button-group.jsx` exports a lightweight wrapper that emits `data-astra-component="ButtonGroup"` plus the `.astra-button-group` class. Pass `orientation="vertical"` to stack controls.
- Child controls that should visually merge need the `.astra-button-group__item` class. This class enables the shared CSS in `astra/shadcn-overrides.css` to collapse bordering edges and restore rounded corners for the first/last items.
- The helper is purely structural—feature CSS (e.g., `homeView.css`) should continue to size individual buttons/toggles as needed.

## Slider helper
- `src/components/ui/slider.jsx` now tags the root with `data-astra-component="Slider"` plus the `.astra-slider` class while exposing `.astra-slider__track`, `.astra-slider__range`, and `.astra-slider__thumb` for downstream overrides (e.g., `astra-home-densityControl`).
- Pass `trackClassName`, `rangeClassName`, and/or `thumbClassName` props from features when you need extra sizing or coloration without forking the base wrapper.

## Dropdown menus
- Use the shared classes from `astra/shadcn-overrides.css` for option rows to avoid per-feature CSS duplication:
  - Wrap the content with `astra-dropdown-menu` when you need Astra tokens on the popover surface.
  - Option rows: add `astra-dropdown-option` to `DropdownMenuItem` plus `astra-dropdown-option__label` and `astra-dropdown-option__check` on the inner spans (the check hides automatically when `data-selected="false"`).
  - Grouped lists can use `astra-dropdown-options` to stack items with consistent vertical gap.
- Feature-specific classes can still layer on top (e.g., `astra-home-sortChoice`, `astra-chat-connection-option`) for sizing or selected-state color, but lean on the shared classes for the base layout/gap/padding/check behavior.

## Tokenized textarea helper
- `src/components/ui/astra/TokenizedTextarea.jsx` is the simplified default: plain `<textarea>` editing with preview/display modes, token footer, and `data-astra-component="TokenizedTextarea"` plus `.astra-tokenized-textarea*` selectors. Shared styling lives in `astra/shadcn-overrides.css`; feature callers can pass their own `textareaClassName`/`displayClassName`/`footerClassName` for local sizing.
- The legacy CodeMirror/search variant now lives in `src/components/ui/astra/RichTextEditorCodemirror.jsx` and is re-exported from `RichTextEditor.jsx` alongside the default alias (`RichTextEditor` -> `TokenizedTextarea`) for compatibility.

## Field helper button
- `src/components/ui/astra/FieldHelperButton.jsx` exports a reusable helper affordance: an icon-only trigger button that opens a `ResponsiveDialog` with helper content.
- Emits `data-astra-component="FieldHelperButton"` plus the `.astra-field-helper-*` classes; shared styling lives in `src/components/ui/astra/shadcn-overrides.css`.
