import { Link, useLocation, type MetaArgs } from "react-router";
import CardBack from "../components/CardBack";
import { sectionFor } from "../lib/sections";

// The face-down page for a section that hasn't been built. No section needs it
// at the moment; to use it, mark the section `live: false` in lib/sections.ts
// and route its path here in routes.ts.
export function meta({ location }: MetaArgs) {
  const section = sectionFor(location.pathname);
  return [
    { title: `${section?.label ?? "Coming soon"} — Phantos` },
    { name: "description", content: section?.blurb ?? "A section of the Phantos archive that is coming soon." },
  ];
}

export default function ComingSoon() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);

  return (
    <main className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-12 sm:px-6 md:grid-cols-[minmax(0,17rem)_1fr] md:gap-14 md:pt-20">
      <div className="mx-auto w-full max-w-[15rem] md:max-w-none [transform:rotate(-3deg)]">
        <CardBack label={`${section?.label ?? "This section"}, face down`} />
      </div>

      <div className="text-center md:text-left">
        <p className="eyebrow">Coming soon</p>
        <h1 className="font-heading mt-2 text-[clamp(2.4rem,6vw,3.75rem)] font-bold leading-tight gold-text">
          {section?.label ?? "Coming soon"}
        </h1>
        <p className="mt-4 text-xl leading-relaxed text-[#e9dbb8]">{section?.blurb}</p>
        <p className="mt-3 text-[#c9b78f]">
          This card is still face down. The Dungeon Master will turn it over when it's ready to be played.
        </p>

        {section?.teaser && (
          <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
            {section.teaser.map((item) => (
              <li
                key={item}
                className="rounded-full border border-[#f2c14e]/25 bg-black/30 px-3 py-1 text-sm text-[#c9b78f]"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
          <Link to="/lore" className="btn btn-gold">
            Browse the lore
          </Link>
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
