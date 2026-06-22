## Purpose

- Own the audited DOM compatibility contract used by chat-catalog target-first native entity activation.

## Responsibilities

- Keep native character/group row selectors and supported id attributes in `dom.ts`.
- Keep the jQuery-trigger and native-click fallback order in `dom.ts`.
- Expose entity-specific lookup functions and a shared activation function to the catalog adapter.

## Rules

- Missing rows return `null`; callers own typed failure mapping and public API fallback behavior.
- Do not import SillyTavern private modules or add catalog business logic here.
- Update `dom.test.ts` whenever native row markup or activation behavior changes.
