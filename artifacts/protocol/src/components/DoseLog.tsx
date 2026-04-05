import { useState } from "react";
import { useProtocolStore, type DoseLogEntry } from "@/store/protocolStore";
import { formatRelativeTime, formatUnits, formatConcentration } from "@/lib/mathEngine";
import { Trash2, History } from "lucide-react";
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

export default function DoseLog() {
  const { entries, deleteEntry, clearAll } = useProtocolStore();
  const [filter, setFilter] = useState<CompoundFilter>("all");

  const compoundGroups = groupByCompound(entries);
  const compoundIds = Array.from(compoundGroups.keys());

  const filteredEntries =
    filter === "all" ? entries : (compoundGroups.get(filter) ?? []);

  const displayGroups =
    filter === "all"
      ? compoundIds.map((id) => ({ id, entries: compoundGroups.get(id)! }))
      : [{ id: filter, entries: filteredEntries }];

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-cyan" />
          Recent Log
        </h2>
        {entries.length > 0 && (
          <button
            data-testid="btn-clear-all"
            onClick={() => {
              if (window.confirm("Clear all log entries?")) {
                clearAll();
                setFilter("all");
              }
            }}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest"
          >
            Clear All
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-card border border-card-border border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <History className="w-5 h-5" />
          </div>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            No doses logged yet. Use the calculator to log your first dose.
          </p>
        </div>
      ) : (
        <>
          {compoundIds.length > 1 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                data-testid="filter-all"
                onClick={() => setFilter("all")}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  filter === "all"
                    ? "border-cyan text-cyan bg-cyan/10"
                    : "border-border text-muted-foreground hover:border-cyan/50"
                )}
              >
                All
              </button>
              {compoundIds.map((id) => {
                const label = compoundGroups.get(id)![0].compound;
                return (
                  <button
                    key={id}
                    data-testid={`filter-${id}`}
                    onClick={() => setFilter(id)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      filter === id
                        ? "border-cyan text-cyan bg-cyan/10"
                        : "border-border text-muted-foreground hover:border-cyan/50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-6">
            {displayGroups.map(({ id, entries: groupEntries }) => (
              <div key={id}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[10px] font-semibold text-cyan uppercase tracking-widest">
                    {groupEntries[0].compound}
                  </span>
                  <div className="flex-1 h-px bg-cyan/15" />
                  <span className="text-[10px] text-muted-foreground">
                    {groupEntries.length} {groupEntries.length === 1 ? "dose" : "doses"}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-card border border-card-border rounded-lg p-4 shadow-sm group hover:border-cyan/30 transition-colors flex items-center justify-between animate-in slide-in-from-left-2 duration-300"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan font-mono font-semibold">
                            {formatUnits(entry.units)}u
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {entry.dose}{entry.doseUnit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span>{formatConcentration(entry.concentrationMcgPerUnit)} mcg/u</span>
                          <span>{formatConcentration(entry.concentrationMgPerMl)} mg/mL</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(new Date(entry.timestamp))}
                        </span>
                        <button
                          data-testid={`btn-delete-entry-${entry.id}`}
                          onClick={() => deleteEntry(entry.id)}
                          className="text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-all p-1"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
