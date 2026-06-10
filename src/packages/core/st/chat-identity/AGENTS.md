## Purpose

- Own the reusable snapshot/store contract for the current chat's character or group identity.
- Keep chat filename fallback rules centralized here, while consuming shared character/group avatar resolution from `packages/core/st/chat-avatar`.

## Responsibilities

- Resolve the active chat file name from public SillyTavern context fields.
- Resolve the active character/group name and avatar snapshot for feature consumption.
- Prefer a custom group avatar when present, otherwise expose member-thumbnail collage URLs from the shared chat-avatar resolver.
- Expose serializable snapshots and event-driven stores that feature code can consume without local `getContext()` reads.

## Rules

- Do not move current-chat identity fallback logic into feature, runtime, or UI wrapper folders.
- Do not let feature code read `group.avatar_url`, `members`, or `chat_id` directly for current-chat display work.
- Keep group avatar member selection out of feature code; consumers should only see the snapshot/store contract.
- Stay on public extension surfaces: `SillyTavern.getContext()`, public event bus, and `getThumbnailUrl()`.
