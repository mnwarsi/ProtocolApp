import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Beaker,
  Microscope,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { LIBRARY_ENTRIES, type LibraryEntry } from "@/data/library";
import { compoundColor } from "@/lib/compoundColor";

const FACT_LABELS: Array<{ key: keyof LibraryEntry["quickFacts"]; label: string }> = [
  { key: "route", label: "Route" },
  { key: "typicalDose", label: "Typical dose" },
  { key: "frequency", label: "Frequency" },
  { key: "cycle", label: "Cycle" },
  { key: "storage", label: "Storage" },
];

function DetailCard({ entry }: { entry: LibraryEntry }) {
  const color = compoundColor(entry.compoundId ?? entry.slug);

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(0,242,255,0.12),transparent_32%),linear-gradient(180deg,rgba(17,20,22,0.94),rgba(9,10,12,0.98))]">
      <div className="border-b border-white/6 px-5 py-5 md:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
                style={{ borderColor: color.border, background: color.bg, color: color.text }}
              >
                {entry.functionLabel}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/60">
                {entry.kind}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{entry.name}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground/76">{entry.headline}</p>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground/72">{entry.summary}</p>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 px-4 py-4 text-sm text-muted-foreground/70">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan/70">Source</div>
            <div className="mt-2 font-medium text-foreground">{entry.source.label}</div>
            <a
              href={entry.source.href}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-cyan transition hover:text-cyan/80"
            >
              Open reference
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/45">
              Reviewed {entry.source.lastReviewed}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 md:px-7 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FACT_LABELS.map(({ key, label }) => (
              <div key={key} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/52">{label}</div>
                <div className="mt-3 text-sm leading-6 text-foreground/88">{entry.quickFacts[key]}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">
              <Microscope className="h-4 w-4 text-cyan/70" />
              What It Does
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground/76">{entry.mechanism}</p>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">
              <Sparkles className="h-4 w-4 text-cyan/70" />
              Common Research Goals
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.primaryGoals.map((goal) => (
                <span
                  key={goal}
                  className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-sm text-foreground/84"
                >
                  {goal}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Considerations
            </div>
            <div className="mt-4 space-y-3">
              {entry.considerations.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-muted-foreground/76">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">
              <ShieldAlert className="h-4 w-4 text-cyan/70" />
              Overlap Signals
            </div>
            <div className="mt-4 space-y-3">
              {entry.overlapSignals.map((item) => (
                <div key={item} className="rounded-2xl border border-cyan/10 bg-cyan/[0.04] px-4 py-3 text-sm leading-6 text-foreground/80">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Possible Friction Points</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.sideEffectSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full border border-amber-400/16 bg-amber-400/[0.06] px-3 py-1.5 text-sm text-amber-100/86"
                >
                  {signal}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground/55">Research Links</div>
            <div className="mt-4 space-y-2">
              {entry.researchLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-foreground/84 transition hover:border-cyan/20 hover:text-cyan"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LibraryPanel() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(LIBRARY_ENTRIES[0]?.id ?? "");

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return LIBRARY_ENTRIES;

    return LIBRARY_ENTRIES.filter((entry) =>
      [
        entry.name,
        entry.shortName,
        ...entry.aliases,
        entry.functionLabel,
        entry.headline,
        entry.summary,
        ...entry.primaryGoals,
        ...entry.sideEffectSignals,
        ...entry.overlapSignals,
      ].some((field) => field.toLowerCase().includes(normalized))
    );
  }, [query]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedId) ??
    LIBRARY_ENTRIES.find((entry) => entry.id === selectedId) ??
    filteredEntries[0] ??
    LIBRARY_ENTRIES[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] animate-in fade-in duration-500">
      <aside className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,21,23,0.96),rgba(9,10,12,0.96))] p-4">
        <div className="rounded-[24px] border border-cyan/14 bg-[radial-gradient(circle_at_top_left,rgba(0,242,255,0.12),transparent_46%),rgba(255,255,255,0.02)] p-5">
          <div className="text-[11px] uppercase tracking-[0.22em] text-cyan/70">Protocol Library</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Research before you dose</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground/76">
            A native, offline-friendly catalog for learning what a peptide is for, how it is commonly framed, and where overlap risks might start.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50">Entries</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{LIBRARY_ENTRIES.length}</div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50">Ready for sync</div>
              <div className="mt-2 text-sm leading-6 text-foreground/84">Schema built for a larger PepPedia-derived import.</div>
            </div>
          </div>
        </div>

        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search peptide, alias, goal, effect"
            className="w-full rounded-[22px] border border-white/8 bg-black/20 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/34 focus:border-cyan/24 focus:outline-none"
          />
        </label>

        <div className="mt-4 space-y-3">
          {filteredEntries.map((entry) => {
            const color = compoundColor(entry.compoundId ?? entry.slug);
            const isActive = selectedEntry?.id === entry.id;

            return (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className="w-full rounded-[24px] border px-4 py-4 text-left transition hover:border-cyan/20"
                style={{
                  borderColor: isActive ? color.border : "rgba(255,255,255,0.08)",
                  background: isActive ? color.bg : "rgba(0,0,0,0.18)",
                  boxShadow: isActive ? "0 0 18px rgba(0,242,255,0.06)" : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-medium text-foreground">{entry.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground/66">{entry.headline}</div>
                  </div>
                  <div className="rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: color.text }}>
                    {entry.shortName}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.primaryGoals.slice(0, 2).map((goal) => (
                    <span
                      key={goal}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-muted-foreground/72"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {filteredEntries.length === 0 && (
          <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center">
            <Beaker className="mx-auto h-5 w-5 text-muted-foreground/24" />
            <div className="mt-3 text-base font-medium text-foreground">No matches yet</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground/60">
              Try a peptide name, goal like weight or recovery, or a common alias.
            </p>
          </div>
        )}
      </aside>

      {selectedEntry ? <DetailCard entry={selectedEntry} /> : null}
    </div>
  );
}
