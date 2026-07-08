## Purpose

- Own AstraProjecta runtime bootstrap, body-class contracts, and shared UI scope helpers.
- Keep global theme takeover, portal-root infrastructure, and UI-root marking in one documented place.

## Owned Paths / Responsibilities

- Runtime bootstrap surfaces that initialize and dispose AstraProjecta.
- Defensive cleanup for Astra body classes owned by active runtime surfaces.
- Portal/root helpers that mark Astra-owned hosts with `data-astra-projecta-ui-root`.

## Rules

- `body.astra-projecta-theme` owns product theme takeover and SmartTheme variable mappings, but core bootstrap must not add it directly; active surfaces such as the mobile runtime own its lifecycle.
- `body.astra-projecta-base-ui-body` owns shadcn/base-ui semantic tokens, safe-area variables, and overlay runtime variables, but core bootstrap must not add it directly.
- `data-astra-projecta-ui-root` is only for scoped preflight and Astra-owned UI hosts; it must not become the fallback home for global theme tokens again.
- `ensureAstraProjectaUiInfrastructure()` must stay idempotent and must not add theme body classes.
- `markAstraProjectaUiRoot()` only guarantees scoped preflight / portal UI scope.
