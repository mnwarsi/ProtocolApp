import { useState, useEffect } from "react";
import {
  Wifi, WifiOff, Loader2, AlertCircle, CheckCircle2, ExternalLink,
  LogIn, LogOut, User, CloudUpload, CloudOff, Zap, Lock,
} from "lucide-react";
import { useAuth, useUser, SignOutButton } from "@clerk/react";
import { useProtocolStore } from "@/store/protocolStore";
import { cn } from "@/lib/utils";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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

// ── Auth section ───────────────────────────────────────────────────────────────

function AuthCardClerk() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { tier, cloudSyncing, syncToCloud } = useProtocolStore();

  const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const handleSignIn = () => {
    window.location.href = `${basePath}/sign-in`;
  };

  if (!isLoaded) {
    return (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] flex items-center gap-2">
        <Loader2 className="w-3.5 h-3.5 text-muted-foreground/30 animate-spin" />
        <span className="text-[10px] font-mono text-muted-foreground/30">Loading auth…</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            Account
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/40 leading-relaxed">
          Sign in to unlock cloud sync, cross-device access, and Protocol Pro features.
          Your data stays local until you choose to sync.
        </p>
        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-2 bg-cyan/10 hover:bg-cyan/15 border border-cyan/30 hover:border-cyan/50 text-cyan text-xs font-bold py-2.5 rounded-md uppercase tracking-widest transition-all"
          style={{ boxShadow: "0 0 12px rgba(0,242,255,0.06)" }}
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleSyncNow = () => {
    if (user?.id) void syncToCloud(user.id);
  };

  return (
    <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-cyan/60" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Account
        </span>
        <span
          className={cn(
            "ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase",
            tier === "pro"
              ? "bg-cyan/10 text-cyan/80 border-cyan/25"
              : "bg-muted/10 text-muted-foreground/50 border-muted/20"
          )}
        >
          {tier === "pro" ? "Pro" : "Free"}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-5 h-5 rounded-full bg-cyan/10 border border-cyan/20 flex items-center justify-center flex-shrink-0">
          <span className="text-cyan/70 font-mono text-[8px] font-bold">
            {(user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-foreground/70 font-medium truncate">
            {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Unknown"}
          </div>
          {user?.fullName && (
            <div className="text-muted-foreground/30 font-mono text-[9px] truncate">
              {user?.emailAddresses?.[0]?.emailAddress}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSyncNow}
          disabled={cloudSyncing}
          className="flex-1 flex items-center justify-center gap-1.5 border border-[#1e1e1e] hover:border-cyan/20 text-muted-foreground/50 hover:text-cyan/70 text-[10px] py-1.5 rounded-md uppercase tracking-widest transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {cloudSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CloudUpload className="w-3 h-3" />
          )}
          {cloudSyncing ? "Syncing…" : "Sync Now"}
        </button>

        <SignOutButton>
          <button className="flex-1 flex items-center justify-center gap-1.5 border border-destructive/20 hover:border-destructive/40 text-destructive/50 hover:text-destructive/80 text-[10px] py-1.5 rounded-md uppercase tracking-widest transition-colors">
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}

function AuthCard() {
  if (!HAS_CLERK) {
    return (
      <div className="border border-[#1e1e1e] rounded-xl p-4 bg-[#0c0c0c] space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Account</span>
        </div>
        <p className="text-[10px] text-muted-foreground/30 font-mono">
          Auth not configured — running in local-only mode.
        </p>
      </div>
    );
  }
  return <AuthCardClerk />;
}

// ── Upgrade card ────────────────────────────────────────────────────────────────

function UpgradeCardInner({ isSignedIn }: { isSignedIn: boolean }) {
  const { tier } = useProtocolStore();
  const [loading, setLoading] = useState(false);

  if (tier === "pro") return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/subscription/checkout"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successUrl: `${window.location.origin}${import.meta.env.BASE_URL}checkout/success`,
          cancelUrl: window.location.href,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { url?: string };
        if (data.url) window.location.href = data.url;
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-cyan/15 rounded-xl p-4 bg-[#0a0a12] space-y-3" style={{ boxShadow: "0 0 20px rgba(0,242,255,0.04)" }}>
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-cyan/60" />
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
          Protocol Pro
        </span>
        <span className="ml-auto text-[9px] font-mono text-cyan/50">$19.99/mo</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
        {[
          { icon: "∞", label: "Unlimited protocols" },
          { icon: "⚡", label: "Biofeedback tab" },
          { icon: "☁", label: "Cloud sync" },
          { icon: "📤", label: "Export logs" },
        ].map(({ icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-muted-foreground/50">
            <span className="text-cyan/40 w-3 text-center">{icon}</span>
            {label}
          </div>
        ))}
      </div>

      <button
        onClick={() => void handleUpgrade()}
        disabled={loading || !isSignedIn}
        className="w-full flex items-center justify-center gap-2 bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 hover:border-cyan/60 text-cyan text-xs font-bold py-2.5 rounded-md uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ boxShadow: "0 0 16px rgba(0,242,255,0.08)" }}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        {!isSignedIn ? "Sign In to Upgrade" : loading ? "Redirecting…" : "Upgrade to Pro"}
      </button>

      {!isSignedIn && (
        <p className="text-[9px] text-muted-foreground/25 font-mono text-center">
          Sign in required to manage subscription
        </p>
      )}
    </div>
  );
}

function UpgradeCardClerk() {
  const { isSignedIn } = useAuth();
  return <UpgradeCardInner isSignedIn={!!isSignedIn} />;
}

function UpgradeCard() {
  if (!HAS_CLERK) return <UpgradeCardInner isSignedIn={false} />;
  return <UpgradeCardClerk />;
}

// ── Wearable section ───────────────────────────────────────────────────────────

function WearableCard() {
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

    const params = new URLSearchParams(window.location.search);
    const wearableConnected = params.get("wearable_connected");
    const wearableError = params.get("wearable_error");

    if (wearableConnected === "true") {
      window.history.replaceState({}, "", window.location.pathname);
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
              <span className="text-cyan/80 font-semibold capitalize">{status.provider}</span>
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
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SettingsPanel() {
  return (
    <div className="w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full bg-cyan opacity-70" />
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Settings
        </h2>
      </div>

      {/* Account */}
      <AuthCard />

      {/* Upgrade prompt */}
      <UpgradeCard />

      {/* Wearable */}
      <WearableCard />

      {/* Cloud sync info */}
      <div className="border border-[#1a1a1a] rounded-xl p-4 bg-[#0a0a0a] space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            Privacy & Encryption
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/35 leading-relaxed">
          All data is encrypted locally before leaving your device. Cloud sync uses AES-256-GCM
          with a key derived from your user ID — only your signed-in account can decrypt it.
          Data at rest in Protocol&apos;s database is ciphertext; the server never sees plaintext.
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          <CloudOff className="w-3 h-3 text-muted-foreground/25" />
          <span className="text-[9px] font-mono text-muted-foreground/25 uppercase tracking-wider">
            Zero-knowledge cloud sync
          </span>
        </div>
      </div>

      {/* About */}
      <div className="border border-[#1a1a1a] rounded-xl p-4 bg-[#0a0a0a] space-y-2">
        <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
          About Protocol
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          {[
            { label: "Stage", value: "4 — Auth + Cloud" },
            { label: "Storage", value: "Local-first / AES-GCM" },
            { label: "Wearable", value: "Whoop (OAuth 2.0)" },
            { label: "Auth", value: "Clerk (optional)" },
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
