export type DoseUnit = "mcg" | "mg";
export type FrequencyKey =
  | "daily"
  | "twice_daily"
  | "eod"
  | "weekly"
  | "custom";

export interface FrequencyOption {
  key: FrequencyKey;
  label: string;
  intervalHours: number;
}

export interface Compound {
  id: string;
  name: string;
  shortName: string;
  commonVialSizes: number[];
  commonWaterVolumes: number[];
  halfLifeHours: number;
  defaultDose: number;
  defaultDoseUnit: DoseUnit;
  commonFrequencies: FrequencyKey[];
  notes: string;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { key: "daily", label: "Daily", intervalHours: 24 },
  { key: "twice_daily", label: "Twice Daily", intervalHours: 12 },
  { key: "eod", label: "Every Other Day", intervalHours: 48 },
  { key: "weekly", label: "Weekly", intervalHours: 168 },
  { key: "custom", label: "Custom", intervalHours: 24 },
];

export const COMPOUNDS: Compound[] = [
  {
    id: "bpc-157",
    name: "BPC-157",
    shortName: "BPC",
    commonVialSizes: [2, 5, 10],
    commonWaterVolumes: [1, 2],
    halfLifeHours: 4,
    defaultDose: 250,
    defaultDoseUnit: "mcg",
    commonFrequencies: ["daily", "twice_daily"],
    notes: "Store lyophilized at 2-8°C. Reconstituted: refrigerate, use within 30 days.",
  },
  {
    id: "tb-500",
    name: "TB-500",
    shortName: "TB",
    commonVialSizes: [2, 5, 10],
    commonWaterVolumes: [1, 2],
    halfLifeHours: 96,
    defaultDose: 2,
    defaultDoseUnit: "mg",
    commonFrequencies: ["twice_daily", "eod", "weekly"],
    notes: "Longer half-life allows less frequent dosing. Store refrigerated post-reconstitution.",
  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    shortName: "Sema",
    commonVialSizes: [2, 3, 5],
    commonWaterVolumes: [1, 2],
    halfLifeHours: 168,
    defaultDose: 0.25,
    defaultDoseUnit: "mg",
    commonFrequencies: ["weekly"],
    notes: "Long half-life — weekly subcutaneous administration is typical.",
  },
  {
    id: "cjc-1295",
    name: "CJC-1295",
    shortName: "CJC",
    commonVialSizes: [2, 5],
    commonWaterVolumes: [1, 2],
    halfLifeHours: 192,
    defaultDose: 1,
    defaultDoseUnit: "mg",
    commonFrequencies: ["weekly", "eod"],
    notes: "DAC form has extended half-life. Often combined with GHRP compounds.",
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    shortName: "Ipa",
    commonVialSizes: [2, 5],
    commonWaterVolumes: [1, 2],
    halfLifeHours: 2,
    defaultDose: 200,
    defaultDoseUnit: "mcg",
    commonFrequencies: ["daily", "twice_daily"],
    notes: "Short half-life. Often used before bed or post-workout. Stack with CJC-1295.",
  },
  {
    id: "pt-141",
    name: "PT-141",
    shortName: "PT",
    commonVialSizes: [10],
    commonWaterVolumes: [2],
    halfLifeHours: 12,
    defaultDose: 1,
    defaultDoseUnit: "mg",
    commonFrequencies: ["custom"],
    notes: "Typically used on an as-needed basis, 45–120 min before intended effect.",
  },
];

export function getCompoundById(id: string): Compound | undefined {
  return COMPOUNDS.find((c) => c.id === id);
}
