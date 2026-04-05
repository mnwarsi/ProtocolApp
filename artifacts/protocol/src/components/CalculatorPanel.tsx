import { useState } from "react";
import { useProtocolStore, SYMPTOM_TAGS, type SymptomTag } from "@/store/protocolStore";
import { COMPOUNDS, getCompoundById } from "@/data/compounds";
import { formatUnits, formatConcentration, formatFormula } from "@/lib/mathEngine";
import { AlertCircle, ChevronDown, ChevronRight, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CalculatorPanel() {
  const {
    selectedCompoundId,
    vialSizeMg,
    waterVolumeMl,
    targetDose,
    targetDoseUnit,
    result,
    setCompound,
    setVialSize,
    setWaterVolume,
    setTargetDose,
    setDoseUnit,
    logDose,
  } = useProtocolStore();

  const [showFormula, setShowFormula] = useState(false);
  const [showSymptomForm, setShowSymptomForm] = useState(false);
  const [symptomNote, setSymptomNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<SymptomTag[]>([]);
  const [justLogged, setJustLogged] = useState(false);

  const compound = getCompoundById(selectedCompoundId);

  const handleLogDoseClick = () => {
    if (!result?.valid || !compound) return;
    setShowSymptomForm(true);
  };

  const handleConfirmLog = () => {
    if (!result?.valid || !compound) return;
    logDose({
      compound: compound.name,
      compoundId: compound.id,
      dose: targetDose,
      doseUnit: targetDoseUnit,
      units: result.syringeUnits,
      concentrationMcgPerUnit: result.concentrationMcgPerUnit,
      concentrationMgPerMl: result.concentrationMgPerMl,
      symptomNote: symptomNote.trim() || undefined,
      symptomTags: selectedTags.length > 0 ? [...selectedTags] : undefined,
    });
    setShowSymptomForm(false);
    setSymptomNote("");
    setSelectedTags([]);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2000);
  };

  const toggleTag = (tag: SymptomTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const inputClass =
    "w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground/40 focus:outline-none focus:border-cyan/60 focus:ring-1 focus:ring-cyan/30 transition-colors";

  return (
    <div className="flex flex-col gap-4 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-2 duration-400">

      {/* ── Inputs Card ── */}
      <div className="bg-card border border-[#222] rounded-xl p-4 shadow-md space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Reconstitution
          </h2>
        </div>

        {/* Compound Select */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
            Compound
          </label>
          <div className="relative">
            <select
              data-testid="select-compound"
              value={selectedCompoundId}
              onChange={(e) => setCompound(e.target.value)}
              className={cn(inputClass, "appearance-none pr-8 cursor-pointer")}
            >
              {COMPOUNDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName} — {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Vial + Water */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
              Vial (mg)
            </label>
            <input
              data-testid="input-vial-size"
              type="number"
              min="0"
              step="0.1"
              value={vialSizeMg || ""}
              onChange={(e) => setVialSize(parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="5"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
              Water (mL)
            </label>
            <input
              data-testid="input-water-vol"
              type="number"
              min="0"
              step="0.1"
              value={waterVolumeMl || ""}
              onChange={(e) => setWaterVolume(parseFloat(e.target.value) || 0)}
              className={inputClass}
              placeholder="1"
            />
          </div>
        </div>

        {/* Target Dose */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
            Target Dose
          </label>
          <div className="flex rounded-md overflow-hidden border border-[#222] focus-within:border-cyan/60 focus-within:ring-1 focus-within:ring-cyan/30 transition-all">
            <input
              data-testid="input-target-dose"
              type="number"
              min="0"
              step="0.1"
              value={targetDose || ""}
              onChange={(e) => setTargetDose(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-[#111] px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground/40 focus:outline-none min-w-0"
              placeholder="250"
            />
            <button
              data-testid="btn-toggle-unit"
              onClick={() => setDoseUnit(targetDoseUnit === "mcg" ? "mg" : "mcg")}
              className="bg-[#181818] border-l border-[#222] px-3 py-2 text-xs font-mono font-semibold text-cyan hover:bg-[#1f1f1f] transition-colors w-14 text-center shrink-0"
            >
              {targetDoseUnit}
            </button>
          </div>
        </div>
      </div>

      {/* ── Result Card ── */}
      <div
        className={cn(
          "border rounded-xl p-5 shadow-xl transition-all duration-300 relative overflow-hidden",
          result?.valid
            ? "bg-[#0e1515] border-cyan/25"
            : "bg-[#0e0e0e] border-[#222]"
        )}
        style={
          result?.valid
            ? { boxShadow: "0 0 20px rgba(0,242,255,0.08), 0 8px 24px rgba(0,0,0,0.7)" }
            : undefined
        }
      >
        <div className="scanline absolute inset-0 opacity-15 pointer-events-none" />

        <div className="relative z-10">
          {/* Primary number */}
          <div className="mb-4">
            <div className="text-[10px] font-medium text-cyan/60 uppercase tracking-widest mb-0.5">
              Units to Draw
            </div>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="text-result-units"
                className="text-5xl font-mono font-bold text-cyan leading-none"
                style={result?.valid ? { textShadow: "0 0 20px rgba(0,242,255,0.5)" } : undefined}
              >
                {result?.valid ? formatUnits(result.syringeUnits) : "—"}
              </span>
              <span className="text-base text-muted-foreground font-mono font-normal">u</span>
            </div>
          </div>

          {/* Secondary metrics */}
          {result?.valid && (
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-white/5 mb-4">
              <div>
                <div className="text-[9px] text-muted-foreground/60 uppercase tracking-widest mb-1">mcg / unit</div>
                <div className="font-mono text-sm text-foreground/90 leading-none">
                  {formatConcentration(result.concentrationMcgPerUnit)}
                  <span className="text-muted-foreground/60 text-[10px] ml-1">mcg/u</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] text-muted-foreground/60 uppercase tracking-widest mb-1">mg / mL</div>
                <div className="font-mono text-sm text-foreground/90 leading-none">
                  {formatConcentration(result.concentrationMgPerMl)}
                  <span className="text-muted-foreground/60 text-[10px] ml-1">mg/mL</span>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {result?.warnings && result.warnings.length > 0 && (
            <div className="bg-destructive/8 border border-destructive/20 rounded-md p-3 space-y-1.5 mb-4">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-destructive text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA + Symptom Form + Formula */}
          <div className="flex flex-col gap-2">
            {/* Step 1: Log Dose trigger */}
            {!showSymptomForm && (
              <button
                data-testid="btn-log-dose"
                disabled={!result?.valid}
                onClick={handleLogDoseClick}
                className={cn(
                  "w-full font-bold py-2.5 rounded-md active:scale-[0.99] disabled:cursor-not-allowed transition-all duration-150 uppercase tracking-widest text-xs flex items-center justify-center gap-2",
                  justLogged
                    ? "bg-cyan/20 text-cyan border border-cyan/40"
                    : "bg-cyan text-black hover:bg-cyan/90 disabled:bg-cyan/15 disabled:text-cyan/30"
                )}
                style={
                  result?.valid && !justLogged
                    ? { boxShadow: "0 0 20px rgba(0,242,255,0.25), 0 2px 8px rgba(0,0,0,0.4)" }
                    : undefined
                }
              >
                {justLogged ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Logged
                  </>
                ) : (
                  "Log Dose"
                )}
              </button>
            )}

            {/* Step 2: Symptom form */}
            {showSymptomForm && result?.valid && (
              <div className="bg-[#0d0d0d] border border-[#222] rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                    Symptom Check-in
                  </span>
                  <button
                    onClick={() => { setShowSymptomForm(false); setSymptomNote(""); setSelectedTags([]); }}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tag chips */}
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOM_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "text-[9px] font-mono px-2 py-1 rounded border transition-all",
                        selectedTags.includes(tag)
                          ? "bg-cyan/15 border-cyan/40 text-cyan"
                          : "bg-[#111] border-[#2a2a2a] text-muted-foreground/50 hover:border-[#333] hover:text-muted-foreground/70"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Free-text note */}
                <input
                  type="text"
                  placeholder="Optional note — how are you feeling?"
                  value={symptomNote}
                  onChange={(e) => setSymptomNote(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-colors"
                />

                {/* Confirm button */}
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmLog}
                    className="flex-1 bg-cyan text-black font-bold py-2 rounded-md hover:bg-cyan/90 transition-all text-xs uppercase tracking-widest"
                    style={{ boxShadow: "0 0 12px rgba(0,242,255,0.2)" }}
                  >
                    Confirm &amp; Log
                  </button>
                  <button
                    onClick={() => {
                      setSymptomNote("");
                      setSelectedTags([]);
                      handleConfirmLog();
                    }}
                    className="px-3 py-2 text-xs text-muted-foreground/50 border border-[#222] rounded-md hover:border-[#333] hover:text-muted-foreground transition-colors whitespace-nowrap"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowFormula(!showFormula)}
              className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50 hover:text-cyan/70 transition-colors uppercase tracking-widest py-1"
            >
              <ChevronRight
                className={cn("w-3 h-3 transition-transform", showFormula && "rotate-90")}
              />
              {showFormula ? "Hide" : "Show"} formula
            </button>

            {showFormula && (
              <div className="text-[10px] font-mono text-center text-muted-foreground/50 bg-black/30 py-2 px-3 rounded border border-white/5">
                {result?.valid
                  ? formatFormula(result.targetDoseMcg, vialSizeMg, waterVolumeMl, result.syringeUnits)
                  : "(? mcg / ? mcg) × ? mL × 100 = — units"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
