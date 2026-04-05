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
            const date = new Date(entry.timestamp);
            const showDateHeader = index === 0 || new Date(entries[index - 1].timestamp).toLocaleDateString() !== date.toLocaleDateString();
            
            return (
              <div key={entry.id} className="animate-in slide-in-from-left-2 duration-300">
                {showDateHeader && (
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2 mt-4 px-1">
                    {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                )}
                
                <div className="bg-card border border-card-border rounded-lg p-4 shadow-sm group hover:border-cyan/30 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{entry.compound}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.dose}{entry.doseUnit}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-cyan font-mono font-medium">
                        {formatUnits(entry.units)}u
                      </span>
                      <span className="text-muted-foreground font-mono">
                        ({formatConcentration(entry.concentrationMcgPerUnit)} mcg/u)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(date)}
                    </span>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all p-1"
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