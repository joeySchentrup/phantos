import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_SPREAD,
  FEATURE_KINDS,
  PLACE_KINDS,
  TONE_OPACITY,
  TONES,
  ZOOM_STEP,
  chartToFrame,
  forestPath,
  frameToView,
  hitRealm,
  hitTerrain,
  initialView,
  isRound,
  labelSize,
  lakePath,
  landCentre,
  mountainPath,
  nameTier,
  placeRealm,
  pointerToChart,
  polygonPath,
  realmLabel,
  ringPath,
  sheetHeight,
  smoothPath,
  spreadTo,
  terrainLabel,
  zoomAbout,
  type AtlasEdit,
  type AtlasLayers,
  type AtlasSelection,
  type AtlasTool,
  type Frame,
  type View,
} from "~/lib/atlas";
import type { Chart, ChartPoint, Feature, Place, Realm } from "~/types/atlas";
import LoreCard from "./LoreCard";

interface AtlasChartProps {
  chart: Chart;
  places: Place[];
  realms: Realm[];
  features: Feature[];
  /** A Dungeon Master drags pins and handles and draws with the tools; a reader only looks. */
  mode: "reader" | "dm";
  tool: AtlasTool;
  selection: AtlasSelection | null;
  layers: AtlasLayers;
  /** The points of the realm, range or river being drawn. */
  draft: ChartPoint[];
  /** The zoom the chart opens at, and returns to with "Whole chart". */
  initialZoom: number;
  /** Shows the selected place's card under the chart, not beside its pin. For narrow screens. */
  cardBelow: boolean;
  className?: string;
  onSelect: (selection: AtlasSelection | null) => void;
  /** Called on every move of a drag, with the record as it now stands. */
  onChange: (edit: AtlasEdit) => void;
  /** Called once when a drag ends, to save where the record came to rest. */
  onCommit: (edit: AtlasEdit) => void;
  /** A click with a one-click tool: a new place, or a forest's heart. */
  onPlaceAt: (x: number, y: number) => void;
  /** A click with a drawing tool: the next point of the shape. */
  onDraftPoint: (x: number, y: number) => void;
}

type DragTarget =
  | { type: "place"; id: string }
  | { type: "realm"; id: string; index: number }
  | { type: "feature"; id: string; index: number }
  | { type: "spread"; id: string };

interface Drag {
  target: DragTarget;
  /** Where the press began, in client pixels. */
  x: number;
  y: number;
  /** From the pointer to the thing's own position, in chart units, so it doesn't jump on the first move. */
  offset: ChartPoint;
  moved: boolean;
  edit: AtlasEdit | null;
}

/** A press that moves less than this many pixels is a click. */
const CLICK_SLOP = 4;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function sameSelection(a: AtlasSelection | null, b: AtlasSelection | null): boolean {
  return a === b || (!!a && !!b && a.type === b.type && a.id === b.id);
}

/** The card a place draws: its lore entry's, or a face-down card of its own. */
function PlaceCard({ place, realm, width }: { place: Place; realm?: string; width: number }) {
  const lore = place.expand?.lore;
  return (
    <>
      <p className="atlas-kicker self-start">
        {PLACE_KINDS[place.kind]?.label ?? "Place"}
        {realm && ` · ${realm}`}
      </p>
      <div className="pointer-events-auto max-w-full" style={{ width }}>
        {lore ? (
          <LoreCard lore={lore} to={`/lore/${lore.slug}`} />
        ) : (
          <LoreCard
            lore={{
              title: place.name,
              category: "map",
              attribute: "earth",
              author: "",
              summary: "This card has no text yet.",
              cover: "",
              word_count: 0,
              published: false,
              created: "",
            }}
          />
        )}
      </div>
    </>
  );
}

function Compass({ style }: { style: React.CSSProperties }) {
  const letter = { fontFamily: "Cinzel, serif", fontSize: 11, fontWeight: 700, fill: "#8a1f0d" };
  return (
    <svg viewBox="0 0 100 100" width="90" height="90" className="pointer-events-none absolute" style={style} aria-hidden="true">
      <circle cx="50" cy="50" r="36" fill="none" stroke="#8a1f0d" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M50,8 L58,50 L50,92 L42,50 Z" fill="#8a1f0d" />
      <path d="M8,50 L50,42 L92,50 L50,58 Z" fill="#e2cf9f" stroke="#8a1f0d" strokeWidth="1" />
      <text x="50" y="7" textAnchor="middle" style={letter}>N</text>
      <text x="50" y="100" textAnchor="middle" style={letter}>S</text>
      <text x="2" y="54" textAnchor="start" style={letter}>W</text>
      <text x="98" y="54" textAnchor="end" style={letter}>E</text>
    </svg>
  );
}

/**
 * One chart of the Atlas, drawn in vector on parchment. Everything placed on
 * the chart lives in one box (the sheet) and is positioned by percentages of
 * it, so a single transform pans and zooms the lot. The land zooms; names,
 * pins and line weights are scaled back down so they hold their size.
 */
export default function AtlasChart({
  chart,
  places,
  realms,
  features,
  mode,
  tool,
  selection,
  layers,
  draft,
  initialZoom,
  cardBelow,
  className = "",
  onSelect,
  onChange,
  onCommit,
  onPlaceAt,
  onDraftPoint,
}: AtlasChartProps) {
  const dm = mode === "dm";
  const drawn = !!chart.land?.length;

  const frameRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  // Null until the reader pans or zooms, so the opening view follows the frame as it is measured.
  const [moved, setMoved] = useState<View | null>(null);
  const [hover, setHover] = useState<AtlasSelection | null>(null);
  const [hoverPlace, setHoverPlace] = useState<string | null>(null);
  const [gesture, setGesture] = useState<"pan" | "drag" | null>(null);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; z: number } | null>(null);
  const pan = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  const drag = useRef<Drag | null>(null);

  // Beside the key the frame takes the row's height, so its shape is measured, never assumed.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const { clientWidth: width, clientHeight: height } = el;
      if (!width || !height) return;
      setFrame((last) => (last && last.width === width && last.height === height ? last : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const centre = useMemo(() => landCentre(chart), [chart]);
  const opening = useMemo(
    () => (frame ? initialView(chart, frame, centre, initialZoom) : null),
    [chart, frame, centre, initialZoom]
  );
  const view = moved ?? opening;

  /** A pointer's position inside the frame, in pixels. */
  const inFrame = (event: { clientX: number; clientY: number }): [number, number] => {
    const el = frameRef.current!;
    const rect = el.getBoundingClientRect();
    return [event.clientX - rect.left - el.clientLeft, event.clientY - rect.top - el.clientTop];
  };

  // Wheel events have to be cancellable, which React's own listeners aren't.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !frame || !opening || !drawn) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.deltaMode === 1 ? 0.05 : 0.0015));
      const [fx, fy] = frameToView(...inFrame(event), frame, chart);
      setMoved((last) => {
        const from = last ?? opening;
        return zoomAbout(from, from.z * factor, fx, fy);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [chart, frame, opening, drawn]);

  // Paths only change when what they draw does, not on every pan.
  const coast = useMemo(() => (chart.land ?? []).map((shore) => smoothPath(shore, true)).join(" "), [chart.land]);
  const realmPaths = useMemo(() => {
    const tones = TONES.map(() => "");
    let borders = "";
    for (const realm of realms) {
      const d = polygonPath(realm.points);
      tones[clamp(realm.tone, 0, TONES.length - 1)] += `${d} `;
      borders += `${d} `;
    }
    return { tones, borders };
  }, [realms]);
  const terrain = useMemo(() => {
    const paths = { mountains: "", forest: "", lake: "", river: "" };
    for (const feature of features) {
      const heart = feature.points[0];
      if (!heart) continue;
      const spread = feature.spread || DEFAULT_SPREAD;
      if (feature.kind === "mountains") paths.mountains += mountainPath(feature.points);
      if (feature.kind === "forest") paths.forest += forestPath(heart[0], heart[1], spread);
      if (feature.kind === "lake") paths.lake += `${lakePath(heart[0], heart[1], spread)} `;
      if (feature.kind === "river") paths.river += `${smoothPath(feature.points, false)} `;
    }
    return paths;
  }, [features]);

  const frameClass = "scroll atlas-frame flex-1 aspect-square lg:aspect-auto lg:min-h-[26rem]";

  if (!frame || !view || !opening) {
    return (
      <div className={`flex min-w-0 flex-col gap-6 ${className}`}>
        <div className="relative flex flex-1 flex-col">
          <div ref={frameRef} className={frameClass} />
        </div>
      </div>
    );
  }

  // ---- Where things are ---------------------------------------------------

  const z = view.z;
  const sheet = sheetHeight(frame, chart);

  /** The chart position under a pointer. It may lie off the sheet. */
  const toChart = (event: { clientX: number; clientY: number }): ChartPoint =>
    pointerToChart(...inFrame(event), view, frame, chart);
  const onSheet = ([x, y]: ChartPoint): ChartPoint => [clamp(x, 0, chart.width), clamp(y, 0, chart.height)];

  /** What a click at this position selects: terrain before the realm beneath it. Hidden layers don't answer. */
  const hitAt = ([x, y]: ChartPoint): AtlasSelection | null => {
    const feature = layers.terrain ? hitTerrain(x, y, features, z) : null;
    if (feature) return { type: "feature", id: feature.id };
    const realm = layers.realms ? hitRealm(x, y, realms) : null;
    return realm ? { type: "realm", id: realm.id } : null;
  };

  const zoomBy = (factor: number) => {
    const [fx, fy] = frameToView(frame.width / 2, frame.height / 2, frame, chart);
    setMoved(zoomAbout(view, z * factor, fx, fy));
  };

  // ---- Pointers: pan, pinch, click, and the Dungeon Master's drags ---------

  const startDrag = (event: React.PointerEvent, target: DragTarget, at: ChartPoint) => {
    const pointer = toChart(event);
    drag.current = {
      target,
      x: event.clientX,
      y: event.clientY,
      offset: [at[0] - pointer[0], at[1] - pointer[1]],
      moved: false,
      edit: null,
    };
  };

  const moveDrag = (event: React.PointerEvent, held: Drag) => {
    if (!held.moved) {
      if (Math.abs(event.clientX - held.x) + Math.abs(event.clientY - held.y) < CLICK_SLOP) return;
      held.moved = true;
      setGesture("drag");
      setHover(null);
      setHoverPlace(null);
    }
    const pointer = toChart(event);
    const at = onSheet([pointer[0] + held.offset[0], pointer[1] + held.offset[1]]);
    const { target } = held;
    let edit: AtlasEdit | null = null;

    if (target.type === "place") {
      const place = places.find((p) => p.id === target.id);
      // A place set down by hand takes the realm it lands in.
      if (place) edit = { type: "place", record: { ...place, x: at[0], y: at[1], realm: hitRealm(at[0], at[1], realms)?.name ?? "" } };
    } else if (target.type === "realm") {
      const realm = realms.find((r) => r.id === target.id);
      if (realm) edit = { type: "realm", record: { ...realm, points: realm.points.map((p, i) => (i === target.index ? at : p)) } };
    } else if (target.type === "feature") {
      const feature = features.find((f) => f.id === target.id);
      if (feature) edit = { type: "feature", record: { ...feature, points: feature.points.map((p, i) => (i === target.index ? at : p)) } };
    } else {
      const feature = features.find((f) => f.id === target.id);
      if (feature?.points[0]) edit = { type: "feature", record: { ...feature, spread: spreadTo(feature.points[0], pointer[0], pointer[1]) } };
    }

    if (!edit) return;
    held.edit = edit;
    onChange(edit);
  };

  const endDrag = () => {
    const held = drag.current;
    if (!held) return;
    drag.current = null;
    setGesture(null);
    if (!held.moved || !held.edit) return;
    onCommit(held.edit);
    if (held.target.type === "place") onSelect({ type: "place", id: held.target.id });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!drawn || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, z };
      pan.current = null;
      endDrag();
      setGesture(null);
      return;
    }
    pan.current = { x: event.clientX, y: event.clientY, tx: view.tx, ty: view.ty, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pinch.current) {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const to = (pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / pinch.current.distance;
      const [fx, fy] = frameToView(...inFrame({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }), frame, chart);
      setMoved((last) => zoomAbout(last ?? opening, to, fx, fy));
      return;
    }

    if (drag.current) {
      moveDrag(event, drag.current);
      return;
    }

    const held = pan.current;
    if (held) {
      const dx = event.clientX - held.x;
      const dy = event.clientY - held.y;
      if (!held.moved && Math.abs(dx) + Math.abs(dy) < CLICK_SLOP) return;
      if (!held.moved) {
        held.moved = true;
        setGesture("pan");
        setHover(null);
      }
      setMoved((last) => ({
        z: (last ?? opening).z,
        tx: held.tx + (dx / frame.width) * 100,
        ty: held.ty + (dy / sheet) * 100,
      }));
      return;
    }

    if (event.pointerType !== "touch" && tool === "select") {
      // Over a pin or a handle, that is what a click would take, not the realm beneath it.
      const covered = (event.target as Element).closest(".atlas-pin, .atlas-handle");
      const hit = covered ? null : hitAt(toChart(event));
      setHover((last) => (sameSelection(last, hit) ? last : hit));
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);

    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      pan.current = null;
      return;
    }
    if (drag.current) {
      endDrag();
      return;
    }

    const held = pan.current;
    if (!held) return;
    pan.current = null;
    setGesture(null);
    if (held.moved) return;

    // A click. With a tool in hand it draws; otherwise it selects, and a click on open water lets go.
    const at = toChart(event);
    if (!dm || tool === "select") {
      onSelect(hitAt(at));
      return;
    }
    const [x, y] = onSheet(at);
    if (tool === "add-place" || tool === "draw-forest") onPlaceAt(x, y);
    else onDraftPoint(x, y);
  };

  const onPointerLeave = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    pan.current = null;
    // A drag that runs off the chart ends where it left, and is saved there.
    endDrag();
    setGesture(null);
    setHover(null);
  };

  // ---- What is lit ----------------------------------------------------------

  const find = (target: AtlasSelection | null): { realm?: Realm; feature?: Feature; place?: Place } => {
    if (!target) return {};
    if (target.type === "realm") return { realm: realms.find((r) => r.id === target.id) };
    if (target.type === "feature") return { feature: features.find((f) => f.id === target.id) };
    return { place: places.find((p) => p.id === target.id) };
  };

  const picked = find(selection);
  // The selection keeps its outline; failing that, whatever the pointer is over.
  const lit = picked.realm || picked.feature ? picked : find(tool === "select" && gesture !== "drag" ? hover : null);

  let outline = "";
  let outlineFilled = true;
  if (lit.realm) outline = polygonPath(lit.realm.points);
  if (lit.feature?.points[0]) {
    const heart = lit.feature.points[0];
    if (isRound(lit.feature.kind)) outline = ringPath(heart[0], heart[1], (lit.feature.spread || DEFAULT_SPREAD) + 7);
    else {
      outline = smoothPath(lit.feature.points, false);
      outlineFilled = false;
    }
  }

  let caption: { kicker: string; name: string; note: string } | null = null;
  if (lit.realm) {
    caption = {
      kicker: lit.realm.published ? "Realm" : "Realm · Draft",
      name: lit.realm.name,
      note: lit.realm.standing || "No standing recorded",
    };
  } else if (lit.feature) {
    const handles = isRound(lit.feature.kind) ? " · drag the heart to move it, the edge to resize" : " · drag the handles to move it";
    caption = {
      kicker: lit.feature.published ? "Terrain" : "Terrain · Draft",
      name: lit.feature.name,
      note: (FEATURE_KINDS[lit.feature.kind]?.label ?? "Terrain") + (dm ? handles : ""),
    };
  }

  const draftPath =
    draft.length > 1 ? (tool === "draw-realm" && draft.length > 2 ? polygonPath(draft) : smoothPath(draft, false)) : "";

  // The place whose card is drawn: the selected one, else the one under the pointer.
  const cardPlace = picked.place ?? places.find((p) => p.id === hoverPlace) ?? null;
  const cardRealm = cardPlace ? placeRealm(cardPlace, realms) : "";
  const cardAt = cardPlace ? chartToFrame(cardPlace.x, cardPlace.y, view, frame, chart) : null;
  // Not while drawing: a card over the chart would take the clicks meant for it.
  const showPopover =
    !!cardPlace && !!cardAt && !cardBelow && drawn && layers.places && !gesture && tool === "select" &&
    cardAt[0] >= 0 && cardAt[0] <= 100 && cardAt[1] >= 0 && cardAt[1] <= 100;

  // ---- Drawing --------------------------------------------------------------

  // Annotation holds its size on screen: labels grow only a little (z^0.25), pins and line weights not at all.
  const inv = 1 / z;
  const labelScale = Math.pow(z, 0.25) / z;
  const sw = (width: number) => Math.round((100 * width) / z) / 100;
  const tier = nameTier(z);
  const spot = (x: number, y: number) => ({ left: `${(x / chart.width) * 100}%`, top: `${(y / chart.height) * 100}%` });
  const centred = (scale: number) => `translate(-50%, -50%) scale(${scale})`;

  const handles: { key: string; at: ChartPoint; label: string; className: string; target: DragTarget }[] = [];
  if (dm && picked.realm) {
    const realm = picked.realm;
    realm.points.forEach((point, index) =>
      handles.push({
        key: `corner-${index}`,
        at: point,
        label: `Corner ${index + 1} of ${realm.name}`,
        className: "atlas-handle atlas-handle--square",
        target: { type: "realm", id: realm.id, index },
      })
    );
  }
  if (dm && picked.feature) {
    const feature = picked.feature;
    const round = isRound(feature.kind);
    feature.points.forEach((point, index) =>
      handles.push({
        key: `point-${index}`,
        at: point,
        label: round ? `Heart of ${feature.name}` : `Point ${index + 1} of ${feature.name}`,
        className: "atlas-handle",
        target: { type: "feature", id: feature.id, index },
      })
    );
    // A forest or lake also has a handle on its edge: drag it to change the spread.
    if (round && feature.points[0]) {
      handles.push({
        key: "spread",
        at: [feature.points[0][0] + (feature.spread || DEFAULT_SPREAD), feature.points[0][1]],
        label: `Spread of ${feature.name}, drag to resize`,
        className: "atlas-handle atlas-handle--square atlas-handle--spread",
        target: { type: "spread", id: feature.id },
      });
    }
  }

  const cursor = gesture ? "grabbing" : dm && tool !== "select" ? "crosshair" : hover ? "pointer" : "grab";

  return (
    <div className={`flex min-w-0 flex-col gap-6 ${className}`}>
      <div className="relative flex flex-1 flex-col">
        <div
          ref={frameRef}
          role="group"
          aria-label={`Chart of ${chart.name}`}
          className={frameClass}
          style={{ cursor: drawn ? cursor : undefined }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerLeave}
          onPointerLeave={onPointerLeave}
        >
          {drawn && (
            <div
              className="atlas-sheet"
              style={{
                aspectRatio: `${chart.width} / ${chart.height}`,
                transform: `translate(${view.tx.toFixed(3)}%, ${view.ty.toFixed(3)}%) scale(${z.toFixed(4)})`,
              }}
            >
              <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="atlas-land" aria-hidden="true">
                <rect width={chart.width} height={chart.height} fill="#e2cf9f" />
                <rect x="14" y="14" width={chart.width - 28} height={chart.height - 28} fill="none" stroke="#8a6d3b" strokeWidth="1.2" />
                <rect x="20" y="20" width={chart.width - 40} height={chart.height - 40} fill="none" stroke="#8a6d3b" strokeWidth="0.6" strokeDasharray="2 3" />

                {/* The coast twice: a hachure out into the water, then the land over it. */}
                <path d={coast} fill="none" stroke="#4a3520" strokeWidth={sw(10)} strokeDasharray={`${sw(1)} ${sw(4)}`} opacity="0.28" />
                <path d={coast} fill="#efe2c0" stroke="#2b1c10" strokeWidth={sw(2.2)} strokeLinejoin="round" />

                <g opacity={layers.realms ? 1 : 0}>
                  {realmPaths.tones.map((d, tone) => d && <path key={tone} d={d} fill={TONES[tone]} fillOpacity={TONE_OPACITY[tone]} />)}
                  <path d={realmPaths.borders} fill="none" stroke="#5b4527" strokeWidth={sw(1.4)} strokeDasharray={`${sw(7)} ${sw(4)}`} strokeLinejoin="round" />
                </g>

                <g opacity={layers.terrain ? 1 : 0}>
                  <path d={terrain.forest} fill="#d9caa0" stroke="#4a3520" strokeWidth={sw(1.1)} strokeLinejoin="round" />
                  <path d={terrain.mountains} fill="#e6d8b3" stroke="#4a3520" strokeWidth={sw(1.5)} strokeLinejoin="round" strokeLinecap="round" />
                  <path d={terrain.lake} fill="#dccfa6" stroke="#4a3520" strokeWidth={sw(1.5)} />
                  {/* A river is two banks: a dark line with a parchment one down its middle. */}
                  <path d={terrain.river} fill="none" stroke="#4a3520" strokeWidth={sw(3.6)} strokeLinecap="round" strokeLinejoin="round" />
                  <path d={terrain.river} fill="none" stroke="#efe2c0" strokeWidth={sw(1.4)} strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {outline && (
                  <path
                    d={outline}
                    fill={outlineFilled ? "rgba(138, 31, 13, 0.10)" : "none"}
                    stroke="#8a1f0d"
                    strokeWidth={sw(2.6)}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {draftPath && (
                  <path
                    d={draftPath}
                    fill={tool === "draw-realm" ? "rgba(138, 31, 13, 0.08)" : "none"}
                    stroke="#8a1f0d"
                    strokeWidth={sw(2)}
                    strokeDasharray={`${sw(5)} ${sw(4)}`}
                    strokeLinejoin="round"
                  />
                )}
              </svg>

              <div className="atlas-layer" aria-hidden="true">
                {(chart.seas ?? []).map((sea) => (
                  <span
                    key={sea.name}
                    className={sea.size === "small" ? "atlas-name atlas-name--sea atlas-name--bay" : "atlas-name atlas-name--sea"}
                    style={{ ...spot(sea.x, sea.y), transform: centred(inv), opacity: tier <= 2 ? 1 : 0 }}
                  >
                    {sea.name}
                  </span>
                ))}
              </div>

              {chart.compass?.length === 2 && (
                <Compass style={{ ...spot(chart.compass[0], chart.compass[1]), transformOrigin: "0 0", transform: `scale(${inv})` }} />
              )}

              {layers.realms && (
                <div className="atlas-layer" aria-hidden="true">
                  {realms.map((realm) => {
                    const [x, y] = realmLabel(realm);
                    return (
                      <span
                        key={realm.id}
                        className="atlas-name atlas-name--realm"
                        style={{ ...spot(x, y), transform: centred(labelScale), fontSize: labelSize(realm) }}
                      >
                        {realm.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {layers.terrain && (
                <div className="atlas-layer" aria-hidden="true">
                  {features.map((feature) => {
                    const [x, y] = terrainLabel(feature);
                    return (
                      <span
                        key={feature.id}
                        className="atlas-name atlas-name--terrain"
                        style={{ ...spot(x, y), transform: centred(labelScale), opacity: tier === 1 || lit.feature?.id === feature.id ? 1 : 0 }}
                      >
                        {feature.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {dm && (
                <div className="atlas-layer">
                  {handles.map((handle) => (
                    <div key={handle.key} className="atlas-anchor" style={{ ...spot(handle.at[0], handle.at[1]), transform: `scale(${inv})` }}>
                      <button
                        type="button"
                        className={handle.className}
                        aria-label={handle.label}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          startDrag(event, handle.target, handle.at);
                        }}
                      />
                    </div>
                  ))}
                  {draft.map((point, index) => (
                    <span key={index} className="atlas-draft-dot" style={{ ...spot(point[0], point[1]), transform: centred(inv) }} />
                  ))}
                </div>
              )}

              {layers.places && (
                <div className="atlas-layer">
                  {places.map((place) => {
                    const kind = PLACE_KINDS[place.kind] ?? PLACE_KINDS.city;
                    const selected = picked.place?.id === place.id;
                    const on = selected || hoverPlace === place.id;
                    const realm = placeRealm(place, realms);
                    return (
                      // The counter-scale sits on a wrapper so the pin's own hover scale still applies.
                      <div key={place.id} className="atlas-anchor" style={{ ...spot(place.x, place.y), transform: `scale(${inv})` }}>
                        <span
                          className="atlas-name atlas-name--place"
                          style={{ opacity: place.kind === "capital" || tier <= 2 || on ? 1 : 0 }}
                          aria-hidden="true"
                        >
                          {place.name}
                          {!place.published && <span className="atlas-name__draft">Draft</span>}
                        </span>
                        <button
                          type="button"
                          className="atlas-disc atlas-pin"
                          data-kind={place.kind}
                          data-on={on ? "" : undefined}
                          aria-pressed={selected}
                          aria-label={`${place.name}, ${kind.label.toLowerCase()}${realm ? ` in ${realm}` : ""}. Draws its card.`}
                          style={{
                            width: kind.size,
                            height: kind.size,
                            margin: `${-kind.size / 2}px 0 0 ${-kind.size / 2}px`,
                            fontSize: kind.glyphSize,
                            cursor: dm && tool === "select" ? "move" : undefined,
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect({ type: "place", id: place.id });
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            if (dm && tool === "select") startDrag(event, { type: "place", id: place.id }, [place.x, place.y]);
                          }}
                          onMouseEnter={() => !drag.current && setHoverPlace(place.id)}
                          onMouseLeave={() => setHoverPlace(null)}
                          onFocus={() => !drag.current && setHoverPlace(place.id)}
                          onBlur={() => setHoverPlace(null)}
                        >
                          {kind.glyph}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!drawn && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="panel max-w-lg p-8 text-center">
                <p className="font-heading text-xl font-bold text-[#f4e6c3]">{chart.name} is still face down.</p>
                <p className="mt-2 text-[#c9b78f]">The Dungeon Master will turn this chart over when it’s ready to be played.</p>
              </div>
            </div>
          )}

          {drawn && caption && (
            <div className="panel pointer-events-none absolute left-4 top-4 max-w-[min(22rem,calc(100%-6rem))] px-4 py-3">
              <p className="atlas-kicker">{caption.kicker}</p>
              <p className="font-heading mt-0.5 text-xl font-bold text-[#f4e6c3]">{caption.name}</p>
              <p className="mt-0.5 text-sm leading-snug text-[#e9dbb8]">{caption.note}</p>
            </div>
          )}

          {drawn && (
            <div role="group" aria-label="Zoom" className="atlas-zoom" onPointerDown={(event) => event.stopPropagation()}>
              <button type="button" className="btn btn-ghost tl-zoom" aria-label="Zoom in" onClick={() => zoomBy(ZOOM_STEP)}>
                +
              </button>
              <button type="button" className="btn btn-ghost tl-zoom" aria-label="Zoom out" onClick={() => zoomBy(1 / ZOOM_STEP)}>
                −
              </button>
              <button type="button" className="btn btn-ghost tl-zoom" aria-label="Whole chart" title="Whole chart" onClick={() => setMoved(null)}>
                ⌂
              </button>
              <span className="font-card text-center text-[11px] font-semibold text-[#c9b78f]">{Math.round(z * 100)}%</span>
            </div>
          )}
        </div>

        {/* The card sits outside the frame, so the frame's edge can't clip it. */}
        {showPopover && cardPlace && cardAt && (
          <div
            className="panel pointer-events-none absolute z-[5] flex w-[240px] flex-col gap-2.5 p-3"
            style={{
              left: `calc(${cardAt[0].toFixed(2)}% ${cardAt[0] < 58 ? "+" : "-"} 18px)`,
              top: `calc(${cardAt[1].toFixed(2)}% ${cardAt[1] < 50 ? "-" : "+"} 24px)`,
              transform: `translate(${cardAt[0] < 58 ? "0" : "-100%"}, ${cardAt[1] < 50 ? "0" : "-100%"})`,
            }}
          >
            <PlaceCard place={cardPlace} realm={cardRealm} width={216} />
          </div>
        )}
      </div>

      {cardBelow && drawn && cardPlace && (
        <div className="panel flex flex-col items-center gap-3 p-4">
          <PlaceCard place={cardPlace} realm={cardRealm} width={232} />
        </div>
      )}
      {cardBelow && drawn && !cardPlace && (
        <div className="panel p-6 text-center">
          <p className="font-heading text-lg font-bold text-[#f4e6c3]">No card drawn.</p>
          <p className="mt-1.5 text-[#c9b78f]">Select a place on the chart to draw its card. Pinch or use the buttons to zoom.</p>
        </div>
      )}
    </div>
  );
}
