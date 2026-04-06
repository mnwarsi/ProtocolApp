export type DoseUnit = "mcg" | "mg";
export type FrequencyKey =
  | "daily"
  | "twice_daily"
  | "eod"
  | "weekly"
  | "custom";
export type CompoundFunctionClass =
  | "repair"
  | "metabolic"
  | "growth"
  | "performance"
  | "aesthetic";

export interface FrequencyOption {
  key: FrequencyKey;
  label: string;
  intervalHours: number;
}

export interface Compound {
  id: string;
  name: string;
  shortName: string;
  functionClass: CompoundFunctionClass;
  functionLabel: string;
  purpose: string;
  primaryUse: string;
  overview: string;
  cautions: string[];
  overlapWarnings: string[];
  researchLinks: Array<{ label: string; href: string }>;
  commonVialSizes: number[];
  defaultVialSizeMg: number;
  commonWaterVolumes: number[];
  defaultWaterVolumeMl: number;
  halfLifeHours: number;
  defaultDose: number;
  defaultDoseUnit: DoseUnit;
  commonFrequencies: FrequencyKey[];
  notes: string;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { key: "daily", label: "Daily", intervalHours: 24 },
  { key: "twice_daily", label: "Twice Daily", intervalHours: 12 },
  { key: "eod", label: "Every Other Day", intervalHours: 48 },
  { key: "weekly", label: "Weekly", intervalHours: 168 },
  { key: "custom", label: "Custom", intervalHours: 24 },
];

export const COMPOUNDS: Compound[] = [
  {
    id: "bpc-157",
    name: "BPC-157",
    shortName: "BPC",
    functionClass: "repair",
    functionLabel: "Recovery",
    purpose: "Tissue support and recovery-oriented peptide commonly explored for healing protocols.",
    primaryUse: "Often researched for tendon, gut, and soft-tissue recovery support.",
    overview: "A repair-focused peptide that people often explore when they want a recovery-oriented compound in a cycle.",
    cautions: [
      "Verify concentration carefully because doses are often measured in micrograms.",
      "Track injection frequency closely if stacking with other recovery compounds.",
    ],
    overlapWarnings: ["Stacks with TB-500 in many recovery protocols, so duplicate recovery dosing should be reviewed."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=BPC-157" },
    ],
    commonVialSizes: [2, 5, 10],
    defaultVialSizeMg: 5,
    commonWaterVolumes: [1, 2],
    defaultWaterVolumeMl: 1,
    halfLifeHours: 4,
    defaultDose: 250,
    defaultDoseUnit: "mcg",
    commonFrequencies: ["daily", "twice_daily"],
    notes: "Store lyophilized at 2–8°C. Reconstituted: refrigerate, use within 30 days.",
  },
  {
    id: "tb-500",
    name: "TB-500",
    shortName: "TB",
    functionClass: "repair",
    functionLabel: "Recovery",
    purpose: "Recovery-oriented peptide often researched alongside injury-support routines.",
    primaryUse: "Often explored for connective tissue recovery and systemic healing support.",
    overview: "A longer-acting recovery peptide often paired with local repair compounds in broader recovery protocols.",
    cautions: [
      "Longer half-life means overlap can build if re-dosed too aggressively.",
      "Review weekly totals when stacking with other repair-class compounds.",
    ],
    overlapWarnings: ["Commonly stacked with BPC-157, so the app should surface overlap within recovery-focused cycles."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=TB-500" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=TB-500" },
    ],
    commonVialSizes: [2, 5, 10],
    defaultVialSizeMg: 5,
    commonWaterVolumes: [1, 2],
    defaultWaterVolumeMl: 2,
    halfLifeHours: 96,
    defaultDose: 2,
    defaultDoseUnit: "mg",
    commonFrequencies: ["twice_daily", "eod", "weekly"],
    notes: "Half-life ~96h. Store refrigerated post-reconstitution.",
  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    shortName: "Sema",
    functionClass: "metabolic",
    functionLabel: "Metabolic",
    purpose: "Metabolic and appetite-regulation peptide used in weight-management contexts.",
    primaryUse: "Commonly researched for appetite control, glucose handling, and body-composition support.",
    overview: "A metabolic peptide typically taken weekly and monitored closely against weight, glucose markers, and GI tolerance.",
    cautions: [
      "Escalate slowly and track GI side effects and appetite suppression.",
      "Avoid accidental duplicate weekly logs because long half-life compounds persist.",
    ],
    overlapWarnings: ["Combining multiple appetite- or glucose-focused compounds should trigger extra caution."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=semaglutide" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=semaglutide" },
    ],
    commonVialSizes: [2, 3, 5],
    defaultVialSizeMg: 3,
    commonWaterVolumes: [1, 2],
    defaultWaterVolumeMl: 1,
    halfLifeHours: 168,
    defaultDose: 0.25,
    defaultDoseUnit: "mg",
    commonFrequencies: ["weekly"],
    notes: "Half-life ~168h. Subcutaneous administration. Store refrigerated.",
  },
  {
    id: "cjc-1295",
    name: "CJC-1295",
    shortName: "CJC",
    functionClass: "growth",
    functionLabel: "Growth",
    purpose: "Growth hormone secretagogue explored for recovery, body-composition, and sleep-related protocols.",
    primaryUse: "Commonly researched in GH-support stacks, often combined with other secretagogues.",
    overview: "A longer-acting growth-oriented peptide where schedule clarity matters because effects can span multiple days.",
    cautions: [
      "Clarify which form is being used and keep weekly cadence consistent.",
      "Watch overlap if stacked with other growth-hormone secretagogues.",
    ],
    overlapWarnings: ["Growth-secretagogue stacks should surface overlap with Ipamorelin and related compounds."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=CJC-1295" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=CJC-1295" },
    ],
    commonVialSizes: [2, 5],
    defaultVialSizeMg: 2,
    commonWaterVolumes: [1, 2],
    defaultWaterVolumeMl: 1,
    halfLifeHours: 192,
    defaultDose: 1,
    defaultDoseUnit: "mg",
    commonFrequencies: ["weekly", "eod"],
    notes: "DAC form. Half-life ~192h. Store refrigerated post-reconstitution.",
  },
  {
    id: "ipamorelin",
    name: "Ipamorelin",
    shortName: "Ipa",
    functionClass: "growth",
    functionLabel: "Growth",
    purpose: "Shorter-acting growth hormone secretagogue often used in recurring daily protocols.",
    primaryUse: "Explored for growth-hormone support, recovery, and body-composition routines.",
    overview: "A shorter-acting peptide that benefits from simple logging because dosing cadence can become frequent.",
    cautions: [
      "Frequent use raises the risk of accidental duplicate logs in the same day.",
      "Review overlap with other GH-support compounds.",
    ],
    overlapWarnings: ["Should warn when paired with CJC-1295 or other GH-support stacks."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=ipamorelin" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=ipamorelin" },
    ],
    commonVialSizes: [2, 5],
    defaultVialSizeMg: 2,
    commonWaterVolumes: [1, 2],
    defaultWaterVolumeMl: 1,
    halfLifeHours: 2,
    defaultDose: 200,
    defaultDoseUnit: "mcg",
    commonFrequencies: ["daily", "twice_daily"],
    notes: "Half-life ~2h. Store lyophilized at 2–8°C.",
  },
  {
    id: "pt-141",
    name: "PT-141",
    shortName: "PT",
    functionClass: "aesthetic",
    functionLabel: "Arousal",
    purpose: "Melanocortin peptide often explored for libido/arousal support and sometimes pigmentation-related effects.",
    primaryUse: "Commonly used as-needed rather than in a fixed daily cadence.",
    overview: "An as-needed compound where confidence cues and last-dose reminders matter more than fixed cycle scheduling.",
    cautions: [
      "As-needed compounds still need duplicate-dose warnings.",
      "Track nausea and blood-pressure-related symptoms when relevant.",
    ],
    overlapWarnings: ["Should warn if taken unusually close together because as-needed use can hide duplicate dosing."],
    researchLinks: [
      { label: "PubMed search", href: "https://pubmed.ncbi.nlm.nih.gov/?term=PT-141" },
      { label: "Google Scholar", href: "https://scholar.google.com/scholar?q=PT-141" },
    ],
    commonVialSizes: [10],
    defaultVialSizeMg: 10,
    commonWaterVolumes: [2],
    defaultWaterVolumeMl: 2,
    halfLifeHours: 12,
    defaultDose: 1,
    defaultDoseUnit: "mg",
    commonFrequencies: ["custom"],
    notes: "Half-life ~12h. As-needed administration. Store refrigerated.",
  },
];

export function getCompoundById(id: string): Compound | undefined {
  return COMPOUNDS.find((c) => c.id === id);
}

export function getCompoundsByFunction(functionClass: CompoundFunctionClass): Compound[] {
  return COMPOUNDS.filter((compound) => compound.functionClass === functionClass);
}
