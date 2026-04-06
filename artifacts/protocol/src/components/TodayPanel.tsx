import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Droplets,
  Package2,
  Search,
  ShieldCheck,
} from "lucide-react";
import { getCompoundById } from "@/data/compounds";
import { LIBRARY_ENTRIES } from "@/data/library";
import { calculate, convertToMcg, formatConcentration, formatRelativeTime, formatUnits, getNextDoseTime } from "@/lib/mathEngine";
import { compoundColor } from "@/lib/compoundColor";
import SyringeDisplay from "@/components/SyringeDisplay";
import {
  getLastLoggedForCompound,
  getProtocolProgress,
  getTypicalDoseForCompound,
  getVialSelectionStateForCompound,
  type ActiveProtocol,
  type DoseLogEntry,
  type InventoryVial,
  useProtocolStore,
} from "@/store/protocolStore";

interface TodayPanelProps {
  onOpenInventory: () => void;
  onOpenInsights: () => void;
}

interface NextDoseCard {
  protocol: ActiveProtocol | null;
  nextDoseAt: Date | null;
}

function getTodayLibraryEntry(id: string) {
  return LIBRARY_ENTRIES.find((entry) => entry.id === id || entry.compoundId === id || entry.slug === id);
}

function parseDoseSuggestion(typicalDose: string): { dose: number; unit: "mcg" | "mg" } | null {
  const match = typicalDose.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const dose = parseFloat(match[1]);
  if (!Number.isFinite(dose)) return null;
  const lower = typicalDose.toLowerCase();
  return {
    dose,
    unit: lower.includes("mg") ? "mg" : "mcg",
  };
}

function getNextDoseCard(protocols: ActiveProtocol[], entries: DoseLogEntry[]): NextDoseCard {
  const activeProtocols = protocols.filter((protocol) => protocol.active);
  if (activeProtocols.length === 0) {
    return { protocol: null, nextDoseAt: null };
  }

  const ranked = activeProtocols
    .map((protocol) => {
      const { activeStep, lastEntry } = getProtocolProgress(protocol, entries);
      const nextDoseAt = lastEntry
        ? getNextDoseTime(new Date(lastEntry.timestamp), activeStep.frequency, activeStep.customIntervalHours)
        : new Date(protocol.startDate);
      return { protocol, nextDoseAt };
    })
    .sort((a, b) => a.nextDoseAt.getTime() - b.nextDoseAt.getTime());

  return ranked[0] ?? { protocol: null, nextDoseAt: null };
}

function getDoseUnitsForVial(vial: InventoryVial, dose: number, doseUnit: "mcg" | "mg") {
  const targetDoseMcg = convertToMcg(dose, doseUnit);
  return targetDoseMcg / vial.concentrationMcgPerUnit;
}

export default function TodayPanel({ onOpenInventory, onOpenInsights }: TodayPanelProps) {
  const {
    entries,
    inventoryVials,
    protocols,
    selectedCompoundId,
    targetDose,
    targetDoseUnit,
    vialSizeMg,
    waterVolumeMl,
    result,
    logDose,
  } = useProtocolStore();

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedVialId, setSelectedVialId] = useState<string | null>(null);
  const [actualDose, setActualDose] = useState<number>(0);
  const [actualDoseUnit, setActualDoseUnit] = useState<"mcg" | "mg">("mcg");
  const [actualTimestamp, setActualTimestamp] = useState("");
  const [manualCompoundId, setManualCompoundId] = useState<string | null>(null);
  const [compoundQuery, setCompoundQuery] = useState("");
  const [showCompoundResults, setShowCompoundResults] = useState(false);

  const nextDoseCard = useMemo(() => getNextDoseCard(protocols, entries), [protocols, entries]);
  const protocolProgress = nextDoseCard.protocol ? getProtocolProgress(nextDoseCard.protocol, entries) : null;
  const activeStep = protocolProgress?.activeStep ?? null;
  const heroCompoundId = nextDoseCard.protocol?.compoundId ?? manualCompoundId ?? selectedCompoundId;
  const compound = getCompoundById(heroCompoundId);
  const libraryEntry = getTodayLibraryEntry(heroCompoundId);
  const color = compoundColor(heroCompoundId);
  const vialSelection = getVialSelectionStateForCompound(inventoryVials, entries, heroCompoundId);
  const activeVials = vialSelection.vials;
  const chosenVial =
    activeVials.find((vial) => vial.id === selectedVialId) ??
    (vialSelection.mode === "mixed_concentrations" ? null : vialSelection.defaultVial);

  const lastLogged = getLastLoggedForCompound(entries, heroCompoundId);
  const typicalDose = getTypicalDoseForCompound(entries, heroCompoundId);
  const suggestedLibraryDose = libraryEntry ? parseDoseSuggestion(libraryEntry.quickFacts.typicalDose) : null;
  const targetDoseValue = activeStep?.dose ?? suggestedLibraryDose?.dose ?? targetDose;
  const targetDoseValueUnit = activeStep?.doseUnit ?? suggestedLibraryDose?.unit ?? targetDoseUnit;
  const effectiveDose = actualDose;
  const effectiveDoseUnit = actualDoseUnit;
  const adHocResult = calculate({
    vialSizeMg: nextDoseCard.protocol?.vialAmount ?? vialSizeMg,
    waterVolumeMl: nextDoseCard.protocol?.waterAmount ?? waterVolumeMl,
    targetDose: effectiveDose,
    targetDoseUnit: effectiveDoseUnit,
  });
  const exactUnits = chosenVial
    ? getDoseUnitsForVial(chosenVial, effectiveDose, effectiveDoseUnit)
    : adHocResult.valid ? adHocResult.syringeUnits : result?.syringeUnits ?? null;

  const overlapCount = protocols.filter((protocol) => {
    const protocolCompound = getCompoundById(protocol.compoundId);
    return protocol.active && protocolCompound?.functionClass === compound?.functionClass;
  }).length;

  const loggedToday = entries.some((entry) => {
    const entryDate = new Date(entry.timestamp).toDateString();
    return entry.compoundId === heroCompoundId && entryDate === new Date().toDateString();
  });

  const warnings = [
    loggedToday ? "Already logged today" : null,
    typicalDose !== null && targetDoseValue > typicalDose * 1.3 ? "Above your recent typical dose" : null,
    vialSelection.mode === "mixed_concentrations" && !chosenVial ? "Choose the vial so the draw amount is correct" : null,
    vialSelection.mode === "no_vial" ? "No saved vial selected, using ad hoc calculation" : null,
    chosenVial && chosenVial.estimatedRemainingUnits < 10 ? "Vial appears low" : null,
    chosenVial && chosenVial.status === "expired" ? "Vial is more than 30 days old" : null,
    overlapCount > 1 ? `Multiple ${compound?.functionLabel.toLowerCase() ?? "similar"} compounds active` : null,
  ].filter((warning): warning is string => Boolean(warning));

  const lowInventory = inventoryVials
    .filter((vial) => vial.status === "active" && vial.estimatedRemainingUnits < 20)
    .slice(0, 3);

  const upcoming = protocols
    .filter((protocol) => protocol.active && protocol.id !== nextDoseCard.protocol?.id)
    .map((protocol) => {
      const progress = getProtocolProgress(protocol, entries);
      const nextDoseAt = progress.lastEntry
        ? getNextDoseTime(new Date(progress.lastEntry.timestamp), progress.activeStep.frequency, progress.activeStep.customIntervalHours)
        : new Date(protocol.startDate);
      return { protocol, nextDoseAt, progress };
    })
    .sort((a, b) => a.nextDoseAt.getTime() - b.nextDoseAt.getTime())
    .slice(0, 3);

  const recentNotes = entries.filter((entry) => entry.symptomNote || (entry.symptomTags?.length ?? 0) > 0).slice(0, 3);
  const inventoryCompoundOptions = useMemo(() => {
    const activeCompoundIds = Array.from(
      new Set(
        inventoryVials
          .filter((vial) => vial.status === "active")
          .map((vial) => vial.compoundId)
      )
    );

    return activeCompoundIds
      .map((id) => getTodayLibraryEntry(id))
      .filter((entry): entry is NonNullable<ReturnType<typeof getTodayLibraryEntry>> => Boolean(entry))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryVials]);
  const filteredCompoundOptions = useMemo(() => {
    const normalized = compoundQuery.trim().toLowerCase();
    const entries = inventoryCompoundOptions;
    if (!normalized) {
      return entries.slice(0, 12);
    }
    return entries
      .filter((entry) =>
        [
          entry.name,
          entry.shortName,
          ...entry.aliases,
          entry.headline,
          ...entry.primaryGoals,
        ].some((field) => field.toLowerCase().includes(normalized))
      )
      .slice(0, 12);
  }, [compoundQuery]);

  useEffect(() => {
    setActualDose(targetDoseValue);
    setActualDoseUnit(targetDoseValueUnit);
    setActualTimestamp(new Date().toISOString().slice(0, 16));
  }, [heroCompoundId, targetDoseValue, targetDoseValueUnit]);

  useEffect(() => {
    if (nextDoseCard.protocol) {
      setManualCompoundId(null);
      return;
    }

    setManualCompoundId((current) => {
      if (current && inventoryCompoundOptions.some((entry) => (entry.compoundId ?? entry.id) === current)) {
        return current;
      }
      const fallbackId = inventoryCompoundOptions[0]?.compoundId ?? inventoryCompoundOptions[0]?.id ?? selectedCompoundId;
      return fallbackId ?? null;
    });
  }, [inventoryCompoundOptions, nextDoseCard.protocol, selectedCompoundId]);

  useEffect(() => {
    const label = libraryEntry?.name ?? compound?.name ?? "Pick peptide";
    setCompoundQuery(label);
  }, [compound?.name, libraryEntry?.name]);

  useEffect(() => {
    if (vialSelection.mode === "mixed_concentrations") {
      if (!activeVials.some((vial) => vial.id === selectedVialId)) {
        setSelectedVialId(null);
      }
      return;
    }
    setSelectedVialId(vialSelection.defaultVial?.id ?? null);
  }, [activeVials, selectedVialId, vialSelection.defaultVial?.id, vialSelection.mode]);

  const handleLogNow = () => {
    if (vialSelection.mode === "mixed_concentrations" && !selectedVialId) {
      return;
    }
    setShowConfirm(true);
  };

  const confirmLog = () => {
    const fallbackConcentrationMcgPerUnit = chosenVial?.concentrationMcgPerUnit ?? result?.concentrationMcgPerUnit ?? 0;
    const fallbackConcentrationMgPerMl = chosenVial?.concentrationMgPerMl ?? adHocResult.concentrationMgPerMl ?? result?.concentrationMgPerMl ?? 0;
    const units = chosenVial
      ? getDoseUnitsForVial(chosenVial, actualDose, actualDoseUnit)
      : adHocResult.valid ? adHocResult.syringeUnits : result?.syringeUnits ?? 0;

    logDose({
      compound: libraryEntry?.name ?? compound?.name ?? "Custom",
      compoundId: heroCompoundId,
      protocolId: nextDoseCard.protocol?.id,
      inventoryVialId: chosenVial?.id,
      dose: actualDose,
      doseUnit: actualDoseUnit,
      units,
      concentrationMcgPerUnit: chosenVial?.concentrationMcgPerUnit ?? adHocResult.concentrationMcgPerUnit ?? fallbackConcentrationMcgPerUnit,
      concentrationMgPerMl: fallbackConcentrationMgPerMl,
      timestamp: actualTimestamp ? new Date(actualTimestamp).toISOString() : new Date().toISOString(),
      symptomNote: undefined,
      symptomTags: undefined,
    });
    setShowConfirm(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <section
        className="overflow-hidden rounded-[28px] border border-cyan/16 bg-[radial-gradient(circle_at_top_left,rgba(0,242,255,0.12),transparent_42%),linear-gradient(180deg,rgba(12,17,19,0.98),rgba(7,9,10,0.98))] p-5"
        style={{ boxShadow: "0 0 28px rgba(0,242,255,0.06)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.24em] text-cyan/70">Today</div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {libraryEntry?.name ?? compound?.name ?? "Next dose"}
            </h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground/78">
              {nextDoseCard.protocol
                ? `${compound?.purpose ?? libraryEntry?.summary ?? "Next planned dose"}`
                : "Use a saved vial or the inventory calculator to log with confidence."}
            </p>
          </div>

          <div
            className="rounded-3xl border px-4 py-3 text-right"
            style={{ borderColor: color.border, background: color.bg }}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">Due</div>
            <div className="mt-1 text-lg font-semibold text-foreground">
              {nextDoseCard.nextDoseAt ? formatRelativeTime(nextDoseCard.nextDoseAt) : "Ready now"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground/55">
              {nextDoseCard.protocol ? `${targetDoseValue}${targetDoseValueUnit}` : "No protocol selected"}
            </div>
          </div>
        </div>

        {!nextDoseCard.protocol && (
          <div className="mt-6 max-w-md">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Peptide</div>
            {inventoryCompoundOptions.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-muted-foreground/62">
                No active vials yet. Add a peptide in Inventory to log it here.
              </div>
            ) : (
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  value={compoundQuery}
                  onChange={(event) => {
                    setCompoundQuery(event.target.value);
                    setShowCompoundResults(true);
                  }}
                  onFocus={() => setShowCompoundResults(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setShowCompoundResults(false);
                      setCompoundQuery(libraryEntry?.name ?? compound?.name ?? "");
                    }, 120);
                  }}
                  placeholder="Search active peptide"
                  className="w-full rounded-2xl border border-white/8 bg-black/20 py-3 pl-11 pr-4 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
                />
                {showCompoundResults && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-80 overflow-y-auto rounded-[24px] border border-white/8 bg-[#0b0d0f] p-2 shadow-2xl">
                    {filteredCompoundOptions.length === 0 ? (
                      <div className="rounded-2xl px-4 py-3 text-sm text-muted-foreground/60">
                        No active inventory matched that search.
                      </div>
                    ) : (
                      filteredCompoundOptions.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setManualCompoundId(entry.compoundId ?? entry.id);
                            setShowCompoundResults(false);
                          }}
                          className="flex w-full items-start justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/[0.04]"
                        >
                          <div>
                            <div className="text-sm font-medium text-foreground">{entry.name}</div>
                            <div className="mt-1 text-xs text-muted-foreground/60">
                              {entry.quickFacts.typicalDose} · {entry.quickFacts.frequency}
                            </div>
                          </div>
                          <div className="pl-3 text-[11px] uppercase tracking-[0.14em] text-cyan/70">
                            {entry.shortName}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Exact draw</div>
            <div className="mt-2 flex items-end gap-2">
              <div className="text-6xl font-semibold tracking-tight text-foreground">
                {exactUnits !== null ? formatUnits(exactUnits) : "—"}
              </div>
              <div className="pb-2 text-lg text-muted-foreground/60">units</div>
            </div>
            <div className="mt-4 max-w-xs">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Dose</div>
              <div className="mt-2 flex overflow-hidden rounded-2xl border border-white/8 bg-[#090b0c]">
                <input
                  value={actualDose || ""}
                  type="number"
                  min="0"
                  step="0.01"
                  onChange={(event) => setActualDose(parseFloat(event.target.value) || 0)}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setActualDoseUnit((unit) => (unit === "mcg" ? "mg" : "mcg"))}
                  className="border-l border-white/8 px-4 py-3 text-sm text-cyan/85 transition hover:bg-cyan/8"
                >
                  {actualDoseUnit}
                </button>
              </div>
            </div>
            <div className="mt-4 max-w-xs">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Time</div>
              <input
                value={actualTimestamp}
                type="datetime-local"
                onChange={(event) => setActualTimestamp(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-[#090b0c] px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
              />
            </div>
            <div className="mt-4 max-w-md">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Vial</div>
              {vialSelection.mode === "single_vial" && chosenVial && (
                <div className="mt-2 rounded-2xl border border-white/8 bg-[#090b0c] px-4 py-3 text-sm text-foreground">
                  {chosenVial.label} · {formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u
                </div>
              )}
              {vialSelection.mode === "same_concentration_group" && (
                <div className="mt-2 space-y-2">
                  <div className="rounded-2xl border border-cyan/14 bg-cyan/[0.04] px-4 py-3 text-sm text-cyan/82">
                    Any active vial works here because the concentration is the same.
                  </div>
                  <select
                    value={selectedVialId ?? ""}
                    onChange={(event) => setSelectedVialId(event.target.value)}
                    className="w-full rounded-2xl border border-white/8 bg-[#090b0c] px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
                  >
                    {activeVials.map((vial) => (
                      <option key={vial.id} value={vial.id}>
                        {vial.label} · {formatConcentration(vial.concentrationMcgPerUnit)} mcg/u
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {vialSelection.mode === "mixed_concentrations" && (
                <div className="mt-2 space-y-2">
                  <div className="rounded-2xl border border-amber-400/18 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100/88">
                    Choose the vial so the draw amount is correct.
                  </div>
                  <select
                    value={selectedVialId ?? ""}
                    onChange={(event) => setSelectedVialId(event.target.value || null)}
                    className="w-full rounded-2xl border border-white/8 bg-[#090b0c] px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
                  >
                    <option value="">Select a vial</option>
                    {activeVials.map((vial) => (
                      <option key={vial.id} value={vial.id}>
                        {vial.label} · {formatConcentration(vial.concentrationMcgPerUnit)} mcg/u
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {vialSelection.mode === "no_vial" && (
                <div className="mt-2 rounded-2xl border border-white/8 bg-[#090b0c] px-4 py-3 text-sm text-muted-foreground/72">
                  No saved vial selected. Logging will use the ad hoc mix.
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground/72">
              <ShieldCheck className="h-4 w-4 text-cyan/70" />
              {vialSelection.mode === "same_concentration_group" && chosenVial
                ? `Using shared concentration from ${activeVials.length} active vials at ${formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u`
                : chosenVial
                ? `Using saved ${chosenVial.label}: ${effectiveDose}${effectiveDoseUnit} matches ${formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u`
                : "Save a vial in Inventory for exact logging confidence"}
            </div>

            <div className="mt-5">
              <SyringeDisplay units={exactUnits} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={handleLogNow}
                disabled={
                  (vialSelection.mode === "mixed_concentrations" && !selectedVialId) ||
                  (!nextDoseCard.protocol && inventoryCompoundOptions.length === 0)
                }
                className="rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:bg-cyan/18 disabled:text-cyan/38"
                style={{ boxShadow: "0 0 16px rgba(0,242,255,0.18)" }}
              >
                Log Now
              </button>
              <button
                onClick={onOpenInventory}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/86 transition hover:border-cyan/20 hover:text-cyan"
              >
                View Vial
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Confidence checks</div>
            {warnings.length === 0 ? (
              <div className="rounded-2xl border border-cyan/15 bg-cyan/6 px-4 py-3 text-sm text-cyan/85">
                Ready to log. Concentration and timing look consistent.
              </div>
            ) : (
              warnings.map((warning) => (
                <div key={warning} className="flex items-start gap-3 rounded-2xl border border-amber-400/18 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100/88">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                  <span>{warning}</span>
                </div>
              ))
            )}
            {lastLogged && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Clock3 className="h-4 w-4 text-cyan/60" />
                Last logged {formatRelativeTime(new Date(lastLogged.timestamp))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-white/8 bg-card/85 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Due later</div>
                <div className="mt-1 text-lg font-semibold text-foreground">Upcoming peptides</div>
              </div>
              <button onClick={onOpenInsights} className="text-sm text-cyan/80 transition hover:text-cyan">
                Open Insights
              </button>
            </div>
            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground/55">
                  No additional active protocols scheduled right now.
                </div>
              ) : (
                upcoming.map(({ protocol, nextDoseAt, progress }) => {
                  const upcomingCompound = getCompoundById(protocol.compoundId);
                  const upcomingColor = compoundColor(protocol.compoundId);
                  return (
                    <div key={protocol.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-2 rounded-full" style={{ background: upcomingColor.dot }} />
                        <div>
                          <div className="text-base font-medium text-foreground">{protocol.compound}</div>
                          <div className="text-sm text-muted-foreground/65">{upcomingCompound?.functionLabel} · {progress.activeStep.dose}{progress.activeStep.doseUnit}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground/72">{formatRelativeTime(nextDoseAt)}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-card/85 p-5">
            <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Recent notes</div>
            <div className="space-y-3">
              {recentNotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-muted-foreground/55">
                  Log a few doses with symptoms or notes and they’ll surface here.
                </div>
              ) : (
                recentNotes.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-medium text-foreground">{entry.compound}</div>
                      <div className="text-sm text-muted-foreground/55">{formatRelativeTime(new Date(entry.timestamp))}</div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground/74">
                      {entry.symptomNote || entry.symptomTags?.join(" · ") || "No note"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-white/8 bg-card/85 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Inventory watch</div>
              <div className="mt-1 text-lg font-semibold text-foreground">Vials that need attention</div>
            </div>
            <button onClick={onOpenInventory} className="text-sm text-cyan/80 transition hover:text-cyan">
              Open Inventory
            </button>
          </div>
          <div className="space-y-3">
            {lowInventory.length === 0 ? (
              <div className="rounded-2xl border border-cyan/15 bg-cyan/6 px-4 py-5 text-sm text-cyan/85">
                Inventory looks healthy right now.
              </div>
            ) : (
              lowInventory.map((vial) => {
                const vialCompound = getCompoundById(vial.compoundId);
                return (
                  <div key={vial.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Package2 className="h-4 w-4 text-cyan/70" />
                        <div>
                          <div className="text-base font-medium text-foreground">{vial.label}</div>
                          <div className="text-sm text-muted-foreground/68">{vialCompound?.name}</div>
                        </div>
                      </div>
                      <div className="rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-200/90">
                        Low
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground/72">
                      <span>{formatUnits(vial.estimatedRemainingUnits)}u left</span>
                      <span>{vial.estimatedRemainingMg.toFixed(2)}mg remaining</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {showConfirm && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-cyan/14 bg-[#07090a]/96 px-4 pb-6 pt-4 backdrop-blur-2xl">
          <div className="mx-auto max-w-2xl space-y-4 rounded-[28px] border border-white/8 bg-card/92 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Confirm dose</div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {compound?.name ?? "Dose"} · {actualDose}{actualDoseUnit}
                </div>
              </div>
              <button onClick={() => setShowConfirm(false)} className="text-sm text-muted-foreground/55 transition hover:text-foreground">
                Close
              </button>
            </div>

            {nextDoseCard.protocol && protocolProgress && (
              <div className="rounded-2xl border border-cyan/14 bg-cyan/6 px-4 py-3 text-sm text-cyan/82">
                Step {protocolProgress.activeStepIndex + 1} of {protocolProgress.totalSteps}
                {protocolProgress.activeStep.plannedDoseCount !== null
                  ? ` · ${protocolProgress.dosesIntoStep} of ${protocolProgress.activeStep.plannedDoseCount} doses logged in this step`
                  : " · ongoing maintenance step"}
              </div>
            )}

            <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Dose</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{actualDose}{actualDoseUnit}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Draw</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {exactUnits !== null ? `${formatUnits(exactUnits)} units` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Vial</div>
                  <div className="mt-1 text-sm text-foreground">{chosenVial?.label ?? "Ad hoc mix"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-cyan/82">
              <CheckCircle2 className="h-4 w-4" />
              {chosenVial
                ? `Matches ${formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u`
                : "Logging without a saved vial"}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/84 transition hover:border-white/16"
              >
                Cancel
              </button>
              <button
                onClick={confirmLog}
                className="flex-1 rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan/90"
                style={{ boxShadow: "0 0 16px rgba(0,242,255,0.18)" }}
              >
                Confirm & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
