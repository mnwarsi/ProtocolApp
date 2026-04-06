# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build all packages (typecheck + build)
pnpm run build

# Run the Protocol PWA frontend (dev server)
pnpm --filter @workspace/protocol run dev

# Run the API server (dev mode: build + start)
pnpm --filter @workspace/api-server run dev

# Regenerate API hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema to PostgreSQL (dev only)
pnpm --filter @workspace/db run push

# Typecheck a single package
pnpm --filter @workspace/protocol run typecheck
```

## Monorepo Structure

pnpm workspace with packages in `artifacts/` and `lib/`:

- `artifacts/protocol/` — React PWA frontend (`@workspace/protocol`)
- `artifacts/api-server/` — Express 5 backend (`@workspace/api-server`)
- `artifacts/mockup-sandbox/` — Design/mockup playground
- `lib/db/` — Drizzle ORM schema + PostgreSQL client (`@workspace/db`)
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`); source of truth for API
- `lib/api-zod/` — Auto-generated Zod schemas from OpenAPI (via Orval)
- `lib/api-client-react/` — Auto-generated React Query hooks from OpenAPI (via Orval)
- `scripts/` — Workspace-level scripts

Shared versions are pinned via `pnpm-workspace.yaml` catalog. Use `catalog:` in package.json instead of hardcoding version numbers.

## Protocol App Architecture

### Frontend (`artifacts/protocol/src/`)

**Local-first PWA** — all data lives in localStorage; backend only needed for auth, paywall, and cloud sync.

- **Routing**: Wouter, single route `/` → `ProtocolApp`
- **State**: Zustand store at `store/protocolStore.ts` with `persist` middleware (key: `protocol-storage`). Sensitive data (entries/protocols/templates/injectionSites) stored separately in `protocol-plain` or `protocol-encrypted` localStorage keys.
- **Encryption**: AES-256-GCM via Web Crypto API, PBKDF2 SHA-256 (200k iterations). Implementation in `lib/crypto.ts`. Passphrase never stored; key held in-memory.
- **Auth**: Clerk (`@clerk/react`) — optional, sign in/out in Settings tab
- **Tier gating**: Free = 1 protocol, no Bio tab; Pro ($19.99/mo) = unlimited + all features

**Tab layout** (AppShell 5 tabs): Calculator / Log / Protocol / Bio / Settings

Key components:
- `pages/ProtocolApp.tsx` — root; shows `LockScreen` when `isLocked && hasPassphrase`
- `components/AppShell.tsx` — header + 5-tab nav
- `components/CalculatorPanel.tsx` — U-100 reconstitution calculator, 2-step flow with symptom check-in
- `components/LogPanel.tsx` — composes `ProtocolTimeline` + `DoseCalendar` + collapsible History
- `components/ProtocolTimeline.tsx` — SVG Gantt chart, one lane per active protocol
- `components/DoseCalendar.tsx` — monthly grid with colored dots per compound per day
- `components/BiofeedbackPanel.tsx` — Recharts ComposedChart with Whoop data + dose reference lines
- `components/InjectionSiteMap.tsx` — SVG body map with 20 named tap zones, recency color-grading
- `components/SettingsPanel.tsx` — Clerk auth, tier, Whoop OAuth, privacy
- `lib/mathEngine.ts` — U-100 reconstitution math + dose timing helpers
- `lib/cloudSync.ts` — AES-GCM cloud sync, upload/download blob, fetchTier

### Backend (`artifacts/api-server/src/`)

Express 5 server with Clerk middleware. Routes:
- `/api/wearable/*` — Whoop OAuth (connect/callback/status/data/disconnect)
- `/api/subscription/*` — Stripe subscription management
- `/api/sync/blob` — Encrypted cloud sync blob storage (Pro only)
- `/healthz` — Health check

**DB tables**: `users`, `cloud_blobs` (PostgreSQL via Drizzle ORM)

**Wearable integration**: Whoop OAuth 2.0. Env vars: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `APP_BASE_URL`. Falls back to demo data (sinusoidal + random) when credentials absent.

### API Contract

`lib/api-spec/openapi.yaml` is the **source of truth**. After editing it, regenerate clients:
```bash
pnpm --filter @workspace/api-spec run codegen
```
Never hand-edit files in `lib/api-zod/` or `lib/api-client-react/` — they are generated.

## Design System

"Cyber-Medical Stealth" — always dark:
- Background: `#0a0a0a`, surfaces: `#1a1a1a`, accent: `#00f2ff` (neon cyan)
- Typography: Inter (UI), JetBrains Mono (numeric readouts)
- `color-scheme: dark` globally set; no light mode
- **No shadcn** — all components hand-built; `src/components/ui/` deleted
- Compound colors: deterministic neon palette per compound ID (cyan/amber/violet/green/rose/orange) via `lib/compoundColor.ts`

## Key Rules

- **`formatUnits`**: `units < 1` → `.toFixed(2)`, `units >= 1` → `.toFixed(1)` — never use `Math.round`
- **Encrypted storage**: any mutation to entries/protocols/templates/injectionSites must re-encrypt the full `SensitivePayload` if a passphrase is set
- **Supply-chain safety**: `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` — do not disable or work around this
