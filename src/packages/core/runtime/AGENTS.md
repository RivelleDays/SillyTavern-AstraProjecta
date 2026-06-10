## Purpose

- Own AstraProjecta runtime bootstrap, body-class contracts, and shared UI scope helpers.
- Keep global theme takeover, portal-root infrastructure, and UI-root marking in one documented place.

## Owned Paths / Responsibilities

- Runtime bootstrap surfaces that initialize and dispose AstraProjecta.
- Global body classes for theme takeover and base-ui runtime tokens.
- Portal/root helpers that mark Astra-owned hosts with `data-astra-projecta-ui-root`.

## Rules

- `body.astra-projecta-theme` owns product-wide theme takeover and SmartTheme variable mappings.
- `body.astra-projecta-base-ui-body` owns shadcn/base-ui semantic tokens, safe-area variables, and overlay runtime variables.
- `data-astra-projecta-ui-root` is only for scoped preflight and Astra-owned UI hosts; it must not become the fallback home for global theme tokens again.
- `ensureAstraProjectaUiInfrastructure()` must stay idempotent and must not add theme body classes.
- `markAstraProjectaUiRoot()` only guarantees scoped preflight / portal UI scope.
