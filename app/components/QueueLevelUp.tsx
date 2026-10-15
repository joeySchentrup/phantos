import { useEffect, useState } from "react";
import { adjustElectrum, errorMessage, queueLevelUp } from "~/backend/api";
import { levelUpSteps } from "~/lib/electrum";
import { MAX_LEVEL } from "~/lib/fifth";
import type { ElectrumAccount, LevelCost } from "~/types/electrum";
import type { CharacterSheet } from "~/types/sheet";

interface QueueLevelUpProps {
  sheet: CharacterSheet;
  /** The hero's electrum account; null when they have none. */
  account: ElectrumAccount | null;
  costs: LevelCost[];
  onChanged: (sheet: CharacterSheet, account: ElectrumAccount | null) => void;
}

/**
 * The DM calls a hero to a level: the player then takes each level in the
 * wizard. What the climb costs comes from the electrum table, and it can be
 * spent from the hero's account at the same time.
 */
export default function QueueLevelUp({ sheet, account, costs, onChanged }: QueueLevelUpProps) {
  // Levels already called are paid for; a new call is priced from the last one.
  const floor = Math.max(sheet.level, sheet.target_level);
  const [target, setTarget] = useState(Math.min(MAX_LEVEL, floor + 1));
  const [charge, setCharge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setTarget(Math.min(MAX_LEVEL, floor + 1)), [floor]);

  const steps = target > floor ? levelUpSteps(costs, floor, target) : null;
  const total = steps?.reduce((sum, step) => sum + step.cost, 0) ?? 0;
  const affordable = !!steps && !!account && account.amount >= total;

  // On by default when the account can pay.
  useEffect(() => setCharge(affordable), [affordable, target]);

  const call = async () => {
    setBusy(true);
    setMessage("");
    try {
      const saved = await queueLevelUp(sheet.id, target);
      let paid = account;
      if (charge && steps && account) {
        try {
          paid = await adjustElectrum(account.id, -total, true);
        } catch (err) {
          setMessage(`Called to level ${target}, but the electrum was not taken: ${errorMessage(err, "the ledger refused it.")}`);
        }
      }
      onChanged(saved, paid);
    } catch (err) {
      setMessage(errorMessage(err, "The call could not be saved."));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!window.confirm(`Withdraw the call to level ${sheet.target_level}? Electrum already spent on it isn't given back; adjust the ledger by hand if it should be.`)) return;
    setBusy(true);
    setMessage("");
    try {
      onChanged(await queueLevelUp(sheet.id, sheet.level), account);
    } catch (err) {
      setMessage(errorMessage(err, "The call could not be withdrawn."));
    } finally {
      setBusy(false);
    }
  };

  const why = !steps
    ? "The electrum table has no price for one of those levels."
    : !account
      ? "This hero has no electrum account."
      : !affordable
        ? `${account.name} holds ${account.amount.toLocaleString()}, short of ${total.toLocaleString()}.`
        : undefined;

  return (
    <div className="space-y-2">
      {floor < MAX_LEVEL && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`call-${sheet.id}`}>
            Call to level
          </label>
          <select
            id={`call-${sheet.id}`}
            className="field !w-auto !py-1.5"
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(Number(e.target.value))}
          >
            {Array.from({ length: MAX_LEVEL - floor }, (_, i) => floor + 1 + i).map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-gold !px-3 !py-1.5 !text-[0.7rem]" onClick={call} disabled={busy}>
            Call to level {target}
          </button>
          {sheet.target_level > sheet.level && (
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" onClick={withdraw} disabled={busy}>
              Withdraw call
            </button>
          )}
        </div>
      )}
      {floor < MAX_LEVEL && (
        <label className="flex items-start gap-2 text-sm text-[#c9b78f]" title={why}>
          <input
            type="checkbox"
            className="mt-0.5 accent-[#f2c14e]"
            checked={charge && !!steps && !!account}
            disabled={busy || !steps || !account}
            onChange={(e) => setCharge(e.target.checked)}
          />
          <span>
            {steps ? (
              <>
                Spend {total.toLocaleString()} electrum
                {steps.length > 1 && <span className="text-[#c9b78f]/80"> ({steps.map((s) => s.cost.toLocaleString()).join(" + ")})</span>}
                {account ? ` from ${account.name}'s account (holds ${account.amount.toLocaleString()})` : ""}
              </>
            ) : (
              "No electrum price for one of those levels"
            )}
            {why && steps && <span className="block text-xs text-[#c9b78f]/80">{why}</span>}
          </span>
        </label>
      )}
      {message && (
        <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {message}
        </p>
      )}
    </div>
  );
}
