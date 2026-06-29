## Purpose

- Own the mobile chat-switch loading overlay that mounts over Astra's `#astra-chat-session-shell`, falling back to SillyTavern's native `#sheld` chat-session surface.
- Keep chat switching feedback close to the content being replaced instead of presenting it inside the Astra main interface panel.
- Keep the overlay outside `#chat` so SillyTavern message clearing during chat reloads cannot remove the loading affordance.

## SillyTavern Touchpoints

- Target host: `#astra-chat-session-shell`, falling back to `#sheld`.
- Startup baseline: `eventTypes.APP_READY`; fall back to `app_ready` only when the typed event name is unavailable.
- Switch signal: `SillyTavern.getContext().eventSource` with `eventTypes.CHAT_CHANGED`; fall back to `chat_id_changed` only when the typed event name is unavailable.
- Settle target: native `#chat`, read-only `.mes[mesid]` inspection, and Astra-owned message layout/action selectors.
- Missing `#astra-chat-session-shell` and `#sheld` must no-op and return a disposable handle.
- The helper may append and remove only the Astra-owned `.astra-chat-switch-loading-overlay` child and `data-astra-projecta-chat-switch-loading` state attribute.

## Rules

- Do not move, wrap, replace, or mutate SillyTavern-owned message nodes.
- Loading overlay text must be real DOM text, not CSS-generated content.
- Hide must use the documented closing state before removal so CSS can provide a fade-out.
- The mobile coordinator must keep one active overlay session per chat switch, ignore stale cancel/hide requests, and clean up event listeners, timers, animation frames, mutation observers, and resize observers on unmount/dispose.
- Native `CHAT_CHANGED` events before `APP_READY`, or after `APP_READY` for the same active chat signature, are startup hydration/no-op signals and must not show the overlay; Astra-started attempts always bypass this startup guard.
- During an active chat switch, the coordinator may keep `#chat` bottom-aligned by setting `scrollTop` to `scrollHeight`; it must not replace `#chat` or intercept native scroll contracts.
- DOM readiness checks may inspect Astra-owned message header/action selectors, but must not require optional controls such as revision, history, or swipe actions before hiding.
- Cleanup must remove the overlay node and `data-astra-projecta-chat-switch-loading` attribute.
