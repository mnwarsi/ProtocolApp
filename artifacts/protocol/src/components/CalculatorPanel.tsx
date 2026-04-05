import { useState } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import { COMPOUNDS, getCompoundById } from "@/data/compounds";
import { formatUnits, formatConcentration } from "@/lib/mathEngine";
import { AlertCircle, Calculator, Info } from "lucide-react";
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
  const compound = getCompoundById(selectedCompoundId);

  const handleLogDose = () => {
    if (!result || !result.valid || !compound) return;
    
    logDose({
      compound: compound.name,
      compoundId: compound.id,
      dose: targetDose,
      doseUnit: targetDoseUnit,
      units: result.syringeUnits,
      concentrationMcgPerUnit: result.concentrationMcgPerUnit,
      concentrationMgPerMl: result.concentrationMgPerMl,
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Inputs Card */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan" />
            Reconstitution
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compound</label>
            <select
              data-testid="select-compound"
              value={selectedCompoundId}
              onChange={(e) => setCompound(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors appearance-none"
            >
              {COMPOUNDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vial Size (mg)</label>
              <input
                data-testid="input-vial-size"
                type="number"
                min="0"
                step="0.1"
                value={vialSizeMg || ""}
                onChange={(e) => setVialSize(parseFloat(e.target.value) || 0)}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                placeholder="e.g. 5"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Water Vol (mL)</label>
              <input
                data-testid="input-water-vol"
                type="number"
                min="0"
                step="0.1"
                value={waterVolumeMl || ""}
                onChange={(e) => setWaterVolume(parseFloat(e.target.value) || 0)}
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                placeholder="e.g. 1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Target Dose</label>
            <div className="flex">
              <input
                data-testid="input-target-dose"
                type="number"
                min="0"
                step="0.1"
                value={targetDose || ""}
                onChange={(e) => setTargetDose(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-input border border-border border-r-0 rounded-l-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-colors"
                placeholder="e.g. 250"
              />
              <button
                data-testid="btn-toggle-unit"
                onClick={() => setDoseUnit(targetDoseUnit === "mcg" ? "mg" : "mcg")}
                className="bg-secondary border border-border rounded-r-md px-4 py-2 text-sm font-medium text-cyan hover:bg-secondary/80 transition-colors w-16 text-center"
              >
                {targetDoseUnit}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Card */}
      <div className={cn(
        "bg-surface border rounded-xl p-6 shadow-xl transition-all duration-300 relative overflow-hidden",
        result?.valid ? "border-cyan/30 glow-cyan" : "border-card-border"
      )}>
        {/* Subtle scanline overlay */}
        <div className="scanline absolute inset-0 opacity-20 pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div>
            <div className="text-xs font-medium text-cyan/70 uppercase tracking-widest mb-1">
              Draw Amount
            </div>
            <div className="flex items-baseline gap-2">
              <span 
                data-testid="text-result-units"
                className="text-5xl font-mono font-bold text-cyan text-shadow glow-text"
              >
                {result?.valid ? formatUnits(result.syringeUnits) : "0"}
              </span>
              <span className="text-lg text-muted-foreground font-mono">units</span>
            </div>
          </div>

          {result?.valid && (
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Concentration</div>
                <div className="font-mono text-sm">
                  {formatConcentration(result.concentrationMcgPerUnit)} <span className="text-muted-foreground text-xs">mcg/u</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strength</div>
                <div className="font-mono text-sm">
                  {formatConcentration(result.concentrationMgPerMl)} <span className="text-muted-foreground text-xs">mg/mL</span>
                </div>
              </div>
            </div>
          )}

          {result?.warnings && result.warnings.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-2">
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              data-testid="btn-log-dose"
              disabled={!result?.valid}
              onClick={handleLogDose}
              className="w-full bg-cyan text-black font-semibold py-3 rounded-md hover:bg-cyan/90 disabled:bg-cyan/20 disabled:text-cyan/40 disabled:cursor-not-allowed transition-all duration-200 uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(0,242,255,0.2)]"
            >
              Log Dose
            </button>
            
            <button 
              onClick={() => setShowFormula(!showFormula)}
              className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-cyan transition-colors uppercase tracking-widest"
            >
              <Info className="w-3 h-3" />
              {showFormula ? "Hide Formula" : "Show Formula"}
            </button>

            {showFormula && (
              <div className="text-xs font-mono text-center text-muted-foreground/70 bg-black/20 p-2 rounded">
                ({targetDose}{targetDoseUnit} / {vialSizeMg}mg) × {waterVolumeMl}mL = {result?.valid ? formatUnits(result.syringeUnits) : "0"} units
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}