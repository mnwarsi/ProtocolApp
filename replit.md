# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Protocol App (`artifacts/protocol`)

**Stage 1 + Stage 2 — complete.**

A premium local-first dark-mode PWA for high-performance biohackers managing research compound protocols.

### Design: "Cyber-Medical Stealth"
- Background: #0a0a0a, surfaces: #1a1a1a, accent: #00f2ff neon cyan
- Typography: Inter (UI), JetBrains Mono (numeric readouts)
- Always dark — `color-scheme: dark` globally set
- Glow language: controlled neon on active nav, result card, CTA, syringe liquid
- No shadcn UI — all components hand-built; `src/components/ui/` deleted

### Architecture
- Pure frontend — no backend (Stages 1–2 are local-only)
- State: Zustand + `persist` → `protocol-storage` key (calculator + lock meta only)
- Sensitive data: `protocol-plain` (unencrypted) or `protocol-encrypted` (AES-GCM blob) in localStorage
- Routing: Wouter (single route `/` → ProtocolApp)
- PWA: `manifest.json` + service worker in `public/`

### Key Files
- `src/data/compounds.ts` — 6 compound presets; `FrequencyKey`, `DoseUnit` types
- `src/lib/mathEngine.ts` — U-100 reconstitution: `(doseMcg / vialMcg) × waterMl × 100 = units`
- `src/lib/crypto.ts` — Web Crypto AES-256-GCM + PBKDF2 (200k iterations), encrypt/decrypt JSON payloads
- `src/lib/export.ts` — CSV + JSON export of dose log entries
- `src/store/protocolStore.ts` — Zustand store: calculator, lock/session, entries, protocols, templates
- `src/pages/ProtocolApp.tsx` — root page; shows LockScreen when `isLocked && hasPassphrase`
- `src/components/AppShell.tsx` — header + 3-tab nav (Calculator / Log / Protocol); glowing active underline
- `src/components/CalculatorPanel.tsx` — compound selector, inputs (Vial mg, Water mL, Target Dose), result card (Units to Draw, mcg/unit, mg/mL), Log Dose CTA
- `src/components/SyringeDisplay.tsx` — hero SVG syringe: liquid fills RIGHT→LEFT from needle end (physically correct); framer-motion spring animation
- `src/components/DoseLog.tsx` — dose history with compound filter pills, export; intentional empty state
- `src/components/ProtocolPanel.tsx` — Stage 2: active protocols (next dose timer, washout, shots/vial), add form, templates (save/load), CSV/JSON export, security panel
- `src/components/LockScreen.tsx` — Stage 2: passphrase unlock + set-new-passphrase UI (AES-GCM)

### Data Storage (Stage 2)
- **No passphrase**: entries/protocols/templates stored in `protocol-plain` (JSON in localStorage)
- **With passphrase**: encrypted to `protocol-encrypted` on every mutation; decrypted on unlock
- Calculator inputs + lock metadata (hasPassphrase, saltBase64, autoLockMinutes) stay in the regular Zustand persist key
- Migration: on first load, looks for old Stage-1 `protocol-storage` entries and migrates to new plain storage

### Security (Stage 2)
- AES-256-GCM via Web Crypto API, 12-byte random IV prepended to each blob
- PBKDF2, SHA-256, 200k iterations, 16-byte random salt stored as base64 in Zustand persist
- Passphrase never stored anywhere; key is held in-memory as `CryptoKey` for session duration
- Auto-lock timer: configurable (default 15 min), resets on user activity

### formatUnits rule
- `units < 1` → `.toFixed(2)`, `units >= 1` → `.toFixed(1)` — never use Math.round

### Roadmap
- Stage 3: Biofeedback/wearables integration (HRV, CGM)
- Stage 4: Auth, Stripe paywall, cloud sync
