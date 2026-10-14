import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { heroChoiceLabel, playsHero } from "~/lib/players";

/** The hooks module, evaluated rather than imported (see feed.test.ts). */
function loadHooks(): Record<string, (...args: any[]) => any> {
  const module = { exports: {} };
  new Function("module", readFileSync("pb_hooks/phantos/lib.js", "utf8"))(module);
  return module.exports;
}

const { keepPlayerToBackstory, prepareHero } = loadHooks();

afterEach(() => vi.unstubAllGlobals());

describe("playsHero", () => {
  it("lets an approved player write for their own hero", () => {
    expect(playsHero({ approved: true, hero: "h1" }, "h1")).toBe(true);
  });

  it("keeps everyone else out", () => {
    expect(playsHero({ approved: false, hero: "h1" }, "h1")).toBe(false);
    expect(playsHero({ approved: true, hero: "h2" }, "h1")).toBe(false);
    expect(playsHero({ approved: true, hero: "" }, "")).toBe(false);
    expect(playsHero(null, "h1")).toBe(false);
  });
});

describe("heroChoiceLabel", () => {
  it("names the hero with their player, and marks a draft", () => {
    expect(heroChoiceLabel({ name: "Daymond Greystone", player: "Joey", published: true })).toBe("Daymond Greystone (Joey)");
    expect(heroChoiceLabel({ name: "Chione", player: " ", published: false })).toBe("Chione — draft");
  });
});

/** Just enough of a PocketBase record for the hooks. */
function fakeRecord(original: Record<string, string>, changes: Record<string, string> = {}, uploads: string[] = []) {
  const values: Record<string, string> = { ...original, ...changes };
  const types: Record<string, string> = { portrait: "file", card_art: "file", updated: "autodate" };
  return {
    id: "hero1",
    values,
    getString: (key: string) => values[key] ?? "",
    set: (key: string, value: unknown) => {
      values[key] = String(value ?? "");
    },
    original: () => ({ getString: (key: string) => original[key] ?? "" }),
    collection: () => ({
      fields: Object.keys(original).map((name) => ({ getName: () => name, type: () => types[name] ?? "text" })),
    }),
    getUnsavedFiles: (key: string) => (uploads.includes(key) ? [{}] : []),
  };
}

const HERO = {
  name: "Daymond Greystone",
  slug: "daymond-greystone",
  summary: "A paladin of the Sanctuary.",
  backstory: "Daymond had never known a life beyond the walls.",
  portrait: "daymond.png",
  card_art: "daymond_card.webp",
  published: "true",
  updated: "2026-10-01 00:00:00.000Z",
};

describe("keepPlayerToBackstory", () => {
  class ForbiddenError extends Error {}

  it("lets the backstory through", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    expect(() => keepPlayerToBackstory(fakeRecord(HERO, { backstory: "A new telling." }))).not.toThrow();
  });

  it("refuses any other change, the portrait included", () => {
    vi.stubGlobal("ForbiddenError", ForbiddenError);
    const changes: Record<string, string>[] = [{ name: "Hacked" }, { published: "false" }, { summary: "" }, { portrait: "" }];
    for (const change of changes) {
      expect(() => keepPlayerToBackstory(fakeRecord(HERO, { backstory: "x", ...change }))).toThrow(ForbiddenError);
    }
    expect(() => keepPlayerToBackstory(fakeRecord(HERO, {}, ["portrait"]))).toThrow(ForbiddenError);
  });
});

describe("prepareHero's card text", () => {
  // The slug check finds no clash.
  const app = {
    findFirstRecordByFilter: () => {
      throw new Error("no rows");
    },
  };
  const made = "Born in the ash. Raised by wolves.";
  const first = { ...HERO, summary: made, backstory: "Born in the ash.\n\nRaised by wolves." };

  it("follows the backstory when it was made from it", () => {
    const record = fakeRecord(first, { backstory: "Rewritten from the top." });
    prepareHero(app, record);
    expect(record.values.summary).toBe("Rewritten from the top.");
  });

  it("keeps card text written by hand", () => {
    const record = fakeRecord(HERO, { backstory: "Rewritten from the top." });
    prepareHero(app, record);
    expect(record.values.summary).toBe("A paladin of the Sanctuary.");
  });

  it("fills blank card text", () => {
    const record = fakeRecord({ ...first, summary: "" });
    prepareHero(app, record);
    expect(record.values.summary).toBe(made);
  });
});

describe("players migration", () => {
  /** Runs the migration against a stand-in app and returns the collections it saved. */
  function migrate(): Record<string, Record<string, any>> {
    const IS_DM = '@request.auth.collectionName = "dungeon_masters"';
    const existing: Record<string, Record<string, any>> = {
      heroes: { id: "heroes", name: "heroes", createRule: IS_DM, deleteRule: IS_DM },
      hero_updates: { id: "hero_updates", name: "hero_updates", updateRule: IS_DM, deleteRule: IS_DM },
    };
    const saved: Record<string, Record<string, any>> = {};
    let up: (app: unknown) => void = () => {};
    new Function("migrate", "Collection", readFileSync("pb_migrations/1791331200_players.js", "utf8"))(
      (forward: typeof up) => (up = forward),
      class {
        constructor(data: object) {
          Object.assign(this, data);
        }
      }
    );
    up({ findCollectionByNameOrId: (name: string) => existing[name], save: (c: Record<string, any>) => (saved[c.name] = c) });
    return saved;
  }

  const saved = migrate();

  it("lets anyone ask to join, and only DMs approve", () => {
    expect(saved.players.createRule).toBe("");
    expect(saved.players.updateRule).not.toContain("players");
    expect(saved.players.listRule).not.toContain("approved");
  });

  it("lets an approved player update their hero and post updates, nothing more", () => {
    const player = '@request.auth.collectionName = "players" && @request.auth.approved = true';
    expect(saved.heroes.updateRule).toContain(player);
    expect(saved.hero_updates.createRule).toContain(player);
    for (const rule of [saved.heroes.createRule, saved.heroes.deleteRule, saved.hero_updates.updateRule, saved.hero_updates.deleteRule]) {
      expect(rule).not.toContain("players");
    }
  });
});
