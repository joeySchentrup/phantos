import { useState } from "react";
import { levelUpSteps } from "~/lib/electrum";
import { formatNumber } from "~/lib/lore";
import type { LevelCost } from "~/types/electrum";
import ElectrumCoin from "./ElectrumCoin";

/** What a level up costs: pick where a hero is and where they are going. The prices come from the stored table. */
export default function LevelUpCalculator({ levels }: { levels: LevelCost[] }) {
  const lowest = levels.length ? levels[0].level : 0;
  const highest = levels.length ? levels[levels.length - 1].level : 0;
  const [from, setFrom] = useState(lowest - 1);
  const [to, setTo] = useState(lowest);

  const steps = levelUpSteps(levels, from, to);
  const total = steps ? steps.reduce((sum, step) => sum + step.cost, 0) : 0;

  const range = (start: number, end: number) => Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);

  return (
    <section id="level-up" aria-labelledby="level-up-heading" className="panel min-w-0 scroll-mt-6 p-5 sm:p-6">
      <h2 id="level-up-heading" className="font-heading text-xl font-bold text-[#f4e6c3] sm:text-2xl">
        Level Up Cost
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">Each level has its own price, and the higher it is the more it costs.</p>

      {levels.length ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="level-from" className="field-label">
                Current level
              </label>
              <select
                id="level-from"
                value={from}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setFrom(next);
                  if (to <= next) setTo(next + 1);
                }}
                className="field"
              >
                {range(lowest - 1, highest - 1).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="level-to" className="field-label">
                Level up to
              </label>
              <select id="level-to" value={to} onChange={(e) => setTo(Number(e.target.value))} className="field">
                {range(from + 1, highest).map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#3b82c8]/50 bg-[#0c2a5e]/40 px-4 py-3" aria-live="polite">
            {steps ? (
              <>
                <p className="font-heading text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#c9b78f]">
                  Level {from} to {to}
                </p>
                <p className="mt-1 flex items-center gap-2 font-card lining-nums tabular-nums text-3xl font-bold text-[#a9dcff]">
                  <ElectrumCoin className="h-6 w-6" />
                  {formatNumber(total)}
                </p>
                {steps.length > 1 && (
                  <p className="mt-1 text-sm text-[#c9b78f]">{steps.map((step) => formatNumber(step.cost)).join(" + ")}</p>
                )}
              </>
            ) : (
              <p className="text-[#c9b78f]">There is no price for one of those levels.</p>
            )}
          </div>

          <table className="mt-5 w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#f2c14e]/25 font-heading text-[0.7rem] uppercase tracking-[0.14em] text-[#c9b78f]">
                <th scope="col" className="py-2 pr-3 font-bold">
                  Next level
                </th>
                <th scope="col" className="py-2 pl-3 text-right font-bold">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {levels.map((row) => {
                const counted = row.level > from && row.level <= to;
                return (
                  <tr key={row.id} className={`border-b border-[#f2c14e]/10 ${counted ? "bg-[#3b82c8]/15" : ""}`}>
                    <th scope="row" className={`py-1.5 pl-2 pr-3 font-normal ${counted ? "font-semibold text-[#f4e6c3]" : "text-[#e9dbb8]"}`}>
                      {row.level}
                    </th>
                    <td className={`py-1.5 pl-3 pr-2 text-right font-card lining-nums tabular-nums ${counted ? "font-bold text-[#a9dcff]" : "text-[#e9dbb8]"}`}>
                      {formatNumber(row.cost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <p className="mt-4 py-6 text-center text-[#c9b78f]">No level up costs have been set.</p>
      )}
    </section>
  );
}
