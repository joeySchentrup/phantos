import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { Route } from "./+types/loreEntry";
import { fileUrl, getLoreBySlug } from "../backend/api";
import LoreCard from "../components/LoreCard";
import LoreMarkdown from "../components/LoreMarkdown";
import PantheonPlates from "../components/PantheonPlates";
import { formatYear } from "../lib/chronicle";
import {
  ATTRIBUTES,
  CATEGORIES,
  formatDate,
  formatNumber,
  levelFor,
  readingMinutes,
} from "../lib/lore";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { LoreEntry as LoreEntryRecord } from "../types/lore";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Lore — Phantos" }];
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#f2c14e]/10 py-2 last:border-0">
      <dt className="font-heading text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#c9b78f]">{label}</dt>
      <dd className="text-right text-[0.95rem] text-[#f4e6c3]">{children}</dd>
    </div>
  );
}

export default function LoreEntry() {
  const { slug = "" } = useParams();
  const isDm = useDungeonMaster();
  const [lore, setLore] = useState<LoreEntryRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getLoreBySlug(slug)
      .then((record) => {
        if (cancelled) return;
        setLore(record);
        setStatus("ready");
        document.title = `${record.title} — Phantos`;
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus(error?.status === 404 ? "missing" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, isDm]);

  if (status === "missing" || status === "error") {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-24 text-center">
        <p className="eyebrow">The Archive</p>
        <h1 className="font-heading mt-3 text-4xl font-bold gold-text">
          {status === "missing" ? "No such card" : "The archive is unreachable"}
        </h1>
        <p className="mt-4 text-lg text-[#c9b78f]">
          {status === "missing"
            ? "This entry isn't in the archive — it may have been renamed or withdrawn."
            : "Please try again in a moment."}
        </p>
        <Link to="/lore" className="btn btn-gold mt-8">
          Browse the archive
        </Link>
      </main>
    );
  }

  if (status === "loading" || !lore) {
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

  const category = CATEGORIES[lore.category];
  const attribute = ATTRIBUTES[lore.attribute];
  const level = levelFor(lore.word_count);
  const isMap = !!lore.cover && !lore.content.trim();
  const coverLarge = lore.cover ? fileUrl(lore, lore.cover, "1600x0") : "";
  const coverFull = lore.cover ? fileUrl(lore, lore.cover) : "";
  const pantheon = lore.expand?.pantheon ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/lore" className="hover:text-[#f4e6c3]">
          Lore Archive
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <Link to={`/lore?category=${lore.category}`} className="hover:text-[#f4e6c3]">
          {category.plural}
        </Link>
      </nav>

      {/* Phones read title → card and details → document; wide screens keep
          the card in a sticky column beside the text. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <header className="min-w-0 lg:col-start-2 lg:row-start-1">
          <p className="eyebrow">{category.label}{lore.published ? "" : " · Draft"}</p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] gold-text">
            {lore.title}
          </h1>
          {lore.author && <p className="mt-3 text-lg italic text-[#c9b78f]">As told by {lore.author}</p>}
          {lore.summary && !isMap && (
            <p className="mt-4 max-w-3xl text-[1.1rem] leading-relaxed text-[#e9dbb8]">{lore.summary}</p>
          )}
        </header>

        <aside className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="flex items-start gap-4 sm:gap-6 lg:block">
            <div className="w-[8.5rem] shrink-0 min-[420px]:w-40 sm:w-48 lg:w-auto">
              <LoreCard lore={lore} />
            </div>

            <dl className="panel min-w-0 flex-1 px-3 py-1 sm:px-4 lg:mt-6 lg:py-2">
              <Detail label="Frame">
                <span className="inline-flex items-center gap-2">
                  <span className="frame-swatch" data-frame={lore.category} />
                  {category.label}
                </span>
              </Detail>
              <Detail label="Attribute">
                {attribute.label} <span className="font-kanji">{attribute.glyph}</span>
              </Detail>
              {lore.author && <Detail label="Voice">{lore.author}</Detail>}
              {lore.year !== 0 && (
                <Detail label="Dated">
                  <Link to={`/chronicle?at=${lore.year}`} className="underline decoration-[#f2c14e]/50 underline-offset-2 hover:text-[#fff2b0]" title="See it on the Chronicle">
                    {formatYear(lore.year, lore.circa)}
                  </Link>
                </Detail>
              )}
              {level > 0 && <Detail label="Level">{level}</Detail>}
              {lore.word_count > 0 && <Detail label="Words">{formatNumber(lore.word_count)}</Detail>}
              {lore.word_count > 0 && <Detail label="Reading">{readingMinutes(lore.word_count)} min</Detail>}
              <Detail label="Added">{formatDate(lore.created)}</Detail>
            </dl>
          </div>

          {isDm && (
            <div className="mt-4 flex gap-2">
              <Link to={`/dm/lore/${lore.id}`} className="btn btn-gold flex-1">
                Edit
              </Link>
              <Link to="/dm/lore/new" className="btn btn-ghost flex-1">
                New
              </Link>
            </div>
          )}
        </aside>

        <div className="scroll min-w-0 px-5 py-8 sm:px-10 sm:py-12 lg:col-start-2 lg:row-start-2">
          {lore.cover && (
            <figure className={isMap ? "" : "mb-10"}>
              <a href={coverFull} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={coverLarge}
                  alt={isMap ? lore.title : ""}
                  className="mx-auto max-h-[80vh] w-auto rounded border-4 border-[#2b1c10] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                />
              </a>
              <figcaption className="mt-3 text-center text-sm text-[#5b4527]">
                {isMap && lore.summary ? `${lore.summary} ` : ""}
                <a href={coverFull} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Open full size
                </a>
              </figcaption>
            </figure>
          )}
          {lore.content.trim() ? (
            <div className="mx-auto max-w-[44rem]">
              <LoreMarkdown content={lore.content} title={lore.title} />
            </div>
          ) : (
            !lore.cover && <p className="text-center italic text-[#5b4527]">This card has no text yet.</p>
          )}
        </div>

        {pantheon.length > 0 && (
          <section aria-labelledby="pantheon-heading" className="min-w-0 lg:col-start-2">
            <p className="eyebrow">The Pantheon</p>
            <h2 id="pantheon-heading" className="font-heading mt-1 text-2xl font-bold text-[#f4e6c3]">
              Named in this entry
            </h2>
            <div className="mt-4">
              <PantheonPlates members={pantheon} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
