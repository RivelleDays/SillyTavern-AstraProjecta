## Purpose

- Own focused helpers for single-message Revision History behavior.
- Keep storage, baseline capture, generation transaction state, and future operation/store slices separate from UI feature code.

## Owned Paths / Responsibilities

- `baseline.ts`: first-observed message/swipe baseline tracking used to preserve original text before edits or generations mutate SillyTavern message data.
- `generationTransaction.ts`: pending Astra-triggered regenerate transaction state used to classify render events even when SillyTavern emits generation stop before message render.
- `rootRebase.ts`: rewrites revision root, active, parent, and descendant child paths when a root index changes, keeping namespaced roots aligned after native swipe deletions.
- `storage.ts`: public transition point for revision storage helpers. It currently re-exports the legacy adapter while callers migrate into this folder.
- `tree.ts`: public transition point for selected-message revision tree helpers. It currently re-exports the legacy tree reader while callers migrate into this folder.
- Future files in this folder should hold extracted single-message revision operations and store code currently exposed through `../chatMessageRevision.ts`.

## Rules

- Do not import React or feature UI modules here.
- Do not read or write SillyTavern core files.
- Keep helpers product-layout agnostic and driven by serializable message data plus narrow callback dependencies.
- Runtime transaction state must be cleared on chat changes and store disposal.
