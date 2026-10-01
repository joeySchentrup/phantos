import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/chronicle";
import { listAllLoreForDm, listDatedLore, listEras, listTimelinePoints } from "../backend/api";
import ChronicleDesk from "../components/ChronicleDesk";
import Timeline from "../components/Timeline";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { Era, TimelinePoint } from "../types/chronicle";
import type { LoreSummary } from "../types/lore";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chronicle — Phantos" },
    { name: "description", content: "A timeline of the ages of Phanatos, from the Erosian Wars to the Tri-War." },
  ];
}

interface ChronicleData {
  lore: LoreSummary[];
  points: TimelinePoint[];
  eras: Era[];
}

export default function Chronicle() {
  const isDm = useDungeonMaster();
  const [params] = useSearchParams();
  const [data, setData] = useState<ChronicleData | null>(null);
  const [undated, setUndated] = useState<LoreSummary[]>([]);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<TimelinePoint | null>(null);

  // /chronicle?at=-9500 opens on that year, e.g. from a lore entry's date.
  const at = Number(params.get("at"));
  const focusYear = Number.isInteger(at) && at !== 0 ? at : undefined;

  const load = useCallback(async () => {
    const [lore, points, eras] = await Promise.all([listDatedLore(), listTimelinePoints(), listEras()]);
    setData({ lore, points, eras });
  }, []);

  // Drafts appear for the DM, so reload when they sign in or out.
  useEffect(() => {
    load()
      .then(() => setError(""))
      .catch(() => setError("The chronicle could not be reached. Please try again in a moment."));

    if (!isDm) {
      setUndated([]);
      return;
    }
    listAllLoreForDm()
      .then((all) => setUndated(all.filter((entry) => !entry.year)))
      .catch(() => setUndated([]));
  }, [load, isDm]);

  // The DM desk links to /chronicle#desk, but the desk only exists once the
  // data has loaded, so the browser's own jump to the anchor comes too early.
  const deskReady = isDm && !!data;
  useEffect(() => {
    if (deskReady && window.location.hash === "#desk") document.getElementById("desk")?.scrollIntoView();
  }, [deskReady]);

  return (
    <main className="mx-auto max-w-[100rem] px-4 pb-10 sm:px-6">
      <div className="mx-auto mt-10 max-w-3xl text-center">
        <p className="eyebrow">The Ages of Phanatos</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Chronicle</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Every era, event and dated piece of lore, in order. Years are counted from the Treaty of Heraklion: BC before
          it, and AC, the Age of Concord, after.
        </p>
      </div>

      <div className="mt-8">
        {error && !data ? (
          <p className="panel mx-auto max-w-xl p-6 text-center text-[#c9b78f]">{error}</p>
        ) : !data ? (
          <div className="skeleton h-[clamp(25rem,68vh,42rem)] rounded-xl" />
        ) : (
          <Timeline
            lore={data.lore}
            points={data.points}
            eras={data.eras}
            focusYear={focusYear}
            // A new object each time, so picking the same point twice reopens it.
            onEditPoint={isDm ? (point) => setPicked({ ...point }) : undefined}
          />
        )}
      </div>

      {deskReady && (
        <section id="desk" aria-labelledby="desk-heading" className="mt-14 scroll-mt-6">
          <div className="border-b border-[#f2c14e]/20 pb-4">
            <p className="eyebrow">Dungeon Master</p>
            <h2 id="desk-heading" className="font-heading mt-1 text-3xl font-bold text-[#f4e6c3]">
              Keep the Chronicle
            </h2>
            <p className="mt-1 text-sm text-[#c9b78f]">
              Lore joins the timeline when it has an in-universe date, set in the lore editor. Select a point on the
              timeline to edit it here.
            </p>
          </div>

          <div className="mt-8">
            <ChronicleDesk eras={data.eras} points={data.points} picked={picked} onChanged={load} />
          </div>

          {undated.length > 0 && (
            <div className="panel mt-8 p-5 sm:p-6">
              <h3 className="font-heading text-xl font-bold text-[#f4e6c3]">
                Undated lore
                <span className="ml-2 text-sm font-normal text-[#c9b78f]">{undated.length} not on the timeline</span>
              </h3>
              <ul className="mt-3 divide-y divide-[#f2c14e]/10">
                {undated.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-2.5">
                    <span className="frame-swatch" data-frame={entry.category} />
                    <span className="min-w-0 flex-1 truncate text-[#f4e6c3]">{entry.title}</span>
                    <Link to={`/dm/lore/${entry.id}`} className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]">
                      Set a date
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
