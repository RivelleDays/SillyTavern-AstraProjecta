## Purpose

- Own reusable SillyTavern character and group avatar resolution for AstraProjecta state adapters.
- Keep group custom-avatar detection, member thumbnail selection, and thumbnail URL normalization centralized under `packages/core/st`.

## Rules

- Return serializable data only; do not return SillyTavern DOM or jQuery nodes from this folder.
- Prefer SillyTavern `getThumbnailUrl()` when available, with deterministic `/thumbnail` fallback URLs.
- Keep feature-specific avatar markup and CSS outside this folder.
- Preserve caller-owned policy choices, such as whether disabled group members are excluded for current-chat display.
