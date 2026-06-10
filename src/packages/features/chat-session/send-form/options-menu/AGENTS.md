## Purpose

- Own the mobile send-form options menu taxonomy, visibility model, and action bridge for `mobile-send-form-menu-button`.

## Rules

- Keep menu taxonomy and visibility rules local here.
- Bridge back into SillyTavern through `SillyTavern.getContext()` and native option ids only.
- Use the Astra drawer compatibility wrapper for mobile presentation.
- Do not port the native `#options` DOM into this menu; this folder renders Astra-owned menu chrome and triggers native behavior.
- Chrome device preview can trigger Vaul viewport/input drift when the send-form keeps focus. `releaseSendFormFocus` before open and `repositionInputs={false}` are intentional compatibility guards for this menu.
- Keep this drawer drift mitigation feature-local unless another Astra drawer proves it needs the same focus-release behavior.
