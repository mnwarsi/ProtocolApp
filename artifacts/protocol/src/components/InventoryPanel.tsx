import { useMemo, useState } from "react";
import { Beaker, CheckCircle2, Droplets, PackageOpen, Plus, Sparkles } from "lucide-react";
import { COMPOUNDS, getCompoundById } from "@/data/compounds";
import { compoundColor } from "@/lib/compoundColor";
import { formatConcentration, formatUnits } from "@/lib/mathEngine";
import { type InventoryVial, useProtocolStore } from "@/store/protocolStore";
import { cn } from "@/lib/utils";

function getSuggestedDilution(vialSizeMg: number): number {
  if (vialSizeMg <= 2) return 1;
  if (vialSizeMg <= 5) return 2;
  return 3;
}

function getVialBadge(vial: InventoryVial) {
  const ageDays = (Date.now() - new Date(vial.reconstitutedAt).getTime()) / 86400_000;
  if (vial.status === "finished") return "Finished";
  if (vial.status === "expired" || ageDays > 21) return "Old";
  if (vial.estimatedRemainingUnits < 20) return "Low";
  return "Fresh";
}

export default function InventoryPanel() {
  const {
    selectedCompoundId,
    vialSizeMg,
    waterVolumeMl,
    targetDose,
    targetDoseUnit,
    result,
    inventoryVials,
    setCompound,
    setVialSize,
    setWaterVolume,
    setTargetDose,
    setDoseUnit,
    addInventoryVial,
  } = useProtocolStore();

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const selectedCompound = getCompoundById(selectedCompoundId) ?? COMPOUNDS[0];
  const sortedVials = useMemo(
    () => [...inventoryVials].sort((a, b) => new Date(b.reconstitutedAt).getTime() - new Date(a.reconstitutedAt).getTime()),
    [inventoryVials]
  );

  const suggestedDilution = getSuggestedDilution(vialSizeMg);

  const saveCurrentVial = () => {
    if (!result?.valid) return;
    const vialId = addInventoryVial({
      compoundId: selectedCompoundId,
      vialAmountMg: vialSizeMg,
      diluentMl: waterVolumeMl,
      concentrationMgPerMl: result.concentrationMgPerMl,
      concentrationMcgPerUnit: result.concentrationMcgPerUnit,
      defaultDose: targetDose,
      defaultDoseUnit: targetDoseUnit,
      notes: selectedCompound.notes,
    });
    setSavedMessage(`Saved ${selectedCompound.shortName} vial (${vialId.slice(0, 6)})`);
    setTimeout(() => setSavedMessage(null), 2400);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] animate-in fade-in duration-500">
      <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan/70">Inventory</div>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">Reconstitution calculator</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/76">
              Build an exact vial concentration, save it once, and use it as the trusted source for future logs.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan/18 bg-cyan/8 px-3 py-2 text-sm text-cyan/82">
            Suggestion: {suggestedDilution}mL diluent
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Peptide</span>
            <select
              value={selectedCompoundId}
              onChange={(e) => setCompound(e.target.value)}
              className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
            >
              {COMPOUNDS.map((compound) => (
                <option key={compound.id} value={compound.id}>
                  {compound.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Target dose</span>
            <div className="flex overflow-hidden rounded-2xl border border-white/8 bg-black/20">
              <input
                value={targetDose || ""}
                type="number"
                min="0"
                step="0.1"
                onChange={(e) => setTargetDose(parseFloat(e.target.value) || 0)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-foreground focus:outline-none"
              />
              <button
                onClick={() => setDoseUnit(targetDoseUnit === "mcg" ? "mg" : "mcg")}
                className="border-l border-white/8 px-4 py-3 text-sm text-cyan transition hover:bg-cyan/8"
              >
                {targetDoseUnit}
              </button>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Vial amount (mg)</span>
            <input
              value={vialSizeMg || ""}
              type="number"
              min="0"
              step="0.1"
              onChange={(e) => setVialSize(parseFloat(e.target.value) || 0)}
              className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Diluent (mL)</span>
            <input
              value={waterVolumeMl || ""}
              type="number"
              min="0"
              step="0.1"
              onChange={(e) => setWaterVolume(parseFloat(e.target.value) || 0)}
              className="w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-foreground focus:border-cyan/24 focus:outline-none"
            />
          </label>
        </div>

        <div className="mt-6 rounded-[24px] border border-cyan/14 bg-[linear-gradient(180deg,rgba(0,242,255,0.08),rgba(0,0,0,0.18))] p-5">
          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Draw amount</div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-5xl font-semibold text-foreground">
                  {result?.valid ? formatUnits(result.syringeUnits) : "—"}
                </div>
                <div className="pb-2 text-lg text-muted-foreground/55">units</div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground/72">
                {selectedCompound.defaultDoseUnit === targetDoseUnit
                  ? `Recommended for ${selectedCompound.shortName}: ${targetDose}${targetDoseUnit}`
                  : `Adjusted from ${selectedCompound.shortName} defaults`}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Concentration</div>
                <div className="mt-2 text-base text-foreground">
                  {result?.valid ? `${formatConcentration(result.concentrationMcgPerUnit)} mcg/u` : "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">Strength</div>
                <div className="mt-2 text-base text-foreground">
                  {result?.valid ? `${formatConcentration(result.concentrationMgPerMl)} mg/mL` : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={saveCurrentVial}
              disabled={!result?.valid}
              className="rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-black transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:bg-cyan/18 disabled:text-cyan/38"
              style={{ boxShadow: result?.valid ? "0 0 16px rgba(0,242,255,0.16)" : undefined }}
            >
              Save to My Vials
            </button>
            <button
              onClick={() => setWaterVolume(suggestedDilution)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/84 transition hover:border-cyan/20 hover:text-cyan"
            >
              Use suggested dilution
            </button>
          </div>

          {savedMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-cyan/14 bg-cyan/8 px-4 py-3 text-sm text-cyan/84">
              <CheckCircle2 className="h-4 w-4" />
              {savedMessage}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan/70">My Vials</div>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">Saved inventory</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/76">
              Each vial tracks its own concentration, remaining amount, and likely number of draws left.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-muted-foreground/70">
            {sortedVials.length} saved
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {sortedVials.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center">
              <PackageOpen className="mx-auto h-6 w-6 text-muted-foreground/22" />
              <div className="mt-3 text-base font-medium text-foreground">No saved vials yet</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground/62">
                Save a reconstituted vial and future logs can reference its exact concentration.
              </p>
            </div>
          ) : (
            sortedVials.map((vial) => {
              const compound = getCompoundById(vial.compoundId);
              const color = compoundColor(vial.compoundId);
              const fillRatio = Math.min(1, Math.max(0, vial.estimatedRemainingMg / vial.vialAmountMg));
              const unitsPerDefaultDose = vial.defaultDoseUnit === "mg"
                ? (vial.defaultDose * 1000) / vial.concentrationMcgPerUnit
                : vial.defaultDose / vial.concentrationMcgPerUnit;
              const drawsLeft = unitsPerDefaultDose > 0 ? Math.floor(vial.estimatedRemainingUnits / unitsPerDefaultDose) : 0;
              const badge = getVialBadge(vial);

              return (
                <div key={vial.id} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-medium text-foreground">{vial.label}</div>
                      <div className="mt-1 text-sm text-muted-foreground/64">{compound?.name}</div>
                    </div>
                    <div
                      className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                      style={{ borderColor: color.border, background: color.bg, color: color.text }}
                    >
                      {badge}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[22px] border border-white/8 bg-[#08090a] p-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground/62">
                      <span>Estimated remaining</span>
                      <span>{Math.round(fillRatio * 100)}%</span>
                    </div>
                    <div className="mt-3 h-20 overflow-hidden rounded-[18px] border border-white/8 bg-black/30">
                      <div
                        className="h-full rounded-[18px] transition-all duration-700"
                        style={{
                          width: `${Math.max(6, fillRatio * 100)}%`,
                          background: `linear-gradient(90deg, ${color.border}, ${color.dot})`,
                          boxShadow: `0 0 22px ${color.border}`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
                        <Droplets className="h-3.5 w-3.5 text-cyan/70" />
                        Concentration
                      </div>
                      <div className="mt-2 text-base text-foreground">{formatConcentration(vial.concentrationMcgPerUnit)} mcg/u</div>
                      <div className="mt-1 text-sm text-muted-foreground/64">{formatConcentration(vial.concentrationMgPerMl)} mg/mL</div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
                        <Beaker className="h-3.5 w-3.5 text-cyan/70" />
                        Remaining
                      </div>
                      <div className="mt-2 text-base text-foreground">{vial.estimatedRemainingMg.toFixed(2)} mg</div>
                      <div className="mt-1 text-sm text-muted-foreground/64">{formatUnits(vial.estimatedRemainingUnits)} units left</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-muted-foreground/72">
                    <span>{drawsLeft} draws left at your usual dose</span>
                    <span>Mixed {new Date(vial.reconstitutedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
