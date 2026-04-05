import { Zap, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  compact?: boolean;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function UpgradePrompt({
  feature,
  description,
  compact = false,
  onUpgrade,
  onDismiss,
  className,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan/20 bg-cyan/5",
          className
        )}
      >
        <Zap
          className="w-3 h-3 text-cyan shrink-0"
          style={{ filter: "drop-shadow(0 0 4px rgba(0,242,255,0.4))" }}
        />
        <span className="text-[10px] text-cyan/70 flex-1">{feature} is a Pro feature</span>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-[9px] font-mono font-semibold uppercase tracking-widest text-cyan hover:text-white transition-colors"
          >
            Upgrade
          </button>
        )}
        {onDismiss && (
          <button onClick={handleDismiss} className="text-muted-foreground/30 hover:text-muted-foreground/60">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-cyan/20 bg-cyan/5 p-4",
        className
      )}
    >
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground/30 hover:text-muted-foreground/60"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan/10 border border-cyan/20 shrink-0"
        >
          <Zap
            className="w-4 h-4 text-cyan"
            style={{ filter: "drop-shadow(0 0 6px rgba(0,242,255,0.5))" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground/80 mb-0.5">
            {feature} — Pro Feature
          </p>
          {description && (
            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              {description}
            </p>
          )}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="mt-2.5 px-3 py-1.5 rounded text-[10px] font-mono font-semibold uppercase tracking-widest bg-cyan/10 border border-cyan/30 text-cyan hover:bg-cyan/20 hover:border-cyan/50 transition-colors"
              style={{ textShadow: "0 0 8px rgba(0,242,255,0.4)" }}
            >
              Upgrade to Pro — $19.99/mo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
