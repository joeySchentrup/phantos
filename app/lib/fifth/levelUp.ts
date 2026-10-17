/**
 * Taking a level. `planLevelUp` works out what there is to decide for the
 * next level, catching up first on anything the sheet should already have
 * (a college never chosen, spells never picked); `validateChoices` checks
 * the answers; `applyLevelUp` turns them into the change to save.
 *
 * Steps can depend on earlier answers (choosing the College of Lore brings
 * its three skills), so the wizard plans again as the answers come in.
 */
import type {
  AsiChoice,
  Choices,
  ClassFeature,
  ClassRules,
  FeatureGrants,
  HpChoice,
  LevelStep,
  StepOption,
  SubclassFeature,
  SubclassRules,
  SwapChoice,
} from "~/types/fifth";
import type { HeroSummary } from "~/types/hero";
import type { Abilities, Ability, CharacterSheet, LevelChoice, SheetFeature, SheetInput, SheetPatch, Skill } from "~/types/sheet";
import { canLevel, classKey, classRules } from "./classes";
import {
  ABILITIES,
  ABILITY_CAP,
  ABILITY_LABELS,
  averageHitDie,
  firstLevelHp,
  keyOf,
  levelHp,
  MAX_LEVEL,
  modifier,
  ordinal,
  SKILLS,
  skillLabel,
  today,
  wikidot,
} from "./core";
import { featByKey } from "./feats";
import { fightingStyleText } from "./fightingStyles";
import { spellLink, spellName, spellsFor } from "./spells";
import { speciesKey, speciesRules } from "./species";

type LevelTable = NonNullable<ClassRules["table"]>;

export interface LevelUpPlan {
  rules: ClassRules;
  /** The level the sheet is at. */
  from: number;
  /** The level being taken. */
  to: number;
  steps: LevelStep[];
  /** What the level gives with nothing to choose. */
  gains: SheetFeature[];
}

/** Why the wizard can't take the next level for this sheet, or null when it can. */
export function levelUpBlocker(sheet: Pick<CharacterSheet, "class" | "level">): string | null {
  const rules = classRules(sheet.class);
  if (!rules) return "The rules don't know this sheet's class, so the DM keeps its levels by hand.";
  if (!canLevel(rules)) {
    return `The rules have only an outline of the ${rules.name} so far, so the DM keeps its levels by hand. docs/fifth-edition-rules.md says how to fill it in.`;
  }
  if (sheet.level >= MAX_LEVEL) return "Level 20 is the last.";
  return null;
}

/** The levels the DM has called the hero to and they have yet to take. */
export function levelsWaiting(sheet: Pick<CharacterSheet, "level" | "target_level">): number {
  return Math.max(0, (sheet.target_level || 0) - sheet.level);
}

// ---------------------------------------------------------------------------
// Rules lookups
// ---------------------------------------------------------------------------

function row(table: LevelTable, level: number) {
  return table[Math.min(table.length, Math.max(1, level)) - 1];
}

/** The highest spell level the class has slots for at a level. */
export function maxSpellLevel(rules: ClassRules, level: number): number {
  if (!rules.table) return 0;
  return row(rules.table, level).slots?.length ?? 0;
}

/** The expertise a class has given by a level, in skills. */
function expertiseBy(rules: ClassRules, level: number): number {
  return (rules.expertise ?? []).filter((e) => e.level <= level).reduce((sum, e) => sum + e.count, 0);
}

function secretsAt(rules: ClassRules, level: number): number {
  return (rules.magicalSecrets ?? []).find((m) => m.level === level)?.count ?? 0;
}

/** A class feature as the sheet keeps it at a level: its die, its uses and its rest as they stand then. */
export function classFeature(rules: ClassRules, key: string, level: number): SheetFeature | null {
  const feature = rules.features?.[key];
  if (!feature) return null;
  let die: number | undefined;
  let per = feature.uses?.per;
  let max = feature.uses?.max;
  for (const step of feature.scale ?? []) {
    if (step.level > level) break;
    if (step.die) die = step.die;
    if (step.per) per = step.per;
    if (step.max !== undefined) max = step.max;
  }
  const result: SheetFeature = {
    key,
    name: die ? `${feature.name} (d${die})` : feature.name,
    source: `${rules.name} ${level}`,
    level,
    text: feature.text,
    link: wikidot(rules.slug),
  };
  if (feature.uses && per && max !== undefined) result.uses = { max, per };
  return result;
}

/** The class features in a row that give the hero something to choose or record. */
function grantingFeatures(rules: ClassRules, level: number): ClassFeature[] {
  return row(rules.table!, level)
    .features.map((key) => rules.features?.[key])
    .filter((feature): feature is ClassFeature => !!feature?.grants);
}

function subclassFeature(subclass: SubclassRules, feature: SubclassFeature): SheetFeature {
  const result: SheetFeature = {
    key: feature.key,
    name: feature.name,
    source: `${subclass.name} ${feature.level}`,
    level: feature.level,
    text: feature.text,
    link: wikidot(subclass.slug),
  };
  if (feature.uses) result.uses = feature.uses;
  return result;
}

/** A sheet's class and college, in words: "Bard 3 · College of Lore". */
export function classLine(sheet: Pick<CharacterSheet, "class" | "subclass" | "level">): string {
  const rules = classRules(sheet.class);
  const name = rules?.name ?? sheet.class;
  const sub = sheet.subclass ? rules?.subclasses?.[sheet.subclass]?.name ?? sheet.subclass : "";
  return [`${name || "Adventurer"} ${sheet.level}`, sub].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

const asList = (answer: Choices[string]): string[] => (Array.isArray(answer) ? answer : []);

function spellOptions(rules: ClassRules, minLevel: number, maxLevel: number, exclude: Set<string>): StepOption[] {
  return spellsFor(rules.key, maxLevel)
    .filter((spell) => spell.level >= minLevel && !exclude.has(spell.key))
    .map((spell) => ({
      key: spell.key,
      label: spell.name,
      detail: spell.level === 0 ? "Cantrip" : `${ordinal(spell.level)} level`,
      link: spellLink(spell.key),
    }));
}

function skillOptions(skills: Skill[]): StepOption[] {
  return skills.map((skill) => {
    const info = SKILLS.find((s) => s.key === skill)!;
    return { key: skill, label: info.label, detail: ABILITY_LABELS[info.ability] };
  });
}

/** Everything to decide in taking the next level, given the answers so far. */
export function planLevelUp(sheet: CharacterSheet, choices: Choices = {}): LevelUpPlan {
  const blocker = levelUpBlocker(sheet);
  if (blocker) throw new Error(blocker);
  const rules = classRules(sheet.class)!;
  const table = rules.table!;
  const from = sheet.level;
  const to = from + 1;
  const catchUp: LevelStep[] = [];
  const steps: LevelStep[] = [];
  const gains: SheetFeature[] = [];
  const known = new Set([
    ...sheet.spellcasting.cantrips,
    ...sheet.spellcasting.known,
    ...sheet.spellcasting.racial,
    ...sheet.spellcasting.bonus,
  ]);

  // The college: chosen now when the sheet has reached it without one.
  const subclassStepId = `l${rules.subclassLevel}-subclass`;
  const choosingSubclass = !sheet.subclass && rules.subclassLevel <= to && !!rules.subclasses;
  const subclassKey = sheet.subclass || (choosingSubclass ? asList(choices[subclassStepId])[0] ?? "" : "");
  const subclass = subclassKey ? rules.subclasses?.[subclassKey] : undefined;

  /** Steps that make the hero proficient in skills, whose answers expertise can then pick from. */
  const skillStepIds: string[] = [];

  /** The rules keys of the features the sheet holds, and of the options chosen for them, so a choice isn't offered twice. */
  const held = new Set(sheet.features.map((f) => f.key ?? ""));
  const heldOptions = new Set(sheet.features.map((f) => f.key?.split(":")[1] ?? ""));
  const heldStyles = sheet.features.filter((f) => f.key?.startsWith("fighting-style:")).length;
  const chooseCount = (choose: NonNullable<FeatureGrants["choose"]>, level: number) =>
    typeof choose.count === "number" ? choose.count : choose.count[level] ?? 0;

  /** Where a feature comes from: the class, or the subclass. */
  type From = { name: string; slug: string };
  const classFrom: From = { name: rules.name, slug: rules.slug };

  const styleStep = (level: number, featureKey: string, title: string, styles: string[], from: From): LevelStep => ({
    id: `l${level}-${featureKey}`,
    level,
    kind: "fighting-style",
    title,
    text: "Choose a fighting style.",
    link: wikidot(from.slug),
    feature: featureKey,
    source: `${from.name} ${level}`,
    pick: {
      count: 1,
      options: styles
        .filter((style) => !held.has(`fighting-style:${keyOf(style)}`))
        .map((style) => ({ key: style, label: style, detail: fightingStyleText(style) || undefined })),
    },
  });

  const chooseStep = (level: number, featureKey: string, title: string, choose: NonNullable<FeatureGrants["choose"]>, count: number, from: From): LevelStep => ({
    id: `l${level}-${featureKey}`,
    level,
    kind: "choice",
    title,
    text: count === 1 ? "Choose one." : `Choose ${count}.`,
    link: wikidot(from.slug),
    feature: featureKey,
    source: `${from.name} ${level}`,
    pick: {
      count,
      options: choose.options.filter((o) => !heldOptions.has(o.key)).map((o) => ({ key: o.key, label: o.name, detail: o.text })),
    },
  });

  /** The steps a feature brings, if it asks anything. */
  const grantSteps = (level: number, featureKey: string, featureName: string, grants: FeatureGrants | undefined, from: From, into: LevelStep[]) => {
    if (!grants) return;
    const id = `l${level}-${featureKey}`;
    const title = `${from.name}: ${featureName}`;
    if (grants.skills) {
      skillStepIds.push(id);
      const open = SKILLS.map((s) => s.key).filter((skill) => !sheet.skills[skill]);
      into.push({
        id,
        level,
        kind: "skills",
        title,
        text: `Choose ${grants.skills} skills to become proficient in.`,
        link: wikidot(from.slug),
        feature: featureKey,
        pick: { count: grants.skills, options: skillOptions(open) },
      });
    }
    if (grants.fightingStyle) into.push(styleStep(level, featureKey, title, grants.fightingStyle, from));
    if (grants.spellsAnyList) {
      into.push({
        id,
        level,
        kind: "magical-secrets",
        title,
        text: `Learn ${grants.spellsAnyList} spells from any class's list, of a level you can cast. They don't count against your spells known. The ${rules.name.toLowerCase()} list is here to pick from; type a spell from another class's list by name.`,
        link: wikidot(from.slug),
        feature: featureKey,
        pick: {
          count: grants.spellsAnyList,
          options: spellOptions(rules, 0, maxSpellLevel(rules, to), known),
          allowCustom: true,
        },
      });
    }
    if (grants.choose) {
      const count = chooseCount(grants.choose, level);
      if (count) into.push(chooseStep(level, featureKey, title, grants.choose, count, from));
    }
  };

  const subclassGrants = (feature: SubclassFeature, into: LevelStep[]) => {
    if (subclass) grantSteps(feature.level, feature.key, feature.name, feature.grants, subclass, into);
  };

  const subclassStep = (): LevelStep[] => {
    if (!choosingSubclass || !rules.subclasses) return [];
    const out: LevelStep[] = [
      {
        id: subclassStepId,
        level: rules.subclassLevel,
        kind: "subclass",
        title: rules.subclassLabel,
        text: `Choose your ${rules.subclassLabel.toLowerCase()}. It shapes the features you gain at this level and later ones.`,
        link: wikidot(rules.slug),
        pick: {
          count: 1,
          options: Object.values(rules.subclasses).map((s) => ({
            key: s.key,
            label: s.name,
            detail: `${s.summary} (${s.source})`,
            link: wikidot(s.slug),
          })),
        },
      },
    ];
    if (subclass) {
      for (const feature of subclass.features.filter((f) => f.level <= to)) {
        subclassGrants(feature, out);
        gains.push(subclassFeature(subclass, feature));
      }
    }
    return out;
  };

  if (choosingSubclass && rules.subclassLevel < to) catchUp.push(...subclassStep());

  // Choices a class feature offered at an earlier level that the sheet never recorded: a fighting style, a Metamagic.
  const owed = new Map<string, { feature: ClassFeature; level: number; count: number }>();
  for (let level = 1; level <= from; level++) {
    for (const feature of grantingFeatures(rules, level)) {
      const count = feature.grants!.choose ? chooseCount(feature.grants!.choose, level) : feature.grants!.fightingStyle ? 1 : 0;
      if (!count) continue;
      const soFar = owed.get(feature.key);
      owed.set(feature.key, { feature, level, count: (soFar?.count ?? 0) + count });
    }
  }
  for (const { feature, level, count } of owed.values()) {
    const grants = feature.grants!;
    const title = `${rules.name}: ${feature.name}`;
    if (grants.choose) {
      const have = sheet.features.filter((f) => f.key?.startsWith(`${feature.key}:`)).length;
      if (have < count) catchUp.push(chooseStep(level, feature.key, title, grants.choose, count - have, classFrom));
    } else if (grants.fightingStyle && heldStyles < count) {
      catchUp.push(styleStep(level, feature.key, title, grants.fightingStyle, classFrom));
    }
  }

  // Expertise: anything missed, then this level's.
  const expertiseHave = Object.values(sheet.skills).filter((rank) => rank === "expertise").length;
  const expertiseDue = Math.max(0, expertiseBy(rules, from) - expertiseHave);
  const expertiseNew = Math.max(0, expertiseBy(rules, to) - Math.max(expertiseHave, expertiseBy(rules, from)));
  const proficient = (): Skill[] => {
    const fromSteps = skillStepIds.flatMap((id) => asList(choices[id])) as Skill[];
    return SKILLS.map((s) => s.key).filter((skill) => sheet.skills[skill] === "proficient" || fromSteps.includes(skill));
  };
  const expertiseStep = (level: number, count: number): LevelStep => ({
    id: `l${level}-expertise`,
    level,
    kind: "expertise",
    title: "Expertise",
    text: `Choose ${count} skills you are proficient in. Your proficiency bonus is doubled for them.`,
    link: wikidot(rules.slug),
    pick: { count, options: skillOptions(proficient()) },
  });
  if (expertiseDue) {
    const level = Math.max(...(rules.expertise ?? []).filter((e) => e.level <= from).map((e) => e.level));
    catchUp.push(expertiseStep(level, expertiseDue));
  }

  // Cantrips and spells known: anything missed at the current level.
  const prevRow = row(table, from);
  const nextRow = row(table, to);
  const cantripsHave = sheet.spellcasting.cantrips.length;
  const knownHave = sheet.spellcasting.known.length;
  const cantripsDue = Math.max(0, (prevRow.cantrips ?? 0) - cantripsHave);
  const knownDue = Math.max(0, (prevRow.spellsKnown ?? 0) - knownHave);
  const cantripStep = (level: number, count: number, late: boolean): LevelStep => ({
    id: `l${level}-cantrips`,
    level,
    kind: "cantrips",
    title: late ? "Cantrips" : "New cantrip" + (count > 1 ? "s" : ""),
    text:
      `Choose ${count} ${rules.name.toLowerCase()} cantrip${count > 1 ? "s" : ""}.` +
      (sheet.spellcasting.racial.length ? ` You already know ${sheet.spellcasting.racial.map(spellName).join(", ")} from your species.` : ""),
    link: wikidot(`spells:${rules.key}`),
    pick: { count, options: spellOptions(rules, 0, 0, known) },
  });
  // A prepared caster's rows leave spellsKnown out, unless the class keeps a spellbook (the Wizard).
  const spellbook = rules.caster === "prepared";
  const spellStep = (level: number, count: number, late: boolean): LevelStep => ({
    id: `l${level}-spells`,
    level,
    kind: "spells",
    title: late ? (spellbook ? "Spellbook" : "Spells known") : "New spell" + (count > 1 ? "s" : ""),
    text:
      `Choose ${count} ${rules.name.toLowerCase()} spell${count > 1 ? "s" : ""} of a level you have slots for (up to ${ordinal(maxSpellLevel(rules, level))})` +
      (spellbook ? " to copy into your spellbook." : "."),
    link: wikidot(`spells:${rules.key}`),
    pick: { count, options: spellOptions(rules, 1, maxSpellLevel(rules, level), known) },
  });
  if (rules.caster !== "none") {
    if (cantripsDue) catchUp.push(cantripStep(from, cantripsDue, true));
    if (knownDue) catchUp.push(spellStep(from, knownDue, true));
  }

  // The new level.
  steps.push({
    id: `l${to}-hp`,
    level: to,
    kind: "hp",
    title: "Hit points",
    text: `Roll your d${rules.hitDie}, or take the average, and add your Constitution modifier. A level always gives at least 1.`,
    link: wikidot(rules.slug),
    hp: { die: rules.hitDie, conMod: modifier(sheet.abilities.con), average: averageHitDie(rules.hitDie) },
  });

  if (choosingSubclass && rules.subclassLevel === to) steps.push(...subclassStep());

  if (rules.asiLevels.includes(to)) {
    steps.push({
      id: `l${to}-asi`,
      level: to,
      kind: "asi",
      title: "Ability Score Improvement",
      text: "Raise one ability by 2, or two abilities by 1 each (none above 20), or take a feat instead.",
      link: wikidot(rules.slug),
      scores: { ...sheet.abilities },
    });
  }

  if (expertiseNew) steps.push(expertiseStep(to, expertiseNew));

  for (const feature of grantingFeatures(rules, to)) grantSteps(to, feature.key, feature.name, feature.grants, classFrom, steps);

  if (sheet.subclass && subclass) {
    for (const feature of subclass.features.filter((f) => f.level === to)) {
      subclassGrants(feature, steps);
      gains.push(subclassFeature(subclass, feature));
    }
  }

  const secrets = secretsAt(rules, to);
  if (secrets) {
    steps.push({
      id: `l${to}-magical-secrets`,
      level: to,
      kind: "magical-secrets",
      title: "Magical Secrets",
      text: `Learn ${secrets} spells from any class's list, of a level you can cast (cantrips too). They count against your spells known. The ${rules.name.toLowerCase()} list is here to pick from; type a spell from another class's list by name.`,
      link: wikidot(rules.slug),
      pick: { count: secrets, options: spellOptions(rules, 0, maxSpellLevel(rules, to), known), allowCustom: true },
    });
  }

  if (rules.caster !== "none") {
    const cantripsNew = Math.max(0, (nextRow.cantrips ?? 0) - Math.max(cantripsHave, prevRow.cantrips ?? 0));
    if (cantripsNew) steps.push(cantripStep(to, cantripsNew, false));
    const knownNew = Math.max(0, (nextRow.spellsKnown ?? 0) - Math.max(knownHave, prevRow.spellsKnown ?? 0) - secrets);
    if (knownNew) steps.push(spellStep(to, knownNew, false));
    // A class that knows its spells can trade one at each level; a spellbook keeps them all.
    if ((rules.caster === "known" || rules.caster === "pact") && knownHave > 0) {
      steps.push({
        id: `l${to}-swap`,
        level: to,
        kind: "swap",
        title: "Swap a spell",
        text: `You may forget one ${rules.name.toLowerCase()} spell you know and learn another in its place, of a level you have slots for. Leave it as it is to keep them all.`,
        link: wikidot(rules.slug),
        optional: true,
        swap: {
          forget: sheet.spellcasting.known.map((key) => ({ key, label: spellName(key), link: spellLink(key) })),
          learn: spellOptions(rules, 1, maxSpellLevel(rules, to), known),
        },
      });
    }
  }

  for (const key of nextRow.features) {
    const feature = classFeature(rules, key, to);
    if (feature) gains.push(feature);
  }

  const all = [...catchUp, ...steps];
  // A spell picked at one step isn't offered at another: each step's options lose the other steps' picks.
  const spellSteps = all.filter((s) => s.kind === "cantrips" || s.kind === "spells" || s.kind === "magical-secrets" || s.kind === "swap");
  const pickedAt = (step: LevelStep): string[] =>
    step.kind === "swap" ? [(choices[step.id] as SwapChoice | undefined)?.learn ?? ""].filter(Boolean) : asList(choices[step.id]);
  for (const step of spellSteps) {
    const elsewhere = new Set(spellSteps.filter((s) => s !== step).flatMap(pickedAt).map((p) => p.toLowerCase()));
    if (!elsewhere.size) continue;
    const keep = (o: StepOption) => !elsewhere.has(o.key.toLowerCase());
    if (step.pick) step.pick = { ...step.pick, options: step.pick.options.filter(keep) };
    if (step.swap) step.swap = { ...step.swap, learn: step.swap.learn.filter(keep) };
  }

  return { rules, from, to, steps: all, gains };
}

// ---------------------------------------------------------------------------
// Checking the answers
// ---------------------------------------------------------------------------

const CUSTOM_MAX = 80;

/** What's wrong with the answers, by step id; empty when they will do. */
export function validateChoices(sheet: CharacterSheet, plan: LevelUpPlan, choices: Choices): Record<string, string> {
  const errors: Record<string, string> = {};
  /** Spells picked across steps, so the same one isn't learnt twice. */
  const learnt = new Set<string>();
  const expert = new Set<string>();

  for (const step of plan.steps) {
    const answer = choices[step.id];

    if (step.pick) {
      const picks = asList(answer).map((p) => p.trim()).filter(Boolean);
      if (!picks.length && step.optional) continue;
      if (picks.length !== step.pick.count) {
        errors[step.id] = `Choose ${step.pick.count}.`;
        continue;
      }
      if (new Set(picks.map((p) => p.toLowerCase())).size !== picks.length) {
        errors[step.id] = "Choose each one only once.";
        continue;
      }
      const keys = new Set(step.pick.options.map((o) => o.key));
      const stray = picks.find((p) => !keys.has(p) && (!step.pick!.allowCustom || p.length > CUSTOM_MAX));
      if (stray) {
        errors[step.id] = step.pick.allowCustom ? `"${stray}" is too long for a spell's name.` : `"${stray}" isn't one of the choices.`;
        continue;
      }
      if (step.kind === "cantrips" || step.kind === "spells" || step.kind === "magical-secrets") {
        const twice = picks.find((p) => learnt.has(p.toLowerCase()));
        if (twice) {
          errors[step.id] = `${spellName(twice)} is already chosen in another step.`;
          continue;
        }
        picks.forEach((p) => learnt.add(p.toLowerCase()));
      }
      if (step.kind === "expertise") {
        const twice = picks.find((p) => expert.has(p));
        if (twice) {
          errors[step.id] = `${skillLabel(twice)} already has expertise from another step.`;
          continue;
        }
        picks.forEach((p) => expert.add(p));
      }
      continue;
    }

    if (step.kind === "hp") {
      const hp = answer as HpChoice | undefined;
      if (!hp || (hp.mode !== "average" && hp.mode !== "roll")) errors[step.id] = "Roll or take the average.";
      else if (hp.mode === "roll" && (!Number.isInteger(hp.roll) || hp.roll < 1 || hp.roll > step.hp!.die)) {
        errors[step.id] = `A d${step.hp!.die} rolls 1 to ${step.hp!.die}.`;
      }
      continue;
    }

    if (step.kind === "asi") {
      const asi = answer as AsiChoice | undefined;
      const error = asiError(sheet, asi);
      if (error) errors[step.id] = error;
      continue;
    }

    if (step.kind === "swap") {
      const swap = answer as SwapChoice | undefined;
      if (!swap || (!swap.forget && !swap.learn)) continue;
      if (!step.swap!.forget.some((o) => o.key === swap.forget)) errors[step.id] = "Choose a spell you know to forget.";
      else if (!step.swap!.learn.some((o) => o.key === swap.learn)) errors[step.id] = "Choose a spell to learn in its place.";
      else if (learnt.has(swap.learn.toLowerCase())) errors[step.id] = `${spellName(swap.learn)} is already chosen in another step.`;
      else learnt.add(swap.learn.toLowerCase());
    }
  }
  return errors;
}

function asiError(sheet: CharacterSheet, asi: AsiChoice | undefined): string | null {
  if (!asi) return "Choose how to improve.";
  const valid = (a: string): a is Ability => ABILITIES.some((x) => x.key === a);
  if (asi.mode === "+2") {
    const [a] = asi.abilities ?? [];
    if (!a || !valid(a)) return "Choose an ability.";
    if (sheet.abilities[a] + 2 > ABILITY_CAP) return `${ABILITY_LABELS[a]} can't go above ${ABILITY_CAP}.`;
    return null;
  }
  if (asi.mode === "+1+1") {
    const [a, b] = asi.abilities ?? [];
    if (!a || !b || !valid(a) || !valid(b)) return "Choose two abilities.";
    if (a === b) return "Choose two different abilities, or +2 to one.";
    for (const x of [a, b]) if (sheet.abilities[x] + 1 > ABILITY_CAP) return `${ABILITY_LABELS[x]} can't go above ${ABILITY_CAP}.`;
    return null;
  }
  if (asi.mode === "feat") {
    const feat = featByKey(asi.feat);
    if (!feat) return "Choose a feat.";
    if (sheet.feats.some((f) => f.key === feat.key)) return `You already have ${feat.name}.`;
    if (feat.abilityIncrease) {
      const [a] = asi.abilities ?? [];
      if (!a || !feat.abilityIncrease.includes(a)) return `Choose which ability ${feat.name} raises.`;
      if (sheet.abilities[a] + 1 > ABILITY_CAP) return `${ABILITY_LABELS[a]} can't go above ${ABILITY_CAP}.`;
    }
    return null;
  }
  return "Choose how to improve.";
}

// ---------------------------------------------------------------------------
// Applying them
// ---------------------------------------------------------------------------

function addUnique(list: string[], items: string[]): string[] {
  const seen = new Set(list.map((x) => x.toLowerCase()));
  const out = [...list];
  for (const item of items) {
    if (!seen.has(item.toLowerCase())) {
      out.push(item);
      seen.add(item.toLowerCase());
    }
  }
  return out;
}

/** Puts features on the list, a later one replacing the one with the same key. */
export function mergeFeatures(features: SheetFeature[], gains: SheetFeature[]): SheetFeature[] {
  const out = [...features];
  for (const gain of gains) {
    const at = gain.key ? out.findIndex((f) => f.key === gain.key) : -1;
    if (at >= 0) out[at] = gain;
    else out.push(gain);
  }
  return out;
}

function optionLabel(step: LevelStep, key: string): string {
  return step.pick?.options.find((o) => o.key === key)?.label ?? key;
}

/** What was chosen at a step, in words, for the level log. */
export function describeChoice(step: LevelStep, answer: Choices[string]): string {
  if (step.pick) return asList(answer).map((key) => optionLabel(step, key)).join(", ");
  if (step.kind === "hp") {
    const hp = answer as HpChoice;
    return hp.mode === "roll" ? `Rolled ${hp.roll}` : `Took the average (${step.hp!.average})`;
  }
  if (step.kind === "asi") {
    const asi = answer as AsiChoice;
    if (asi.mode === "+2") return `+2 ${ABILITY_LABELS[asi.abilities[0]]}`;
    if (asi.mode === "+1+1") return asi.abilities.map((a) => `+1 ${ABILITY_LABELS[a]}`).join(", ");
    const feat = featByKey(asi.feat);
    const raised = asi.abilities?.[0];
    return `Feat: ${feat?.name ?? asi.feat}${raised ? ` (+1 ${ABILITY_LABELS[raised]})` : ""}`;
  }
  if (step.kind === "swap") {
    const swap = answer as SwapChoice | undefined;
    return swap?.forget && swap.learn ? `Forgot ${spellName(swap.forget)} for ${spellName(swap.learn)}` : "Kept every spell";
  }
  return "";
}

/**
 * The change that takes the next level: every build field, the new level,
 * a line in the level log, and current hit points raised by what the level
 * gave. Throws when the answers don't do.
 */
export function applyLevelUp(sheet: CharacterSheet, choices: Choices, date = today()): SheetPatch {
  const plan = planLevelUp(sheet, choices);
  const errors = validateChoices(sheet, plan, choices);
  const first = Object.keys(errors)[0];
  if (first) throw new Error(`${plan.steps.find((s) => s.id === first)?.title ?? first}: ${errors[first]}`);

  const abilities: Abilities = { ...sheet.abilities };
  const saves = [...sheet.saves];
  const skills = { ...sheet.skills };
  const proficiencies = {
    armor: [...sheet.proficiencies.armor],
    weapons: [...sheet.proficiencies.weapons],
    tools: [...sheet.proficiencies.tools],
    languages: [...sheet.proficiencies.languages],
  };
  const feats = [...sheet.feats];
  const spellcasting = {
    ...sheet.spellcasting,
    cantrips: [...sheet.spellcasting.cantrips],
    known: [...sheet.spellcasting.known],
    racial: [...sheet.spellcasting.racial],
    bonus: [...(sheet.spellcasting.bonus ?? [])],
  };
  let subclass = sheet.subclass;
  const gains = [...plan.gains];
  let hpChoice: HpChoice = { mode: "average" };
  const log: LevelChoice[] = [];

  for (const step of plan.steps) {
    const answer = choices[step.id];
    const picks = asList(answer).map((p) => p.trim()).filter(Boolean);
    switch (step.kind) {
      case "subclass":
        subclass = picks[0];
        break;
      case "hp":
        hpChoice = answer as HpChoice;
        break;
      case "asi": {
        const asi = answer as AsiChoice;
        if (asi.mode === "+2") abilities[asi.abilities[0]] += 2;
        else if (asi.mode === "+1+1") asi.abilities.forEach((a) => (abilities[a] += 1));
        else {
          const feat = featByKey(asi.feat)!;
          const raised = asi.abilities?.[0];
          if (raised) abilities[raised] += 1;
          if (raised && feat.grantsSave && !saves.includes(raised)) saves.push(raised);
          feats.push({ key: feat.key, name: feat.name, note: raised ? `+1 ${ABILITY_LABELS[raised]}` : "" });
        }
        break;
      }
      case "skills":
        picks.forEach((skill) => (skills[skill as Skill] = skills[skill as Skill] ?? "proficient"));
        break;
      case "expertise":
        picks.forEach((skill) => (skills[skill as Skill] = "expertise"));
        break;
      case "fighting-style":
        gains.push({
          key: `fighting-style:${keyOf(picks[0])}`,
          name: `Fighting Style: ${picks[0]}`,
          source: step.source ?? `${plan.rules.name} ${step.level}`,
          level: step.level,
          text: fightingStyleText(picks[0]),
          link: step.link,
        });
        break;
      case "choice":
        for (const pick of picks) {
          const option = step.pick?.options.find((o) => o.key === pick);
          gains.push({
            key: `${step.feature}:${pick}`,
            name: option?.label ?? pick,
            source: step.source ?? `${plan.rules.name} ${step.level}`,
            level: step.level,
            text: option?.detail ?? "",
            link: step.link,
          });
        }
        break;
      case "cantrips":
        spellcasting.cantrips = addUnique(spellcasting.cantrips, picks);
        break;
      case "spells":
        spellcasting.known = addUnique(spellcasting.known, picks);
        break;
      case "magical-secrets":
        // The class's own Magical Secrets count against spells known; a college's don't.
        if (step.id === `l${step.level}-magical-secrets`) spellcasting.known = addUnique(spellcasting.known, picks);
        else spellcasting.bonus = addUnique(spellcasting.bonus, picks);
        break;
      case "swap": {
        const swap = answer as SwapChoice | undefined;
        if (swap?.forget && swap.learn) {
          spellcasting.known = spellcasting.known.map((key) => (key === swap.forget ? swap.learn : key));
        }
        break;
      }
    }
    const said = answer === undefined ? "" : describeChoice(step, answer);
    if (said) log.push({ step: step.level < plan.to ? `${step.title} (level ${step.level})` : step.title, chose: said });
  }

  // Grants that need no answer: armour, weapons, tools, and a feature's own spells.
  const applyGrants = (grants?: FeatureGrants) => {
    if (!grants) return;
    proficiencies.armor = addUnique(proficiencies.armor, grants.armor ?? []);
    proficiencies.weapons = addUnique(proficiencies.weapons, grants.weapons ?? []);
    proficiencies.tools = addUnique(proficiencies.tools, grants.tools ?? []);
    spellcasting.bonus = addUnique(spellcasting.bonus, grants.spells ?? []);
  };
  for (const feature of grantingFeatures(plan.rules, plan.to)) applyGrants(feature.grants);
  const sub = subclass ? plan.rules.subclasses?.[subclass] : undefined;
  if (sub) {
    const granted = sub.features.filter((f) => (sheet.subclass ? f.level === plan.to : f.level <= plan.to));
    for (const feature of granted) applyGrants(feature.grants);
  }

  // Hit points: the new level's, and one more for every earlier level if the CON modifier rose.
  const oldCon = modifier(sheet.abilities.con);
  const newCon = modifier(abilities.con);
  const rolled = hpChoice.mode === "roll" ? hpChoice.roll : averageHitDie(plan.rules.hitDie);
  const hpGained = levelHp(rolled, newCon) + (newCon - oldCon) * sheet.level;
  const maxHp = Math.max(1, sheet.max_hp + hpGained);

  return {
    level: plan.to,
    subclass,
    abilities,
    saves,
    skills,
    proficiencies,
    feats,
    spellcasting,
    features: mergeFeatures(sheet.features, gains),
    max_hp: maxHp,
    current_hp: Math.min(maxHp, Math.max(0, sheet.current_hp + hpGained)),
    level_log: [
      ...sheet.level_log,
      { level: plan.to, date, hp_gained: hpGained, hp_mode: hpChoice.mode, choices: log },
    ],
  };
}

// ---------------------------------------------------------------------------
// A new sheet
// ---------------------------------------------------------------------------

/**
 * A level 1 sheet for a hero, drawn up from what the rules know of their
 * class and species: all tens, and the DM fills in the rest by hand.
 */
export function blankSheet(hero: Pick<HeroSummary, "id" | "class" | "species">, date = today()): SheetInput {
  const rules = classRules(classKey(hero.class));
  const speciesKeyOrName = speciesKey(hero.species);
  const species = speciesRules(speciesKeyOrName);
  const abilities: Abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const [ability, bonus] of Object.entries(species?.abilityBonuses ?? {})) abilities[ability as Ability] += bonus ?? 0;
  const hp = rules ? firstLevelHp(rules.hitDie, modifier(abilities.con)) : 1;

  const features: SheetFeature[] = [];
  for (const trait of species?.traits ?? []) {
    const feature: SheetFeature = {
      key: trait.key,
      name: trait.name,
      source: species!.name,
      level: 1,
      text: trait.text,
      link: wikidot(species!.slug),
    };
    if (trait.uses) feature.uses = trait.uses;
    features.push(feature);
  }
  for (const key of rules?.table?.[0].features ?? []) {
    const feature = classFeature(rules!, key, 1);
    if (feature) features.push(feature);
  }

  return {
    hero: hero.id,
    level: 1,
    target_level: 0,
    class: rules?.key ?? (hero.class ?? "").trim(),
    subclass: "",
    species: speciesKeyOrName,
    max_hp: hp,
    abilities,
    saves: rules ? [...rules.saves] : [],
    skills: {},
    proficiencies: {
      armor: [...(rules?.proficiencies.armor ?? [])],
      weapons: [...(rules?.proficiencies.weapons ?? [])],
      tools: [...(rules?.proficiencies.tools ?? [])],
      languages: [...(species?.languages ?? ["Common"])],
    },
    defenses: {
      speed: species?.speed ?? 30,
      senses: [...(species?.senses ?? [])],
      resistances: [...(species?.resistances ?? [])],
      immunities: [],
    },
    features,
    feats: [],
    spellcasting: {
      ability: rules?.castingAbility ?? "",
      cantrips: [],
      known: [],
      racial: [...(species?.spells ?? [])],
      bonus: [],
    },
    level_log: [{ level: 1, date, hp_gained: hp, hp_mode: "first", choices: [] }],
    current_hp: hp,
    temp_hp: 0,
    hit_dice_used: 0,
    ac: 10 + modifier(abilities.dex),
    inspiration: false,
    uses_spent: {},
    slots_used: {},
    spells_prepared: [],
    attacks: [],
    money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    death_saves: { successes: 0, failures: 0 },
    equipment: "",
    conditions: "",
    notes: "",
  };
}
