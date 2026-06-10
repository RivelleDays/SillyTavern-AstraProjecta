## Purpose

- Define the contract for feature folders under `src/packages/features`.
- Keep feature modules responsible for user-facing behavior while relying on shared contracts, core infrastructure, and UI wrappers instead of re-inventing them.

## Owned Paths / Responsibilities

- Feature-specific state, composition, controllers, and owned UI behavior.
- The folder-level documentation pattern that each stable feature must follow.
- Phase 1 priority features: `astra-main-interface`, `chat-session`, and `sillytavern-interface`.

## Structure Tree

```text
src/packages/features/
├─ AGENTS.md
├─ astra-main-interface/
│  ├─ AGENTS.md
│  ├─ chat-list/
│  ├─ chat-categories/
│  ├─ global/
│  ├─ current-context/
│  └─ favorite-context/
├─ chat-session/
│  └─ AGENTS.md
└─ sillytavern-interface/
   └─ AGENTS.md
```

## SillyTavern Touchpoints

- Features may consume prepared adapters and runtime contracts from `packages/core`.
- If a feature must touch SillyTavern directly, the owning feature document must explain the touchpoint and why it is not better placed in `core`.
- Each stable feature should document its owned SillyTavern selectors, events, settings usage, and AstraProjecta hosts.

## Allowed Patterns

- Small feature modules with explicit ownership.
- Feature-level state and composition that stays focused on one product capability.
- Feature child `AGENTS.md` files when a feature has enough stable rules to justify them.
- Default to the vendored shadcn component library for UI composition.

## Forbidden Patterns

- Cross-feature dumping grounds.
- Hiding core infrastructure inside feature folders.
- Direct raw third-party UI primitive usage when a local wrapper should exist in `src/components/ui`.
- Editing or forking upstream shadcn component files under `src/components/ui/shadcn` from feature work.
- Omitting documentation for owned DOM ids/classes, events, or testing expectations once a feature becomes stable.

## Naming Rules

- Name feature folders by capability, not by current screen position.
- Prefer stable functional names such as `chat-session`, `navigation`, or `persona` over temporary UI labels.

## Update Triggers

- Update this file when a new stable feature category is added or when the minimum documentation contract for features changes.
- Add a child `AGENTS.md` when a feature gains enough stable ownership to need its own rules.

## Verification Checklist

- Confirm features remain capability-based.
- Confirm direct SillyTavern touchpoints must be justified and documented.
- Confirm `astra-main-interface`, `chat-session`, and `sillytavern-interface` remain identified as Phase 1 priority features.
