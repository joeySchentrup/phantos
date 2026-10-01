import type { LoreAttribute, LoreCategory } from "~/types/lore";

/**
 * Each category is dressed as a card frame, the way a duel monster's frame
 * colour tells you what kind of card it is at a glance.
 */
export const CATEGORIES: Record<LoreCategory, { label: string; plural: string; description: string }> = {
  tale: { label: "Tale", plural: "Tales", description: "Stories, poems and plays from across the world." },
  chronicle: { label: "Chronicle", plural: "Chronicles", description: "Histories, nations, and the people who shaped them." },
  myth: { label: "Myth", plural: "Myths", description: "Creation stories, scripture and prophecy." },
  dispatch: { label: "Dispatch", plural: "Dispatches", description: "In-world papers, reports, treatises and secrets." },
  codex: { label: "Codex", plural: "Codex", description: "Reference: calendars, languages, tables and rules." },
  dragon: { label: "Recollection", plural: "Recollections", description: "The Primal Dragons, in their own words." },
  map: { label: "Map", plural: "Maps", description: "Charts of the known world." },
};

export const CATEGORY_ORDER: LoreCategory[] = ["tale", "chronicle", "myth", "dispatch", "codex", "dragon", "map"];

/** The six primal elements of the world, plus the divine — one orb each. */
export const ATTRIBUTES: Record<LoreAttribute, { label: string; glyph: string; dragon: string }> = {
  light: { label: "Light", glyph: "光", dragon: "Ouro’ras" },
  dark: { label: "Dark", glyph: "闇", dragon: "Golestandt" },
  fire: { label: "Fire", glyph: "炎", dragon: "Vlaurunga" },
  ice: { label: "Ice", glyph: "氷", dragon: "Yvander" },
  earth: { label: "Earth", glyph: "地", dragon: "Rokesh" },
  arcane: { label: "Arcane", glyph: "魔", dragon: "Quintara Lotus" },
  divine: { label: "Divine", glyph: "神", dragon: "Kalistos" },
};

export const ATTRIBUTE_ORDER: LoreAttribute[] = ["light", "dark", "fire", "ice", "earth", "arcane", "divine"];

export const ATTRIBUTE_GLYPHS = ATTRIBUTE_ORDER.map((a) => ATTRIBUTES[a].glyph).join("");

/** Word counts at which a document earns its next level star (1–12). */
const LEVEL_THRESHOLDS = [0, 150, 300, 600, 1000, 1500, 2200, 3200, 4500, 6500, 10000, 20000];

/** A card's level is its length: a one-page note is level 1, an epic is level 12. */
export function levelFor(wordCount: number): number {
  if (!wordCount || wordCount <= 0) return 0;
  let level = 0;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (wordCount >= threshold) level++;
  }
  return level;
}

/** Markdown flattened to plain text — the same steps the server uses (pb_hooks/phantos/lib.js). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/\[\^[^\]]*\]:?/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, "$1")
    .replace(/\\$/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The card text the server fills in when the DM leaves it blank. */
export function autoSummary(markdown: string, max = 220): string {
  const text = plainText(markdown.replace(/\r\n?/g, "\n").replace(/^\s{0,3}#{1,6}\s+.*$/gm, ""));
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "") + "…";
}

/** Close enough to the server's count for a live preview while editing. */
export function estimateWords(markdown: string): number {
  return plainText(markdown)
    .split(" ")
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** "Chione_ Volume 1_ The Child.md" → "Chione: Volume 1: The Child". */
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/_ /g, ": ")
    .replace(/_/g, "'")
    .trim();
}

export function readingMinutes(wordCount: number): number {
  if (!wordCount) return 0;
  return Math.max(1, Math.round(wordCount / 230));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** PocketBase dates look like "2026-10-01 00:44:08.123Z". */
export function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Shrinks long card names so most of them fit the name bar without an ellipsis. */
export function titleScale(title: string, comfortableLength = 13): number {
  const length = title.length;
  if (length <= comfortableLength) return 1;
  return Math.max(0.45, comfortableLength / length);
}

/** "[Tale / Earth]" — the type line under the art, like "[Dragon / Effect]". */
export function typeLine(category: LoreCategory, attribute: LoreAttribute, author: string): string {
  const second = author?.trim() || ATTRIBUTES[attribute]?.label || "";
  return `[${CATEGORIES[category]?.label ?? "Lore"}${second ? ` / ${second}` : ""}]`;
}

function normalizeHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Most documents open by repeating their own title as a heading. The page
 * already shows the title, so drop leading headings that spell it out —
 * including titles split across a heading and a subheading.
 */
export function stripLeadingTitle(content: string, title: string): string {
  const target = normalizeHeading(title);
  if (!target) return content;

  const lines = content.split(/\r?\n/);
  let rest = target;
  let index = 0;
  let consumed = 0;

  while (rest) {
    while (index < lines.length && !lines[index].trim()) index++;
    const match = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(lines[index] ?? "");
    if (!match) break;
    const heading = normalizeHeading(match[1]);
    if (heading.length < 4 || !rest.startsWith(heading)) break;
    rest = rest.slice(heading.length);
    index++;
    consumed = index;
  }

  return consumed ? lines.slice(consumed).join("\n").replace(/^\s+/, "") : content;
}

/**
 * Heading anchors that match the ones Google Docs → pandoc exports link to
 * from their tables of contents, e.g. "Book One: The Child of Prophecy" →
 * "book-one-the-child-of-prophecy".
 */
export function headingSlug(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_.-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/^[^\p{L}]+/u, "");
  return slug || "section";
}

export function searchTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^["'(]+|["'),.;:!?]+$/g, ""))
    .filter(Boolean)
    .slice(0, 6);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Splits text into plain and matching runs so matches can be highlighted. */
export function highlightParts(text: string, terms: string[]): { text: string; match: boolean }[] {
  const usable = terms.filter(Boolean);
  if (!text || !usable.length) return [{ text, match: false }];

  const pattern = new RegExp(`(${usable.map(escapeRegExp).join("|")})`, "gi");
  return text
    .split(pattern)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, match: usable.some((t) => t.toLowerCase() === part.toLowerCase()) }));
}

/** Small, stable number from a string — varies the generated card art. */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
