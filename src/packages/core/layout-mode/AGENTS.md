## Purpose

- Own the single AstraProjecta source of truth for whether the mobile layout is active.
- Keep viewport-gated mobile activation, future manual layout overrides, and related subscriptions out of feature code and out of ad hoc hooks.

## Owned Paths / Responsibilities

- `index.ts`: centralized mobile layout resolver, tri-state preference normalization, and shared subscription store.
- The default auto-mode query: `screen and (max-width: 1000px)`.
- Future settings wiring for `astra_projecta.layout_mode_preference`.
- Shared contracts consumed by runtime, hooks, and future settings UI.

## Rules

- `auto` follows `screen and (max-width: 1000px)` only.
- `force-mobile` enables the Astra mobile layout even on wide desktop viewports.
- `force-desktop` suppresses the Astra mobile layout even below 1000px.
- SillyTavern core `isMobile()` is reference-only here; AstraProjecta layout activation is viewport-and-override driven, not UA driven.
- Media-query change notifications should only affect Astra mobile activation while the preference is `auto`.
- If a future settings UI changes layout preference, it must update this shared contract instead of introducing a second breakpoint source.

## Forbidden Patterns

- Reintroducing a second mobile breakpoint in `hooks/`, `app/mobile/`, or feature folders.
- Using SillyTavern UA detection as the activation source for AstraProjecta mobile layout.
- Hard-coding layout preference reads directly in runtime or view components.

## Update Triggers

- Update this file when the auto-mode query, layout preference enum, or shared subscription contract changes.
