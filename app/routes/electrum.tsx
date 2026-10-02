import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/electrum";
import { listElectrumAccounts, listLevelCosts, listShopItems } from "../backend/api";
import ElectrumCoin from "../components/ElectrumCoin";
import ElectrumLedger from "../components/ElectrumLedger";
import ElectrumShop from "../components/ElectrumShop";
import LevelUpCalculator from "../components/LevelUpCalculator";
import { ledgerTotals } from "../lib/electrum";
import { formatNumber } from "../lib/lore";
import { useDungeonMaster } from "../lib/useDungeonMaster";
import type { ElectrumAccount, LevelCost, ShopItem } from "../types/electrum";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Electrum — Phantos" },
    { name: "description", content: "What each hero holds in electrum, what it buys, and what a level up costs." },
  ];
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-heading text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#d3edff]">{label}</dt>
      <dd className="mt-0.5 font-card lining-nums tabular-nums text-3xl font-bold leading-none sm:text-4xl">{formatNumber(value)}</dd>
    </div>
  );
}

/** The ledger, the shop and the level up calculator. Reached from a hero's page, not from the top bar. */
export default function Electrum() {
  const isDm = useDungeonMaster();
  const [accounts, setAccounts] = useState<ElectrumAccount[]>([]);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [levels, setLevels] = useState<LevelCost[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const loadAccounts = useCallback(async () => setAccounts(await listElectrumAccounts()), []);
  const loadItems = useCallback(async () => setItems(await listShopItems()), []);

  // A DM sees the heroes still in draft, so read it again when they sign in or out.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAccounts(), loadItems(), listLevelCosts()])
      .then(([, , costs]) => {
        if (cancelled) return;
        setLevels(costs);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [isDm, loadAccounts, loadItems]);

  const totals = ledgerTotals(accounts);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mt-6 text-sm text-[#c9b78f]">
        <Link to="/heroes" className="hover:text-[#f4e6c3]">
          Heroes
        </Link>
        <span className="mx-2 opacity-50">/</span>
        <span>Electrum</span>
      </nav>

      <header className="mt-6 max-w-3xl">
        <p className="eyebrow">The Party's Purse</p>
        <h1 className="font-heading mt-2 text-4xl font-bold text-[#f4e6c3] sm:text-5xl">Electrum</h1>
        <p className="mt-3 text-lg text-[#c9b78f]">
          Earned at the table and spent in the shop. What a hero holds sets the stars on their card.
        </p>
      </header>

      {status === "error" ? (
        <p className="panel mx-auto mt-8 max-w-xl p-6 text-center text-[#c9b78f]">The ledger could not be reached. Please try again.</p>
      ) : status === "loading" ? (
        <div className="mt-8 space-y-8" aria-hidden="true">
          <div className="skeleton h-24 rounded-xl" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="electrum-banner">
            <ElectrumCoin className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
            <dl className="flex flex-1 flex-wrap gap-x-10 gap-y-3">
              <Total label="In circulation" value={totals.held} />
              <Total label="Spent so far" value={totals.spent} />
            </dl>
          </div>

          <ElectrumLedger accounts={accounts} isDm={isDm} onChanged={loadAccounts} />

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <ElectrumShop items={items} levels={levels} isDm={isDm} onChanged={loadItems} />
            <LevelUpCalculator levels={levels} />
          </div>
        </div>
      )}
    </main>
  );
}
