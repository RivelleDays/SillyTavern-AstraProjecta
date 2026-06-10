## Purpose

- Own the Astra mobile send-form zone composition, input-row composition, and left-controls contract coverage.

## Rules

- Keep input-row DOM contract and CSS hooks stable while this compatibility slice is active.
- Render the shortcuts zone and input row as separate owned surfaces; do not re-couple their spacing responsibilities through a shared shell wrapper.
- Consume feature-local bridges and drawers; do not recreate native-option or extensions bridge logic here.
- Open the `sillytavern-interface-panel` feature shell from here, but do not own page descriptors, title/content switching, route icons, native hosts, or future breadcrumb/section-nav composition locally.
- Keep shell composition separate from host mount/unmount behavior.
- Keep `AstraMobileSendForm.tsx` focused on store subscription and cross-surface orchestration; input row, shortcuts toolbar, and SillyTavern interface open-state helpers belong in focused sibling files.
