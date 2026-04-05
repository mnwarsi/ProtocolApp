import type { DoseUnit, FrequencyKey, FrequencyOption } from "@/data/compounds";
import { FREQUENCY_OPTIONS } from "@/data/compounds";

export interface ReconstitutionInputs {
  vialSizeMg: number;
  waterVolumeMl: number;
  targetDose: number;
  targetDoseUnit: DoseUnit;
}

export interface ReconstitutionResult {
  valid: boolean;
  syringeUnits: number;
  concentrationMcgPerUnit: number;
  concentrationMgPerMl: number;
  targetDoseMcg: number;
  warnings: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

const MAX_SYRINGE_UNITS = 100;
const HIGH_DOSE_THRESHOLD_MCG = 10000;

export function validateInputs(inputs: Partial<ReconstitutionInputs>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!inputs.vialSizeMg || inputs.vialSizeMg <= 0) {
    errors.push({ field: "vialSizeMg", message: "Vial size must be greater than 0" });
  }
  if (inputs.vialSizeMg && inputs.vialSizeMg > 1000) {
    errors.push({ field: "vialSizeMg", message: "Vial size seems unusually large (>1000 mg)" });
  }
  if (!inputs.waterVolumeMl || inputs.waterVolumeMl <= 0) {
    errors.push({ field: "waterVolumeMl", message: "Water volume must be greater than 0" });
  }
  if (inputs.waterVolumeMl && inputs.waterVolumeMl > 10) {
    errors.push({ field: "waterVolumeMl", message: "Water volume seems unusually large (>10 mL)" });
  }
  if (!inputs.targetDose || inputs.targetDose <= 0) {
    errors.push({ field: "targetDose", message: "Target dose must be greater than 0" });
  }

  return errors;
}

export function convertToMcg(dose: number, unit: DoseUnit): number {
  return unit === "mg" ? dose * 1000 : dose;
}

export function convertFromMcg(doseMcg: number, unit: DoseUnit): number {
  return unit === "mg" ? doseMcg / 1000 : doseMcg;
}

export function calculate(inputs: ReconstitutionInputs): ReconstitutionResult {
  const errors = validateInputs(inputs);
  const warnings: string[] = [];

  if (errors.length > 0) {
    return {
      valid: false,
      syringeUnits: 0,
      concentrationMcgPerUnit: 0,
      concentrationMgPerMl: 0,
      targetDoseMcg: 0,
      warnings: errors.map((e) => e.message),
    };
  }

  const { vialSizeMg, waterVolumeMl, targetDose, targetDoseUnit } = inputs;

  const vialSizeMcg = vialSizeMg * 1000;
  const targetDoseMcg = convertToMcg(targetDose, targetDoseUnit);

  const concentrationMcgPerMl = vialSizeMcg / waterVolumeMl;
  const concentrationMgPerMl = vialSizeMg / waterVolumeMl;
  const concentrationMcgPerUnit = concentrationMcgPerMl / 100;

  const syringeUnits = (targetDoseMcg / vialSizeMcg) * (waterVolumeMl * 100);

  if (syringeUnits > MAX_SYRINGE_UNITS) {
    warnings.push(
      `Dose requires ${syringeUnits.toFixed(1)} units — exceeds a 100-unit syringe. Check inputs or split dose.`
    );
  }

  if (targetDoseMcg > HIGH_DOSE_THRESHOLD_MCG) {
    warnings.push(`Dose of ${targetDoseMcg.toLocaleString()} mcg is very high. Please verify.`);
  }

  if (syringeUnits < 0.5) {
    warnings.push(`Dose is very small (${syringeUnits.toFixed(2)} units). Verify precision.`);
  }

  return {
    valid: true,
    syringeUnits,
    concentrationMcgPerUnit,
    concentrationMgPerMl,
    targetDoseMcg,
    warnings,
  };
}

export function formatUnits(units: number): string {
  if (units === 0) return "0";
  if (units < 1) return units.toFixed(2);
  return units.toFixed(1);
}

export function formatConcentration(value: number, decimals = 2): string {
  if (value === 0) return "—";
  if (value < 0.01) return value.toExponential(2);
  return value.toFixed(decimals);
}

export function estimateWashoutDate(
  lastDoseTime: Date,
  halfLifeHours: number,
  clearanceMultiplier = 5
): Date {
  const washoutMs = halfLifeHours * clearanceMultiplier * 60 * 60 * 1000;
  return new Date(lastDoseTime.getTime() + washoutMs);
}

export function getHalfLifeLabel(halfLifeHours: number): string {
  if (halfLifeHours < 1) return `${Math.round(halfLifeHours * 60)} min`;
  if (halfLifeHours < 24) return `${halfLifeHours}h`;
  if (halfLifeHours < 168) return `${(halfLifeHours / 24).toFixed(1)}d`;
  return `${(halfLifeHours / 168).toFixed(1)}w`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs < 0;

  const minutes = Math.floor(absDiffMs / 60000);
  const hours = Math.floor(absDiffMs / 3600000);
  const days = Math.floor(absDiffMs / 86400000);

  let label: string;
  if (minutes < 1) label = "just now";
  else if (minutes < 60) label = `${minutes}m`;
  else if (hours < 24) label = `${hours}h ${minutes % 60}m`;
  else label = `${days}d ${hours % 24}h`;

  if (minutes < 1) return label;
  return isPast ? `${label} ago` : `in ${label}`;
}

export function getFrequencyOption(key: FrequencyKey): FrequencyOption | undefined {
  return FREQUENCY_OPTIONS.find((f) => f.key === key);
}

export function getFrequencyIntervalHours(key: FrequencyKey): number {
  return getFrequencyOption(key)?.intervalHours ?? 24;
}

export function resolveIntervalHours(key: FrequencyKey, customIntervalHours?: number): number {
  if (key === "custom" && customIntervalHours && customIntervalHours > 0) {
    return customIntervalHours;
  }
  return getFrequencyIntervalHours(key);
}

export function getNextDoseTime(lastDose: Date, key: FrequencyKey, customIntervalHours?: number): Date {
  const intervalMs = resolveIntervalHours(key, customIntervalHours) * 3600 * 1000;
  return new Date(lastDose.getTime() + intervalMs);
}

export function isDoseDue(lastDose: Date, key: FrequencyKey, customIntervalHours?: number): boolean {
  return getNextDoseTime(lastDose, key, customIntervalHours) <= new Date();
}

export function timeUntilNextDose(lastDose: Date, key: FrequencyKey, customIntervalHours?: number): number {
  const next = getNextDoseTime(lastDose, key, customIntervalHours);
  return Math.max(0, next.getTime() - Date.now());
}

export function washoutProgress(lastDose: Date, halfLifeHours: number, clearanceMultiplier = 5): number {
  const totalMs = halfLifeHours * clearanceMultiplier * 3600 * 1000;
  const elapsedMs = Date.now() - lastDose.getTime();
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

export function formatFormula(
  targetDoseMcg: number,
  vialSizeMg: number,
  waterVolumeMl: number,
  syringeUnits: number
): string {
  const vialSizeMcg = vialSizeMg * 1000;
  return `(${targetDoseMcg}mcg / ${vialSizeMcg}mcg) × ${waterVolumeMl}mL × 100 = ${formatUnits(syringeUnits)} units`;
}
