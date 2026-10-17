/**
 * The wiki's tables, spot-checked, and a level or two taken in each kind of
 * class: a fighting style, a choice of manoeuvres or Metamagic, uses that
 * climb with the level, a spellbook, pact magic, a domain's spells.
 */
import { describe, expect, it } from "vitest";
import { applyLevelUp, blankSheet, CLASSES, normalizeSheet, planLevelUp, spellsFor, usesMax, validateChoices } from "~/lib/fifth";
import type { Choices } from "~/types/fifth";
import type { CharacterSheet } from "~/types/sheet";

/** A fresh sheet for a hero of this class, at this level, as the DM might draw it up. */
function sheetOf(cls: string, level = 1, patch: Partial<CharacterSheet> = {}): CharacterSheet {
  const blank = blankSheet({ id: "h", class: cls, species: "Human" }, "2026-10-17");
  return normalizeSheet({ id: "s", created: "", updated: "", ...blank, level, target_level: 20, ...patch } as CharacterSheet);
}

const ids = (sheet: CharacterSheet, choices: Choices = {}) => planLevelUp(sheet, choices).steps.map((s) => s.id);
const casting = (ability: "int" | "wis" | "cha", cantrips: number, known: number): CharacterSheet["spellcasting"] => ({
  ability,
  cantrips: Array.from({ length: cantrips }, (_, i) => `cantrip-${i}`),
  known: Array.from({ length: known }, (_, i) => `spell-${i}`),
  racial: [],
  bonus: [],
});

describe("the wiki's tables", () => {
  it("match for the casters' first levels", () => {
    const first = (key: string, n: number) => CLASSES[key].table!.slice(0, n);
    expect(first("cleric", 4).map((r) => [r.cantrips, r.slots])).toEqual([[3, [2]], [3, [3]], [3, [4, 2]], [4, [4, 3]]]);
    expect(first("wizard", 3).map((r) => r.spellsKnown)).toEqual([6, 8, 10]);
    expect(CLASSES.wizard.table![19].spellsKnown).toBe(44);
    expect(first("sorcerer", 5).map((r) => [r.cantrips, r.spellsKnown])).toEqual([[4, 2], [4, 3], [4, 4], [5, 5], [5, 6]]);
    expect(first("warlock", 5).map((r) => r.slots)).toEqual([[1], [2], [0, 2], [0, 2], [0, 0, 2]]);
    expect(CLASSES.warlock.table![16].slots).toEqual([0, 0, 0, 0, 4]);
    expect(first("paladin", 5).map((r) => r.slots)).toEqual([undefined, [2], [3], [3], [4, 2]]);
    expect(first("ranger", 3).map((r) => [r.spellsKnown, r.slots])).toEqual([[undefined, undefined], [2, [2]], [3, [3]]]);
    expect(first("artificer", 5).map((r) => [r.cantrips, r.slots])).toEqual([[2, [2]], [2, [2]], [2, [3]], [2, [3]], [2, [4, 2]]]);
    expect(first("druid", 2).map((r) => [r.cantrips, r.slots])).toEqual([[2, [2]], [2, [3]]]);
    for (const key of ["cleric", "druid", "sorcerer", "wizard"]) expect(CLASSES[key].table![19].slots, key).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it("have every subclass the wiki lists outside Unearthed Arcana", () => {
    const count = Object.fromEntries(Object.values(CLASSES).map((c) => [c.key, Object.keys(c.subclasses!).length]));
    expect(count).toEqual({ artificer: 4, barbarian: 9, bard: 8, cleric: 14, druid: 7, fighter: 10, monk: 10, paladin: 9, ranger: 8, rogue: 9, sorcerer: 8, warlock: 9, wizard: 13 });
  });

  it("know the spell lists' sizes", () => {
    const sizes = Object.fromEntries(
      Object.keys(CLASSES)
        .filter((k) => CLASSES[k].caster !== "none")
        .map((k) => [k, spellsFor(k).length])
    );
    expect(sizes).toEqual({ artificer: 100, bard: 158, cleric: 125, druid: 170, paladin: 53, ranger: 71, sorcerer: 223, warlock: 141, wizard: 360 });
    expect(spellsFor("paladin", 0)).toEqual([]);
    expect(spellsFor("ranger", 0)).toEqual([]);
  });
});

describe("a fighter", () => {
  it("is asked for the fighting style level 1 never recorded, then holds it", () => {
    const fresh = sheetOf("fighter");
    expect(ids(fresh)).toEqual(["l1-fighting-style", "l2-hp"]);
    const styles = planLevelUp(fresh).steps[0];
    expect(styles.pick!.options.map((o) => o.key)).toContain("Archery");
    expect(styles.pick!.options.find((o) => o.key === "Archery")!.detail).toMatch(/ranged/);

    const two = { ...fresh, ...applyLevelUp(fresh, { "l1-fighting-style": ["Archery"], "l2-hp": { mode: "average" } }) } as CharacterSheet;
    const style = two.features.find((f) => f.key === "fighting-style:archery")!;
    expect(style).toMatchObject({ name: "Fighting Style: Archery", source: "Fighter 1", level: 1 });
    expect(two.features.map((f) => f.key)).toContain("action-surge");
    expect(two.level_log[1].choices[0]).toEqual({ step: "Fighter: Fighting Style (level 1)", chose: "Archery" });
    expect(ids(two)).toEqual(["l3-hp", "l3-subclass"]);
  });

  it("chooses three manoeuvres as a Battle Master, and is never offered them again", () => {
    const held = [{ key: "fighting-style:archery", name: "Fighting Style: Archery", source: "Fighter 1", level: 1, text: "" }];
    const two = sheetOf("fighter", 2, { features: held });
    const choices: Choices = { "l3-hp": { mode: "roll", roll: 6 }, "l3-subclass": ["battle-master"] };
    expect(ids(two, choices)).toEqual(["l3-hp", "l3-subclass", "l3-maneuvers"]);
    const step = planLevelUp(two, choices).steps[2];
    expect(step).toMatchObject({ kind: "choice", feature: "maneuvers", source: "Battle Master 3", pick: { count: 3 } });
    expect(validateChoices(two, planLevelUp(two, choices), choices)["l3-maneuvers"]).toMatch(/Choose 3/);

    const three = { ...two, ...applyLevelUp(two, { ...choices, "l3-maneuvers": ["riposte", "trip-attack", "precision-attack"] }) } as CharacterSheet;
    expect(three.subclass).toBe("battle-master");
    expect(three.features.filter((f) => f.key?.startsWith("maneuvers:")).map((f) => f.name)).toEqual(["Riposte", "Trip Attack", "Precision Attack"]);
    expect(three.features.find((f) => f.key === "student-of-war")).toBeDefined();
    expect(three.proficiencies.tools.length).toBeGreaterThan(0);
    expect(usesMax(three.features.find((f) => f.key === "combat-superiority")!, three)).toBe(4);

    const six = { ...three, level: 6 };
    const more = planLevelUp(six).steps.find((s) => s.id === "l7-maneuvers")!;
    expect(more.pick!.count).toBe(2);
    expect(more.pick!.options.map((o) => o.key)).not.toContain("riposte");
    expect(more.pick!.options.map((o) => o.key)).toContain("menacing-attack");
  });

  it("counts Action Surge and Indomitable up with the level", () => {
    const style = { key: "fighting-style:defense", name: "Fighting Style: Defense", source: "Fighter 1", level: 1, text: "" };
    const sixteen = sheetOf("fighter", 16, { subclass: "champion", features: [style] });
    const patch = applyLevelUp(sixteen, { "l17-hp": { mode: "average" } });
    expect(patch.features!.find((f) => f.key === "action-surge")!.uses).toEqual({ max: 2, per: "short" });
    expect(patch.features!.find((f) => f.key === "indomitable")!.uses).toEqual({ max: 3, per: "long" });
  });
});

describe("a sorcerer", () => {
  it("picks two Metamagic options at 3rd, and one more at 10th", () => {
    const two = sheetOf("sorcerer", 2, { subclass: "wild-magic", spellcasting: casting("cha", 4, 3) });
    expect(ids(two)).toEqual(["l3-hp", "l3-metamagic", "l3-spells", "l3-swap"]);
    const step = planLevelUp(two).steps[1];
    expect(step.pick!.count).toBe(2);
    expect(step.pick!.options.map((o) => o.key)).toContain("twinned-spell");

    const three = {
      ...two,
      ...applyLevelUp(two, { "l3-hp": { mode: "average" }, "l3-metamagic": ["quickened-spell", "twinned-spell"], "l3-spells": ["scorching-ray"] }),
    } as CharacterSheet;
    expect(three.features.filter((f) => f.key?.startsWith("metamagic:")).map((f) => f.key)).toEqual(["metamagic:quickened-spell", "metamagic:twinned-spell"]);
    expect(three.spellcasting.known).toContain("scorching-ray");

    const nine = { ...three, level: 9, spellcasting: casting("cha", 5, 10) };
    const ten = planLevelUp(nine).steps.find((s) => s.id === "l10-metamagic")!;
    expect(ten.pick!.count).toBe(1);
    expect(ten.pick!.options.map((o) => o.key)).not.toContain("twinned-spell");
  });

  it("has as many Sorcery Points as levels", () => {
    const one = sheetOf("sorcerer", 1, { subclass: "wild-magic", spellcasting: casting("cha", 4, 2) });
    const two = { ...one, ...applyLevelUp(one, { "l2-hp": { mode: "average" }, "l2-spells": ["shield"] }) } as CharacterSheet;
    const font = two.features.find((f) => f.key === "font-of-magic")!;
    expect(font.uses).toEqual({ max: "level", per: "long" });
    expect(usesMax(font, two)).toBe(2);
    expect(usesMax(font, { ...two, level: 7 })).toBe(7);
  });

  it("is asked for the Metamagic a sheet drawn up at 5th never recorded", () => {
    const five = sheetOf("sorcerer", 5, { subclass: "draconic-bloodline", spellcasting: casting("cha", 5, 6) });
    expect(ids(five)[0]).toBe("l3-metamagic");
    expect(planLevelUp(five).steps[0].pick!.count).toBe(2);
  });
});

describe("a barbarian", () => {
  it("rages more often as it levels", () => {
    const two = sheetOf("barbarian", 2);
    const three = { ...two, ...applyLevelUp(two, { "l3-hp": { mode: "average" }, "l3-subclass": ["berserker"] }) } as CharacterSheet;
    expect(three.features.filter((f) => f.key === "rage")).toHaveLength(1);
    expect(three.features.find((f) => f.key === "rage")!.uses).toEqual({ max: 3, per: "long" });
    expect(three.features.map((f) => f.key)).toContain("frenzy");
  });

  it("chooses a totem at 3rd, an aspect at 6th, and gains the spirit's spells", () => {
    const two = sheetOf("barbarian", 2);
    const choices: Choices = { "l3-hp": { mode: "average" }, "l3-subclass": ["totem-warrior"] };
    expect(ids(two, choices)).toEqual(["l3-hp", "l3-subclass", "l3-totem-spirit"]);
    const three = { ...two, ...applyLevelUp(two, { ...choices, "l3-totem-spirit": ["totem-bear"] }) } as CharacterSheet;
    expect(three.spellcasting.bonus).toEqual(["beast-sense", "speak-with-animals"]);
    expect(three.features.find((f) => f.key === "totem-spirit:totem-bear")).toMatchObject({ name: "Totem Spirit: Bear", source: "Path of the Totem Warrior 3" });
    const five = { ...three, level: 5 };
    const aspect = planLevelUp(five).steps.find((s) => s.id === "l6-aspect-of-the-beast")!;
    expect(aspect.pick!.options.map((o) => o.key)).toContain("aspect-bear");
  });
});

describe("a wizard", () => {
  it("copies two spells into its spellbook each level, and keeps them all", () => {
    const one = sheetOf("wizard", 1, { spellcasting: casting("int", 3, 6) });
    expect(ids(one)).toEqual(["l2-hp", "l2-subclass", "l2-spells"]);
    const spells = planLevelUp(one).steps[2];
    expect(spells).toMatchObject({ pick: { count: 2 }, title: "New spells" });
    expect(spells.text).toMatch(/spellbook/);
  });

  it("catches up on a spellbook and cantrips never written in", () => {
    const steps = planLevelUp(sheetOf("wizard")).steps;
    expect(steps.map((s) => s.id)).toEqual(["l1-cantrips", "l1-spells", "l2-hp", "l2-subclass", "l2-spells"]);
    expect(steps[0].pick!.count).toBe(3);
    expect(steps[1]).toMatchObject({ title: "Spellbook", pick: { count: 6 } });
  });
});

describe("a warlock", () => {
  it("knows its spells, chooses a pact boon at 3rd, and casts at its pact level", () => {
    const two = sheetOf("warlock", 2, { subclass: "fiend", spellcasting: { ...casting("cha", 2, 0), known: ["hex", "armor-of-agathys", "charm-person"] } });
    expect(ids(two)).toEqual(["l3-hp", "l3-pact-boon", "l3-spells", "l3-swap"]);
    const spells = planLevelUp(two).steps[2];
    expect(spells.text).toMatch(/up to 2nd/);
    expect(spells.pick!.options.every((o) => o.detail === "1st level" || o.detail === "2nd level")).toBe(true);
    const three = {
      ...two,
      ...applyLevelUp(two, {
        "l3-hp": { mode: "average" },
        "l3-pact-boon": ["pact-of-the-tome"],
        "l3-spells": ["misty-step"],
        "l3-swap": { forget: "charm-person", learn: "hold-person" },
      }),
    } as CharacterSheet;
    expect(three.features.find((f) => f.key === "pact-boon:pact-of-the-tome")).toMatchObject({ name: "Pact of the Tome", source: "Warlock 3" });
    expect(three.spellcasting.known).toEqual(["hex", "armor-of-agathys", "hold-person", "misty-step"]);
  });
});

describe("a cleric", () => {
  it("chooses its domain late, and gets the domain's spells and armour with it", () => {
    const one = sheetOf("cleric", 1, { spellcasting: casting("wis", 3, 0) });
    expect(ids(one)).toEqual(["l1-subclass", "l2-hp"]);
    const two = { ...one, ...applyLevelUp(one, { "l1-subclass": ["life"], "l2-hp": { mode: "average" } }) } as CharacterSheet;
    expect(two.subclass).toBe("life");
    expect(two.spellcasting.bonus).toEqual(["bless", "cure-wounds"]);
    expect(two.proficiencies.armor).toContain("Heavy armor");
    expect(two.features.map((f) => f.key)).toEqual(expect.arrayContaining(["life-domain-spells-1", "disciple-of-life", "channel-divinity"]));
    expect(two.features.find((f) => f.key === "channel-divinity")!.uses).toEqual({ max: 1, per: "short" });
    expect(ids(two)).toEqual(["l3-hp"]);
    const three = { ...two, ...applyLevelUp(two, { "l3-hp": { mode: "average" } }) } as CharacterSheet;
    expect(three.spellcasting.bonus).toEqual(["bless", "cure-wounds", "lesser-restoration", "spiritual-weapon"]);
  });

  it("uses Channel Divinity twice from 6th", () => {
    const five = sheetOf("cleric", 5, { subclass: "life", spellcasting: casting("wis", 4, 0) });
    const patch = applyLevelUp(five, { "l6-hp": { mode: "average" } });
    expect(patch.features!.find((f) => f.key === "channel-divinity")!.uses).toEqual({ max: 2, per: "short" });
  });
});

describe("a ranger", () => {
  it("is asked for the enemy and the land level 1 never chose, then a style and spells at 2nd", () => {
    const one = sheetOf("ranger");
    expect(ids(one)).toEqual(["l1-favored-enemy", "l1-natural-explorer", "l2-hp", "l2-fighting-style", "l2-spells"]);
    const two = applyLevelUp(one, {
      "l1-favored-enemy": ["enemy-undead"],
      "l1-natural-explorer": ["terrain-forest"],
      "l2-hp": { mode: "average" },
      "l2-fighting-style": ["Archery"],
      "l2-spells": ["hunters-mark", "cure-wounds"],
    });
    expect(two.features!.map((f) => f.key)).toEqual(
      expect.arrayContaining(["favored-enemy:enemy-undead", "natural-explorer:terrain-forest", "fighting-style:archery"])
    );
    expect(two.spellcasting!.known).toEqual(["hunters-mark", "cure-wounds"]);
  });
});

describe("a paladin and a rogue", () => {
  it("give a paladin a style at 2nd and nothing to prepare", () => {
    const one = sheetOf("paladin");
    expect(ids(one)).toEqual(["l2-hp", "l2-fighting-style"]);
    const two = applyLevelUp(one, { "l2-hp": { mode: "average" }, "l2-fighting-style": ["Blessed Warrior"] });
    expect(two.features!.find((f) => f.key === "fighting-style:blessed-warrior")!.text).toMatch(/cleric cantrips/);
  });

  it("let a rogue double two of its skills at 1st, caught up at 2nd", () => {
    const one = sheetOf("rogue", 1, { skills: { stealth: "proficient", perception: "proficient", deception: "proficient", acrobatics: "proficient" } });
    expect(ids(one)).toEqual(["l1-expertise", "l2-hp"]);
    const two = applyLevelUp(one, { "l1-expertise": ["stealth", "perception"], "l2-hp": { mode: "average" } });
    expect(two.skills).toMatchObject({ stealth: "expertise", perception: "expertise", deception: "proficient" });
    expect(two.features!.map((f) => f.key)).toContain("cunning-action");
  });
});
