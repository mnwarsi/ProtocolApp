import { useProtocolStore } from "@/store/protocolStore";
import { motion } from "framer-motion";

export default function SyringeDisplay() {
  const { result } = useProtocolStore();

  const units = result?.valid ? result.syringeUnits : 0;
  const fillPercentage = Math.min(Math.max(units / 100, 0), 1);

  const barrelX = 60;
  const barrelW = 240;
  const barrelY = 18;
  const barrelH = 44;
  const barrelMidY = barrelY + barrelH / 2;
  const gasketW = 10;

  const fillW = barrelW * fillPercentage;
  const liquidX = barrelX + barrelW - fillW;
  const gasketX = liquidX - gasketW;

  const rodY = barrelMidY - 4;
  const rodH = 8;

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in duration-700 delay-150 fill-mode-both">
      <div
        className="bg-card border border-card-border rounded-xl px-4 py-5 shadow-lg relative overflow-hidden"
        style={{
          boxShadow: fillPercentage > 0
            ? `0 0 20px rgba(0,242,255,${0.06 + fillPercentage * 0.1}), 0 4px 16px rgba(0,0,0,0.6)`
            : undefined,
        }}
      >
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 px-1">
          Syringe Draw
        </div>

        <div className="relative w-full" style={{ aspectRatio: "360/80" }}>
          <svg
            viewBox="0 0 360 80"
            className="w-full h-full overflow-visible"
            style={{ filter: fillPercentage > 0 ? "drop-shadow(0 0 4px rgba(0,242,255,0.25))" : undefined }}
          >
            <defs>
              <linearGradient id="liquidGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0,242,255,0.75)" />
                <stop offset="100%" stopColor="rgba(0,242,255,0.45)" />
              </linearGradient>
              <linearGradient id="barrelGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1c1c1c" />
                <stop offset="50%" stopColor="#141414" />
                <stop offset="100%" stopColor="#1c1c1c" />
              </linearGradient>
              <linearGradient id="gasketGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e2e2e" />
                <stop offset="50%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#2e2e2e" />
              </linearGradient>
              <clipPath id="barrelClip">
                <rect x={barrelX} y={barrelY} width={barrelW} height={barrelH} rx="2" />
              </clipPath>
            </defs>

            {/* === PLUNGER HANDLE (FIXED LEFT) === */}
            <rect
              x={0}
              y={barrelMidY - 20}
              width={18}
              height={40}
              rx="3"
              fill="#1e1e1e"
              stroke="#333"
              strokeWidth="1"
            />
            {/* Handle grip lines */}
            {[0, 7, 14].map((offset) => (
              <line
                key={offset}
                x1={4}
                y1={barrelMidY - 12 + offset}
                x2={14}
                y2={barrelMidY - 12 + offset}
                stroke="#2e2e2e"
                strokeWidth="1"
              />
            ))}

            {/* === PLUNGER ROD (ANIMATED) === */}
            <motion.rect
              x={18}
              y={rodY}
              height={rodH}
              rx="1"
              fill="#252525"
              stroke="#333"
              strokeWidth="0.5"
              initial={{ width: barrelX - 18 + barrelW - gasketW }}
              animate={{ width: gasketX - 18 }}
              transition={{ type: "spring", stiffness: 55, damping: 14 }}
            />

            {/* === BARREL BODY === */}
            <rect
              x={barrelX}
              y={barrelY}
              width={barrelW}
              height={barrelH}
              rx="2"
              fill="url(#barrelGrad)"
              stroke="#2a2a2a"
              strokeWidth="1.5"
            />

            {/* === LIQUID FILL (fills from RIGHT/needle side toward LEFT/plunger) === */}
            {/* Extends 4px into the gasket to eliminate any spring-desync gap */}
            <motion.rect
              y={barrelY + 1}
              height={barrelH - 2}
              fill="url(#liquidGradient)"
              clipPath="url(#barrelClip)"
              initial={{ x: barrelX + barrelW, width: 0 }}
              animate={{ x: liquidX - 4, width: fillW + 4 }}
              transition={{ type: "spring", stiffness: 55, damping: 14 }}
            />

            {/* === GRADUATION TICKS === */}
            {/* 0 is at the needle end (right), 100 is at the plunger end (left) */}
            {Array.from({ length: 11 }).map((_, i) => {
              const xPos = barrelX + (i * barrelW) / 10;
              const isMajor = i % 2 === 0;
              const label = (10 - i) * 10; // 100 at left → 0 at right (needle)
              const isFilled = xPos > liquidX;
              return (
                <g key={i}>
                  <line
                    x1={xPos}
                    y1={barrelY}
                    x2={xPos}
                    y2={barrelY + (isMajor ? 10 : 6)}
                    stroke={isFilled ? "rgba(0,242,255,0.6)" : "#3a3a3a"}
                    strokeWidth="1"
                  />
                  {isMajor && (
                    <text
                      x={xPos}
                      y={barrelY - 3}
                      fill={isFilled ? "rgba(0,242,255,0.7)" : "#3a3a3a"}
                      fontSize="7"
                      fontFamily="'JetBrains Mono', monospace"
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* === PLUNGER GASKET (ANIMATED) === */}
            <motion.rect
              y={barrelY - 5}
              width={gasketW}
              height={barrelH + 10}
              rx="2"
              fill="url(#gasketGrad)"
              stroke="#444"
              strokeWidth="1"
              initial={{ x: barrelX + barrelW - gasketW }}
              animate={{ x: gasketX }}
              transition={{ type: "spring", stiffness: 55, damping: 14 }}
            />

            {/* === BARREL END FLANGE (LEFT) === */}
            <rect
              x={barrelX - 4}
              y={barrelY - 6}
              width={6}
              height={barrelH + 12}
              rx="2"
              fill="#1e1e1e"
              stroke="#2e2e2e"
              strokeWidth="1"
            />

            {/* === NEEDLE HUB === */}
            <path
              d={`M ${barrelX + barrelW} ${barrelY + 6} L ${barrelX + barrelW + 16} ${barrelMidY} L ${barrelX + barrelW} ${barrelY + barrelH - 6} Z`}
              fill="#1a1a1a"
              stroke="#2e2e2e"
              strokeWidth="1"
            />

            {/* === NEEDLE === */}
            <line
              x1={barrelX + barrelW + 16}
              y1={barrelMidY}
              x2={350}
              y2={barrelMidY}
              stroke="#444"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            {/* Needle bevel tip */}
            <line
              x1={345}
              y1={barrelMidY - 1}
              x2={350}
              y2={barrelMidY}
              stroke="#555"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Unit readout below syringe */}
        <div className="flex items-baseline justify-between mt-3 px-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Draw</span>
          </div>
          <div className="flex items-baseline gap-1">
            <motion.span
              key={units}
              className="font-mono font-semibold text-cyan text-lg"
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {units > 0 ? (units < 1 ? units.toFixed(2) : units.toFixed(1)) : "0"}
            </motion.span>
            <span className="text-xs text-muted-foreground font-mono">/ 100 u</span>
          </div>
        </div>
      </div>
    </div>
  );
}
