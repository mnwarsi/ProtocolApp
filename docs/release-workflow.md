# Release Workflow

`main` is the release branch. It should always be safe to launch from.

## Rules for `main`

- `main` must pass `pnpm run typecheck`.
- `main` must pass `pnpm run build`.
- `main` must not expose unfinished user-facing features.
- Any feature that is incomplete must be finished, hidden, or removed from the launch path before merge.

## Current branch map

- `main`
  - launch-ready app behavior
  - library UI and generated library data
  - maintainer tooling only when it does not destabilize the app
- `codex/library-runtime-stabilization`
  - the expanded runtime library that is intended to merge to `main`
- `codex/peppedia-import-pipeline`
  - PepPedia importer and maintainer-only tooling
- `codex/whoop-hardening`
  - wearable persistence, auth safety, and failure handling
- `codex/billing-account-completion`
  - subscription, settings, and account completion work
- `codex/store-type-hardening`
  - isolated state and typing cleanup
- `codex/deploy-config-normalization`
  - env, base path, and deployment cleanup

## Merge checklist

- The branch has one clear purpose.
- `pnpm run typecheck` passes.
- `pnpm run build` passes.
- The feature is complete enough for users.
- The UI does not link to broken or misleading paths.
- Any config or env changes are documented in `.env.example` or repo docs.

## Launch defaults

- Library stays on `main`.
- PepPedia importer code stays off `main` until it is intentionally promoted later.
- Wearables stay off the launch path unless explicitly enabled and hardened.
- Internal maintainer scripts may stay in the repo, but they cannot break the release build.
