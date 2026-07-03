## Purpose

- Own the mobile-only AstraProjecta compatibility bridge for the native SillyTavern `#chat` scroll container.
- Keep Astra styling and chat-switch bottom alignment additive while preserving SillyTavern's native scroll contracts.

## Owned Paths / Responsibilities

- `createMobileChatScrollFeature.ts`: lifecycle bridge that marks `#chat` with `mobile-chat-transcript` and `data-astra-projecta-chat-scroll`, tracks native scroll edge state, subscribes to chat load/change and generation-settled events, scrolls the native container to bottom after chat switches, and keeps it pinned to the bottom after generation settles when the user was already at the bottom.
- `chat-scroll.css`: mobile-only native scrollbar styling and opacity-mask edge-fade styling for `#chat[data-astra-projecta-chat-scroll='native']`.

## SillyTavern Touchpoints

- Source and target scroll root: `#chat`.
- `#chat` must remain the real scroll container so SillyTavern commands such as `/chat-jump`, lazy message loading, edit flows, and delete flows keep reading and writing the same `scrollTop`.
- Chat-switch bottom alignment may subscribe to `CHAT_CHANGED` and `CHAT_LOADED` through `SillyTavern.getContext().eventSource`.
- Post-generation bottom alignment may subscribe to `GENERATION_ENDED` and `GENERATION_STOPPED` through the same event source, but must stay conditional: re-pin only when the user was already at (or within a small threshold of) the bottom when the event fired, and never move a scroll position the user set by scrolling up to read earlier messages.
- Missing `#chat`, context, event source, or resize observer must no-op.

## Rules

- Do not wrap, move, replace, or reparent SillyTavern-owned message nodes.
- Do not introduce a Base UI `ScrollArea.Viewport` around `#chat`; Astra only styles the native scrollbar here.
- Clean up event listeners, animation frames, timers, resize observers, Astra scroll data attributes, and the `mobile-chat-transcript` class on unmount/dispose.
- Keep this bridge mobile-gated through `app/mobile/runtime`; desktop behavior must not depend on it.
