import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DoseUnit, FrequencyKey } from "@/data/compounds";
import { getCompoundById } from "@/data/compounds";
import { calculate, type ReconstitutionResult } from "@/lib/mathEngine";
import {
  deriveKey,
  generateSalt,
  saltToBase64,
  base64ToSalt,
  encryptPayload,
  decryptPayload,
} from "@/lib/crypto";
import {
  encryptForCloud,
  decryptFromCloud,
  uploadBlob,
  downloadBlob,
  fetchTier,
} from "@/lib/cloudSync";

// ─── Data types ───────────────────────────────────────────────────────────────

export const SYMPTOM_TAGS = [
  "energy↑", "energy↓", "sleep+", "sleep−", "mood+", "mood−",
  "focus+", "fatigue", "soreness", "nausea", "side-effect",
] as const;
export type SymptomTag = (typeof SYMPTOM_TAGS)[number];

export interface DoseLogEntry {
  id: string;
  compound: string;
  compoundId: string;
  inventoryVialId?: string;
  dose: number;
  doseUnit: DoseUnit;
  units: number;
  concentrationMcgPerUnit: number;
  concentrationMgPerMl: number;
  timestamp: string;
  symptomNote?: string;
  symptomTags?: SymptomTag[];
}

export interface ActiveProtocol {
  id: string;
  compoundId: string;
  compound: string;
  dose: number;
  doseUnit: DoseUnit;
  frequency: FrequencyKey;
  customIntervalHours?: number;
  startDate: string;
  endDate?: string;
  vialAmount: number;
  waterAmount: number;
  notes?: string;
  active: boolean;
}

export interface SavedTemplate {
  id: string;
  name: string;
  protocols: Omit<ActiveProtocol, "id" | "startDate" | "endDate" | "active">[];
  createdAt: string;
}

// ─── Injection sites ──────────────────────────────────────────────────────────

export interface InjectionSiteEntry {
  id: string;
  siteId: string;
  timestamp: string;
}

export type InventoryVialStatus = "active" | "finished" | "expired" | "archived";

export interface InventoryVial {
  id: string;
  compoundId: string;
  label: string;
  vialAmountMg: number;
  diluentMl: number;
  concentrationMgPerMl: number;
  concentrationMcgPerUnit: number;
  defaultDose: number;
  defaultDoseUnit: DoseUnit;
  reconstitutedAt: string;
  openedAt: string;
  estimatedRemainingMg: number;
  estimatedRemainingUnits: number;
  status: InventoryVialStatus;
  notes?: string;
}

export type UnitSystem = "metric" | "imperial";
export type GoalFocus = "general" | "fat-loss" | "recovery" | "performance" | "longevity";

export interface UserProfile {
  weight: number | null;
  unitSystem: UnitSystem;
  goalFocus: GoalFocus;
  medicalConditions: string[];
  medications: string[];
  sensitivities: string[];
}

// ─── Sensitive payload (encrypted or plain) ───────────────────────────────────

interface SensitivePayload {
  entries: DoseLogEntry[];
  protocols: ActiveProtocol[];
  templates: SavedTemplate[];
  injectionSites?: InjectionSiteEntry[];
  inventoryVials?: InventoryVial[];
  profile?: UserProfile;
  syncedAt?: string;
}

const PLAIN_STORAGE_KEY = "protocol-plain";
const ENCRYPTED_STORAGE_KEY = "protocol-encrypted";

// ─── Store slices ─────────────────────────────────────────────────────────────

interface CalculatorState {
  selectedCompoundId: string;
  vialSizeMg: number;
  waterVolumeMl: number;
  targetDose: number;
  targetDoseUnit: DoseUnit;
  result: ReconstitutionResult | null;
}

interface LockMeta {
  hasPassphrase: boolean;
  saltBase64: string | null;
  autoLockMinutes: number;
}

interface RuntimeState {
  isLocked: boolean;
  sessionKey: CryptoKey | null;
  lockError: string | null;
  entries: DoseLogEntry[];
  protocols: ActiveProtocol[];
  templates: SavedTemplate[];
  injectionSites: InjectionSiteEntry[];
  inventoryVials: InventoryVial[];
  profile: UserProfile;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface CalculatorActions {
  setCompound: (id: string) => void;
  setVialSize: (mg: number) => void;
  setWaterVolume: (ml: number) => void;
  setTargetDose: (dose: number) => void;
  setDoseUnit: (unit: DoseUnit) => void;
  recalculate: () => void;
}

interface LockActions {
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  setPassphrase: (passphrase: string) => Promise<void>;
  removePassphrase: (passphrase: string) => Promise<void>;
  setAutoLockMinutes: (minutes: number) => void;
  resetAutoLock: () => void;
}

interface LogsActions {
  logDose: (entry: Omit<DoseLogEntry, "id" | "timestamp">) => void;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
}

interface ProtocolActions {
  addProtocol: (p: Omit<ActiveProtocol, "id">) => void;
  updateProtocol: (id: string, updates: Partial<ActiveProtocol>) => void;
  removeProtocol: (id: string) => void;
  toggleProtocol: (id: string) => void;
}

interface TemplateActions {
  saveTemplate: (name: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;
  duplicateTemplate: (id: string) => void;
}

interface InjectionSiteActions {
  logInjectionSite: (siteId: string) => void;
  clearInjectionSite: (siteId: string) => void;
}

interface InventoryActions {
  addInventoryVial: (
    vial: Omit<
      InventoryVial,
      | "id"
      | "openedAt"
      | "reconstitutedAt"
      | "estimatedRemainingMg"
      | "estimatedRemainingUnits"
      | "status"
      | "label"
    > & { label?: string; notes?: string }
  ) => string;
  updateInventoryVial: (id: string, updates: Partial<InventoryVial>) => void;
  archiveInventoryVial: (id: string) => void;
}

interface ProfileActions {
  setUnitSystem: (unitSystem: UnitSystem) => void;
  setWeight: (weight: number | null) => void;
  setGoalFocus: (goalFocus: GoalFocus) => void;
  setMedicalConditions: (medicalConditions: string[]) => void;
  setMedications: (medications: string[]) => void;
  setSensitivities: (sensitivities: string[]) => void;
}

interface TierState {
  tier: "free" | "pro";
  cloudSyncing: boolean;
  signedInUserId: string | null;
  lastCloudSyncAt: string | null;
}

interface TierActions {
  setTier: (tier: "free" | "pro") => void;
  setSignedInUserId: (userId: string | null) => void;
  refreshTier: () => Promise<void>;
  syncToCloud: (userId: string) => Promise<void>;
  syncFromCloud: (userId: string) => Promise<boolean>;
}

type ProtocolStore = CalculatorState &
  LockMeta &
  RuntimeState &
  TierState &
  CalculatorActions &
  LockActions &
  LogsActions &
  ProtocolActions &
  TemplateActions &
  InjectionSiteActions &
  InventoryActions &
  ProfileActions &
  TierActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_COMPOUND_ID = "bpc-157";

const DEFAULT_CALC: CalculatorState = {
  selectedCompoundId: DEFAULT_COMPOUND_ID,
  vialSizeMg: 5,
  waterVolumeMl: 1,
  targetDose: 250,
  targetDoseUnit: "mcg",
  result: null,
};

const DEFAULT_PROFILE: UserProfile = {
  weight: null,
  unitSystem: "metric",
  goalFocus: "general",
  medicalConditions: [],
  medications: [],
  sensitivities: [],
};

function computeResult(state: CalculatorState): ReconstitutionResult | null {
  if (!state.vialSizeMg || !state.waterVolumeMl || !state.targetDose) return null;
  return calculate({
    vialSizeMg: state.vialSizeMg,
    waterVolumeMl: state.waterVolumeMl,
    targetDose: state.targetDose,
    targetDoseUnit: state.targetDoseUnit,
  });
}

function loadPlainPayload(): SensitivePayload | null {
  try {
    const raw = localStorage.getItem(PLAIN_STORAGE_KEY);
    if (!raw) {
      // Migrate from Stage 1 format (entries were in Zustand persist)
      const old = localStorage.getItem("protocol-storage");
      if (old) {
        const parsed = JSON.parse(old);
        if (parsed?.state?.entries) {
          return { entries: parsed.state.entries, protocols: [], templates: [] };
        }
      }
      return null;
    }
    return JSON.parse(raw) as SensitivePayload;
  } catch {
    return null;
  }
}

function savePlainPayload(payload: SensitivePayload): void {
  try {
    localStorage.setItem(PLAIN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable
  }
}

function normalizeDoseToMg(dose: number, doseUnit: DoseUnit): number {
  return doseUnit === "mg" ? dose : dose / 1000;
}

function createInventoryLabel(compoundId: string, reconstitutedAt: string): string {
  const compound = getCompoundById(compoundId);
  const shortDate = new Date(reconstitutedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${compound?.shortName ?? "Vial"} · ${shortDate}`;
}

export function getInventoryRemaining(vial: InventoryVial, entries: DoseLogEntry[]) {
  const usedMg = entries
    .filter((entry) => entry.inventoryVialId === vial.id)
    .reduce((sum, entry) => sum + normalizeDoseToMg(entry.dose, entry.doseUnit), 0);

  const estimatedRemainingMg = Math.max(0, vial.vialAmountMg - usedMg);
  const estimatedRemainingUnits = Math.max(
    0,
    (estimatedRemainingMg * 1000) / vial.concentrationMcgPerUnit
  );

  return {
    estimatedRemainingMg,
    estimatedRemainingUnits,
  };
}

export function getDerivedInventoryStatus(vial: InventoryVial, entries: DoseLogEntry[]): InventoryVialStatus {
  if (vial.status === "archived") return "archived";

  const remaining = getInventoryRemaining(vial, entries);
  const ageMs = Date.now() - new Date(vial.reconstitutedAt).getTime();
  const ageDays = ageMs / 86400_000;

  if (remaining.estimatedRemainingMg <= 0.001 || remaining.estimatedRemainingUnits <= 0.1) {
    return "finished";
  }
  if (ageDays >= 30) {
    return "expired";
  }
  return "active";
}

export function hydrateInventoryVial(vial: InventoryVial, entries: DoseLogEntry[]): InventoryVial {
  const remaining = getInventoryRemaining(vial, entries);
  return {
    ...vial,
    ...remaining,
    status: getDerivedInventoryStatus(vial, entries),
  };
}

export function getActiveVialsForCompound(
  inventoryVials: InventoryVial[],
  entries: DoseLogEntry[],
  compoundId: string
): InventoryVial[] {
  return inventoryVials
    .filter((vial) => vial.compoundId === compoundId)
    .map((vial) => hydrateInventoryVial(vial, entries))
    .filter((vial) => vial.status === "active")
    .sort((a, b) => new Date(b.reconstitutedAt).getTime() - new Date(a.reconstitutedAt).getTime());
}

export function getRecommendedVialForCompound(
  inventoryVials: InventoryVial[],
  entries: DoseLogEntry[],
  compoundId: string
): InventoryVial | null {
  return getActiveVialsForCompound(inventoryVials, entries, compoundId)[0] ?? null;
}

export function getLastLoggedForCompound(entries: DoseLogEntry[], compoundId: string): DoseLogEntry | null {
  return entries.find((entry) => entry.compoundId === compoundId) ?? null;
}

export function getTypicalDoseForCompound(entries: DoseLogEntry[], compoundId: string): number | null {
  const compoundEntries = entries.filter((entry) => entry.compoundId === compoundId).slice(0, 5);
  if (compoundEntries.length === 0) return null;
  return compoundEntries.reduce((sum, entry) => sum + entry.dose, 0) / compoundEntries.length;
}

// Auto-lock timer
let autoLockTimer: ReturnType<typeof setTimeout> | null = null;

function clearAutoLockTimer() {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProtocolStore = create<ProtocolStore>()(
  persist(
    (set, get) => {
      // Helper: persist sensitive data after each mutation
      const syncSensitive = (): void => {
        const { entries, protocols, templates, injectionSites, inventoryVials, profile, hasPassphrase, sessionKey } = get();
        const payload: SensitivePayload = { entries, protocols, templates, injectionSites, inventoryVials, profile };
        if (hasPassphrase && sessionKey) {
          encryptPayload(sessionKey, payload)
            .then((encrypted) => {
              try {
                localStorage.setItem(ENCRYPTED_STORAGE_KEY, encrypted);
              } catch {
                // Storage unavailable — cannot persist, but do NOT fall back to plaintext
                // when a passphrase is set; silently fail to avoid leaking data
              }
            })
            .catch(() => {
              // Encryption failure — do NOT fall back to plaintext when passphrase is enabled
            });
        } else {
          savePlainPayload(payload);
        }
      };

      // Helper: start auto-lock countdown
      const startAutoLock = (): void => {
        clearAutoLockTimer();
        const minutes = get().autoLockMinutes;
        if (!get().hasPassphrase || minutes <= 0) return;
        autoLockTimer = setTimeout(() => {
          get().lock();
        }, minutes * 60 * 1000);
      };

      return {
        // ── Calculator state ──
        ...DEFAULT_CALC,
        result: computeResult(DEFAULT_CALC),

        // ── Lock meta (persisted) ──
        hasPassphrase: false,
        saltBase64: null,
        autoLockMinutes: 15,

        // ── Runtime state (NOT persisted) ──
        isLocked: false,
        sessionKey: null,
        lockError: null,
        entries: [],
        protocols: [],
        templates: [],
        injectionSites: [],
        inventoryVials: [],
        profile: DEFAULT_PROFILE,

        // ── Tier + cloud sync ──
        tier: "free",
        cloudSyncing: false,
        signedInUserId: null,
        lastCloudSyncAt: null,

        // ── Calculator actions ──
        setCompound: (id) => {
          const compound = getCompoundById(id);
          if (compound) {
            set({
              selectedCompoundId: id,
              vialSizeMg: compound.defaultVialSizeMg,
              waterVolumeMl: compound.defaultWaterVolumeMl,
              targetDose: compound.defaultDose,
              targetDoseUnit: compound.defaultDoseUnit,
            });
          } else {
            set({ selectedCompoundId: id });
          }
          get().recalculate();
        },

        setVialSize: (mg) => {
          set({ vialSizeMg: mg });
          get().recalculate();
        },

        setWaterVolume: (ml) => {
          set({ waterVolumeMl: ml });
          get().recalculate();
        },

        setTargetDose: (dose) => {
          set({ targetDose: dose });
          get().recalculate();
        },

        setDoseUnit: (unit) => {
          const { targetDose, targetDoseUnit } = get();
          let converted = targetDose;
          if (unit !== targetDoseUnit) {
            converted = unit === "mg" ? targetDose / 1000 : targetDose * 1000;
          }
          set({ targetDoseUnit: unit, targetDose: converted });
          get().recalculate();
        },

        recalculate: () => {
          set({ result: computeResult(get()) });
        },

        // ── Lock actions ──
        unlock: async (passphrase) => {
          const { saltBase64, hasPassphrase } = get();
          if (!hasPassphrase || !saltBase64) {
            set({ isLocked: false, lockError: null });
            return;
          }
          try {
            const salt = base64ToSalt(saltBase64);
            const key = await deriveKey(passphrase, salt);
            const encryptedRaw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
            let payload: SensitivePayload = { entries: [], protocols: [], templates: [], profile: DEFAULT_PROFILE };
            if (encryptedRaw) {
              payload = (await decryptPayload(key, encryptedRaw)) as SensitivePayload;
            }
            set({
              sessionKey: key,
              isLocked: false,
              lockError: null,
              entries: payload.entries ?? [],
              protocols: payload.protocols ?? [],
              templates: payload.templates ?? [],
              injectionSites: payload.injectionSites ?? [],
              inventoryVials: (payload.inventoryVials ?? []).map((vial) =>
                hydrateInventoryVial(vial, payload.entries ?? [])
              ),
              profile: payload.profile ?? DEFAULT_PROFILE,
            });
            startAutoLock();
          } catch {
            set({ lockError: "Incorrect passphrase. Try again." });
          }
        },

        lock: () => {
          clearAutoLockTimer();
          set({
            isLocked: true,
            sessionKey: null,
            lockError: null,
            entries: [],
            protocols: [],
            templates: [],
            injectionSites: [],
            inventoryVials: [],
          });
        },

        setPassphrase: async (passphrase) => {
          const { entries, protocols, templates, injectionSites, inventoryVials, profile } = get();
          const salt = await generateSalt();
          const saltB64 = saltToBase64(salt);
          const key = await deriveKey(passphrase, salt);
          const payload: SensitivePayload = { entries, protocols, templates, injectionSites, inventoryVials, profile };
          const encrypted = await encryptPayload(key, payload);
          localStorage.setItem(ENCRYPTED_STORAGE_KEY, encrypted);
          localStorage.removeItem(PLAIN_STORAGE_KEY);
          set({ hasPassphrase: true, saltBase64: saltB64, sessionKey: key, isLocked: false });
          startAutoLock();
        },

        removePassphrase: async (passphrase) => {
          const { saltBase64 } = get();
          if (!saltBase64) throw new Error("No passphrase set");
          // Verify passphrase by deriving the key and actually decrypting the stored blob
          // (merely deriving a key does not validate the passphrase)
          const salt = base64ToSalt(saltBase64);
          const key = await deriveKey(passphrase, salt);
          const encryptedRaw = localStorage.getItem(ENCRYPTED_STORAGE_KEY);
          if (encryptedRaw) {
            // This throws DOMException if the key is wrong — correct passphrase validation
            await decryptPayload(key, encryptedRaw);
          }
          // Passphrase verified — save current in-memory data as plaintext
          const { entries, protocols, templates, injectionSites, inventoryVials, profile } = get();
          savePlainPayload({ entries, protocols, templates, injectionSites, inventoryVials, profile });
          localStorage.removeItem(ENCRYPTED_STORAGE_KEY);
          clearAutoLockTimer();
          set({ hasPassphrase: false, saltBase64: null, sessionKey: null, isLocked: false });
        },

        setAutoLockMinutes: (minutes) => {
          set({ autoLockMinutes: minutes });
          if (get().sessionKey) startAutoLock();
        },

        resetAutoLock: () => {
          if (get().sessionKey) startAutoLock();
        },

        // ── Log actions ──
        logDose: (entry) => {
          const newEntry: DoseLogEntry = {
            ...entry,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          };
          set((state) => ({
            entries: [newEntry, ...state.entries].slice(0, 200),
            inventoryVials: state.inventoryVials.map((vial) =>
              vial.id === newEntry.inventoryVialId
                ? hydrateInventoryVial(vial, [newEntry, ...state.entries])
                : vial
            ),
          }));
          syncSensitive();
        },

        deleteEntry: (id) => {
          set((state) => {
            const nextEntries = state.entries.filter((e) => e.id !== id);
            return {
              entries: nextEntries,
              inventoryVials: state.inventoryVials.map((vial) => hydrateInventoryVial(vial, nextEntries)),
            };
          });
          syncSensitive();
        },

        clearAll: () => {
          set((state) => ({
            entries: [],
            inventoryVials: state.inventoryVials.map((vial) => hydrateInventoryVial(vial, [])),
          }));
          syncSensitive();
        },

        // ── Protocol actions ──
        addProtocol: (p) => {
          const newProto: ActiveProtocol = { ...p, id: crypto.randomUUID() };
          set((state) => ({ protocols: [...state.protocols, newProto] }));
          syncSensitive();
        },

        updateProtocol: (id, updates) => {
          set((state) => ({
            protocols: state.protocols.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          }));
          syncSensitive();
        },

        removeProtocol: (id) => {
          set((state) => ({ protocols: state.protocols.filter((p) => p.id !== id) }));
          syncSensitive();
        },

        toggleProtocol: (id) => {
          set((state) => ({
            protocols: state.protocols.map((p) =>
              p.id === id ? { ...p, active: !p.active } : p
            ),
          }));
          syncSensitive();
        },

        // ── Template actions ──
        saveTemplate: (name) => {
          const { protocols } = get();
          const template: SavedTemplate = {
            id: crypto.randomUUID(),
            name,
            protocols: protocols.map(({ id: _id, startDate: _sd, endDate: _ed, active: _a, ...rest }) => rest),
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ templates: [...state.templates, template] }));
          syncSensitive();
        },

        loadTemplate: (templateId) => {
          const template = get().templates.find((t) => t.id === templateId);
          if (!template) return;
          const newProtocols: ActiveProtocol[] = template.protocols.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            startDate: new Date().toISOString(),
            active: true,
          }));
          set({ protocols: newProtocols });
          syncSensitive();
        },

        deleteTemplate: (id) => {
          set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
          syncSensitive();
        },

        renameTemplate: (id, name) => {
          set((state) => ({
            templates: state.templates.map((t) => (t.id === id ? { ...t, name } : t)),
          }));
          syncSensitive();
        },

        duplicateTemplate: (id) => {
          const template = get().templates.find((t) => t.id === id);
          if (!template) return;
          const copy: SavedTemplate = {
            ...template,
            id: crypto.randomUUID(),
            name: `${template.name} (copy)`,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ templates: [...state.templates, copy] }));
          syncSensitive();
        },

        // ── Injection site actions ──
        logInjectionSite: (siteId) => {
          const entry: InjectionSiteEntry = {
            id: crypto.randomUUID(),
            siteId,
            timestamp: new Date().toISOString(),
          };
          set((state) => ({
            injectionSites: [entry, ...state.injectionSites].slice(0, 500),
          }));
          syncSensitive();
        },

        clearInjectionSite: (siteId) => {
          set((state) => ({
            injectionSites: state.injectionSites.filter((s) => s.siteId !== siteId),
          }));
          syncSensitive();
        },

        // ── Inventory actions ──
        addInventoryVial: (vial) => {
          const compound = getCompoundById(vial.compoundId);
          const now = new Date().toISOString();
          const nextVial: InventoryVial = {
            id: crypto.randomUUID(),
            compoundId: vial.compoundId,
            label: vial.label?.trim() || createInventoryLabel(vial.compoundId, now),
            vialAmountMg: vial.vialAmountMg,
            diluentMl: vial.diluentMl,
            concentrationMgPerMl: vial.concentrationMgPerMl,
            concentrationMcgPerUnit: vial.concentrationMcgPerUnit,
            defaultDose: vial.defaultDose,
            defaultDoseUnit: vial.defaultDoseUnit,
            reconstitutedAt: now,
            openedAt: now,
            estimatedRemainingMg: vial.vialAmountMg,
            estimatedRemainingUnits: (vial.vialAmountMg * 1000) / vial.concentrationMcgPerUnit,
            status: "active",
            notes: vial.notes?.trim() || compound?.notes,
          };
          set((state) => ({
            inventoryVials: [nextVial, ...state.inventoryVials],
          }));
          syncSensitive();
          return nextVial.id;
        },

        updateInventoryVial: (id, updates) => {
          set((state) => ({
            inventoryVials: state.inventoryVials.map((vial) => {
              if (vial.id !== id) return vial;
              return hydrateInventoryVial({ ...vial, ...updates }, state.entries);
            }),
          }));
          syncSensitive();
        },

        archiveInventoryVial: (id) => {
          set((state) => ({
            inventoryVials: state.inventoryVials.map((vial) =>
              vial.id === id ? { ...vial, status: "archived" } : vial
            ),
          }));
          syncSensitive();
        },

        // ── Profile actions ──
        setUnitSystem: (unitSystem) => {
          set((state) => ({ profile: { ...state.profile, unitSystem } }));
          syncSensitive();
        },

        setWeight: (weight) => {
          set((state) => ({ profile: { ...state.profile, weight } }));
          syncSensitive();
        },

        setGoalFocus: (goalFocus) => {
          set((state) => ({ profile: { ...state.profile, goalFocus } }));
          syncSensitive();
        },

        setMedicalConditions: (medicalConditions) => {
          set((state) => ({ profile: { ...state.profile, medicalConditions } }));
          syncSensitive();
        },

        setMedications: (medications) => {
          set((state) => ({ profile: { ...state.profile, medications } }));
          syncSensitive();
        },

        setSensitivities: (sensitivities) => {
          set((state) => ({ profile: { ...state.profile, sensitivities } }));
          syncSensitive();
        },

        // ── Tier + cloud sync actions ──
        setTier: (tier) => set({ tier }),
        setSignedInUserId: (userId) => set({ signedInUserId: userId }),

        refreshTier: async () => {
          const tier = await fetchTier();
          set({ tier });
        },

        syncToCloud: async (userId) => {
          if (get().tier !== "pro") return;
          const state = get();
          set({ cloudSyncing: true });
          try {
            const syncedAt = new Date().toISOString();
            const payload: SensitivePayload = {
              entries: state.entries,
              protocols: state.protocols,
              templates: state.templates,
              injectionSites: state.injectionSites,
              inventoryVials: state.inventoryVials,
              profile: state.profile,
              syncedAt,
            };
            const blob = await encryptForCloud(userId, payload);
            const result = await uploadBlob(blob);
            if (result.ok) {
              set({ lastCloudSyncAt: result.updatedAt ?? syncedAt });
            }
          } catch {
            // Sync failure is non-fatal
          } finally {
            set({ cloudSyncing: false });
          }
        },

        syncFromCloud: async (userId) => {
          if (get().tier !== "pro") return false;
          set({ cloudSyncing: true });
          try {
            const remote = await downloadBlob();
            if (!remote) return false;

            const payload = await decryptFromCloud<SensitivePayload>(userId, remote.blob);
            if (!payload?.entries) return false;

            // Last-write-wins: compare cloud syncedAt vs local lastCloudSyncAt.
            // If cloud is newer (or we have no local sync record), apply cloud data.
            const localSyncedAt = get().lastCloudSyncAt;
            const cloudSyncedAt = payload.syncedAt ?? remote.updatedAt;
            const cloudIsNewer = !localSyncedAt || new Date(cloudSyncedAt) > new Date(localSyncedAt);

            if (!cloudIsNewer) return false;

            set({
              entries: payload.entries ?? [],
              protocols: payload.protocols ?? [],
              templates: payload.templates ?? [],
              injectionSites: payload.injectionSites ?? [],
              inventoryVials: (payload.inventoryVials ?? []).map((vial) =>
                hydrateInventoryVial(vial, payload.entries ?? [])
              ),
              profile: payload.profile ?? DEFAULT_PROFILE,
              lastCloudSyncAt: cloudSyncedAt,
            });
            return true;
          } catch {
            return false;
          } finally {
            set({ cloudSyncing: false });
          }
        },
      };
    },
    {
      name: "protocol-storage",
      partialize: (state) => ({
        selectedCompoundId: state.selectedCompoundId,
        vialSizeMg: state.vialSizeMg,
        waterVolumeMl: state.waterVolumeMl,
        targetDose: state.targetDose,
        targetDoseUnit: state.targetDoseUnit,
        hasPassphrase: state.hasPassphrase,
        saltBase64: state.saltBase64,
        autoLockMinutes: state.autoLockMinutes,
      }),
    }
  )
);

// ── Bootstrap: load data and compute result after store creation ──────────────
const bootstrapStore = () => {
  const { hasPassphrase } = useProtocolStore.getState();

  if (!hasPassphrase) {
    // No passphrase — load plain payload immediately
    const payload = loadPlainPayload();
    if (payload) {
      useProtocolStore.setState({
        entries: payload.entries ?? [],
        protocols: payload.protocols ?? [],
        templates: payload.templates ?? [],
        injectionSites: payload.injectionSites ?? [],
        inventoryVials: (payload.inventoryVials ?? []).map((vial) =>
          hydrateInventoryVial(vial, payload.entries ?? [])
        ),
        profile: payload.profile ?? DEFAULT_PROFILE,
        isLocked: false,
      });
    }
  } else {
    // Has passphrase — start locked
    useProtocolStore.setState({ isLocked: true });
  }

  // Always recompute result from hydrated inputs
  useProtocolStore.setState({
    result: computeResult(useProtocolStore.getState()),
  });

  // Wire user activity to reset the auto-lock timer
  const handleActivity = () => {
    const state = useProtocolStore.getState();
    if (state.sessionKey && state.hasPassphrase && !state.isLocked) {
      state.resetAutoLock();
    }
  };
  const activityEvents: string[] = ["click", "keydown", "touchstart", "mousemove"];
  activityEvents.forEach((event) => {
    document.addEventListener(event, handleActivity, { passive: true });
  });
};

bootstrapStore();
