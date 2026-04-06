import type { CompoundFunctionClass } from "@/data/compounds";

export type LibraryEntryKind = "peptide";
export type EvidenceTier = "approved" | "clinical" | "emerging";
export type LibrarySourceStatus = "seed" | "imported";
export type PharmacokineticConfidence = "exact" | "estimated" | "unknown";

export interface LibraryEntry {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  aliases: string[];
  kind: LibraryEntryKind;
  compoundId?: string;
  functionClass: CompoundFunctionClass;
  functionLabel: string;
  headline: string;
  summary: string;
  primaryGoals: string[];
  mechanism: string;
  considerations: string[];
  overlapSignals: string[];
  sideEffectSignals: string[];
  quickFacts: {
    route: string;
    typicalDose: string;
    frequency: string;
    cycle: string;
    storage: string;
    halfLife: string;
  };
  pharmacokinetics?: {
    halfLifeHours?: number;
    halfLifeLabel?: string;
    confidence?: PharmacokineticConfidence;
  };
  researchLinks: Array<{ label: string; href: string }>;
  source: {
    label: string;
    href: string;
    lastReviewed: string;
    status: LibrarySourceStatus;
  };
}
