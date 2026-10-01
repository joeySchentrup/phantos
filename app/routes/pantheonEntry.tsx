import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import type { Route } from "./+types/pantheonEntry";
import { fileUrl, getPantheonBySlug, listLoreForPantheon } from "../backend/api";
import { CardGrid, CardGridSkeleton } from "../components/CardGrid";
import LoreMarkdown from "../components/LoreMarkdown";
import PantheonCard from "../components/PantheonCard";
import { ATTRIBUTES } from "../lib/lore";
import { epithet, RANKS } from "../lib/pantheon";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { LoreSummary } from "../types/lore";
import type { PantheonMember } from "../types/pantheon";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Pantheon — Phantos" }];
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#f2c14e]/10 py-2 last:border-0">
      <dt className="font-heading text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#c9b78f]">{label}</dt>
      <dd className="text-right text-[0.95rem] text-[#f4e6c3]">{children}</dd>
    </div>
  );
}

export default function PantheonEntry() {
  const { slug = "" } = useParams();
  const isDm = useDungeonMaster();
  const [member, setMember] = useState<PantheonMember | null>(null);
  const [lore, setLore] = useState<LoreSummary[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setLore(null);
    getPantheonBySlug(slug)
      .then((record) => {
        if (cancelled) return;
        setMember(record);
        setStatus("ready");
        document.title = `${record.name} — Phantos`;
        // The lore that names this member follows; the page doesn't wait for it.
        listLoreForPantheon(record.id)
          .then((entries) => !cancelled && setLore(entries))
          .catch(() => !cancelled && setLore([]));
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
        <p className="eyebrow">The Pantheon</p>
        <h1 className="font-heading mt-3 text-4xl font-bold gold-text">
          {status === "missing" ? "No such card" : "The pantheon is unreachable"}
        </h1>
        <p className="mt-4 text-lg text-[#c9b78f]">
          {status === "missing"
            ? "No power by that name is in the pantheon — it may have been renamed or withdrawn."
            : "Please try again in a moment."}
        </p>
        <Link to="/pantheon" className="btn btn-gold mt-8">
          Browse the pantheon
        </Link>
      </main>
    );
  }

  if (status === "loading" || !member) {
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

  const rank = RANKS[member.rank];
  const imageLarge = member.image ? fileUrl(member, member.image, "1600x0") : "";
  const imageFull = member.image ? fileUrl(member, member.image) : "";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/pantheon" className="hover:text-[#f4e6c3]">
          Pantheon
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <Link to={`/pantheon?rank=${member.rank}`} className="hover:text-[#f4e6c3]">
          {rank.plural}
        </Link>
      </nav>

      {/* Phones read name → card and details → document; wide screens keep
          the card in a sticky column beside the text. */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
        <header className="min-w-0 lg:col-start-2 lg:row-start-1">
          <p className="eyebrow">{epithet(member.rank, member.domain)}{member.published ? "" : " · Draft"}</p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.1] gold-text">
            {member.name}
          </h1>
          {member.summary && (
            <p className="mt-4 max-w-3xl text-[1.1rem] leading-relaxed text-[#e9dbb8]">{member.summary}</p>
          )}
        </header>

        <aside className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="flex items-start gap-4 sm:gap-6 lg:block">
            <div className="w-[8.5rem] shrink-0 min-[420px]:w-40 sm:w-48 lg:w-auto">
              <PantheonCard member={member} imageSizes="(min-width: 1024px) 300px, 200px" loreCount={lore?.length} />
            </div>

            <dl className="panel min-w-0 flex-1 px-3 py-1 sm:px-4 lg:mt-6 lg:py-2">
              <Detail label="Rank">
                <span className="inline-flex items-center gap-2">
                  <span className="frame-swatch" data-frame={member.rank} />
                  {rank.label}
                </span>
              </Detail>
              {member.domain && <Detail label="Domain">{member.domain}</Detail>}
              <Detail label={member.attributes.length > 1 ? "Elements" : "Element"}>
                {member.attributes.map((attribute, i) => (
                  <span key={attribute}>
                    {i > 0 && " + "}
                    {ATTRIBUTES[attribute].label} <span className="font-kanji">{ATTRIBUTES[attribute].glyph}</span>
                  </span>
                ))}
              </Detail>
              {lore && lore.length > 0 && (
                <Detail label="Lore">
                  <a href="#lore" className="underline decoration-[#f2c14e]/50 underline-offset-2 hover:text-[#fff2b0]">
                    {lore.length} {lore.length === 1 ? "entry" : "entries"}
                  </a>
                </Detail>
              )}
            </dl>
          </div>

          {isDm && (
            <div className="mt-4 flex gap-2">
              <Link to={`/dm/pantheon/${member.id}`} className="btn btn-gold flex-1">
                Edit
              </Link>
              <Link to="/dm/pantheon/new" className="btn btn-ghost flex-1">
                New
              </Link>
            </div>
          )}
        </aside>

        <div className="scroll min-w-0 px-5 py-8 sm:px-10 sm:py-12 lg:col-start-2 lg:row-start-2">
          {member.image && (
            <figure className={member.content.trim() ? "mb-10" : ""}>
              <a href={imageFull} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={imageLarge}
                  alt={`${member.name}, ${epithet(member.rank, member.domain)}`}
                  className="mx-auto max-h-[80vh] w-auto rounded border-4 border-[#2b1c10] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                />
              </a>
              <figcaption className="mt-3 text-center text-sm text-[#5b4527]">
                <a href={imageFull} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Open full size
                </a>
              </figcaption>
            </figure>
          )}
          {member.content.trim() ? (
            <div className="mx-auto max-w-[44rem]">
              <LoreMarkdown content={member.content} title={member.name} />
            </div>
          ) : (
            !member.image && <p className="text-center italic text-[#5b4527]">Nothing has been written of this power yet.</p>
          )}
        </div>
      </div>

      <section id="lore" aria-labelledby="lore-heading" className="mt-16 scroll-mt-6">
        <div className="border-b border-[#f2c14e]/20 pb-4">
          <p className="eyebrow">In the Archive</p>
          <h2 id="lore-heading" className="font-heading mt-1 text-3xl font-bold text-[#f4e6c3]">
            Lore of {member.name}
          </h2>
        </div>
        <div className="mt-8">
          {!lore ? (
            <CardGridSkeleton count={4} />
          ) : lore.length ? (
            <CardGrid items={lore} />
          ) : (
            <p className="panel p-6 text-center text-[#c9b78f]">No lore in the archive names {member.name} yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
