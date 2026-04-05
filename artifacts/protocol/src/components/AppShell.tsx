import { useState, type ReactNode } from "react";
import { Activity, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProtocolStore } from "@/store/protocolStore";

type Tab = "calculator" | "log" | "protocol";

const TABS: { key: Tab; label: string }[] = [
  { key: "calculator", label: "Calculator" },
  { key: "log", label: "Log" },
  { key: "protocol", label: "Protocol" },
];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const { hasPassphrase, isLocked, lock } = useProtocolStore();

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex items-center h-14 px-4 md:px-6 border-b border-[#181818] bg-background/90 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-8">
          <Activity
            className="w-4 h-4 text-cyan"
            style={{ filter: "drop-shadow(0 0 6px rgba(0,242,255,0.6))" }}
          />
          <span
            className="text-[11px] font-bold tracking-[0.2em] text-foreground uppercase"
            style={{ letterSpacing: "0.25em" }}
          >
            PROTOCOL
          </span>
        </div>

        {/* Desktop tabs */}
        <nav className="hidden md:flex items-end h-full gap-0 flex-1">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                data-testid={`tab-desktop-${key}`}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "relative px-4 h-full flex items-center text-xs font-medium tracking-wider uppercase transition-colors duration-150",
                  isActive ? "text-cyan" : "text-muted-foreground/60 hover:text-muted-foreground"
                )}
                style={isActive ? { textShadow: "0 0 12px rgba(0,242,255,0.6)" } : undefined}
              >
                {label}
                {/* Active underline bar */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-cyan"
                    style={{ boxShadow: "0 0 8px rgba(0,242,255,0.8), 0 0 16px rgba(0,242,255,0.4)" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Lock button — only when passphrase is set and session is active */}
        {hasPassphrase && !isLocked && (
          <button
            onClick={() => lock()}
            title="Lock app"
            className="ml-auto hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/40 hover:text-cyan/80 transition-colors px-2 py-1 border border-transparent hover:border-cyan/20 rounded"
          >
            <Lock className="w-3 h-3" />
            Lock
          </button>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 w-full max-w-xl mx-auto p-4 md:p-5 pb-24 md:pb-6">
        {activeTab === "calculator" && (
          <div className="space-y-4">
            {childArray[0]}
            {childArray[1]}
          </div>
        )}

        {activeTab === "log" && (
          <div>
            {childArray[2] ?? null}
          </div>
        )}

        {activeTab === "protocol" && (
          <div>
            {childArray[3] ?? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 border border-dashed border-[#1e1e1e] rounded-xl text-muted-foreground">
                <Activity className="w-6 h-6 text-muted-foreground/20" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40">
                  Coming in Stage 2
                </p>
                <p className="text-[10px] text-muted-foreground/25 text-center max-w-xs">
                  Protocol scheduling, washout timers, and inventory tracking.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch h-14 border-t border-[#181818] bg-[#050505]/95 backdrop-blur-md">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              data-testid={`tab-mobile-${key}`}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                isActive ? "text-cyan" : "text-muted-foreground/40"
              )}
            >
              <span
                className="text-[10px] font-medium tracking-widest uppercase"
                style={isActive ? { textShadow: "0 0 8px rgba(0,242,255,0.5)" } : undefined}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="w-4 h-0.5 rounded-full bg-cyan"
                  style={{ boxShadow: "0 0 6px rgba(0,242,255,0.8)" }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
