import { ATTRIBUTES } from "~/lib/lore";
import type { LoreAttribute } from "~/types/lore";
import type { PantheonRank, PantheonSummary } from "~/types/pantheon";

/**
 * A member's rank is its card frame, the way a lore entry's category is.
 * `level` is the row of stars on the card: the higher the power, the more.
 */
export const RANKS: Record<PantheonRank, { label: string; plural: string; description: string; level: number }> = {
  creator: { label: "Creator", plural: "The Creator", description: "Kalistos, the One-Before-the-First.", level: 12 },
  primal: { label: "Primal Dragon", plural: "Primal Dragons", description: "The six to whom Kalistos gave Phanatos.", level: 10 },
  twin: { label: "Twin", plural: "The Twins", description: "Day and night, the last work of the Six.", level: 8 },
  greater: { label: "Greater Dragon", plural: "Greater Dragons", description: "The fifteen born of two Primal Dragons.", level: 7 },
  other: { label: "Power", plural: "Other Powers", description: "Saints, spirits and anything else worth an altar.", level: 4 },
};

export const RANK_ORDER: PantheonRank[] = ["creator", "primal", "twin", "greater", "other"];

/** Highest rank first, then by name. */
export function sortPantheon<T extends Pick<PantheonSummary, "rank" | "name">>(members: T[]): T[] {
  return [...members].sort(
    (a, b) => RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank) || a.name.localeCompare(b.name)
  );
}

/** "Light + Dark" for a Greater Dragon, "Fire" for a Primal one. */
export function attributeLabels(attributes: LoreAttribute[]): string {
  return attributes.map((attribute) => ATTRIBUTES[attribute]?.label ?? attribute).join(" + ");
}

/** "[Greater Dragon / Life]" — the type line under the art. */
export function pantheonTypeLine(rank: PantheonRank, domain: string, attributes: LoreAttribute[]): string {
  const second = domain?.trim() || attributeLabels(attributes);
  return `[${RANKS[rank]?.label ?? "Power"}${second ? ` / ${second}` : ""}]`;
}

/** "Greater Dragon of Life", or just the rank when no domain is given. */
export function epithet(rank: PantheonRank, domain: string): string {
  const label = RANKS[rank]?.label ?? "Power";
  return domain?.trim() ? `${label} of ${domain.trim()}` : label;
}
