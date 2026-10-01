import { Link } from "react-router";
import { fileUrl } from "~/backend/api";
import { ATTRIBUTE_ORDER, formatNumber } from "~/lib/lore";
import type { FeaturedImage } from "~/types/lore";
import AttributeOrb from "./AttributeOrb";

interface FeaturedVisionProps {
  image: FeaturedImage | null;
  loading: boolean;
  stats: { entries: number; words: number } | null;
  isDm: boolean;
}

/** The six Primal Dragons in a ring, shown until a vision has been rendered. */
function SixDragons() {
  const primal = ATTRIBUTE_ORDER.filter((a) => a !== "divine");
  return (
    <div className="vision-placeholder">
      <div className="relative w-[min(62%,26rem)] aspect-square [container-type:inline-size]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(242,193,78,0.45)" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="rgba(242,193,78,0.25)" strokeWidth="0.4" />
          <polygon
            points={primal
              .map((_, i) => {
                const angle = (Math.PI / 3) * i - Math.PI / 2;
                return `${50 + 38 * Math.cos(angle)},${50 + 38 * Math.sin(angle)}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(242,193,78,0.5)"
            strokeWidth="0.6"
          />
        </svg>
        {primal.map((attribute, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          return (
            <span
              key={attribute}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + 38 * Math.cos(angle)}%`, top: `${50 + 38 * Math.sin(angle)}%` }}
            >
              <AttributeOrb attribute={attribute} size="15cqw" />
            </span>
          );
        })}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <AttributeOrb attribute="divine" size="22cqw" />
        </span>
      </div>
    </div>
  );
}

export default function FeaturedVision({ image, loading, stats, isDm }: FeaturedVisionProps) {
  // DM uploads can be any size, so the hero only ever loads the resized copies.
  const medium = image ? fileUrl(image, image.image, "960x0") : "";
  const large = image ? fileUrl(image, image.image, "1600x0") : "";

  return (
    <section aria-labelledby="vision-title" className="vision-card">
      <div className="vision-card__frame">
        <header className="vision-card__name">
          <h1
            id="vision-title"
            className="font-card flex-1 min-w-0 truncate text-[clamp(1.25rem,3.4vw,2.2rem)] font-bold leading-tight text-[#1b1004]"
          >
            Visions of Phanatos
          </h1>
          <AttributeOrb attribute="divine" />
        </header>

        <div className="vision-card__art">
          {loading ? (
            <div className="skeleton absolute inset-0" />
          ) : image ? (
            <img
              src={large}
              srcSet={`${medium} 960w, ${large} 1600w`}
              sizes="(max-width: 1120px) 100vw, 1100px"
              alt={image.caption || "Featured image of the world of Phanatos."}
              fetchPriority="high"
            />
          ) : (
            <SixDragons />
          )}
        </div>

        <div className="vision-card__text">
          <p className="font-bold text-[0.95rem] leading-snug">[Featured Vision / The World of Phanatos]</p>
          <p className="mt-1 text-[0.98rem] leading-relaxed">
            {image?.caption ||
              "Kalistos gave this world to six Primal Dragons. From light and dark, fire and ice, earth and the arcane they made its peoples, and from day and night, the Twins."}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t-2 border-[#1d150c] pt-1">
            {isDm ? (
              <Link to="/dm#vision" className="text-sm font-semibold text-[#7d150c] underline underline-offset-2">
                Change the featured image →
              </Link>
            ) : (
              <span />
            )}
            <span className="font-card text-[1.05rem] font-bold tracking-wide">
              {stats ? (
                <>
                  ENTRIES/{formatNumber(stats.entries)}&nbsp;&nbsp; WORDS/{formatNumber(stats.words)}
                </>
              ) : (
                <>&nbsp;</>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
