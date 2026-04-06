import type { ReactNode } from "react";
import {
  Activity,
  BookOpenText,
  FlaskConical,
  LineChart,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AppTab = "today" | "library" | "inventory" | "insights" | "settings";

const TABS: Array<{ key: AppTab; label: string; icon: typeof Activity }> = [
  { key: "today", label: "Today", icon: Activity },
  { key: "library", label: "Library", icon: BookOpenText },
  { key: "inventory", label: "Inventory", icon: FlaskConical },
  { key: "insights", label: "Insights", icon: LineChart },
  { key: "settings", label: "Profile", icon: Settings2 },
];

interface AppShellProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  todaySlot: ReactNode;
  librarySlot: ReactNode;
  inventorySlot: ReactNode;
  insightsSlot: ReactNode;
  settingsSlot: ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  todaySlot,
  librarySlot,
  inventorySlot,
  insightsSlot,
  settingsSlot,
}: AppShellProps) {
  const currentSlot =
    activeTab === "today"
      ? todaySlot
      : activeTab === "library"
        ? librarySlot
        : activeTab === "inventory"
          ? inventorySlot
          : activeTab === "insights"
            ? insightsSlot
            : settingsSlot;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/6 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex h-15 w-full max-w-5xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/8"
              style={{ boxShadow: "0 0 18px rgba(0,242,255,0.08)" }}
            >
              <Activity className="h-4 w-4 text-cyan" />
            </div>
            <div>
              <div className="text-[12px] font-semibold tracking-[0.16em] text-foreground uppercase">
                Protocol
              </div>
              <div className="text-[11px] text-muted-foreground/60">
                Calm tracking for precise dosing
              </div>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              const isSettings = key === "settings";
              return (
                <button
                  key={key}
                  onClick={() => onTabChange(key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all",
                    isActive
                      ? "border-cyan/35 bg-cyan/10 text-cyan"
                      : isSettings
                        ? "border-white/8 bg-white/[0.02] text-muted-foreground/45 hover:text-muted-foreground/70"
                        : "border-white/8 bg-white/[0.03] text-muted-foreground/70 hover:border-white/12 hover:text-foreground/85"
                  )}
                  style={isActive ? { boxShadow: "0 0 18px rgba(0,242,255,0.08)" } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex-1 w-full max-w-5xl px-4 pb-24 pt-5 md:px-6 md:pb-8">
        {currentSlot}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/6 bg-[#050607]/94 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid h-18 max-w-5xl grid-cols-5 px-2">
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key;
            const isSettings = key === "settings";
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] transition-all",
                  isActive
                    ? "text-cyan"
                    : isSettings
                      ? "text-muted-foreground/35"
                      : "text-muted-foreground/55"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl border",
                    isActive
                      ? "border-cyan/30 bg-cyan/10"
                      : "border-transparent bg-transparent"
                  )}
                  style={isActive ? { boxShadow: "0 0 14px rgba(0,242,255,0.08)" } : undefined}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
