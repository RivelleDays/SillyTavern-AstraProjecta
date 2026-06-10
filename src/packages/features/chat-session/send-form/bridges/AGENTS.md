## Purpose

- Own send-form-specific bridges back into native SillyTavern controls and focus-handling compatibility helpers.

## Rules

- Keep these bridges feature-local to `send-form`; do not promote them into shared UI unless another feature proves the same need.
- Preserve native ids, click-through behavior, and no-op fallbacks when ST anchors are missing.
- `focusRelease.ts` remains an intentional send-form compatibility guard shared by options and extensions drawers.
