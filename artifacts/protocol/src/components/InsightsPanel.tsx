import { useMemo } from "react";
import { Activity, Brain, CalendarRange, FlaskConical, LineChart } from "lucide-react";
import LogPanel from "@/components/LogPanel";
import BiofeedbackPanel from "@/components/BiofeedbackPanel";
import { useProtocolStore } from "@/store/protocolStore";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
        <Icon className="h-3.5 w-3.5 text-cyan/70" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground/64">{hint}</div>
    </div>
  );
}

export default function InsightsPanel() {
  const { entries, inventoryVials } = useProtocolStore();

  const overview = useMemo(() => {
    const symptomEntries = entries.filter((entry) => (entry.symptomTags?.length ?? 0) > 0 || entry.symptomNote);
    const averageUnits = entries.length > 0
      ? average(entries.slice(0, 10).map((entry) => entry.units))
      : 0;
    return {
      totalLogs: entries.length,
      symptomEntries: symptomEntries.length,
      averageUnits,
      activeVials: inventoryVials.filter((vial) => vial.status === "active").length,
    };
  }, [entries, inventoryVials]);

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan/70">Insights</div>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Review outcomes, not just raw charts</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground/76">
          Keep the biometrics, timeline, and history you already have, but organize them around interpretation:
          what changed, what you felt, and what your current cycle might be doing.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <SummaryCard
            label="Overview"
            value={`${overview.totalLogs}`}
            hint="Total logged doses"
            icon={CalendarRange}
          />
          <SummaryCard
            label="Subjective effects"
            value={`${overview.symptomEntries}`}
            hint="Logs with notes or symptom tags"
            icon={Brain}
          />
          <SummaryCard
            label="Typical draw"
            value={overview.averageUnits > 0 ? `${overview.averageUnits.toFixed(1)}u` : "—"}
            hint="Average from your latest ten logs"
            icon={FlaskConical}
          />
          <SummaryCard
            label="Biomarkers"
            value={`${overview.activeVials}`}
            hint="Active vials available for correlation"
            icon={LineChart}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
        <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Compound timeline</div>
        <LogPanel />
      </section>

      <section className="rounded-[28px] border border-white/8 bg-card/85 p-5">
        <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Biomarker trends</div>
        <BiofeedbackPanel />
      </section>
    </div>
  );
}
