## Purpose

- Own AstraProjecta's reversible layout bridge for SillyTavern chat message headers.
- Keep avatar, message metadata, and name presentation aligned without editing SillyTavern templates or core files.

## Owned Paths / Responsibilities

- `createMessageHeaderLayoutFeature.ts`: runtime DOM bridge that creates Astra-owned `.astra-mesHeader`, `.astra-mesHeader__identityLine`, `.astra-mesNameText`, `.astra-mesMeta`, `.astra-mesMeta__items`, `.astra-mesMeta__separator`, `.astra-mesNativeControls`, and `.astra-mesReasoningChevron` slots for each message `.mes`, marks `.mes_block` as `.astra-mesBody`, and creates Astra-owned date dividers inside `#chat`.
- `message-layout.css`: mobile-layout-scoped visual layout for `.astra-mesHeader`, `.astra-mesHeader__name`, `.astra-mesHeader__identityLine`, `.astra-mesNameText`, `.astra-mesBody`, `.astra-mesMeta`, `.astra-mesMeta__items`, `.astra-mesMeta__separator`, `.astra-mesMeta__time`, `.astra-mesNativeControls`, `.astra-mesDate`, `.mes_reasoning_details`, `.mes_reasoning_summary`, `.mes_reasoning_header_block`, `.mes_reasoning_header`, `.mes_reasoning_header_title`, `.mes_reasoning`, and `.astra-mesReasoningChevron`.

## SillyTavern Touchpoints

- Source chat root: `#chat`.
- Source message selector: `#chat .mes[mesid]`.
- Source nodes: direct message `.mesAvatarWrapper`, its metadata children, direct `.mes_block > .ch_name`, native `.mes_buttons`, native `.mes_edit_buttons`, native `.timestamp`, and native `.timestamp-icon` when SillyTavern inserts one.
- Target frame: Astra marks the message as `.astra-mes`, inserts `.astra-mesHeader` as a direct `.mes` child immediately before `.mes_block`, marks `.mes_block` as `.astra-mesBody`, nests `.astra-mesMeta` under `.astra-mesHeader__name`, and leaves SillyTavern-owned checkbox and swipe nodes unwrapped.
- Header target: `.astra-mesHeader` contains the native `.mesAvatarWrapper`, plus `.astra-mesHeader__name` with `.astra-mesHeader__identityLine`, Astra-visible `.astra-mesNameText > .name_text`, nested `.astra-mesMeta`, and hidden native `.ch_name`.
- Body target: native `.mes_block` remains the message body and begins with `.mes_reasoning_details` and following content after `.ch_name` moves into the header.
- Reasoning target: native `.mes_reasoning_header` remains the SillyTavern toggle target. Astra inserts only `.astra-mesReasoningChevron` inside that header, after `.mes_reasoning_header_title` when present, and leaves native `.mes_reasoning_details`, `.mes_reasoning_summary`, and `.mes_reasoning` in place.
- Native controls target: native `.mes_buttons` and `.mes_edit_buttons` move into `.mes_block > .astra-mesNativeControls` while mounted, so SillyTavern selectors that search under `.mes_block` can still find them.
- Metadata target: `.astra-mesHeader__name > .astra-mesMeta > .astra-mesMeta__items`, a single compact inline row where `.astra-mesMeta__item` wrappers hold only native SillyTavern metadata nodes and `.astra-mesMeta__time` holds native `.timestamp` after the visible metadata items. Astra-owned `.astra-mesMeta__separator` nodes render Lucide Dot separators only between visible neighboring metadata/time values, and the row must resync when SillyTavern body display classes hide message id, timer, token count, or timestamps.
- Name text target: native `.name_text` moves into `.astra-mesHeader__name > .astra-mesNameText` while mounted, with a comment placeholder left in its original native location for restoration.
- Hidden native name shell target: native `.ch_name` remains inside `.astra-mesHeader__name` while mounted, but mobile CSS hides it so unused SillyTavern wrapper nodes and native-control placeholders stay out of the visible header.
- Model metadata target: Astra-owned `.astra-mesModel` is a direct `.astra-mesHeader__identityLine` child after `.astra-mesNameText`, with the native `.timestamp-icon` followed by a derived compact model label when SillyTavern provides the icon and model metadata is resolvable.
- Timestamp display target: native `.timestamp` remains inside `.astra-mesMeta__time` while mounted, but Astra compacts its text to a locale-aware time-only label and keeps the resolved full timestamp in `title`.
- Date divider target: Astra-owned `.astra-mesDate` is inserted directly inside `#chat` before the first direct `.mes[mesid]` for each local calendar day.
- Timestamp source priority for compact labels and date dividers: `context.chat[mesid].send_date`, message `timestamp` attribute, original `.timestamp[title]`, then original `.timestamp` text. Use the first parseable source and no-op when none are parseable.
- Missing chat/message/header source nodes must no-op.
- Lifecycle owner: `app/mobile/runtime` mounts this bridge only while the shared layout-mode contract resolves mobile.

## Rules

- Do not edit SillyTavern templates or core files.
- Do not mount this bridge directly from core runtime startup; desktop must keep the native SillyTavern message header DOM untouched.
- Track enough original DOM position and timestamp text/title state to restore `.mesAvatarWrapper`, metadata nodes, `.name_text`, `.ch_name`, `.mes_buttons`, `.mes_edit_buttons`, `.timestamp`, and `.timestamp-icon` on unmount/dispose.
- Keep inserted wrapper nodes Astra-owned and removable.
- Remove all `.astra-mesDate` nodes on unmount/dispose; dividers must never wrap or replace native `.mes` nodes.
- Reconcile date dividers in place during normal sync. Do not remove and recreate unchanged divider nodes, because that churn changes `#chat` layout/scroll metrics and can create visible flicker.
- Do not create or fetch model icons in the live header. `.astra-mesModel` follows SillyTavern's Model Icon setting and `body.no-modelIcons`: when disabled, hide the whole chip; when enabled, move SillyTavern's native `.timestamp-icon` element into `.astra-mesModel` before the compact model label.
- Do not create metadata icons or normalize native metadata text. Preserve native `mesIDDisplay` text, including SillyTavern's leading `#`.
- Mutation observers must be scoped to chat/body, idempotent, and disconnected on unmount/dispose.
- Body class observation is allowed only for display contracts that SillyTavern exposes through body classes such as `no-mesIDDisplay`, `no-timer`, `no-tokenCount`, and `no-timestamps`.
- CSS selectors for this bridge must stay under `body.astra-projecta-mobile-layout`.
- Hide native `.mes_reasoning_actions.flex-container` from mobile CSS with an explanatory comment instead of moving, reparenting, or replacing SillyTavern-owned reasoning edit/copy/collapse controls.
