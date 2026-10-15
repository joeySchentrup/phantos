/**
 * A sheet as it comes from PocketBase, made whole: an empty json field comes
 * back as null, and a sheet drawn up by hand may lack a part. Everything the
 * page reads is there after this.
 */
import type { CharacterSheet, LevelLogEntry } from "~/types/sheet";

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const obj = <T extends object>(value: unknown, fallback: T): T =>
  value && typeof value === "object" && !Array.isArray(value) ? { ...fallback, ...(value as T) } : { ...fallback };
const num = (value: unknown): number => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : 0);

export function normalizeSheet(record: CharacterSheet): CharacterSheet {
  const spellcasting = obj(record.spellcasting, { ability: "", cantrips: [], known: [], racial: [], bonus: [] } as CharacterSheet["spellcasting"]);
  const proficiencies = obj(record.proficiencies, { armor: [], weapons: [], tools: [], languages: [] } as CharacterSheet["proficiencies"]);
  const defenses = obj(record.defenses, { speed: 30, senses: [], resistances: [], immunities: [] } as CharacterSheet["defenses"]);
  return {
    ...record,
    level: Math.max(1, num(record.level)),
    target_level: num(record.target_level),
    class: record.class ?? "",
    subclass: record.subclass ?? "",
    species: record.species ?? "",
    max_hp: num(record.max_hp),
    abilities: obj(record.abilities, { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }),
    saves: list(record.saves),
    skills: obj(record.skills, {}),
    proficiencies: {
      armor: list(proficiencies.armor),
      weapons: list(proficiencies.weapons),
      tools: list(proficiencies.tools),
      languages: list(proficiencies.languages),
    },
    defenses: {
      speed: num(defenses.speed),
      senses: list(defenses.senses),
      resistances: list(defenses.resistances),
      immunities: list(defenses.immunities),
    },
    features: list(record.features),
    feats: list(record.feats),
    spellcasting: {
      ability: spellcasting.ability ?? "",
      cantrips: list(spellcasting.cantrips),
      known: list(spellcasting.known),
      racial: list(spellcasting.racial),
      bonus: list(spellcasting.bonus),
    },
    level_log: list<LevelLogEntry>(record.level_log).map((entry) => ({
      ...entry,
      // A list, in the order asked; an object (written by hand) comes back with its keys sorted.
      choices: Array.isArray(entry.choices)
        ? entry.choices
        : Object.entries((entry.choices ?? {}) as Record<string, string>).map(([step, chose]) => ({ step, chose })),
    })),
    current_hp: num(record.current_hp),
    temp_hp: num(record.temp_hp),
    hit_dice_used: num(record.hit_dice_used),
    ac: num(record.ac),
    inspiration: !!record.inspiration,
    uses_spent: obj(record.uses_spent, {}),
    slots_used: obj(record.slots_used, {}),
    spells_prepared: list(record.spells_prepared),
    attacks: list(record.attacks),
    money: obj(record.money, { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }),
    death_saves: obj(record.death_saves, { successes: 0, failures: 0 }),
    equipment: record.equipment ?? "",
    conditions: record.conditions ?? "",
    notes: record.notes ?? "",
  };
}
