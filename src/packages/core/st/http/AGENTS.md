## Purpose

- Own AstraProjecta's browser-side SillyTavern REST adapter.
- Centralize endpoint constants, request headers, timeout/abort handling, JSON parsing, payload guards, typed errors, and capability-unavailable behavior.

## Rules

- Do not add Astra server plugins, custom backend endpoints, or SillyTavern core imports from this folder.
- Keep raw `/api/*` string constants in `endpoints.ts`; callers should import `ST_ENDPOINTS` instead of duplicating endpoint paths.
- All exported request helpers must accept public SillyTavern extension context only, especially `getRequestHeaders()`.
- Guard every parsed response payload at the adapter boundary or at the closest domain adapter boundary before exposing data to features.
- Preserve caller-owned error semantics by mapping `StHttpError.reason` in domain adapters instead of leaking transport details into UI components.
- Use `logger: null` when a higher-level store already owns user-facing or console logging for retry/backoff behavior.

## Verification Checklist

- Confirm new endpoint usage goes through `client.ts` and `ST_ENDPOINTS`.
- Confirm no custom backend route or server-plugin dependency is introduced.
- Confirm tests cover non-2xx responses, invalid payloads, abort/timeout behavior, and missing request-header capability when those paths are used.
