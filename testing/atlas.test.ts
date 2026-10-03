import { describe, expect, it } from "vitest";
import {
  centroid,
  chartToFrame,
  distanceToSegment,
  forestPath,
  fewestPoints,
  frameToView,
  insertPoint,
  hitRealm,
  hitTerrain,
  initialView,
  labelSize,
  lakePath,
  landCentre,
  midpoints,
  mountainPath,
  nameTier,
  placeRealm,
  pointInPolygon,
  pointerToChart,
  polygonPath,
  realmLabel,
  removePoint,
  reshape,
  ringPath,
  smoothPath,
  spreadTo,
  terrainLabel,
  zoomAbout,
} from "~/lib/atlas";
import type { ChartPoint, FeatureKind } from "~/types/atlas";

const HURLY = { width: 1400, height: 700 };

/** The terrain the Hurly chart is seeded with. */
const FEATURES: { name: string; kind: FeatureKind; points: ChartPoint[]; spread?: number }[] = [
  { name: "Northern Mountain Range", kind: "mountains", points: [[630, 268], [665, 258], [700, 252], [735, 258], [770, 268]] },
  { name: "Swedcele Mountains", kind: "mountains", points: [[440, 222], [468, 214], [498, 222], [528, 232]] },
  { name: "Monguian Mountains", kind: "mountains", points: [[432, 392], [465, 380], [500, 384], [535, 392], [562, 402]] },
  { name: "Rusan Mountains", kind: "mountains", points: [[915, 100], [945, 90], [975, 98], [1000, 112]] },
  { name: "Ashmire Forest", kind: "forest", points: [[700, 322]], spread: 26 },
  { name: "Great Southern Forest", kind: "forest", points: [[902, 532]], spread: 30 },
  { name: "Southern Green", kind: "forest", points: [[846, 442]], spread: 17 },
  { name: "Lake of Mystery", kind: "lake", points: [[830, 480]], spread: 20 },
  { name: "River of Fate", kind: "river", points: [[849, 482], [878, 477], [908, 485], [938, 479], [962, 472]] },
];

const SQUARE: ChartPoint[] = [[0, 0], [10, 0], [10, 10], [0, 10]];

describe("geometry", () => {
  it("knows the inside of a polygon from the outside", () => {
    expect(pointInPolygon(5, 5, SQUARE)).toBe(true);
    expect(pointInPolygon(15, 5, SQUARE)).toBe(false);
    expect(pointInPolygon(5, -1, SQUARE)).toBe(false);
    // A notch cut out of the square is outside it.
    const notched: ChartPoint[] = [[0, 0], [10, 0], [10, 10], [5, 4], [0, 10]];
    expect(pointInPolygon(5, 8, notched)).toBe(false);
    expect(pointInPolygon(5, 2, notched)).toBe(true);
  });

  it("measures to the nearest part of a segment, ends included", () => {
    expect(distanceToSegment(5, 3, [0, 0], [10, 0])).toBe(3);
    expect(distanceToSegment(-3, 4, [0, 0], [10, 0])).toBe(5);
    expect(distanceToSegment(13, 4, [0, 0], [10, 0])).toBe(5);
    // A segment with no length is a point.
    expect(distanceToSegment(3, 4, [0, 0], [0, 0])).toBe(5);
  });

  it("finds the middle of a set of corners", () => {
    expect(centroid(SQUARE)).toEqual([5, 5]);
    expect(centroid([])).toEqual([0, 0]);
    expect(realmLabel({ label: null, points: SQUARE })).toEqual([5, 5]);
    expect(realmLabel({ label: [2, 3], points: SQUARE })).toEqual([2, 3]);
  });
});

describe("hit-testing", () => {
  const hit = (x: number, y: number, z = 1) => hitTerrain(x, y, FEATURES, z)?.name;

  it("finds every seeded feature where it is drawn", () => {
    expect(hit(700, 322)).toBe("Ashmire Forest");
    expect(hit(902, 532)).toBe("Great Southern Forest");
    expect(hit(846, 442)).toBe("Southern Green");
    expect(hit(908, 485)).toBe("River of Fate");
    // Peaks rise above the spine, so a range answers a little above its line.
    expect(hit(700, 244)).toBe("Northern Mountain Range");
    expect(hit(468, 210)).toBe("Swedcele Mountains");
    expect(hit(500, 380)).toBe("Monguian Mountains");
    expect(hit(945, 86)).toBe("Rusan Mountains");
  });

  it("takes the feature drawn last where two overlap", () => {
    // The river rises inside the lake.
    expect(hit(849, 482)).toBe("River of Fate");
    expect(hit(815, 480)).toBe("Lake of Mystery");
  });

  it("treats a forest as an ellipse, flatter than it is wide", () => {
    expect(hit(700 + 28, 322)).toBe("Ashmire Forest");
    expect(hit(700, 322 + 28)).toBeUndefined();
  });

  it("misses the open sea", () => {
    expect(hit(100, 100)).toBeUndefined();
    expect(hitTerrain(100, 100, [], 1)).toBeNull();
  });

  it("allows less slack as the reader zooms in", () => {
    // 11 units from the river: inside at 1× (8 + 4), outside at 4× (8 + 1).
    expect(hit(908, 496, 1)).toBe("River of Fate");
    expect(hit(908, 496, 4)).toBeUndefined();
  });

  it("names the realm a point lies in, the last drawn winning", () => {
    const realms = [
      { name: "Hossari", points: SQUARE },
      { name: "Fuchs", points: [[5, 0], [20, 0], [20, 10], [5, 10]] as ChartPoint[] },
    ];
    expect(hitRealm(2, 5, realms)?.name).toBe("Hossari");
    expect(hitRealm(7, 5, realms)?.name).toBe("Fuchs");
    expect(hitRealm(30, 5, realms)).toBeNull();
  });

  it("takes a place's word for its realm before the borders'", () => {
    const realms = [{ name: "Lakose", points: SQUARE }];
    expect(placeRealm({ x: 5, y: 5, realm: "Papal State" }, realms)).toBe("Papal State");
    expect(placeRealm({ x: 5, y: 5, realm: "" }, realms)).toBe("Lakose");
    expect(placeRealm({ x: 50, y: 5 }, realms)).toBe("");
  });

  it("sizes a forest to the pointer on its edge", () => {
    expect(spreadTo([700, 322], 730, 322)).toBe(30);
    expect(spreadTo([700, 322], 700, 346)).toBe(30);
    expect(spreadTo([700, 322], 701, 322)).toBe(8);
    expect(spreadTo([700, 322], 900, 322)).toBe(80);
  });
});

describe("adding and removing points", () => {
  it("offers a point halfway along every side of a realm, and every stretch of a line", () => {
    expect(midpoints(SQUARE, true)).toEqual([
      { index: 1, at: [5, 0] },
      { index: 2, at: [10, 5] },
      { index: 3, at: [5, 10] },
      { index: 4, at: [0, 5] },
    ]);
    expect(midpoints([[0, 0], [10, 0], [10, 7]], false)).toEqual([
      { index: 1, at: [5, 0] },
      { index: 2, at: [10, 4] },
    ]);
  });

  it("puts a new point where it was offered, the closing side included", () => {
    expect(insertPoint(SQUARE, 1, [5, 0])).toEqual([[0, 0], [5, 0], [10, 0], [10, 10], [0, 10]]);
    expect(insertPoint(SQUARE, 4, [0, 5])).toEqual([[0, 0], [10, 0], [10, 10], [0, 10], [0, 5]]);
  });

  it("won't take a shape below its fewest points", () => {
    expect(removePoint(SQUARE, 1, fewestPoints("realm"))).toEqual([[0, 0], [10, 10], [0, 10]]);
    expect(removePoint([[0, 0], [10, 0], [10, 10]], 0, fewestPoints("realm"))).toBeNull();
    expect(removePoint([[0, 0], [10, 0]], 0, fewestPoints("river"))).toBeNull();
    expect(fewestPoints("mountains")).toBe(2);
  });
});

describe("terrain kinds", () => {
  const range = { kind: "mountains" as const, points: [[10, 10], [30, 20], [50, 30]] as ChartPoint[], spread: 0 };
  const forest = { kind: "forest" as const, points: [[700, 322]] as ChartPoint[], spread: 26 };

  it("leaves the shape alone between kinds of the same shape", () => {
    expect(reshape(range, "river")).toEqual({ points: range.points, spread: 0 });
    expect(reshape(forest, "lake")).toEqual({ points: forest.points, spread: 26 });
  });

  it("gathers a line to a heart, and stretches a heart to a line", () => {
    expect(reshape(range, "forest")).toEqual({ points: [[30, 20]], spread: 20 });
    expect(reshape(forest, "river")).toEqual({ points: [[674, 322], [726, 322]], spread: 0 });
  });
});

describe("names", () => {
  it("names more as the reader zooms in", () => {
    expect(nameTier(1.2)).toBe(3);
    expect(nameTier(1.49)).toBe(3);
    expect(nameTier(1.5)).toBe(2);
    expect(nameTier(2.19)).toBe(2);
    expect(nameTier(2.2)).toBe(1);
    expect(nameTier(6)).toBe(1);
  });

  it("sizes a realm's name to its width, within limits", () => {
    expect(labelSize({ name: "Hossari", points: [[622, 129], [796, 203]] })).toBe(10);
    expect(labelSize({ name: "Claire Fontaine", points: [[421, 320], [533, 367]] })).toBe(6);
    expect(labelSize({ name: "Rus", points: [[0, 0], [40, 0]] })).toBe(8);
  });

  it("writes terrain names clear of the terrain", () => {
    expect(terrainLabel(FEATURES[0])).toEqual([630, 254]);
    expect(terrainLabel(FEATURES[4])).toEqual([700, 355]);
    expect(terrainLabel(FEATURES[7])).toEqual([830, 500.4]);
    expect(terrainLabel(FEATURES[8])).toEqual([908, 477]);
  });
});

describe("paths", () => {
  it("draws curves, polygons and terrain", () => {
    expect(smoothPath([[0, 0], [10, 10], [20, 0]], false)).toMatch(/^M0,0 C.+ 20,0$/);
    expect(smoothPath([[0, 0], [10, 10], [20, 0]], true)).toMatch(/ Z$/);
    expect(polygonPath(SQUARE)).toBe("M0,0 L10,0 L10,10 L0,10 Z");
    expect(mountainPath(FEATURES[0].points)).not.toBe("");
    expect(forestPath(700, 322, 26)).not.toBe("");
    expect(lakePath(830, 480, 20)).not.toBe("");
    expect(ringPath(700, 322, 33)).toMatch(/ Z$/);
  });

  it("draws nothing from too few points", () => {
    expect(smoothPath([[0, 0]], false)).toBe("");
    expect(polygonPath([])).toBe("");
    expect(mountainPath([[0, 0]])).toBe("");
  });

  it("plants more trees in a wider forest, and never fewer than five", () => {
    const trees = (spread: number) => forestPath(0, 0, spread).split(" a").length - 1;
    expect(trees(8)).toBe(10);
    expect(trees(60)).toBeGreaterThan(trees(26));
  });
});

describe("the view", () => {
  const frame = { width: 1000, height: 400 };
  const view = { z: 1.2, tx: -9.76, ty: -19.3 };

  it("finds the middle of the land", () => {
    expect(landCentre({ ...HURLY, land: [[[372, 72], [1022, 620]], [[607, 562], [639, 594]]] })).toEqual([697, 346]);
    expect(landCentre({ ...HURLY, land: null })).toEqual([700, 350]);
    expect(landCentre({ ...HURLY, land: [], land_centre: [10, 20] })).toEqual([10, 20]);
  });

  it("opens with the land in the middle of the frame, whatever the frame's shape", () => {
    for (const shape of [frame, { width: 390, height: 390 }, { width: 1136, height: 478 }]) {
      const opening = initialView(HURLY, shape, [697, 346], 1.2);
      const [x, y] = chartToFrame(697, 346, opening, shape, HURLY);
      expect(x).toBeCloseTo(50);
      expect(y).toBeCloseTo(50);
    }
  });

  it("keeps the point under the cursor fixed while zooming", () => {
    const [fx, fy] = frameToView(640, 130, frame, HURLY);
    const before = pointerToChart(640, 130, view, frame, HURLY);
    for (const z of [0.6, 2, 3.7]) {
      const zoomed = zoomAbout(view, z, fx, fy);
      expect(zoomed.z).toBe(z);
      expect(pointerToChart(640, 130, zoomed, frame, HURLY)).toEqual(before);
    }
  });

  it("stops zooming at the limits", () => {
    expect(zoomAbout(view, 40, 50, 50).z).toBe(6);
    expect(zoomAbout(view, 0.01, 50, 50).z).toBe(0.5);
  });

  it("turns a pointer into a chart position and back", () => {
    for (const [x, y] of [[693, 440], [372, 72], [1022, 620], [0, 0]] as ChartPoint[]) {
      const [left, top] = chartToFrame(x, y, view, frame, HURLY);
      const px = (left / 100) * frame.width;
      const py = (top / 100) * frame.height;
      expect(pointerToChart(px, py, view, frame, HURLY)).toEqual([x, y]);
    }
  });
});
