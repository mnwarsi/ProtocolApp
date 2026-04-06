# Protocol Library Seed Data

`protocol-library.seed.json` is the editable source for the in-app Protocol Library.

Workflow:

1. Add or update peptide records in `protocol-library.seed.json`.
2. Run `pnpm --filter @workspace/scripts run generate-library`.
3. Commit both the seed JSON and the generated file at `artifacts/protocol/src/data/library.generated.ts`.

Notes:

- The frontend should import from `artifacts/protocol/src/data/library.ts`, not from the seed JSON directly.
- This is designed for a future PepPedia-derived sync step. We keep raw content separate from the generated app artifact so the app stays fast and offline-friendly.
- The current `source.status` is `seed` because the refresh pipeline is not yet fetching the full external catalog automatically.
