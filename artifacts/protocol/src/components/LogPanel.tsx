import { useState } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import ProtocolTimeline from "@/components/ProtocolTimeline";
import DoseCalendar from "@/components/DoseCalendar";
import DoseLog from "@/components/DoseLog";
import { ChevronDown, ChevronRight, GitBranch, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LogPanel() {
  const { entries, protocols } = useProtocolStore();
  const [highlightedCompoundId, setHighlightedCompoundId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">

      {/* ── Section 1: Protocol Timeline ── */}
      <section className="bg-card border border-[#1e1e1e] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-cyan/60" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Protocol Timeline
          </h2>
          {highlightedCompoundId && (
            <button
              onClick={() => setHighlightedCompoundId(null)}
              className="ml-auto text-[9px] text-cyan/60 hover:text-cyan transition-colors uppercase tracking-wider font-mono"
            >
              Clear filter
            </button>
          )}
        </div>
        <ProtocolTimeline
          protocols={protocols}
          entries={entries}
          highlightedCompoundId={highlightedCompoundId}
          onHighlight={setHighlightedCompoundId}
        />
      </section>

      {/* ── Section 2: Dose Calendar ── */}
      <section className="bg-card border border-[#1e1e1e] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-cyan/60" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Dose Calendar
          </h2>
          {highlightedCompoundId && (
            <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono uppercase tracking-wider">
              filtered
            </span>
          )}
        </div>
        <DoseCalendar
          entries={entries}
          highlightedCompoundId={highlightedCompoundId}
        />
      </section>

      {/* ── Section 3: History (collapsible) ── */}
      <section className="bg-card border border-[#1e1e1e] rounded-xl overflow-hidden">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-cyan/60" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            History
          </h2>
          <span className="ml-1 text-[9px] text-muted-foreground/35 font-mono">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
          <span className="ml-auto text-muted-foreground/40">
            {historyOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {historyOpen && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
            <DoseLog highlightedCompoundId={highlightedCompoundId} />
          </div>
        )}
      </section>
    </div>
  );
}
