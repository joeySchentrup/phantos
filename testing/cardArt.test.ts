import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CARD_ART_SIZE, isFinishedCardArt, squareCrop } from "~/lib/cardArt";

describe("squareCrop", () => {
  it("takes the centred square of a landscape image", () => {
    expect(squareCrop(4032, 3024)).toEqual({ sx: 504, sy: 0, side: 3024 });
  });

  it("takes the centred square of a portrait image", () => {
    expect(squareCrop(3024, 4032)).toEqual({ sx: 0, sy: 504, side: 3024 });
  });

  it("leaves a square image whole", () => {
    expect(squareCrop(1254, 1254)).toEqual({ sx: 0, sy: 0, side: 1254 });
  });
});

describe("card art", () => {
  it("is big enough for a card on a high-density screen", () => {
    // Cards are drawn at most ~350px wide.
    expect(CARD_ART_SIZE).toBeGreaterThanOrEqual(700);
  });

  it("counts only WebP copies as finished", () => {
    expect(isFinishedCardArt("card_art_x7y.webp")).toBe(true);
    expect(isFinishedCardArt("card_art_x7y.jpg")).toBe(false);
    expect(isFinishedCardArt("card_art_x7y.png")).toBe(false);
    expect(isFinishedCardArt("")).toBe(false);
    expect(isFinishedCardArt(undefined)).toBe(false);
  });

  it("is added, backfilled and kept in step for every collection with card images", () => {
    const schema = readFileSync("pb_migrations/1791072000_card_art.js", "utf8");
    const backfill = readFileSync("pb_migrations/1791072001_backfill_card_art.js", "utf8");
    const hooks = readFileSync("pb_hooks/phantos/lib.js", "utf8");
    const api = readFileSync("app/backend/api.ts", "utf8");
    const fields = "{ lore: 'cover', pantheon: 'image', heroes: 'portrait' }";
    expect(schema).toContain(fields);
    expect(backfill).toContain(fields);
    expect(api).toContain("{ lore: 'cover', pantheon: 'image', heroes: 'portrait' } as const");
    for (const field of ["cover", "image", "portrait"]) expect(hooks).toContain(`syncCardArt(record, '${field}')`);
  });

  it("never sends the 1600px version to a card", () => {
    for (const card of ["LoreCard", "PantheonCard", "HeroCard"]) {
      const source = readFileSync(`app/components/${card}.tsx`, "utf8");
      expect(source).not.toContain("1600x0");
      expect(source).toContain("cardArtUrl(");
    }
  });
});
