import { useState, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<"calculator" | "log" | "protocol">("calculator");

  // In a real app we might use a router, but here we use simple state to switch views
  // since the parent passes all components as children, we'll selectively render them
  // or just render them in a responsive layout for desktop, and tabbed for mobile.
  // The requirements say "three tabbed sections: Calculator, Log, Protocol."
  
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-cyan-900 selection:text-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center h-16 px-4 md:px-6 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 text-cyan font-semibold tracking-wide">
          <Activity className="w-5 h-5" />
          <span>PROTOCOL</span>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex ml-10 space-x-1">
          {["calculator", "log", "protocol"].map((tab) => (
            <button
              key={tab}
              data-testid={`tab-desktop-${tab}`}
              onClick={() => setActiveTab(tab as any)}
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

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col md:flex-row gap-6">
        {/* For desktop, we can show everything in a grid, or respect the tabs. 
            Let's respect the tabs for both to keep it simple and strictly match "three tabbed sections". */}
        
        <div className={cn("w-full space-y-6", activeTab === "calculator" ? "block" : "hidden md:block md:w-1/2")}>
          <div className={cn("md:block", activeTab === "calculator" ? "block" : "hidden")}>
             {/* We know child 0 is CalculatorPanel, child 1 is SyringeDisplay from ProtocolApp.tsx */}
             {Array.isArray(children) ? children.slice(0, 2) : children}
          </div>
        </div>

        <div className={cn("w-full space-y-6", activeTab === "log" ? "block" : "hidden md:block md:w-1/2")}>
          <div className={cn("md:block", activeTab === "log" ? "block" : "hidden")}>
             {Array.isArray(children) && children.length > 2 ? children[2] : null}
          </div>
        </div>

        <div className={cn("w-full", activeTab === "protocol" ? "block" : "hidden")}>
           <div className="flex items-center justify-center h-48 border border-dashed border-border rounded-lg text-muted-foreground">
             <p className="font-mono text-sm">PROTOCOL_MODULE_OFFLINE</p>
           </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t border-border/50 bg-background/90 backdrop-blur-md pb-safe">
        {["calculator", "log", "protocol"].map((tab) => (
          <button
            key={tab}
            data-testid={`tab-mobile-${tab}`}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-full gap-1 transition-colors duration-200 capitalize",
              activeTab === tab 
                ? "text-cyan" 
                : "text-muted-foreground"
            )}
          >
            <span className={cn(
              "text-xs font-medium tracking-wider",
              activeTab === tab && "text-shadow-sm glow-cyan"
            )}>
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