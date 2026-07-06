## Purpose

- Own the Phase 1 chat/session experience for AstraProjecta.
- Define the responsibility boundary between feature behavior, mobile shell composition, and SillyTavern chat-surface bridges.

## Owned Paths / Responsibilities

- Chat-session view logic, message layout bridges, message action behavior, send-form behavior, and input-related feature composition.
- Feature-owned AstraProjecta hosts and feature-local state for chat/session behavior.
- Documentation of any input, toolbar, menu, message-layout, or message-action bridge required by the feature.

## Structure Tree

```text
src/packages/features/chat-session/
├─ AGENTS.md
├─ chat-scroll/
│  └─ AGENTS.md
├─ chat-switch-loading/
│  └─ AGENTS.md
├─ message-layout/
│  └─ AGENTS.md
├─ message-actions/
│  └─ AGENTS.md
├─ message-search/
│  └─ AGENTS.md
└─ send-form/
   └─ AGENTS.md
```

## SillyTavern Touchpoints

- Chat-session may bridge SillyTavern input and action surfaces when needed for compatibility, but the owning module must document:
    - source selector or source contract
    - AstraProjecta target host
    - restoration order on teardown
    - event or lifecycle triggers
    - fallback behavior
    - no-op behavior
    - cleanup of listeners, observers, timers, and moved nodes
- `packages/core` should own reusable adapter logic. `chat-session` should own feature behavior and feature-local bridge composition.
- `app/mobile` owns shell placement and layout policy. `chat-session` owns the feature logic mounted into that shell.
- The right-side SillyTavern interface implementation lives in `src/packages/features/sillytavern-interface`; mobile assembly and send-form adapter wiring live in `src/app/mobile/sillytavern-interface-panel`.
- The mobile top-bar and left-side main interface panel live in `src/app/mobile`.
- `chat-scroll` may style and align the native `#chat` scroll container, but must not wrap, move, or replace it because SillyTavern commands and chat lifecycle code read and write `#chat.scrollTop`.
- `chat-switch-loading` may append a transient Astra-owned loading overlay over `#astra-chat-session-shell`, falling back to `#sheld`, during chat-file switches, but must not mutate SillyTavern-owned message nodes or depend on `#chat` children surviving reload.
- `message-search` reads chat text through core adapters, writes replacements through the shared chat message edit adapter, and applies best-effort highlighting over rendered `#chat .mes .mes_text` nodes that must be fully cleared on close, unmount, or recompute.

## Allowed Patterns

- Feature-local controllers that coordinate send form state, message layout, message actions, and session behavior.
- Clear separation between shell placement and feature behavior.
- Recoverable input bridge logic that always restores SillyTavern-owned nodes before unmount completes.
- `ScrollArea` or equivalent overflow handling for long action menus, history lists, and constrained session panels.

## Forbidden Patterns

- Permanent takeover of SillyTavern-owned input nodes with no restore path.
- Pushing send-form behavior into the mobile shell just because the current primary surface is mobile.
- Storing generic SillyTavern adapter logic in this feature when multiple features could reuse it.
- Letting feature state leak into UI wrapper components.
- Importing production code from `src/packages/features/sillytavern-interface`; consume `app/shared` route/icon contracts and injected adapters instead.

## Naming Rules

- Use `chat-session-*` or shorter obvious local names for feature-owned selectors and ids.
- Reserve `astra-projecta-*` for cross-layer or global runtime hosts only.
- Keep message layout, message action, send form, and input bridge names descriptive and stable.

## Update Triggers

- Update this file when chat-session adds stable modules, new bridge categories, or a changed boundary between feature logic and mobile shell ownership.

## Verification Checklist

- Confirm chat-session still owns message layout bridges, message actions, send-form behavior, and input bridge composition.
- Confirm bridge documentation requires restore and cleanup details.
- Confirm shell placement vs feature behavior remains explicitly separated.
- Confirm right-side SillyTavern interface ownership stays outside send-form except for trigger wiring.
