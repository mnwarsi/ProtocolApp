import {
  escapeRegExp,
  libraryImportPath,
  libraryImportReportPath,
  loadImportMapping,
  type CompoundFunctionClass,
  type PepPediaImportMapping,
  type PharmacokineticConfidence,
  type SeedLibraryEntry,
  uniqueStrings,
  validateLibraryEntries,
  writeJsonFile,
} from "./library-tools";

const BASE_URL = "https://pep-pedia.org";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

type ParsedDuration = {
  halfLifeLabel: string;
  halfLifeHours?: number;
  confidence: PharmacokineticConfidence;
};

type ImportWarning = {
  slug: string;
  warnings: string[];
};

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugToShortName(slug: string) {
  const cleaned = slug.replace(/\([^)]*\)/g, "");
  const parts = cleaned.split(/[-\s]+/).filter(Boolean);
  if (parts.length === 0) return slug.slice(0, 3).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
  const acronym = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return acronym.slice(0, 8);
}

function normalizeGoal(goal: string) {
  return goal
    .replace(/\b(Most Effective|Effective|Moderate|Limited|Emerging|Clinical|Approved)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSentence(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractFirstMatch(html: string, pattern: RegExp) {
  const match = pattern.exec(html);
  return match ? stripTags(match[1]) : undefined;
}

function extractTagText(html: string, tagName: string) {
  return extractFirstMatch(html, new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
}

function extractHeaderSubtitle(html: string) {
  return extractFirstMatch(
    html,
    /<h1[^>]*>[\s\S]*?<\/h1>\s*<div[^>]*>[\s\S]*?<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
  ) ?? extractFirstMatch(html, /<h1[^>]*>[\s\S]*?<\/h1>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
}

function extractSectionHtml(html: string, heading: string) {
  const headingPattern = new RegExp(`<h2[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>`, "i");
  const headingMatch = headingPattern.exec(html);
  if (!headingMatch) return undefined;

  const start = headingMatch.index + headingMatch[0].length;
  const tail = html.slice(start);
  const nextHeading = /<h2[^>]*>/i.exec(tail);
  const end = nextHeading ? start + nextHeading.index : html.length;
  return html.slice(start, end);
}

function extractSubsectionText(sectionHtml: string | undefined, heading: string) {
  if (!sectionHtml) return undefined;
  return extractFirstMatch(
    sectionHtml,
    new RegExp(`<h3[^>]*>[^<]*${escapeRegExp(heading)}[^<]*<\\/h3>([\\s\\S]*?)(?=<h3|$)`, "i"),
  );
}

function extractParagraphs(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];
  return uniqueStrings(
    Array.from(sectionHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
      .map((match) => stripTags(match[1]))
      .filter((item) => item.length > 20),
  );
}

function extractListItems(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];
  return uniqueStrings(
    Array.from(sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((match) => stripTags(match[1]))
      .filter((item) => item.length > 8),
  );
}

function extractFactCard(html: string, label: string) {
  const pattern = new RegExp(
    `${escapeRegExp(label)}<\\/div><div><div[^>]*>([\\s\\S]*?)<\\/div><div[^>]*>([\\s\\S]*?)<\\/div>`,
    "i",
  );
  const match = pattern.exec(html);
  if (!match) return undefined;

  return {
    primary: stripTags(match[1]),
    secondary: stripTags(match[2]),
  };
}

function extractInteractionSignals(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];
  const matches = Array.from(
    sectionHtml.matchAll(
      /<span[^>]*text-body-sm[^>]*>([\s\S]*?)<\/span><span[^>]*tracking-widest[^>]*>([\s\S]*?)<\/span>/gi,
    ),
  ).map((match) => `${stripTags(match[1])} — ${stripTags(match[2])}`);

  return uniqueStrings(matches);
}

function extractResearchGoals(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];
  return uniqueStrings(
    Array.from(sectionHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi))
      .map((match) => normalizeGoal(stripTags(match[1])))
      .filter((goal) => goal.length > 3 && !goal.startsWith("What is") && goal !== "Mechanism of Action"),
  ).slice(0, 6);
}

function extractReferenceLinks(sectionHtml: string | undefined) {
  if (!sectionHtml) return [];
  const links = Array.from(
    sectionHtml.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
  )
    .map((match) => ({
      href: match[1],
      label: stripTags(match[2]),
    }))
    .filter((link) => link.label.length > 2);

  return links;
}

function inferAliases(name: string, summary: string) {
  const aliases = new Set<string>();
  const summaryAliases = Array.from(summary.matchAll(/\(([A-Za-z0-9β+\- ]{2,20})\)/g))
    .map((match) => match[1].trim())
    .filter((value) => value.toLowerCase() !== name.toLowerCase());

  for (const alias of summaryAliases) aliases.add(alias);
  return Array.from(aliases);
}

function inferFunctionClass(
  slug: string,
  content: string,
  mapping: PepPediaImportMapping,
): CompoundFunctionClass {
  const mapped = mapping.functionClassBySlug[slug];
  if (mapped) return mapped;

  const text = content.toLowerCase();
  if (/(weight|glp-1|gip|glucagon|metabolic|glucose|appetite|diabetes)/.test(text)) return "metabolic";
  if (/(growth hormone|gh|igf|secretagogue|pituitary)/.test(text)) return "growth";
  if (/(repair|recovery|wound|healing|tissue|angiogenesis|regeneration)/.test(text)) return "repair";
  if (/(skin|beauty|tanning|hair|aesthetic|arousal|sexual)/.test(text)) return "aesthetic";
  return "performance";
}

function functionLabelForClass(functionClass: CompoundFunctionClass) {
  switch (functionClass) {
    case "repair":
      return "Recovery";
    case "metabolic":
      return "Metabolic";
    case "growth":
      return "Growth";
    case "aesthetic":
      return "Aesthetic";
    case "performance":
    default:
      return "Performance";
  }
}

function parseDurationToHours(rawValue: string): ParsedDuration {
  const normalized = rawValue.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const approx = /~|about|approx|approximately/.test(lower);
  const range = lower.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  const single = lower.match(/(\d+(?:\.\d+)?)/);
  let value = single ? Number(single[1]) : undefined;
  let confidence: PharmacokineticConfidence = approx ? "estimated" : "exact";

  if (range) {
    value = (Number(range[1]) + Number(range[2])) / 2;
    confidence = "estimated";
  }

  if (value === undefined) {
    return {
      halfLifeLabel: normalized || "Unknown",
      confidence: "unknown",
    };
  }

  let hours = value;
  if (/\bmin\b/.test(lower)) {
    hours = value / 60;
  } else if (/\bday\b|\bdays\b/.test(lower)) {
    hours = value * 24;
  } else if (/\bweek\b|\bweeks\b/.test(lower)) {
    hours = value * 24 * 7;
  }

  return {
    halfLifeLabel: normalized,
    halfLifeHours: Number(hours.toFixed(3)),
    confidence,
  };
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchHtmlWithRetry(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetchHtml(url);
    } catch (error) {
      lastError = error;
      await delay(250 * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function discoverPeptideUrls() {
  const html = await fetchHtmlWithRetry(`${BASE_URL}/browse`);
  const urls = uniqueStrings(
    Array.from(html.matchAll(/href="(\/peptides\/[^"]+)"/g)).map((match) => `${BASE_URL}${match[1]}`),
  );
  return urls.sort();
}

function normalizeQuickFact(primary?: string, secondary?: string) {
  return uniqueStrings([primary ?? "", secondary ?? ""]).join(" · ") || "Unknown";
}

function buildFallbackResearchLinks(name: string) {
  return [
    { label: "PubMed search", href: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(name)}` },
    { label: "Google Scholar", href: `https://scholar.google.com/scholar?q=${encodeURIComponent(name)}` },
  ];
}

async function importEntry(url: string, mapping: PepPediaImportMapping): Promise<{ entry: SeedLibraryEntry; warnings: string[] }> {
  const html = await fetchHtmlWithRetry(url);
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  const name = extractTagText(html, "h1") ?? titleCase(slug.replace(/-/g, " "));
  const overviewHtml = extractSectionHtml(html, "Overview");
  const researchHtml = extractSectionHtml(html, "Research Indications");
  const interactionsHtml = extractSectionHtml(html, "Peptide Interactions");
  const referencesHtml = extractSectionHtml(html, "References");
  const safetyHtml = extractSectionHtml(html, "Side Effects & Safety");
  const expectHtml = extractSectionHtml(html, "What to Expect");
  const pkHtml = extractSectionHtml(html, "Pharmacokinetics");

  const summary =
    extractSubsectionText(overviewHtml, "What is") ??
    extractParagraphs(overviewHtml)[0] ??
    extractHeaderSubtitle(html) ??
    `${name} imported from PepPedia for manual review.`;
  const mechanism =
    extractSubsectionText(overviewHtml, "Mechanism of Action") ??
    extractParagraphs(overviewHtml)[1] ??
    summary;

  const typicalDoseCard = extractFactCard(html, "Typical Dose");
  const routeCard = extractFactCard(html, "Route");
  const cycleCard = extractFactCard(html, "Cycle");
  const storageCard = extractFactCard(html, "Storage");
  const pkMatch = pkHtml?.match(/Half-life:<\/span><span[^>]*>([\s\S]*?)<\/span>/i);
  const parsedHalfLife = pkMatch
    ? parseDurationToHours(stripTags(pkMatch[1]))
    : {
        halfLifeLabel: "Unknown",
        confidence: "unknown" as const,
      };
  const overriddenHalfLife = mapping.halfLifeOverridesBySlug[slug];
  const halfLife = overriddenHalfLife ?? parsedHalfLife;

  const primaryGoals = extractResearchGoals(researchHtml);
  const overlapSignals = extractInteractionSignals(interactionsHtml);
  const safetyPoints = uniqueStrings([
    ...extractListItems(safetyHtml).slice(0, 4),
    ...extractParagraphs(expectHtml).slice(0, 2),
  ]);
  const sideEffectSignals = uniqueStrings(
    safetyPoints
      .flatMap((point) => point.split(/[.;]/))
      .map((point) => normalizeSentence(point))
      .filter((point) => point.length > 8),
  ).slice(0, 6);

  const searchCorpus = [
    name,
    extractHeaderSubtitle(html) ?? "",
    summary,
    mechanism,
    ...primaryGoals,
    ...overlapSignals,
  ].join(" ");

  const functionClass = inferFunctionClass(slug, searchCorpus, mapping);
  const functionLabel = functionLabelForClass(functionClass);
  const researchLinks = extractReferenceLinks(referencesHtml);
  const warnings: string[] = [];

  if (primaryGoals.length === 0) warnings.push("Missing primary goals");
  if (overlapSignals.length === 0) warnings.push("Missing overlap signals");
  if (halfLife.halfLifeLabel === "Unknown") warnings.push("Missing half-life");
  if (!mapping.functionClassBySlug[slug] && functionClass === "performance") warnings.push("Function class inferred via fallback");

  const entry: SeedLibraryEntry = {
    id: `library-${slug}`,
    slug,
    name,
    shortName: mapping.shortNameBySlug[slug] ?? slugToShortName(slug),
    aliases: inferAliases(name, summary),
    kind: "peptide",
    compoundId: mapping.compoundIdBySlug[slug],
    functionClass,
    functionLabel,
    headline: mapping.headlineBySlug[slug] ?? extractHeaderSubtitle(html) ?? `${name} imported from PepPedia.`,
    summary,
    primaryGoals: primaryGoals.length > 0 ? primaryGoals : [functionLabel],
    mechanism,
    considerations: safetyPoints.length > 0 ? safetyPoints : ["Manual review needed for considerations."],
    overlapSignals: overlapSignals.length > 0 ? overlapSignals : ["Manual review needed for overlap signals."],
    sideEffectSignals: sideEffectSignals.length > 0 ? sideEffectSignals : ["Manual review needed for side-effect signals."],
    quickFacts: {
      route: normalizeQuickFact(routeCard?.primary, routeCard?.secondary),
      typicalDose: normalizeQuickFact(typicalDoseCard?.primary, undefined),
      frequency: normalizeQuickFact(typicalDoseCard?.secondary, undefined),
      cycle: normalizeQuickFact(cycleCard?.primary, cycleCard?.secondary),
      storage: normalizeQuickFact(storageCard?.primary, storageCard?.secondary),
      halfLife: halfLife.halfLifeLabel,
    },
    pharmacokinetics: {
      halfLifeHours: halfLife.halfLifeHours,
      halfLifeLabel: halfLife.halfLifeLabel,
      confidence: halfLife.confidence,
    },
    researchLinks: researchLinks.length > 0 ? researchLinks : buildFallbackResearchLinks(name),
    source: {
      label: "PepPedia import",
      href: url,
      lastReviewed: new Date().toISOString().slice(0, 10),
      status: "imported",
    },
  };

  return { entry, warnings };
}

async function mapWithConcurrency<T, R>(values: T[], concurrency: number, worker: (value: T) => Promise<R>) {
  const results: R[] = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
      await delay(150);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker()));
  return results;
}

async function main() {
  const mapping = await loadImportMapping();
  const urls = await discoverPeptideUrls();
  const imported = await mapWithConcurrency(urls, 3, async (url) => importEntry(url, mapping));

  const entries = imported.map((item) => item.entry);
  const warnings: ImportWarning[] = imported
    .filter((item) => item.warnings.length > 0)
    .map((item) => ({ slug: item.entry.slug, warnings: item.warnings }));

  validateLibraryEntries(entries);
  await writeJsonFile(libraryImportPath, entries);
  await writeJsonFile(libraryImportReportPath, {
    fetchedAt: new Date().toISOString(),
    discoveredUrls: urls.length,
    importedEntries: entries.length,
    warnings,
  });

  console.log(`Imported ${entries.length} PepPedia entries to ${libraryImportPath}`);
  if (warnings.length > 0) {
    console.log(`Warnings for ${warnings.length} entries written to ${libraryImportReportPath}`);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
