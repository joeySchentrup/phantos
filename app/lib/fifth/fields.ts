/**
 * Which of a sheet's fields a player may change at the table, and which only
 * the DM may change. Everything else is the build, which a player changes
 * only by taking a level the DM called them to.
 *
 * Mirrors SHEET_DAY_FIELDS and SHEET_DM_FIELDS in pb_hooks/phantos/lib.js,
 * which is what decides; testing/sheet.test.ts keeps the two in step. A new
 * column that isn't added to both is a build field.
 */
export const SHEET_DAY_FIELDS = [
  "current_hp",
  "temp_hp",
  "hit_dice_used",
  "ac",
  "inspiration",
  "uses_spent",
  "slots_used",
  "spells_prepared",
  "attacks",
  "money",
  "death_saves",
  "equipment",
  "conditions",
  "notes",
] as const;

export const SHEET_DM_FIELDS = ["hero", "target_level"] as const;

export const SHEET_BUILD_FIELDS = [
  "level",
  "class",
  "subclass",
  "species",
  "max_hp",
  "abilities",
  "saves",
  "skills",
  "proficiencies",
  "defenses",
  "features",
  "feats",
  "spellcasting",
  "level_log",
] as const;

export type SheetDayField = (typeof SHEET_DAY_FIELDS)[number];
