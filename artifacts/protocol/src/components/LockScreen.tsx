import { useState, useRef, useEffect } from "react";
import { useProtocolStore } from "@/store/protocolStore";
import { Activity, Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LockScreen() {
  const { unlock, setPassphrase, lockError, hasPassphrase } = useProtocolStore();
  const [passphrase, setPassphraseInput] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;
    setLoading(true);
    setLocalError(null);
    await unlock(passphrase);
    setLoading(false);
  };

  const handleSetPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 6) {
      setLocalError("Passphrase must be at least 6 characters.");
      return;
    }
    if (passphrase !== confirm) {
      setLocalError("Passphrases do not match.");
      return;
    }
    setLoading(true);
    setLocalError(null);
    await setPassphrase(passphrase);
    setLoading(false);
  };

  const error = localError || lockError;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-12">
        <Activity
          className="w-5 h-5 text-cyan"
          style={{ filter: "drop-shadow(0 0 8px rgba(0,242,255,0.7))" }}
        />
        <span
          className="text-[12px] font-bold tracking-[0.25em] text-foreground uppercase"
        >
          PROTOCOL
        </span>
      </div>

      <div
        className="w-full max-w-xs bg-card border border-[#222] rounded-2xl p-6 shadow-2xl"
        style={{ boxShadow: "0 0 40px rgba(0,0,0,0.7), 0 0 1px rgba(0,242,255,0.1)" }}
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-10 h-10 rounded-full border border-cyan/20 flex items-center justify-center mb-3"
            style={{ boxShadow: "0 0 16px rgba(0,242,255,0.1)" }}
          >
            <Lock className="w-5 h-5 text-cyan" />
          </div>
          <h2 className="text-sm font-semibold text-foreground tracking-wider">
            {hasPassphrase ? "Locked" : "Set Passphrase"}
          </h2>
          <p className="text-[10px] text-muted-foreground/60 mt-1 text-center max-w-[200px] leading-relaxed">
            {hasPassphrase
              ? "Data encrypted. Enter your passphrase to access."
              : "Secure your data with a local passphrase. Never stored or transmitted."}
          </p>
        </div>

        <form
          onSubmit={hasPassphrase ? handleUnlock : handleSetPassphrase}
          className="space-y-3"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type={showPw ? "text" : "password"}
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => {
                setPassphraseInput(e.target.value);
                setLocalError(null);
              }}
              autoComplete={hasPassphrase ? "current-password" : "new-password"}
              className={cn(
                "w-full bg-[#111] border rounded-md px-3 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-1 transition-colors pr-10",
                error
                  ? "border-destructive/50 focus:border-destructive/70 focus:ring-destructive/20"
                  : "border-[#222] focus:border-cyan/50 focus:ring-cyan/20"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!hasPassphrase && (
            <input
              type={showPw ? "text" : "password"}
              placeholder="Confirm passphrase"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setLocalError(null);
              }}
              autoComplete="new-password"
              className={cn(
                "w-full bg-[#111] border rounded-md px-3 py-2.5 text-sm font-mono text-foreground placeholder-muted-foreground/30 focus:outline-none focus:ring-1 transition-colors",
                error && confirm && passphrase !== confirm
                  ? "border-destructive/50 focus:border-destructive/70 focus:ring-destructive/20"
                  : "border-[#222] focus:border-cyan/50 focus:ring-cyan/20"
              )}
            />
          )}

          {error && (
            <p className="text-xs text-destructive font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !passphrase}
            className="w-full bg-cyan text-black font-bold py-2.5 rounded-md hover:bg-cyan/90 disabled:bg-cyan/15 disabled:text-cyan/30 disabled:cursor-not-allowed transition-all text-xs uppercase tracking-widest"
            style={
              passphrase ? { boxShadow: "0 0 16px rgba(0,242,255,0.2)" } : undefined
            }
          >
            {loading ? "Processing…" : hasPassphrase ? "Unlock" : "Set & Enter"}
          </button>
        </form>

        <p className="text-[9px] text-muted-foreground/25 text-center mt-4 leading-relaxed font-mono">
          AES-256-GCM · PBKDF2 · local-only
        </p>
      </div>
    </div>
  );
}
