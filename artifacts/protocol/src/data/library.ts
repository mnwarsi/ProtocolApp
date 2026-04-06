import { LIBRARY_ENTRIES } from "@/data/library.generated";

export type { LibraryEntry, LibraryEntryKind, EvidenceTier } from "@/data/library-schema";
export { LIBRARY_ENTRIES };

export function getLibraryEntryById(id: string) {
  return LIBRARY_ENTRIES.find((entry) => entry.id === id);
}
