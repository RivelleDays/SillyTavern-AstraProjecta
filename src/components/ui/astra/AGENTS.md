## Purpose

- Own the narrow set of AstraProjecta UI wrappers that must adapt shadcn/Vaul primitives to SillyTavern runtime constraints.
- Document recurring SillyTavern-specific overlay failure modes that current AstraProjecta wrappers must handle.
- Keep this folder intentionally small so Drawer and overlay fixes do not regress into ad hoc wrapper churn.

## Owned Paths / Responsibilities

- `AGENTS.md`
- `ResponsiveDialog.tsx`: SillyTavern-aware responsive overlay wrapper that presents the same `astra-dialog-*` contract as a Radix dialog on desktop and an Astra/Vaul drawer on mobile
- `ResponsiveDialog.test.tsx`: component-level contract coverage for the shared responsive dialog structure
- `MobilePagePanel.tsx`: Astra-owned low-level app-style full-screen mobile page primitive with portal scoping, no backdrop, and caller-owned layout content
- `MobilePagePanel.test.tsx`: component-level contract coverage for the full-screen mobile page primitive, dismissal rules, accessibility title, and root CSS selector contract
- `select.tsx`: Astra-aware select wrapper that adds container-scoped portal behavior and elevated content layering for overlay-hosted selects
- `select.test.tsx`: component-level contract coverage for select portal scoping and z-index hardening
- `dropdown-menu.tsx`: Astra-aware dropdown wrapper that adds container-scoped portal behavior and elevated content layering for overlay-hosted menus
- `dropdown-menu.test.tsx`: component-level contract coverage for dropdown portal scoping and z-index hardening
- `drawer.test.tsx`: component-level contract coverage for Astra drawer shell and body parts
- `drawer.tsx`: SillyTavern-aware wrapper around the vendored shadcn/Vaul drawer primitive
- `sheet.test.tsx`: component-level contract coverage for the Astra-owned sheet wrapper
- `sheet.tsx`: Astra-owned wrapper around the vendored shadcn sheet primitive for full-height mobile sheets
- `scroll-area.tsx`: canonical AstraProjecta Scroll Area wrapper built on Base UI for touch-first, constrained surfaces
- `smooth-tabs.tsx`: Astra-owned mobile-style tab primitive with swipe/wheel page transitions, mounted panels for touch-first content switching, and an optional caller-owned list-frame portal target for shell-level tab bars
- `smooth-tabs.css`: isolated `.astra-smooth-tabs-*` styling contract for the smooth tab primitive
- Compatibility-only UI exports that need portal-container, autofocus, or overlay class adjustments not suitable for `src/components/ui/shadcn`

## Status

- This folder is no longer docs-only.
- The active exceptions are the Drawer compatibility wrapper, Sheet wrapper, Responsive Dialog compatibility wrapper, Mobile Page Panel wrapper, the canonical Astra Scroll Area wrapper for SillyTavern mobile surfaces, and the smooth touch-first tab primitive for mounted page-style tab content.
- Overlay-hosted selects and dropdown menus are also active exceptions because Radix overlay content must follow Astra portal/container rules inside SillyTavern drawers and popups.
- Do not expand this folder into a general-purpose Astra wrapper layer.
- `DrawerBody` is the canonical Astra drawer part for long or potentially clipped content. Feature code should use it instead of open-coding `ScrollArea` inside `DrawerContent`.

## Why Drawer Work Fails In SillyTavern

- Shadcn Drawer is only a thin Vaul wrapper. In SillyTavern, most failures come from runtime integration, not from the primitive API alone.
- The common failure modes are portal host lifetime, incorrect container scoping, focus handoff, `pointer-events` conflicts with SillyTavern popups, delayed teardown for exit animations, and scroll or safe-area issues in mobile layouts.
- A local wrapper is not enough if the actual bug lives in runtime ownership, DOM reparenting, or mobile overlay orchestration.

## Drawer Close Animation Contract

- The canonical close lifecycle for Astra drawers is: set the primitive visual state to closed immediately, let Vaul/Radix expose `data-state="closed"` for exit motion, then notify the parent through `onOpenChange(false)` only after the shared exit lifecycle completes.
- `Drawer` owns the mobile/Vaul close lifecycle with internal visual state, `useAstraDrawerClose`, `DrawerClose`, `onExitComplete`, and Vaul `onAnimationEnd`/timeout fallback coordination.
- `ResponsiveDialog` must mirror the same close lifecycle on both paths: mobile delegates to Astra `Drawer`, and desktop keeps Radix Dialog content mounted in closed state until delayed teardown completes.
- Feature hosts are responsible for keeping the React root mounted until `onExitComplete`. If feature data may become `null` before exit finishes, preserve the last non-null display state so titles, previews, and body content do not disappear during the closing animation.
- Feature code must not solve Drawer teardown with ad hoc `isContentMounted` plus close `setTimeout` values. A host-mounted flag is acceptable only when it is released by `onExitComplete`.
- Close behavior should stay synchronized with official shadcn Drawer/Vaul defaults. Do not reintroduce Astra Drawer enter/exit keyframes, custom duration/easing overrides, overshoot transforms, or wrapper-level motion constants that compete with Vaul.
- Do not hand-write Tailwind compiler internals such as `--tw-backdrop-blur`; if upstream shadcn adds a real class contract later, add the class and let the build emit generated CSS.
- Regression tests for Drawer or ResponsiveDialog close behavior should verify parent notification is delayed, `onExitComplete` fires once per close, content remains in the DOM while `data-state="closed"`, and `forceMountContent` still means intentionally always mounted.

## Routing Rules

- Put upstream shadcn recipes and generated primitives in `src/components/ui/shadcn`.
- If `src/components/ui/astra/<same-name>` exists, that wrapper is the canonical SillyTavern-adapted import for the overlapping surface.
- Keep feature state and SillyTavern business logic out of this folder.
- Put SillyTavern runtime contracts such as portal hosts, overlay scope, or body-class coordination in `src/packages/core/runtime`.
- Put mobile-only overlay orchestration, popup interlocks, and drawer lifecycle code in `src/app/mobile`.
- Use this folder only when a wrapper must adapt a vendored primitive to SillyTavern runtime behavior.
- If `src/components/ui/astra/select.tsx` exists, overlay-hosted feature code should import it instead of `src/components/ui/shadcn/select`.
- If `src/components/ui/astra/dropdown-menu.tsx` exists, drawer-, panel-, popup-, or overlay-hosted feature code should import it instead of `src/components/ui/shadcn/dropdown-menu`.
- Keep per-feature drawer layering outside `drawer.tsx`. When a nested drawer must appear above an Astra panel, prefer a feature CSS selector that targets the existing Vaul overlay sibling, such as `.astra-drawer__overlay:has(+ #feature-drawer-id)`, plus a feature-local surface layer token.

## Symptom And Responsibility Map

| Symptom / Concern                                                     | Primary Owner                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Portal host lifetime and stable overlay root creation                 | `src/packages/core/runtime`                                 |
| Explicit container scoping for portals and surfaces                   | `src/components/ui/shared` plus `src/packages/core/runtime` |
| Focus handoff and `onOpenAutoFocus` control                           | `src/components/ui/shared`                                  |
| SillyTavern popup vs Vaul `pointer-events` conflicts                  | `src/app/mobile` plus `src/packages/core/runtime`           |
| Exit animation teardown timing                                        | `src/components/ui/astra` plus the owning host component    |
| Reparenting and restoring SillyTavern-owned DOM                       | `src/app/mobile` or feature runtime modules                 |
| Scroll area, safe-area padding, and mobile viewport limits            | shared UI contract plus mobile feature CSS                  |
| `z-index` overrides for select, dropdown, popover, or drawer surfaces | shared UI contract plus Astra-owned override CSS            |

## Compatibility Notes

- Before adding a new wrapper, inspect current AstraProjecta overlay, portal, and mobile runtime code for an existing ownership boundary.
- Drawer, dialog, popup interlock, native drawer reuse, select/dropdown layering, and scroll-surface fixes should be treated as related SillyTavern integration problems instead of isolated component tweaks.
- Useful in-repo search terms include `container=`, `onOpenAutoFocus`, `astra-drawer`, `astra-dialog`, `portal`, `MOBILE_OVERLAY_HOST_ID`, `onExitComplete`, `useAstraDrawerClose`, `useResponsiveDialogClose`, `z-index`, and `astra-scroll-area`.

## Drawer And Dialog Stability Checklist

- New feature drawers should import from `@/components/ui/astra/drawer`, not the vendored shadcn drawer, when they render inside SillyTavern or any Astra mobile surface.
- Responsive action overlays should prefer `ResponsiveDialog` when the same feature needs Radix Dialog on desktop and Vaul Drawer on mobile.
- Keep the external host mounted until the shared close lifecycle finishes. If a parent must stop rendering a drawer after `open=false`, keep a small host-mounted state and release it from `onExitComplete`; do not use feature-local close `setTimeout` values.
- User-requested close from overlay content must go through `DrawerClose`, `ResponsiveDialogClose`, `useAstraDrawerClose`, or `useResponsiveDialogClose`. Do not call parent `onOpenChange(false)` from cancel, done, outside-dismiss replacement, or successful async action handlers.
- Async success handlers should call the close hook after the operation succeeds, then let the wrapper notify the parent after exit animation. Failure paths should leave the overlay open and keep busy state local to the feature.
- When close primitives use `asChild` around shadcn `Button`, expect the DOM slot to become `drawer-close` or `dialog-close` while `data-variant` and `data-size` remain from Button. Global SillyTavern button CSS conflicts belong in `src/styles/shadcn-overrides.css`, not feature-local `.astra-*-action--close` color patches.
- Keep Drawer motion aligned with shadcn/Vaul defaults. Do not add Astra-specific Drawer enter/exit keyframes, duration overrides, permanent `will-change`, or generated Tailwind internals such as `--tw-backdrop-blur` unless upstream shadcn introduces a class contract that requires it.
- Add or update tests for any new close pattern: verify `data-state="closed"` appears before parent notification, content remains mounted during exit, and close primitive buttons retain `data-slot`, `data-variant`, and `data-size` metadata when `asChild` is used.

## Why ScrollArea Work Lives Here

- The primary failure this wrapper addresses is mobile/touch scrollbar visibility and consistency inside Astra-owned drawer and panel surfaces.
- Base UI provides the primitive behavior, but Astra owns the canonical part structure, class contract, and styling hooks that feature-local CSS can target.
- Keep Scroll Area runtime-agnostic where possible. If a future bug comes from portal scope, teardown, or overlay lifecycle, that remains a runtime/mobile concern rather than a Scroll Area wrapper concern.

## Rules

- Keep wrappers here compatibility-focused and presentation-only.
- Component tests may verify required CSS selectors/classes exist for wrapper integration, but must not assert exact CSS visual property values.
- Default implementation work to `shadcn/`, `shared/`, `packages/core/runtime/`, or `app/mobile` unless a primitive truly needs a SillyTavern-aware wrapper.
- Keep feature state and SillyTavern business logic out of UI wrapper modules.
- When adding a new wrapper here, document the exact SillyTavern failure mode it addresses.
- Overlay wrappers may own entry and exit motion, focus handoff, and teardown timing when those behaviors are part of SillyTavern compatibility, but they should not accumulate decorative looping motion.
- Content rendered inside `Drawer` or `ResponsiveDialog` must start user-requested close through `DrawerClose`, `ResponsiveDialogClose`, `useAstraDrawerClose`, or `useResponsiveDialogClose`. Do not call the parent `onOpenChange(false)` directly from overlay content; the shared close lifecycle owns `data-state="closed"` and delayed parent notification.
- Compatibility wrappers should not paper over performance problems by piling on blur, extra composited layers, or permanent GPU hints; prefer fixing scope, lifecycle, and container behavior first.
- Avoid `h1`, `h2`, and `h3` in Astra wrappers. Use neutral elements with explicit classes so SillyTavern heading styles cannot override overlay typography.
- Treat `select.tsx` as the canonical import for selects rendered inside drawers, popovers, or other overlay stacks that need Astra portal scoping or elevated layering.
- Treat `dropdown-menu.tsx` as the canonical import for dropdown menus rendered inside drawers, panels, popups, popovers, or other overlay stacks that need Astra portal scoping, pointer-event recovery, or elevated layering.
- `ResponsiveDialog` exists because action overlays need stable Astra portal scoping and one shared `astra-dialog-*` surface contract while switching between Radix Dialog on desktop and Vaul Drawer on mobile. It must stay presentation-only; feature state and SillyTavern rename/delete/category behavior belong in the owning feature folder.
- `sheet.tsx` exists because the main-menu tile sheets need Astra-owned full-height sizing and portal scoping without modifying the vendored shadcn source. Keep it presentation-only; tile routing/state belongs in the owning feature folder.
- `MobilePagePanel.tsx` exists because mobile needs an app-style full-screen page layer that keeps Astra portal scoping while refusing gesture/outside dismissal and leaving ST popups free to render above it. Keep it a low-level primitive; feature-specific headers, footers, scroll surfaces, routing, and native drawer composition belong in the caller.
- Treat `drawer.tsx` as the canonical home for Astra drawer body composition. Do not hand-roll `ScrollArea.Root > Viewport > Content` inside feature-owned `DrawerContent` surfaces once `DrawerBody` covers the use case.
- Do not add feature-specific overlay hook props to `DrawerContent`; the shared wrapper should keep one canonical overlay path, and feature-owned stacking fixes should live in feature CSS or shared override CSS only after the failure pattern is proven reusable.
- Treat `scroll-area.tsx` as the canonical AstraProjecta Scroll Area API. Feature code that needs the SillyTavern-oriented surface should import this wrapper instead of `shared/scroll-area`.
- Treat `smooth-tabs.tsx` as the canonical AstraProjecta primitive for mobile-style swipeable content tabs. Keep it isolated from `shared/sliding-tabs.tsx`, Shadcn Tabs, and `.astra-sliding-tabs-*`; callers own route state and feature content.
- Do not globalize every Vaul or viewport workaround into this folder; some fixes, such as the send-form menu's feature-local focus release and `repositionInputs={false}`, must stay feature-local until multiple drawers prove the same failure pattern.
