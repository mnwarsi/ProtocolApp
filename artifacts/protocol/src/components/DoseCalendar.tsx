import { useState } from "react";
import type { DoseLogEntry } from "@/store/protocolStore";
import { compoundColor } from "@/lib/compoundColor";
import { formatUnits, formatConcentration } from "@/lib/mathEngine";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entries: DoseLogEntry[];
  highlightedCompoundId: string | null;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function DoseCalendar({ entries, highlightedCompoundId }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const calDays = buildCalendarDays(year, month);

  const entriesByDay = new Map<string, DoseLogEntry[]>();
  for (const entry of entries) {
    const day = isoDay(new Date(entry.timestamp));
    const group = entriesByDay.get(day) ?? [];
    group.push(entry);
    entriesByDay.set(day, group);
  }

  const todayStr = isoDay(now);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setExpandedDay(null);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setExpandedDay(null);
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/70">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="text-center text-[9px] font-mono uppercase tracking-widest text-muted-foreground/30 py-0.5"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dayStr = isoDay(day);
          const dayEntries = entriesByDay.get(dayStr) ?? [];
          const isToday = dayStr === todayStr;
          const isExpanded = expandedDay === dayStr;

          const filteredEntries = highlightedCompoundId
            ? dayEntries.filter((e) => e.compoundId === highlightedCompoundId)
            : dayEntries;

          const dotsToShow = filteredEntries.slice(0, 3);
          const hasEntries = filteredEntries.length > 0;

          return (
            <div key={dayStr} className="col-span-1">
              <button
                onClick={() => setExpandedDay(isExpanded ? null : dayStr)}
                className={cn(
                  "w-full aspect-square flex flex-col items-center justify-center rounded relative transition-colors",
                  isToday ? "border border-cyan/30 bg-cyan/5" : "border border-transparent",
                  hasEntries ? "hover:bg-white/5" : "hover:bg-white/[0.02]",
                  isExpanded ? "bg-white/5 border-white/10" : ""
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono leading-none mb-0.5",
                    isToday ? "text-cyan" : hasEntries ? "text-foreground/80" : "text-muted-foreground/30"
                  )}
                >
                  {day.getDate()}
                </span>
                {/* Colored dots */}
                {dotsToShow.length > 0 && (
                  <div className="flex gap-0.5">
                    {dotsToShow.map((entry, di) => {
                      const color = compoundColor(entry.compoundId);
                      return (
                        <div
                          key={di}
                          className="w-1 h-1 rounded-full"
                          style={{ backgroundColor: color.dot, boxShadow: `0 0 4px ${color.dot}` }}
                        />
                      );
                    })}
                    {filteredEntries.length > 3 && (
                      <span className="text-[7px] text-muted-foreground/40 font-mono leading-none self-center">
                        +{filteredEntries.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Expanded day detail panel */}
      {expandedDay && (() => {
        const dayEntries = entriesByDay.get(expandedDay) ?? [];
        const filtered = highlightedCompoundId
          ? dayEntries.filter((e) => e.compoundId === highlightedCompoundId)
          : dayEntries;

        const label = new Date(expandedDay + "T12:00:00").toLocaleDateString(undefined, {
          weekday: "long", month: "long", day: "numeric"
        });

        return (
          <div className="mt-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">
              {label}
            </p>
            {filtered.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/30 font-mono">No doses logged this day.</p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((entry) => {
                  const color = compoundColor(entry.compoundId);
                  return (
                    <div key={entry.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: color.dot, boxShadow: `0 0 6px ${color.dot}` }}
                        />
                        <div>
                          <span className="text-[10px] font-bold" style={{ color: color.text }}>
                            {entry.compound}
                          </span>
                          <span className="text-[9px] text-muted-foreground/50 font-mono ml-1.5">
                            {entry.dose}{entry.doseUnit} · {formatUnits(entry.units)}u
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground/35 font-mono shrink-0">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
