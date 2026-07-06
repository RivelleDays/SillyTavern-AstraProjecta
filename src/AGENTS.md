## Purpose

- Define how source code is split across assemblies, shared contracts, infrastructure, features, UI wrappers, styles, and types.
- Keep the active source-tree contract aligned with the current AstraProjecta working tree.

## Owned Paths / Responsibilities

- `app/mobile`: Phase 1 product assembly, mobile-owned composition, top-bar, left Astra main-interface shell, and right SillyTavern interface panel.
- `app/desktop`: reserved product assembly that stays thin during Phase 1.
- `app/shared`: cross-platform contracts only.
- `packages/core`: SillyTavern integration, lifecycle, adapter, settings, event, and runtime infrastructure.
  `packages/core/layout-mode` is the source of truth for Astra mobile-layout activation.
- `packages/features`: feature-owned behavior and view composition, including `astra-main-interface`, `chat-session`, `chat-session-settings`, and `sillytavern-interface`.
- `components/ui`: split UI layer for vendored shadcn components and Astra-owned wrappers.
- `hooks`: shared client hooks generated or consumed by the local UI layer.
- `lib`: shared utility helpers, including `cn`.
- `styles`: shared emitted stylesheet entry and token assembly.
- `test`: Vitest setup and script contract tests.
- `types`: generated `i18n.d.ts`, `svg.d.ts`, and shared TypeScript declarations.

## Structure Tree

```text
src/
├─ AGENTS.md
├─ index.js                  # runtime bootstrap only
├─ app/
│  ├─ mobile/                # Phase 1 assembly
│  │  ├─ top-bar/            # native #sheld wrapper
│  │  ├─ astra-main-interface-panel/ # left-side Astra main-interface shell
│  │  └─ sillytavern-interface-panel/ # right-side SillyTavern interface panel
│  ├─ desktop/               # reserved assembly
│  └─ shared/                # cross-platform contracts
├─ packages/
│  ├─ core/                  # ST integration and runtime infrastructure
│  │  └─ layout-mode/        # mobile-layout activation contract
│  └─ features/              # feature modules: astra-main-interface, chat-session, chat-session-settings, sillytavern-interface
├─ hooks/                    # shared client hooks
├─ lib/                      # shared utility helpers
├─ components/
│  └─ ui/                    # shadcn upstream + Astra custom wrappers
├─ styles/                   # emitted stylesheet entry and token assembly
├─ test/                     # Vitest setup and script tests
└─ types/                    # generated i18n.d.ts + svg.d.ts
```

## SillyTavern Touchpoints

- `packages/core` is the only default home for direct SillyTavern integration code.
- `app/*` and `packages/features/*` may consume prepared contracts from `packages/core`, but should not scatter raw `getContext()` usage unless the owning folder document explicitly allows it.
- Any source file that depends on a SillyTavern selector, event, or global should keep that dependency explicit and localized.

## Allowed Patterns

- New architecture work should land in the established folders instead of inventing alternate layouts.
- Keep the runtime bootstrap entry thin and disposable.
- Separate runtime orchestration, adapters, features, and UI wrappers into different files and folders.
- Keep upstream shadcn sources and Astra custom UI layers physically separated.
- Write Alpha-stage UI copy in English, with Astra-owned copy sourced from `locales/en.json` through typed flat dotted keys generated into `src/types/i18n.d.ts`, and keep the catalog free of unused keys because `scripts/manage-i18n.mjs` is expected to fail when dead entries remain.
- Route SillyTavern-backed translation lookups through the core i18n bridge instead of scattering raw `translate(text, key)` calls across feature files.
- Centralize emitted stylesheet imports instead of scattering ad hoc global CSS imports across feature files.

## Forbidden Patterns

- Mixing SillyTavern adapters, feature state, and Shadcn wrapper code in one file.
- Putting feature-specific layout policy into `app/shared` or `packages/core`.
- Building long-term architecture directly inside `src/index.js`.
- Treating `styles` as a dumping ground for unrelated feature overrides.
- Reintroducing Astra-owned logic into vendored shadcn sources.

## Naming Rules

- Folder names should reflect responsibility, not screen position hacks.
- Use `mobile`, `desktop`, `shared`, `core`, `features`, and `ui` literally for top-level source routing.
- Reserve `astra-projecta-*` names for cross-layer contracts. Feature-local selectors should be shorter and scoped by owner.

## Update Triggers

- Update this file when source ownership changes, a new top-level source layer is introduced, or stylesheet / type-entry strategy changes.
- Keep stylesheet-specific rules in `src/styles/AGENTS.md`; add a `src/types/AGENTS.md` only if type declarations gain significant rules.

## Verification Checklist

- Confirm each active source layer has a distinct responsibility.
- Confirm `packages/core` remains the primary SillyTavern integration layer.
- Confirm `src/index.js` is still described as a thin runtime bootstrap.
- Confirm Alpha copy is English-first, catalog-backed, and i18n-ready by structure.
