## Purpose

- Own mobile-only CSS for AstraProjecta Phase 1 assembly.
- Keep mobile stylesheet contracts focused on selectors, hosts, and integration boundaries while leaving visual values easy to tune by hand.

## Owned Paths / Responsibilities

- `chat-send-form.css` owns mobile send-form, current-chat drawer, and menu presentation hooks.
- `chat-send-form.test.ts` may protect selector and host contracts for mobile CSS.
- Chat-session page-panel selectors live in `src/packages/features/sillytavern-interface/sillytavern-interface.css`.

## Rules

- Mobile CSS tests may assert stylesheet presence, stable ids/classes, data-attribute selectors, token names, and absence of deprecated selectors.
- Mobile CSS tests must not assert exact visual property values such as spacing, sizing, color, typography, layout declarations, z-index, overflow, transitions, transforms, opacity, or animation details.
- If a human visual CSS edit conflicts with a CSS-content test, update the test to keep only the structural contract rather than restoring the old style value.
- Keep SillyTavern compatibility selectors explicit when they are stable anchors for host mounting or DOM bridging.

## Verification Checklist

- Confirm mobile CSS tests still protect required selectors and host anchors.
- Confirm tests do not encode hand-tuned CSS values.
- Confirm mobile CSS remains registered through the existing stylesheet entry path.
