## Purpose

- Own the Astra mobile send-form composer composition, input-row composition, shortcuts region, composer visibility state, and left-controls contract coverage.

## Rules

- Keep input-row DOM contract and CSS hooks stable while this compatibility slice is active.
- Render the input row inside the composer surface and the shortcuts row inside the composer shortcut region; the composer host owns outer spacing, and the composer wrapper owns rounded group shape plus shortcuts visibility state.
- Consume feature-local bridges and drawers; do not recreate native-option or extensions bridge logic here.
- Open the `sillytavern-interface-panel` feature shell from here, but do not own page descriptors, title/content switching, route icons, native hosts, or future breadcrumb/section-nav composition locally.
- Keep shell composition separate from host mount/unmount behavior.
- Keep `AstraMobileSendForm.tsx` focused on store subscription and cross-surface orchestration; input row, shortcuts toolbar, and SillyTavern interface open-state helpers belong in focused sibling files.
