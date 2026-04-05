import { useState, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "calculator" | "log" | "protocol";

const TABS: Tab[] = ["calculator", "log", "protocol"];

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 flex items-center h-16 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 text-cyan font-semibold tracking-wide">
          <Activity className="w-5 h-5" />
          <span>PROTOCOL</span>
        </div>

        <nav className="hidden md:flex ml-10 space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              data-testid={`tab-desktop-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 capitalize",
                activeTab === tab
                  ? "text-cyan glow-cyan bg-cyan/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col md:flex-row gap-6">
        <div className={cn("w-full space-y-6", activeTab === "calculator" ? "block" : "hidden md:block md:w-1/2")}>
          <div className={cn(activeTab === "calculator" ? "block" : "hidden md:block")}>
            {childArray.slice(0, 2)}
          </div>
        </div>

        <div className={cn("w-full space-y-6", activeTab === "log" ? "block" : "hidden md:block md:w-1/2")}>
          <div className={cn(activeTab === "log" ? "block" : "hidden md:block")}>
            {childArray[2] ?? null}
          </div>
        </div>

        <div className={cn("w-full", activeTab === "protocol" ? "block" : "hidden")}>
          <div className="flex items-center justify-center h-48 border border-dashed border-border rounded-lg text-muted-foreground">
            <p className="font-mono text-sm">PROTOCOL_MODULE_OFFLINE</p>
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t border-border/50 bg-background/90 backdrop-blur-md">
        {TABS.map((tab) => (
          <button
            key={tab}
            data-testid={`tab-mobile-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors duration-200 capitalize",
              activeTab === tab ? "text-cyan" : "text-muted-foreground"
            )}
          >
            <span className={cn("text-xs font-medium tracking-wider", activeTab === tab && "glow-cyan")}>
              {tab}
            </span>
            {activeTab === tab && (
              <div className="w-1 h-1 rounded-full bg-cyan glow-cyan-strong" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
