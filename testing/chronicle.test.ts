import { describe, expect, it } from "vitest";
import {
  axisToYear,
  formatEraRange,
  formatYear,
  joinYear,
  minorStep,
  packEras,
  packLanes,
  splitYear,
  tickStep,
  tickYears,
  timelineExtent,
  yearToAxis,
} from "~/lib/chronicle";

describe("years", () => {
  it("writes years the way the lore does", () => {
    expect(formatYear(-10000, true)).toBe("c. 10000 BC");
    expect(formatYear(307)).toBe("307 AC");
    expect(formatYear(0)).toBe("");
  });

  it("describes an era, open ends included", () => {
    expect(formatEraRange({ start_year: -9500, end_year: -8500, circa: true })).toBe("c. 9500 BC – 8500 BC");
    expect(formatEraRange({ start_year: 0, end_year: -10000, circa: true })).toBe("Before c. 10000 BC");
    expect(formatEraRange({ start_year: 304, end_year: 0, circa: false })).toBe("304 AC – present");
  });

  it("turns a number and BC or AC into a signed year and back", () => {
    expect(joinYear(9500, "BC")).toBe(-9500);
    expect(joinYear(307, "AC")).toBe(307);
    expect(joinYear(-12.7, "AC")).toBe(12);
    expect(joinYear(Number.NaN, "BC")).toBe(0);
    expect(joinYear(0, "BC")).toBe(0);
    expect(splitYear(-103)).toEqual({ value: 103, suffix: "BC" });
  });

  it("has no year zero: 1 BC and 1 AC are neighbours on the axis", () => {
    expect(yearToAxis(1) - yearToAxis(-1)).toBe(1);
    expect(yearToAxis(307)).toBe(306);
    expect(yearToAxis(-10000)).toBe(-10000);
    for (const year of [-10000, -2, -1, 1, 2, 307]) expect(axisToYear(yearToAxis(year))).toBe(year);
    expect(axisToYear(-0.5)).toBe(-1);
    expect(axisToYear(0.5)).toBe(1);
  });
});

describe("graduations", () => {
  it("picks rounder steps as the view zooms out", () => {
    expect(tickStep(160)).toBe(1);
    expect(tickStep(12)).toBe(10);
    expect(tickStep(0.11)).toBe(1000);
    expect(tickStep(0.0001)).toBe(10000);
  });

  it("splits a step into halves or fifths", () => {
    expect(minorStep(1)).toBe(0);
    expect(minorStep(10)).toBe(5);
    expect(minorStep(50)).toBe(10);
    expect(minorStep(1000)).toBe(500);
  });

  it("marks 1 AC where the count turns, never a year zero", () => {
    expect(tickYears(-250, 250, 100)).toEqual([-200, -100, 1, 100, 200]);
    expect(tickYears(-2, 2, 1)).toEqual([-2, -1, 1, 2, 3]);
  });
});

describe("layout", () => {
  it("runs from the first dated thing to the last", () => {
    expect(timelineExtent([-9500, 307], [{ start_year: 0, end_year: -10000 }])).toEqual({ min: -10000, max: 306 });
    expect(timelineExtent([], [])).toEqual({ min: -100, max: 99 });
    // A lone year still gets a decade to sit in.
    expect(timelineExtent([5], [])).toEqual({ min: -1, max: 9 });
  });

  it("keeps overlapping eras on separate rows and lets neighbours share one", () => {
    const eras = [
      { name: "League Wars", start_year: -103, end_year: 1 },
      { name: "Age of Concord", start_year: 1, end_year: 0 },
      { name: "Great Expansion", start_year: -72, end_year: 5 },
      { name: "Awakening", start_year: 0, end_year: -10000 },
    ];
    const rows = Object.fromEntries(packEras(eras, { min: -11000, max: 400 }).map((b) => [b.era.name, b]));
    expect(rows["Awakening"]).toMatchObject({ row: 0, from: -11000, to: -10000 });
    expect(rows["League Wars"].row).toBe(0);
    expect(rows["Age of Concord"]).toMatchObject({ row: 0, to: 400 });
    expect(rows["Great Expansion"].row).toBe(1);
  });

  it("stacks labels that would overlap and clusters the overflow", () => {
    const items = [
      { id: "a", x: 0, width: 100 },
      { id: "b", x: 50, width: 100 },
      { id: "c", x: 60, width: 100 },
      { id: "d", x: 70, width: 100 },
      { id: "e", x: 120, width: 100 },
      { id: "f", x: 400, width: 100 },
    ];
    const { lanes, clusters } = packLanes(items, 2);
    expect(lanes.get("a")).toBe(0);
    expect(lanes.get("b")).toBe(1);
    expect(lanes.get("e")).toBe(0);
    expect(lanes.get("f")).toBe(0);
    expect(clusters).toEqual([{ x: 60, ids: ["c", "d"] }]);
  });

  it("clusters everything when there are no lanes", () => {
    const { lanes, clusters } = packLanes([{ id: "a", x: 0, width: 10 }, { id: "b", x: 500, width: 10 }], 0);
    expect(lanes.size).toBe(0);
    expect(clusters.map((c) => c.ids)).toEqual([["a"], ["b"]]);
  });
});
