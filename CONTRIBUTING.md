# Contributing to AstraProjecta

Thanks for your interest! AstraProjecta is a mobile-first SillyTavern UI extension, currently in **alpha** with a single maintainer. This document is intentionally thin: the detailed rules live in the [`AGENTS.md`](AGENTS.md) files, and this page mostly points you to them.

## Alpha status

Everything is under heavy construction — layouts, selectors, settings, and feature boundaries can change without notice. **Before building anything non-trivial, discuss it in an issue or on [Discord](https://discord.gg/bb35eB5Zgr) first.** Unsolicited large PRs may be declined, not because the work isn't appreciated, but because it can collide with in-flight refactors.

## Ways to contribute

- **Bug reports** — the most valuable contribution right now. Please include:
    - SillyTavern version and branch (`release` / `staging`)
    - Browser and device (mobile issues especially)
    - Whether your setup follows the [Requirements](README.md#requirements) baseline (custom CSS / regex / other third-party extensions disabled)
    - Steps to reproduce, plus screenshots or a recording
- **Documentation fixes** — typos, broken links, outdated instructions.
- **Small fixes** — clearly scoped bugfixes.
- **Features** — only after they have been agreed on in an issue or on Discord.

## Development setup

Requires **Node.js 22** (matches CI). The extension must live inside a SillyTavern checkout to load:

```bash
cd SillyTavern/public/scripts/extensions/third-party/
git clone https://github.com/RivelleDays/SillyTavern-AstraProjecta
cd SillyTavern-AstraProjecta
npm ci        # install node_modules exactly as pinned by package-lock.json
npm run dev   # watch build
```

Notes:

- Dependencies are **not** installed when the extension is added through SillyTavern's Extensions UI — `node_modules/` is required for development, so run `npm ci` inside the extension folder first. If you already installed the extension that way, skip the clone: the repo is already at this path, just `cd` in and run `npm ci`.
- Use `npm ci` rather than `npm install` so `package-lock.json` stays untouched.

Then enable AstraProjecta in SillyTavern under **Extensions**.

## Where the rules live

The spec for this repository is its **`AGENTS.md` files**: the root [`AGENTS.md`](AGENTS.md) covers architecture, naming, and the SillyTavern boundary, and the nearest folder-level `AGENTS.md` governs every file you edit. Read them before changing code — they are authoritative; this document is not.

Five hard rules worth knowing up front:

1. Never modify SillyTavern core; reach it only through `SillyTavern.getContext()` and documented extension hooks.
2. Never edit vendored shadcn sources under `src/components/ui/shadcn`; Astra customizations go in Astra-owned paths.
3. User-facing copy routes through typed keys in `locales/en.json`, never inline English literals.
4. Don't add tests that assert CSS visual values (spacing, color, sizing, layout, typography) — those are human-owned.
5. Follow the naming rules in the root `AGENTS.md` (`astra-` BEM blocks; `astra-projecta-*` reserved for repo-wide contracts).

## Quality gates

Before opening a PR, run from the repo root:

```bash
npm run format
npm run test:run
npm run build   # must finish with zero warnings and zero errors
```

CI (Node 22) also runs `npm run typecheck` and fails if committed generated files drift: `dist/`, `src/types/i18n.d.ts`, and the scoped Tailwind preflight (`src/styles/generated/tailwind-scoped-preflight.css`). The build regenerates them — commit the regenerated results. If `dist/` conflicts during a merge or rebase, **rebuild it rather than hand-merging** the bundle.

## PR conventions

- One topic per PR, with a readable conventional-style commit message.
- **Screenshots are mandatory for any UI change.**
- State which viewport you tested. Mobile (≤1000px) is the current priority; desktop is not built out yet.

## AI-assisted contributions

AI-assisted work is welcome — this project itself is developed with AI agents under human curation. Two requirements:

1. You are responsible for verifying that no unlicensed code was copied from other SillyTavern extensions (AI agents have been observed doing this silently).
2. Disclose substantial AI assistance in the PR description.

## Licensing

Contributions are accepted under the project's license, [AGPLv3](LICENSE.txt).

## Localization

Translation contributions are **closed during alpha** — English copy is still changing too fast. If you want to prepare a future locale, open an issue first.
