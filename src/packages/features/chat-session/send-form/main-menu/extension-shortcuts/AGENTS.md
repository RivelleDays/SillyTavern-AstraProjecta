## Purpose

- Own manually curated third-party extension shortcuts rendered inside the current-chat main-menu drawer.
- Keep these shortcuts separate from the live native `#extensionsMenu` bridge in `send-form/extensions-menu/`.

## Rules

- Treat each shortcut as an explicit Astra-owned integration point with documented detection, trigger, missing-state, and cleanup behavior.
- Prefer triggering a third-party extension's own public or user-facing entry point instead of copying its internal launch logic.
- Missing third-party extensions must fail softly through Astra-owned UI feedback and must not auto-open external pages.
- Keep shortcut expansion state as local browser UI preference, not canonical user data.
- Do not clone or rebuild SillyTavern's native extension menu items here.
