/**
 * Panta category catalog — single source of truth for every surface that
 * shows or asks for a category (Explore tabs, Create wizard, AI structuring,
 * card pills).
 *
 * Why hardcoded: Panta's own endpoints DISAGREE (verified 2026-10-02).
 * Their GET /categories/ returns "sports, crypto, politics, entertainment,
 * finance, science, world, other", but actual market rows carry completely
 * different slugs — filtering ?category=entertainment or ?category=finance
 * returns ZERO rows while the live feed is full of pop-culture / stocks /
 * commodities / macroeconomics / space-universe markets. Trust the data, not
 * the directory: the list below is the distinct category set observed across
 * the live catalog on 2026-10-02 (page-1 samples, 50+ rows).
 *
 * Display labels keep tab names human-friendly ("pop-culture" → "Pop Culture").
 */
export const PANTA_CATEGORIES = [
  "sports",
  "crypto",
  "stocks",
  "pop-culture",
  "politics",
  "commodities",
  "macroeconomics",
  "space-universe",
  "world",
] as const;

export type PantaCategory = (typeof PANTA_CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports",
  crypto: "Crypto",
  stocks: "Stocks",
  "pop-culture": "Pop Culture",
  politics: "Politics",
  commodities: "Commodities",
  macroeconomics: "Macroeconomics",
  "space-universe": "Space",
  world: "World",
};

/** Legacy/phantom slugs → the real ones markets actually use. */
const CATEGORY_SYNONYMS: Record<string, string> = {
  entertainment: "pop-culture",
  finance: "stocks",
  science: "space-universe",
};

export function categoryLabel(category: string): string {
  const slug = (category || "").trim();
  return CATEGORY_LABELS[slug] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Other");
}

export function normalizeCategory(category: string): string {
  const slug = (category || "").trim().toLowerCase();
  return CATEGORY_SYNONYMS[slug] ?? slug;
}

/** Labels for the tab row, in catalog order. */
export function categoryTabs(): { slug: string; label: string }[] {
  return PANTA_CATEGORIES.map((slug) => ({ slug, label: categoryLabel(slug) }));
}
