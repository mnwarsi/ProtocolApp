import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  formatGeneratedLibrary,
  libraryGeneratedPath,
  loadLibrarySeed,
} from "./library-tools";

async function main() {
  const entries = await loadLibrarySeed();
  const fileContents = formatGeneratedLibrary(entries);

  await mkdir(path.dirname(libraryGeneratedPath), { recursive: true });
  await writeFile(libraryGeneratedPath, fileContents);

  console.log(`Generated ${entries.length} library entries at ${libraryGeneratedPath}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
