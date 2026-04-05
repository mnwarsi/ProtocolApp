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

**Stage 1 + Stage 2 + Stage 3 + Stage 4 (in progress) — Auth/Paywall/Cloud Sync.**

A premium local-first dark-mode PWA for high-performance biohackers managing research compound protocols.

### Design: "Cyber-Medical Stealth"
- Background: #0a0a0a, surfaces: #1a1a1a, accent: #00f2ff neon cyan
- Typography: Inter (UI), JetBrains Mono (numeric readouts)
- Always dark — `color-scheme: dark` globally set
- No shadcn UI — all components hand-built; `src/components/ui/` deleted

### Architecture (Stage 4)
- Frontend: local-first PWA; backend now touched for OAuth + data proxy
- State: Zustand + `persist` → `protocol-storage` key (calculator + lock meta only)
- Sensitive data: `protocol-plain` or `protocol-encrypted` (AES-GCM) in localStorage
- Injection sites stored encrypted in same SensitivePayload as entries/protocols/templates
- Backend: Express API server at `artifacts/api-server`; wearable routes at `/api/wearable/*`
- Routing: Wouter (single route `/` → ProtocolApp)
- PWA: `manifest.json` + service worker in `public/`

### Key Files
- `src/data/compounds.ts` — 6 compound presets; `FrequencyKey`, `DoseUnit` types
- `src/lib/mathEngine.ts` — U-100 reconstitution math + dose timing helpers
- `src/lib/crypto.ts` — Web Crypto AES-256-GCM + PBKDF2 (200k iterations), encrypt/decrypt JSON payloads
- `src/lib/export.ts` — CSV + JSON export of dose log entries
- `src/lib/compoundColor.ts` — deterministic neon palette per compound ID (cyan/amber/violet/green/rose/orange)
- `src/store/protocolStore.ts` — Zustand store: calculator, lock/session, entries, protocols, templates, injectionSites, tier/cloudSync
- `src/pages/ProtocolApp.tsx` — root page; 6 child slots for AppShell (Calculator+Syringe+Log+Protocol+Bio+Settings); shows LockScreen when `isLocked && hasPassphrase`
- `src/components/AppShell.tsx` — header + 5-tab nav (Calculator / Log / Protocol / Bio / Settings); glowing active underline
- `src/components/CalculatorPanel.tsx` — compound selector, inputs (Vial mg, Water mL, Target Dose), result card (Units to Draw, mcg/unit, mg/mL), Log Dose CTA; 2-step flow with symptom check-in
- `src/components/SyringeDisplay.tsx` — hero SVG syringe: liquid fills RIGHT→LEFT from needle end (physically correct); framer-motion spring animation
- `src/components/LogPanel.tsx` — Log tab: composes ProtocolTimeline + DoseCalendar + collapsible History (DoseLog + export); renders symptom tags/notes inline
- `src/components/ProtocolTimeline.tsx` — SVG Gantt chart: one horizontal lane per active protocol, color-coded, with dose tick marks and today-line
- `src/components/DoseCalendar.tsx` — monthly grid calendar with colored dot indicators per compound per day; click-to-expand inline detail
- `src/components/DoseLog.tsx` — dose history with compound filter pills, export; intentional empty state (now rendered inside LogPanel History accordion)
- `src/components/ProtocolPanel.tsx` — protocol manager: next-dose, inventory, washout bar, template CRUD, security panel
- `src/components/BiofeedbackPanel.tsx` — Recharts ComposedChart (HRV/recovery/RHR/sleep); dose ReferenceLine markers; calls `/api/wearable/data`
- `src/components/InjectionSiteMap.tsx` — SVG body map (front/back), named tap zones, recency color-grading
- `src/components/SettingsPanel.tsx` — Clerk auth (sign in/out), tier display, upgrade flow, Whoop OAuth connect/disconnect, connection status, privacy info, demo mode info
- `src/lib/cloudSync.ts` — AES-GCM cloud encryption, upload/download blob, fetchTier API calls
- `src/components/UpgradePrompt.tsx` — inline Pro upgrade CTA component
- `src/components/InstallPrompt.tsx` — PWA install prompt (beforeinstallprompt + iOS guide)
- `src/components/LockScreen.tsx` — passphrase unlock UI + set-new-passphrase (AES-GCM)
- `artifacts/api-server/src/routes/wearable.ts` — Whoop OAuth connect/callback/status/data/disconnect routes

### Wearable Integration (Stage 3)
- Provider: **Whoop** (OAuth 2.0)
- Env vars: `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `APP_BASE_URL`
- Token storage: in-memory server-side (Stage 4 adds DB persistence)
- Without credentials: falls back to demo data (sinusoidal + random HRV/recovery/sleep/RHR)
- OpenAPI spec updated at `lib/api-spec/openapi.yaml`

### Symptom Logging (Stage 3)
- Added to Log Dose flow: tap "Log Dose" → symptom form → tags + free text → "Confirm & Log"
- Tags: `SYMPTOM_TAGS` array in protocolStore (energy↑, sleep+, mood+, etc.)
- Stored in `DoseLogEntry.symptomNote` and `DoseLogEntry.symptomTags`
- Rendered inline in the Log History panel

### Injection Sites (Stage 3)
- 20 named zones: front (delts, pecs, abdomen ×4, quads) + back (traps, triceps, lats, glutes, hamstrings)
- Color: cyan glow <24h, cyan/dim <72h, amber <7d, dim >7d
- Log count shown inside each zone ellipse; hover tooltip shows last-used + count
- Stored encrypted in `injectionSites` array of SensitivePayload

### Data Storage
- **No passphrase**: entries/protocols/templates/injectionSites stored in `protocol-plain` (JSON)
- **With passphrase**: encrypted to `protocol-encrypted` on every mutation; decrypted on unlock
- Calculator + lock metadata persisted in Zustand `protocol-storage` key

### Security
- AES-256-GCM via Web Crypto API, PBKDF2 SHA-256 200k iterations
- Passphrase never stored; key held in-memory as `CryptoKey` for session duration
- Auto-lock timer: configurable (default 15 min), resets on user activity

### formatUnits rule
- `units < 1` → `.toFixed(2)`, `units >= 1` → `.toFixed(1)` — never use Math.round

### Stage 4: Auth, Paywall & Cloud Sync (In Progress)
- Clerk authentication — optional, sign in/out in Settings tab
- Freemium gating: free=1 protocol + no Bio tab; Pro ($19.99/mo) = unlimited + all features
- Cloud sync: AES-GCM encrypted, key = PBKDF2(userId, "protocol-cloud-v1") — zero-knowledge
- Debounced cloud sync (3s) on every mutation when signed in
- Stripe subscriptions via stripe-replit-sync (gracefully disabled if no STRIPE_SECRET_KEY)
- Backend: `/api/subscription/*`, `/api/sync/blob`, Clerk middleware on Express
- DB tables: `users`, `cloud_blobs` (PostgreSQL, Drizzle)
- PWA install prompt: beforeinstallprompt (Android/Chrome) + iOS guide

### Roadmap
- Remaining Stage 4: seed script for Stripe product, export gating for free tier
