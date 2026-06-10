## Purpose

- Own AstraProjecta single-message action surfaces inside the SillyTavern chat DOM.
- v1 scope is the last non-user message footer `.astra-mesActions` that renders the revision bar, inline revision-history affordance, and swipe pager directly; the More actions Drawer opened by mobile long-press on live `#chat .mes .mes_text` or by the message header ellipsis button; and the edit Drawer opened by the message header pencil button or mobile `click_to_edit` message clicks.

## Owned Paths / Responsibilities

- `createMobileMessageActionsFeature.tsx`: mobile lifecycle for mounting/unmounting message action React roots, including per-message `.astra-mesHeaderActions` roots inside the message header.
- `messageActionSlots.ts`: creation and cleanup of the direct Astra-owned footer action container under a message `.mes`, immediately after `.mes_block`.
- `RevisionBar.tsx`: compact revision/continue/history UI for the final actionable assistant message.
- `revision-history/`: lazy Drawer tree for native SillyTavern swipes plus Astra revision records, opened from More actions footer history affordances. See the child `AGENTS.md` before changing history UI behavior.
- `SwipePager.tsx`: compact swipe pager UI.
- `message-actions.css`: selector contract and visual styling for message actions.

## SillyTavern Touchpoints

- Source chat root: `#chat`.
- Source message selector: `#chat .mes[mesid]`.
- Footer target host: direct Astra-owned `.astra-mesActions[data-astra-component="mes-actions"][data-astra-slot="footer"]` under the target message `.mes`, placed immediately after `.mes_block`.
- Header target host: direct Astra-owned `.astra-mesHeaderActions[data-astra-component="mes-header-actions"]` inside the target message `.astra-mesHeader`, rendered only when the message header bridge has provided that header node.
- The revision bar and swipe pager render directly inside the footer action container; do not add per-action wrapper hosts or mount these controls into a top/header action slot.
- Native swipe behavior must be triggered through `packages/core/st/chatMessageSwipe`; revision/continue behavior must be coordinated through `packages/core/st/chatMessageRevision`; all-message history availability must be read through `packages/core/st/chatMessageRevisionHistory`; feature code must not mutate SillyTavern chat data directly.
- Missing chat/message nodes must no-op and unmount any stale Astra root.

## Rules

- Keep all inserted nodes Astra-owned and reversible.
- Do not move, wrap, or remove SillyTavern-owned message nodes.
- Clean up React roots, subscriptions, and empty Astra-owned containers on unmount/dispose.
- Do not insert empty top/header `.astra-mesActions` hosts during normal message action rendering; the only production `.astra-mesActions` slot is `data-astra-slot="footer"`. Header buttons use the separate `.astra-mesHeaderActions` host.
- Production mobile rendering must not create `.astra-mesActions__revisionHost`, `.astra-mesActions__historyHost`, `.astra-mesActions__moreHost`, `.astra-mesActions__leftDefault`, or `.astra-mesActions__rightDefault`; keep those names only as legacy cleanup selectors if needed.
- The More actions Drawer entry points are mobile long-press on live `#chat .mes .mes_text` and the header ellipsis button. The Drawer still owns history, edit, prompt visibility, and extra action handoffs after the selected message target is resolved.
- The header pencil button opens the Astra edit Drawer directly through `packages/core/st/chatMessageEdit`; it must not click or reparent SillyTavern native edit controls.
- When SillyTavern `powerUserSettings.click_to_edit` is enabled in mobile layout, live `.mes_text` and `.mes_reasoning` clicks must open the Astra edit Drawer directly and must not trigger native `.mes_edit` controls. Preserve SillyTavern's no-op cases for active text selection and existing native edit textareas.
- Footer revision/swipe controls are shown only for the last loaded message when that message is not user-authored. Non-last message history remains reachable through the More actions Drawer for the selected message.
- Keep Revision history apply behavior routed through `packages/core/st/chatMessageRevision`; do not mutate SillyTavern chat messages directly from React components.
- Keep user-facing copy in `locales/en.json` and consume it through typed i18n keys.
