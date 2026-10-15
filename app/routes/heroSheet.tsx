import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/heroSheet";
import { createSheet, errorMessage, getElectrumForHero, listLevelCosts, saveSheet } from "../backend/api";
import CharacterSheet from "../components/CharacterSheet";
import LevelUpWizard from "../components/LevelUpWizard";
import QueueLevelUp from "../components/QueueLevelUp";
import SheetBuildEditor from "../components/SheetBuildEditor";
import { blankSheet, levelsWaiting, levelUpBlocker } from "../lib/fifth";
import type { ElectrumAccount, LevelCost } from "../types/electrum";
import type { SheetPatch } from "../types/sheet";
import { useHero } from "./heroLayout";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Character Sheet — Phantos" }, { name: "robots", content: "noindex" }];
}

/**
 * A hero's character sheet: seen only by the DMs and the hero's approved
 * player. The player keeps the day-to-day fields and takes the levels the DM
 * calls them to; the DM can also edit the build by hand.
 */
export default function HeroSheet() {
  const { hero, isDm, ownsHero, sheet, sheetStatus, setSheet, reloadSheet } = useHero();
  const [mode, setMode] = useState<"view" | "wizard" | "build">("view");
  const [account, setAccount] = useState<ElectrumAccount | null>(null);
  const [costs, setCosts] = useState<LevelCost[]>([]);
  const [error, setError] = useState("");
  const [drawing, setDrawing] = useState(false);
  const saves = useRef(0);

  useEffect(() => {
    document.title = `${hero.name} — Character Sheet — Phantos`;
    setMode("view");
    setError("");
  }, [hero.id, hero.name]);

  // What a call to level costs, for the DM.
  useEffect(() => {
    if (!isDm) return;
    let cancelled = false;
    getElectrumForHero(hero.id)
      .then((a) => !cancelled && setAccount(a))
      .catch(() => {});
    listLevelCosts()
      .then((c) => !cancelled && setCosts(c))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isDm, hero.id]);

  const canSee = isDm || ownsHero;

  /** A day-to-day change: shown at once, then saved; a failure says so and reloads the sheet. */
  const saveDay = async (patch: SheetPatch) => {
    if (!sheet) return;
    setError("");
    setSheet({ ...sheet, ...patch });
    const n = ++saves.current;
    try {
      const saved = await saveSheet(sheet.id, patch);
      if (n === saves.current) setSheet(saved);
    } catch (err) {
      setError(errorMessage(err, "That change could not be saved."));
      reloadSheet();
      throw err;
    }
  };

  const drawUp = async () => {
    setDrawing(true);
    setError("");
    try {
      setSheet(await createSheet(blankSheet(hero)));
      setMode("build");
    } catch (err) {
      setError(errorMessage(err, "The sheet could not be drawn up."));
    } finally {
      setDrawing(false);
    }
  };

  if (!canSee) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="eyebrow">Character sheet</p>
        <h1 className="font-heading mt-3 text-3xl font-bold gold-text">Kept at the table</h1>
        <p className="mt-4 text-[#c9b78f]">
          {hero.name}'s character sheet is seen only by the Dungeon Master and {hero.name}'s player.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={`/heroes/${hero.slug}`} className="btn btn-gold">
            {hero.name}'s page
          </Link>
          <Link to="/players" className="btn btn-ghost">
            Players sign in
          </Link>
        </div>
      </div>
    );
  }

  if (sheetStatus === "idle" || sheetStatus === "loading") {
    return (
      <div className="mt-6 space-y-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-[32rem] rounded-xl" />
      </div>
    );
  }

  if (sheetStatus === "error") {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <h1 className="font-heading text-3xl font-bold gold-text">The sheet is out of reach</h1>
        <p className="mt-4 text-[#c9b78f]">Please try again in a moment.</p>
        <button type="button" className="btn btn-gold mt-8" onClick={reloadSheet}>
          Try again
        </button>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="mx-auto max-w-xl pt-16 text-center">
        <p className="eyebrow">Character sheet</p>
        <h1 className="font-heading mt-3 text-3xl font-bold gold-text">No sheet yet</h1>
        <p className="mt-4 text-[#c9b78f]">
          {isDm
            ? `Draw up a level 1 sheet from ${hero.name}'s class and species, then fill in the rest by hand.`
            : `The Dungeon Master hasn't drawn up ${hero.name}'s sheet yet.`}
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
            {error}
          </p>
        )}
        {isDm && (
          <button type="button" className="btn btn-gold mt-8" onClick={drawUp} disabled={drawing}>
            {drawing && <span className="spinner" aria-hidden="true" />}
            Draw up a sheet
          </button>
        )}
      </div>
    );
  }

  if (mode === "wizard") {
    return (
      <div className="mt-6">
        <LevelUpWizard
          sheet={sheet}
          onDone={(saved) => {
            if (saved) setSheet(saved);
            setMode("view");
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  if (mode === "build" && isDm) {
    return (
      <div className="mt-6">
        <SheetBuildEditor
          sheet={sheet}
          onDone={(saved) => {
            if (saved) setSheet(saved);
            setMode("view");
          }}
          onDeleted={() => {
            setSheet(null);
            setMode("view");
          }}
        />
      </div>
    );
  }

  const waiting = levelsWaiting(sheet);
  const blocker = levelUpBlocker(sheet);

  return (
    <div className="mt-6 space-y-5">
      {waiting > 0 && (
        <div className="sheet-call no-print">
          <div>
            <p className="font-heading text-lg font-bold">Called to level {sheet.target_level}</p>
            <p className="text-sm opacity-90">
              {blocker ??
                (waiting > 1
                  ? `The Dungeon Master has called ${hero.name} up ${waiting} levels. Take them one at a time.`
                  : `The Dungeon Master has called ${hero.name} to the next level.`)}
            </p>
          </div>
          {!blocker && (
            <button type="button" className="btn btn-gold" onClick={() => setMode("wizard")}>
              Take level {sheet.level + 1}
            </button>
          )}
        </div>
      )}

      {isDm && (
        <div className="panel no-print flex flex-wrap items-start justify-between gap-4 p-4">
          <div>
            <p className="field-label">Dungeon Master</p>
            <QueueLevelUp
              sheet={sheet}
              account={account}
              costs={costs}
              onChanged={(saved, paid) => {
                setSheet(saved);
                if (paid) setAccount(paid);
              }}
            />
          </div>
          <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" onClick={() => setMode("build")}>
            Edit the build
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="no-print rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}

      <CharacterSheet sheet={sheet} hero={hero} canEdit={canSee} onSave={saveDay} />

      <div className="no-print flex justify-end">
        <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
