# CLAUDE.md - AstraProjecta

AstraProjecta is a mobile-first third-party UI extension for SillyTavern (TypeScript + React + Shadcn + Lucide). It reshapes SillyTavern's frontend into a cleaner, more cohesive experience while keeping SillyTavern as the underlying runtime. Status: alpha.

## Where the rules live

The authority for this repo is its **`AGENTS.md` files** - a root `AGENTS.md` plus ~55 nested ones, one per folder with stable rules. They are the spec; the code is the implementation. Claude Code does not read `AGENTS.md` on its own, so this setup loads them for you:

- The **nearest `AGENTS.md` auto-loads** the moment you edit a file in its folder (a hook injects it). Trust it and follow it - it is the local law for that area.
- Start with the **root `AGENTS.md`** for architecture, ownership, naming, and the SillyTavern boundary.
- Personal / machine-specific notes go in `AGENTS.local.md` (gitignored). Copy `AGENTS.local.example.md` to start one; it auto-loads each session.

## Toolchain (run from the repo root)

| Command | What it does |
|---|---|
| `npm run build` | Production build (webpack). **Hard gate: must pass with zero warnings/errors before a change is "done."** |
| `npm run dev` | Watch build |
| `npm run test` / `npm run test:run` | Vitest (watch / one-shot) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run i18n` | Sync `locales/en.json` -> typed keys (build fails on unused keys) |
| `npm run format` | Prettier |

After any code change, run `npm run build` yourself and confirm it is clean before saying the work is done.

## A few things that bite

- **SillyTavern boundary**: never edit ST core outside this repo. Reach ST only through `SillyTavern.getContext()` and documented extension hooks. If a needed API is missing, stop and report the gap rather than reaching into internals.
- **Shadcn isolation**: upstream shadcn lives under `src/components/ui/shadcn` - don't modify those files. Put Astra customizations in Astra-owned paths (`src/components/ui/astra`, etc.).
- **CSS values are human-owned**: don't add tests that assert spacing / color / sizing / layout / typography values. Tests may lock structure, selectors, host ids/classes, token names, and interaction (cursor) contracts only.
- **Mobile scope**: mobile-only CSS scopes through `body.astra-projecta-mobile-layout`; the `1000px` breakpoint lives in `src/packages/core/layout-mode`. Don't encode `mobile` / `desktop` into component class names.
- **i18n**: Astra-owned user copy routes through `locales/en.json` with typed keys, not inline English literals.

## Commits

Don't commit, push, or merge unless asked. When you do commit: the build must be clean, keep it single-topic with a readable conventional-style message, and review `git status` / `git diff --cached` first. Push, merge, PR, and branch deletion need explicit authorization - commit only.

---

*This file and the `.claude/` hooks are local-only (gitignored) Claude Code setup. The shared, tracked rules for collaborators live in the `AGENTS.md` files. When a convention here drifts from the `AGENTS.md` files, the `AGENTS.md` files win - update this to match.*
