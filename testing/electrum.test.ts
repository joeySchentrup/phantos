import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accountForPlayer,
  ELECTRUM_FOR_ALL_STARS,
  electrumStars,
  ledgerTotals,
  levelUpSteps,
  MAX_STARS,
  parseElectrum,
} from "~/lib/electrum";
import { SECTIONS } from "~/lib/sections";

describe("electrum stars", () => {
  it("gives every star at 10,000 and none at nothing", () => {
    expect(electrumStars(ELECTRUM_FOR_ALL_STARS)).toBe(MAX_STARS);
    expect(electrumStars(0)).toBe(0);
    expect(electrumStars(-50)).toBe(0);
  });

  it("scales down in a straight line", () => {
    expect(electrumStars(7500)).toBe(9);
    expect(electrumStars(5000)).toBe(6);
    expect(electrumStars(2500)).toBe(3);
  });

  it("gives the first star for any electrum at all", () => {
    expect(electrumStars(1)).toBe(1);
    expect(electrumStars(20)).toBe(1);
    expect(electrumStars(833)).toBe(1);
  });

  it("earns each later star whole, never rounded up", () => {
    expect(electrumStars(1666)).toBe(1);
    expect(electrumStars(1667)).toBe(2);
    expect(electrumStars(9999)).toBe(MAX_STARS - 1);
  });

  it("stops at the top", () => {
    expect(electrumStars(250000)).toBe(MAX_STARS);
  });

  it("gives every seeded account its star", () => {
    const seed = readFileSync("pb_migrations/1791244801_seed_electrum.js", "utf8");
    const amounts = [...seed.matchAll(/amount: (\d+), spent/g)].map((match) => Number(match[1]));
    expect(amounts).toHaveLength(6);
    for (const amount of amounts) expect(electrumStars(amount)).toBe(1);
  });
});

describe("electrum amounts", () => {
  it("reads a typed amount as a whole number, never negative", () => {
    expect(parseElectrum("120")).toBe(120);
    expect(parseElectrum(" 40 ")).toBe(40);
    expect(parseElectrum("12.6")).toBe(13);
    expect(parseElectrum("-5")).toBe(0);
    expect(parseElectrum("")).toBe(0);
    expect(parseElectrum("lots")).toBe(0);
  });

  it("totals the ledger", () => {
    expect(ledgerTotals([{ amount: 820, spent: 0 }, { amount: 775, spent: 1245 }])).toEqual({ held: 1595, spent: 1245 });
    expect(ledgerTotals([])).toEqual({ held: 0, spent: 0 });
  });

  it("finds the unattached account in a player's name", () => {
    const accounts = [
      { name: "Brie", hero: "" },
      { name: "Joey", hero: "hero1" },
    ];
    expect(accountForPlayer(accounts, " brie ")?.name).toBe("Brie");
    expect(accountForPlayer(accounts, "Joey")).toBeUndefined();
    expect(accountForPlayer(accounts, "")).toBeUndefined();
  });
});

describe("level up costs", () => {
  const costs = [
    { level: 4, cost: 160 },
    { level: 5, cost: 240 },
    { level: 6, cost: 340 },
  ];

  it("prices one level, or several in a row", () => {
    expect(levelUpSteps(costs, 3, 4)).toEqual([{ level: 4, cost: 160 }]);
    expect(levelUpSteps(costs, 3, 6)?.map((step) => step.cost)).toEqual([160, 240, 340]);
  });

  it("has no answer for a level that isn't a step up or isn't in the table", () => {
    expect(levelUpSteps(costs, 5, 5)).toBeNull();
    expect(levelUpSteps(costs, 6, 4)).toBeNull();
    expect(levelUpSteps(costs, 2, 4)).toBeNull();
    expect(levelUpSteps(costs, 5, 7)).toBeNull();
  });
});

describe("seeded electrum", () => {
  const seed = readFileSync("pb_migrations/1791244801_seed_electrum.js", "utf8");
  const numbers = (pattern: RegExp) => [...seed.matchAll(pattern)].map((match) => match.slice(1).map(Number));

  it("holds the spreadsheet's six accounts and its totals", () => {
    const accounts = numbers(/amount: (\d+), spent: (\d+)/g);
    expect(accounts).toHaveLength(6);
    expect(accounts.reduce((sum, [amount]) => sum + amount, 0)).toBe(2370);
    expect(accounts.reduce((sum, [, spent]) => sum + spent, 0)).toBe(1645);
  });

  it("works the level up costs out from the spreadsheet's formula, for levels 4 to 20", () => {
    const levels = numbers(/level: (\d+), cost: (\d+)/g);
    expect(levels.map(([level]) => level)).toEqual(Array.from({ length: 17 }, (_, i) => i + 4));
    // 40 + 10 × l!/(l − 2)! is 40 + 10 × l × (l − 1).
    for (const [level, cost] of levels) expect(cost).toBe(40 + 10 * level * (level - 1));
  });

  it("prices every shop item flat", () => {
    const prices = numbers(/price: (\d+),/g).map(([price]) => price);
    expect(prices).toHaveLength(9);
    expect(Math.max(...prices)).toBe(ELECTRUM_FOR_ALL_STARS);
    expect(seed).not.toMatch(/price: ['"]/);
  });
});

describe("the electrum page", () => {
  it("is routed but kept off the top bar", () => {
    expect(readFileSync("app/routes.ts", "utf8")).toContain('route("/electrum"');
    expect(SECTIONS.some((section) => section.path === "/electrum")).toBe(false);
  });

  it("has its banner in the stylesheet", () => {
    expect(readFileSync("app/app.css", "utf8")).toContain(".electrum-banner");
  });
});
