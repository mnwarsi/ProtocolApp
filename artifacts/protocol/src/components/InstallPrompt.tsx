import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("protocol-install-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !isStandalone) {
      setTimeout(() => setShowIosGuide(true), 3000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    deferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    localStorage.setItem("protocol-install-dismissed", "1");
  };

  if (showIosGuide) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="rounded-xl border border-[#252525] bg-[#111] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-foreground/80">Install Protocol</p>
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">
                  Tap <span className="text-foreground/60">Share</span> then{" "}
                  <span className="text-foreground/60">Add to Home Screen</span>
                </p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground/30 hover:text-muted-foreground/60">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="rounded-xl border border-[#252525] bg-[#111] p-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-cyan" style={{ filter: "drop-shadow(0 0 6px rgba(0,242,255,0.4))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground/80">Install Protocol</p>
            <p className="text-[9px] text-muted-foreground/50">Add to home screen for quick access</p>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground border border-[#1e1e1e] hover:border-[#2e2e2e] py-1.5 rounded transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-[#0a0a0a] bg-cyan py-1.5 rounded hover:bg-cyan/80 transition-colors"
            style={{ boxShadow: "0 0 12px rgba(0,242,255,0.3)" }}
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
