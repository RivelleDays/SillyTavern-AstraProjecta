## Purpose

- Own the Astra mobile chat composer composition, chat input composition, shortcuts region, composer visibility state, and input tool contract coverage.

## Rules

- Keep chat input DOM contract and CSS hooks stable while this compatibility slice is active.
- Render the chat input inside the composer input region and the shortcuts row inside the composer shortcuts region; the composer host owns outer spacing, and the composer wrapper owns rounded group shape plus shortcuts visibility state.
- Consume feature-local bridges and drawers; do not recreate native-option or extensions bridge logic here.
- Open SillyTavern interface routes only through the injected send-form adapter. Do not import or render the right-side panel shell, page descriptors, title/content switching, route icons, native hosts, or future breadcrumb/section-nav composition locally.
- Keep shell composition separate from host mount/unmount behavior.
- Keep `AstraMobileSendForm.tsx` focused on store subscription and cross-surface orchestration; chat input, shortcuts toolbar, and SillyTavern interface adapter calls belong in focused sibling files.
