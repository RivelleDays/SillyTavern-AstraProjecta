## Purpose

- Own the emitted stylesheet entry and AstraProjecta token assembly rules.
- Keep global theme/body contracts separate from scoped preflight and feature CSS.

## Owned Paths / Responsibilities

- `globals.css` as the single emitted stylesheet entry imported by `src/index.js`.
- `shadcn-overrides.css` as the only supported home for shadcn-specific CSS fixes.
- Tailwind layer assembly order and generated preflight inclusion.
- Product-wide theme tokens, body-class contracts, and shared CSS runtime variables.
- CSS imports for mobile top-bar, Astra main-interface panel shell, and SillyTavern interface feature styles.
- CSS contract tests under this folder, limited to stylesheet wiring, selectors, host ids/classes, token names, and deprecated selector guards.

## Rules

- Register product CSS through `src/styles/globals.css`; do not add ad hoc global CSS imports from feature or runtime modules.
- `src/styles/globals.css` is the Tailwind v4 CSS entrypoint for this repository. Keep Tailwind CSS-first directives and split imports there unless the repository-wide CSS isolation strategy itself changes.
- Import `src/styles/shadcn-overrides.css` from `globals.css`; do not scatter shadcn CSS fixes across feature styles or upstream component files.
- Shared Astra drawer visual contracts such as `DrawerBody` gradient scroll fade belong in `shadcn-overrides.css`, not in feature-local drawer styles.
- Feature-owned mobile panel layout selectors belong in the owning feature or app CSS, such as `astra-main-interface-panel__*` and `sillytavern-interface-panel__*`, not in `shadcn-overrides.css`.
- `body.astra-projecta-theme` is the only supported home for AstraProjecta global theme takeover and SmartTheme mappings.
- `body.astra-projecta-base-ui-body` is the only supported home for shadcn/base-ui semantic tokens and mobile safe-area / overlay runtime variables.
- Shared Astra-owned derived color values belong in `body.astra-projecta-base-ui-body` as compact tokens such as `--color-base-t5`, where `tNN` means the source color mixed at `NN%` with `transparent`.
- Derived color tokens use the canonical ramp `t5`, `t10`, `t20`, `t30`, `t40`, `t50`, `t60`, `t70`, `t80`, and `t90`. Do not add non-standard tint steps without first changing this documented scale.
- Use `--color-base-*` for neutral foreground-derived chrome, `--color-muted-*` for secondary text, `--color-danger-*` and `--color-warning-*` for status fills/copy, `--border-color-*` for dividers and outlines, `--color-ring-*` for focus affordance, and `--surface-*` for background/hover/selected surfaces.
- Keep shadcn semantic tokens such as `--background`, `--foreground`, `--muted`, `--ring`, and `--destructive` intact; use compact derived tokens only for Astra-authored CSS reuse.
- Do not promote every one-off `color-mix()` into globals. Promote repeated cross-feature values or values that already behave like shared design tokens, and leave feature-local mixes in the owning stylesheet.
- `data-astra-projecta-ui-root` remains scoped-preflight-only. Do not move global theme tokens back onto UI-root selectors or feature selectors.
- Mobile feature CSS may assume the body-class contract exists when the mobile runtime is active, but it must keep its own selectors compatibility-focused and local.
- Mobile layout CSS must scope through `body.astra-projecta-mobile-layout`; when multiple selectors share that scope, prefer native CSS nesting with explicit `&` selectors over repeating the body prefix.
- The `1000px` mobile layout media query belongs to `src/packages/core/layout-mode`. Do not add feature-local or global stylesheet layout activation queries for Astra mobile layout.
- Keep capability and preference media queries such as `prefers-reduced-motion`, `hover`, and `pointer` when needed; if the effect is mobile-only, nest those media queries inside the `body.astra-projecta-mobile-layout` rule.
- New Astra-owned animated surfaces must consider `prefers-reduced-motion` as part of their default contract.
- Prefer `transform` and `opacity` when motion is necessary; avoid introducing filter, blur, box-shadow, or layout-driven animation unless the owning module documents why the cost is justified.
- Use `will-change` only for short-lived interactive surfaces that materially benefit from it, and neutralize or remove it in reduced-motion paths when reasonable.
- Avoid introducing perpetual CSS animation except for explicit loading indicators or similarly transient affordances.
- CSS tests must stay structural. They may assert that imports, selectors, host ids/classes, data attributes, keyframe names, or token names exist, and may assert that deprecated selectors are absent.
- CSS tests must not assert exact visual property values such as `padding`, `margin`, `height`, `width`, `display`, `flex`, `grid`, `gap`, `color`, `background`, `border`, `font-size`, `line-height`, `z-index`, `overflow`, `transition`, `transform`, `opacity`, or animation declarations.
- When a visual adjustment conflicts with a CSS-content test, relax or remove the test assertion instead of changing CSS purely to satisfy the test.
- Repo-level VS Code settings should open AstraProjecta CSS in Tailwind CSS language mode and point IntelliSense at `src/styles/globals.css`. Do not rewrite valid Tailwind v4 syntax in `globals.css` just to silence editor-only diagnostics.
- `theme(static)` in `globals.css` is intentional Tailwind v4 syntax. This workspace may suppress only `tailwindCSS.lint.invalidConfigPath` for that false positive; do not disable broader Tailwind or CSS validation to hide it.
