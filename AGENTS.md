# AstraProjecta Agent Guide

## Purpose

- This file is the top-level authority for work inside `SillyTavern-AstraProjecta`.
- AstraProjecta is a third-party SillyTavern UI extension, not a SillyTavern core fork and not a server plugin.
- This repository's current working-tree shape is the active AstraProjecta baseline. Keep documentation aligned to what exists here now instead of preserving speculative alternate layouts.
- Keep architectural rules grounded in this repository's current source, tests, and documentation instead of speculative alternate layouts.

## Owned Paths / Responsibilities

- Own everything under this extension directory only.
- Never modify SillyTavern core files outside this extension repository for AstraProjecta work.
- Use this repository to define AstraProjecta-owned hosts, runtime contracts, adapters, features, styles, and documentation.
- Keep `AGENTS.md` files current whenever a folder gains stable responsibilities, SillyTavern touchpoints, or non-obvious constraints.

## Repository Workflow

- Treat the repository root as the canonical active working tree for AstraProjecta implementation, testing, build, commit, and handoff.
- Run agent tooling, `git status`, `npm run build`, commits, and pushes from the repository root only.
- For ordinary feature, bugfix, documentation, and refactor work, create or switch to a short-lived branch from the repository root before editing, typically with `git switch -c codex/<topic>` or `git switch <existing-branch>`.
- Use the canonical repository root as the active working tree for that task branch; do not keep the root pinned to `main` merely to preserve isolation.
- Do not maintain a second writable checkout for the same repository under another path. If another filesystem entry is needed for convenience, it must be a symlink or other pointer to this canonical working tree instead of a separate clone.
- Use `git worktree` only for explicit parallel or high-risk isolation needs; treat it as a supplement to the root short-lived-branch workflow rather than the default way to isolate work.
- If an auxiliary worktree is used, do not leave its branch locked away from the repository root when the user is expected to continue from the root. Before final handoff, either move the changes back to a root-usable branch and detach or remove the auxiliary worktree, or explicitly state that the branch is checked out only at the worktree path and cannot be switched to from the root until the worktree releases it.
- Maintainers may keep machine-specific instructions in ignored `AGENTS.local.md`, using `AGENTS.local.example.md` as the public-safe template.

## Public vs Local Agent Instructions

- `AGENTS.md` files are public, tracked repository guidance for general architecture, workflow, ownership, and contributor rules.
- `AGENTS.local.md` files are private, ignored local notes for personal paths, private reference repositories, machine-specific workflows, personal authorization phrases, or other user-specific instructions.
- Keep private or personally customized content out of tracked `AGENTS.md` files. If a local rule becomes useful to contributors generally, move a public-safe version into the relevant tracked `AGENTS.md`.

## Git Workflow

- These git rules apply only inside this AstraProjecta repository and do not authorize git actions in a parent SillyTavern checkout.
- Before any commit, inspect `git status`, check whether the working tree includes unrelated changes, and stop for scope clarification instead of guessing when the commit boundary is ambiguous.
- Before handoff, report the current branch, whether it is ahead of `main`, and whether it appears ready to merge back into `main`.
- When the task appears complete, explicitly state whether the branch is a candidate to merge into `main` and whether it can be deleted after that merge. Reporting merge readiness is allowed; performing `git merge`, `git push`, opening pull requests, or deleting branches still requires explicit authorization.
- Before handoff, run `git worktree list` when any auxiliary worktree was used, and confirm no worktree-owned branch remains checked out in a way that blocks later merge, switch, or cleanup from the canonical root.
- Before any commit, run `npm run build` from this repository and treat any warning or error as a blocker.
- Only proceed to `git add` and `git commit` after the build finishes with zero warnings and zero errors.
- Write the commit message on the user's behalf using a single-topic, readable conventional-style summary or concise imperative summary unless the user requests specific wording.
- Do not push, merge, open pull requests, or delete branches on another contributor's behalf unless that action is explicitly authorized in the current collaboration context.

## Structure Tree

```text
SillyTavern-AstraProjecta/
├─ AGENTS.md                         # repository-wide rules and current architecture
├─ manifest.json                     # SillyTavern extension manifest, output paths stay stable
├─ package.json                      # toolchain contract
├─ src/
│  ├─ AGENTS.md                      # source-tree ownership and routing rules
│  ├─ index.js                       # runtime bootstrap entry, keep feature logic out of here
│  ├─ app/
│  │  ├─ mobile/                     # Phase 1 product assembly
│  │  │  ├─ AGENTS.md
│  │  │  ├─ top-bar/                 # mobile wrapper around native #sheld
│  │  │  ├─ astra-main-interface-panel/ # left-side mobile Astra main interface shell
│  │  │  └─ sillytavern-interface-panel/ # right-side mobile SillyTavern interface assembly
│  │  ├─ shared/                     # Phase 1 shared contracts and cross-platform abstractions
│  │  │  ├─ AGENTS.md
│  │  │  └─ sillytavern-interface/   # portable SillyTavern interface route/icon contracts
│  │  └─ desktop/                    # reserved formal assembly, kept thin during Phase 1
│  │     └─ AGENTS.md
│  ├─ packages/
│  │  ├─ core/                       # Phase 1 SillyTavern integration and runtime infrastructure
│  │  │  ├─ AGENTS.md
│  │  │  ├─ st/chat-categories/    # extension-settings backed chat category store
│  │  │  ├─ layout-mode/             # shared mobile-layout activation contract
│  │  │  └─ runtime/                 # runtime bootstrap, body-class contracts, UI scope helpers
│  │  └─ features/
│  │     ├─ AGENTS.md                # feature folder contract
│  │     ├─ astra-main-interface/    # Astra entry / main interface content root
│  │     │  ├─ AGENTS.md
│  │     │  ├─ chat-list/           # shared Global/Current/Favorite chat-list flow and row adapters
│  │     │  ├─ chat-categories/     # shared global/current/favorite category UI and assignment drawer
│  │     │  ├─ global/               # Global tabs, chat list, and global categories
│  │     │  ├─ current-context/      # Current Character/Group tabs, scoped chats, and categories
│  │     │  └─ favorite-context/     # Favorite Character/Group tabs, scoped chats, and categories
│  │     ├─ chat-session/            # Phase 1 chat input/message feature surface
│  │     │  └─ AGENTS.md
│  │     └─ sillytavern-interface/   # right-side SillyTavern native main interface
│  │        └─ AGENTS.md
│  ├─ components/
│  │  └─ ui/                         # Phase 1 Shadcn wrapper layer
│  │     └─ AGENTS.md
│  ├─ styles/                        # emitted stylesheet entry and token assembly
│  └─ types/                         # reserved shared type declarations
└─ dist/                             # build output only
```

## SillyTavern Touchpoints

- AstraProjecta runs through the UI extension contract: `manifest.json`, bundled `js`, optional bundled `css`, and browser-side access through `globalThis.SillyTavern`.
- Keep room for future extension locale files referenced by the `manifest.json` `i18n` field, but do not add manifest `i18n` wiring until AstraProjecta actually ships a non-English locale file.
- Prefer `SillyTavern.getContext()` and documented extension lifecycle hooks over direct imports from SillyTavern internals.
- Use `extensionSettings.astra_projecta` as the canonical home for small, user-owned AstraProjecta extension state.
- Do not add large derived datasets, message snapshots, search indexes, or cacheable summaries to extension settings by default.
- If a required capability is missing from public extension surfaces, stop and report the gap. Recommend an upstream SillyTavern PR when the missing API is broadly useful.
- Server plugins are reference material only. They are a separate backend capability and must never become a default dependency for AstraProjecta.

## Allowed Patterns

- TypeScript-first source architecture, React for owned UI surfaces, Shadcn as the standard UI library, and Lucide as the standard icon set.
- Dark mode as the default visual baseline so extension surfaces align with SillyTavern's default environment.
- Controlled DOM bridging only when a SillyTavern-owned surface must be reused for compatibility or user flow continuity.
- Additive AstraProjecta hosts, explicit mount/unmount behavior, and no-op fallback when a required SillyTavern node is absent.
- English for code, comments, TODOs, commit-facing repo docs, selectors, and user-facing copy during Alpha.
- i18n-ready English strings: `locales/en.json` is the source of truth for Astra-owned English copy, using flat dotted keys instead of English text as keys.
- Typed i18n usage: generate `src/types/i18n.d.ts` from `locales/en.json` via `scripts/manage-i18n.mjs`, fail the build pipeline on unused catalog keys, and prefer typed catalog keys over inline English literals in Astra-owned code.
- Production exports should expose domain inputs by default instead of test-only dependency injection parameters.
- Keep fake clocks and fake storage seams in true store/cache layers when they protect time-sensitive or persistence behavior.
- During the phased test-seam cleanup, `fetchImpl` may remain on store factories that own remote refresh behavior, but feature-facing action exports should use the runtime `fetch` contract.
- Test DOM, window, and SillyTavern context behavior through `vi.stubGlobal`, `vi.mock`, or focused helpers that set `globalThis.SillyTavern` instead of expanding production signatures.
- Stable, semantic selector names. Use `id` for stable singular anchors and `class` for repeatable groups.
- Mobile layout CSS should scope through `body.astra-projecta-mobile-layout`; when multiple selectors share that scope, prefer native CSS nesting with explicit `&` selectors over repeating the body prefix.
- The `1000px` mobile layout media query belongs to `src/packages/core/layout-mode`; mobile-only stylesheet rules should consume the resolved body-class contract instead of introducing a second layout breakpoint.
- Keep capability and preference media queries such as `prefers-reduced-motion`, `hover`, and `pointer` when needed; if the effect is mobile-only, nest those media queries inside the `body.astra-projecta-mobile-layout` rule.
- CSS visual tuning is human-owned. Tests may protect stylesheet imports, stable selectors, host ids/classes, token names, and removed selector guards, but must not encode concrete CSS property values for spacing, sizing, color, layout, typography, z-index, overflow, or animation.
- Shared Astra-owned derived color tokens live in `src/styles/globals.css` under `body.astra-projecta-base-ui-body`.
- Derived color tokens use the canonical tint ramp `t5`, `t10`, `t20`, `t30`, `t40`, `t50`, `t60`, `t70`, `t80`, and `t90`; do not add ad hoc percentage suffixes such as `t7` or `t72`.
- Use `--color-base-*` for foreground-derived chrome, neutral hover/active states, separators, and icon/text emphasis.
- Use `--color-muted-*` for helper labels, metadata, counters, and secondary descriptive text.
- Use `--color-danger-*` and `--color-warning-*` for destructive/warning copy, badges, state chips, and soft status fills.
- Use `--border-color-base-*` for ordinary dividers and chrome outlines; use `--border-color-danger-*` and `--border-color-warning-*` for status outlines that must retain base border weight.
- Use `--color-ring-*` only for keyboard focus rings, explicit outlines, and temporary focus feedback.
- Use `--surface-background-*`, `--surface-muted-*`, `--surface-accent-*`, and `--surface-primary-*` for translucent app chrome, quiet controls, hover/active panels, and selected or brand-tinted fills.
- Keep shadcn semantic tokens such as `--background`, `--foreground`, `--muted`, `--accent`, `--primary`, `--ring`, `--destructive`, and `--warning` intact; compact Astra tokens are derived usage tokens, not replacements for shadcn semantics.
- CSS interaction affordances are behavior contracts, not visual tuning. Astra-owned clickable controls must advertise clickability with explicit enabled/disabled cursor rules, and tests may lock cursor values for those interaction contracts when regressions have happened before.
- Astra-owned motion should be purposeful, finite, and tied to a user-triggered state change instead of ambient decoration.
- Respect OS and browser reduced-motion preferences as the minimum accessibility baseline for Astra-owned motion.
- When motion is necessary, prefer compositor-friendly properties such as `transform` and `opacity`; avoid animating layout-heavy or paint-heavy properties unless a module documents why the tradeoff is necessary.
- Use compositor-friendly rendering strategies when helpful, but do not treat blanket GPU promotion as a default optimization. Avoid global `will-change`, cargo-cult `translateZ(0)`, or similar permanent GPU-forcing hacks without a documented reason.
- Mutation observers, resize observers, timers, and animation-frame scheduling must stay narrowly scoped, be coalesced when practical, and clean up fully on unmount or dispose.
- Expensive visual effects such as blur and backdrop filtering should stay opt-in and justified instead of becoming default decoration.
- Infinite or ambient looping animation is disallowed by default; explicit transient loading affordances are the exception.
- Proactive `ScrollArea` evaluation for drawers, menus, dialogs, panels, and any long or potentially clipped content.
- Default to the vendored shadcn component library for UI work unless a child document explicitly says otherwise.
- Keep upstream shadcn source isolated under `src/components/ui/shadcn`; do not modify those generated files directly.
- Place AstraProjecta-specific wrappers, compositions, and CSS overrides in Astra-owned paths separate from upstream shadcn sources.
- After every completed code change, personally run `npm run build` before claiming the work is done. Treat any build warning or error as a blocker that must be resolved or explicitly escalated.
- Performance, stability, compatibility, and maintainability take priority over novelty or shortcut-driven implementation.

## Forbidden Patterns

- Any edit to SillyTavern core source, config, styles, or runtime behavior outside this extension folder.
- Treating this extension like a server plugin, including custom backend endpoints as a default requirement.
- Using extension settings as a dumping ground for large derived data, snapshots, indexes, or cache payloads that can be rebuilt or stored behind a dedicated adapter.
- Direct feature-layer imports from raw third-party UI primitives when a local wrapper should exist under `src/components/ui`.
- Letting mobile-specific DOM assumptions leak into shared contracts.
- Letting desktop requirements block or distort the Phase 1 mobile architecture.
- Reintroducing a deprecated coss-based UI stack into this repository. The active standard here is Shadcn.
- Untracked DOM takeover. Every bridge must be reversible, documented, and owned by a clear module.
- Expanding `src/index.js` into long-term feature architecture.
- Adding test-only `documentRef`, `windowRef`, `getContext`, `fetchImpl`, `storage`, or clock parameters to public production exports without a store/cache or documented integration-boundary reason.
- Editing upstream shadcn component sources under `src/components/ui/shadcn` without prior approval.
- Mixing AstraProjecta-specific customizations back into upstream shadcn component files.
- Decorative looping animation, ambient motion, or always-on animated polish that is not tied to a transient loading or user-triggered state change.
- Solving perceived performance issues by defaulting to global blur, backdrop filtering, extra composited layers, permanent `will-change`, or blanket GPU-forcing hacks.
- Leaving mutation observers, resize observers, timers, or animation-frame callbacks running beyond the owning surface lifecycle.
- Adding or keeping CSS-content tests that assert exact visual property values such as padding, height, width, color, display, flex/grid declarations, z-index, overflow, transition, transform, or font sizing.
- Adding clickable Astra-owned controls without explicit cursor affordance coverage in CSS and, when practical, a regression test for the relevant selector contract.

## Naming Rules

- Formal product name: `AstraProjecta`
- Runtime DOM and cross-layer prefix: `astra-projecta`
- Settings key: `astra_projecta`
- Console prefix: `[AstraProjecta]`
- Use `astra-projecta-*` only for repository-wide runtime contracts, global hosts, or cross-layer CSS hooks.
- Prefer shorter feature-local names for feature internals when the scope is already obvious from the owning folder.
- When an element needs both `id` and `class`, keep the `id` first in the markup for fast inspection and diagnostics.
- Favor concise semantic names over long descriptive chains.

## Update Triggers

- Update this file whenever the current architecture, standard stack, naming contract, bridge policy, or SillyTavern boundary rules change.
- Add or update a child `AGENTS.md` when a folder gains stable ownership, reusable rules, or SillyTavern integration details that would clutter this file.
- If a child file conflicts with this file, fix the child file. Root rules win.

## Verification Checklist

- Confirm all new repository rules stay inside the extension folder and do not require SillyTavern core edits.
- Confirm the active stack is still described as TypeScript + React + Shadcn + Lucide.
- Confirm mobile-first plus shared/desktop reserve strategy is still reflected in the tree and rules.
- Confirm controlled bridge language is explicit: additive, reversible, documented, and no-op on missing ST anchors.
- Confirm Astra-owned user copy still routes through `locales/en.json` plus typed keys, that unused catalog keys fail `npm run i18n`, and that manifest `i18n` remains deferred until a shipped non-English locale exists.
- Confirm CSS-related tests protect structure, ownership, and interaction affordance contracts only, not hand-tuned visual values.
- Confirm shared derived color tokens still use the canonical tint ramp and that new color token families document their intended usage scope.
- Confirm server plugins and external frontend projects are still described as references, not required runtime dependencies.
- Confirm the repository root remains the canonical active working tree, ordinary work starts on a short-lived branch there, and any convenience path is only a symlink or pointer to that same checkout.
- Confirm auxiliary worktrees remain limited to explicit parallel or isolation needs and do not replace the root short-lived-branch workflow as the default way to isolate work.
- Confirm handoff language requires explicit reporting of the current branch, merge readiness, and post-merge branch deletion candidacy while preserving authorization gates for push, merge, PR, and branch deletion.
- Confirm git workflow language keeps `git status` review and clean build-before-commit requirements.
- After every completed code change, run `npm run build` yourself and confirm the build finishes with zero warnings and zero errors before declaring success.
