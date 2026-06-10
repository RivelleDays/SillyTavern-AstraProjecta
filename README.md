# AstraProjecta (Alpha)

> [!WARNING]
> AstraProjecta is currently for internal testing only. Core functionality is incomplete, major UI refactors are expected, and breaking changes may happen at any time.
> Do not rely on the current alpha for daily use.

## Overview

AstraProjecta is a third-party UI extension for SillyTavern. It builds an alternative frontend experience on top of SillyTavern's existing browser runtime while keeping SillyTavern as the underlying application framework.

The project focuses on a more cohesive, mobile-first interface for core SillyTavern usage flows. It is an alternative user experience, not an adversarial fork of SillyTavern, and it is not intended to replace SillyTavern's backend or extension system.

The current rewrite is mobile-first because SillyTavern's existing frontend surfaces create the strongest constraints on small screens. Desktop remains part of the long-term direction, but it is not the primary Phase 1 target.

## Status

AstraProjecta is in alpha and is provided for preview and testing. Layouts, interaction patterns, settings, and feature boundaries may change without compatibility guarantees.

### Current Alpha Goals

- Establish the core UI framework and interaction model.
- Prioritize the mobile experience while preserving essential SillyTavern usage flows.
- Keep a future desktop architecture possible without letting desktop requirements block Phase 1 mobile work.
- Keep the implementation as a SillyTavern UI extension, not a SillyTavern core fork or server plugin.

### Current Alpha Limits

- Non-built-in SillyTavern extensions are not supported during alpha.
- Custom CSS and custom regex are not supported during alpha.
- Deep user customization is not recommended because future versions may change structure and selectors.
- AstraProjecta does not use the Moonlit Echoes theme.

## Goals / Non-goals

### Goals

- Provide a standalone alternative UI for SillyTavern users who care about interface structure, mobile ergonomics, and interaction design.
- Reuse SillyTavern's backend and runtime while rethinking frontend organization and user flows.
- Use TypeScript, React, Shadcn/ui, and Lucide as the active frontend stack.
- Integrate selected Astra-owned features into a coherent default experience instead of presenting every capability as a separate extension-style surface.

### Non-goals

- AstraProjecta is not intended to merge into SillyTavern's main branch.
- AstraProjecta is not a backend replacement.
- AstraProjecta is not a server plugin.
- AstraProjecta is not a general compatibility layer for third-party SillyTavern extensions during alpha.

## Requirements

Before installing AstraProjecta, use the following baseline:

- Use the latest SillyTavern `staging` branch.
- Disable all non-built-in SillyTavern extensions.
- Disable custom CSS.
- Disable custom regex.

Running outside this baseline may cause unsupported behavior during alpha.

## Installation

1. In SillyTavern, open **Extensions**.
2. Select **Install extension**.
3. Paste the following Git URL and confirm:

```txt
https://github.com/RivelleDays/SillyTavern-AstraProjecta
```

## Community

[AstraRiver](https://discord.gg/bb35eB5Zgr) is RivelleDays' private/community Discord server for AstraProjecta and other RivelleDays projects. It is not affiliated with, maintained by, or endorsed by the official SillyTavern project or official SillyTavern community channels.

## Compatibility

### Target Devices

- Mobile is the current Phase 1 priority.
  - Mobile design width: below 600px.
- Desktop is planned, but not the current priority.
  - Desktop design reference: 1280x720 to 1920x1080.
- Tablet optimization is not currently a priority.

### Tested Environment

- Primary browser: Chrome.
- Tested OS and surfaces: macOS and iPhone through Safari/PWA usage.

## Roadmap

The roadmap is subject to change.

- **Alpha**: Mobile-first core UI structure and interaction logic. Foundational features are still incomplete, and breaking changes are expected.
- **Beta**: Broader device and browser support, expanded Astra modular features, and selective third-party extension support where the integration model is stable.
- **Release**: Stable public release after core workflows, compatibility boundaries, and maintenance expectations are defined.

## Design Direction

AstraProjecta is designed around the relationship between visual structure and user logic. The project prioritizes workflows that are easier to understand, easier to reach on mobile, and easier to remember after setup.

The extension does not aim to support every existing SillyTavern extension surface during alpha. Instead, it asks which capabilities should feel like part of a coherent default experience and builds toward that shape incrementally.

The project remains dependent on SillyTavern as its runtime foundation. When a required capability is not available through public extension surfaces, that gap should be treated as a SillyTavern integration boundary rather than something to work around through untracked core modifications.

## Credits

AstraProjecta is largely an independent reimplementation with substantial rewrites and redesigned UI/UX. The projects and libraries below are confirmed foundations, active dependencies, or current references for this rewrite.

### Current References & Foundations

- **[Sillyanonymous / SillyTavern-CharacterLibrary](https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary)**: A SillyTavern third-party extension used as a reference for target-first chat jump and loading behavior for inactive character and group chat opens. AstraProjecta does not depend on it at runtime.

### Historical Inspiration

These projects influenced older AstraProjecta prototypes or feature ideas. Some related functionality has not been rebuilt in the current rewrite, and some may not return in the same form.

- **[SillyTavern / Extension-TopInfoBar](https://github.com/SillyTavern/Extension-TopInfoBar)** (AGPLv3 License): Historical influence on early AstraProjecta experiments.
- **[LenAnderson / SillyTavern-WorldInfoInfo](https://github.com/LenAnderson/SillyTavern-WorldInfoInfo)** (Unlicensed) and **[Slub77 / Sillytavern-Loretips](https://github.com/Slub77/Sillytavern-Loretips)** (AGPLv3 License): Historical inspiration for Worlds/Lorebooks information ideas in older Astra work.
- **[LenAnderson / SillyTavern-ToastHistory](https://github.com/LenAnderson/SillyTavern-ToastHistory)** (Unlicensed): Historical inspiration for notification-related ideas in older Astra work.
- **[LenAnderson / SillyTavern-MoreFlexibleContinues](https://github.com/LenAnderson/SillyTavern-MoreFlexibleContinues/)** (Unlicensed): Historical reference for continue-generation workflow ideas in older Astra work.
- **[SoFizzticated / SillyTavern-ChatPlus](https://github.com/SoFizzticated/SillyTavern-ChatPlus)** (AGPLv3 License): Historical inspiration for chat-list and category-management ideas.

### UI Assets

| Name | Description | License |
|------|-------------|---------|
| [lucide](https://github.com/lucide-icons/lucide) | Icon library | ISC / MIT |
| [MingCute Icons](https://github.com/mingcute-design/mingcute-icons) | Source for several SillyTavern interface route SVG icons | Apache 2.0 |

### Frontend Libraries & Utilities

For full dependency details, see `package.json`.

| Name | Description | License |
|------|-------------|---------|
| [React](https://github.com/facebook/react) | UI runtime | MIT |
| [shadcn-ui](https://github.com/shadcn-ui/ui) | UI component foundation | MIT |
| [coss origin](https://coss.com/origin) | Used to create Shadcn/ui-based components | AGPLv3 / MIT |
| [Radix UI](https://github.com/radix-ui/primitives) | UI primitives used through Shadcn/ui and Astra wrappers | MIT |
| [Vaul](https://github.com/emilkowalski/vaul) | Drawer primitive used by mobile overlay surfaces | MIT |
| [Base UI](https://github.com/mui/base-ui) | UI primitives used by selected Astra wrappers | MIT |

## Acknowledgements

Thank you to the SillyTavern developers, contributors, and community members whose work makes third-party UI experimentation possible. AstraProjecta exists because SillyTavern provides a flexible foundation and an active community around it.

Thank you to everyone who tested early AstraProjecta builds, discussed Moonlit Echoes, shared feedback, or helped clarify what a more cohesive SillyTavern mobile experience could become.
