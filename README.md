# AstraProjecta (Alpha)
> **AstraProjecta = A SillyTavern Frontend Redesign Project**  
AstraProjecta is an attempt to build a **new frontend interface** on top of SillyTavern’s functional framework—**without inheriting its original look or operational logic**.

It exists for one reason: SillyTavern is powerful, but the default experience can feel:
- powerful yet unintuitive  
- overly dependent on extensions  
- excessively complex on first setup  

AstraProjecta aims to make SillyTavern feel **modern, coherent, and actually pleasant to use**, especially on both desktop and mobile.

## What This Project Is / Isn’t
### ✅ Is
- A **standalone alternative UI** for SillyTavern users who care about UI/UX
- Built to **reuse SillyTavern’s backend/runtime**, while rethinking frontend structure and interaction patterns
- A personal design experiment by me (Rivelle): **“visual design + user logic as one system”**

### 🚫 Isn’t
- **Not intended to merge into SillyTavern’s main branch**
- **Not a backend replacement**
- **Not an extension compatibility layer** (especially during Alpha)

## Status: Alpha (Expect Breaking Changes)
> **During Alpha, major UI refactors are normal and expected.**

AstraProjecta is currently provided for **preview/testing**. Things may break. Layouts may get rewritten. Your customization may not survive.

### Alpha Goals
- ✅ Establish the overall UI framework and interaction model  
- ✅ Reach basic stability while matching SillyTavern core usage flows  
- 🚫 **No support for non-built-in SillyTavern extensions**  
- 🚫 **Does NOT use the Moonlit Echoes theme**  
- 🚫 **Avoid deep customization during Alpha** (future versions won’t guarantee compatibility)

## Prerequisites (Read This Before Installing)
- ✅ **Use the latest SillyTavern `staging` branch**  
  - Required: SillyTavern **1.14.0 “staging”** or later
- 🚫 **Disable all non–built-in extensions**
- 🚫 **Disable custom CSS and custom regex**

If you ignore the above, you’re basically opting into “it might explode” mode.

## Compatibility
### Target Devices
- **Desktop + Mobile** are primary targets  
  - Desktop design resolution: **1280×720** to **1920×1080**  
  - Mobile design width: **< 600px**  
- Tablet optimization: **not currently a priority**

### Test Coverage
- Primary test browser: **Chrome**
- Tested OS: **macOS / iPhone (PWA/Safari)**

## Installation
1. In SillyTavern, go to **Extensions**
2. Click **Install extension**
3. Paste this Git URL and confirm:

```txt
https://github.com/RivelleDays/SillyTavern-AstraProjecta
```

## Development Roadmap
Subject to change at any time.
- **Alpha** *(In Progress)*: Core UI structure and interaction logic established; foundational features still incomplete; expect breakage
- **Beta**: Expand device and browser support, add Astra modular features, selectively support third-party extensions
- **Release**: Stable version. Uh… someday…? ~~Maybe it’ll never have a “final” release. Who knows.~~

## Development
If you want to modify AstraProjecta or run it in development mode:

### Install dependencies
```bash
npm install
```

### Start dev server
```bash
npm run dev
```

This starts `webpack-dev-server` (the terminal will print the URL) and rebuilds on file changes.

> [!NOTE]
> - npm run dev uses **Live Reload** (full page reload, not module HMR)
> - Build output is written to `dist/`
> - Your SillyTavern tab should reload automatically after rebuilds—if it doesn’t, refresh manually

### Production build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Unit tests
```bash
npm test
```

## Functional Philosophy & Differentiation
### My (Rivelle’s) Perspective
> I’m not a developer—I’m just someone with an unreasonable obsession for interface aesthetics and user experience. All my design decisions are grounded in this premise. Write and maintain frontend from scratch? I’d rather die on the spot.

I admire SillyTavern’s architecture and mindset, but I also recognize its complexity and steep learning curve. AstraProjecta exists to offer an **alternative—not adversarial—user experience**.

Everything here revolves around one idea:
**Integrating visual design with user logic.**
Feature decisions are driven by UX value, not “technical completeness.”

### Integration Over Extension
Instead of chasing compatibility with countless third-party extensions, AstraProjecta asks: *What should a reasonable SillyTavern default setup include—by default?*

AstraProjecta integrates features that I believe **should have been part of the base experience**, presented coherently:
- **Even if you don’t need it now, you’ll know it’s there—and remember it when you do.**
- Reduce configuration friction, shorten the learning curve, and stop scaring new users away.

### Cross-Platform & Cross-Device Design
Desktop and mobile are treated as **first-class UX targets.**
The goal isn’t just “works,” but “feels good”—responsive, comfortable, and usable out of the box.

## Credits
AstraProjecta is largely an independent reimplementation with substantial rewrites and redesigned UI/UX, but the following projects influenced its ideas and/or early prototypes:

- **[SillyTavern (Cohee) / Extension-TopInfoBar](https://github.com/SillyTavern/Extension-TopInfoBar)** (AGPLv3 License): My entry point into SillyTavern—and my favorite extension. The very first AstraProjecta prototype was built upon this.
- **[LenAnderson / SillyTavern-WorldInfoInfo](https://github.com/LenAnderson/SillyTavern-WorldInfoInfo)** (Unlicensed), **[Slub77 / Sillytavern-Loretips](https://github.com/Slub77/Sillytavern-Loretips)** (AGPLv3 License): Inspired the “Worlds/Lorebooks Info” system in Astra. Adapted the idea of Potential Entries from Loretips, added entry filters, and completely redesigned UI/UX logic.
- **[LenAnderson / SillyTavern-ToastHistory](https://github.com/LenAnderson/SillyTavern-ToastHistory)** (Unlicensed): Inspiration for Astra’s “Notifications” integration. I rewrote the entire feature from scratch using my own logic and UI/UX design.
- **[LenAnderson / SillyTavern-MoreFlexibleContinues](https://github.com/LenAnderson/SillyTavern-MoreFlexibleContinues/)** (Unlicensed): Referenced the code approach, rewrote and stabilized the feature, and redesigned the UI.
- **[SoFizzticated / SillyTavern-ChatPlus](https://github.com/SoFizzticated/SillyTavern-ChatPlus)**: Inspiration for chat list and category management.

## Assets & Dependencies
For full dependency details, see `package.json`.

### UI Assets
| Name | Description | License |
|------|--------------|----------|
| [lucide](https://github.com/lucide-icons/lucide) | Icon library | ISC / MIT |
| [tabler-icons](https://github.com/tabler/tabler-icons) | Icon library | MIT |

### Frontend Libraries & Utilities
| Name | Description | License |
|------|--------------|----------|
| [jquery.highlight.js](https://github.com/bartaz/sandbox.js/blob/master/jquery.highlight.js) | jQuery text highlighting utility | MIT |
| [coss origin](https://coss.com/origin) | UI component library (customized) | AGPLv3 / MIT |
| [shadcn-ui](https://github.com/shadcn-ui/ui) | UI component library (customized) | MIT |

## Acknowledgements
> **To all SillyTavern developers, contributors, and the wonderful people in the official Discord community—you’ve changed my life and creative direction.**

Special thanks to everyone who chatted with me, replied to my Moonlit Echo posts, or messaged me privately. You’re my motivation and support!
