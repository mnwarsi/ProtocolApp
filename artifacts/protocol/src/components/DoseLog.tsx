import { useProtocolStore } from "@/store/protocolStore";
import { formatRelativeTime, formatUnits, formatConcentration } from "@/lib/mathEngine";
import { Trash2, History } from "lucide-react";

export default function DoseLog() {
  const { entries, deleteEntry, clearAll } = useProtocolStore();

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
        <div className="space-y-3">
          {entries.map((entry, index) => {
            const prevEntry = entries[index - 1];
            const showCompoundHeader = index === 0 || prevEntry?.compoundId !== entry.compoundId;

            return (
              <div key={entry.id} className="animate-in slide-in-from-left-2 duration-300">
                {showCompoundHeader && (
                  <div className="flex items-center gap-2 mt-4 mb-2 px-1 first:mt-0">
                    <span className="text-[10px] font-semibold text-cyan uppercase tracking-widest">
                      {entry.compound}
                    </span>
                    <div className="flex-1 h-px bg-cyan/15" />
                  </div>
                )}

                <div className="bg-card border border-card-border rounded-lg p-4 shadow-sm group hover:border-cyan/30 transition-colors flex items-center justify-between">
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
