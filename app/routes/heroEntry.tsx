import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { Route } from "./+types/heroEntry";
import { fileUrl, getElectrumForHero, getHeroBySlug, listHeroUpdates } from "../backend/api";
import ElectrumBanner from "../components/ElectrumBanner";
import HeroCard from "../components/HeroCard";
import HeroUpdates from "../components/HeroUpdates";
import LoreMarkdown from "../components/LoreMarkdown";
import { classLabel, heroEpithet } from "../lib/heroes";
import { ATTRIBUTES } from "../lib/lore";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { Hero, HeroUpdate } from "../types/hero";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Heroes — Phantos" }];
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#f2c14e]/10 py-2 last:border-0">
      <dt className="font-heading text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#c9b78f]">{label}</dt>
      <dd className="text-right text-[0.95rem] text-[#f4e6c3]">{children}</dd>
    </div>
  );
}

export default function HeroEntry() {
  const { slug = "" } = useParams();
  const isDm = useDungeonMaster();
  const [hero, setHero] = useState<Hero | null>(null);
  const [updates, setUpdates] = useState<HeroUpdate[] | null>(null);
  /** What the hero holds; null while loading, and for a hero with no electrum account. */
  const [electrum, setElectrum] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  const loadUpdates = useCallback(async (heroId: string) => {
    try {
      setUpdates(await listHeroUpdates(heroId));
    } catch {
      setUpdates([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setUpdates(null);
    setElectrum(null);
    getHeroBySlug(slug)
      .then((record) => {
        if (cancelled) return;
        setHero(record);
        setStatus("ready");
        document.title = `${record.name} — Phantos`;
        // The updates and the electrum follow; the page doesn't wait for them.
        loadUpdates(record.id);
        getElectrumForHero(record.id)
          .then((account) => !cancelled && setElectrum(account ? account.amount : null))
          .catch(() => {});
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error?.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isDm, loadUpdates]);

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

  const attribute = ATTRIBUTES[hero.attribute];
  const cls = classLabel(hero);
  const portraitLarge = hero.portrait ? fileUrl(hero, hero.portrait, "1600x0") : "";
  const portraitFull = hero.portrait ? fileUrl(hero, hero.portrait) : "";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/heroes" className="hover:text-[#f4e6c3]">
          Heroes
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span>{hero.name}</span>
      </nav>

      {/* Phones read name → card and details → backstory → updates; wide
          screens keep the card in a sticky column beside them. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <header className="min-w-0 lg:col-start-2 lg:row-start-1">
          <p className="eyebrow">{heroEpithet(hero)}{hero.published ? "" : " · Draft"}</p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] gold-text">
            {hero.name}
          </h1>
          {hero.player && <p className="mt-3 text-lg italic text-[#c9b78f]">Played by {hero.player}</p>}
          {hero.summary && (
            <p className="mt-4 max-w-3xl text-[1.1rem] leading-relaxed text-[#e9dbb8]">{hero.summary}</p>
          )}
        </header>

        <aside className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="flex items-start gap-4 sm:gap-6 lg:block">
            <div className="w-[8.5rem] shrink-0 min-[420px]:w-40 sm:w-48 lg:w-auto">
              <HeroCard hero={hero} updateCount={updates?.length} electrum={electrum ?? 0} />
            </div>

            <dl className="panel min-w-0 flex-1 px-3 py-1 sm:px-4 lg:mt-6 lg:py-2">
              {hero.player && <Detail label="Player">{hero.player}</Detail>}
              {hero.species && <Detail label="Species">{hero.species}</Detail>}
              {cls && <Detail label="Class">{cls}</Detail>}
              {hero.background && <Detail label="Background">{hero.background}</Detail>}
              {hero.alignment && <Detail label="Alignment">{hero.alignment}</Detail>}
              {hero.faith && <Detail label="Faith">{hero.faith}</Detail>}
              <Detail label="Element">
                {attribute.label} <span className="font-kanji">{attribute.glyph}</span>
              </Detail>
              {updates && updates.length > 0 && (
                <Detail label="Updates">
                  <a href="#updates" className="underline decoration-[#f2c14e]/50 underline-offset-2 hover:text-[#fff2b0]">
                    {updates.length}
                  </a>
                </Detail>
              )}
            </dl>
          </div>

          {isDm && (
            <div className="mt-4 flex gap-2">
              <Link to={`/dm/heroes/${hero.id}`} className="btn btn-gold flex-1">
                Edit
              </Link>
              <Link to="/dm/heroes/new" className="btn btn-ghost flex-1">
                New
              </Link>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-12 lg:col-start-2 lg:row-start-2">
          {electrum !== null && <ElectrumBanner heroName={hero.name} amount={electrum} />}

          <section aria-labelledby="backstory-heading">
            <h2 id="backstory-heading" className="font-heading text-2xl font-bold text-[#f4e6c3] sm:text-3xl">
              Backstory
            </h2>
            <div className="scroll mt-5 px-5 py-8 sm:px-10 sm:py-12">
              {hero.portrait && (
                <figure className={hero.backstory.trim() ? "mb-10" : ""}>
                  <a href={portraitFull} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={portraitLarge}
                      alt={`Portrait of ${hero.name}`}
                      className="mx-auto max-h-[70vh] w-auto rounded border-4 border-[#2b1c10] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                    />
                  </a>
                  <figcaption className="mt-3 text-center text-sm text-[#5b4527]">
                    <a href={portraitFull} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      Open full size
                    </a>
                  </figcaption>
                </figure>
              )}
              {hero.backstory.trim() ? (
                <div className="mx-auto max-w-[44rem]">
                  <LoreMarkdown content={hero.backstory} title={hero.name} />
                </div>
              ) : (
                <p className="text-center italic text-[#5b4527]">No backstory has been written yet.</p>
              )}
            </div>
          </section>

          <HeroUpdates
            heroId={hero.id}
            heroName={hero.name}
            updates={updates}
            isDm={isDm}
            onChanged={() => loadUpdates(hero.id)}
          />
        </div>
      </div>
    </main>
  );
}
