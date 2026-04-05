import { useState, useMemo } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import { cn } from "@/lib/utils";
import { RotateCcw, Trash2 } from "lucide-react";

// ── Site definitions ───────────────────────────────────────────────────────────

interface SiteDef {
  id: string;
  label: string;
  shortLabel: string;
  view: "front" | "back";
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const VIEWBOX_W = 120;
const VIEWBOX_H = 240;

const SITES: SiteDef[] = [
  // FRONT
  { id: "delt_l", label: "Left Deltoid", shortLabel: "L Delt", view: "front", cx: 22, cy: 72, rx: 9, ry: 7 },
  { id: "delt_r", label: "Right Deltoid", shortLabel: "R Delt", view: "front", cx: 98, cy: 72, rx: 9, ry: 7 },
  { id: "pec_l", label: "Left Pec", shortLabel: "L Pec", view: "front", cx: 43, cy: 88, rx: 8, ry: 6 },
  { id: "pec_r", label: "Right Pec", shortLabel: "R Pec", view: "front", cx: 77, cy: 88, rx: 8, ry: 6 },
  { id: "abd_ul", label: "Abdomen Upper-L", shortLabel: "Abd UL", view: "front", cx: 45, cy: 108, rx: 8, ry: 7 },
  { id: "abd_ur", label: "Abdomen Upper-R", shortLabel: "Abd UR", view: "front", cx: 75, cy: 108, rx: 8, ry: 7 },
  { id: "abd_ll", label: "Abdomen Lower-L", shortLabel: "Abd LL", view: "front", cx: 45, cy: 124, rx: 8, ry: 7 },
  { id: "abd_lr", label: "Abdomen Lower-R", shortLabel: "Abd LR", view: "front", cx: 75, cy: 124, rx: 8, ry: 7 },
  { id: "quad_l", label: "Left Quad", shortLabel: "L Quad", view: "front", cx: 46, cy: 170, rx: 9, ry: 10 },
  { id: "quad_r", label: "Right Quad", shortLabel: "R Quad", view: "front", cx: 74, cy: 170, rx: 9, ry: 10 },
  // BACK
  { id: "trap_l", label: "Left Trapezius", shortLabel: "L Trap", view: "back", cx: 43, cy: 68, rx: 9, ry: 7 },
  { id: "trap_r", label: "Right Trapezius", shortLabel: "R Trap", view: "back", cx: 77, cy: 68, rx: 9, ry: 7 },
  { id: "tri_l", label: "Left Tricep", shortLabel: "L Tri", view: "back", cx: 22, cy: 88, rx: 8, ry: 9 },
  { id: "tri_r", label: "Right Tricep", shortLabel: "R Tri", view: "back", cx: 98, cy: 88, rx: 8, ry: 9 },
  { id: "lat_l", label: "Left Lat", shortLabel: "L Lat", view: "back", cx: 40, cy: 105, rx: 10, ry: 9 },
  { id: "lat_r", label: "Right Lat", shortLabel: "R Lat", view: "back", cx: 80, cy: 105, rx: 10, ry: 9 },
  { id: "glute_l", label: "Left Glute", shortLabel: "L Glute", view: "back", cx: 45, cy: 145, rx: 12, ry: 11 },
  { id: "glute_r", label: "Right Glute", shortLabel: "R Glute", view: "back", cx: 75, cy: 145, rx: 12, ry: 11 },
  { id: "ham_l", label: "Left Hamstring", shortLabel: "L Ham", view: "back", cx: 46, cy: 178, rx: 9, ry: 10 },
  { id: "ham_r", label: "Right Hamstring", shortLabel: "R Ham", view: "back", cx: 74, cy: 178, rx: 9, ry: 10 },
];

// ── Recency color ──────────────────────────────────────────────────────────────

function siteColor(lastMs: number | null, count: number): { fill: string; stroke: string; glow: string } {
  if (lastMs === null) return { fill: "rgba(255,255,255,0.04)", stroke: "rgba(255,255,255,0.12)", glow: "none" };
  const hoursAgo = lastMs / 3600_000;
  if (hoursAgo < 24) return { fill: "rgba(0,242,255,0.25)", stroke: "#00f2ff", glow: "0 0 8px rgba(0,242,255,0.6)" };
  if (hoursAgo < 72) return { fill: "rgba(0,242,255,0.12)", stroke: "rgba(0,242,255,0.5)", glow: "0 0 4px rgba(0,242,255,0.3)" };
  if (hoursAgo < 168) return { fill: "rgba(251,191,36,0.15)", stroke: "rgba(251,191,36,0.5)", glow: "none" };
  const freq = Math.min(count / 10, 1);
  return {
    fill: `rgba(251,191,36,${0.05 + freq * 0.08})`,
    stroke: `rgba(251,191,36,${0.2 + freq * 0.2})`,
    glow: "none",
  };
}

// ── SVG body outline paths ─────────────────────────────────────────────────────

function BodyOutline({ view }: { view: "front" | "back" }) {
  return (
    <g>
      {/* Head */}
      <ellipse cx={60} cy={22} rx={13} ry={16} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      {/* Neck */}
      <rect x={55} y={36} width={10} height={8} rx={3} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      {/* Torso */}
      <path
        d="M 28 44 L 22 56 L 18 140 L 40 145 L 60 148 L 80 145 L 102 140 L 98 56 L 92 44 Z"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Left arm */}
      <path
        d="M 28 44 L 10 58 L 8 115 L 18 117"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Right arm */}
      <path
        d="M 92 44 L 110 58 L 112 115 L 102 117"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Left leg */}
      <path
        d="M 40 145 L 37 185 L 36 225 L 50 226"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Right leg */}
      <path
        d="M 80 145 L 83 185 L 84 225 L 70 226"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {view === "front" ? null : (
        /* Back-view: spine line */
        <line x1={60} y1={44} x2={60} y2={140} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" strokeDasharray="2 3" />
      )}
    </g>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InjectionSiteMap() {
  const { injectionSites, logInjectionSite, clearInjectionSite } = useProtocolStore();
  const [view, setView] = useState<"front" | "back">("front");
  const [hoveredSite, setHoveredSite] = useState<string | null>(null);
  const [recentLogged, setRecentLogged] = useState<string | null>(null);

  const now = Date.now();

  const siteStats = useMemo(() => {
    const map = new Map<string, { lastMs: number; count: number }>();
    for (const entry of injectionSites) {
      const ageMs = now - new Date(entry.timestamp).getTime();
      const existing = map.get(entry.siteId);
      if (!existing || ageMs < existing.lastMs) {
        map.set(entry.siteId, { lastMs: ageMs, count: (existing?.count ?? 0) + 1 });
      } else {
        map.set(entry.siteId, { ...existing, count: existing.count + 1 });
      }
    }
    return map;
  }, [injectionSites, now]);

  const handleSiteTap = (siteId: string) => {
    logInjectionSite(siteId);
    setRecentLogged(siteId);
    setTimeout(() => setRecentLogged(null), 1500);
  };

  const visibleSites = SITES.filter((s) => s.view === view);
  const hoveredDef = SITES.find((s) => s.id === hoveredSite);

  return (
    <div className="space-y-3">
      {/* Header + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Injection Sites
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView((v) => (v === "front" ? "back" : "front"))}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-cyan uppercase tracking-widest border border-[#1e1e1e] hover:border-cyan/30 px-2 py-1 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            {view === "front" ? "Back" : "Front"}
          </button>
        </div>
      </div>

      {/* Body map SVG */}
      <div className="relative bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="text-center pt-2 pb-1">
          <span className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
            {view} view · tap zone to log
          </span>
        </div>

        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full max-w-[180px] mx-auto block"
          style={{ height: "280px" }}
        >
          <BodyOutline view={view} />

          {visibleSites.map((site) => {
            const stats = siteStats.get(site.id) ?? null;
            const colors = siteColor(stats?.lastMs ?? null, stats?.count ?? 0);
            const isHovered = hoveredSite === site.id;
            const isFlashing = recentLogged === site.id;

            return (
              <g key={site.id}>
                <ellipse
                  cx={site.cx}
                  cy={site.cy}
                  rx={site.rx + (isHovered ? 2 : 0)}
                  ry={site.ry + (isHovered ? 1.5 : 0)}
                  fill={isFlashing ? "rgba(0,242,255,0.4)" : colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isHovered || isFlashing ? 1.5 : 1}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    filter: colors.glow !== "none" ? `drop-shadow(${colors.glow})` : undefined,
                  }}
                  onMouseEnter={() => setHoveredSite(site.id)}
                  onMouseLeave={() => setHoveredSite(null)}
                  onClick={() => handleSiteTap(site.id)}
                />
                {stats && (
                  <text
                    x={site.cx}
                    y={site.cy + 0.8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="4.5"
                    fill={stats.lastMs < 72 * 3600_000 ? "#00f2ff" : "rgba(251,191,36,0.7)"}
                    style={{ pointerEvents: "none", fontFamily: "monospace" }}
                  >
                    {stats.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredDef && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-[#0d0d0d] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-center pointer-events-none">
            <div className="text-[10px] font-semibold text-foreground/80">{hoveredDef.label}</div>
            {(() => {
              const stats = siteStats.get(hoveredDef.id);
              if (!stats) return <div className="text-[9px] font-mono text-muted-foreground/40">Never used</div>;
              const hoursAgo = Math.round(stats.lastMs / 3600_000);
              return (
                <div className="text-[9px] font-mono text-muted-foreground/60">
                  Last: {hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`} · {stats.count}×
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-1">
        {[
          { color: "bg-cyan", label: "<24h" },
          { color: "bg-cyan/40", label: "<72h" },
          { color: "bg-amber-400/50", label: "<7d" },
          { color: "bg-white/10", label: ">7d" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", color)} />
            <span className="text-[9px] font-mono text-muted-foreground/40">{label}</span>
          </div>
        ))}
      </div>

      {/* Recent log list */}
      {injectionSites.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest px-1">
            Recent injections
          </div>
          {injectionSites.slice(0, 5).map((entry) => {
            const site = SITES.find((s) => s.id === entry.siteId);
            const ageMs = now - new Date(entry.timestamp).getTime();
            const hoursAgo = Math.round(ageMs / 3600_000);
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-1.5"
              >
                <div>
                  <span className="text-[10px] text-foreground/70">{site?.label ?? entry.siteId}</span>
                  <span className="ml-2 text-[9px] font-mono text-muted-foreground/40">
                    {hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`}
                  </span>
                </div>
                <button
                  onClick={() => clearInjectionSite(entry.siteId)}
                  title="Clear this site's history"
                  className="text-muted-foreground/20 hover:text-destructive/60 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {injectionSites.length > 5 && (
            <p className="text-[9px] font-mono text-muted-foreground/25 px-1">
              +{injectionSites.length - 5} more entries
            </p>
          )}
        </div>
      )}
    </div>
  );
}
