import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import {
  axisToYear,
  formatEraRange,
  formatYear,
  minorStep,
  packEras,
  packLanes,
  tickStep,
  tickYears,
  timelineExtent,
  yearToAxis,
} from "~/lib/chronicle";
import { CATEGORIES } from "~/lib/lore";
import type { Era, TimelinePoint } from "~/types/chronicle";
import type { LoreSummary } from "~/types/lore";
import LoreCard from "./LoreCard";

/** Pixel sizes of the timeline's rows. Labels and badges in app.css match these. */
const LANE = 30;
const LABEL_HEIGHT = 24;
const ERA_ROW = 26;
const AXIS_BAND = 46;
const RULER = 30;

/** Pixels per year at full zoom: a single year is this wide. */
const MAX_SCALE = 160;
/** Stands in for a label's width until it has been measured. */
const FALLBACK_WIDTH = 170;
const ERA_TONES = 6;
/** Empty pixels kept before the first year at full zoom-out. */
const LEAD = 28;
const CARD_WIDTH = 232;
const CARD_RATIO = 86 / 59;

/** `offset` is the axis position at the left edge; `scale` is pixels per year. */
interface View {
  scale: number;
  offset: number;
}

type Tip =
  | { kind: "lore"; lore: LoreSummary; rect: DOMRect }
  | { kind: "point"; point: TimelinePoint; rect: DOMRect }
  | { kind: "era"; era: Era; rect: DOMRect };

interface OpenCluster {
  kind: "lore" | "point";
  ids: string[];
  rect: DOMRect;
}

interface TimelineProps {
  lore: LoreSummary[];
  points: TimelinePoint[];
  eras: Era[];
  /** A year to open on instead of the whole of history. */
  focusYear?: number;
  /** Dungeon Masters: called when a point is picked for editing. */
  onEditPoint?: (point: TimelinePoint) => void;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Where a popover goes: whichever side of its anchor has more room. */
function placeBeside(rect: DOMRect, width: number) {
  const margin = 8;
  // The client size, not the window's: a scrollbar would hide the far edge.
  const { clientWidth, clientHeight } = document.documentElement;
  const roomAbove = rect.top - margin * 2;
  const roomBelow = clientHeight - rect.bottom - margin * 2;
  const above = roomAbove > roomBelow;
  const left = Math.max(margin, Math.min(rect.left, clientWidth - width - margin));
  return {
    room: Math.max(above ? roomAbove : roomBelow, 0),
    style: above ? { left, bottom: clientHeight - rect.top + margin } : { left, top: rect.bottom + margin },
  };
}

function TipLayer({ tip }: { tip: Tip }) {
  if (tip.kind === "lore") {
    // The card shrinks to fit when there is little room above or below.
    const heading = 30;
    const beside = placeBeside(tip.rect, CARD_WIDTH);
    const width = Math.max(120, Math.min(CARD_WIDTH, (beside.room - heading) / CARD_RATIO));
    const { style } = placeBeside(tip.rect, width);
    return (
      <div className="tl-tip" style={{ ...style, width }} role="presentation">
        <p className="tl-tip__date">{formatYear(tip.lore.year, tip.lore.circa)}</p>
        <LoreCard lore={tip.lore} imageSizes={`${CARD_WIDTH}px`} />
      </div>
    );
  }

  const width = Math.min(320, document.documentElement.clientWidth - 16);
  const { style } = placeBeside(tip.rect, width);
  return (
    <div className="tl-tip tl-tip--note" style={{ ...style, width }} role="presentation">
      {tip.kind === "point" ? (
        <>
          <p className="tl-tip__date">{formatYear(tip.point.year, tip.point.circa)}</p>
          <p>{tip.point.text}</p>
        </>
      ) : (
        <>
          <p className="tl-tip__date">{formatEraRange(tip.era)}</p>
          <p className="font-heading font-bold text-[#f4e6c3]">{tip.era.name}</p>
          {tip.era.description && <p className="mt-1">{tip.era.description}</p>}
        </>
      )}
    </div>
  );
}

export default function Timeline({ lore, points, eras, focusYear, onEditPoint }: TimelineProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const animation = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startX: number; startOffset: number; pinch: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const [openCluster, setOpenCluster] = useState<OpenCluster | null>(null);
  const [zoomHint, setZoomHint] = useState(false);

  const viewRef = useRef(view);
  viewRef.current = view;

  const extent = useMemo(
    () => timelineExtent([...lore, ...points].map((item) => item.year), eras),
    [lore, points, eras]
  );

  // -------------------------------------------------------------------------
  // The view: how far in, and where
  // -------------------------------------------------------------------------

  // Labels run right from their year, so the last year stops short of the
  // right edge to leave them room.
  const tail = Math.min(260, size.width * 0.4);
  const minScale = size.width ? (size.width - LEAD - tail) / (extent.max - extent.min) : 0;
  const maxScale = Math.max(MAX_SCALE, minScale);

  const clamp = useCallback(
    (next: View): View => {
      const scale = Math.min(Math.max(next.scale, minScale), maxScale);
      const first = extent.min - LEAD / scale;
      const last = Math.max(extent.max - (size.width - tail) / scale, first);
      return { scale, offset: Math.min(Math.max(next.offset, first), last) };
    },
    [extent, size.width, tail, minScale, maxScale]
  );

  /** Moves to a new view, gliding there unless the visitor prefers no motion. */
  const go = useCallback(
    (target: View, animate = true) => {
      cancelAnimationFrame(animation.current);
      const to = clamp(target);
      const from = viewRef.current;
      if (!from || !animate || prefersReducedMotion()) {
        setView(to);
        return;
      }

      const fromSpan = size.width / from.scale;
      const toSpan = size.width / to.scale;
      // Zooming keeps one spot of the screen still. When the two windows share
      // such a spot, zoom around it; otherwise slide from one to the other.
      const still = (from.offset - to.offset) / (toSpan - fromSpan);
      const pivot = Number.isFinite(still) && still >= 0 && still <= 1 ? from.offset + still * fromSpan : null;

      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - started) / 420, 1);
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const span = Math.exp(Math.log(fromSpan) + (Math.log(toSpan) - Math.log(fromSpan)) * eased);
        const offset = pivot === null ? from.offset + (to.offset - from.offset) * eased : pivot - still * span;
        setView(t === 1 ? to : { scale: size.width / span, offset });
        if (t < 1) animation.current = requestAnimationFrame(step);
      };
      animation.current = requestAnimationFrame(step);
    },
    [clamp, size.width]
  );

  useEffect(() => () => cancelAnimationFrame(animation.current), []);

  // Clamping pulls the offset back to where all of time just fits.
  const fitAll = useCallback(() => go({ scale: minScale, offset: -Infinity }), [go, minScale]);

  /** Zooms by `factor`, keeping the year under `x` (pixels from the left) where it is. */
  const zoomAt = useCallback(
    (x: number, factor: number, animate = false) => {
      const current = viewRef.current;
      if (!current) return;
      const scale = Math.min(Math.max(current.scale * factor, minScale), maxScale);
      const year = current.offset + x / current.scale;
      go({ scale, offset: year - x / scale }, animate);
    },
    [go, minScale, maxScale]
  );

  /** Frames a stretch of the axis, leaving room on the right for labels to run. */
  const zoomToRange = useCallback(
    (from: number, to: number, fill: number) => {
      const lead = (1 - fill) / 3;
      const scale = Math.min((size.width * fill) / Math.max(to - from, 1 / MAX_SCALE), maxScale);
      go({ scale, offset: from - (size.width * lead) / scale });
    },
    [go, size.width, maxScale]
  );

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    // A box that is momentarily hidden measures as nothing; keep the last real size.
    const measure = () => el.clientWidth && setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Open on the whole of history, or on the year asked for; afterwards only
  // keep the view inside the timeline as the window or the data changes.
  useLayoutEffect(() => {
    if (!size.width) return;
    const current = viewRef.current;
    if (current) {
      const kept = clamp(current);
      if (kept.scale !== current.scale || kept.offset !== current.offset) setView(kept);
      return;
    }
    if (focusYear) {
      const scale = Math.min(Math.max(size.width / 60, minScale), maxScale);
      setView(clamp({ scale, offset: yearToAxis(focusYear) - (size.width * 0.35) / scale }));
    } else {
      setView(clamp({ scale: minScale, offset: -Infinity }));
    }
  }, [size.width, clamp, focusYear, minScale, maxScale]);

  // -------------------------------------------------------------------------
  // Label widths, measured from the labels themselves
  // -------------------------------------------------------------------------

  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => !cancelled && setFontsLoaded(1));
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const measured: Record<string, number> = {};
    let changed = false;
    labels.current.forEach((el, id) => {
      measured[id] = el.offsetWidth;
      if (measured[id] !== widths[id]) changed = true;
    });
    if (changed || Object.keys(measured).length !== Object.keys(widths).length) setWidths(measured);
    // Widths depend only on the text and the font, never on the view.
  }, [lore, points, fontsLoaded, size.width]);

  const labelRef = (id: string) => (el: HTMLElement | null) => {
    if (el) labels.current.set(id, el);
    else labels.current.delete(id);
  };

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  const scale = view?.scale ?? 0;
  const offset = view?.offset ?? 0;

  const eraBands = useMemo(() => packEras(eras, extent), [eras, extent]);
  const eraRows = eraBands.reduce((rows, band) => Math.max(rows, band.row + 1), 0);
  const erasHeight = eraRows ? eraRows * ERA_ROW + 8 : 0;

  // Lore takes the larger share above the axis; points sit below it.
  const laneRoom = Math.max(size.height - erasHeight - AXIS_BAND - RULER, 0);
  const totalLanes = Math.floor(laneRoom / LANE);
  const pointLanes = !points.length ? 0 : !lore.length ? totalLanes : Math.max(1, Math.floor(totalLanes * 0.42));
  const loreLanes = !lore.length ? 0 : Math.max(1, totalLanes - pointLanes);
  const axisY = erasHeight + loreLanes * LANE + AXIS_BAND / 2;

  const loreLayout = useMemo(
    () =>
      packLanes(
        lore.map((item) => ({ id: item.id, x: yearToAxis(item.year) * scale, width: widths[item.id] ?? FALLBACK_WIDTH })),
        loreLanes
      ),
    [lore, scale, widths, loreLanes]
  );
  const pointLayout = useMemo(
    () =>
      packLanes(
        points.map((item) => ({ id: item.id, x: yearToAxis(item.year) * scale, width: widths[item.id] ?? FALLBACK_WIDTH })),
        pointLanes
      ),
    [points, scale, widths, pointLanes]
  );

  const screenX = (year: number) => Math.round((yearToAxis(year) - offset) * scale);
  const onScreen = (x: number) => x > -FALLBACK_WIDTH * 2 && x < size.width + 40;

  const step = tickStep(scale);
  const minor = minorStep(step);
  const lastAxis = offset + (scale ? size.width / scale : 0);
  // The ruler stops at the last dated year: nothing is marked in the future.
  const lastTick = Math.min(lastAxis + step, extent.max);
  const majorYears = scale ? tickYears(offset - step, lastTick, step) : [];
  const minorYears = scale && minor ? tickYears(offset - step, lastTick, minor).filter((y) => !majorYears.includes(y)) : [];

  // -------------------------------------------------------------------------
  // Popovers
  // -------------------------------------------------------------------------

  const dismiss = useCallback(() => {
    setTip(null);
    setOpenCluster(null);
  }, []);

  useEffect(() => {
    if (!tip && !openCluster) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && dismiss();
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target as Element).closest?.(".tl-cluster-list, .tl-cluster")) setOpenCluster(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("resize", dismiss);
    };
  }, [tip, openCluster, dismiss]);

  /** Hover and focus handlers that raise a tip beside whatever they're attached to. */
  const tipHandlers = (make: (rect: DOMRect) => Tip) => ({
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && !gesture.current) setTip(make(event.currentTarget.getBoundingClientRect()));
    },
    onPointerLeave: () => setTip(null),
    onBlur: () => setTip(null),
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      const el = event.currentTarget;
      const current = viewRef.current;
      const box = viewport.current?.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      // Tabbing to a label that is off to one side brings it into view first.
      if (current && box && (rect.left < box.left + 8 || rect.left > box.right - 80)) {
        const x = rect.left - box.left;
        go({ scale: current.scale, offset: current.offset + (x - size.width * 0.3) / current.scale }, false);
        requestAnimationFrame(() => document.activeElement === el && setTip(make(el.getBoundingClientRect())));
        return;
      }
      setTip(make(rect));
    },
  });

  const onClusterClick = (kind: "lore" | "point", ids: string[], rect: DOMRect) => {
    setTip(null);
    const source: { id: string; year: number }[] = kind === "lore" ? lore : points;
    const axes = source.filter((item) => ids.includes(item.id)).map((item) => yearToAxis(item.year));
    const from = Math.min(...axes);
    const to = Math.max(...axes);
    // A cluster that spans years opens by zooming in. One that sits on a
    // single year never will, so it opens as a list instead.
    if (to > from && scale < maxScale * 0.98) {
      setOpenCluster(null);
      zoomToRange(from, to, 0.45);
    } else {
      setOpenCluster((open) => (open && open.ids.join() === ids.join() ? null : { kind, ids, rect }));
    }
  };

  // -------------------------------------------------------------------------
  // Dragging, pinching, scrolling and keys
  // -------------------------------------------------------------------------

  const pinchSpread = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const current = viewRef.current;
    if (!current) return;
    cancelAnimationFrame(animation.current);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.current = { startX: event.clientX, startOffset: current.offset, pinch: pinchSpread(), moved: false };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    const current = viewRef.current;
    if (!active || !current || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && active.pinch) {
      const spread = pinchSpread();
      const [a, b] = [...pointers.current.values()];
      const middle = (a.x + b.x) / 2 - event.currentTarget.getBoundingClientRect().left;
      if (spread > 0) zoomAt(middle, spread / active.pinch);
      active.pinch = spread || active.pinch;
      active.moved = true;
      return;
    }

    const dx = event.clientX - active.startX;
    if (!active.moved && Math.abs(dx) < 4) return;
    if (!active.moved) {
      active.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      dismiss();
    }
    setView(clamp({ scale: current.scale, offset: active.startOffset - dx / current.scale }));
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    const active = gesture.current;
    if (active?.moved) {
      // The click that ends a drag shouldn't follow the link under the pointer.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    const remaining = [...pointers.current.values()][0];
    if (remaining && viewRef.current && active) {
      gesture.current = { startX: remaining.x, startOffset: viewRef.current.offset, pinch: 0, moved: active.moved };
    } else {
      gesture.current = null;
      setDragging(false);
    }
  };

  const onClickCapture = (event: React.MouseEvent) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // Wheel events have to be cancellable, which React's own listeners aren't.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const current = viewRef.current;
      if (!current) return;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        dismiss();
        const delta = Math.max(-60, Math.min(60, event.deltaY));
        zoomAt(event.clientX - el.getBoundingClientRect().left, Math.exp(-delta * 0.008));
      } else if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        event.preventDefault();
        dismiss();
        const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
        go({ scale: current.scale, offset: current.offset + dx / current.scale }, false);
      } else {
        // A plain scroll still scrolls the page; say how to zoom instead.
        setZoomHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setZoomHint(false), 1600);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(hintTimer.current);
    };
  }, [zoomAt, go, dismiss]);

  const zoomButton = (factor: number) => {
    dismiss();
    zoomAt(size.width / 2, factor, true);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const current = viewRef.current;
    if (!current || event.ctrlKey || event.metaKey || event.altKey) return;
    const pan = (direction: number) =>
      go({ scale: current.scale, offset: current.offset + (direction * size.width * 0.2) / current.scale });

    if (event.key === "ArrowLeft") pan(-1);
    else if (event.key === "ArrowRight") pan(1);
    else if (event.key === "+" || event.key === "=") zoomButton(1.6);
    else if (event.key === "-" || event.key === "_") zoomButton(1 / 1.6);
    else if (event.key === "0" || event.key === "Home") fitAll();
    else return;
    event.preventDefault();
    dismiss();
  };

  const onDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("a, button")) return;
    zoomAt(event.clientX - event.currentTarget.getBoundingClientRect().left, 2, true);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const ready = !!view && size.width > 0;
  const empty = !lore.length && !points.length && !eras.length;
  const zoomedOut = scale <= minScale * 1.001;
  const zoomedIn = scale >= maxScale * 0.999;
  const clusterItems = openCluster
    ? (openCluster.kind === "lore" ? lore : points).filter((item) => openCluster.ids.includes(item.id))
    : [];

  return (
    <div className="timeline">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#c9b78f]" aria-label="Legend">
          <li className="flex items-center gap-2">
            <span className="tl-legend-era" aria-hidden="true" /> Eras
          </li>
          <li className="flex items-center gap-2">
            <span className="frame-swatch" data-frame="tale" aria-hidden="true" /> Lore
          </li>
          <li className="flex items-center gap-2">
            <span className="tl-diamond" aria-hidden="true" /> Events
          </li>
        </ul>

        <div className="flex items-center gap-2">
          {ready && (
            <p className="mr-2 hidden text-sm text-[#c9b78f] sm:block" aria-live="off">
              {formatYear(axisToYear(Math.max(offset, extent.min)))} – {formatYear(axisToYear(Math.min(lastAxis, extent.max)))}
            </p>
          )}
          <button type="button" className="btn btn-ghost tl-zoom" onClick={() => zoomButton(1 / 1.6)} disabled={!ready || zoomedOut} aria-label="Zoom out">
            −
          </button>
          <button type="button" className="btn btn-ghost tl-zoom" onClick={() => zoomButton(1.6)} disabled={!ready || zoomedIn} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" onClick={() => { dismiss(); fitAll(); }} disabled={!ready || zoomedOut}>
            All of time
          </button>
        </div>
      </div>

      <div
        ref={viewport}
        className="tl-viewport mt-3"
        data-dragging={dragging || undefined}
        tabIndex={0}
        role="group"
        aria-label="Timeline. Arrow keys pan, plus and minus zoom, zero shows all of time."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        onScroll={(event) => {
          // Focusing a label far off to the right must not scroll the box.
          event.currentTarget.scrollLeft = 0;
          event.currentTarget.scrollTop = 0;
        }}
      >
        {ready && (
          <>
            {/* Graduations: a ruler along the bottom, with faint lines rising from it. */}
            {majorYears.map((year) => (
              <div key={`grid-${year}`} className="tl-grid" style={{ left: screenX(year), top: erasHeight, bottom: RULER }} />
            ))}
            <div className="tl-ruler" style={{ height: RULER }} aria-hidden="true">
              {minorYears.map((year) => (
                <span key={year} className="tl-tick tl-tick--minor" style={{ left: screenX(year) }} />
              ))}
              {majorYears.map((year) => (
                <span key={year} className="tl-tick" style={{ left: screenX(year) }}>
                  <span className="tl-tick__label">{formatYear(year)}</span>
                </span>
              ))}
            </div>

            {/* Eras: bands across the top, each closed off by a line down to the ruler. */}
            {eraBands.map((band, index) => {
              // An open end runs off the edge of the view: it has no line to stop at.
              const left = band.era.start_year ? (band.from - offset) * scale : -Infinity;
              const right = band.era.end_year ? (band.to - offset) * scale : Infinity;
              if (right < 0 || left > size.width) return null;
              const shownLeft = Math.max(left, -2);
              const shownWidth = Math.min(right, size.width + 12) - shownLeft;
              return (
                <div key={band.era.id} data-tone={index % ERA_TONES}>
                  {left >= 0 && (
                    <div className="tl-era-edge" style={{ left: Math.round(left), top: band.row * ERA_ROW + 4, bottom: RULER }} />
                  )}
                  {right <= size.width && (
                    <div className="tl-era-edge" style={{ left: Math.round(right), top: band.row * ERA_ROW + 4, bottom: RULER }} />
                  )}
                  <button
                    type="button"
                    className="tl-era"
                    style={{ left: shownLeft, width: shownWidth, top: band.row * ERA_ROW + 4, height: ERA_ROW - 4 }}
                    onClick={() => {
                      dismiss();
                      zoomToRange(band.from, band.to, 0.8);
                    }}
                    aria-label={`${band.era.name}, ${formatEraRange(band.era)}. Zoom to this era.`}
                    {...tipHandlers((rect) => ({ kind: "era", era: band.era, rect }))}
                  >
                    {shownWidth > 44 && <span className="tl-era__name">{band.era.name}</span>}
                  </button>
                </div>
              );
            })}

            <div className="tl-axis" style={{ top: axisY }} />

            {/* Lore: titles above the axis, each on a stem down to its year. */}
            {lore.map((item) => {
              const lane = loreLayout.lanes.get(item.id);
              const x = screenX(item.year);
              const top = axisY - AXIS_BAND / 2 - ((lane ?? 0) + 1) * LANE + (LANE - LABEL_HEIGHT) / 2;
              const shown = lane !== undefined;
              return (
                <div key={item.id} data-frame={item.category}>
                  {shown && onScreen(x) && (
                    <>
                      <span className="tl-stem" style={{ left: x, top: top + LABEL_HEIGHT, height: axisY - top - LABEL_HEIGHT }} />
                      <span className="tl-dot" style={{ left: x, top: axisY }} />
                    </>
                  )}
                  <Link
                    ref={labelRef(item.id)}
                    to={`/lore/${item.slug}`}
                    className="tl-label tl-label--lore"
                    data-draft={!item.published || undefined}
                    style={{ transform: `translate(${x}px, ${top}px)`, visibility: shown ? undefined : "hidden" }}
                    draggable={false}
                    aria-label={`${item.title}, ${formatYear(item.year, item.circa)}. ${CATEGORIES[item.category]?.label ?? "Lore"}.`}
                    {...tipHandlers((rect) => ({ kind: "lore", lore: item, rect }))}
                  >
                    <span className="tl-label__text">{item.title}</span>
                    {!item.published && <span className="tl-label__draft">Draft</span>}
                  </Link>
                </div>
              );
            })}

            {/* Points: short notes below the axis. */}
            {points.map((item) => {
              const lane = pointLayout.lanes.get(item.id);
              const x = screenX(item.year);
              const top = axisY + AXIS_BAND / 2 + (lane ?? 0) * LANE + (LANE - LABEL_HEIGHT) / 2;
              const shown = lane !== undefined;
              return (
                <div key={item.id}>
                  {shown && onScreen(x) && (
                    <>
                      <span className="tl-stem tl-stem--point" style={{ left: x, top: axisY, height: top - axisY }} />
                      <span className="tl-diamond tl-diamond--axis" style={{ left: x, top: axisY }} />
                    </>
                  )}
                  <button
                    ref={labelRef(item.id)}
                    type="button"
                    className="tl-label tl-label--point"
                    style={{ transform: `translate(${x}px, ${top}px)`, visibility: shown ? undefined : "hidden" }}
                    onClick={onEditPoint ? () => onEditPoint(item) : undefined}
                    aria-label={`${formatYear(item.year, item.circa)}: ${item.text}${onEditPoint ? " Edit this point." : ""}`}
                    {...tipHandlers((rect) => ({ kind: "point", point: item, rect }))}
                  >
                    <span className="tl-label__text">{item.text}</span>
                  </button>
                </div>
              );
            })}

            {/* What didn't fit, gathered on the axis until zooming makes room. */}
            {(["lore", "point"] as const).map((kind) =>
              (kind === "lore" ? loreLayout : pointLayout).clusters.map((cluster) => {
                const x = Math.round(cluster.x - offset * scale);
                if (!onScreen(x)) return null;
                const one = cluster.ids.length === 1;
                const what = kind === "lore" ? (one ? "lore entry" : "lore entries") : one ? "event" : "events";
                return (
                  <button
                    key={`${kind}-${cluster.ids[0]}`}
                    type="button"
                    // Spelled out in full so Tailwind keeps both rules.
                    className={kind === "lore" ? "tl-cluster tl-cluster--lore" : "tl-cluster tl-cluster--point"}
                    style={{ left: x, top: axisY }}
                    onClick={(event) => onClusterClick(kind, cluster.ids, event.currentTarget.getBoundingClientRect())}
                    aria-label={`${cluster.ids.length} more ${what} here`}
                  >
                    +{cluster.ids.length}
                  </button>
                );
              })
            )}
          </>
        )}

        {ready && empty && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-[#c9b78f]">
            Nothing has been dated yet.
          </p>
        )}

        <p className="tl-hint" data-shown={zoomHint || undefined} aria-hidden="true">
          Hold Ctrl (or ⌘) and scroll to zoom
        </p>
      </div>

      <p className="mt-3 text-sm text-[#c9b78f]">
        Drag to move through time. Pinch, or hold Ctrl (⌘) and scroll, to zoom. Select an era to step into it, or a
        “+” marker to open what is gathered there.
      </p>

      {tip && !dragging && createPortal(<TipLayer tip={tip} />, document.body)}

      {openCluster &&
        createPortal(
          (() => {
            const width = Math.min(320, document.documentElement.clientWidth - 16);
            const beside = placeBeside(openCluster.rect, width);
            return (
              <div
                className="tl-cluster-list"
                style={{ ...beside.style, width, maxHeight: Math.max(beside.room, 160) }}
                role="dialog"
                aria-label={openCluster.kind === "lore" ? "Lore gathered here" : "Events gathered here"}
              >
                <ul>
                  {clusterItems.map((item) =>
                    "slug" in item ? (
                      <li key={item.id}>
                        <Link to={`/lore/${item.slug}`} className="tl-cluster-list__row">
                          <span className="frame-swatch mt-1" data-frame={item.category} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="font-card block font-semibold leading-snug text-[#f4e6c3]">{item.title}</span>
                            <span className="block text-xs text-[#c9b78f]">
                              {formatYear(item.year, item.circa)} · {CATEGORIES[item.category]?.label}
                              {!item.published && " · Draft"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ) : (
                      <li key={item.id}>
                        {onEditPoint ? (
                          <button type="button" className="tl-cluster-list__row w-full text-left" onClick={() => { dismiss(); onEditPoint(item); }}>
                            <ClusterPoint point={item} />
                          </button>
                        ) : (
                          <div className="tl-cluster-list__row">
                            <ClusterPoint point={item} />
                          </div>
                        )}
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          })(),
          document.body
        )}
    </div>
  );
}

function ClusterPoint({ point }: { point: TimelinePoint }) {
  return (
    <>
      <span className="tl-diamond mt-1.5" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-[#c9b78f]">{formatYear(point.year, point.circa)}</span>
        <span className="block leading-snug text-[#e9dbb8]">{point.text}</span>
      </span>
    </>
  );
}
