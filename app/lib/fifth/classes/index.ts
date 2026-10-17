import type { ClassRules } from "~/types/fifth";
import { ARTIFICER } from "./artificer";
import { BARBARIAN } from "./barbarian";
import { BARD } from "./bard";
import { CLERIC } from "./cleric";
import { DRUID } from "./druid";
import { FIGHTER } from "./fighter";
import { MONK } from "./monk";
import { PALADIN } from "./paladin";
import { RANGER } from "./ranger";
import { ROGUE } from "./rogue";
import { SORCERER } from "./sorcerer";
import { WARLOCK } from "./warlock";
import { WIZARD } from "./wizard";

/** Every class the rules know, by key. A class with a `table` can take levels in the wizard. */
export const CLASSES: Record<string, ClassRules> = Object.fromEntries(
  [ARTIFICER, BARBARIAN, BARD, CLERIC, DRUID, FIGHTER, MONK, PALADIN, RANGER, ROGUE, SORCERER, WARLOCK, WIZARD]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((rules) => [rules.key, rules])
);

export function classRules(key: string): ClassRules | undefined {
  return CLASSES[key];
}

/** The rules key for a class written by hand on a hero ("Bard", " bard "); "" when the rules don't know it. */
export function classKey(name: string): string {
  const wanted = (name ?? "").trim().toLowerCase();
  if (!wanted) return "";
  return Object.values(CLASSES).find((rules) => rules.key === wanted || rules.name.toLowerCase() === wanted)?.key ?? "";
}

/** Whether the wizard can take levels in this class: it needs the class's full table. */
export function canLevel(rules: ClassRules | undefined): rules is ClassRules & { table: NonNullable<ClassRules["table"]> } {
  return !!rules?.table?.length;
}

export { ARTIFICER, BARBARIAN, BARD, CLERIC, DRUID, FIGHTER, MONK, PALADIN, RANGER, ROGUE, SORCERER, WARLOCK, WIZARD };
