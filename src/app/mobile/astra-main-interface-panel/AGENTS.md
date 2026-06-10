## Purpose

- Own the left-side AstraProjecta mobile Astra main-interface panel shell.
- Keep the panel independent from chat-session SillyTavern interface routing and send-form current-chat drawers.

## Owned Paths / Responsibilities

- `MobileAstraMainInterfacePanel.tsx` owns the left-side `MobilePagePanel` composition, Astra-owned panel header, optional header content slot, close control, optional body-start slot, scroll surface, and optional content slot.
- `astra-main-interface-panel.css` owns the left-side Astra main-interface panel shell selectors and scrollbar affordance selectors.
- `contracts/` owns stable main-interface panel ids and the top-bar trigger id.
- Tests in this folder protect side, title, content, close behavior, and stable id contracts.

## Rules

- Keep this panel a shell until a product slice explicitly adds main-interface content.
- Put Astra main-interface content in `src/packages/features/astra-main-interface`; this folder owns only mobile panel composition and stable DOM ids.
- The header content slot may host feature-owned controls, but it must not make this panel own feature state or page behavior.
- Header content may include the Astra main-interface avatar scope strip. Its Global/Current/Favorite rules, active state, and body switching remain feature-owned.
- The body-start slot may host feature-owned frame nodes that must sit directly under `.astra-main-interface-panel__body`; keep behavior and state in the owning feature.
- Keep Astra panel layout selectors under `astra-main-interface-panel__*`; do not depend on SillyTavern interface footer/body-header selectors.
- Do not move current-chat `send-form/main-menu` content into this panel during this refactor.
- Keep this module under `app/mobile` because it is mobile shell UI, not chat-session feature behavior.
