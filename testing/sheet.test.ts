import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SHEET_BUILD_FIELDS, SHEET_DAY_FIELDS, SHEET_DM_FIELDS } from "~/lib/fifth";

/** The hooks module, evaluated rather than imported (see feed.test.ts). */
function loadHooks(): Record<string, (...args: any[]) => any> {
  const module = { exports: {} };
  new Function("module", readFileSync("pb_hooks/phantos/lib.js", "utf8"))(module);
  return module.exports;
}

const { canonicalJson, keepPlayerToSheet, prepareSheet } = loadHooks();

class ForbiddenError extends Error {}

afterEach(() => vi.unstubAllGlobals());

const TYPES: Record<string, string> = {
  hero: "relation",
  level: "number",
  target_level: "number",
  max_hp: "number",
  current_hp: "number",
  hit_dice_used: "number",
  abilities: "json",
  skills: "json",
  spellcasting: "json",
  level_log: "json",
  death_saves: "json",
  created: "autodate",
  updated: "autodate",
};

/** A stored sheet, every value as PocketBase's getString gives it. */
const SHEET: Record<string, string> = {
  hero: "daymond",
  level: "3",
  target_level: "6",
  class: "bard",
  subclass: "",
  max_hp: "18",
  current_hp: "18",
  temp_hp: "0",
  hit_dice_used: "0",
  abilities: '{"str": 11, "dex": 12, "con": 10, "int": 14, "wis": 13, "cha": 15}',
  skills: '{"history":"proficient"}',
  spellcasting: '{"ability":"cha","cantrips":[],"known":[]}',
  level_log: "[]",
  death_saves: '{"successes":0,"failures":0}',
  equipment: "",
  notes: "",
  conditions: "",
  created: "2026-10-01 00:00:00.000Z",
  updated: "2026-10-01 00:00:00.000Z",
};

/** Just enough of a PocketBase record for the hooks. */
function fakeRecord(original: Record<string, string>, changes: Record<string, string> = {}) {
  const values: Record<string, string> = { ...original, ...changes };
  return {
    values,
    getString: (key: string) => values[key] ?? "",
    getInt: (key: string) => parseInt(values[key] ?? "0", 10) || 0,
    set: (key: string, value: unknown) => {
      values[key] = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
    },
    original: () => ({
      getString: (key: string) => original[key] ?? "",
      getInt: (key: string) => parseInt(original[key] ?? "0", 10) || 0,
    }),
    collection: () => ({
      fields: Object.keys(original).map((name) => ({ getName: () => name, type: () => TYPES[name] ?? "text" })),
    }),
  };
}

const keep = (changes: Record<string, string>, original = SHEET) => () => keepPlayerToSheet(fakeRecord(original, changes));

describe("canonicalJson", () => {
  it("doesn't mind key order or spacing", () => {
    expect(canonicalJson('{"b": 1, "a": [2, {"d": 1, "c": 2}]}')).toBe(canonicalJson('{"a":[2,{"c":2,"d":1}],"b":1}'));
  });

  it("leaves text that isn't JSON as it is, trimmed", () => {
    expect(canonicalJson(" bard ")).toBe("bard");
    expect(canonicalJson("")).toBe("");
  });
});

describe("keepPlayerToSheet", () => {
  it("lets the day-to-day fields through", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ current_hp: "7", temp_hp: "3", notes: "Owes the innkeeper.", death_saves: '{"successes":1,"failures":0}' })).not.toThrow();
  });

  it("doesn't count JSON written in another order as a change", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ abilities: '{"cha":15,"con":10,"dex":12,"int":14,"str":11,"wis":13}' })).not.toThrow();
  });

  it("refuses a change to the build outside a level up", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ max_hp: "99" })).toThrow(/next level/);
    expect(keep({ abilities: '{"str":20,"dex":12,"con":10,"int":14,"wis":13,"cha":15}' })).toThrow(ForbiddenError);
    expect(keep({ subclass: "lore" })).toThrow(ForbiddenError);
  });

  it("lets the build change with the next level, up to the one called", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ level: "4", max_hp: "23", subclass: "lore", current_hp: "23" })).not.toThrow();
    expect(keep({ level: "6", max_hp: "40" }, { ...SHEET, level: "5" })).not.toThrow();
  });

  it("refuses skipping a level, or going past the one called", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ level: "5", max_hp: "30" })).toThrow(/next level/);
    expect(keep({ level: "2" })).toThrow(/next level/);
    expect(keep({ level: "7" }, { ...SHEET, level: "6" })).toThrow(/not called you to level 7/);
    expect(keep({ level: "4" }, { ...SHEET, target_level: "0" })).toThrow(/not called/);
  });

  it("keeps whose sheet it is, and the call, to the DM", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(keep({ target_level: "20" })).toThrow(/Dungeon Master/);
    expect(keep({ hero: "someone-else" })).toThrow(/Dungeon Master/);
    expect(keep({ level: "4", target_level: "4" })).toThrow(/Dungeon Master/);
  });
});

describe("prepareSheet", () => {
  it("keeps hit points, Hit Dice and death saves inside the sheet", () => {
    const record = fakeRecord(SHEET, {
      current_hp: "40",
      hit_dice_used: "9",
      death_saves: '{"successes":5,"failures":-1}',
      conditions: " Poisoned,\n prone ",
      notes: "line one\r\nline two\r\n",
    });
    prepareSheet(record);
    expect(record.values.current_hp).toBe("18");
    expect(record.values.hit_dice_used).toBe("3");
    expect(JSON.parse(record.values.death_saves)).toEqual({ successes: 3, failures: 0 });
    expect(record.values.conditions).toBe("Poisoned, prone");
    expect(record.values.notes).toBe("line one\nline two");
  });
});

describe("the sheet's fields", () => {
  const lib = readFileSync("pb_hooks/phantos/lib.js", "utf8");
  const listed = (name: string) => [...(lib.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`))?.[1] ?? "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  const schema = readFileSync("pb_migrations/1791504000_character_sheets.js", "utf8");
  const columns = [...schema.matchAll(/(?:name: |json\(|whole\()'([a-z_]+)'/g)].map((m) => m[1]).filter((n) => !["character_sheets", "created", "updated"].includes(n));

  it("are split the same way on the server and the site", () => {
    expect(listed("SHEET_DAY_FIELDS")).toEqual([...SHEET_DAY_FIELDS]);
    expect(listed("SHEET_DM_FIELDS")).toEqual([...SHEET_DM_FIELDS]);
  });

  it("each belong to exactly one group", () => {
    const grouped = [...SHEET_DAY_FIELDS, ...SHEET_DM_FIELDS, ...SHEET_BUILD_FIELDS];
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...columns].sort());
  });
});

describe("character sheets migration", () => {
  function migrate(): Record<string, any> {
    let up: (app: unknown) => void = () => {};
    let saved: Record<string, any> = {};
    new Function("migrate", "Collection", readFileSync("pb_migrations/1791504000_character_sheets.js", "utf8"))(
      (forward: typeof up) => (up = forward),
      class {
        constructor(data: object) {
          Object.assign(this, data);
        }
      }
    );
    up({ findCollectionByNameOrId: () => ({ id: "heroes" }), save: (c: Record<string, any>) => (saved = c) });
    return saved;
  }

  const sheets = migrate();
  const player = '@request.auth.collectionName = "players" && @request.auth.approved = true';

  it("is never public", () => {
    for (const rule of ["listRule", "viewRule", "createRule", "updateRule", "deleteRule"]) {
      expect(sheets[rule], rule).toBeTruthy();
      expect(sheets[rule]).toContain('@request.auth.collectionName = "dungeon_masters"');
    }
  });

  it("lets the hero's approved player read and update it, and only DMs draw it up or delete it", () => {
    for (const rule of [sheets.listRule, sheets.viewRule, sheets.updateRule]) {
      expect(rule).toContain(player);
      expect(rule).toContain("@request.auth.hero = hero");
    }
    for (const rule of [sheets.createRule, sheets.deleteRule]) expect(rule).not.toContain("players");
  });

  it("is one a hero, and goes with the hero", () => {
    const hero = sheets.fields.find((f: { name: string }) => f.name === "hero");
    expect(hero).toMatchObject({ type: "relation", required: true, maxSelect: 1, cascadeDelete: true });
    expect(sheets.indexes).toContain("CREATE UNIQUE INDEX idx_character_sheets_hero ON character_sheets (hero)");
  });
});

describe("Daymond's seeded sheet", () => {
  const seed = readFileSync("pb_migrations/1791504001_seed_sheet.js", "utf8");

  it("starts him at 3rd level, called to 6th, without touching his electrum", () => {
    expect(seed).toMatch(/level: 3,\s+target_level: 6,/);
    expect(seed).not.toMatch(/electrum_accounts|amount/);
  });
});

describe("the sheet's pages", () => {
  it("are routed beside the hero's lore page, under one layout", () => {
    const routes = readFileSync("app/routes.ts", "utf8");
    expect(routes).toContain('layout("routes/heroLayout.tsx"');
    expect(routes).toContain('route("/heroes/:slug/sheet", "routes/heroSheet.tsx")');
  });

  it("have their styles, and print", () => {
    const css = readFileSync("app/app.css", "utf8");
    expect(css).toContain(".sheet__plate");
    expect(css).toContain("@media print");
  });
});
