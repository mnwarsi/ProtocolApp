import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CompoundFunctionClass =
  | "repair"
  | "metabolic"
  | "growth"
  | "performance"
  | "aesthetic";

type SeedLibraryEntry = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  aliases: string[];
  kind: "peptide";
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
  };
  researchLinks: Array<{ label: string; href: string }>;
  source: {
    label: string;
    href: string;
    lastReviewed: string;
    status: "seed";
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const inputPath = path.join(repoRoot, "scripts", "data", "protocol-library.seed.json");
const outputPath = path.join(repoRoot, "artifacts", "protocol", "src", "data", "library.generated.ts");

function assertString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected ${field} to be a non-empty string.`);
  }
}

function assertStringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Expected ${field} to be an array of strings.`);
  }
}

function validateEntry(entry: unknown, index: number): asserts entry is SeedLibraryEntry {
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`Entry ${index} must be an object.`);
  }

  const record = entry as Record<string, unknown>;
  assertString(record.id, `entries[${index}].id`);
  assertString(record.slug, `entries[${index}].slug`);
  assertString(record.name, `entries[${index}].name`);
  assertString(record.shortName, `entries[${index}].shortName`);
  assertStringArray(record.aliases, `entries[${index}].aliases`);
  assertString(record.kind, `entries[${index}].kind`);
  assertString(record.functionClass, `entries[${index}].functionClass`);
  assertString(record.functionLabel, `entries[${index}].functionLabel`);
  assertString(record.headline, `entries[${index}].headline`);
  assertString(record.summary, `entries[${index}].summary`);
  assertStringArray(record.primaryGoals, `entries[${index}].primaryGoals`);
  assertString(record.mechanism, `entries[${index}].mechanism`);
  assertStringArray(record.considerations, `entries[${index}].considerations`);
  assertStringArray(record.overlapSignals, `entries[${index}].overlapSignals`);
  assertStringArray(record.sideEffectSignals, `entries[${index}].sideEffectSignals`);

  const quickFacts = record.quickFacts as Record<string, unknown> | undefined;
  if (!quickFacts) {
    throw new Error(`entries[${index}].quickFacts is required.`);
  }
  assertString(quickFacts.route, `entries[${index}].quickFacts.route`);
  assertString(quickFacts.typicalDose, `entries[${index}].quickFacts.typicalDose`);
  assertString(quickFacts.frequency, `entries[${index}].quickFacts.frequency`);
  assertString(quickFacts.cycle, `entries[${index}].quickFacts.cycle`);
  assertString(quickFacts.storage, `entries[${index}].quickFacts.storage`);

  const researchLinks = record.researchLinks;
  if (!Array.isArray(researchLinks)) {
    throw new Error(`entries[${index}].researchLinks must be an array.`);
  }
  researchLinks.forEach((link, linkIndex) => {
    if (typeof link !== "object" || link === null) {
      throw new Error(`entries[${index}].researchLinks[${linkIndex}] must be an object.`);
    }
    const linkRecord = link as Record<string, unknown>;
    assertString(linkRecord.label, `entries[${index}].researchLinks[${linkIndex}].label`);
    assertString(linkRecord.href, `entries[${index}].researchLinks[${linkIndex}].href`);
  });

  const source = record.source as Record<string, unknown> | undefined;
  if (!source) {
    throw new Error(`entries[${index}].source is required.`);
  }
  assertString(source.label, `entries[${index}].source.label`);
  assertString(source.href, `entries[${index}].source.href`);
  assertString(source.lastReviewed, `entries[${index}].source.lastReviewed`);
  assertString(source.status, `entries[${index}].source.status`);
}

async function main() {
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Seed library file must contain an array.");
  }

  parsed.forEach((entry, index) => validateEntry(entry, index));

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const entry of parsed) {
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate id: ${entry.id}`);
    }
    if (seenSlugs.has(entry.slug)) {
      throw new Error(`Duplicate slug: ${entry.slug}`);
    }
    seenIds.add(entry.id);
    seenSlugs.add(entry.slug);
  }

  const sortedEntries = [...parsed].sort((a, b) => a.name.localeCompare(b.name));
  const fileContents = `import type { LibraryEntry } from "@/data/library-schema";

// This file is generated by scripts/src/generate-library.ts.
// Edit scripts/data/protocol-library.seed.json and regenerate instead.
export const LIBRARY_ENTRIES: LibraryEntry[] = ${JSON.stringify(sortedEntries, null, 2)};
`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, fileContents);

  console.log(`Generated ${sortedEntries.length} library entries at ${outputPath}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
