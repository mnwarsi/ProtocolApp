import { useMemo, useRef, useEffect, useState } from "react";
import type { ActiveProtocol, DoseLogEntry } from "@/store/protocolStore";
import { compoundColor } from "@/lib/compoundColor";

interface Props {
  protocols: ActiveProtocol[];
  entries: DoseLogEntry[];
  highlightedCompoundId: string | null;
  onHighlight: (id: string | null) => void;
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function parseDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayMs(d: Date) {
  return d.getTime();
}

export default function ProtocolTimeline({ protocols, entries, highlightedCompoundId, onHighlight }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  const activeProtocols = protocols.filter((p) => p.active);

  const { minDay, maxDay } = useMemo(() => {
    if (activeProtocols.length === 0) {
      const d = new Date(TODAY);
      return { minDay: d, maxDay: new Date(d.getTime() + 30 * 86400000) };
    }
    let min = parseDay(activeProtocols[0].startDate);
    let max = new Date(TODAY.getTime() + 7 * 86400000);
    for (const p of activeProtocols) {
      const s = parseDay(p.startDate);
      if (dayMs(s) < dayMs(min)) min = s;
      if (p.endDate) {
        const e = parseDay(p.endDate);
        if (dayMs(e) > dayMs(max)) max = e;
      }
    }
    return { minDay: min, maxDay: max };
  }, [activeProtocols]);

  const totalDays = Math.max(1, (dayMs(maxDay) - dayMs(minDay)) / 86400000);

  function xPct(date: Date): number {
    return Math.max(0, Math.min(1, (dayMs(date) - dayMs(minDay)) / (totalDays * 86400000)));
  }

  const tickDays = useMemo(() => {
    const ticks: Date[] = [];
    const step = totalDays > 90 ? 30 : totalDays > 30 ? 7 : totalDays > 14 ? 3 : 1;
    let cursor = new Date(minDay);
    while (dayMs(cursor) <= dayMs(maxDay)) {
      ticks.push(new Date(cursor));
      cursor = new Date(cursor.getTime() + step * 86400000);
    }
    return ticks;
  }, [minDay, maxDay, totalDays]);

  const LANE_HEIGHT = 36;
  const AXIS_HEIGHT = 24;
  const PADDING = { top: 8, bottom: 8, left: 0, right: 0 };

  const svgHeight = PADDING.top + activeProtocols.length * LANE_HEIGHT + AXIS_HEIGHT + PADDING.bottom;

  if (activeProtocols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed border-[#1e1e1e] rounded-xl">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-mono">
          No active protocols
        </p>
        <p className="text-[10px] text-muted-foreground/25 text-center max-w-xs">
          Add a protocol in the Protocol tab to see the timeline.
        </p>
      </div>
    );
  }

  const todayPct = xPct(TODAY);

  return (
    <div ref={containerRef} className="w-full select-none">
      <svg
        width="100%"
        height={svgHeight}
        className="overflow-visible"
        style={{ display: "block" }}
      >
        {/* Grid lines + axis labels */}
        {tickDays.map((tick, i) => {
          const x = xPct(tick) * (width || 600);
          const label = tick.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={PADDING.top}
                y2={PADDING.top + activeProtocols.length * LANE_HEIGHT}
                stroke="#1a1a1a"
                strokeWidth={1}
              />
              <text
                x={x}
                y={PADDING.top + activeProtocols.length * LANE_HEIGHT + AXIS_HEIGHT - 6}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.2)"
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Protocol lanes */}
        {activeProtocols.map((protocol, laneIdx) => {
          const color = compoundColor(protocol.compoundId);
          const isHighlighted = highlightedCompoundId === null || highlightedCompoundId === protocol.compoundId;
          const yTop = PADDING.top + laneIdx * LANE_HEIGHT + 6;
          const barHeight = LANE_HEIGHT - 14;

          const startDate = parseDay(protocol.startDate);
          const endDate = protocol.endDate ? parseDay(protocol.endDate) : TODAY;
          const xStart = xPct(startDate) * (width || 600);
          const xEnd = xPct(endDate) * (width || 600);
          const barWidth = Math.max(4, xEnd - xStart);

          const protocolEntries = entries.filter((e) => e.compoundId === protocol.compoundId);

          return (
            <g
              key={protocol.id}
              style={{ cursor: "pointer", opacity: isHighlighted ? 1 : 0.3, transition: "opacity 0.2s" }}
              onClick={() => onHighlight(highlightedCompoundId === protocol.compoundId ? null : protocol.compoundId)}
              onMouseEnter={() => { if (!highlightedCompoundId) onHighlight(protocol.compoundId); }}
              onMouseLeave={() => { if (!highlightedCompoundId) onHighlight(null); }}
            >
              {/* Bar background */}
              <rect
                x={xStart}
                y={yTop}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={color.bg}
                stroke={color.border}
                strokeWidth={1}
              />

              {/* Compound label */}
              <text
                x={xStart + 5}
                y={yTop + barHeight / 2 + 3.5}
                fontSize={9}
                fill={color.text}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {protocol.compound}
              </text>

              {/* Dose tick marks */}
              {protocolEntries.map((entry) => {
                const entryDate = parseDay(entry.timestamp);
                const tickX = xPct(entryDate) * (width || 600);
                if (tickX < xStart || tickX > xStart + barWidth) return null;
                return (
                  <rect
                    key={entry.id}
                    x={tickX - 1}
                    y={yTop}
                    width={2}
                    height={barHeight}
                    fill={color.dot}
                    opacity={0.8}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Today line */}
        {todayPct >= 0 && todayPct <= 1 && (
          <g>
            <line
              x1={todayPct * (width || 600)}
              x2={todayPct * (width || 600)}
              y1={PADDING.top}
              y2={PADDING.top + activeProtocols.length * LANE_HEIGHT}
              stroke="rgba(0,242,255,0.6)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={todayPct * (width || 600) + 3}
              y={PADDING.top + 9}
              fontSize={8}
              fill="rgba(0,242,255,0.6)"
              fontFamily="monospace"
            >
              today
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
