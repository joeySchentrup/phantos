import type { ClassRules } from "~/types/fifth";
import { BARD } from "./bard";
import { SKELETON_CLASSES } from "./skeleton";

/** Every class the rules know, by key. A class with a `table` can take levels in the wizard. */
export const CLASSES: Record<string, ClassRules> = Object.fromEntries(
  [BARD, ...SKELETON_CLASSES].sort((a, b) => a.name.localeCompare(b.name)).map((rules) => [rules.key, rules])
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

export { BARD };
