import { Fragment, useState } from "react";
import { Link } from "react-router";
import { adjustElectrum, errorMessage, saveElectrumAccount } from "~/backend/api";
import { electrumStars, MAX_STARS, parseElectrum } from "~/lib/electrum";
import { formatNumber } from "~/lib/lore";
import type { ElectrumAccount } from "~/types/electrum";

interface ElectrumLedgerProps {
  accounts: ElectrumAccount[];
  isDm: boolean;
  /** Called after an account is changed, to read the ledger again. */
  onChanged: () => Promise<void>;
}

/** The DM's form under a row: award or spend an amount, or set the figures outright. */
function AdjustForm({ account, onDone }: { account: ElectrumAccount; onDone: (changed: boolean) => Promise<void> }) {
  const [by, setBy] = useState("");
  const [name, setName] = useState(account.name);
  const [amount, setAmount] = useState(String(account.amount));
  const [spent, setSpent] = useState(String(account.spent));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (change: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await change();
      await onDone(true);
    } catch (err) {
      setError(errorMessage(err, "The account could not be saved."));
      setBusy(false);
    }
  };

  const adjust = (spend: boolean) => {
    const n = parseElectrum(by);
    if (!n) {
      setError("Enter how much electrum, as a whole number.");
      return;
    }
    if (spend && n > account.amount) {
      setError(`${account.name} holds only ${formatNumber(account.amount)} electrum.`);
      return;
    }
    run(() => adjustElectrum(account.id, spend ? -n : n, spend));
  };

  const onSet = (event: React.FormEvent) => {
    event.preventDefault();
    run(() => saveElectrumAccount({ name: name.trim(), amount: parseElectrum(amount), spent: parseElectrum(spent) }, account.id));
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#f2c14e]/20 bg-black/25 p-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            adjust(false);
          }}
        >
          <label htmlFor={`adjust-${account.id}`} className="field-label">
            Award or spend
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id={`adjust-${account.id}`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={by}
              onChange={(e) => setBy(e.target.value)}
              placeholder="How much"
              className="field !w-32 flex-1"
            />
            <button type="submit" disabled={busy} className="btn btn-gold">
              Award
            </button>
            <button type="button" onClick={() => adjust(true)} disabled={busy} className="btn btn-ghost">
              Spend
            </button>
          </div>
          <p className="mt-2 text-sm text-[#c9b78f]">Spending takes it from what they hold and adds it to what they have spent.</p>
        </form>

        <form onSubmit={onSet}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <label htmlFor={`name-${account.id}`} className="field-label">
                Account
              </label>
              <input id={`name-${account.id}`} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </div>
            <div>
              <label htmlFor={`amount-${account.id}`} className="field-label">
                Held
              </label>
              <input
                id={`amount-${account.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor={`spent-${account.id}`} className="field-label">
                Spent
              </label>
              <input
                id={`spent-${account.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                value={spent}
                onChange={(e) => setSpent(e.target.value)}
                className="field"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-ghost">
              Set these figures
            </button>
            <button type="button" onClick={() => onDone(false)} disabled={busy} className="btn btn-ghost">
              Close
            </button>
          </div>
        </form>
      </div>

      {error && (
        <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Who an account belongs to: its hero when the visitor may see them, otherwise the name on the ledger. */
function Holder({ account }: { account: ElectrumAccount }) {
  const hero = account.expand?.hero;
  if (hero) {
    return (
      <>
        <Link to={`/heroes/${hero.slug}`} className="font-semibold text-[#f4e6c3] underline decoration-[#f2c14e]/40 underline-offset-2 hover:text-[#fff2b0]">
          {hero.name}
        </Link>
        <span className="block text-sm text-[#c9b78f]">
          {account.name}
          {hero.published ? "" : " · Draft"}
        </span>
      </>
    );
  }
  return (
    <>
      <span className="font-semibold text-[#f4e6c3]">{account.name}</span>
      {!account.hero && <span className="block text-sm italic text-[#c9b78f]">No hero yet</span>}
    </>
  );
}

/** Every account: what it holds, what it has spent, and the stars that earns. */
export default function ElectrumLedger({ accounts, isDm, onChanged }: ElectrumLedgerProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-labelledby="ledger-heading" className="panel min-w-0 p-5 sm:p-6">
      <h2 id="ledger-heading" className="font-heading text-xl font-bold text-[#f4e6c3] sm:text-2xl">
        The Ledger
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">
        What each hero holds and what they have spent. Stars are for what is held: one for any electrum at all, all {MAX_STARS} at 10,000.
      </p>

      {accounts.length ? (
        <table className="mt-4 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f2c14e]/25 font-heading text-[0.7rem] uppercase tracking-[0.14em] text-[#c9b78f]">
              <th scope="col" className="py-2 pr-3 font-bold">
                Hero
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                Held
              </th>
              <th scope="col" className="px-3 py-2 text-right font-bold">
                Spent
              </th>
              <th scope="col" className="hidden px-3 py-2 text-right font-bold sm:table-cell">
                Stars
              </th>
              {isDm && (
                <th scope="col" className="py-2 pl-3">
                  <span className="sr-only">Adjust</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <Fragment key={account.id}>
                <tr className={open === account.id ? "" : "border-b border-[#f2c14e]/10"}>
                  <th scope="row" className="py-3 pr-3 align-top font-normal">
                    <Holder account={account} />
                  </th>
                  <td className="px-3 py-3 text-right align-top font-card lining-nums tabular-nums text-xl font-bold text-[#a9dcff]">{formatNumber(account.amount)}</td>
                  <td className="px-3 py-3 text-right align-top font-card lining-nums tabular-nums text-lg text-[#e9dbb8]">{formatNumber(account.spent)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 text-right align-top text-[#e9dbb8] sm:table-cell">
                    <span aria-hidden="true" className="text-[#f2c14e]">
                      ★
                    </span>{" "}
                    {electrumStars(account.amount)} <span className="text-sm text-[#c9b78f]">of {MAX_STARS}</span>
                  </td>
                  {isDm && (
                    <td className="py-3 pl-3 text-right align-top">
                      <button
                        type="button"
                        onClick={() => setOpen(open === account.id ? null : account.id)}
                        aria-expanded={open === account.id}
                        aria-label={`Adjust ${account.name}'s electrum`}
                        className="btn btn-ghost !px-2.5 !py-1 !text-[0.65rem]"
                      >
                        Adjust
                      </button>
                    </td>
                  )}
                </tr>
                {isDm && open === account.id && (
                  <tr className="border-b border-[#f2c14e]/10">
                    <td colSpan={5} className="pb-4">
                      <AdjustForm
                        account={account}
                        onDone={async (changed) => {
                          if (changed) await onChanged();
                          setOpen(null);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 py-6 text-center text-[#c9b78f]">No one holds any electrum yet.</p>
      )}
    </section>
  );
}
