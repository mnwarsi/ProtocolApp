import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useProtocolStore } from "@/store/protocolStore";
import { compoundColor } from "@/lib/compoundColor";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import InjectionSiteMap from "./InjectionSiteMap";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DataPoint {
  date: string;
  value: number | null;
  metric: string;
}

type MetricKey = "hrv" | "recovery" | "rhr" | "sleep";
type RangeKey = "7" | "30" | "90";

const METRICS: { key: MetricKey; label: string; unit: string; desc: string }[] = [
  { key: "hrv", label: "HRV", unit: "ms", desc: "Heart Rate Variability" },
  { key: "recovery", label: "Recovery", unit: "%", desc: "Daily Recovery Score" },
  { key: "rhr", label: "RHR", unit: "bpm", desc: "Resting Heart Rate" },
  { key: "sleep", label: "Sleep", unit: "h", desc: "Sleep Duration" },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
];

// ── API base URL ───────────────────────────────────────────────────────────────

function apiUrl(path: string): string {
  const base = (import.meta as unknown as { env: Record<string, string> }).env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/api${path}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function avg(vals: (number | null)[]): number {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  unit,
  doseEvents,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null }>;
  label?: string;
  unit: string;
  doseEvents: Array<{ date: string; compound: string; compoundId: string }>;
}) {
  if (!active || !payload || !payload[0]) return null;
  const val = payload[0].value;
  const dosesOnDay = doseEvents.filter((d) => d.date === label);
  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[10px] font-mono shadow-lg">
      <div className="text-muted-foreground/50 mb-1">{label ? formatDateShort(label) : ""}</div>
      {val !== null ? (
        <div className="text-foreground/90 font-semibold">
          {typeof val === "number" && unit === "h" ? val.toFixed(1) : Math.round(val as number)}
          <span className="text-muted-foreground/40 font-normal ml-0.5">{unit}</span>
        </div>
      ) : (
        <div className="text-muted-foreground/40">No data</div>
      )}
      {dosesOnDay.length > 0 && (
        <div className="mt-1 pt-1 border-t border-[#2a2a2a] space-y-0.5">
          {dosesOnDay.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: compoundColor(d.compoundId) }}
              />
              <span className="text-muted-foreground/60 text-[9px]">{d.compound}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function BiofeedbackPanel() {
  const { entries } = useProtocolStore();
  const [metric, setMetric] = useState<MetricKey>("hrv");
  const [range, setRange] = useState<RangeKey>("30");
  const [data, setData] = useState<DataPoint[]>([]);
  const [source, setSource] = useState<"demo" | "whoop" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMetricDef = METRICS.find((m) => m.key === metric)!;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/wearable/data?metric=${metric}&days=${range}`));
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json() as { data: DataPoint[]; source: string };
      setData(json.data);
      setSource(json.source as "demo" | "whoop");
    } catch {
      setError("Could not load biometric data");
    } finally {
      setLoading(false);
    }
  }, [metric, range]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Dose events — one entry per unique date per compound
  const doseEvents = entries
    .map((e) => ({
      date: e.timestamp.split("T")[0],
      compound: e.compound,
      compoundId: e.compoundId,
    }))
    .filter((e) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(range, 10));
      return new Date(e.date + "T00:00:00") >= cutoff;
    });

  const uniqueDosesByDate = Array.from(
    new Map(doseEvents.map((e) => [`${e.date}_${e.compoundId}`, e])).values()
  );

  // Summary stats
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint).map((d) => d.value);
  const secondHalf = data.slice(midpoint).map((d) => d.value);
  const avgFirst = avg(firstHalf);
  const avgSecond = avg(secondHalf);
  const delta = avgSecond - avgFirst;
  const deltaPct = avgFirst > 0 ? (delta / avgFirst) * 100 : 0;

  const isRhrInverted = metric === "rhr";
  const trendGood = isRhrInverted ? delta < -1 : delta > 0.5;
  const trendBad = isRhrInverted ? delta > 1 : delta < -0.5;

  const validValues = data.map((d) => d.value).filter((v): v is number => v !== null);
  const yMin = validValues.length > 0 ? Math.floor(Math.min(...validValues) * 0.95) : 0;
  const yMax = validValues.length > 0 ? Math.ceil(Math.max(...validValues) * 1.05) : 100;

  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Biofeedback
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {source && (
            <span
              className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded border",
                source === "demo"
                  ? "text-amber-400/70 border-amber-400/20 bg-amber-400/5"
                  : "text-cyan/70 border-cyan/20 bg-cyan/5"
              )}
            >
              {source === "demo" ? "DEMO" : "WHOOP"}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-muted-foreground/40 hover:text-cyan transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Metric selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "py-2 rounded-lg text-[10px] font-medium uppercase tracking-wider transition-all border",
              metric === m.key
                ? "bg-cyan/10 border-cyan/30 text-cyan"
                : "bg-[#0d0d0d] border-[#1e1e1e] text-muted-foreground/50 hover:border-[#2a2a2a] hover:text-muted-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Range selector */}
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              "flex-1 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all border",
              range === r.key
                ? "bg-[#0d1313] border-cyan/25 text-cyan/80"
                : "bg-[#0a0a0a] border-[#181818] text-muted-foreground/40 hover:border-[#222] hover:text-muted-foreground/60"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        className="bg-[#080808] border border-[#1a1a1a] rounded-xl p-3"
        style={{ boxShadow: "inset 0 1px 0 rgba(0,242,255,0.03)" }}
      >
        <div className="text-[10px] text-muted-foreground/40 font-mono mb-3">
          {currentMetricDef.desc} · {currentMetricDef.unit}
        </div>

        {error ? (
          <div className="h-48 flex items-center justify-center text-destructive/60 text-xs font-mono">
            {error}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => {
                  const d = new Date(v + "T12:00:00");
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    unit={currentMetricDef.unit}
                    doseEvents={uniqueDosesByDate}
                  />
                }
                cursor={{ stroke: "rgba(0,242,255,0.15)", strokeWidth: 1, strokeDasharray: "3 3" }}
              />

              {/* Dose event reference lines */}
              {uniqueDosesByDate.map((e, i) => (
                <ReferenceLine
                  key={i}
                  x={e.date}
                  stroke={compoundColor(e.compoundId)}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  strokeOpacity={0.6}
                />
              ))}

              <Line
                type="monotone"
                dataKey="value"
                stroke="#00f2ff"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#00f2ff", strokeWidth: 0 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {data.length > 0 && !error && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Avg</div>
            <div className="font-mono text-xs text-foreground/80">
              {metric === "sleep"
                ? avg(validValues.map((v) => v)).toFixed(1)
                : Math.round(avg(validValues.map((v) => v)))
              }
              <span className="text-muted-foreground/40 text-[8px] ml-0.5">{currentMetricDef.unit}</span>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">
              Trend
            </div>
            <div
              className={cn(
                "flex items-center justify-center gap-1 font-mono text-xs",
                trendGood ? "text-cyan" : trendBad ? "text-amber-400" : "text-muted-foreground/50"
              )}
            >
              {trendGood ? (
                <TrendingUp className="w-3 h-3" />
              ) : trendBad ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(deltaPct) > 0.5 ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "Stable"}
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 text-center">
            <div className="text-[9px] text-muted-foreground/40 uppercase tracking-wider mb-1">Doses</div>
            <div className="font-mono text-xs text-foreground/80">
              {uniqueDosesByDate.length}
              <span className="text-muted-foreground/40 text-[8px] ml-0.5">logged</span>
            </div>
          </div>
        </div>
      )}

      {/* Compound dose legend */}
      {uniqueDosesByDate.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
            Dose markers
          </div>
          {Array.from(new Map(uniqueDosesByDate.map((e) => [e.compoundId, e])).values()).map((e) => (
            <div key={e.compoundId} className="flex items-center gap-2">
              <div
                className="w-6 h-0.5 rounded-full"
                style={{
                  background: compoundColor(e.compoundId),
                  opacity: 0.7,
                  backgroundImage: `repeating-linear-gradient(90deg, ${compoundColor(e.compoundId)} 0px, ${compoundColor(e.compoundId)} 3px, transparent 3px, transparent 6px)`,
                }}
              />
              <span className="text-[9px] font-mono text-muted-foreground/50">{e.compound}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {data.length === 0 && !loading && !error && (
        <div className="text-center py-8 space-y-2">
          <Activity className="w-6 h-6 text-muted-foreground/15 mx-auto" />
          <p className="text-[10px] font-mono text-muted-foreground/30">No biometric data available</p>
        </div>
      )}

      {/* Injection site map */}
      <div className="border-t border-[#1a1a1a] pt-5">
        <InjectionSiteMap />
      </div>
    </div>
  );
}
