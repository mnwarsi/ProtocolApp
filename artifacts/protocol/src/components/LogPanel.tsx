import { useState } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import { exportAsCSV, exportAsJSON } from "@/lib/export";
import ProtocolTimeline from "@/components/ProtocolTimeline";
import DoseCalendar from "@/components/DoseCalendar";
import { compoundColor } from "@/lib/compoundColor";
import {
  formatRelativeTime,
  formatUnits,
  formatConcentration,
} from "@/lib/mathEngine";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

function SectionHeader({
  label,
  badge,
  open,
  onToggle,
  color,
}: {
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between group"
    >
      <div className="flex items-center gap-2">
        {color ? (
          <div className="w-1 h-3.5 rounded-full" style={{ background: color }} />
        ) : (
          <div className="w-1 h-3.5 rounded-full bg-cyan/50" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        {badge && (
          <span className="text-[9px] font-mono text-muted-foreground/30">{badge}</span>
        )}
      </div>
      {open ? (
        <ChevronUp className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      ) : (
        <ChevronDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
      )}
    </button>
  );
}

export default function LogPanel() {
  const { protocols, entries, deleteEntry, clearAll, tier } = useProtocolStore();
  const activeProtocols = protocols.filter((p) => p.active);

  const [showTimeline, setShowTimeline] = useState(activeProtocols.length > 0);
  const [showCalendar, setShowCalendar] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [highlight, setHighlight] = useState<string | undefined>(undefined);

  // Color legend for active compounds
  const legendCompounds = activeProtocols.map((p) => ({
    id: p.compoundId,
    name: p.compound,
    color: compoundColor(p.compoundId),
  }));

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-500">
      {/* Compound color legend */}
      {legendCompounds.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {legendCompounds.map(({ id, name, color }) => (
            <button
              key={id}
              onClick={() => setHighlight(highlight === id ? undefined : id)}
              className={cn(
                "flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-all",
                highlight === id
                  ? "border-current"
                  : "border-[#1e1e1e] hover:border-[#2a2a2a]"
              )}
              style={{ color: highlight === id ? color : `${color}88` }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
              {name.split(" ")[0]}
            </button>
          ))}
          {highlight && (
            <button
              onClick={() => setHighlight(undefined)}
              className="text-[9px] font-mono text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors px-1"
            >
              clear
            </button>
          )}
        </div>
      )}

      {/* ── Zone 1: Cycle Timeline ── */}
      <div className="space-y-2">
        <SectionHeader
          label="Cycle Timeline"
          open={showTimeline}
          onToggle={() => setShowTimeline((v) => !v)}
        />
        {showTimeline && (
          <ProtocolTimeline
            highlight={highlight}
            onHighlight={setHighlight}
          />
        )}
      </div>

      {/* ── Zone 2: Dose Calendar ── */}
      <div className="space-y-2">
        <SectionHeader
          label="Dose Calendar"
          badge={entries.length > 0 ? `${entries.length} logged` : undefined}
          open={showCalendar}
          onToggle={() => setShowCalendar((v) => !v)}
        />
        {showCalendar && <DoseCalendar highlight={highlight} />}
      </div>

      {/* ── Zone 3: Raw History ── */}
      <div className="space-y-2">
        <SectionHeader
          label="History"
          badge={entries.length > 0 ? `${entries.length} entries` : undefined}
          open={showHistory}
          onToggle={() => setShowHistory((v) => !v)}
        />
        {showHistory && (
          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="border border-[#1a1a1a] rounded-xl px-4 py-8 flex flex-col items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground/20" />
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-semibold">No entries</p>
              </div>
            ) : (
              <>
                {/* Clear button */}
                <div className="flex justify-end px-1">
                  <button
                    onClick={() => {
                      if (window.confirm("Clear all log entries?")) clearAll();
                    }}
                    className="text-[10px] text-muted-foreground/30 hover:text-destructive transition-colors uppercase tracking-widest"
                  >
                    Clear all
                  </button>
                </div>


                {/* Group by compound */}
                {Array.from(
                  entries.reduce((map, e) => {
                    const arr = map.get(e.compoundId) ?? [];
                    arr.push(e);
                    map.set(e.compoundId, arr);
                    return map;
                  }, new Map<string, typeof entries>())
                ).filter(([cid]) => !highlight || cid === highlight)
                  .map(([cid, group]) => {
                    const color = compoundColor(cid);
                    return (
                      <div key={cid}>
                        <div className="flex items-center gap-2 mb-1.5 px-0.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                            {group[0].compound}
                          </span>
                          <div className="flex-1 h-px" style={{ background: `${color}22` }} />
                          <span className="text-[9px] text-muted-foreground/40 font-mono">{group.length}×</span>
                        </div>
                        <div className="space-y-1">
                          {group.map((entry) => (
                            <div
                              key={entry.id}
                              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 group hover:border-[#252525] transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="font-mono font-bold text-sm leading-none" style={{ color }}>
                                    {formatUnits(entry.units)}
                                    <span className="text-[10px] text-muted-foreground/50 ml-0.5">u</span>
                                  </span>
                                  <div className="w-px h-5 bg-[#1e1e1e]" />
                                  <div className="min-w-0">
                                    <div className="text-[10px] font-mono text-foreground/65 leading-none mb-0.5">
                                      {entry.dose}{entry.doseUnit}
                                    </div>
                                    <div className="text-[8px] font-mono text-muted-foreground/35 leading-none">
                                      {formatConcentration(entry.concentrationMcgPerUnit)} mcg/u
                                      <span className="mx-1 opacity-40">·</span>
                                      {formatConcentration(entry.concentrationMgPerMl)} mg/mL
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 ml-2 shrink-0">
                                  <span className="text-[8px] font-mono text-muted-foreground/35 whitespace-nowrap">
                                    {formatRelativeTime(new Date(entry.timestamp))}
                                  </span>
                                  <button
                                    onClick={() => deleteEntry(entry.id)}
                                    className="text-muted-foreground/25 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {/* Symptom tags + note */}
                              {(entry.symptomTags?.length || entry.symptomNote) && (
                                <div className="mt-1.5 pt-1.5 border-t border-[#1a1a1a] space-y-1">
                                  {entry.symptomTags && entry.symptomTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {entry.symptomTags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan/5 border border-cyan/15 text-cyan/50"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {entry.symptomNote && (
                                    <p className="text-[8px] font-mono text-muted-foreground/40 italic leading-relaxed">
                                      "{entry.symptomNote}"
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

              </>
            )}

            {/* Export — Pro only — always visible when History is open */}
            <div className="border border-[#1a1a1a] rounded-xl p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <Download className="w-3 h-3 text-cyan/40" />
                  <span className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest">Export</span>
                  <span className="text-[9px] text-muted-foreground/25 font-mono">{entries.length} entries</span>
                </div>
                {tier === "pro" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportAsCSV(entries)}
                      className="text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-foreground border border-[#1e1e1e] hover:border-[#2e2e2e] px-2.5 py-1 rounded transition-colors"
                    >
                      CSV
                    </button>
                    <button
                      onClick={() => exportAsJSON(entries)}
                      className="text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-foreground border border-[#1e1e1e] hover:border-[#2e2e2e] px-2.5 py-1 rounded transition-colors"
                    >
                      JSON
                    </button>
                  </div>
                ) : (
                  <span className="text-[9px] font-mono px-2 py-1 rounded bg-cyan/5 border border-cyan/15 text-cyan/50 uppercase tracking-wider">
                    Pro
                  </span>
                )}
              </div>
              {tier !== "pro" && (
                <p className="text-[9px] text-muted-foreground/25 mt-1.5 font-mono">
                  Upgrade to Protocol Pro to export your logs as CSV or JSON.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
