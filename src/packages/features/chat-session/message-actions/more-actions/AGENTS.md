## Purpose

- Own the AstraProjecta More actions trigger target contract and message-scoped Drawer UI.
- Keep this folder as the future extension point for per-message actions opened from the mobile long-press More actions entry point.

## Owned Paths / Responsibilities

- `MoreActionsDrawer.tsx`: responsive Drawer for the selected message, including stable semantics, feature-local message summary heading, rendered message body preview, and close-only footer.
- `MessageExtraActionsDrawer.tsx`: sibling Drawer opened from the More footer pill. It owns the danger zone and Astra-rendered native `.extraMesButtons` rows.
- `MessageEditDrawer.tsx`: sibling Drawer opened from the More footer edit action. It owns Astra-rendered edit fields, action strip, and footer controls for message editing.
- `MessageActionsIdentityHeader.tsx`: shared selected-message identity header used by both More and Extra actions drawers.
- `nativeExtraMessageActions.ts`: feature-local adapter that reads the selected message's live SillyTavern `.extraMesButtons` children and dispatches native activation events back to the original elements.
- `messageContentSnapshot.ts`: rendered `.mes_text` snapshot adapter for the Drawer body and plain-text message preview. It owns cloning, inert scrubbing, and script/style exclusion for preview text copied from the live chat DOM.
- `MoreActionsDrawer.test.tsx`: component-level contract coverage for the Drawer id, ARIA wiring, header identity, rendered body preview, and close footer.
- `MessageExtraActionsDrawer.test.tsx` and `nativeExtraMessageActions.test.ts`: component and adapter coverage for the sibling extra-actions Drawer.
- `messageContentSnapshot.test.ts`: contract coverage for rendered `.mes_text` cloning, scoped style preservation, inert snapshot scrubbing, and plain preview text extraction.
- User-facing copy lives in `locales/en.json` under `messageActions.more.*`, `messageActions.extra.*`, and `messageActions.edit.*`; regenerate `src/types/i18n.d.ts` through `npm run i18n`.

## Rules

- Treat the Drawer body as a display snapshot of the selected chat message's current rendered `#chat .mes .mes_text` DOM.
- Do not populate the body from raw chat message text, `textContent`, edit textarea content, or a second call to SillyTavern formatting helpers. The purpose is to match what the chat currently displays after SillyTavern and extension formatting have already run.
- Keep the preview wrapper on a `.mes` element and preserve the cloned `.mes_text` root class so SillyTavern selectors such as `.mes q:before`, `.mes q:after`, and `.mes_text ...` continue to describe the same rendered content.
- Preserve message-local `<style>` nodes from the rendered DOM snapshot; SillyTavern has already sanitized and scoped message CSS before it reaches `.mes_text`.
- Keep snapshots inert: cloned content must not preserve duplicate `id` attributes, inline event attributes, scripts, autofocus/autoplay, editable state, or tabbable descendants.
- The extra-actions heading preview is plain text from the selected rendered `.mes_text`; exclude script/style text and do not render raw HTML in that heading.
- Keep the More actions entry lightweight during chat load. Production rendering must not create per-message trigger hosts; use delegated mobile long-press on live `#chat .mes .mes_text`.
- Resolve `MessageActionsTarget`, message metadata, and `messageContentSnapshot` only after the selected message's long-press entry fires, or while refreshing an already-open Drawer for that same selected message.
- Keep future action overlays as controlled siblings: close this Drawer first, then open a sibling dialog/drawer on a later frame. Do not nest Vaul drawers inside this Drawer.
- The extra-actions Drawer must use a model-and-dispatch bridge, not live DOM reparenting: render Astra-owned rows from `.extraMesButtons`, then trigger the original native elements on action click.
- Delete message/delete swipe actions should route through the public `SillyTavern.getContext().deleteMessage` surface via a core adapter, after Astra asks for confirmation.
- The edit Drawer must render Astra-owned shadcn `Textarea` fields. Do not insert, reparent, or trigger SillyTavern native `.edit_textarea`, `#curEditTextarea`, `.reasoning_edit_textarea`, `mes_edit_buttons`, or `mes_reasoning_actions` nodes.
- Edit save/copy/move behavior routes through `packages/core/st/chatMessageEdit.ts`. The React Drawer should pass the current local draft into those adapters instead of reading native edit DOM.
- Keep the More actions Drawer feature-local: render it directly with the Astra `Drawer` primitives, preserve the root/title/description ids for ARIA, and do not route this surface through `ResponsiveDialog`.
- Do not render shared `astra-dialog-*` structural slots inside this Drawer. The Drawer owns `mobile-message-more-actions-drawer-header`, `mobile-message-more-actions-drawer-heading`, `mobile-message-more-actions-drawer-extra-actions`, `mobile-message-more-actions-drawer-extra-actions-viewport`, `mobile-message-more-actions-drawer-extra-actions-content`, `mobile-message-more-actions-drawer-extra-actions-scrollbar`, `mobile-message-more-actions-drawer-body`, `mobile-message-more-actions-drawer-scrollable-content`, `mobile-message-more-actions-drawer-content`, and `mobile-message-more-actions-drawer-footer`.
- The edit Drawer owns `mobile-message-edit-drawer-header`, `mobile-message-edit-drawer-extra-actions`, `mobile-message-edit-drawer-extra-actions-content`, `mobile-message-edit-drawer-extra-actions-start`, `mobile-message-edit-drawer-extra-actions-end`, `mobile-message-edit-drawer-body`, `mobile-message-edit-drawer-scrollable-content`, `mobile-message-edit-drawer-content`, and `mobile-message-edit-drawer-footer`.
- Reuse the shared `astra-dialog-identity` class family on the local `astra-messageMoreActionsDrawer__identity*` elements so More actions matches Astra dialog identity styling while keeping feature-local selectors stable.
- Do not render `astra-messageMoreActionsDrawer__identityMetaLine` or `astra-messageMoreActionsDrawer__identityTimestamp`; timestamp belongs in the heading detail rows to avoid duplicate metadata.
- Message metadata in the heading is a display-only snapshot from the selected message DOM/context. Render it as local `astra-messageMoreActionsDrawer__detail*` rows, with separators between rows, following the same compact detail-section pattern as delete-confirmation metadata.
- Model metadata appears in `#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow` below the header when the selected message exposes timestamp, model, or generation metadata. Model labels and model icons in this Drawer must render independently of SillyTavern's `messageModelIconEnabled` and `body.no-modelIcons` live-header setting. Prefer a cloned inert native SillyTavern `.timestamp-icon`; when none exists, the Drawer may render a sanitized provider SVG resolved from metadata `modelIconKey`. SVG load failure must hide only the icon, not the formatted model label.
- `bookmarkLink` may stay in the selected-message metadata payload for future use, but the More actions heading must not render checkpoint/bookmark UI until that interaction is explicitly redesigned.
- Do not add collapsible state, chevrons, accordions, or expanded metadata regions to this Drawer without a new design decision.
