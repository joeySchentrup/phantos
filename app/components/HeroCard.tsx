import { cardArtUrl } from "~/backend/api";
import { heroTypeLine } from "~/lib/heroes";
import { ATTRIBUTES, hashString, titleScale } from "~/lib/lore";
import type { HeroSummary } from "~/types/hero";
import AttributeOrb from "./AttributeOrb";
import CardShell, { CardLevel } from "./CardShell";
import { Emblem } from "./CategoryEmblem";

type CardHero = Pick<
  HeroSummary,
  "name" | "player" | "species" | "class" | "attribute" | "summary" | "portrait" | "published"
> &
  Partial<Pick<HeroSummary, "id" | "collectionId" | "collectionName" | "slug" | "card_art">>;

interface HeroCardProps {
  hero: CardHero;
  /** Makes the whole card a link, with the hover tilt and foil. */
  to?: string;
  /** Overrides the stored portrait, e.g. an unsaved upload in the editor. */
  portraitUrl?: string;
  /** How many updates follow the backstory; printed like a monster's DEF. */
  updateCount?: number;
  className?: string;
}

function Portrait({ hero, portraitUrl }: Pick<HeroCardProps, "hero" | "portraitUrl">) {
  const src = portraitUrl || cardArtUrl(hero, hero.portrait, hero.card_art);

  if (src) {
    return (
      <div className="ygo-card__art">
        <img src={src} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }

  // No portrait yet: the hero's element behind a shield.
  const spin = hashString(hero.slug || hero.name) % 360;
  return (
    <div className="ygo-card__art">
      <div className="gen-art" data-attribute={hero.attribute} style={{ "--spin": `${spin}deg` } as React.CSSProperties}>
        <span className="gen-art__ghost" aria-hidden="true">
          {ATTRIBUTES[hero.attribute]?.glyph}
        </span>
        <Emblem className="gen-art__emblem">
          <path d="M32 6l20 7v15c0 14-9 24-20 30-11-6-20-16-20-30V13z" />
          <path d="M32 20l3.2 7.6 8.2.7-6.2 5.4 1.9 8-7.1-4.3-7.1 4.3 1.9-8-6.2-5.4 8.2-.7z" fill="currentColor" stroke="none" />
        </Emblem>
      </div>
    </div>
  );
}

export default function HeroCard({ hero, to, portraitUrl, updateCount, className = "" }: HeroCardProps) {
  return (
    <CardShell frame="hero" to={to} label={`${hero.name} — Hero`} draft={!hero.published} className={className}>
      <header className="ygo-card__name">
        <h3
          className="ygo-card__title"
          style={{ "--title-scale": titleScale(hero.name) } as React.CSSProperties}
          title={hero.name}
        >
          {hero.name || "Unnamed"}
        </h3>
        <AttributeOrb attribute={hero.attribute} />
      </header>

      {/* Heroes carry no level here; that stays on the character sheet. */}
      <CardLevel level={0} fallback="[HERO CARD]" />
      <Portrait hero={hero} portraitUrl={portraitUrl} />

      <div className="ygo-card__text">
        <p className="ygo-card__type">{heroTypeLine(hero)}</p>
        <p className="ygo-card__desc">{hero.summary}</p>
        {!!updateCount && (
          <div className="ygo-card__stats">
            <span>UPDATES/{updateCount}</span>
          </div>
        )}
      </div>

      <footer className="ygo-card__foot">
        <span>{hero.player ? `Played by ${hero.player}` : ""}</span>
        <span>PHANTOS · Hero</span>
      </footer>
    </CardShell>
  );
}
