import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DoseUnit, FrequencyKey } from "@/data/compounds";
import { calculate, type ReconstitutionResult } from "@/lib/mathEngine";

export interface DoseLogEntry {
  id: string;
  compound: string;
  compoundId: string;
  dose: number;
  doseUnit: DoseUnit;
  units: number;
  concentrationMcgPerUnit: number;
  concentrationMgPerMl: number;
  timestamp: string;
}

interface CalculatorState {
  selectedCompoundId: string;
  vialSizeMg: number;
  waterVolumeMl: number;
  targetDose: number;
  targetDoseUnit: DoseUnit;
  result: ReconstitutionResult | null;
}

interface LogsState {
  entries: DoseLogEntry[];
}

interface CalculatorActions {
  setCompound: (id: string) => void;
  setVialSize: (mg: number) => void;
  setWaterVolume: (ml: number) => void;
  setTargetDose: (dose: number) => void;
  setDoseUnit: (unit: DoseUnit) => void;
  recalculate: () => void;
}

interface LogsActions {
  logDose: (entry: Omit<DoseLogEntry, "id" | "timestamp">) => void;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
}

type ProtocolStore = CalculatorState & LogsState & CalculatorActions & LogsActions;

const DEFAULT_COMPOUND_ID = "bpc-157";

const DEFAULT_CALC: CalculatorState = {
  selectedCompoundId: DEFAULT_COMPOUND_ID,
  vialSizeMg: 5,
  waterVolumeMl: 1,
  targetDose: 250,
  targetDoseUnit: "mcg",
  result: null,
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

export const useProtocolStore = create<ProtocolStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_CALC,
      result: computeResult(DEFAULT_CALC),
      entries: [],

      setCompound: (id) => {
        set({ selectedCompoundId: id });
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
        set({ targetDoseUnit: unit });
        get().recalculate();
      },

      recalculate: () => {
        const state = get();
        const result = computeResult(state);
        set({ result });
      },

      logDose: (entry) => {
        const newEntry: DoseLogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          entries: [newEntry, ...state.entries].slice(0, 100),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }));
      },

      clearAll: () => {
        set({ entries: [] });
      },
    }),
    {
      name: "protocol-storage",
      partialize: (state) => ({
        selectedCompoundId: state.selectedCompoundId,
        vialSizeMg: state.vialSizeMg,
        waterVolumeMl: state.waterVolumeMl,
        targetDose: state.targetDose,
        targetDoseUnit: state.targetDoseUnit,
        entries: state.entries,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.result = computeResult(state);
        }
      },
    }
  )
);
