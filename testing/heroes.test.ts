import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classLabel, heroEpithet, heroTypeLine, sortHeroes } from "~/lib/heroes";

describe("hero cards", () => {
  it("has a frame in the stylesheet", () => {
    expect(readFileSync("app/app.css", "utf8")).toContain('[data-frame="hero"]');
  });

  it("builds the type line from species and class", () => {
    expect(heroTypeLine({ species: "Variant Aasimar", class: "Bard" })).toBe("[Variant Aasimar / Bard]");
    expect(heroTypeLine({ species: "", class: "Bard" })).toBe("[Bard]");
    expect(heroTypeLine({ species: "", class: "" })).toBe("[Hero]");
  });

  it("describes a hero by whatever is known", () => {
    expect(heroEpithet({ species: "Variant Aasimar", class: "Bard" })).toBe("Variant Aasimar Bard");
    expect(heroEpithet({ species: "Kobold", class: "" })).toBe("Kobold");
    expect(heroEpithet({ species: "", class: "" })).toBe("Hero");
  });

  it("names the subclass alongside the class", () => {
    expect(classLabel({ class: "Bard", subclass: "College of Lore" })).toBe("Bard (College of Lore)");
    expect(classLabel({ class: "Bard", subclass: "" })).toBe("Bard");
  });

  it("lists heroes alphabetically without touching the caller's list", () => {
    const heroes = [{ name: "Daymond Greystone" }, { name: "Alice" }, { name: "Chione" }];
    expect(sortHeroes(heroes).map((h) => h.name)).toEqual(["Alice", "Chione", "Daymond Greystone"]);
    expect(heroes[0].name).toBe("Daymond Greystone");
  });
});

describe("seeded hero", () => {
  const seed = readFileSync("pb_migrations/1790985601_seed_heroes.js", "utf8");

  it("tracks identity, not stats", () => {
    const schema = readFileSync("pb_migrations/1790985600_heroes.js", "utf8");
    expect(schema).not.toMatch(/name: 'level'/);
    expect(seed).not.toMatch(/level:/);
  });

  it("keeps Daymond's backstory as written, three paragraphs", () => {
    expect(seed).toContain("Daymond Greystone had never known a life beyond the walls of the Sanctuary of Luthiel");
    expect(seed).toContain("believing his path had already been set.");
    expect(seed).toContain("].join('\\n\\n')");
  });
});
