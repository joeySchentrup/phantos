import type { HeroSummary } from "./hero";

/** The six abilities, by their short names. */
export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type Abilities = Record<Ability, number>;

/** The eighteen skills, by key. */
export type Skill =
  | "acrobatics"
  | "animal-handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight-of-hand"
  | "stealth"
  | "survival";

export type SkillRank = "proficient" | "expertise";

/** How often a feature comes back. */
export type RestKind = "short" | "long";

/** A feature or trait on the sheet: from the class, the subclass, the species or a feat. */
export interface SheetFeature {
  /** The rules key it came from; a later level replaces the feature with the same key. */
  key?: string;
  name: string;
  /** "Bard 1", "College of Lore 3", "Variant Aasimar", "Feat"… */
  source: string;
  level: number;
  text: string;
  link?: string;
  /** Uses a rest: a number, an ability whose modifier it is (at least 1), the level, or the proficiency bonus. */
  uses?: { max: number | Ability | "level" | "prof"; per: RestKind };
}

export interface SheetFeat {
  key: string;
  name: string;
  note: string;
}

export interface Spellcasting {
  /** The ability the class casts with; "" for a class that doesn't. */
  ability: Ability | "";
  /** Spell keys, or a name typed by hand for a spell outside the rules. */
  cantrips: string[];
  /** Spells known that count against the class's spells known. */
  known: string[];
  /** Spells the species grants (Light Bearer's light). */
  racial: string[];
  /** Spells known that don't count against spells known (a College of Lore's Additional Magical Secrets). */
  bonus: string[];
}

export interface Proficiencies {
  armor: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
}

export interface Defenses {
  speed: number;
  senses: string[];
  resistances: string[];
  immunities: string[];
}

export interface Attack {
  name: string;
  bonus: string;
  damage: string;
  note: string;
}

export interface Money {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

/** One decision made in taking a level, in words. */
export interface LevelChoice {
  step: string;
  chose: string;
}

/** One level as it was taken: what it gave and what was chosen. */
export interface LevelLogEntry {
  level: number;
  /** YYYY-MM-DD; "" for levels taken before the sheet was kept here. */
  date: string;
  hp_gained: number;
  hp_mode?: "average" | "roll" | "first";
  /** What was decided, in the order it was asked. A list, since PocketBase stores an object's keys sorted. */
  choices: LevelChoice[];
}

/**
 * A hero's character sheet: one a hero, seen only by the DMs and the hero's
 * approved player. The build changes only by taking a level the DM called
 * them to; the day-to-day fields change at the table.
 */
export interface CharacterSheet {
  id: string;
  hero: string;

  // The build
  level: number;
  /** The level the DM has called the hero to; nothing is queued while it is at or below `level`. */
  target_level: number;
  /** A rules key: "bard". */
  class: string;
  /** A rules key: "lore"; "" until chosen. */
  subclass: string;
  /** A rules key when the species is known to the rules ("variant-aasimar"), else its name. */
  species: string;
  max_hp: number;
  abilities: Abilities;
  saves: Ability[];
  skills: Partial<Record<Skill, SkillRank>>;
  proficiencies: Proficiencies;
  defenses: Defenses;
  features: SheetFeature[];
  feats: SheetFeat[];
  spellcasting: Spellcasting;
  level_log: LevelLogEntry[];

  // Day to day
  current_hp: number;
  temp_hp: number;
  hit_dice_used: number;
  ac: number;
  inspiration: boolean;
  /** Feature name → uses spent since its rest. */
  uses_spent: Record<string, number>;
  /** Spell level → slots spent. */
  slots_used: Record<string, number>;
  spells_prepared: string[];
  attacks: Attack[];
  money: Money;
  death_saves: DeathSaves;
  equipment: string;
  conditions: string;
  notes: string;

  created: string;
  updated: string;
  expand?: { hero?: HeroSummary };
}

/** What a new sheet is made from. */
export type SheetInput = Omit<CharacterSheet, "id" | "created" | "updated" | "expand">;

/** A change to some of a sheet's fields. */
export type SheetPatch = Partial<SheetInput>;
