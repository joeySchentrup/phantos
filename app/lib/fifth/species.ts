/**
 * Species the rules know. A sheet whose species isn't here keeps its name
 * and whatever the DM writes on it; nothing in the wizard depends on it.
 */
import type { SpeciesRules } from "~/types/fifth";
import { keyOf } from "./core";

export const SPECIES: Record<string, SpeciesRules> = {
  // Volo's Guide's aasimar, as Daymond's sheet has it: +2 Charisma, Healing
  // Hands and Light Bearer, darkvision and celestial resistance.
  "variant-aasimar": {
    key: "variant-aasimar",
    name: "Variant Aasimar",
    slug: "lineage:aasimar",
    abilityBonuses: { cha: 2 },
    speed: 30,
    senses: ["Darkvision 60 ft."],
    resistances: ["Necrotic", "Radiant"],
    languages: ["Celestial", "Common"],
    traits: [
      {
        key: "darkvision",
        name: "Darkvision",
        text: "You see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light, in shades of grey.",
      },
      {
        key: "celestial-resistance",
        name: "Celestial Resistance",
        text: "You have resistance to necrotic and radiant damage.",
      },
      {
        key: "healing-hands",
        name: "Healing Hands",
        text: "As an action, touch a creature to restore a number of hit points equal to your level.",
        uses: { max: 1, per: "long" },
      },
      {
        key: "light-bearer",
        name: "Light Bearer",
        text: "You know the light cantrip. Charisma is your spellcasting ability for it.",
      },
    ],
    spells: ["light"],
  },
};

export function speciesRules(key: string): SpeciesRules | undefined {
  return SPECIES[key];
}

/** The rules key for a species written by hand on a hero, or its name when the rules don't know it. */
export function speciesKey(name: string): string {
  const key = keyOf(name ?? "");
  return SPECIES[key] ? key : (name ?? "").trim();
}

/** "Variant Aasimar", for a key or a name. */
export function speciesName(keyOrName: string): string {
  return SPECIES[keyOrName]?.name ?? keyOrName;
}
