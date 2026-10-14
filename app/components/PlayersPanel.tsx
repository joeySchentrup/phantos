import { useEffect, useState } from "react";
import { Link } from "react-router";
import { deletePlayer, errorMessage, listHeroes, listPlayers, savePlayer } from "~/backend/api";
import { sortHeroes } from "~/lib/heroes";
import { formatDate } from "~/lib/lore";
import { heroChoiceLabel } from "~/lib/players";
import type { HeroSummary } from "~/types/hero";
import type { Player } from "~/types/player";

/**
 * The players who have joined, those waiting for approval first. A DM
 * approves them, takes approval away, gives them another hero, or removes
 * the account.
 */
export default function PlayersPanel() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  /** Every hero, drafts included, so a player can be given one before it is published. */
  const [heroes, setHeroes] = useState<HeroSummary[]>([]);
  /** The player whose change is being saved. */
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listPlayers(), listHeroes()])
      .then(([playerList, heroList]) => {
        setPlayers(playerList);
        setHeroes(sortHeroes(heroList));
      })
      .catch((err) => setError(errorMessage(err, "Could not load the players.")));
  }, []);

  const change = async (player: Player, data: Partial<Pick<Player, "approved" | "hero">>) => {
    setBusy(player.id);
    setError("");
    try {
      const saved = await savePlayer(player.id, data);
      setPlayers((list) => list?.map((candidate) => (candidate.id === saved.id ? saved : candidate)) ?? null);
    } catch (err) {
      setError(`${player.name}: ${errorMessage(err, "the change could not be saved.")}`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (player: Player) => {
    if (!window.confirm(`Remove ${player.name}'s account? They will no longer be able to sign in. Their hero stays.`)) return;
    setBusy(player.id);
    setError("");
    try {
      await deletePlayer(player.id);
      setPlayers((list) => list?.filter((candidate) => candidate.id !== player.id) ?? null);
    } catch (err) {
      setError(`${player.name}: ${errorMessage(err, "the account could not be removed.")}`);
    } finally {
      setBusy(null);
    }
  };

  const waiting = players?.filter((player) => !player.approved).length ?? 0;

  return (
    <section id="players" aria-labelledby="players-heading" className="panel scroll-mt-6 p-5 sm:p-6">
      <h2 id="players-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Players
        {players && players.length > 0 && (
          <span className="ml-2 text-sm font-normal text-[#c9b78f]">
            {players.length} total{waiting ? ` · ${waiting} waiting` : ""}
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">
        Players ask to join at{" "}
        <Link to="/players" className="underline underline-offset-2 hover:text-[#f4e6c3]">
          /players
        </Link>{" "}
        and claim a hero. Once approved, a player can write that hero's backstory and post updates to their page, and
        nothing else. A hero has one approved player at most.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}
      {!players && !error && <div className="skeleton mt-4 h-24 rounded" />}

      {players &&
        (players.length ? (
          <ul className="mt-4 divide-y divide-[#f2c14e]/10">
            {players.map((player) => (
              <li key={player.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex items-center gap-2">
                    <span className="truncate text-[#f4e6c3]">{player.name}</span>
                    {!player.approved && (
                      <span className="shrink-0 rounded-sm bg-[#7d150c]/60 px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wider text-[#ffcfb8]">
                        Waiting
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[#c9b78f]">
                    {player.email} · joined {formatDate(player.created)}
                  </p>
                </div>
                <select
                  aria-label={`The hero ${player.name} plays`}
                  value={player.hero}
                  disabled={busy === player.id}
                  onChange={(e) => change(player, { hero: e.target.value })}
                  className="field !w-full !py-1.5 sm:!w-60"
                >
                  <option value="">No hero</option>
                  {heroes.map((hero) => (
                    <option key={hero.id} value={hero.id}>
                      {heroChoiceLabel(hero)}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  {player.approved ? (
                    <button
                      type="button"
                      onClick={() => change(player, { approved: false })}
                      disabled={busy === player.id}
                      className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]"
                      title="Stop them writing for their hero"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => change(player, { approved: true })}
                      disabled={busy === player.id || !player.hero}
                      className="btn btn-gold !px-3 !py-1 !text-[0.7rem]"
                      title={player.hero ? "Let them write for their hero" : "Give them a hero first"}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(player)}
                    disabled={busy === player.id}
                    className="btn btn-danger !px-3 !py-1 !text-[0.7rem]"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[#c9b78f]">No one has asked to join yet.</p>
        ))}
    </section>
  );
}
