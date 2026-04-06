import { type ReactNode, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  ExternalLink,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Shield,
  User,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { SignOutButton, useAuth, useUser } from "@clerk/react";
import { useProtocolStore, type GoalFocus, type UnitSystem } from "@/store/protocolStore";
import { cn } from "@/lib/utils";

const HAS_CLERK = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const GOAL_OPTIONS: Array<{ key: GoalFocus; label: string }> = [
  { key: "general", label: "General" },
  { key: "fat-loss", label: "Fat loss" },
  { key: "recovery", label: "Recovery" },
  { key: "performance", label: "Performance" },
  { key: "longevity", label: "Longevity" },
];

interface WearableStatus {
  connected: boolean;
  provider: string | null;
  connectedAt: string | null;
}

function apiUrl(path: string): string {
  const base = (import.meta as unknown as { env: Record<string, string> }).env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}/api${path}`;
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-cyan/70">{title}</div>
        {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground/72">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function OptionPillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition-all",
              active
                ? "border-cyan/30 bg-cyan/10 text-cyan"
                : "border-white/8 bg-black/20 text-muted-foreground/70 hover:border-white/12 hover:text-foreground/85"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TokenField({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const normalized = draft.trim().replace(/\s+/g, " ");
    if (!normalized) return;
    if (values.some((value) => value.toLowerCase() === normalized.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, normalized]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/55">{label}</div>
      <div className="rounded-[22px] border border-white/8 bg-black/20 p-3">
        {values.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {values.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground/82"
              >
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => onChange(values.filter((item) => item !== value))}
                  className="text-muted-foreground/45 transition hover:text-foreground/80"
                  aria-label={`Remove ${value}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addValue();
              }
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-[#0d0f10] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/34 focus:border-cyan/24 focus:outline-none"
          />
          <button
            type="button"
            onClick={addValue}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-foreground/86 transition hover:border-cyan/20 hover:text-cyan"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard() {
  const { profile, setWeight, setUnitSystem, setGoalFocus } = useProtocolStore();
  const weightSuffix = profile.unitSystem === "metric" ? "kg" : "lb";

  return (
    <SectionCard title="Profile" subtitle="Who you are and which defaults the app should use.">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[24px] border border-cyan/14 bg-[radial-gradient(circle_at_top_left,rgba(0,242,255,0.12),transparent_48%),rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/8">
              <User className="h-5 w-5 text-cyan/70" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-cyan/70">Profile Snapshot</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {profile.weight ? `${profile.weight}${weightSuffix}` : "No weight set"}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground/82">
              {profile.unitSystem === "metric" ? "Metric" : "Imperial"}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground/82">
              {GOAL_OPTIONS.find((option) => option.key === profile.goalFocus)?.label ?? "General"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/55">Weight</div>
            <div className="flex overflow-hidden rounded-[22px] border border-white/8 bg-black/20">
              <input
                value={profile.weight ?? ""}
                type="number"
                min="0"
                step="0.1"
                onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder={profile.unitSystem === "metric" ? "82.5" : "181"}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/34 focus:outline-none"
              />
              <div className="border-l border-white/8 px-4 py-3 text-sm text-muted-foreground/60">{weightSuffix}</div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/55">Units</div>
            <OptionPillGroup<UnitSystem>
              options={[
                { key: "metric", label: "Metric" },
                { key: "imperial", label: "Imperial" },
              ]}
              value={profile.unitSystem}
              onChange={setUnitSystem}
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground/55">Goal Focus</div>
            <OptionPillGroup<GoalFocus> options={GOAL_OPTIONS} value={profile.goalFocus} onChange={setGoalFocus} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function SafetyCard() {
  const { profile, setMedicalConditions, setMedications, setSensitivities } = useProtocolStore();

  return (
    <SectionCard title="Safety" subtitle="Only the important context that should influence caution and interpretation.">
      <div className="space-y-4">
        <TokenField
          label="Medical Conditions"
          placeholder="Add a condition"
          values={profile.medicalConditions}
          onChange={setMedicalConditions}
        />
        <TokenField
          label="Medications"
          placeholder="Add a medication"
          values={profile.medications}
          onChange={setMedications}
        />
        <TokenField
          label="Sensitivities"
          placeholder="Add an allergy or sensitivity"
          values={profile.sensitivities}
          onChange={setSensitivities}
        />
      </div>
    </SectionCard>
  );
}

function AuthCardClerk() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { tier, cloudSyncing, syncToCloud, lastCloudSyncAt } = useProtocolStore();

  const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const handleSignIn = () => {
    window.location.href = `${basePath}/sign-in`;
  };

  if (!isLoaded) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading account
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-foreground">Local-only mode</div>
            <div className="mt-1 text-sm text-muted-foreground/66">Sign in for cloud sync and Pro features.</div>
          </div>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan/24 bg-cyan/8 px-4 py-2.5 text-sm text-cyan transition hover:border-cyan/36 hover:bg-cyan/12"
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan/20 bg-cyan/10 text-[11px] font-semibold text-cyan/80">
              {(user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress ?? "Unknown"}
              </div>
              <div className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground/45">
                {tier === "pro" ? "Protocol Pro" : "Free plan"}
              </div>
            </div>
          </div>
          {lastCloudSyncAt ? (
            <div className="mt-3 text-[11px] text-muted-foreground/50">
              Last sync {new Date(lastCloudSyncAt).toLocaleString()}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => user?.id && void syncToCloud(user.id)}
            disabled={cloudSyncing}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground/84 transition hover:border-cyan/20 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cloudSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
            Sync
          </button>
          <SignOutButton>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-destructive/18 bg-destructive/[0.03] px-3 py-2 text-sm text-destructive/78 transition hover:border-destructive/30 hover:text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}

function AuthCard() {
  if (!HAS_CLERK) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 text-sm text-muted-foreground/60">
        Account is not configured. This device is running in local-only mode.
      </div>
    );
  }
  return <AuthCardClerk />;
}

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[22px] border border-cyan/14 bg-cyan/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">Protocol Pro</div>
          <div className="mt-1 text-sm text-muted-foreground/66">Cloud sync, wearable insights, unlimited protocols.</div>
        </div>
        <button
          onClick={() => void handleUpgrade()}
          disabled={loading || !isSignedIn}
          className="inline-flex items-center gap-2 rounded-2xl border border-cyan/24 bg-cyan/8 px-4 py-2.5 text-sm text-cyan transition hover:border-cyan/36 hover:bg-cyan/12 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Upgrade
        </button>
      </div>
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

function WearableCard() {
  const { tier } = useProtocolStore();
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

  if (tier !== "pro") {
    return (
      <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
        <div className="text-sm font-medium text-foreground">Wearable</div>
        <div className="mt-1 text-sm text-muted-foreground/66">Available with Protocol Pro.</div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/45" /> : status?.connected ? <Wifi className="h-4 w-4 text-cyan/70" /> : <WifiOff className="h-4 w-4 text-muted-foreground/45" />}
            Wearable
          </div>
          <div className="mt-1 text-sm text-muted-foreground/66">
            {loading
              ? "Checking connection"
              : status?.connected
                ? `Connected to ${status.provider}`
                : "Not connected"}
          </div>
          {status?.connectedAt ? (
            <div className="mt-2 text-[11px] text-muted-foreground/50">
              Since {new Date(status.connectedAt).toLocaleString()}
            </div>
          ) : null}
          {error ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive/70">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </div>

        {status?.connected ? (
          <button
            onClick={async () => {
              setDisconnecting(true);
              try {
                await fetch(apiUrl("/wearable/disconnect"), { method: "POST" });
                await fetchStatus();
              } catch {
                setError("Disconnect failed");
              } finally {
                setDisconnecting(false);
              }
            }}
            disabled={disconnecting}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground/84 transition hover:border-cyan/20 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-40"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <button
            onClick={() => { window.location.href = apiUrl("/wearable/connect"); }}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan/24 bg-cyan/8 px-4 py-2.5 text-sm text-cyan transition hover:border-cyan/36 hover:bg-cyan/12"
          >
            <Wifi className="h-4 w-4" />
            Connect
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectedCard() {
  return (
    <SectionCard title="Connected" subtitle="Account, sync, and device connections.">
      <div className="space-y-3">
        <AuthCard />
        <UpgradeCard />
        <WearableCard />
      </div>
    </SectionCard>
  );
}

function PrivacyCard() {
  const { hasPassphrase, setPassphrase, removePassphrase, autoLockMinutes, setAutoLockMinutes, lock } = useProtocolStore();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/34 focus:border-cyan/24 focus:outline-none";

  const handleSetPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setError("Minimum 6 characters."); return; }
    if (pw !== confirm) { setError("Passphrases do not match."); return; }
    try {
      await setPassphrase(pw);
      setStatus("Passphrase enabled.");
      setPw("");
      setConfirm("");
      setError(null);
    } catch {
      setError("Could not set passphrase.");
    }
  };

  const handleRemovePw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await removePassphrase(pw);
      setStatus("Passphrase removed.");
      setPw("");
      setError(null);
    } catch {
      setError("Incorrect passphrase.");
    }
  };

  return (
    <SectionCard title="Privacy" subtitle="How your data is protected on this device.">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="h-4 w-4 text-cyan/70" />
                Encryption
              </div>
              <div className="mt-1 text-sm text-muted-foreground/66">
                {hasPassphrase ? "Encrypted with your passphrase." : "Stored locally until you enable a passphrase."}
              </div>
            </div>
            <span className={cn(
              "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em]",
              hasPassphrase ? "border-cyan/24 bg-cyan/8 text-cyan" : "border-white/8 bg-white/[0.03] text-muted-foreground/60"
            )}>
              {hasPassphrase ? "Encrypted" : "Local"}
            </span>
          </div>
        </div>

        {(status || error) ? (
          <div className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            error ? "border-destructive/20 bg-destructive/[0.04] text-destructive/75" : "border-cyan/14 bg-cyan/[0.04] text-cyan/84"
          )}>
            {error ?? status}
          </div>
        ) : null}

        <form onSubmit={hasPassphrase ? handleRemovePw : handleSetPw} className="space-y-3">
          <input
            type="password"
            placeholder={hasPassphrase ? "Current passphrase" : "New passphrase"}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(null); }}
            className={inputClass}
          />
          {!hasPassphrase ? (
            <input
              type="password"
              placeholder="Confirm passphrase"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              className={inputClass}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-2xl border border-cyan/24 bg-cyan/8 px-4 py-2.5 text-sm text-cyan transition hover:border-cyan/36 hover:bg-cyan/12"
            >
              {hasPassphrase ? "Remove Passphrase" : "Set Passphrase"}
            </button>
            {hasPassphrase ? (
              <button
                type="button"
                onClick={() => lock()}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-foreground/84 transition hover:border-cyan/20 hover:text-cyan"
              >
                Lock Now
              </button>
            ) : null}
          </div>
        </form>

        {hasPassphrase ? (
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">Auto-lock</div>
                <div className="mt-1 text-sm text-muted-foreground/66">Minutes before the app locks itself.</div>
              </div>
              <input
                type="number"
                min="1"
                max="120"
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(parseInt(e.target.value) || 15)}
                className="w-20 rounded-2xl border border-white/8 bg-[#0d0f10] px-3 py-2 text-center text-sm text-foreground focus:border-cyan/24 focus:outline-none"
              />
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CloudOff className="h-4 w-4 text-muted-foreground/45" />
              Export
            </div>
            <div className="mt-1 text-sm text-muted-foreground/66">Download controls can land in the next pass.</div>
            <button
              type="button"
              disabled
              className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground/45"
            >
              Coming Soon
            </button>
          </div>
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lock className="h-4 w-4 text-muted-foreground/45" />
              Clear Data
            </div>
            <div className="mt-1 text-sm text-muted-foreground/66">Full reset controls can land in the next pass.</div>
            <button
              type="button"
              disabled
              className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground/45"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function SettingsPanel() {
  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <section className="rounded-[30px] border border-cyan/14 bg-[radial-gradient(circle_at_top_left,rgba(0,242,255,0.12),transparent_42%),rgba(255,255,255,0.02)] p-5 md:p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-cyan/70">Profile</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Keep Protocol tuned to you</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground/74">
          Set the few things that should shape your defaults, safety context, connections, and privacy.
        </p>
      </section>

      <ProfileCard />
      <SafetyCard />
      <ConnectedCard />
      <PrivacyCard />
    </div>
  );
}
