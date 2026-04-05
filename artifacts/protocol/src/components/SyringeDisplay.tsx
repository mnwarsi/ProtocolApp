import { useProtocolStore } from "@/store/protocolStore";
import { formatUnits } from "@/lib/mathEngine";
import { motion } from "framer-motion";

export default function SyringeDisplay() {
  const { result } = useProtocolStore();
  
  const units = result?.valid ? result.syringeUnits : 0;
  const fillPercentage = Math.min(Math.max(units / 100, 0), 1);
  
  // Dimensions
  const width = 300;
  const height = 40;
  const barrelWidth = 220;
  const barrelX = 40;
  const fillWidth = barrelWidth * fillPercentage;

  return (
    <div className="w-full max-w-md mx-auto my-6 animate-in fade-in duration-700 delay-200 fill-mode-both">
      <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
        
        <div className="relative w-full max-w-[300px] aspect-[300/60] mb-4">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-xl">
            {/* Plunger Handle */}
            <rect x="0" y="10" width="10" height="20" rx="2" fill="#333" stroke="#555" strokeWidth="1" />
            <rect x="10" y="18" width={barrelX - 10 + (barrelWidth - fillWidth)} height="4" fill="#444" />
            <rect 
              x={barrelX + barrelWidth - fillWidth - 5} 
              y="12" 
              width="5" 
              height="16" 
              rx="1" 
              fill="#222" 
            />

            {/* Barrel Background */}
            <rect x={barrelX} y="8" width={barrelWidth} height="24" rx="2" fill="#111" stroke="#333" strokeWidth="1.5" />
            
            {/* Liquid Fill (Animated) */}
            <motion.rect 
              x={barrelX}
              y="9"
              height="22"
              fill="url(#cyanGlow)"
              initial={{ width: 0 }}
              animate={{ width: fillWidth }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            />

            {/* Graduations */}
            {Array.from({ length: 11 }).map((_, i) => {
              const xPos = barrelX + (i * barrelWidth) / 10;
              const isMajor = i % 2 === 0;
              return (
                <g key={i}>
                  <line 
                    x1={xPos} 
                    y1="8" 
                    x2={xPos} 
                    y2={isMajor ? "16" : "13"} 
                    stroke="#888" 
                    strokeWidth="1" 
                  />
                  {isMajor && i > 0 && i < 10 && (
                    <text 
                      x={xPos} 
                      y="6" 
                      fill="#888" 
                      fontSize="8" 
                      fontFamily="monospace" 
                      textAnchor="middle"
                    >
                      {i * 10}
                    </text>
                  )}
                </g>
              );
            })}
            {/* 100 mark */}
            <text x={barrelX + barrelWidth} y="6" fill="#888" fontSize="8" fontFamily="monospace" textAnchor="middle">100</text>

            {/* Needle Hub */}
            <path d={`M ${barrelX + barrelWidth} 14 L ${barrelX + barrelWidth + 10} 17 L ${barrelX + barrelWidth + 10} 23 L ${barrelX + barrelWidth} 26 Z`} fill="#444" />
            
            {/* Needle */}
            <line x1={barrelX + barrelWidth + 10} y1="20" x2={barrelX + barrelWidth + 30} y2="20" stroke="#777" strokeWidth="1" />

            <defs>
              <linearGradient id="cyanGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(0, 242, 255, 0.4)" />
                <stop offset="100%" stopColor="rgba(0, 242, 255, 0.9)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="text-center space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Current Draw</div>
          <div className="font-mono text-2xl text-foreground font-semibold">
            {formatUnits(units)} <span className="text-sm text-muted-foreground font-normal">u</span>
          </div>
        </div>

      </div>
    </div>
  );
}