import { PLACE_KINDS } from "~/lib/atlas";
import type { Chart, PlaceKind } from "~/types/atlas";

const PIN_ORDER: PlaceKind[] = ["capital", "city", "port", "fortress", "ruin"];

function Row({ mark, children }: { mark: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex w-[18px] flex-none justify-center text-[#4a3520]" aria-hidden="true">
        {mark}
      </span>
      {children}
    </li>
  );
}

/** The key beside the chart: what it is, and what its marks mean. It never zooms. */
export default function AtlasKey({ chart, className = "" }: { chart: Chart; className?: string }) {
  return (
    <aside aria-label="Key to the chart" className={`scroll flex min-w-0 flex-col gap-2 px-6 py-[22px] ${className}`}>
      <p className="font-heading text-[28px] font-bold leading-[1.1] tracking-[0.1em] text-[#5a1a0a]">{chart.name}</p>
      {chart.dateline && <p className="font-card text-[13px] font-semibold tracking-[0.04em]">{chart.dateline}</p>}
      {chart.description && <p className="text-[12.5px] italic leading-[1.45] text-[#5b4527]">{chart.description}</p>}

      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-[7px] border-t border-dotted border-[#8a6d3b] pt-3 text-[12.5px] leading-[1.3] text-[#4a3520] lg:grid-cols-1">
        {PIN_ORDER.map((kind) => {
          // Drawn a little smaller than on the chart, in the same proportions.
          const { glyph, label, size, glyphSize } = PLACE_KINDS[kind];
          const scale = 0.7;
          return (
            <Row
              key={kind}
              mark={
                <span
                  className="atlas-disc"
                  data-kind={kind}
                  style={{ width: size * scale, height: size * scale, fontSize: glyphSize * scale }}
                >
                  {glyph}
                </span>
              }
            >
              {label}
            </Row>
          );
        })}
        <Row mark={<span className="w-full border-t-2 border-dashed border-[#5b4527]" />}>Realm border</Row>
        <Row mark="▲">Mountain range</Row>
        <Row mark="♣">Forest</Row>
        <Row mark="≈">River or lake</Row>
      </ul>

      <p className="mt-auto pt-3 text-[11.5px] italic leading-[1.45] text-[#5b4527]">
        Capitals and realms are always named. Zoom in for cities and seas, then again for ranges, forests and rivers.
      </p>
    </aside>
  );
}
