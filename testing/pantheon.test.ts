import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attributeLabels, epithet, pantheonTypeLine, RANK_ORDER, RANKS, sortPantheon } from "~/lib/pantheon";

describe("ranks", () => {
  it("gives every rank a card frame in the stylesheet", () => {
    const css = readFileSync("app/app.css", "utf8");
    for (const rank of RANK_ORDER) expect(css).toContain(`[data-frame="${rank}"]`);
  });

  it("orders the pantheon from the Creator down, then by name", () => {
    const members = [
      { name: "Jinshi", rank: "greater" as const },
      { name: "Rokesh", rank: "primal" as const },
      { name: "Erosia", rank: "twin" as const },
      { name: "Agape", rank: "greater" as const },
      { name: "Kalistos", rank: "creator" as const },
      { name: "Golestandt", rank: "primal" as const },
    ];
    expect(sortPantheon(members).map((m) => m.name)).toEqual(["Kalistos", "Golestandt", "Rokesh", "Erosia", "Agape", "Jinshi"]);
    // The caller's list is left as it was.
    expect(members[0].name).toBe("Jinshi");
  });

  it("gives higher ranks more stars", () => {
    const levels = RANK_ORDER.map((rank) => RANKS[rank].level);
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
    expect(Math.max(...levels)).toBeLessThanOrEqual(12);
  });
});

describe("card text", () => {
  it("names one element, or the two a Greater Dragon is born of", () => {
    expect(attributeLabels(["fire"])).toBe("Fire");
    expect(attributeLabels(["light", "dark"])).toBe("Light + Dark");
  });

  it("builds the type line from the domain, falling back to the elements", () => {
    expect(pantheonTypeLine("greater", "Life", ["light", "dark"])).toBe("[Greater Dragon / Life]");
    expect(pantheonTypeLine("other", "", ["ice"])).toBe("[Power / Ice]");
  });

  it("writes a member's epithet", () => {
    expect(epithet("primal", "Light")).toBe("Primal Dragon of Light");
    expect(epithet("twin", " Night ")).toBe("Twin of Night");
    expect(epithet("other", "")).toBe("Power");
  });
});
