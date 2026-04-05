import { useState, useMemo } from "react";
import { useProtocolStore, type DoseLogEntry } from "@/store/protocolStore";
import { compoundColor } from "@/lib/compoundColor";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUnits } from "@/lib/mathEngine";

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

interface DoseCalendarProps {
  highlight?: string;
}

export default function DoseCalendar({ highlight }: DoseCalendarProps) {
  const { entries } = useProtocolStore();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  // Build calendar grid: weeks × 7 days
  const { cells, firstDay } = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth);
    const startDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d));
    }
    // Pad to full 7-column rows
    while (cells.length % 7 !== 0) cells.push(null);
    return { cells, firstDay: first };
  }, [viewYear, viewMonth]);

  // Group entries by day string "YYYY-MM-DD"
  const entriesByDay = useMemo(() => {
    const map = new Map<string, DoseLogEntry[]>();
    for (const e of entries) {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return map;
  }, [entries]);

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function getCompoundsForDay(d: Date): { compoundId: string; compound: string }[] {
    const dayEntries = entriesByDay.get(dayKey(d)) ?? [];
    const seen = new Set<string>();
    const result: { compoundId: string; compound: string }[] = [];
    for (const e of dayEntries) {
      if (!seen.has(e.compoundId)) {
        seen.add(e.compoundId);
        result.push({ compoundId: e.compoundId, compound: e.compound });
      }
    }
    return result;
  }

  const today = useMemo(() => new Date(), []);

  const selectedEntries = selectedDay
    ? (entriesByDay.get(dayKey(selectedDay)) ?? []).filter(
        (e) => !highlight || e.compoundId === highlight
      )
    : [];

  return (
    <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#161616]">
        <button
          onClick={prevMonth}
          className="p-1 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground/70">
          {firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-2.5 pt-2 pb-2.5">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-[8px] font-mono text-muted-foreground/25 py-1">
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const compounds = getCompoundsForDay(day);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const hasDoses = compounds.length > 0;
            const filteredCompounds = highlight
              ? compounds.filter((c) => c.compoundId === highlight)
              : compounds;
            const showDots = filteredCompounds.slice(0, 3);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  "relative flex flex-col items-center justify-start pt-0.5 pb-1 rounded transition-colors min-h-[36px]",
                  isSelected
                    ? "bg-cyan/8 border border-cyan/30"
                    : hasDoses
                    ? "hover:bg-[#111] border border-transparent"
                    : "border border-transparent opacity-60 hover:opacity-80"
                )}
              >
                {/* Date number */}
                <span
                  className={cn(
                    "text-[9px] font-mono leading-none mb-1",
                    isToday
                      ? "text-cyan font-bold"
                      : isSelected
                      ? "text-foreground/80"
                      : "text-muted-foreground/45"
                  )}
                >
                  {day.getDate()}
                </span>

                {/* Colored compound dots */}
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {showDots.map(({ compoundId }) => (
                    <div
                      key={compoundId}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: compoundColor(compoundId) }}
                    />
                  ))}
                  {filteredCompounds.length > 3 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day detail drawer */}
        {selectedDay && (
          <div className="mt-3 border border-[#1a1a1a] rounded-lg overflow-hidden animate-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-2 border-b border-[#161616] flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                {selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {selectedEntries.length === 0 && (
                <span className="text-[9px] text-muted-foreground/30 font-mono">no doses</span>
              )}
            </div>
            {selectedEntries.length > 0 && (
              <div className="divide-y divide-[#141414]">
                {selectedEntries.map((e) => (
                  <div key={e.id} className="flex items-center px-3 py-2 gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: compoundColor(e.compoundId) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: compoundColor(e.compoundId) }}>
                          {e.compound}
                        </span>
                        <span className="text-[9px] font-mono text-foreground/60">
                          {e.dose}{e.doseUnit}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground/35">
                        {formatUnits(e.units)} u drawn
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-muted-foreground/30 shrink-0">
                      {new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
