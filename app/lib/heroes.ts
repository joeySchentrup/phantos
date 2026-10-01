import type { HeroSummary } from "~/types/hero";

/** Matches the `body` limit on hero_updates. */
export const UPDATE_MAX_LENGTH = 4000;

/** "Bard (College of Lore)", or just the class. */
export function classLabel(hero: Pick<HeroSummary, "class" | "subclass">): string {
  const cls = hero.class?.trim() ?? "";
  const sub = hero.subclass?.trim() ?? "";
  if (cls && sub) return `${cls} (${sub})`;
  return cls || sub;
}

/** "[Variant Aasimar / Bard]" — the type line under the portrait. */
export function heroTypeLine(hero: Pick<HeroSummary, "species" | "class">): string {
  const parts = [hero.species?.trim(), hero.class?.trim()].filter(Boolean);
  return `[${parts.length ? parts.join(" / ") : "Hero"}]`;
}

/** "Variant Aasimar Bard" — whatever of it is known. */
export function heroEpithet(hero: Pick<HeroSummary, "species" | "class">): string {
  const parts = [hero.species?.trim(), hero.class?.trim()].filter(Boolean);
  return parts.length ? parts.join(" ") : "Hero";
}

/** Alphabetical, for the list of heroes. */
export function sortHeroes<T extends Pick<HeroSummary, "name">>(heroes: T[]): T[] {
  return [...heroes].sort((a, b) => a.name.localeCompare(b.name));
}
