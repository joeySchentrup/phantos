import { cardArtUrl } from "~/backend/api";
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
import CardShell, { CardLevel } from "./CardShell";
import CategoryEmblem from "./CategoryEmblem";

type CardLore = Pick<
  LoreSummary,
  "title" | "category" | "attribute" | "author" | "summary" | "word_count" | "cover" | "created" | "published"
> &
  Partial<Pick<LoreSummary, "id" | "collectionId" | "collectionName" | "slug" | "card_art">>;

interface LoreCardProps {
  lore: CardLore;
  /** Makes the whole card a link, with the hover tilt and foil. */
  to?: string;
  /** Overrides the stored cover, e.g. an unsaved upload in the editor. */
  coverUrl?: string;
  className?: string;
}

function CardArt({ lore, coverUrl }: { lore: CardLore; coverUrl?: string }) {
  const src = coverUrl || cardArtUrl(lore, lore.cover, lore.card_art);

  if (src) {
    return (
      <div className="ygo-card__art">
        <img src={src} alt="" loading="lazy" decoding="async" />
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

export default function LoreCard({ lore, to, coverUrl, className = "" }: LoreCardProps) {
  const minutes = readingMinutes(lore.word_count);
  const category = CATEGORIES[lore.category]?.label ?? "Lore";

  return (
    <CardShell
      frame={lore.category}
      to={to}
      label={`${lore.title} — ${category}`}
      draft={!lore.published}
      className={className}
    >
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

      <CardLevel level={levelFor(lore.word_count)} fallback={`[${category.toUpperCase()} CARD]`} />
      <CardArt lore={lore} coverUrl={coverUrl} />

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
    </CardShell>
  );
}
