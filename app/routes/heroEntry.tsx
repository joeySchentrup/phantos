import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/heroEntry";
import { fileUrl, getElectrumForHero, listHeroUpdates } from "../backend/api";
import BackstoryEditor from "../components/BackstoryEditor";
import ElectrumBanner from "../components/ElectrumBanner";
import HeroCard from "../components/HeroCard";
import HeroUpdates from "../components/HeroUpdates";
import LoreMarkdown from "../components/LoreMarkdown";
import { classLabel, heroEpithet } from "../lib/heroes";
import { ATTRIBUTES } from "../lib/lore";
import type { HeroUpdate } from "../types/hero";
import { useHero } from "./heroLayout";

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
  // The layout loads the hero, and shows the missing and loading pages.
  const { hero, setHero, isDm, ownsHero } = useHero();
  const [updates, setUpdates] = useState<HeroUpdate[] | null>(null);
  /** What the hero holds; null while loading, and for a hero with no electrum account. */
  const [electrum, setElectrum] = useState<number | null>(null);
  const [editingBackstory, setEditingBackstory] = useState(false);

  const loadUpdates = useCallback(async (heroId: string) => {
    try {
      setUpdates(await listHeroUpdates(heroId));
    } catch {
      setUpdates([]);
    }
  }, []);

  // The updates and the electrum follow the hero; the page doesn't wait for them.
  useEffect(() => {
    let cancelled = false;
    document.title = `${hero.name} — Phantos`;
    setUpdates(null);
    setElectrum(null);
    setEditingBackstory(false);
    loadUpdates(hero.id);
    getElectrumForHero(hero.id)
      .then((account) => !cancelled && setElectrum(account ? account.amount : null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Fetched again when the visitor changes, like the hero: drafts' updates appear for the DM and the player.
  }, [hero.id, hero.name, isDm, ownsHero, loadUpdates]);

  const attribute = ATTRIBUTES[hero.attribute];
  const cls = classLabel(hero);
  const portraitLarge = hero.portrait ? fileUrl(hero, hero.portrait, "1600x0") : "";
  const portraitFull = hero.portrait ? fileUrl(hero, hero.portrait) : "";

  return (
    <>
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
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="backstory-heading" className="font-heading text-2xl font-bold text-[#f4e6c3] sm:text-3xl">
                Backstory
              </h2>
              {ownsHero && !editingBackstory && (
                <button type="button" onClick={() => setEditingBackstory(true)} className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                  Edit backstory
                </button>
              )}
            </div>
            {editingBackstory ? (
              <BackstoryEditor
                hero={hero}
                onDone={(saved) => {
                  if (saved) setHero(saved);
                  setEditingBackstory(false);
                }}
              />
            ) : (
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
            )}
          </section>

          <HeroUpdates
            heroId={hero.id}
            heroName={hero.name}
            updates={updates}
            canPost={isDm || ownsHero}
            canEdit={isDm}
            onChanged={() => loadUpdates(hero.id)}
          />
        </div>
      </div>
    </>
  );
}
