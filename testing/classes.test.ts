import { describe, expect, it } from "vitest";
import { CLASSES, FIGHTING_STYLES, proficiencyBonus, spellByKey, spellsFor } from "~/lib/fifth";

const classes = Object.values(CLASSES);

describe("every class", () => {
  it.each(classes.map((c) => [c.name, c] as const))("%s has a full table with the right proficiency", (_, rules) => {
    expect(rules.table!.map((row) => row.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const row of rules.table!) expect(row.proficiency).toBe(proficiencyBonus(row.level));
  });

  it.each(classes.map((c) => [c.name, c] as const))("%s describes every feature its table names, and lists every feature it describes", (_, rules) => {
    const listed = new Set(rules.table!.flatMap((row) => row.features));
    for (const key of listed) expect(rules.features?.[key], key).toBeDefined();
    for (const key of Object.keys(rules.features ?? {})) expect(listed.has(key), key).toBe(true);
    for (const [key, feature] of Object.entries(rules.features ?? {})) expect(feature.key).toBe(key);
  });

  it.each(classes.map((c) => [c.name, c] as const))("%s's subclasses are keyed by their wiki page, with features at every level they give them", (_, rules) => {
    const subs = Object.values(rules.subclasses ?? {});
    expect(subs.length).toBeGreaterThan(0);
    for (const [key, sub] of Object.entries(rules.subclasses!)) {
      expect(sub.key).toBe(key);
      expect(sub.slug).toBe(`${rules.key}:${key}`);
      expect(sub.source).toBeTruthy();
      expect(sub.summary).toBeTruthy();
      expect(sub.features.some((f) => f.level === rules.subclassLevel), `${sub.name} ${rules.subclassLevel}`).toBe(true);
      for (const f of sub.features) {
        expect(f.level).toBeGreaterThanOrEqual(rules.subclassLevel);
        expect(f.level).toBeLessThanOrEqual(20);
        expect(f.text, f.key).toBeTruthy();
      }
    }
  });

  it.each(classes.map((c) => [c.name, c] as const))("%s's choices have option keys unique across the class, and name styles the rules know", (_, rules) => {
    // An option may be offered again by the same feature at a later level (more manoeuvres), never by another.
    const seen = new Map<string, string>();
    const grants = [
      ...Object.values(rules.features ?? {}).map((f) => [f.key, f.grants] as const),
      ...Object.values(rules.subclasses ?? {}).flatMap((s) => s.features.map((f) => [f.key, f.grants] as const)),
    ];
    for (const [featureKey, grant] of grants) {
      for (const option of grant?.choose?.options ?? []) {
        expect(seen.get(option.key) ?? featureKey, option.key).toBe(featureKey);
        seen.set(option.key, featureKey);
        expect(option.name).toBeTruthy();
      }
      for (const style of grant?.fightingStyle ?? []) expect(FIGHTING_STYLES[style], style).toBeDefined();
      for (const key of grant?.spells ?? []) expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it.each(classes.map((c) => [c.name, c] as const))("%s lists a chosen class feature at every level its count names", (_, rules) => {
    for (const feature of Object.values(rules.features ?? {})) {
      const count = feature.grants?.choose?.count;
      if (!count || typeof count === "number") continue;
      for (const level of Object.keys(count).map(Number)) {
        expect(rules.table![level - 1].features, `${feature.key} at ${level}`).toContain(feature.key);
      }
    }
  });

  it("never takes slots, cantrips or spells away as a caster levels", () => {
    for (const rules of classes.filter((c) => c.caster !== "none")) {
      const table = rules.table!;
      for (let i = 1; i < table.length; i++) {
        const [before, after] = [table[i - 1], table[i]];
        expect(after.cantrips ?? 0, `${rules.name} ${after.level}`).toBeGreaterThanOrEqual(before.cantrips ?? 0);
        expect(after.spellsKnown ?? 0, `${rules.name} ${after.level}`).toBeGreaterThanOrEqual(before.spellsKnown ?? 0);
        if (rules.caster !== "pact") (before.slots ?? []).forEach((n, level) => expect(after.slots![level]).toBeGreaterThanOrEqual(n));
      }
      expect(spellsFor(rules.key).length, `${rules.name} has a spell list`).toBeGreaterThan(0);
    }
  });

  it("gives spells by keys the lists know", () => {
    const missing: string[] = [];
    for (const rules of classes) {
      const grants = [
        ...Object.values(rules.features ?? {}).map((f) => f.grants),
        ...Object.values(rules.subclasses ?? {}).flatMap((s) => s.features.map((f) => f.grants)),
      ];
      for (const key of grants.flatMap((g) => g?.spells ?? [])) if (!spellByKey(key)) missing.push(`${rules.key}: ${key}`);
    }
    expect(missing).toEqual([]);
  });
});

describe("the spell lists", () => {
  it.each(Object.keys(CLASSES).filter((key) => CLASSES[key].caster !== "none"))("%s's list names each spell once", (key) => {
    const spells = spellsFor(key);
    expect(new Set(spells.map((s) => s.key)).size).toBe(spells.length);
    for (const spell of spells) expect(spell.name).not.toMatch(/\(UA\)/);
  });
});
