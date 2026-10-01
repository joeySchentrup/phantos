import { ATTRIBUTES } from "~/lib/lore";
import type { LoreAttribute } from "~/types/lore";

interface AttributeOrbProps {
  attribute: LoreAttribute;
  /** Any CSS length; defaults to the card's own orb size. */
  size?: string;
  className?: string;
}

export default function AttributeOrb({ attribute, size, className = "" }: AttributeOrbProps) {
  const info = ATTRIBUTES[attribute] ?? ATTRIBUTES.divine;
  return (
    <span
      className={`attr-orb ${className}`}
      data-attribute={attribute}
      style={size ? ({ "--orb-size": size } as React.CSSProperties) : undefined}
      role="img"
      aria-label={`${info.label} attribute`}
      title={`${info.label} · ${info.dragon}`}
    >
      <span className="attr-orb__glyph" aria-hidden="true">
        {info.glyph}
      </span>
    </span>
  );
}
