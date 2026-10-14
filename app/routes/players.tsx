import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/players";
import {
  currentPlayer,
  errorMessage,
  isDungeonMaster,
  listHeroes,
  onPlayerChange,
  refreshPlayer,
  signInPlayer,
  signOutPlayer,
  signUpPlayer,
} from "../backend/api";
import AttributeOrb from "../components/AttributeOrb";
import { sortHeroes } from "../lib/heroes";
import { heroChoiceLabel, PASSWORD_MIN_LENGTH } from "../lib/players";
import type { HeroSummary } from "../types/hero";
import type { Player } from "../types/player";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Players — Phantos" }, { name: "robots", content: "noindex" }];
}

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
      {message}
    </p>
  );
}

/** Asks to join: an account that waits for the DM, with the hero it claims. */
function JoinForm({ onSignIn }: { onSignIn: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hero, setHero] = useState("");
  /** The party; null while loading. */
  const [heroes, setHeroes] = useState<HeroSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listHeroes()
      .then((list) => setHeroes(sortHeroes(list)))
      .catch((err) => {
        setHeroes([]);
        setError(errorMessage(err, "The heroes could not be loaded."));
      });
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signUpPlayer({ name, email, password, hero });
    } catch (err: any) {
      const fields = err?.response?.data ?? {};
      setError(
        fields.email?.code === "validation_not_unique"
          ? "That email already has an account. Sign in instead."
          : errorMessage(err, "Your account could not be made.")
      );
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="join-name" className="field-label">
          Your name
        </label>
        <input
          id="join-name"
          autoComplete="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="join-email" className="field-label">
          Email
        </label>
        <input
          id="join-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="join-password" className="field-label">
          Password <span className="normal-case tracking-normal opacity-70">({PASSWORD_MIN_LENGTH} characters at least)</span>
        </label>
        <input
          id="join-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="join-hero" className="field-label">
          The hero you play
        </label>
        {heroes === null ? (
          <div className="skeleton h-11 rounded" />
        ) : heroes.length ? (
          <select id="join-hero" required value={hero} onChange={(e) => setHero(e.target.value)} className="field">
            <option value="" disabled>
              Choose your hero…
            </option>
            {heroes.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {heroChoiceLabel(candidate)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-[#c9b78f]">There are no heroes in the party yet. The Dungeon Master adds each hero first.</p>
        )}
      </div>
      <p className="text-sm text-[#c9b78f]">
        The Dungeon Master approves every player. Once you're approved, you can write your hero's backstory and post
        updates to their page.
      </p>
      <FormError message={error} />
      <button type="submit" disabled={busy || !heroes?.length} className="btn btn-gold w-full">
        {busy && <span className="spinner" aria-hidden="true" />}
        {busy ? "Asking…" : "Ask to join"}
      </button>
      <p className="text-center text-sm text-[#c9b78f]">
        Already joined?{" "}
        <button type="button" onClick={onSignIn} className="underline underline-offset-2 hover:text-[#f4e6c3]">
          Sign in
        </button>
      </p>
    </form>
  );
}

function SignInForm({ onJoin }: { onJoin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInPlayer(email, password);
    } catch (err: any) {
      setError(err?.status === 400 ? "That email and password don't match a player." : errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="player-email" className="field-label">
          Email
        </label>
        <input
          id="player-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
      </div>
      <div>
        <label htmlFor="player-password" className="field-label">
          Password
        </label>
        <input
          id="player-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field"
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={busy} className="btn btn-gold w-full">
        {busy && <span className="spinner" aria-hidden="true" />}
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[#c9b78f]">
        New to the table?{" "}
        <button type="button" onClick={onJoin} className="underline underline-offset-2 hover:text-[#f4e6c3]">
          Ask to join
        </button>
      </p>
    </form>
  );
}

/** Where a signed-in player stands: waiting for the DM, or free to write for their hero. */
function Standing({ player }: { player: Player }) {
  const [checking, setChecking] = useState(false);
  const hero = player.expand?.hero;

  const checkAgain = async () => {
    setChecking(true);
    await refreshPlayer(true);
    setChecking(false);
  };

  return (
    <>
      <div className="mt-6 space-y-3 text-[#e9dbb8]">
        {!player.approved ? (
          <>
            <p>
              You're waiting for the Dungeon Master to approve you as the player of{" "}
              {hero ? <strong className="text-[#f4e6c3]">{hero.name}</strong> : "your hero"}.
            </p>
            <p className="text-sm text-[#c9b78f]">
              Once they do, you can write your hero's backstory and post updates to their page.
            </p>
          </>
        ) : hero ? (
          <p>
            You play <strong className="text-[#f4e6c3]">{hero.name}</strong>. Write their backstory and post updates
            on their page.
          </p>
        ) : (
          <p>You don't have a hero in the party right now. The Dungeon Master can give you one.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {player.approved && hero && (
          <Link to={`/heroes/${hero.slug}`} className="btn btn-gold flex-1">
            Go to {hero.name}
          </Link>
        )}
        {!player.approved && (
          <button type="button" onClick={checkAgain} disabled={checking} className="btn btn-gold flex-1">
            {checking && <span className="spinner" aria-hidden="true" />}
            Check again
          </button>
        )}
        <button type="button" onClick={signOutPlayer} className="btn btn-ghost">
          Sign out
        </button>
      </div>
    </>
  );
}

type Visitor = { kind: "unknown" } | { kind: "guest" } | { kind: "dm" } | { kind: "player"; player: Player };

export default function Players() {
  // "unknown" until the auth store has been read, so a signed-in player never
  // sees the forms flash past.
  const [visitor, setVisitor] = useState<Visitor>({ kind: "unknown" });
  const [mode, setMode] = useState<"join" | "sign-in">("join");

  useEffect(() => {
    const sync = () => {
      const player = currentPlayer();
      setVisitor(player ? { kind: "player", player } : isDungeonMaster() ? { kind: "dm" } : { kind: "guest" });
    };
    sync();
    refreshPlayer();
    return onPlayerChange(sync);
  }, []);

  if (visitor.kind === "unknown") return <main className="min-h-[50vh]" />;

  const heading =
    visitor.kind === "player" ? visitor.player.name : visitor.kind === "dm" ? "Players" : mode === "join" ? "Join the party" : "Sign in";

  return (
    <main className="mx-auto max-w-md px-4 pt-16">
      <div className="panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <AttributeOrb attribute="fire" size="3rem" />
          <div className="min-w-0">
            <p className="eyebrow">{visitor.kind === "player" ? "Player" : "The Party"}</p>
            <h1 className="font-heading truncate text-2xl font-bold text-[#f4e6c3]">{heading}</h1>
          </div>
        </div>

        {visitor.kind === "player" && (
          <>
            <p className="mt-2 truncate text-sm text-[#c9b78f]">Signed in as {visitor.player.email}</p>
            <Standing player={visitor.player} />
          </>
        )}

        {visitor.kind === "dm" && (
          <>
            <p className="mt-4 text-[#c9b78f]">
              You're signed in as a Dungeon Master. Players ask to join here and claim their hero; you approve them on
              the desk.
            </p>
            <Link to="/dm#players" className="btn btn-gold mt-6 w-full">
              The players on the desk
            </Link>
          </>
        )}

        {visitor.kind === "guest" && (
          <>
            <p className="mt-4 text-[#c9b78f]">
              {mode === "join"
                ? "Playing in the campaign? Make an account and claim your hero, and keep their story here."
                : "Sign in to write your hero's backstory and post their updates."}
            </p>
            {mode === "join" ? <JoinForm onSignIn={() => setMode("sign-in")} /> : <SignInForm onJoin={() => setMode("join")} />}
          </>
        )}
      </div>
    </main>
  );
}
