## Purpose

- Own the audited DOM compatibility contract between message-actions and SillyTavern's native message markup.

## Responsibilities

- Keep native message, metadata, gesture, action, edit-state, and template selectors in `dom.ts`.
- Keep legacy Astra message-action host cleanup selectors in `dom.ts` so migration cleanup has one audit point.
- Expose named resolver and activation functions; callers must not receive arbitrary selector strings.

## Rules

- Missing SillyTavern nodes must return `null`, empty arrays, or `false` and must not throw.
- Preserve message scoping so native actions are resolved only inside the requested `mesid`.
- Update `dom.test.ts` whenever the selector or activation fallback contract changes.
- Do not place React UI, drawer state, context parsing, or message business logic in this folder.
