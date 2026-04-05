import { useState, useEffect } from "react";
import { useProtocolStore, type DoseLogEntry } from "@/store/protocolStore";
import { formatRelativeTime, formatUnits, formatConcentration } from "@/lib/mathEngine";
import { exportAsCSV, exportAsJSON } from "@/lib/export";
import { compoundColor } from "@/lib/compoundColor";
import { Trash2, Syringe, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type CompoundFilter = "all" | string;

function groupByCompound(entries: DoseLogEntry[]): Map<string, DoseLogEntry[]> {
  const map = new Map<string, DoseLogEntry[]>();
  for (const entry of entries) {
    const group = map.get(entry.compoundId) ?? [];
    group.push(entry);
    map.set(entry.compoundId, group);
  }
  return map;
}

interface DoseLogProps {
  highlightedCompoundId?: string | null;
}

export default function DoseLog({ highlightedCompoundId }: DoseLogProps) {
  const { entries, deleteEntry, clearAll } = useProtocolStore();
  const [filter, setFilter] = useState<CompoundFilter>("all");

  useEffect(() => {
    if (highlightedCompoundId) {
      setFilter(highlightedCompoundId);
    } else {
      setFilter("all");
    }
  }, [highlightedCompoundId]);

  const compoundGroups = groupByCompound(entries);
  const compoundIds = Array.from(compoundGroups.keys());

  const activeFilter = highlightedCompoundId ?? filter;

  const filteredEntries =
    activeFilter === "all" ? entries : (compoundGroups.get(activeFilter) ?? []);

  const displayGroups =
    activeFilter === "all"
      ? compoundIds.map((id) => ({ id, entries: compoundGroups.get(id)! }))
      : [{ id: activeFilter, entries: filteredEntries }];

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Dose Log
          </h2>
        </div>
        {entries.length > 0 && (
          <button
            data-testid="btn-clear-all"
            onClick={() => {
              if (window.confirm("Clear all log entries?")) {
                clearAll();
                setFilter("all");
              }
            }}
            className="text-[10px] text-muted-foreground/50 hover:text-destructive transition-colors uppercase tracking-widest"
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-card border border-[#1e1e1e] rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center gap-2 opacity-20">
            <div className="h-px w-8 bg-cyan" />
            <Syringe className="w-5 h-5 text-cyan rotate-90" />
            <div className="h-px w-8 bg-cyan" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
              No doses logged
            </p>
            <p className="text-[10px] text-muted-foreground/35 max-w-[180px] leading-relaxed">
              Calculate, verify, then log — entries appear here instantly.
            </p>
          </div>
          <div className="w-full border border-dashed border-[#1f1f1f] rounded-lg p-3 space-y-1.5 mt-1">
            {["Compound", "Draw", "mcg/u", "Time"].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground/25">{label}</span>
                <div className="h-1 w-16 rounded-full bg-[#1e1e1e]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Compound filter pills — only shown when not controlled by timeline highlight */}
          {!highlightedCompoundId && compoundIds.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap px-0.5">
              <button
                data-testid="filter-all"
                onClick={() => setFilter("all")}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded border transition-colors uppercase tracking-wider font-medium",
                  filter === "all"
                    ? "border-cyan/50 text-cyan bg-cyan/8"
                    : "border-[#222] text-muted-foreground/60 hover:border-cyan/30 hover:text-muted-foreground"
                )}
              >
                All
              </button>
              {compoundIds.map((id) => {
                const color = compoundColor(id);
                const label = compoundGroups.get(id)![0].compound;
                return (
                  <button
                    key={id}
                    data-testid={`filter-${id}`}
                    onClick={() => setFilter(id)}
                    style={
                      filter === id
                        ? { borderColor: color.border, color: color.text, backgroundColor: color.bg }
                        : undefined
                    }
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded border transition-colors uppercase tracking-wider font-medium",
                      filter === id
                        ? ""
                        : "border-[#222] text-muted-foreground/60 hover:border-[#333] hover:text-muted-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-5">
            {displayGroups.map(({ id, entries: groupEntries }) => {
              const color = compoundColor(id);
              return (
                <div key={id}>
                  {/* Group header — colored by compound */}
                  <div className="flex items-center gap-2 mb-2 px-0.5">
                    <div
                      className="w-1 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: color.dot, boxShadow: `0 0 6px ${color.dot}` }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: color.text }}
                    >
                      {groupEntries[0].compound}
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{
                        background: `linear-gradient(to right, ${color.border}, transparent)`,
                      }}
                    />
                    <span className="text-[9px] text-muted-foreground/50 font-mono">
                      {groupEntries.length}×
                    </span>
                  </div>

                  {/* Entries */}
                  <div className="space-y-1.5">
                    {groupEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 shadow-sm group transition-colors flex items-center justify-between animate-in slide-in-from-left-1 duration-200"
                        style={{
                          ["--hover-border" as string]: color.border,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor = color.border.replace("0.5", "0.3"))
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor = "#1e1e1e")
                        }
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Draw amount — colored by compound */}
                          <div className="shrink-0">
                            <span
                              className="font-mono font-bold text-base leading-none"
                              style={{ color: color.text }}
                            >
                              {formatUnits(entry.units)}
                            </span>
                            <span className="text-muted-foreground/50 font-mono text-[10px] ml-0.5">u</span>
                          </div>
                          {/* Divider */}
                          <div className="w-px h-6 bg-[#222] shrink-0" />
                          {/* Dose + concentration */}
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-foreground/70 leading-none mb-0.5">
                              {entry.dose}{entry.doseUnit}
                            </div>
                            <div className="text-[9px] font-mono text-muted-foreground/45 leading-none">
                              {formatConcentration(entry.concentrationMcgPerUnit)} mcg/u
                              <span className="mx-1 opacity-40">·</span>
                              {formatConcentration(entry.concentrationMgPerMl)} mg/mL
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                          <span className="text-[9px] text-muted-foreground/40 font-mono whitespace-nowrap">
                            {formatRelativeTime(new Date(entry.timestamp))}
                          </span>
                          <button
                            data-testid={`btn-delete-entry-${entry.id}`}
                            onClick={() => deleteEntry(entry.id)}
                            className="text-muted-foreground/30 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-all p-0.5"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export section */}
          <div className="border border-[#1a1a1a] rounded-xl p-3 mt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Download className="w-3 h-3 text-cyan/50" />
                <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Export</span>
                <span className="text-[9px] text-muted-foreground/30 font-mono">{entries.length} entries</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportAsCSV(entries)}
                  className="text-[10px] uppercase tracking-widest text-muted-foreground/50 hover:text-foreground border border-[#222] hover:border-[#333] px-2.5 py-1 rounded transition-colors"
                >
                  CSV
                </button>
                <button
                  onClick={() => exportAsJSON(entries)}
                  className="text-[10px] uppercase tracking-widest text-muted-foreground/50 hover:text-foreground border border-[#222] hover:border-[#333] px-2.5 py-1 rounded transition-colors"
                >
                  JSON
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
