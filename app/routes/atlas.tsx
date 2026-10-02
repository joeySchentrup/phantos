import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/atlas";
import {
  deleteFeature,
  deletePlace,
  deleteRealm,
  errorMessage,
  listAllLoreForDm,
  listCharts,
  listFeatures,
  listPlaces,
  listRealms,
  saveFeature,
  savePlace,
  saveRealm,
} from "../backend/api";
import AtlasChart from "../components/AtlasChart";
import AtlasDesk from "../components/AtlasDesk";
import AtlasKey from "../components/AtlasKey";
import {
  DRAFT_TOOLS,
  NEW_FOREST_SPREAD,
  PLACE_KINDS,
  TONES,
  TOOLS,
  hitRealm,
  placeRealm,
  type AtlasEdit,
  type AtlasLayers,
  type AtlasSelection,
  type AtlasTool,
} from "../lib/atlas";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { Chart, ChartPoint, Feature, Place, Realm } from "../types/atlas";
import type { LoreSummary } from "../types/lore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Atlas — Phantos" },
    { name: "description", content: "Charts of the known world: every realm, range, river and city the archive knows." },
  ];
}

/** What stands on one chart. */
interface ChartContents {
  chartId: string;
  places: Place[];
  realms: Realm[];
  features: Feature[];
}

const LAYERS: { id: keyof AtlasLayers; label: string }[] = [
  { id: "realms", label: "Realms" },
  { id: "terrain", label: "Terrain" },
  { id: "places", label: "Places" },
];

const SAVE_FAILED: Record<AtlasEdit["type"], string> = {
  place: "The place could not be saved.",
  realm: "The realm could not be saved.",
  feature: "The terrain could not be saved.",
};

function DraftTag() {
  return (
    <span className="rounded-sm border border-[#d9541e]/60 bg-[#7d150c]/50 px-1.5 py-px text-[0.58rem] tracking-[0.12em] text-[#ffcfb8]">
      Draft
    </span>
  );
}

/** Puts an edited record in the place of the one it replaces, or adds it if it is new. */
function withEdit(contents: ChartContents, edit: AtlasEdit): ChartContents {
  const put = <T extends { id: string }>(list: T[], record: T) =>
    list.some((item) => item.id === record.id) ? list.map((item) => (item.id === record.id ? record : item)) : [...list, record];

  if (edit.type === "place") return { ...contents, places: put(contents.places, edit.record) };
  if (edit.type === "realm") return { ...contents, realms: put(contents.realms, edit.record) };
  return { ...contents, features: put(contents.features, edit.record) };
}

export default function Atlas() {
  const isDm = useDungeonMaster();
  const [params, setParams] = useSearchParams();
  const [charts, setCharts] = useState<Chart[] | null>(null);
  const [contents, setContents] = useState<ChartContents | null>(null);
  const [lore, setLore] = useState<LoreSummary[]>([]);
  const [error, setError] = useState("");

  const [layers, setLayers] = useState<AtlasLayers>({ realms: true, terrain: true, places: true });
  const [selection, setSelection] = useState<AtlasSelection | null>(null);
  const [tool, setTool] = useState<AtlasTool>("select");
  const [draft, setDraft] = useState<ChartPoint[]>([]);
  const [toolError, setToolError] = useState("");

  // Beside the key on wide screens; stacked, square and zoomed in closer below that.
  const wide = useMediaQuery("(min-width: 1024px)", true);
  const chartRow = useRef<HTMLDivElement>(null);

  // /atlas?chart=hurly opens that chart; with no name, or an unknown one, the first.
  const chart = charts?.find((c) => c.slug === params.get("chart")) ?? charts?.[0] ?? null;
  const chartId = chart?.id ?? "";
  const drawn = !!chart?.land?.length;
  const here = contents?.chartId === chartId ? contents : null;

  // Drafts appear for the DM, so reload when they sign in or out.
  useEffect(() => {
    let stale = false;
    listCharts()
      .then((all) => {
        if (stale) return;
        setCharts(all);
        setError("");
      })
      .catch(() => !stale && setError("The chart could not be reached. Please try again in a moment."));

    if (isDm) {
      listAllLoreForDm()
        .then((all) => !stale && setLore([...all].sort((a, b) => a.title.localeCompare(b.title))))
        .catch(() => !stale && setLore([]));
    } else {
      setLore([]);
      setTool("select");
      setDraft([]);
    }
    return () => {
      stale = true;
    };
  }, [isDm]);

  const load = useCallback(async () => {
    if (!chartId) return;
    const [places, realms, features] = await Promise.all([listPlaces(chartId), listRealms(chartId), listFeatures(chartId)]);
    setContents({ chartId, places, realms, features });
  }, [chartId]);

  useEffect(() => {
    setSelection(null);
    setDraft([]);
    setTool("select");
    setToolError("");
    load()
      .then(() => setError(""))
      .catch(() => setError("The chart could not be reached. Please try again in a moment."));
  }, [load, isDm]);

  // The DM desk links to /atlas#desk, but the desk only exists once the chart
  // has loaded, so the browser's own jump to the anchor comes too early.
  const deskReady = isDm && !!here && drawn;
  useEffect(() => {
    if (deskReady && window.location.hash === "#desk") document.getElementById("desk")?.scrollIntoView();
  }, [deskReady]);

  // ---- The Dungeon Master's changes -----------------------------------------

  // Saves go one at a time, in the order they were made, so a quick second
  // drag can't reach the server before the first.
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const inTurn = <T,>(work: () => Promise<T>): Promise<T> => {
    const result = saving.current.then(work);
    saving.current = result.catch(() => {});
    return result;
  };

  const persist = (edit: AtlasEdit): Promise<AtlasEdit> =>
    inTurn(async () => {
      const id = edit.record.id || undefined;
      if (edit.type === "place") return { type: "place", record: await savePlace(edit.record, id) };
      if (edit.type === "realm") return { type: "realm", record: await saveRealm(edit.record, id) };
      return { type: "feature", record: await saveFeature(edit.record, id) };
    });

  const apply = (edit: AtlasEdit) => setContents((last) => last && withEdit(last, edit));

  /** A drag has ended: the chart already shows the move, so only the save is left. */
  const commit = (edit: AtlasEdit) => {
    setToolError("");
    persist(edit).catch((err) => {
      setToolError(errorMessage(err, SAVE_FAILED[edit.type]));
      // Show what the server still holds.
      load().catch(() => {});
    });
  };

  /** A tool has made something new: save it, draw it, and open it in the desk. */
  const create = async (edit: AtlasEdit) => {
    setTool("select");
    setDraft([]);
    setToolError("");
    try {
      const saved = await persist(edit);
      apply(saved);
      setSelection({ type: saved.type, id: saved.record.id });
    } catch (err) {
      setToolError(errorMessage(err, SAVE_FAILED[edit.type]));
    }
  };

  const onPlaceAt = (x: number, y: number) => {
    if (tool === "add-place") {
      const realm = hitRealm(x, y, here?.realms ?? [])?.name ?? "";
      create({ type: "place", record: { id: "", chart: chartId, name: "New place", kind: "city", x, y, realm, lore: "", published: false } });
    } else if (tool === "draw-forest") {
      create({
        type: "feature",
        record: { id: "", chart: chartId, name: "New forest", kind: "forest", points: [[x, y]], spread: NEW_FOREST_SPREAD, published: false },
      });
    }
  };

  const finishDraft = () => {
    if (!here || draft.length < (DRAFT_TOOLS[tool]?.needs ?? Infinity)) return;
    if (tool === "draw-realm") {
      create({
        type: "realm",
        // The next tint in turn; its name is written in the middle of its corners.
        record: { id: "", chart: chartId, name: "New realm", standing: "", tone: here.realms.length % TONES.length, label: null, points: draft, lore: "", published: false },
      });
    } else {
      const river = tool === "draw-river";
      create({
        type: "feature",
        record: { id: "", chart: chartId, name: river ? "New river" : "New range", kind: river ? "river" : "mountains", points: draft, spread: 0, published: false },
      });
    }
  };

  const pickTool = (next: AtlasTool) => {
    setTool(next);
    setDraft([]);
    setToolError("");
    if (next !== "select") setSelection(null);
  };

  const onSave = async (edit: AtlasEdit) => apply(await persist(edit));

  const onDelete = async (target: AtlasSelection) => {
    await inTurn(() => (target.type === "place" ? deletePlace(target.id) : target.type === "realm" ? deleteRealm(target.id) : deleteFeature(target.id)));
    setContents(
      (last) =>
        last && {
          ...last,
          places: last.places.filter((p) => target.type !== "place" || p.id !== target.id),
          realms: last.realms.filter((r) => target.type !== "realm" || r.id !== target.id),
          features: last.features.filter((f) => target.type !== "feature" || f.id !== target.id),
        }
    );
    setSelection(null);
  };

  /** Selecting from a list shows the thing on the chart, which may have scrolled away. */
  const selectFromList = (target: AtlasSelection) => {
    setSelection(target);
    chartRow.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  // ---- The page -------------------------------------------------------------

  const drafting = DRAFT_TOOLS[tool];
  const toolHint = TOOLS.find((t) => t.id === tool)?.hint ?? "";
  // "A political chart · c. 307 AC" dates the survey the realms are drawn from.
  const surveyed = chart?.dateline.includes(" · ") ? chart.dateline.split(" · ").pop() : "";

  return (
    <main className="mx-auto max-w-[100rem] px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">Charts of the Known World</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Atlas</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Every realm, range, river and city the archive knows, drawn on one chart. Select a place to draw its card, or
          a realm to read its standing. Drag to pan; the buttons zoom.
        </p>
      </div>

      {error && !charts ? (
        <p className="panel mx-auto mt-8 max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
      ) : !charts ? (
        <div className="skeleton mt-8 aspect-square rounded-xl lg:aspect-auto lg:h-[30rem]" />
      ) : !chart ? (
        <div className="panel mx-auto mt-8 max-w-lg p-8 text-center">
          <p className="font-heading text-xl font-bold text-[#f4e6c3]">The Atlas is still face down.</p>
          <p className="mt-2 text-[#c9b78f]">The Dungeon Master will turn this chart over when it’s ready to be played.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div role="group" aria-label="Charts" className="flex flex-wrap gap-2">
              {charts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="atlas-chip"
                  aria-pressed={c.id === chart.id}
                  onClick={() => setParams(c.id === charts[0].id ? {} : { chart: c.slug }, { preventScrollReset: true })}
                >
                  {c.name}
                  {!c.published && <DraftTag />}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Layers" className="flex flex-wrap items-center gap-2">
              <span className="atlas-kicker mr-1">Show</span>
              {LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className="atlas-chip"
                  aria-pressed={layers[layer.id]}
                  onClick={() => setLayers((last) => ({ ...last, [layer.id]: !last[layer.id] }))}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>

          {deskReady && (
            <div className="panel mt-6 flex flex-wrap items-center gap-2.5 px-4 py-3">
              <span className="eyebrow mr-1.5">Dungeon Master</span>
              {TOOLS.map((t) => (
                <button key={t.id} type="button" className="atlas-chip" aria-pressed={tool === t.id} onClick={() => pickTool(t.id)}>
                  {t.label}
                </button>
              ))}
              {drafting && (
                <>
                  <button
                    type="button"
                    className="btn btn-gold !px-3 !py-1.5 !text-[0.7rem]"
                    onClick={finishDraft}
                    disabled={draft.length < drafting.needs}
                  >
                    Finish the {drafting.noun}
                  </button>
                  <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" onClick={() => pickTool("select")}>
                    Cancel
                  </button>
                </>
              )}
              <span className="ml-auto text-sm leading-snug text-[#c9b78f]">
                {drafting && draft.length > 0 && `${draft.length} ${draft.length === 1 ? "point" : "points"} placed. `}
                {toolHint}
              </span>
              {toolError && (
                <p role="alert" className="w-full text-sm text-[#ffb3a1]">
                  {toolError}
                </p>
              )}
            </div>
          )}

          <div ref={chartRow} className="mt-6 flex scroll-mt-6 flex-col gap-6 lg:flex-row lg:items-stretch">
            <AtlasKey chart={chart} className="order-2 lg:order-none lg:w-[232px] lg:flex-none" />
            {error && !here ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="panel max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
              </div>
            ) : !here ? (
              <div className="skeleton aspect-square flex-1 rounded-xl lg:aspect-auto lg:min-h-[26rem]" />
            ) : (
              <AtlasChart
                // A new chart opens on its own opening view.
                key={chart.id}
                className="flex-1"
                chart={chart}
                places={here.places}
                realms={here.realms}
                features={here.features}
                mode={isDm ? "dm" : "reader"}
                tool={tool}
                selection={selection}
                layers={layers}
                draft={draft}
                initialZoom={wide ? 1.2 : 2}
                cardBelow={!wide}
                onSelect={setSelection}
                onChange={apply}
                onCommit={commit}
                onPlaceAt={onPlaceAt}
                onDraftPoint={(x, y) => setDraft((points) => [...points, [x, y]])}
              />
            )}
          </div>

          {here && drawn && !isDm && (
            <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
              <section aria-labelledby="chart-places-heading" className="panel min-w-0 p-5 sm:p-6">
                <h2 id="chart-places-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
                  Places on this chart
                  <span className="ml-2 font-serif text-sm font-normal text-[#c9b78f]">{here.places.length} · each draws a card</span>
                </h2>
                <ul className="mt-3">
                  {here.places.map((place) => {
                    const card = place.expand?.lore;
                    const realm = placeRealm(place, here.realms);
                    return (
                      <li key={place.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-[#f2c14e]/10 py-2.5">
                        <span className="w-[18px] flex-none text-center text-[#e9dbb8]" aria-hidden="true">
                          {PLACE_KINDS[place.kind]?.glyph}
                        </span>
                        <button type="button" className="atlas-row basis-40" onClick={() => selectFromList({ type: "place", id: place.id })}>
                          {place.name}{" "}
                          <span className="text-xs text-[#c9b78f]">· {[PLACE_KINDS[place.kind]?.label, realm].filter(Boolean).join(", ")}</span>
                        </button>
                        {card ? (
                          <Link
                            to={`/lore/${card.slug}`}
                            className="text-[0.82rem] text-[#f2c14e] underline decoration-[#f2c14e]/50 underline-offset-2 hover:text-[#fff2b0]"
                          >
                            {card.title} →
                          </Link>
                        ) : (
                          <span className="text-[0.82rem] text-[#c9b78f]">No card yet</span>
                        )}
                      </li>
                    );
                  })}
                  {!here.places.length && <li className="py-6 text-center text-[#c9b78f]">No places yet.</li>}
                </ul>
              </section>

              <section aria-labelledby="chart-realms-heading" className="panel min-w-0 p-5 sm:p-6">
                <h2 id="chart-realms-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
                  Realms of {chart.name}
                  <span className="ml-2 font-serif text-sm font-normal text-[#c9b78f]">
                    {here.realms.length}
                    {surveyed && ` · as of ${surveyed}`}
                  </span>
                </h2>
                <ul className="mt-3 gap-x-6 sm:columns-2">
                  {here.realms.map((realm) => (
                    <li key={realm.id} className="flex break-inside-avoid items-center gap-2.5 border-b border-[#f2c14e]/10 py-[7px]">
                      <span className="atlas-swatch" data-tone={realm.tone} />
                      <button type="button" className="atlas-row" onClick={() => selectFromList({ type: "realm", id: realm.id })}>
                        <span className="font-card font-semibold">{realm.name}</span>
                        <span className="block text-[0.78rem] leading-[1.3] text-[#c9b78f]">{realm.standing || "No standing recorded"}</span>
                      </button>
                    </li>
                  ))}
                  {!here.realms.length && <li className="py-6 text-center text-[#c9b78f]">No realms yet.</li>}
                </ul>
              </section>
            </div>
          )}

          {deskReady && here && (
            <section id="desk" aria-labelledby="desk-heading" className="mt-14 scroll-mt-6">
              <div className="border-b border-[#f2c14e]/20 pb-4">
                <p className="eyebrow">Dungeon Master</p>
                <h2 id="desk-heading" className="font-heading mt-1 text-3xl font-bold text-[#f4e6c3]">
                  Keep the Atlas
                </h2>
                <p className="mt-1 text-sm text-[#c9b78f]">
                  Places carry a lore card. Realms are the political chart; terrain is the land itself. Select anything
                  on the chart to edit it here, and drag its handles to move it.
                </p>
              </div>

              <div className="mt-8">
                <AtlasDesk
                  places={here.places}
                  realms={here.realms}
                  features={here.features}
                  lore={lore}
                  selection={selection}
                  onSelect={setSelection}
                  onSave={onSave}
                  onDelete={onDelete}
                />
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
