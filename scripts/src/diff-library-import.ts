import { loadLibraryImport, loadLibrarySeed, type SeedLibraryEntry } from "./library-tools";

function summarizeEntryChanges(seed: SeedLibraryEntry, imported: SeedLibraryEntry) {
  const changes: string[] = [];

  if (seed.headline !== imported.headline) changes.push("headline");
  if (seed.summary !== imported.summary) changes.push("summary");
  if (seed.functionClass !== imported.functionClass) changes.push("functionClass");
  if (seed.quickFacts.halfLife !== imported.quickFacts.halfLife) changes.push("halfLife");
  if ((seed.pharmacokinetics?.halfLifeHours ?? null) !== (imported.pharmacokinetics?.halfLifeHours ?? null)) {
    changes.push("halfLifeHours");
  }
  if (seed.source.href !== imported.source.href) changes.push("source.href");
  if (seed.primaryGoals.join("|") !== imported.primaryGoals.join("|")) changes.push("primaryGoals");
  if (seed.overlapSignals.join("|") !== imported.overlapSignals.join("|")) changes.push("overlapSignals");

  return changes;
}

async function main() {
  const seed = await loadLibrarySeed();
  const imported = await loadLibraryImport();

  const seedBySlug = new Map(seed.map((entry) => [entry.slug, entry]));
  const importBySlug = new Map(imported.map((entry) => [entry.slug, entry]));

  const newEntries = imported.filter((entry) => !seedBySlug.has(entry.slug));
  const removedEntries = seed.filter((entry) => !importBySlug.has(entry.slug));
  const changedEntries = imported
    .map((entry) => {
      const seedEntry = seedBySlug.get(entry.slug);
      if (!seedEntry) return null;
      const changes = summarizeEntryChanges(seedEntry, entry);
      return changes.length > 0 ? { slug: entry.slug, changes } : null;
    })
    .filter((entry): entry is { slug: string; changes: string[] } => Boolean(entry));

  const missingHalfLife = imported
    .filter((entry) => entry.quickFacts.halfLife === "Unknown" || entry.pharmacokinetics?.halfLifeHours === undefined)
    .map((entry) => entry.slug);

  const fallbackClassifications = imported
    .filter((entry) => !entry.compoundId && entry.functionClass === "performance")
    .map((entry) => entry.slug);

  console.log(`Seed entries: ${seed.length}`);
  console.log(`Imported entries: ${imported.length}`);
  console.log(`New entries: ${newEntries.length}`);
  console.log(`Removed entries: ${removedEntries.length}`);
  console.log(`Changed entries: ${changedEntries.length}`);

  if (newEntries.length > 0) {
    console.log("\nNew entries:");
    newEntries.forEach((entry) => console.log(`- ${entry.slug}`));
  }

  if (changedEntries.length > 0) {
    console.log("\nChanged entries:");
    changedEntries.forEach((entry) => console.log(`- ${entry.slug}: ${entry.changes.join(", ")}`));
  }

  if (removedEntries.length > 0) {
    console.log("\nRemoved entries:");
    removedEntries.forEach((entry) => console.log(`- ${entry.slug}`));
  }

  if (missingHalfLife.length > 0) {
    console.log("\nMissing or ambiguous half-life:");
    missingHalfLife.forEach((slug) => console.log(`- ${slug}`));
  }

  if (fallbackClassifications.length > 0) {
    console.log("\nFallback function classifications:");
    fallbackClassifications.forEach((slug) => console.log(`- ${slug}`));
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
