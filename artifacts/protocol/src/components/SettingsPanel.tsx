import { useState, useEffect } from "react";
import { Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WearableStatus {
  connected: boolean;
  provider: string | null;
  connectedAt: string | null;
}

// ── API helper ─────────────────────────────────────────────────────────────────

function apiUrl(path: string): string {
  const base = (import.meta as unknown as { env: Record<string, string> }).env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/api${path}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsPanel() {
  const [status, setStatus] = useState<WearableStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/wearable/status"));
      const data = await res.json() as WearableStatus;
      setStatus(data);
    } catch {
      setError("Could not reach API server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();

    // Check for redirect params from OAuth callback
    const params = new URLSearchParams(window.location.search);
    const wearableConnected = params.get("wearable_connected");
    const wearableError = params.get("wearable_error");

    if (wearableConnected === "true") {
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      // Refetch status to confirm connection
      void fetchStatus();
    } else if (wearableError) {
      window.history.replaceState({}, "", window.location.pathname);
      setError(decodeURIComponent(wearableError));
    }
  }, []);

  const handleConnect = () => {
    window.location.href = apiUrl("/wearable/connect");
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch(apiUrl("/wearable/disconnect"), { method: "POST" });
      await fetchStatus();
    } catch {
      setError("Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Settings
        </h2>
      </div>

      {/* Wearable connection card */}
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] space-y-4">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground/40 animate-spin" />
          ) : status?.connected ? (
            <Wifi className="w-3.5 h-3.5 text-cyan/70" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground/40" />
          )}
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Wearable Device
          </span>
          {status?.connected && (
            <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan/10 text-cyan/70 border border-cyan/20 uppercase">
              {status.provider}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 text-destructive/70 flex-shrink-0" />
            <span className="text-[10px] font-mono text-destructive/70">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-[10px] font-mono text-muted-foreground/30 text-center py-2">
            Checking connection…
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan/60" />
              <span className="text-foreground/60">
                Connected to{" "}
                <span className="text-cyan/80 font-semibold capitalize">
                  {status.provider}
                </span>
              </span>
            </div>
            {status.connectedAt && (
              <div className="text-[9px] font-mono text-muted-foreground/35 pl-5">
                Since{" "}
                {new Date(status.connectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground/30 font-mono leading-relaxed">
              Biofeedback chart now uses live data from your wearable. Navigate to the Bio tab to view your metrics.
            </p>
            <button
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
              className="w-full border border-destructive/20 hover:border-destructive/40 text-destructive/60 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed py-2 rounded-md text-xs uppercase tracking-widest transition-colors"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect Wearable"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
              Connect a Whoop device to overlay real HRV, recovery, sleep, and resting heart rate
              data on your dose timeline. Without a connection the Bio tab uses simulated demo data.
            </p>

            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
              {[
                { label: "HRV (RMSSD)", desc: "Autonomic recovery" },
                { label: "Recovery Score", desc: "Daily readiness %" },
                { label: "Resting HR", desc: "Cardiac baseline" },
                { label: "Sleep Duration", desc: "Total sleep hours" },
              ].map(({ label, desc }) => (
                <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-2.5 py-2">
                  <div className="text-foreground/60 font-semibold mb-0.5">{label}</div>
                  <div className="text-muted-foreground/35">{desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConnect}
              className="w-full flex items-center justify-center gap-2 bg-cyan/10 hover:bg-cyan/15 border border-cyan/30 hover:border-cyan/50 text-cyan text-xs font-bold py-2.5 rounded-md uppercase tracking-widest transition-all"
              style={{ boxShadow: "0 0 12px rgba(0,242,255,0.06)" }}
            >
              <Wifi className="w-3.5 h-3.5" />
              Connect Whoop
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>

            <p className="text-[9px] text-muted-foreground/20 font-mono leading-relaxed">
              OAuth 2.0 — no credentials stored in the browser. Access token held server-side.
              Requires WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET environment variables to be set.
            </p>
          </div>
        )}
      </div>

      {/* Demo mode info */}
      <div className="border border-[#1a1a1a] rounded-xl p-4 bg-[#0a0a0a] space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/5 text-amber-400/60 border border-amber-400/15 uppercase">Demo</span>
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            Simulated Data Mode
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
          Without a connected wearable, the Biofeedback tab displays algorithmically generated
          data that mimics realistic HRV/recovery patterns — including sinusoidal variation,
          dose-correlated inflection points, and sensor noise. This allows you to explore the
          full UI without hardware.
        </p>
      </div>

      {/* About */}
      <div className="border border-[#1a1a1a] rounded-xl p-4 bg-[#0a0a0a] space-y-2">
        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
          About Protocol
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          {[
            { label: "Stage", value: "3 — Biofeedback" },
            { label: "Storage", value: "Local-first / AES-GCM" },
            { label: "Wearable", value: "Whoop (OAuth 2.0)" },
            { label: "Next", value: "Stage 4 — Auth + Cloud" },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <div className="text-muted-foreground/30 uppercase tracking-widest text-[8px]">{label}</div>
              <div className="text-muted-foreground/55">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
