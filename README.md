# SillyTavern-AstraProjecta

<p align="left">
  <a href="https://github.com/RivelleDays/SillyTavern-AstraProjecta/commits/main/"><img src="https://img.shields.io/badge/release-alpha-51A0DE?style=for-the-badge&labelColor=000000" alt="Release: Alpha"></a>
  <a href="https://github.com/SillyTavern/SillyTavern/releases/"><img src="https://img.shields.io/badge/required%20ST%20version-1.18.0%2B-darkred?style=for-the-badge&labelColor=000000&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABRFBMVEVHcEyEGxubFhafFRWfFRWeFBSaFhaWFRWfFRWfFRWOFhaeFRWeFBSeFBSfFRWfFRWdFRWbFBSfFBSfFBSdFRWeExOfFBSfFRWdFBSfFRWfFRWfGxudFRWeFBSTFRWeFRWeFRWfFRWcFhaeFRWfFRWeFRWfFRWfFRWeFRWeFRWeFRWgFBSgFRWfFRWfFRWgFRX26ur4+Pj9+/ugFBT9/v6fFRWtOzueFRWeFRWgFRX///+fFRX6+/vXo6OfFBSrODj6/PzIenr28PD+/f2gFRX06ur17e3dr6+rMzPTlJS5VVW+ZGT9/v7y39/y6OioMTHx//+1Skrrz8+qMDD7+/v7/Pzq0tLkvb22UVHHe3v4+Pi3WFjIgoL4+PjNjIy5XFyuQEDmzMzZpKThubn8/Py+YWHz8/P8/Pz9//+gFRX////36+tJcu2kAAAAaXRSTlMAARDDqIkMB8qyAzqXUrnQGROErSmd1o41pL4iL2oFTFiTHYt5ccZ1PF1G6ONj2/z1gv1n32CkQz/t7ceYYH+KqdZT5fSoY+XbwLSH1u8elxi8+OmeqJ78nTmbXBds8WlWNc+EwcovuYtEjPKpAAACkklEQVQ4y3VTZXfbQBBcwYlZlmSRLdmWmRpwqGFOw1BmPvf/f+/JeU3ipr0Pp/d2VzszO7cAJfj/oXiAxK5xFEU9TkoSxa1pLejggcayrMVNp2lk26w2wEvg4iUry7IATUGVPG12tlfrYB2iWjmPFJjGAxiqwYT5dyEr3MVkoUWZhgTAF0K+JRQfkyrrvhYoYcTWGVEvT/EpF/PudIAKBRTU18LQYswcR1bNiRxv0JXzDjYRzWsiIcuzKgk0OzglkMDVMW4QDiteXu5VJ7dLMBoYMxPxLV0QUk9zRK6SAEIwX+FEL0hTgRGSW00mXXY6Ce8oaw5UETiWokhqN21z9D3RUDMKH0dXo/Ozs/PRwfqbV5UgnNKodtHmydxwOPf+Mr+HJy87rT8ie5kBoLhXw/HXm5uNzf2N4/Hcxu6B6wAYtZiGxgBryNOdi+Xl70ABqsKT8WsKqr7rpAwe1ABhLCDPjT9sj39cX/88QqTgqRm1Yx1ZZAAWhKlPDElZ9vP28szM+HI9L1ADUbSIg061QlTmc252Z+nTTxer27+e5QW82evmdt0bLItvt7a2vn1ZnhTsloAXF++8pznVsu3T4xlyxi/Wqefj/UyibNFSOZq0oGKdERR/JVzd3Ht3eDhC8dHeqhZVGEcRGD2mwHAxbkEJ2Y4CUCmiapHw8lg2IyZh7BrA2bhPZHCJ6OeUFD+HVZRFYnShj21ip5FEEy4VTS1JbUZQeV71b22KEuOBHZzYZ1mx3WRZ3/X/sU2SFRTbbfIHXYyK9YdPnF+cPMlYiO5jTT33UpKbeadspxPLcqwvTNmvz8tyY2mnR+bAYtxnmHoyjdhbYZguxspkHwKZNum/1pcioYW6MJm3Yf5v+02S+Q13BVQ4NCDLNAAAAABJRU5ErkJggg==" alt="Required ST version: 1.18.0+"></a>
</p>

**AstraProjecta** is a mobile-first third-party UI extension for SillyTavern. It reimagines SillyTavern’s frontend into a more cohesive, modern, and easier-to-navigate experience while keeping SillyTavern as the underlying runtime.

AstraProjecta is mobile-first by design—smaller screens surface the hardest layout, navigation, and customization problems first, so building a solid mobile foundation now reduces architectural pain later. Desktop support is **definitely planned** and will follow once the mobile core becomes stable enough to expand safely.

> [!WARNING]
> AstraProjecta is currently an **alpha project for internal testing and early preview only**. Core functionality is still incomplete, major UI refactors are expected, and breaking changes may happen at any time—including to layouts, interaction patterns, settings, and feature boundaries.
>
> Please **do not rely on the current alpha for daily use yet**.

## Highlights ✨

AstraProjecta currently focuses on refining SillyTavern’s core chat experience, with an emphasis on mobile interaction, message readability, and frequently used chat workflows. The following are already implemented or available in the current alpha preview:

* **A more modern and streamlined chat interface**: The chat message layout has been redesigned to make conversations easier to read and interaction areas easier to access. Built with shadcn/ui-based components for a more stable and visually consistent experience across devices.
* **Message revision history**: View the revision history of each message, including regenerated and continued versions, so users can quickly compare different outputs.
* **Quick chat actions**: Common actions such as **Revert one step**, **Regenerate**, and **Continue** are available on the latest message, making it easier to adjust the chat flow without searching through scattered controls.
* **Mobile-first interaction design**: Core surfaces such as message details, drawer navigation, the bottom input bar, and frequently used action buttons are reorganized for smaller screens and touch-based use.

### Preview

> [!NOTE]
> These screenshots are temporary previews of the current mobile-first alpha UI and may change without notice.

<table width="100%">
  <tr>
    <th width="33.33%">Chat View</th>
    <th width="33.33%">Main Drawer</th>
    <th width="33.33%">ST Menu</th>
  </tr>
  <tr>
    <td width="33.33%">
      <img src="https://github.com/RivelleDays/SillyTavern-AstraProjecta/blob/main/.github/assets/preview/alpha-mobile-chat-view.png?raw=true" alt="AstraProjecta mobile chat view with message layout, message actions, swipe controls, and the bottom input bar" width="100%">
    </td>
    <td width="33.33%">
      <img src="https://github.com/RivelleDays/SillyTavern-AstraProjecta/blob/main/.github/assets/preview/alpha-mobile-main-drawer.png?raw=true" alt="AstraProjecta mobile main drawer with API status, model information, settings shortcuts, and connection profile controls" width="100%">
    </td>
    <td width="33.33%">
      <img src="https://github.com/RivelleDays/SillyTavern-AstraProjecta/blob/main/.github/assets/preview/alpha-mobile-background-manager.png?raw=true" alt="AstraProjecta mobile SillyTavern main menu with AstraProjecta navigation and interface shortcuts" width="100%">
    </td>
  </tr>
</table>

## Requirements

For the smoothest testing experience, please use the following baseline before installing AstraProjecta:

* Use the latest SillyTavern `staging` branch.
* Disable all non-built-in SillyTavern extensions.
* Disable custom CSS.
* Disable custom regex.

Running outside this baseline may cause unsupported behavior during alpha. If something breaks while using unsupported extensions or custom styling, I may not be able to provide a reliable fix yet.

## Installation

1. In SillyTavern, open **Extensions**.
2. Select **Install extension**.
3. Paste the following Git URL and confirm:

```txt
https://github.com/RivelleDays/SillyTavern-AstraProjecta
```

After installation, please make sure your environment follows the [Requirements](#requirements) above before testing.

## Community

<p align="left">
  <a href="https://discord.gg/bb35eB5Zgr">
    <img src="https://img.shields.io/badge/Discord-AstraRiver-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=000000" alt="Join our Discord: AstraRiver" height="32">
  </a>
</p>

**[AstraRiver](https://discord.gg/bb35eB5Zgr)** is Rivelle’s personal server, created to share and discuss topics related to **AstraProjecta**, SillyTavern, AI Roleplay, and other Rivelle-made projects in one place.

You are welcome to join if you would like to follow development progress, share feedback, or casually discuss related UI and project ideas.

## Compatibility

| Target  | Status                                             |
| ------- | -------------------------------------------------- |
| Mobile  | Phase 1 priority; mobile shell activates below 1000px. |
| Desktop | Planned; reference range: 1280×720 to 1920×1080.   |
| Tablet  | Supported through the mobile shell range, but not absolute test priority. |

**Tested environment:** Primary browser is Chrome, with testing on macOS and iPhone via Safari/PWA. Because AstraProjecta is still in alpha, tested coverage is limited; broader browser and device support will matter more once the core UI structure stabilizes.

## Status & Roadmap

AstraProjecta is provided for preview, testing, and early feedback. The planned phases are:

* **Alpha** *(current)*: Core UI structure, chat interaction logic, and selected Astra-owned features.
* **Beta**: Broader device and browser support, expanded Astra modules, desktop expansion, and selective third-party extension support where stable integration is possible.
* **Release**: Stable public release after core workflows, compatibility boundaries, and maintenance expectations are clearly defined.

## Scope & Boundaries

AstraProjecta focuses on building a coherent alternative UI experience, not replacing SillyTavern itself. It reuses SillyTavern’s existing runtime and backend while rethinking how the frontend is organized and presented.

Rather than exposing every possible feature surface at once, AstraProjecta asks which actions should feel like part of a coherent default experience, then builds toward that gradually—making core workflows feel more modern, approachable, and pleasant to use, and folding selected Astra-owned features into one unified experience.

To be clear about what AstraProjecta is **not**:

* It is **not** intended to merge into SillyTavern’s main branch.
* It is **not** a backend replacement or server plugin.
* It is **not** a general compatibility layer for third-party SillyTavern extensions during alpha—custom CSS and custom regex are likewise unsupported for now (see [Requirements](#requirements)).
* It is **not** a Moonlit Echoes theme skin or a continuation of Moonlit Echoes’ styling system.

Deep user customization is not recommended during alpha, since future versions may change structure and selectors. Some features may also remain unavailable until SillyTavern provides stable enough extension surfaces for proper integration.

## Credits

AstraProjecta is largely an independent reimplementation with substantial rewrites and redesigned UI/UX. That said, it exists within the broader SillyTavern ecosystem, and several projects, libraries, and community experiments helped clarify which workflows, layout ideas, and interaction patterns were worth studying.

### Current References & Foundations

* **[Sillyanonymous / SillyTavern-CharacterLibrary](https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary)**: A SillyTavern third-party extension used as a reference for target-first chat jump and loading behavior for inactive character and group chat opens. AstraProjecta does not depend on it at runtime.
* **[LenAnderson / SillyTavern-MoreFlexibleContinues](https://github.com/LenAnderson/SillyTavern-MoreFlexibleContinues/)** (Unlicensed): A core inspiration behind AstraProjecta’s continue-generation workflow. The implementation has been completely rewritten with more advanced and complete functionality, but the original idea remains an indispensable foundation for this part of the experience.

### Historical Inspiration

These projects influenced older AstraProjecta prototypes or feature ideas. Some related functionality has not been rebuilt in the current rewrite, and some may not return in the same form.

* **[SillyTavern / Extension-TopInfoBar](https://github.com/SillyTavern/Extension-TopInfoBar)** (AGPLv3 License): Historical influence on early AstraProjecta experiments.
* **[LenAnderson / SillyTavern-WorldInfoInfo](https://github.com/LenAnderson/SillyTavern-WorldInfoInfo)** (Unlicensed) and **[Slub77 / Sillytavern-Loretips](https://github.com/Slub77/Sillytavern-Loretips)** (AGPLv3 License): Historical inspiration for Worlds/Lorebooks information ideas in older Astra work.
* **[LenAnderson / SillyTavern-ToastHistory](https://github.com/LenAnderson/SillyTavern-ToastHistory)** (Unlicensed): Historical inspiration for notification-related ideas in older Astra work.
* **[SoFizzticated / SillyTavern-ChatPlus](https://github.com/SoFizzticated/SillyTavern-ChatPlus)** (AGPLv3 License): Historical inspiration for chat-list and category-management ideas.

### UI Assets

| Name                                                                | Description                                              | License    |
| ------------------------------------------------------------------- | -------------------------------------------------------- | ---------- |
| [lucide](https://github.com/lucide-icons/lucide)                    | Icon library                                             | ISC / MIT  |
| [MingCute Icons](https://github.com/mingcute-design/mingcute-icons) | Source for several SillyTavern interface route SVG icons | Apache 2.0 |

### Frontend Libraries & Utilities

For full dependency details, see `package.json`.

| Name                                               | Description                                             | License      |
| -------------------------------------------------- | ------------------------------------------------------- | ------------ |
| [React](https://github.com/facebook/react)         | UI runtime                                              | MIT          |
| [shadcn-ui](https://github.com/shadcn-ui/ui)       | UI component foundation                                 | MIT          |
| [coss origin](https://coss.com/origin)             | Used to create Shadcn/ui-based components               | AGPLv3 / MIT |
| [Radix UI](https://github.com/radix-ui/primitives) | UI primitives used through Shadcn/ui and Astra wrappers | MIT          |
| [Vaul](https://github.com/emilkowalski/vaul)       | Drawer primitive used by mobile overlay surfaces        | MIT          |
| [Base UI](https://github.com/mui/base-ui)          | UI primitives used by selected Astra wrappers           | MIT          |

## Acknowledgements

Thank you to the SillyTavern developers, contributors, and community members whose work makes third-party UI experimentation possible. AstraProjecta exists because SillyTavern provides a flexible foundation and an active community around it.

Thank you to everyone who tested early AstraProjecta builds, discussed Moonlit Echoes, shared feedback, or helped clarify what a more cohesive SillyTavern mobile experience could become.

This project is still very young, but every piece of thoughtful feedback helps shape it into something clearer, more stable, and more useful.

## License
AGPLv3
