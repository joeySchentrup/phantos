import { useRef } from "react";
import { Link } from "react-router";

interface CardShellProps {
  /** The frame colour: a lore category or a pantheon rank (`[data-frame]` in app.css). */
  frame: string;
  /** Makes the whole card a link, with the hover tilt and foil. */
  to?: string;
  /** What a screen reader calls the card when it is a link. */
  label?: string;
  /** Stamps "Draft" across the card. */
  draft?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** The card itself: frame, foil and tilt. What is printed on it is up to the caller. */
export default function CardShell({ frame, to, label, draft, className = "", children }: CardShellProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const body = (
    <div className="ygo-card__body">
      <div className="ygo-card__frame">{children}</div>
      {draft && <div className="ygo-card__draft">Draft</div>}
      <div className="ygo-card__foil" aria-hidden="true" />
    </div>
  );

  if (!to) {
    return <article className={`ygo-card ${className}`} data-frame={frame}>{body}</article>;
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
      data-frame={frame}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label={label}
    >
      {body}
    </Link>
  );
}

/**
 * A row of level stars, or a plain label for a card that has no level.
 * `label` says what the stars count when it isn't a level.
 */
export function CardLevel({ level, fallback, label }: { level: number; fallback: string; label?: string }) {
  if (!level) {
    return (
      <div className="ygo-card__level">
        <span className="level-label">{fallback}</span>
      </div>
    );
  }
  return (
    <div className="ygo-card__level" role="img" aria-label={label ?? `Level ${level}`}>
      {Array.from({ length: level }, (_, i) => (
        <span key={i} className="level-star" aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}
