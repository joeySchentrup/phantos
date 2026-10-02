import { Link } from "react-router";
import { formatNumber } from "~/lib/lore";
import ElectrumCoin from "./ElectrumCoin";

/** The plate above a hero's backstory: the electrum they hold, and the way to the ledger and the shop. */
export default function ElectrumBanner({ heroName, amount }: { heroName: string; amount: number }) {
  return (
    <Link
      to="/electrum"
      className="electrum-banner"
      aria-label={`${heroName} holds ${formatNumber(amount)} electrum. Open the ledger and the shop.`}
    >
      <ElectrumCoin className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d3edff]">Electrum</span>
        <span className="mt-0.5 block font-card lining-nums tabular-nums text-3xl font-bold leading-none sm:text-4xl">{formatNumber(amount)}</span>
      </span>
      <span className="shrink-0 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#e6f5ff] sm:text-xs">
        Ledger &amp; shop <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
