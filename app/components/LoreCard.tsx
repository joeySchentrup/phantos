import { useRef } from "react";
import { Link } from "react-router";
import { fileUrl } from "~/backend/api";
import {
  ATTRIBUTES,
  CATEGORIES,
  formatDate,
  formatNumber,
  hashString,
  levelFor,
  readingMinutes,
  titleScale,
  typeLine,
} from "~/lib/lore";
import type { LoreSummary } from "~/types/lore";
import AttributeOrb from "./AttributeOrb";
import CategoryEmblem from "./CategoryEmblem";

type CardLore = Pick<
  LoreSummary,
  "title" | "category" | "attribute" | "author" | "summary" | "word_count" | "cover" | "created" | "published"
> &
  Partial<Pick<LoreSummary, "id" | "collectionId" | "collectionName" | "slug">>;

interface LoreCardProps {
  lore: CardLore;
  /** Makes the whole card a link, with the hover tilt and foil. */
  to?: string;
  /** Overrides the stored cover, e.g. an unsaved upload in the editor. */
  coverUrl?: string;
  /** Hint for the browser about how wide the card renders. */
  imageSizes?: string;
  className?: string;
}

function LevelRow({ lore }: { lore: CardLore }) {
  const level = levelFor(lore.word_count);
  if (!level) {
    return (
      <div className="ygo-card__level">
        <span className="level-label">[{CATEGORIES[lore.category]?.label.toUpperCase() ?? "LORE"} CARD]</span>
      </div>
    );
  }
  return (
    <div className="ygo-card__level" role="img" aria-label={`Level ${level}`}>
      {Array.from({ length: level }, (_, i) => (
        <span key={i} className="level-star" aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

function CardArt({ lore, coverUrl, imageSizes }: { lore: CardLore; coverUrl?: string; imageSizes?: string }) {
  const src =
    coverUrl ||
    (lore.cover && lore.id && lore.collectionId ? fileUrl(lore as Required<CardLore>, lore.cover, "480x0") : "");

  if (src) {
    const large =
      !coverUrl && lore.id && lore.collectionId ? fileUrl(lore as Required<CardLore>, lore.cover, "1600x0") : "";
    return (
      <div className="ygo-card__art">
        <img
          src={src}
          srcSet={large ? `${src} 480w, ${large} 1600w` : undefined}
          sizes={imageSizes}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  // No illustration: an elemental field with the category's emblem, turned a
  // little differently for every entry so a row of cards doesn't repeat.
  const spin = hashString(lore.slug || lore.title) % 360;
  return (
    <div className="ygo-card__art">
      <div
        className="gen-art"
        data-attribute={lore.attribute}
        style={{ "--spin": `${spin}deg` } as React.CSSProperties}
      >
        <span className="gen-art__ghost" aria-hidden="true">
          {ATTRIBUTES[lore.attribute]?.glyph}
        </span>
        <CategoryEmblem category={lore.category} className="gen-art__emblem" />
      </div>
    </div>
  );
}

export default function LoreCard({ lore, to, coverUrl, imageSizes, className = "" }: LoreCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const minutes = readingMinutes(lore.word_count);

  const body = (
    <div className="ygo-card__body">
      <div className="ygo-card__frame">
        <header className="ygo-card__name">
          <h3
            className="ygo-card__title"
            style={{ "--title-scale": titleScale(lore.title) } as React.CSSProperties}
            title={lore.title}
          >
            {lore.title || "Untitled"}
          </h3>
          <AttributeOrb attribute={lore.attribute} />
        </header>

        <LevelRow lore={lore} />
        <CardArt lore={lore} coverUrl={coverUrl} imageSizes={imageSizes} />

        <div className="ygo-card__text">
          <p className="ygo-card__type">{typeLine(lore.category, lore.attribute, lore.author)}</p>
          <p className="ygo-card__desc">{lore.summary}</p>
          {lore.word_count > 0 && (
            <div className="ygo-card__stats">
              <span>WORDS/{formatNumber(lore.word_count)}</span>
              <span>MIN/{minutes}</span>
            </div>
          )}
        </div>

        <footer className="ygo-card__foot">
          <span>{formatDate(lore.created)}</span>
          <span>PHANTOS · {CATEGORIES[lore.category]?.label}</span>
        </footer>
      </div>
      {!lore.published && <div className="ygo-card__draft">Draft</div>}
      <div className="ygo-card__foil" aria-hidden="true" />
    </div>
  );

  if (!to) {
    return <article className={`ygo-card ${className}`} data-frame={lore.category}>{body}</article>;
  }

  // Tilt toward the pointer, the way a card catches the light in your hand.
  const onPointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 10}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
    el.style.setProperty("--foil-x", `${100 - x * 100}%`);
  };
  const onPointerLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--ry");
    el.style.removeProperty("--rx");
    el.style.removeProperty("--foil-x");
  };

  return (
    <Link
      ref={ref}
      to={to}
      className={`ygo-card ${className}`}
      data-frame={lore.category}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label={`${lore.title} — ${CATEGORIES[lore.category]?.label ?? "Lore"}`}
    >
      {body}
    </Link>
  );
}
