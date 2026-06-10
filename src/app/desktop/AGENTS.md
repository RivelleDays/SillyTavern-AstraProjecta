## Purpose

- Keep desktop as a formal AstraProjecta assembly from the start without letting it dictate Phase 1 mobile architecture.
- Preserve a clean landing zone for future desktop composition work.

## Owned Paths / Responsibilities

- Desktop shell entrypoints, reserved layout hosts, and future desktop-specific composition.
- Thin consumption of shared and core contracts during Phase 1.
- Future desktop-specific bridge rules only when desktop work becomes active.

## Structure Tree

```text
src/app/desktop/
├─ AGENTS.md
└─ reserved desktop assembly files
```

## SillyTavern Touchpoints

- During Phase 1, desktop should consume stable contracts from `packages/core` and `app/shared` rather than defining new SillyTavern coupling.
- If desktop later needs direct bridges, document them here or in a deeper child file with the same rigor required for mobile.

## Allowed Patterns

- Thin shell setup.
- Contract preparation for future desktop modules.
- Shared/runtime integration that does not block or reshape mobile-first decisions.

## Forbidden Patterns

- Forcing mobile bridge details into shared or core just to satisfy a future desktop idea.
- Introducing desktop-specific runtime assumptions as if they were global truths.
- Expanding desktop code during Phase 1 in ways that slow or destabilize mobile architecture.

## Naming Rules

- Use `desktop` explicitly for desktop-owned modules.
- Keep desktop-specific selectors and hosts out of shared namespaces until the owning runtime actually exists.

## Update Triggers

- Update this file when desktop shifts from reserved shell to active product work, or when desktop introduces stable runtime/host rules.

## Verification Checklist

- Confirm desktop is still a formal but thin assembly.
- Confirm Phase 1 mobile-first rules are not weakened here.
- Confirm desktop-specific DOM contracts have not leaked upward.
