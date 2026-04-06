# Protocol Library Seed Data

`protocol-library.seed.json` is the editable source for the in-app Protocol Library.

Workflow:

1. Add or update peptide records in `protocol-library.seed.json`.
2. Run `pnpm --filter @workspace/scripts run generate-library`.
3. Commit both the seed JSON and the generated file at `artifacts/protocol/src/data/library.generated.ts`.

PepPedia import workflow:

1. Run `pnpm --filter @workspace/scripts run import-peppedia`.
2. Review `protocol-library.import.json` and `protocol-library.import.report.json`.
3. Run `pnpm --filter @workspace/scripts run diff-library-import`.
4. When ready, run `pnpm --filter @workspace/scripts run merge-library-import`.
5. Regenerate the app artifact with `pnpm --filter @workspace/scripts run generate-library`.

Notes:

- The frontend should import from `artifacts/protocol/src/data/library.ts`, not from the seed JSON directly.
- This is designed for a future PepPedia-derived sync step. We keep raw content separate from the generated app artifact so the app stays fast and offline-friendly.
- The import layer uses `scripts/data/peppedia-import.map.json` for compound links, short-name overrides, function-class overrides, and half-life corrections.
- `source.status` is `seed` for curated app entries and `imported` for raw PepPedia-imported review candidates.
