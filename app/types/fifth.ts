import type { Abilities, Ability, RestKind, Skill } from "./sheet";

/** How a class casts: not at all, from spells it knows, from spells it prepares, or by pact. */
export type CasterType = "none" | "known" | "prepared" | "pact";

/** How many uses a feature has between rests: a number, an ability whose modifier it is, the class level, or the proficiency bonus. */
export type UsesMax = number | Ability | "level" | "prof";

export interface FeatureUses {
  max: UsesMax;
  per: RestKind;
}

/** One thing a feature lets the hero choose: a Metamagic, a manoeuvre, a totem spirit. Recorded as a feature of its own. */
export interface FeatureOption {
  key: string;
  name: string;
  text: string;
}

/** What a feature gives that the wizard records, or asks about. */
export interface FeatureGrants {
  /** Skill proficiencies of the player's choice. */
  skills?: number;
  armor?: string[];
  weapons?: string[];
  tools?: string[];
  /** Fighting styles to choose one from, by name (see fightingStyles.ts). */
  fightingStyle?: string[];
  /** Spells from any class's list that don't count against spells known. */
  spellsAnyList?: number;
  /** Spell keys the feature gives outright (a domain's spells). They don't count against spells known. */
  spells?: string[];
  /**
   * Options to pick from, each recorded as a feature keyed `<feature>:<option>`. `count` is how many,
   * or how many at each level the table lists the feature (Metamagic: `{ 3: 2, 10: 1, 17: 1 }`).
   * An option already on the sheet is never offered again, so option keys are unique across the class.
   */
  choose?: { count: number | Record<number, number>; options: FeatureOption[] };
}

/** A class feature as the rules describe it. */
export interface ClassFeature {
  key: string;
  name: string;
  /** A short paraphrase; the link has the full text. */
  text: string;
  uses?: FeatureUses;
  /** Levels at which the feature changes: its die, its uses, or the rest that brings it back. Ascending. */
  scale?: { level: number; die?: number; per?: RestKind; max?: UsesMax }[];
  grants?: FeatureGrants;
}

/** One row of a class table. */
export interface ClassLevelRow {
  level: number;
  proficiency: number;
  cantrips?: number;
  spellsKnown?: number;
  /** Slots by spell level: slots[0] is the 1st-level slots. */
  slots?: number[];
  /** Keys of the class features gained or improved at this level. */
  features: string[];
}

export interface SubclassFeature {
  level: number;
  key: string;
  name: string;
  text: string;
  uses?: FeatureUses;
  grants?: FeatureGrants;
}

export interface SubclassRules {
  key: string;
  name: string;
  /** The wikidot page: "bard:lore". */
  slug: string;
  source: string;
  summary: string;
  features: SubclassFeature[];
}

export interface ClassRules {
  key: string;
  name: string;
  /** The wikidot page: "bard". */
  slug: string;
  hitDie: 6 | 8 | 10 | 12;
  saves: Ability[];
  subclassLevel: number;
  /** "Bard College", "Martial Archetype"… */
  subclassLabel: string;
  asiLevels: number[];
  caster: CasterType;
  castingAbility?: Ability;
  skillChoices?: { count: number; from: "any" | Skill[] };
  proficiencies: { armor: string[]; weapons: string[]; tools: string[] };
  /** The full level table; a class without one is an outline, and the wizard can't run for it. */
  table?: ClassLevelRow[];
  features?: Record<string, ClassFeature>;
  subclasses?: Record<string, SubclassRules>;
  /** Expertise gained at a level, as a number of skills. */
  expertise?: { level: number; count: number }[];
  /** Levels at which Magical Secrets teaches spells from any list, and how many; they count against spells known. */
  magicalSecrets?: { level: number; count: number }[];
}

export interface SpeciesRules {
  key: string;
  name: string;
  /** The wikidot page: "lineage:aasimar". */
  slug: string;
  abilityBonuses: Partial<Abilities>;
  speed: number;
  senses: string[];
  resistances: string[];
  languages: string[];
  traits: { key: string; name: string; text: string; uses?: FeatureUses }[];
  /** Spell keys the species grants. */
  spells: string[];
}

export interface FeatRef {
  key: string;
  name: string;
  /** The wikidot page after "feat:"; not always the name in kebab case, so it is written out. */
  slug: string;
  /** A half feat: +1 to one of these. */
  abilityIncrease?: Ability[];
  /** Resilient: proficiency in saves with the ability raised. */
  grantsSave?: boolean;
  summary: string;
}

export interface Spell {
  key: string;
  name: string;
  /** 0 for a cantrip. */
  level: number;
}

export type StepKind =
  | "subclass"
  | "hp"
  | "asi"
  | "expertise"
  | "cantrips"
  | "spells"
  | "swap"
  | "skills"
  | "fighting-style"
  | "magical-secrets"
  | "choice";

export interface StepOption {
  key: string;
  label: string;
  detail?: string;
  link?: string;
}

/** One thing to decide when taking a level. */
export interface LevelStep {
  /** Stable: "l4-hp". The key of its answer in Choices. */
  id: string;
  /** The level it belongs to; below the level being taken means it was missed and is caught up now. */
  level: number;
  kind: StepKind;
  title: string;
  text: string;
  link?: string;
  /** For a step a feature brings: the feature's rules key, and where it comes from ("College of Swords 3"). */
  feature?: string;
  source?: string;
  /** For a step that picks from a list. */
  pick?: { count: number; options: StepOption[]; allowCustom?: boolean };
  hp?: { die: number; conMod: number; average: number };
  /** For a swap: what can be forgotten, and what learnt in its place. */
  swap?: { forget: StepOption[]; learn: StepOption[] };
  /** For an ASI: the scores as they stand before it. */
  scores?: Abilities;
  /** A step that can be left unanswered. */
  optional?: boolean;
}

export type HpChoice = { mode: "average" } | { mode: "roll"; roll: number };
export type AsiChoice =
  | { mode: "+2"; abilities: Ability[] }
  | { mode: "+1+1"; abilities: Ability[] }
  | { mode: "feat"; feat: string; abilities?: Ability[] };
export type SwapChoice = { forget: string; learn: string };

/** Answers to the steps, by step id. A pick step answers with the keys picked (or names typed). */
export type Choices = Record<string, string[] | HpChoice | AsiChoice | SwapChoice | undefined>;
