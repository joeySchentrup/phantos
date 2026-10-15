import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useOutletContext, useParams } from "react-router";
import { getHeroBySlug, getSheetForHero } from "../backend/api";
import HeroTabs from "../components/HeroTabs";
import { levelsWaiting } from "../lib/fifth";
import { playsHero } from "../lib/players";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import { usePlayer } from "../lib/usePlayer";
import type { Hero } from "../types/hero";
import type { Player } from "../types/player";
import type { CharacterSheet } from "../types/sheet";

/** What a hero's pages share. */
export interface HeroContext {
  hero: Hero;
  setHero: (hero: Hero) => void;
  isDm: boolean;
  /** Whether the visitor is the hero's approved player. */
  ownsHero: boolean;
  player: Player | null;
  /** The hero's sheet; null when they have none, or the visitor may not see it. */
  sheet: CharacterSheet | null;
  sheetStatus: "idle" | "loading" | "ready" | "error";
  setSheet: (sheet: CharacterSheet | null) => void;
  reloadSheet: () => void;
}

export function useHero(): HeroContext {
  return useOutletContext<HeroContext>();
}

/**
 * A hero's pages: the lore page everyone sees, and the character sheet only
 * the DMs and the hero's player see. Loads the hero once for both, and the
 * tabs between them show only to those who may see the sheet.
 */
export default function HeroLayout() {
  const { slug = "" } = useParams();
  const isDm = useDungeonMaster();
  const player = usePlayer();
  // An approved player can see their own hero while it is a draft, so the hero is fetched again when that changes.
  const playedHero = player?.approved ? player.hero : "";
  const [hero, setHero] = useState<Hero | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [sheetStatus, setSheetStatus] = useState<HeroContext["sheetStatus"]>("idle");
  const [sheetRequest, setSheetRequest] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getHeroBySlug(slug)
      .then((record) => {
        if (cancelled) return;
        setHero(record);
        setStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error?.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isDm, playedHero]);

  const heroId = status === "ready" ? hero?.id ?? "" : "";
  const canSeeSheet = !!heroId && (isDm || playsHero(player, heroId));

  useEffect(() => {
    setSheet(null);
    if (!canSeeSheet) {
      setSheetStatus("idle");
      return;
    }
    let cancelled = false;
    setSheetStatus("loading");
    getSheetForHero(heroId)
      .then((record) => {
        if (cancelled) return;
        setSheet(record);
        setSheetStatus("ready");
      })
      .catch(() => !cancelled && setSheetStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [heroId, canSeeSheet, sheetRequest]);

  const reloadSheet = useCallback(() => setSheetRequest((n) => n + 1), []);

  if (status === "missing" || status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 text-center">
        <p className="eyebrow">The Party</p>
        <h1 className="font-heading mt-3 text-4xl font-bold gold-text">
          {status === "missing" ? "No such hero" : "The heroes are unreachable"}
        </h1>
        <p className="mt-4 text-lg text-[#c9b78f]">
          {status === "missing"
            ? "No hero by that name is in the party — they may have been renamed or withdrawn."
            : "Please try again in a moment."}
        </p>
        <Link to="/heroes" className="btn btn-gold mt-8">
          Meet the heroes
        </Link>
      </main>
    );
  }

  if (status === "loading" || !hero) {
    return (
      <main className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[18.5rem_1fr]">
        <div className="skeleton mx-auto aspect-[59/86] w-full max-w-[16rem] rounded-2xl lg:max-w-none" />
        <div className="space-y-4">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-12 w-3/4 rounded" />
          <div className="skeleton mt-8 h-[28rem] rounded-xl" />
        </div>
      </main>
    );
  }

  const context: HeroContext = {
    hero,
    setHero,
    isDm,
    ownsHero: playsHero(player, hero.id),
    player,
    sheet,
    sheetStatus,
    setSheet,
    reloadSheet,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/heroes" className="hover:text-[#f4e6c3]">
          Heroes
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span>{hero.name}</span>
      </nav>

      {canSeeSheet && <HeroTabs slug={hero.slug} levelsWaiting={sheet ? levelsWaiting(sheet) : 0} />}

      <Outlet context={context} />
    </main>
  );
}
