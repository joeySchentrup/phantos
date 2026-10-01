import { fileUrl } from "~/backend/api";
import { ATTRIBUTES, hashString, titleScale } from "~/lib/lore";
import { attributeLabels, pantheonTypeLine, RANKS } from "~/lib/pantheon";
import type { PantheonRank, PantheonSummary } from "~/types/pantheon";
import AttributeOrb from "./AttributeOrb";
import CardShell, { CardLevel } from "./CardShell";
import { Emblem, PATHS } from "./CategoryEmblem";

type CardMember = Pick<PantheonSummary, "name" | "rank" | "attributes" | "domain" | "summary" | "image" | "published"> &
  Partial<Pick<PantheonSummary, "id" | "collectionId" | "collectionName" | "slug">>;

interface PantheonCardProps {
  member: CardMember;
  /** Makes the whole card a link, with the hover tilt and foil. */
  to?: string;
  /** Overrides the stored portrait, e.g. an unsaved upload in the editor. */
  imageUrl?: string;
  /** Hint for the browser about how wide the card renders. */
  imageSizes?: string;
  /** How many lore entries refer to this member; printed like a monster's ATK. */
  loreCount?: number;
  className?: string;
}

/** Emblems for cards without a portrait, one for each rank. */
const RANK_PATHS: Record<PantheonRank, React.ReactNode> = {
  // A crown of flame: the Day of the Flame Crown is the Creator's.
  creator: (
    <>
      <path d="M12 46h40M14 46l-4-22 12 9 10-19 10 19 12-9-4 22" />
      <circle cx="32" cy="38" r="3.5" fill="currentColor" stroke="none" />
    </>
  ),
  primal: PATHS.dragon,
  twin: PATHS.myth,
  // Two rings sharing a heart: each Greater Dragon is born of two.
  greater: (
    <>
      <circle cx="24" cy="32" r="15" />
      <circle cx="40" cy="32" r="15" />
      <path d="M32 19.3a15 15 0 0 1 0 25.4 15 15 0 0 1 0-25.4z" fill="currentColor" stroke="none" />
    </>
  ),
  // A four-pointed star.
  other: <path d="M32 8l6 18 18 6-18 6-6 18-6-18-18-6 18-6z" />,
};

function Portrait({ member, imageUrl, imageSizes }: Pick<PantheonCardProps, "member" | "imageUrl" | "imageSizes">) {
  const stored = !!(member.image && member.id && member.collectionId);
  const src = imageUrl || (stored ? fileUrl(member as Required<CardMember>, member.image, "480x0") : "");

  if (src) {
    const large = !imageUrl && stored ? fileUrl(member as Required<CardMember>, member.image, "1600x0") : "";
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

  // No portrait: the member's element. A child of two elements gets both,
  // meeting along the diagonal.
  const [first, second] = member.attributes;
  const spin = hashString(member.slug || member.name) % 360;
  const style = { "--spin": `${spin}deg` } as React.CSSProperties;
  return (
    <div className="ygo-card__art">
      <div className="gen-art" data-attribute={first} style={style}>
        {second && <div className="gen-art gen-art--half" data-attribute={second} style={style} />}
        <span className="gen-art__ghost" aria-hidden="true">
          {ATTRIBUTES[second ?? first]?.glyph}
        </span>
        <Emblem className="gen-art__emblem">{RANK_PATHS[member.rank] ?? RANK_PATHS.other}</Emblem>
      </div>
    </div>
  );
}

export default function PantheonCard({ member, to, imageUrl, imageSizes, loreCount, className = "" }: PantheonCardProps) {
  const rank = RANKS[member.rank] ?? RANKS.other;
  // Two orbs leave less of the name bar for the name.
  const comfortable = member.attributes.length > 1 ? 9 : 13;

  return (
    <CardShell
      frame={member.rank}
      to={to}
      label={`${member.name} — ${rank.label}`}
      draft={!member.published}
      className={className}
    >
      <header className="ygo-card__name">
        <h3
          className="ygo-card__title"
          style={{ "--title-scale": titleScale(member.name, comfortable) } as React.CSSProperties}
          title={member.name}
        >
          {member.name || "Unnamed"}
        </h3>
        {member.attributes.map((attribute) => (
          <AttributeOrb key={attribute} attribute={attribute} />
        ))}
      </header>

      <CardLevel level={rank.level} fallback={`[${rank.label.toUpperCase()}]`} />
      <Portrait member={member} imageUrl={imageUrl} imageSizes={imageSizes} />

      <div className="ygo-card__text">
        <p className="ygo-card__type">{pantheonTypeLine(member.rank, member.domain, member.attributes)}</p>
        <p className="ygo-card__desc">{member.summary}</p>
        {!!loreCount && (
          <div className="ygo-card__stats">
            <span>LORE/{loreCount}</span>
          </div>
        )}
      </div>

      <footer className="ygo-card__foot">
        <span>{attributeLabels(member.attributes)}</span>
        <span>PHANTOS · {rank.label}</span>
      </footer>
    </CardShell>
  );
}
