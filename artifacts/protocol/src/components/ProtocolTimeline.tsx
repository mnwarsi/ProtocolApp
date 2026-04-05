import { useMemo, useRef, useEffect, useState } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import { compoundColor, compoundColorAlpha } from "@/lib/compoundColor";

const DAY_MS = 86400_000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

interface ProtocolTimelineProps {
  highlight?: string;
  onHighlight?: (compoundId: string | undefined) => void;
}

export default function ProtocolTimeline({ highlight, onHighlight }: ProtocolTimelineProps) {
  const { protocols, entries } = useProtocolStore();
  const activeProtocols = protocols.filter((p) => p.active);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackW(el.offsetWidth));
    ro.observe(el);
    setTrackW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);

  const { windowStart, windowEnd } = useMemo(() => {
    let wStart = addDays(today, -21);
    let wEnd = addDays(today, 21);
    for (const p of activeProtocols) {
      const s = startOfDay(new Date(p.startDate));
      if (s < wStart) wStart = s;
      if (p.endDate) {
        const e = startOfDay(new Date(p.endDate));
        if (e > wEnd) wEnd = e;
      }
    }
    // Pad a couple of days either side
    wStart = addDays(wStart, -2);
    wEnd = addDays(wEnd, 3);
    return { windowStart: wStart, windowEnd: wEnd };
  }, [activeProtocols, today]);

  const windowDays = Math.max(1, daysBetween(windowStart, windowEnd));

  function xPct(date: Date): number {
    return (daysBetween(windowStart, startOfDay(date)) / windowDays) * 100;
  }

  // Axis ticks — one label per week aligned to Monday
  const axisTicks = useMemo(() => {
    const ticks: { pct: number; label: string }[] = [];
    const d = new Date(windowStart);
    // advance to nearest Monday
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    while (d <= windowEnd) {
      ticks.push({
        pct: xPct(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
      d.setDate(d.getDate() + 7);
    }
    return ticks;
  }, [windowStart, windowEnd, windowDays]);

  const todayPct = xPct(today);

  // Group entries by compoundId → set of day-offsets from windowStart
  const doseDaysByCompound = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const e of entries) {
      const d = startOfDay(new Date(e.timestamp));
      if (d < windowStart || d > windowEnd) continue;
      const pct = xPct(d);
      const arr = map.get(e.compoundId) ?? [];
      // Dedupe same-day entries (keep pct unique within ±0.1)
      if (!arr.some((p) => Math.abs(p - pct) < 0.5)) arr.push(pct);
      map.set(e.compoundId, arr);
    }
    return map;
  }, [entries, windowStart, windowEnd, windowDays]);

  if (activeProtocols.length === 0) {
    return (
      <div className="border border-[#1a1a1a] rounded-xl px-4 py-8 flex flex-col items-center gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-semibold">No active protocols</p>
        <p className="text-[9px] text-muted-foreground/25 text-center leading-relaxed">
          Add protocols in the Protocol tab to visualise your cycle timeline here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold">Cycle Timeline</span>
        <span className="text-[9px] text-muted-foreground/30 font-mono ml-auto">
          {windowStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {windowEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>

      <div className="px-3 pb-3">
        {/* Axis */}
        <div className="relative h-5 mb-1" ref={trackRef}>
          {axisTicks.map(({ pct, label }) => (
            <span
              key={label}
              className="absolute text-[8px] font-mono text-muted-foreground/30 -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${pct}%` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Lanes */}
        <div className="space-y-2">
          {activeProtocols.map((protocol) => {
            const color = compoundColor(protocol.compoundId);
            const colorBg = compoundColorAlpha(protocol.compoundId, 0.12);
            const colorBorder = compoundColorAlpha(protocol.compoundId, 0.4);
            const isHighlighted = highlight === protocol.compoundId;

            const startPct = Math.max(0, xPct(new Date(protocol.startDate)));
            const endPct = protocol.endDate
              ? Math.min(100, xPct(new Date(protocol.endDate)))
              : Math.min(100, todayPct);
            const widthPct = Math.max(0, endPct - startPct);

            const doseTicks = doseDaysByCompound.get(protocol.compoundId) ?? [];

            return (
              <div
                key={protocol.id}
                className="flex items-center gap-2 group"
                onClick={() => onHighlight?.(isHighlighted ? undefined : protocol.compoundId)}
              >
                {/* Compound label */}
                <div className="w-14 shrink-0 text-right">
                  <span
                    className="text-[9px] font-mono font-semibold uppercase tracking-wide truncate"
                    style={{ color: isHighlighted ? color : `${color}99` }}
                  >
                    {protocol.compound.replace(/-/g, "\u2011").split(" ")[0]}
                  </span>
                </div>

                {/* Track */}
                <div className="relative flex-1 h-6 rounded" style={{ background: "#0d0d0d" }}>
                  {/* Today line (behind bar) */}
                  {todayPct > 0 && todayPct < 100 && (
                    <div
                      className="absolute top-0 bottom-0 w-px z-10"
                      style={{ left: `${todayPct}%`, background: "rgba(255,255,255,0.2)" }}
                    />
                  )}

                  {/* Protocol bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded-sm transition-opacity duration-150"
                    style={{
                      left: `${startPct}%`,
                      width: `${widthPct}%`,
                      background: colorBg,
                      border: `1px solid ${colorBorder}`,
                      opacity: highlight && !isHighlighted ? 0.35 : 1,
                    }}
                  />

                  {/* "Ongoing" arrow if no end date */}
                  {!protocol.endDate && todayPct < 98 && (
                    <div
                      className="absolute top-0 bottom-0 flex items-center text-[8px] font-mono z-20"
                      style={{
                        left: `${Math.min(todayPct + 0.5, 95)}%`,
                        color: colorBorder,
                      }}
                    >
                      ›
                    </div>
                  )}

                  {/* Dose tick marks */}
                  {doseTicks.map((pct) => (
                    <div
                      key={pct}
                      className="absolute top-0.5 bottom-0.5 w-0.5 rounded-full z-20"
                      style={{ left: `${pct}%`, background: color }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend: today marker */}
        <div className="flex items-center gap-1.5 mt-2 justify-end">
          <div className="w-3 h-px bg-white/20" />
          <span className="text-[8px] font-mono text-muted-foreground/25">today</span>
          <div className="w-2 h-1.5 rounded-sm bg-cyan/30 ml-2" />
          <span className="text-[8px] font-mono text-muted-foreground/25">dose logged</span>
        </div>
      </div>
    </div>
  );
}
