import { useEffect, useState } from "react";
import { Link } from "react-router";
import { createSheet, errorMessage, listElectrumAccounts, listHeroes, listLevelCosts, listSheets } from "~/backend/api";
import { blankSheet, classLine, levelsWaiting } from "~/lib/fifth";
import { sortHeroes } from "~/lib/heroes";
import type { ElectrumAccount, LevelCost } from "~/types/electrum";
import type { HeroSummary } from "~/types/hero";
import type { CharacterSheet } from "~/types/sheet";
import QueueLevelUp from "./QueueLevelUp";

/**
 * Every hero's character sheet on the DM's desk: draw one up, and call a
 * hero to a level, paying for it from their electrum if they can.
 */
export default function LevelUpPanel() {
  const [heroes, setHeroes] = useState<HeroSummary[] | null>(null);
  const [sheets, setSheets] = useState<CharacterSheet[]>([]);
  const [accounts, setAccounts] = useState<ElectrumAccount[]>([]);
  const [costs, setCosts] = useState<LevelCost[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listHeroes(), listSheets(), listElectrumAccounts(), listLevelCosts()])
      .then(([heroList, sheetList, accountList, costList]) => {
        setHeroes(sortHeroes(heroList));
        setSheets(sheetList);
        setAccounts(accountList);
        setCosts(costList);
      })
      .catch((err) => setError(errorMessage(err, "Could not load the character sheets.")));
  }, []);

  const drawUp = async (hero: HeroSummary) => {
    setBusy(hero.id);
    setError("");
    try {
      const sheet = await createSheet(blankSheet(hero));
      setSheets((list) => [...list, sheet]);
    } catch (err) {
      setError(`${hero.name}: ${errorMessage(err, "the sheet could not be drawn up.")}`);
    } finally {
      setBusy(null);
    }
  };

  const changed = (sheet: CharacterSheet, account: ElectrumAccount | null) => {
    setSheets((list) => list.map((s) => (s.id === sheet.id ? sheet : s)));
    if (account) setAccounts((list) => list.map((a) => (a.id === account.id ? { ...a, ...account } : a)));
  };

  const waiting = sheets.filter((s) => levelsWaiting(s) > 0).length;

  return (
    <section id="level-ups" aria-labelledby="level-ups-heading" className="panel scroll-mt-6 p-5 sm:p-6">
      <h2 id="level-ups-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Character sheets
        {heroes && (
          <span className="ml-2 text-sm font-normal text-[#c9b78f]">
            {sheets.length} of {heroes.length}
            {waiting ? ` · ${waiting} called to level up` : ""}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">
        A sheet is seen only by you and the hero's approved player. Call a hero to a level and their player takes it on
        the sheet, making that level's choices; the build changes no other way.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}
      {!heroes && !error && <div className="skeleton mt-4 h-24 rounded" />}

      {heroes &&
        (heroes.length ? (
          <ul className="mt-4 divide-y divide-[#f2c14e]/10">
            {heroes.map((hero) => {
              const sheet = sheets.find((s) => s.hero === hero.id);
              const account = accounts.find((a) => a.hero === hero.id) ?? null;
              return (
                <li key={hero.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-center gap-2">
                      <Link to={`/heroes/${hero.slug}/sheet`} className="truncate text-[#f4e6c3] hover:text-[#fff2b0]">
                        {hero.name}
                      </Link>
                      {sheet && levelsWaiting(sheet) > 0 && (
                        <span className="shrink-0 rounded-sm bg-[#7a4a06]/70 px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wider text-[#fff2b0]">
                          Called to {sheet.target_level}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[#c9b78f]">{sheet ? classLine(sheet) : "No sheet yet"}</p>
                  </div>
                  {sheet ? (
                    <div className="w-full sm:w-auto sm:max-w-md">
                      <QueueLevelUp sheet={sheet} account={account} costs={costs} onChanged={changed} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => drawUp(hero)}
                      disabled={busy === hero.id}
                      className="btn btn-gold !px-3 !py-1 !text-[0.7rem]"
                      title="A level 1 sheet from the hero's class and species, for you to fill in"
                    >
                      Draw up a sheet
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-[#c9b78f]">There are no heroes yet.</p>
        ))}
    </section>
  );
}
