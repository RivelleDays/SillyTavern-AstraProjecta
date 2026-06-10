## Purpose

- Own the send-form mount host, textarea reparent/restore lifecycle, and feature bootstrap entrypoint.

## Rules

- Keep mount, unmount, and dispose behavior idempotent.
- Limit this folder to host/bootstrap responsibilities; view composition belongs in `shell/`.
- Preserve the root `createMobileSendFormFeature.tsx` compatibility shim as the public entry.
