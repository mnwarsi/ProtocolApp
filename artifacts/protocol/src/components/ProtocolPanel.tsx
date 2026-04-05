import { useState } from "react";
import { useProtocolStore, type ActiveProtocol } from "@/store/protocolStore";
import { COMPOUNDS, FREQUENCY_OPTIONS, getCompoundById } from "@/data/compounds";
import UpgradePrompt from "@/components/UpgradePrompt";
import {
  estimateWashoutDate,
  formatRelativeTime,
  getNextDoseTime,
  getHalfLifeLabel,
  resolveIntervalHours,
  washoutProgress,
} from "@/lib/mathEngine";
import { exportAsCSV, exportAsJSON } from "@/lib/export";
import {
  Plus,
  Trash2,
  Download,
  BookMarked,
  ChevronDown,
  Shield,
  ToggleLeft,
  ToggleRight,
  Beaker,
  Timer,
  Copy,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Protocol Card ────────────────────────────────────────────────────────────

function ProtocolCard({ protocol }: { protocol: ActiveProtocol }) {
  const { entries, removeProtocol, toggleProtocol } = useProtocolStore();

  const compound = getCompoundById(protocol.compoundId);

  // All log entries for this compound, newest first
  const compoundEntries = entries
    .filter((e) => e.compoundId === protocol.compoundId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastDose = compoundEntries[0];
  const lastDoseDate = lastDose ? new Date(lastDose.timestamp) : null;

  // ── Next dose (pass customIntervalHours through)
  const nextDose = lastDoseDate
    ? getNextDoseTime(lastDoseDate, protocol.frequency, protocol.customIntervalHours)
    : null;
  const overdue = nextDose && nextDose <= new Date();
  const overdueMs = overdue && nextDose ? Date.now() - nextDose.getTime() : 0;

  // ── Washout
  const washoutDate =
    compound && lastDoseDate
      ? estimateWashoutDate(lastDoseDate, compound.halfLifeHours)
      : null;
  const washoutPct =
    compound && lastDoseDate
      ? Math.round(washoutProgress(lastDoseDate, compound.halfLifeHours) * 100)
      : 0;
  const washoutDone = washoutPct >= 100;

  // ── Inventory
  const shotsPerVial = compound
    ? Math.floor(
        (protocol.vialAmount * 1000) /
          (protocol.doseUnit === "mg" ? protocol.dose * 1000 : protocol.dose)
      )
    : null;
  const dosesLogged = compoundEntries.length;
  const shotsRemaining = shotsPerVial !== null ? Math.max(0, shotsPerVial - dosesLogged) : null;
  const intervalHours = resolveIntervalHours(protocol.frequency, protocol.customIntervalHours);
  const dosesPerDay = 24 / intervalHours;
  const daysRemaining = shotsRemaining !== null && dosesPerDay > 0
    ? Math.floor(shotsRemaining / dosesPerDay)
    : null;
  const depletionDate = daysRemaining !== null
    ? new Date(Date.now() + daysRemaining * 86400_000)
    : null;
  const isLowStock = shotsRemaining !== null && shotsRemaining > 0 && shotsRemaining <= 3;

  return (
    <div
      className={cn(
        "border rounded-xl p-4 transition-all duration-200",
        protocol.active
          ? "bg-[#0d1313] border-cyan/20 hover:border-cyan/30"
          : "bg-[#0a0a0a] border-[#1a1a1a] opacity-60"
      )}
      style={protocol.active ? { boxShadow: "0 0 12px rgba(0,242,255,0.04)" } : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="text-xs font-semibold text-foreground/90">
            {protocol.compound}
          </div>
          <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
            {protocol.dose}{protocol.doseUnit} ·{" "}
            {FREQUENCY_OPTIONS.find((f) => f.key === protocol.frequency)?.label ?? protocol.frequency}
            {protocol.frequency === "custom" && protocol.customIntervalHours
              ? ` (${protocol.customIntervalHours}h)`
              : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleProtocol(protocol.id)}
            className="text-muted-foreground/50 hover:text-cyan transition-colors"
            title={protocol.active ? "Pause protocol" : "Resume protocol"}
          >
            {protocol.active ? (
              <ToggleRight className="w-5 h-5 text-cyan" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Remove ${protocol.compound} protocol?`)) {
                removeProtocol(protocol.id);
              }
            }}
            className="text-muted-foreground/30 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {protocol.active && (
        <div className="space-y-2 text-[10px]">
          {/* ── Next dose + last logged row ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-muted-foreground/50 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Timer className="w-3 h-3" />
                Next Dose
              </div>
              {nextDose ? (
                <div>
                  <div
                    className={cn(
                      "font-mono font-semibold leading-none",
                      overdue ? "text-amber-400" : "text-foreground/80"
                    )}
                  >
                    {overdue
                      ? `Overdue ${formatRelativeTime(new Date(Date.now() - overdueMs)).replace(" ago", "")}`
                      : formatRelativeTime(nextDose)}
                  </div>
                  <div className="text-muted-foreground/35 font-mono text-[8px] mt-0.5">
                    {nextDose.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {nextDose.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground/40 font-mono">Log first dose</div>
              )}
            </div>

            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-muted-foreground/50 uppercase tracking-wider mb-1">Last Logged</div>
              {lastDoseDate ? (
                <div>
                  <div className="font-mono text-foreground/70 leading-none">
                    {formatRelativeTime(lastDoseDate)}
                  </div>
                  <div className="text-muted-foreground/35 font-mono text-[8px] mt-0.5">
                    {lastDoseDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    {lastDoseDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground/40 font-mono">—</div>
              )}
            </div>
          </div>

          {/* ── Inventory row ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-muted-foreground/50 uppercase tracking-wider mb-1">Remaining</div>
              <div className={cn("font-mono font-semibold", isLowStock ? "text-amber-400" : "text-foreground/70")}>
                {shotsRemaining !== null ? `${shotsRemaining}` : "—"}
                <span className="text-muted-foreground/40 font-normal text-[8px] ml-0.5">shots</span>
              </div>
              {isLowStock && (
                <div className="text-amber-400/70 text-[8px] font-mono mt-0.5">Low stock</div>
              )}
            </div>

            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-muted-foreground/50 uppercase tracking-wider mb-1">Days Left</div>
              <div className="font-mono text-foreground/70">
                {daysRemaining !== null ? daysRemaining : "—"}
                {daysRemaining !== null && <span className="text-muted-foreground/40 font-normal text-[8px] ml-0.5">d</span>}
              </div>
            </div>

            <div className="bg-black/20 rounded-lg p-2">
              <div className="text-muted-foreground/50 uppercase tracking-wider mb-1">Depletes</div>
              <div className="font-mono text-foreground/70 text-[9px] leading-tight">
                {depletionDate
                  ? depletionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </div>
            </div>
          </div>

          {/* ── Washout clearance progress ── */}
          {compound && (
            <div className="bg-black/20 rounded-lg p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground/50 uppercase tracking-wider">
                  Clearance — t½ {getHalfLifeLabel(compound.halfLifeHours)}
                </div>
                <span className={cn("font-mono font-semibold", washoutDone ? "text-cyan" : "text-foreground/60")}>
                  {washoutPct}%
                </span>
              </div>
              <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${washoutPct}%`,
                    background: washoutDone
                      ? "rgba(0,242,255,0.7)"
                      : "rgba(0,242,255,0.35)",
                    boxShadow: washoutDone ? "0 0 6px rgba(0,242,255,0.5)" : undefined,
                  }}
                />
              </div>
              {washoutDate && !washoutDone && (
                <div className="text-[8px] font-mono text-muted-foreground/30">
                  Clears {washoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  · {formatRelativeTime(washoutDate)}
                </div>
              )}
              {washoutDone && (
                <div className="text-[8px] font-mono text-cyan/50">Fully cleared</div>
              )}
            </div>
          )}
        </div>
      )}

      {protocol.notes && (
        <div className="mt-2 text-[9px] text-muted-foreground/40 font-mono italic border-t border-white/5 pt-2">
          {protocol.notes}
        </div>
      )}
    </div>
  );
}

// ─── Add Protocol Form ────────────────────────────────────────────────────────

function AddProtocolForm({ onClose }: { onClose: () => void }) {
  const { addProtocol } = useProtocolStore();

  const [compoundId, setCompoundId] = useState(COMPOUNDS[0].id);
  const [dose, setDose] = useState(COMPOUNDS[0].defaultDose);
  const [doseUnit, setDoseUnit] = useState(COMPOUNDS[0].defaultDoseUnit);
  const [frequency, setFrequency] = useState<string>(COMPOUNDS[0].commonFrequencies[0]);
  const [customIntervalHours, setCustomIntervalHours] = useState(24);
  const [vialAmount, setVialAmount] = useState(COMPOUNDS[0].defaultVialSizeMg);
  const [waterAmount, setWaterAmount] = useState(COMPOUNDS[0].defaultWaterVolumeMl);
  const [notes, setNotes] = useState("");

  const handleCompoundChange = (id: string) => {
    const c = getCompoundById(id);
    if (c) {
      setCompoundId(id);
      setDose(c.defaultDose);
      setDoseUnit(c.defaultDoseUnit);
      setFrequency(c.commonFrequencies[0]);
      setVialAmount(c.defaultVialSizeMg);
      setWaterAmount(c.defaultWaterVolumeMl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const compound = getCompoundById(compoundId)!;
    addProtocol({
      compoundId,
      compound: compound.name,
      dose,
      doseUnit: doseUnit as "mcg" | "mg",
      frequency: frequency as ActiveProtocol["frequency"],
      customIntervalHours: frequency === "custom" ? customIntervalHours : undefined,
      startDate: new Date().toISOString(),
      vialAmount,
      waterAmount,
      notes: notes || undefined,
      active: true,
    });
    onClose();
  };

  const inputClass =
    "w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c]">
      <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
        New Protocol
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Compound</label>
        <div className="relative">
          <select
            value={compoundId}
            onChange={(e) => handleCompoundChange(e.target.value)}
            className={cn(inputClass, "appearance-none pr-8")}
          >
            {COMPOUNDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName} — {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Dose</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={dose}
            onChange={(e) => setDose(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Unit</label>
          <div className="relative">
            <select
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value as "mcg" | "mg")}
              className={cn(inputClass, "appearance-none pr-8")}
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Frequency</label>
        <div className="relative">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className={cn(inputClass, "appearance-none pr-8")}
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
        </div>
      </div>

      {frequency === "custom" && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Interval (hours)</label>
          <input
            type="number"
            min="1"
            value={customIntervalHours}
            onChange={(e) => setCustomIntervalHours(parseInt(e.target.value) || 24)}
            className={inputClass}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Vial (mg)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={vialAmount}
            onChange={(e) => setVialAmount(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Water (mL)</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={waterAmount}
            onChange={(e) => setWaterAmount(parseFloat(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Storage, cycle notes…"
          className={inputClass}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 bg-cyan text-black font-bold py-2 rounded-md hover:bg-cyan/90 transition-all text-xs uppercase tracking-widest"
          style={{ boxShadow: "0 0 12px rgba(0,242,255,0.15)" }}
        >
          Add Protocol
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs text-muted-foreground/60 border border-[#222] rounded-md hover:border-[#333] hover:text-muted-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Security Settings ────────────────────────────────────────────────────────

function SecurityPanel() {
  const { hasPassphrase, setPassphrase, removePassphrase, autoLockMinutes, setAutoLockMinutes, lock } =
    useProtocolStore();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSetPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setError("Min 6 characters."); return; }
    if (pw !== confirm) { setError("Passphrases don't match."); return; }
    try {
      await setPassphrase(pw);
      setStatus("Passphrase set. Data is now encrypted.");
      setPw(""); setConfirm(""); setError(null);
    } catch { setError("Failed to set passphrase."); }
  };

  const handleRemovePw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await removePassphrase(pw);
      setStatus("Passphrase removed. Data stored in plain.");
      setPw(""); setError(null);
    } catch { setError("Incorrect passphrase."); }
  };

  const inputClass = "w-full bg-[#111] border border-[#222] rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-cyan/50 focus:ring-1 focus:ring-cyan/20 transition-colors";

  return (
    <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-cyan/60" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Security</span>
        <span className={cn("ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded",
          hasPassphrase ? "bg-cyan/10 text-cyan/70" : "bg-[#1e1e1e] text-muted-foreground/40"
        )}>
          {hasPassphrase ? "ENCRYPTED" : "PLAIN"}
        </span>
      </div>

      {status && <p className="text-xs text-cyan/70 font-mono">{status}</p>}
      {error && <p className="text-xs text-destructive font-mono">{error}</p>}

      <form onSubmit={hasPassphrase ? handleRemovePw : handleSetPw} className="space-y-2">
        <input
          type="password"
          placeholder={hasPassphrase ? "Current passphrase to remove" : "New passphrase"}
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError(null); }}
          className={inputClass}
        />
        {!hasPassphrase && (
          <input
            type="password"
            placeholder="Confirm passphrase"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            className={inputClass}
          />
        )}
        <button
          type="submit"
          disabled={!pw}
          className="w-full border border-[#222] hover:border-cyan/30 text-muted-foreground/70 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
        >
          {hasPassphrase ? "Remove Passphrase" : "Set Passphrase"}
        </button>
      </form>

      {hasPassphrase && (
        <div className="space-y-2 border-t border-[#1a1a1a] pt-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Auto-lock (min)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(parseInt(e.target.value) || 15)}
              className="w-16 bg-[#111] border border-[#222] rounded px-2 py-1 text-xs font-mono text-foreground text-center focus:outline-none focus:border-cyan/50 transition-colors"
            />
          </div>
          <button
            onClick={() => lock()}
            className="w-full border border-destructive/20 hover:border-destructive/40 text-destructive/60 hover:text-destructive py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
          >
            Lock Now
          </button>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/25 font-mono leading-relaxed">
        AES-256-GCM encryption via Web Crypto API. Passphrase never stored or transmitted. Data stays local.
      </p>
    </div>
  );
}

// ─── Main ProtocolPanel ───────────────────────────────────────────────────────

export default function ProtocolPanel() {
  const { protocols, templates, entries, tier, saveTemplate, loadTemplate, deleteTemplate, renameTemplate, duplicateTemplate } =
    useProtocolStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const activeProtocols = protocols.filter((p) => p.active);
  const pausedProtocols = protocols.filter((p) => !p.active);

  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Protocol Manager
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (tier !== "pro" && protocols.length >= 1) {
                setShowUpgrade(true);
                return;
              }
              setShowAddForm((v) => !v);
              setShowTemplates(false);
            }}
            className={cn(
              "flex items-center gap-1 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded border transition-colors",
              showAddForm
                ? "border-cyan/40 text-cyan"
                : "border-[#222] text-muted-foreground/60 hover:border-[#333] hover:text-muted-foreground"
            )}
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Free tier upgrade prompt */}
      {showUpgrade && (
        <UpgradePrompt
          feature="Multiple Protocols"
          description="Protocol Pro lets you track unlimited compounds simultaneously. Upgrade to add more protocols and unlock the Biofeedback tab."
          onDismiss={() => setShowUpgrade(false)}
        />
      )}

      {/* Add form */}
      {showAddForm && <AddProtocolForm onClose={() => setShowAddForm(false)} />}

      {/* Active protocols */}
      {activeProtocols.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-0.5">
            <Beaker className="w-3 h-3 text-cyan/60" />
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Active</span>
            <span className="text-[9px] text-muted-foreground/35 font-mono">({activeProtocols.length})</span>
          </div>
          {activeProtocols.map((p) => (
            <ProtocolCard key={p.id} protocol={p} />
          ))}
        </div>
      )}

      {/* Paused protocols */}
      {pausedProtocols.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Paused</span>
          </div>
          {pausedProtocols.map((p) => (
            <ProtocolCard key={p.id} protocol={p} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {protocols.length === 0 && !showAddForm && (
        <div className="border border-dashed border-[#1e1e1e] rounded-xl p-8 text-center space-y-3">
          <Beaker className="w-6 h-6 text-muted-foreground/15 mx-auto" />
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-widest">No protocols</p>
            <p className="text-[10px] text-muted-foreground/25 max-w-[200px] mx-auto leading-relaxed">
              Add a protocol to track schedules, timers, and washout windows.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cyan/60 hover:text-cyan border border-cyan/20 hover:border-cyan/40 px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add first protocol
          </button>
        </div>
      )}

      {/* Templates */}
      <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookMarked className="w-3.5 h-3.5 text-cyan/50" />
            <span className="uppercase tracking-widest font-semibold">Templates</span>
            {templates.length > 0 && (
              <span className="font-mono text-muted-foreground/35">({templates.length})</span>
            )}
          </div>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showTemplates && "rotate-180")} />
        </button>

        {showTemplates && (
          <div className="px-4 pb-4 space-y-3 border-t border-[#1a1a1a]">
            {/* Save current */}
            {protocols.length > 0 && (
              <div className="flex gap-2 pt-3">
                <input
                  type="text"
                  placeholder="Template name…"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1 bg-[#111] border border-[#222] rounded-md px-3 py-2 text-xs font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:border-cyan/50 transition-colors min-w-0"
                />
                <button
                  onClick={() => {
                    if (templateName.trim()) {
                      saveTemplate(templateName.trim());
                      setTemplateName("");
                    }
                  }}
                  disabled={!templateName.trim()}
                  className="px-3 py-2 text-xs text-cyan/70 border border-cyan/20 rounded-md hover:border-cyan/40 hover:text-cyan disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            )}

            {templates.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/30 font-mono py-2">No saved templates.</p>
            ) : (
              <div className="space-y-1.5">
                {templates.map((t) => (
                  <div key={t.id} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2">
                    {renamingId === t.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && renameValue.trim()) {
                              renameTemplate(t.id, renameValue.trim());
                              setRenamingId(null);
                            } else if (e.key === "Escape") {
                              setRenamingId(null);
                            }
                          }}
                          className="flex-1 bg-[#111] border border-cyan/30 rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-cyan/60 min-w-0"
                        />
                        <button
                          onClick={() => {
                            if (renameValue.trim()) {
                              renameTemplate(t.id, renameValue.trim());
                            }
                            setRenamingId(null);
                          }}
                          className="text-cyan/60 hover:text-cyan transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRenamingId(null)}
                          className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-foreground/80">{t.name}</div>
                          <div className="text-[9px] text-muted-foreground/40 font-mono">
                            {t.protocols.length} protocol{t.protocols.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (window.confirm(`Load "${t.name}"? This replaces your current protocols.`)) {
                                loadTemplate(t.id);
                              }
                            }}
                            className="text-[10px] text-cyan/60 hover:text-cyan uppercase tracking-wider transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => duplicateTemplate(t.id)}
                            title="Duplicate template"
                            className="text-muted-foreground/30 hover:text-foreground/60 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                            title="Rename template"
                            className="text-muted-foreground/30 hover:text-foreground/60 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(t.id)}
                            title="Delete template"
                            className="text-muted-foreground/30 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export */}
      {entries.length > 0 && (
        <div className="border border-[#1a1a1a] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-3.5 h-3.5 text-cyan/50" />
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Export Log</span>
            <span className="text-[9px] text-muted-foreground/35 font-mono ml-auto">{entries.length} entries</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => exportAsCSV(entries)}
              className="flex-1 border border-[#222] hover:border-cyan/30 text-muted-foreground/60 hover:text-foreground py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => exportAsJSON(entries)}
              className="flex-1 border border-[#222] hover:border-cyan/30 text-muted-foreground/60 hover:text-foreground py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              JSON
            </button>
          </div>
        </div>
      )}

      {/* Security */}
      <button
        onClick={() => setShowSecurity((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border border-[#1a1a1a] rounded-xl text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-cyan/50" />
          <span className="uppercase tracking-widest font-semibold">Security & Encryption</span>
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showSecurity && "rotate-180")} />
      </button>

      {showSecurity && <SecurityPanel />}
    </div>
  );
}
