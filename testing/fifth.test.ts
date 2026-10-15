import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyLevelUp,
  BARD,
  blankSheet,
  canLevel,
  classKey,
  classLine,
  CLASSES,
  FEATS,
  initiative,
  levelUpBlocker,
  levelsWaiting,
  modifier,
  normalizeSheet,
  passiveScore,
  planLevelUp,
  proficiencyBonus,
  saveBonus,
  skillBonus,
  spellAttack,
  spellsFor,
  spellSaveDc,
  validateChoices,
} from "~/lib/fifth";
import type { Choices } from "~/types/fifth";
import type { CharacterSheet } from "~/types/sheet";

/** Daymond's sheet as the seed migration writes it. */
function seededDaymond(): CharacterSheet {
  const values: Record<string, unknown> = {};
  let up: (app: unknown) => void = () => {};
  new Function("migrate", "Record", readFileSync("pb_migrations/1791504001_seed_sheet.js", "utf8"))(
    (forward: typeof up) => (up = forward),
    class {
      set(key: string, value: unknown) {
        values[key] = value;
      }
    }
  );
  up({
    findFirstRecordByData: (collection: string) => {
      if (collection === "heroes") return { id: "daymond" };
      throw new Error("no rows");
    },
    findCollectionByNameOrId: () => ({}),
    save: () => {},
  });
  return normalizeSheet({ id: "sheet1", created: "", updated: "", ...values } as unknown as CharacterSheet);
}

const daymond = seededDaymond();

/** Answers that take Daymond from 3 to 4 as a College of Lore bard. */
const TO_FOUR: Choices = {
  "l3-subclass": ["lore"],
  "l3-lore-bonus-proficiencies": ["arcana", "deception", "performance"],
  "l3-expertise": ["persuasion", "performance"],
  "l3-cantrips": ["vicious-mockery", "minor-illusion"],
  "l3-spells": ["healing-word", "dissonant-whispers", "faerie-fire", "heroism", "suggestion", "silence"],
  "l4-hp": { mode: "average" },
  "l4-asi": { mode: "+2", abilities: ["cha"] },
  "l4-cantrips": ["mage-hand"],
  "l4-spells": ["invisibility"],
};

describe("5e maths", () => {
  it("works out modifiers", () => {
    expect([1, 8, 9, 10, 11, 12, 15, 20].map(modifier)).toEqual([-5, -1, -1, 0, 0, 1, 2, 5]);
  });

  it("raises proficiency every four levels", () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16, 17, 20].map(proficiencyBonus)).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  });

  it("reads Daymond's numbers as D&D Beyond does", () => {
    expect(skillBonus(daymond, "history")).toBe(4);
    expect(skillBonus(daymond, "persuasion")).toBe(4);
    // Jack of All Trades: half of +2.
    expect(skillBonus(daymond, "performance")).toBe(3);
    expect(skillBonus(daymond, "acrobatics")).toBe(2);
    expect(skillBonus(daymond, "athletics")).toBe(1);
    expect(passiveScore(daymond, "perception")).toBe(13);
    expect(passiveScore(daymond, "insight")).toBe(13);
    expect(passiveScore(daymond, "investigation")).toBe(13);
    expect(saveBonus(daymond, "dex")).toBe(3);
    expect(saveBonus(daymond, "cha")).toBe(4);
    expect(saveBonus(daymond, "int")).toBe(2);
    expect(initiative(daymond)).toBe(1);
    expect(spellSaveDc(daymond)).toBe(12);
    expect(spellAttack(daymond)).toBe(4);
  });
});

describe("the bard", () => {
  const table = BARD.table!;

  it("has a row for every level, with the right proficiency", () => {
    expect(table.map((row) => row.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const row of table) expect(row.proficiency).toBe(proficiencyBonus(row.level));
  });

  it("matches the wiki's table for levels 1 to 6", () => {
    const early = table.slice(0, 6);
    expect(early.map((row) => row.cantrips)).toEqual([2, 2, 2, 3, 3, 3]);
    expect(early.map((row) => row.spellsKnown)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(early.map((row) => row.slots)).toEqual([[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3]]);
  });

  it("never takes slots, cantrips or spells away", () => {
    for (let i = 1; i < table.length; i++) {
      const [before, after] = [table[i - 1], table[i]];
      expect(after.cantrips!).toBeGreaterThanOrEqual(before.cantrips!);
      expect(after.spellsKnown!).toBeGreaterThanOrEqual(before.spellsKnown!);
      before.slots!.forEach((n, level) => expect(after.slots![level]).toBeGreaterThanOrEqual(n));
    }
    expect(table[19].slots).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it("improves abilities at 4, 8, 12, 16 and 19", () => {
    expect(BARD.asiLevels).toEqual([4, 8, 12, 16, 19]);
  });

  it("describes every feature its table names", () => {
    for (const row of table) for (const key of row.features) expect(BARD.features?.[key], key).toBeDefined();
  });

  it("has all eight colleges, each with features at 3rd, 6th and 14th level", () => {
    const colleges = Object.values(BARD.subclasses!);
    expect(colleges.map((c) => c.key).sort()).toEqual(["creation", "eloquence", "glamour", "lore", "spirits", "swords", "valor", "whispers"]);
    for (const college of colleges) {
      expect(college.slug).toBe(`bard:${college.key}`);
      for (const level of [3, 6, 14]) expect(college.features.some((f) => f.level === level), `${college.name} ${level}`).toBe(true);
    }
  });

  it("knows the whole bard spell list, each spell once", () => {
    const spells = spellsFor("bard");
    const counts = Array.from({ length: 10 }, (_, level) => spells.filter((s) => s.level === level).length);
    expect(counts).toEqual([12, 26, 33, 24, 11, 19, 8, 12, 6, 7]);
    expect(new Set(spells.map((s) => s.key)).size).toBe(spells.length);
    expect(spells.find((s) => s.name === "Power Word: Stun")?.key).toBe("power-word-stun");
    expect(spells.find((s) => s.name === "Tasha's Hideous Laughter")?.key).toBe("tashas-hideous-laughter");
  });
});

describe("the other classes", () => {
  it("are all here with their hit die and the level they choose a subclass", () => {
    const outline = Object.fromEntries(Object.values(CLASSES).map((c) => [c.key, [c.hitDie, c.subclassLevel]]));
    expect(outline).toEqual({
      artificer: [8, 3],
      barbarian: [12, 3],
      bard: [8, 3],
      cleric: [8, 1],
      druid: [8, 2],
      fighter: [10, 3],
      monk: [8, 3],
      paladin: [10, 3],
      ranger: [10, 3],
      rogue: [8, 3],
      sorcerer: [6, 1],
      warlock: [8, 1],
      wizard: [6, 2],
    });
  });

  it("can't take levels in the wizard until their table is filled in", () => {
    expect(canLevel(CLASSES.bard)).toBe(true);
    expect(canLevel(CLASSES.fighter)).toBe(false);
    expect(levelUpBlocker({ class: "fighter", level: 3 })).toMatch(/outline/);
    expect(levelUpBlocker({ class: "jester", level: 3 })).toMatch(/don't know/);
    expect(levelUpBlocker({ class: "bard", level: 20 })).toMatch(/last/);
  });

  it("finds a class by the name written on a hero", () => {
    expect(classKey(" Bard ")).toBe("bard");
    expect(classKey("Druid")).toBe("druid");
    expect(classKey("Jester")).toBe("");
  });
});

describe("feats", () => {
  it("lists the 42 from the Player's Handbook, each with its wiki page", () => {
    expect(FEATS).toHaveLength(42);
    expect(new Set(FEATS.map((f) => f.key)).size).toBe(42);
    for (const feat of FEATS) expect(feat.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe("Daymond's seeded sheet", () => {
  it("is a 3rd-level bard called to 6th", () => {
    expect(classLine(daymond)).toBe("Bard 3");
    expect(levelsWaiting(daymond)).toBe(3);
    expect(daymond.max_hp).toBe(8 + 5 + 5);
  });
});

describe("taking a level", () => {
  it("catches up on what level 3 never chose before asking about level 4", () => {
    expect(planLevelUp(daymond).steps.map((s) => s.id)).toEqual([
      "l3-subclass",
      "l3-expertise",
      "l3-cantrips",
      "l3-spells",
      "l4-hp",
      "l4-asi",
      "l4-cantrips",
      "l4-spells",
    ]);
  });

  it("asks what a college brings once it is chosen", () => {
    const lore = planLevelUp(daymond, { "l3-subclass": ["lore"] }).steps.map((s) => s.id);
    expect(lore.slice(0, 2)).toEqual(["l3-subclass", "l3-lore-bonus-proficiencies"]);
    const swords = planLevelUp(daymond, { "l3-subclass": ["swords"] }).steps.map((s) => s.id);
    expect(swords).toContain("l3-swords-fighting-style");
  });

  it("lets expertise pick the skills the college just gave", () => {
    const plan = planLevelUp(daymond, TO_FOUR);
    const options = plan.steps.find((s) => s.id === "l3-expertise")!.pick!.options.map((o) => o.key);
    expect(options).toContain("performance");
    expect(options).toContain("history");
  });

  it("offers only spells of a level there are slots for, and not the racial light", () => {
    const plan = planLevelUp(daymond);
    const spells = plan.steps.find((s) => s.id === "l3-spells")!.pick!.options;
    expect(spells.every((o) => o.detail === "1st level" || o.detail === "2nd level")).toBe(true);
    const cantrips = plan.steps.find((s) => s.id === "l3-cantrips")!.pick!.options.map((o) => o.key);
    expect(cantrips).not.toContain("light");
  });

  it("takes Daymond from 3 to 4", () => {
    const patch = applyLevelUp(daymond, TO_FOUR, "2026-10-14");
    expect(patch.level).toBe(4);
    expect(patch.subclass).toBe("lore");
    expect(patch.max_hp).toBe(23);
    expect(patch.current_hp).toBe(23);
    expect(patch.abilities?.cha).toBe(17);
    expect(patch.skills?.persuasion).toBe("expertise");
    expect(patch.skills?.performance).toBe("expertise");
    expect(patch.skills?.arcana).toBe("proficient");
    expect(patch.spellcasting?.cantrips).toHaveLength(3);
    expect(patch.spellcasting?.known).toHaveLength(7);
    expect(patch.features?.map((f) => f.key)).toContain("cutting-words");
    expect(patch.level_log).toHaveLength(4);
    expect(patch.level_log?.[3]).toMatchObject({ level: 4, date: "2026-10-14", hp_gained: 5, hp_mode: "average" });
    expect(patch.level_log?.[3].choices[0]).toEqual({ step: "Bard College (level 3)", chose: "College of Lore" });
  });

  it("then to 5 and 6, as the DM called him", () => {
    const four = { ...daymond, ...applyLevelUp(daymond, TO_FOUR) } as CharacterSheet;
    const toFive = planLevelUp(four);
    expect(toFive.steps.map((s) => s.id)).toEqual(["l5-hp", "l5-spells", "l5-swap"]);
    expect(toFive.gains.map((g) => g.name)).toEqual(["Bardic Inspiration (d8)", "Font of Inspiration"]);
    expect(toFive.gains[0].uses).toEqual({ max: "cha", per: "short" });

    const five = { ...four, ...applyLevelUp(four, { "l5-hp": { mode: "roll", roll: 8 }, "l5-spells": ["hypnotic-pattern"] }) } as CharacterSheet;
    expect(five.max_hp).toBe(31);
    expect(five.features.filter((f) => f.key === "bardic-inspiration")).toHaveLength(1);

    const toSix = planLevelUp(five);
    expect(toSix.steps.map((s) => s.id)).toEqual(["l6-hp", "l6-additional-magical-secrets", "l6-spells", "l6-swap"]);
    const six = applyLevelUp(five, {
      "l6-hp": { mode: "average" },
      "l6-additional-magical-secrets": ["Fireball", "counterspell"],
      "l6-spells": ["dispel-magic"],
      "l6-swap": { forget: "silence", learn: "calm-emotions" },
    });
    expect(six.level).toBe(6);
    expect(six.spellcasting?.known).toHaveLength(9);
    expect(six.spellcasting?.known).toContain("calm-emotions");
    expect(six.spellcasting?.known).not.toContain("silence");
    expect(six.spellcasting?.bonus).toEqual(["Fireball", "counterspell"]);
    expect(six.features?.map((f) => f.key)).toEqual(expect.arrayContaining(["countercharm", "additional-magical-secrets"]));
  });

  it("gives a Valor bard Extra Attack at 6th level and nothing to choose for it", () => {
    const valor = { ...daymond, level: 5, subclass: "valor", spellcasting: { ...daymond.spellcasting, cantrips: ["a", "b", "c"], known: Array(8).fill("x") } };
    const plan = planLevelUp(valor);
    expect(plan.gains.map((g) => g.key)).toContain("extra-attack");
    expect(plan.steps.some((s) => s.kind === "magical-secrets")).toBe(false);
  });

  it("gives a college's armour and weapons with no question asked", () => {
    const patch = applyLevelUp(daymond, { ...TO_FOUR, "l3-subclass": ["valor"], "l3-lore-bonus-proficiencies": undefined, "l3-expertise": ["persuasion", "history"] });
    expect(patch.proficiencies?.armor).toEqual(["Light armor", "Medium armor", "Shields"]);
    expect(patch.proficiencies?.weapons).toContain("Martial weapons");
  });

  it("adds a hit point for every earlier level when Constitution's modifier rises", () => {
    const patch = applyLevelUp(daymond, { ...TO_FOUR, "l4-asi": { mode: "+2", abilities: ["con"] } });
    // 5 + 1 for the new level, and 1 for each of the three before it.
    expect(patch.max_hp).toBe(18 + 6 + 3);
  });

  it("records a feat, and the ability a half feat raises", () => {
    const patch = applyLevelUp(daymond, { ...TO_FOUR, "l4-asi": { mode: "feat", feat: "actor", abilities: ["cha"] } });
    expect(patch.feats).toEqual([{ key: "actor", name: "Actor", note: "+1 Charisma" }]);
    expect(patch.abilities?.cha).toBe(16);
  });

  it("refuses answers that don't do", () => {
    const errors = (choices: Choices) => validateChoices(daymond, planLevelUp(daymond, choices), choices);
    expect(errors({ ...TO_FOUR, "l3-expertise": ["persuasion"] })["l3-expertise"]).toMatch(/Choose 2/);
    expect(errors({ ...TO_FOUR, "l3-expertise": ["persuasion", "stealth"] })["l3-expertise"]).toMatch(/isn't one of/);
    expect(errors({ ...TO_FOUR, "l4-spells": ["healing-word"] })["l4-spells"]).toMatch(/already chosen/);
    expect(errors({ ...TO_FOUR, "l4-hp": { mode: "roll", roll: 9 } })["l4-hp"]).toMatch(/1 to 8/);
    expect(errors({ ...TO_FOUR, "l4-asi": { mode: "+1+1", abilities: ["cha", "cha"] } })["l4-asi"]).toMatch(/different/);
    const strong = { ...daymond, abilities: { ...daymond.abilities, cha: 19 } };
    const asi: Choices = { ...TO_FOUR, "l4-asi": { mode: "+2", abilities: ["cha"] } };
    expect(validateChoices(strong, planLevelUp(strong, asi), asi)["l4-asi"]).toMatch(/above 20/);
    expect(() => applyLevelUp(daymond, { ...TO_FOUR, "l3-subclass": [] })).toThrow(/Bard College/);
    expect(errors(TO_FOUR)).toEqual({});
  });
});

describe("a new sheet", () => {
  it("is drawn up at level 1 from what the rules know of the hero", () => {
    const sheet = blankSheet({ id: "h1", class: "Bard", species: "Variant Aasimar" }, "2026-10-14");
    expect(sheet).toMatchObject({ level: 1, class: "bard", species: "variant-aasimar", max_hp: 8, current_hp: 8, saves: ["dex", "cha"] });
    expect(sheet.abilities.cha).toBe(12);
    expect(sheet.spellcasting).toMatchObject({ ability: "cha", racial: ["light"] });
    expect(sheet.features.map((f) => f.key)).toEqual(
      expect.arrayContaining(["healing-hands", "light-bearer", "spellcasting", "bardic-inspiration"])
    );
  });

  it("keeps a class or species the rules don't know as written", () => {
    const sheet = blankSheet({ id: "h1", class: "Jester", species: "Kobold" });
    expect(sheet).toMatchObject({ class: "Jester", species: "Kobold", max_hp: 1, saves: [] });
  });
});
