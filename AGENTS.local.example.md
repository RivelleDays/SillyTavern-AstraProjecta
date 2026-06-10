# AstraProjecta Local Agent Notes Template

This file is a public-safe template for optional local maintainer notes.
Copy it to `AGENTS.local.md` for machine-specific instructions.

`AGENTS.local.md` is intentionally ignored by git. Do not commit private paths,
private repository references, personal authorization phrases, secrets, or
machine-specific workflow rules.

## Local Paths

- SillyTavern checkout: `<absolute-path-to-sillytavern>`
- AstraProjecta extension checkout: `<absolute-path-to-extension-repository>`
- Other local reference checkouts: `<absolute-path-or-url-if-public>`

## Agent Preferences

- Preferred agent/tooling: `<codex-or-other-agent-details>`
- Preferred working directory: `<repository-root-or-other-local-path>`
- Local verification additions: `<commands-or-notes>`

## Private Reference Repositories

- `<reference-name>`: `<private-local-path-or-private-url>`
- Keep notes here limited to lookup hints. Public architecture rules belong in
  tracked `AGENTS.md` files.

## Personal Git Handoff Rules

- Commit authorization phrases: `<phrases-that-mean-local-commit-is-approved>`
- Merge authorization phrases: `<phrases-that-mean-local-merge-is-approved>`
- Push/PR authorization phrases: `<phrases-that-mean-remote-actions-are-approved>`
- Branch deletion authorization phrases: `<phrases-that-mean-deletion-is-approved>`

## Public Boundary

- Keep public `AGENTS.md` files free of private paths, private reference
  repositories, personal authorization phrases, and machine-specific workflow
  assumptions.
- If a local rule becomes generally useful to contributors, move the public-safe
  version into the relevant tracked `AGENTS.md`.
