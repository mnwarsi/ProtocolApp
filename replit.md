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

**Stage 1 MVP — complete.**

A premium local-first dark-mode PWA for high-performance biohackers managing research compound protocols.

### Design
- "Cyber-Medical Stealth" theme: #0a0a0a background, #1a1a1a surfaces, #00f2ff neon cyan accent
- Typography: Inter (UI), JetBrains Mono (numeric readouts)
- Always dark — no light mode. `color-scheme: dark` globally set.

### Architecture
- Pure frontend — no backend (Stages 1–2 are local-only)
- State: Zustand with `persist` middleware → `localStorage` key `protocol-storage`
- Routing: Wouter (single route `/` → ProtocolApp)
- PWA: `manifest.json` + service worker in `public/`

### Key Files
- `src/data/compounds.ts` — 6 compound presets (BPC-157, TB-500, Semaglutide, CJC-1295, Ipamorelin, PT-141)
- `src/lib/mathEngine.ts` — U-100 reconstitution math: `(dose / vialMcg) × waterMl × 100 = units`
- `src/store/protocolStore.ts` — Zustand store with calculator + dose log slices
- `src/components/AppShell.tsx` — header + tab nav (Calculator / Log / Protocol)
- `src/components/CalculatorPanel.tsx` — compound selector, inputs, result card, Log Dose button
- `src/components/SyringeDisplay.tsx` — animated SVG syringe with framer-motion spring fill
- `src/components/DoseLog.tsx` — recent dose history with delete + clear all

### Roadmap
- Stage 2: Web Crypto AES-GCM encryption + active protocol tracking + washout math
- Stage 3: Biofeedback/wearables integration
- Stage 4: Auth, Stripe paywall, cloud sync
