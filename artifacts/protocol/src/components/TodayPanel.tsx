import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Droplets,
  Package2,
  ShieldCheck,
} from "lucide-react";
import { getCompoundById } from "@/data/compounds";
import { convertToMcg, formatConcentration, formatRelativeTime, formatUnits, getNextDoseTime } from "@/lib/mathEngine";
import { compoundColor } from "@/lib/compoundColor";
import {
  getActiveVialsForCompound,
  getLastLoggedForCompound,
  getRecommendedVialForCompound,
  getTypicalDoseForCompound,
  type ActiveProtocol,
  type DoseLogEntry,
  type InventoryVial,
  useProtocolStore,
} from "@/store/protocolStore";
import { cn } from "@/lib/utils";

interface TodayPanelProps {
  onOpenInventory: () => void;
  onOpenInsights: () => void;
}

interface NextDoseCard {
  protocol: ActiveProtocol | null;
  nextDoseAt: Date | null;
}

function getNextDoseCard(protocols: ActiveProtocol[], entries: DoseLogEntry[]): NextDoseCard {
  const activeProtocols = protocols.filter((protocol) => protocol.active);
  if (activeProtocols.length === 0) {
    return { protocol: null, nextDoseAt: null };
  }

  const ranked = activeProtocols
    .map((protocol) => {
      const lastDose = entries.find((entry) => entry.compoundId === protocol.compoundId);
      const nextDoseAt = lastDose
        ? getNextDoseTime(new Date(lastDose.timestamp), protocol.frequency, protocol.customIntervalHours)
        : new Date(protocol.startDate);
      return { protocol, nextDoseAt };
    })
    .sort((a, b) => a.nextDoseAt.getTime() - b.nextDoseAt.getTime());

  return ranked[0] ?? { protocol: null, nextDoseAt: null };
}

function getDoseUnitsForVial(vial: InventoryVial, protocol: ActiveProtocol | null, fallbackDose: number, fallbackUnit: "mcg" | "mg") {
  const dose = protocol?.dose ?? fallbackDose;
  const doseUnit = protocol?.doseUnit ?? fallbackUnit;
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
    result,
    logDose,
  } = useProtocolStore();

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedVialId, setSelectedVialId] = useState<string | null>(null);

  const nextDoseCard = useMemo(() => getNextDoseCard(protocols, entries), [protocols, entries]);
  const heroCompoundId = nextDoseCard.protocol?.compoundId ?? selectedCompoundId;
  const compound = getCompoundById(heroCompoundId);
  const color = compoundColor(heroCompoundId);
  const activeVials = getActiveVialsForCompound(inventoryVials, entries, heroCompoundId);
  const recommendedVial = getRecommendedVialForCompound(inventoryVials, entries, heroCompoundId);
  const chosenVial =
    activeVials.find((vial) => vial.id === selectedVialId) ??
    (activeVials.length > 1 ? null : recommendedVial);

  const lastLogged = getLastLoggedForCompound(entries, heroCompoundId);
  const typicalDose = getTypicalDoseForCompound(entries, heroCompoundId);
  const targetDoseValue = nextDoseCard.protocol?.dose ?? targetDose;
  const targetDoseValueUnit = nextDoseCard.protocol?.doseUnit ?? targetDoseUnit;
  const exactUnits = chosenVial
    ? getDoseUnitsForVial(chosenVial, nextDoseCard.protocol, targetDose, targetDoseUnit)
    : result?.syringeUnits ?? null;

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
    !chosenVial ? "No saved vial selected, using ad hoc calculation" : null,
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
      const lastDose = entries.find((entry) => entry.compoundId === protocol.compoundId);
      const nextDoseAt = lastDose
        ? getNextDoseTime(new Date(lastDose.timestamp), protocol.frequency, protocol.customIntervalHours)
        : new Date(protocol.startDate);
      return { protocol, nextDoseAt };
    })
    .sort((a, b) => a.nextDoseAt.getTime() - b.nextDoseAt.getTime())
    .slice(0, 3);

  const recentNotes = entries.filter((entry) => entry.symptomNote || (entry.symptomTags?.length ?? 0) > 0).slice(0, 3);

  const handleLogNow = () => {
    if (activeVials.length > 1 && !selectedVialId) {
      setSelectedVialId(activeVials[0]?.id ?? null);
    }
    setShowConfirm(true);
  };

  const confirmLog = () => {
    const fallbackConcentrationMcgPerUnit = chosenVial?.concentrationMcgPerUnit ?? result?.concentrationMcgPerUnit ?? 0;
    const fallbackConcentrationMgPerMl = chosenVial?.concentrationMgPerMl ?? result?.concentrationMgPerMl ?? 0;
    const units = chosenVial
      ? getDoseUnitsForVial(chosenVial, nextDoseCard.protocol, targetDose, targetDoseUnit)
      : result?.syringeUnits ?? 0;

    logDose({
      compound: compound?.name ?? "Custom",
      compoundId: heroCompoundId,
      inventoryVialId: chosenVial?.id,
      dose: targetDoseValue,
      doseUnit: targetDoseValueUnit,
      units,
      concentrationMcgPerUnit: fallbackConcentrationMcgPerUnit,
      concentrationMgPerMl: fallbackConcentrationMgPerMl,
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
              {compound?.name ?? "Next dose"}
            </h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground/78">
              {nextDoseCard.protocol
                ? `${compound?.purpose ?? "Next planned dose"}`
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

        <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Exact draw</div>
            <div className="mt-2 flex items-end gap-2">
              <div className="text-6xl font-semibold tracking-tight text-foreground">
                {exactUnits !== null ? formatUnits(exactUnits) : "—"}
              </div>
              <div className="pb-2 text-lg text-muted-foreground/60">units</div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground/72">
              <ShieldCheck className="h-4 w-4 text-cyan/70" />
              {chosenVial
                ? `Using saved ${chosenVial.label}: ${targetDoseValue}${targetDoseValueUnit} matches ${formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u`
                : "Save a vial in Inventory for exact logging confidence"}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button
                onClick={handleLogNow}
                className="rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan/90"
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
              <button
                onClick={onOpenInventory}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/86 transition hover:border-cyan/20 hover:text-cyan"
              >
                Adjust Dose
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
                upcoming.map(({ protocol, nextDoseAt }) => {
                  const upcomingCompound = getCompoundById(protocol.compoundId);
                  const upcomingColor = compoundColor(protocol.compoundId);
                  return (
                    <div key={protocol.id} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-2 rounded-full" style={{ background: upcomingColor.dot }} />
                        <div>
                          <div className="text-base font-medium text-foreground">{protocol.compound}</div>
                          <div className="text-sm text-muted-foreground/65">{upcomingCompound?.functionLabel} · {protocol.dose}{protocol.doseUnit}</div>
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
          <div className="mx-auto max-w-3xl space-y-4 rounded-[28px] border border-white/8 bg-card/92 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Confirm dose</div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {compound?.name ?? "Dose"} · {targetDoseValue}{targetDoseValueUnit}
                </div>
              </div>
              <button onClick={() => setShowConfirm(false)} className="text-sm text-muted-foreground/55 transition hover:text-foreground">
                Close
              </button>
            </div>

            {activeVials.length > 1 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground/72">Choose the vial you’re drawing from</div>
                <div className="grid gap-2">
                  {activeVials.map((vial) => (
                    <button
                      key={vial.id}
                      onClick={() => setSelectedVialId(vial.id)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                        selectedVialId === vial.id
                          ? "border-cyan/30 bg-cyan/8 text-cyan"
                          : "border-white/8 bg-black/20 text-foreground/84"
                      )}
                    >
                      <div>
                        <div className="font-medium">{vial.label}</div>
                        <div className="text-sm text-muted-foreground/65">{formatConcentration(vial.concentrationMcgPerUnit)} mcg/u</div>
                      </div>
                      <div className="text-sm text-muted-foreground/65">{formatUnits(vial.estimatedRemainingUnits)}u left</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Vial</div>
                <div className="mt-2 text-base text-foreground">{chosenVial?.label ?? "Ad hoc"}</div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Concentration</div>
                <div className="mt-2 text-base text-foreground">
                  {chosenVial ? `${formatConcentration(chosenVial.concentrationMcgPerUnit)} mcg/u` : "Not saved"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Draw</div>
                <div className="mt-2 text-base text-foreground">{exactUnits !== null ? `${formatUnits(exactUnits)} units` : "—"}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-cyan/82">
              <CheckCircle2 className="h-4 w-4" />
              {chosenVial ? "Matches your saved concentration" : "Logging without a saved vial"}
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
