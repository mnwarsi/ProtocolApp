import { useState, type ReactNode } from "react";
import { Activity, Lock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProtocolStore } from "@/store/protocolStore";

type Tab = "calculator" | "log" | "protocol" | "bio" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "calculator", label: "Calculator" },
  { key: "log", label: "Log" },
  { key: "protocol", label: "Protocol" },
  { key: "bio", label: "Bio" },
  { key: "settings", label: "Settings" },
];

const PRO_TABS: Set<Tab> = new Set(["bio"]);

function BioLockedView() {
  const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 px-6 animate-in fade-in duration-500">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center bg-cyan/5 border border-cyan/20"
        style={{ boxShadow: "0 0 24px rgba(0,242,255,0.08)" }}
      >
        <Zap className="w-6 h-6 text-cyan/60" style={{ filter: "drop-shadow(0 0 8px rgba(0,242,255,0.5))" }} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-widest mb-1">
          Biofeedback — Pro
        </h3>
        <p className="text-[11px] text-muted-foreground/40 leading-relaxed max-w-[240px]">
          Real-time HRV, recovery, and dose-correlation charts require Protocol Pro.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono w-full max-w-xs">
        {[
          { label: "HRV overlay", desc: "Dose vs recovery" },
          { label: "Recovery trends", desc: "Daily readiness" },
          { label: "Resting HR", desc: "Cardiac baseline" },
          { label: "Sleep quality", desc: "Total duration" },
        ].map(({ label, desc }) => (
          <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-2 opacity-50">
            <div className="text-foreground/40 font-semibold mb-0.5">{label}</div>
            <div className="text-muted-foreground/25">{desc}</div>
          </div>
        ))}
      </div>
      <a
        href={`${basePath}/settings`}
        onClick={(e) => {
          e.preventDefault();
        }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-cyan/10 hover:bg-cyan/15 border border-cyan/30 hover:border-cyan/50 text-cyan text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
        style={{ boxShadow: "0 0 16px rgba(0,242,255,0.08)" }}
      >
        <Zap className="w-3.5 h-3.5" />
        Upgrade to Pro — $19.99/mo
      </a>
      <p className="text-[9px] font-mono text-muted-foreground/20">
        Sign in and upgrade in the Settings tab
      </p>
    </div>
  );
}

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const { hasPassphrase, isLocked, lock, tier } = useProtocolStore();

  const childArray = Array.isArray(children) ? children : [children];

  const handleTabClick = (key: Tab) => {
    setActiveTab(key);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 flex items-center h-14 px-4 md:px-6 border-b border-[#181818] bg-background/90 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-6">
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
        <nav className="hidden md:flex items-end h-full gap-0 flex-1 overflow-x-auto">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            const isPro = PRO_TABS.has(key);
            const isLocked_ = isPro && tier !== "pro";
            return (
              <button
                key={key}
                data-testid={`tab-desktop-${key}`}
                onClick={() => handleTabClick(key)}
                className={cn(
                  "relative px-3 h-full flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase transition-colors duration-150 whitespace-nowrap",
                  isActive ? "text-cyan" : "text-muted-foreground/60 hover:text-muted-foreground"
                )}
                style={isActive ? { textShadow: "0 0 12px rgba(0,242,255,0.6)" } : undefined}
              >
                {label}
                {isLocked_ && (
                  <Lock className="w-2.5 h-2.5 opacity-40" />
                )}
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

        {/* Lock button */}
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
            {childArray[3] ?? null}
          </div>
        )}

        {activeTab === "bio" && (
          <div>
            {tier === "pro" ? (childArray[4] ?? null) : <BioLockedView />}
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            {childArray[5] ?? null}
          </div>
        )}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch h-14 border-t border-[#181818] bg-[#050505]/95 backdrop-blur-md">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          const isPro = PRO_TABS.has(key);
          const isLocked_ = isPro && tier !== "pro";
          return (
            <button
              key={key}
              data-testid={`tab-mobile-${key}`}
              onClick={() => handleTabClick(key)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                isActive ? "text-cyan" : "text-muted-foreground/40"
              )}
            >
              <div className="relative">
                <span
                  className="text-[9px] font-medium tracking-widest uppercase"
                  style={isActive ? { textShadow: "0 0 8px rgba(0,242,255,0.5)" } : undefined}
                >
                  {label}
                </span>
                {isLocked_ && (
                  <Lock className="w-2 h-2 absolute -top-1.5 -right-2.5 opacity-30" />
                )}
              </div>
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
