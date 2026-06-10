## Purpose

- Define the cross-platform contract layer shared by mobile and desktop.
- Keep reusable abstractions portable and free from product-specific DOM assumptions.

## Owned Paths / Responsibilities

- Cross-platform types.
- Shared adapter interfaces that do not directly own product layout.
- Service contracts, event abstractions, and state abstractions that can be consumed by both assemblies.
- Shared route or composition contracts if AstraProjecta later needs them.

## Structure Tree

```text
src/app/shared/
├─ AGENTS.md
└─ future shared contracts only
```

## SillyTavern Touchpoints

- Shared code may define typed contracts around SillyTavern data or events, but should not directly manipulate SillyTavern-owned DOM.
- If a shared abstraction depends on a SillyTavern concept, keep that dependency interface-driven and implemented elsewhere, usually in `packages/core`.

## Allowed Patterns

- Shared interfaces, discriminated unions, service contracts, event names, store contracts, and assembly-neutral helpers.
- Normalizing data shapes for both assemblies when the normalization does not require product layout knowledge.

## Forbidden Patterns

- Mobile-specific or desktop-specific DOM selectors.
- Direct manipulation of SillyTavern-owned nodes.
- Feature-specific view policy, UI wrapper rules, or product layout decisions.
- Sneaking runtime bootstrap behavior into shared helpers.

## Naming Rules

- Name abstractions by responsibility, not by current caller.
- Prefer neutral names such as `runtime contract`, `surface model`, `event bridge`, or `selection state` over mobile- or desktop-coded names.

## Update Triggers

- Update this file when shared abstractions gain stable categories, or when cross-platform rules need to be tightened to stop product leakage.

## Verification Checklist

- Confirm shared code remains portable across assemblies.
- Confirm no direct SillyTavern DOM ownership is granted here.
- Confirm feature UI policy still stays out of this layer.
