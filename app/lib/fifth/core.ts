/**
 * The 5e maths every sheet needs: modifiers, proficiency, skills and saves.
 * Pure functions over a sheet; components show what these work out and
 * never do the sums themselves.
 */
import type { Abilities, Ability, CharacterSheet, Skill, SheetFeature } from "~/types/sheet";

export const WIKIDOT = "https://dnd5e.wikidot.com/";

/** A page on the 5e wiki the rules are taken from: wikidot("bard"), wikidot("spell:light"). */
export function wikidot(page: string): string {
  return WIKIDOT + page;
}

export const ABILITIES: { key: Ability; label: string }[] = [
  { key: "str", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
];

export const ABILITY_LABELS: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

export const SKILLS: { key: Skill; label: string; ability: Ability }[] = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animal-handling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleight-of-hand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

export function skillLabel(skill: string): string {
  return SKILLS.find((s) => s.key === skill)?.label ?? skill;
}

/** The highest an ability score climbs by an ASI or a feat. */
export const ABILITY_CAP = 20;

export const MAX_LEVEL = 20;

/** The modifier a score gives: 10 and 11 give +0, 12 gives +1, 9 gives −1. */
export function modifier(score: number): number {
  return Math.floor(((score || 0) - 10) / 2);
}

/** "+2", "+0", "−1". */
export function signed(n: number): string {
  return n < 0 ? `−${-n}` : `+${n}`;
}

/** +2 at levels 1–4, +3 at 5–8, and one more every four levels after. */
export function proficiencyBonus(level: number): number {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level || 1)));
  return 2 + Math.floor((l - 1) / 4);
}

/** The fixed value a level can take instead of rolling: half the die, plus one. */
export function averageHitDie(die: number): number {
  return die / 2 + 1;
}

/** The hit points a level gives: the roll (or average) plus the CON modifier, never less than 1. */
export function levelHp(rollOrAverage: number, conMod: number): number {
  return Math.max(1, rollOrAverage + conMod);
}

/** Level 1's hit points: the whole die plus the CON modifier. */
export function firstLevelHp(die: number, conMod: number): number {
  return Math.max(1, die + conMod);
}

export function hasFeature(sheet: Pick<CharacterSheet, "features">, key: string): boolean {
  return sheet.features.some((feature) => feature.key === key);
}

/** What a skill check adds: the ability, proficiency (twice with expertise), or half of it with Jack of All Trades. */
export function skillBonus(sheet: Pick<CharacterSheet, "abilities" | "skills" | "level" | "features">, skill: Skill): number {
  const ability = SKILLS.find((s) => s.key === skill)?.ability ?? "str";
  const mod = modifier(sheet.abilities[ability]);
  const prof = proficiencyBonus(sheet.level);
  const rank = sheet.skills[skill];
  if (rank === "expertise") return mod + prof * 2;
  if (rank === "proficient") return mod + prof;
  return mod + (hasFeature(sheet, "jack-of-all-trades") ? Math.floor(prof / 2) : 0);
}

export function saveBonus(sheet: Pick<CharacterSheet, "abilities" | "saves" | "level">, ability: Ability): number {
  return modifier(sheet.abilities[ability]) + (sheet.saves.includes(ability) ? proficiencyBonus(sheet.level) : 0);
}

/** 10 plus the skill's bonus: passive Perception, Insight, Investigation. */
export function passiveScore(sheet: Pick<CharacterSheet, "abilities" | "skills" | "level" | "features">, skill: Skill): number {
  return 10 + skillBonus(sheet, skill);
}

/** The DEX modifier, as D&D Beyond shows it (it doesn't add Jack of All Trades). */
export function initiative(sheet: Pick<CharacterSheet, "abilities">): number {
  return modifier(sheet.abilities.dex);
}

export function spellSaveDc(sheet: Pick<CharacterSheet, "abilities" | "level" | "spellcasting">): number | null {
  const ability = sheet.spellcasting.ability;
  if (!ability) return null;
  return 8 + proficiencyBonus(sheet.level) + modifier(sheet.abilities[ability]);
}

export function spellAttack(sheet: Pick<CharacterSheet, "abilities" | "level" | "spellcasting">): number | null {
  const ability = sheet.spellcasting.ability;
  if (!ability) return null;
  return proficiencyBonus(sheet.level) + modifier(sheet.abilities[ability]);
}

/** How many times a feature can be used between rests; null when it isn't counted. */
export function usesMax(feature: Pick<SheetFeature, "uses">, abilities: Abilities): number | null {
  if (!feature.uses) return null;
  const max = feature.uses.max;
  return typeof max === "number" ? max : Math.max(1, modifier(abilities[max]));
}

/** Today as YYYY-MM-DD where the player is, for the level log. */
export function today(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "1st", "2nd", "3rd", "4th"… */
export function ordinal(n: number): string {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

/** A key for a name the rules don't know: lower case, words joined with hyphens. */
export function keyOf(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
