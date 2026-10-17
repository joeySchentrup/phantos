import type { Spell } from "~/types/fifth";
import { keyOf, ordinal, wikidot } from "../core";
import { ARTIFICER_SPELL_NAMES } from "./artificer";
import { BARD_SPELL_NAMES } from "./bard";
import { CLERIC_SPELL_NAMES } from "./cleric";
import { DRUID_SPELL_NAMES } from "./druid";
import { PALADIN_SPELL_NAMES } from "./paladin";
import { RANGER_SPELL_NAMES } from "./ranger";
import { SORCERER_SPELL_NAMES } from "./sorcerer";
import { WARLOCK_SPELL_NAMES } from "./warlock";
import { WIZARD_SPELL_NAMES } from "./wizard";

/** Spell lists by class key, as names a level (index 0 is cantrips). */
const LISTS: Record<string, string[][]> = {
  artificer: ARTIFICER_SPELL_NAMES,
  bard: BARD_SPELL_NAMES,
  cleric: CLERIC_SPELL_NAMES,
  druid: DRUID_SPELL_NAMES,
  paladin: PALADIN_SPELL_NAMES,
  ranger: RANGER_SPELL_NAMES,
  sorcerer: SORCERER_SPELL_NAMES,
  warlock: WARLOCK_SPELL_NAMES,
  wizard: WIZARD_SPELL_NAMES,
};

function toSpells(names: string[][]): Spell[] {
  return names.flatMap((level, i) => level.map((name) => ({ key: keyOf(name), name, level: i })));
}

const SPELLS_BY_CLASS: Record<string, Spell[]> = Object.fromEntries(
  Object.entries(LISTS).map(([cls, names]) => [cls, toSpells(names)])
);

/** Every spell the rules know, by key, whatever its class. */
const ALL: Map<string, Spell> = new Map(Object.values(SPELLS_BY_CLASS).flat().map((spell) => [spell.key, spell]));

/** A class's spells up to `maxLevel` (0 for cantrips only); none for a class without a list. */
export function spellsFor(classKey: string, maxLevel = 9): Spell[] {
  return (SPELLS_BY_CLASS[classKey] ?? []).filter((spell) => spell.level <= maxLevel);
}

export function hasSpellList(classKey: string): boolean {
  return !!SPELLS_BY_CLASS[classKey]?.length;
}

export function spellByKey(key: string): Spell | undefined {
  return ALL.get(key);
}

/** A spell's name; a spell outside the rules was written by hand and is its own name. */
export function spellName(keyOrName: string): string {
  return spellByKey(keyOrName)?.name ?? keyOrName;
}

/** The wikidot page for a spell, even one written by hand ("Fireball" → spell:fireball). */
export function spellLink(keyOrName: string): string {
  return wikidot(`spell:${keyOf(spellByKey(keyOrName)?.name ?? keyOrName)}`);
}

/** "Cantrip", "1st level". */
export function spellLevelLabel(level: number): string {
  return level === 0 ? "Cantrip" : `${ordinal(level)} level`;
}
