## Purpose

- Own mobile-only AstraProjecta runtime startup and resolved layout-mode gating.
- Decide when chat-session mobile features should mount or unmount.

## Owned Paths / Responsibilities

- Bootstrapping and teardown of mobile chat-session features.
- Consuming the shared layout-mode contract instead of defining a local breakpoint.
- Mounting and unmounting mobile-only chat-session DOM bridges, including message header layout.
- Runtime-owned visual viewport keyboard bridge variables for mobile Safari/PWA compatibility.
- Idempotent runtime startup so re-executing the extension does not duplicate listeners, mounts, or body classes.

## Rules

- Keep feature factories injectable when practical for testing.
- Do not move SillyTavern bridge logic here; runtime only decides when to mount feature-owned code.
- Mobile runtime owns `body.astra-projecta-theme`, `body.astra-projecta-base-ui-body`, and `body.astra-projecta-mobile-layout` while the mobile layout is active.
- Message header layout must mount only while the shared layout-mode contract resolves mobile and must unmount when it resolves desktop.
- Mobile keyboard viewport bridge listeners must mount only while the resolved mobile layout is active and must remove body attributes, inline CSS variables, and scheduled animation-frame work on deactivation.
- Mobile runtime must remove its active body classes whenever the shared layout-mode contract resolves desktop or the runtime is disposed.
- The 1000px `screen and (max-width: 1000px)` auto-mode query belongs to `src/packages/core/layout-mode`, not to this folder.
- Media-query changes only matter here when the shared layout-mode contract is in `auto`.
