import {
  librarySeedPath,
  loadLibraryImport,
  loadLibrarySeed,
  normalizeLibraryEntries,
  type SeedLibraryEntry,
  writeJsonFile,
} from "./library-tools";

function mergeEntry(existing: SeedLibraryEntry | undefined, imported: SeedLibraryEntry): SeedLibraryEntry {
  if (!existing) {
    return imported;
  }

  return {
    ...existing,
    ...imported,
    compoundId: imported.compoundId ?? existing.compoundId,
    aliases: imported.aliases.length > 0 ? imported.aliases : existing.aliases,
    researchLinks: imported.researchLinks.length > 0 ? imported.researchLinks : existing.researchLinks,
    pharmacokinetics: imported.pharmacokinetics ?? existing.pharmacokinetics,
    source: imported.source,
  };
}

async function main() {
  const seed = await loadLibrarySeed();
  const imported = await loadLibraryImport();

  const mergedBySlug = new Map(seed.map((entry) => [entry.slug, entry]));

  for (const entry of imported) {
    mergedBySlug.set(entry.slug, mergeEntry(mergedBySlug.get(entry.slug), entry));
  }

  const merged = normalizeLibraryEntries(Array.from(mergedBySlug.values()));
  await writeJsonFile(librarySeedPath, merged);

  console.log(`Merged ${imported.length} imported entries into ${librarySeedPath}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
