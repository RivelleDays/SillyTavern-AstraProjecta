## Purpose

- Own AstraProjecta shared UI helpers that are not vendored shadcn sources.
- Keep stable AstraProjecta-owned UI helpers and icon policy in a neutral shared UI layer.

## Owned Paths / Responsibilities

- `icon.tsx`: shared Lucide sizing wrapper for AstraProjecta UI surfaces.
- `icons.ts`: shared Lucide re-export surface and icon types.
- `brand-icons/`: bundled brand SVGs (Simple Icons, CC0-1.0) exposed as Lucide-compatible icon components; the `.svg` files are the source of truth and must stay single-path 24x24.
- `provider-svg-icon.tsx`: shared sanitized SillyTavern provider SVG loader/cache/prefixer for UI surfaces that need `/img/<provider>.svg` icons without duplicating SVG parsing policy.
- `scroll-area.tsx`: convenience composition over the canonical Astra Scroll Area parts for surfaces that only need the simple wrapper shape.
- `sliding-tabs.tsx`: shared horizontal tab strip with a single measured sliding indicator for Astra-owned navigation surfaces.
- Future stable overlay-aware helpers belong here after the Astra-only wrapper cleanup. Do not reintroduce `src/components/ui/astra` as a runtime wrapper layer.

## Rules

- Keep vendored shadcn sources under `src/components/ui/shadcn` untouched.
- Keep feature state and SillyTavern business logic out of this folder.
- Shared helpers may depend on runtime infrastructure only when they represent a stable cross-feature contract, not speculative wrapper code.
- Tooltip wrappers were intentionally removed from `src/components/ui/astra`; any future shared overlay helper should be added here only if it represents a stable contract.
- Shared icon helpers may centralize Lucide policy, but should stay presentation-only.
- Shared provider SVG helpers must keep fetched SVG inert by removing scripts, inline event handlers, and JavaScript URLs, and must prefix internal ids before rendering to avoid collisions across repeated icons.
- Shared `ScrollArea` helpers should compose the canonical Astra parts instead of implementing a second primitive wrapper.
- Shared sliding tabs should keep route and content switching policy in the caller; this layer owns only tab semantics, item rendering, and indicator motion.
- Swipeable, mounted content tabs belong to `src/components/ui/astra/smooth-tabs`; do not fold that behavior into `shared/sliding-tabs`.
- Feature code that needs the SillyTavern-oriented scroll surface should prefer `@/components/ui/astra/scroll-area`; `@/components/ui/shared/scroll-area` is the simplified composition layer only.
