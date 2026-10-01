import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/dm";
import {
  dungeonMasterEmail,
  errorMessage,
  fileUrl,
  generateFeaturedImage,
  getFeaturedImage,
  getFeaturedImageConfig,
  isDungeonMaster,
  listAllLoreForDm,
  onDungeonMasterChange,
  signInDungeonMaster,
  signOutDungeonMaster,
} from "../backend/api";
import AttributeOrb from "../components/AttributeOrb";
import { CATEGORIES, formatDate } from "../lib/lore";
import type { FeaturedImage, FeaturedImageConfig, LoreSummary } from "../types/lore";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dungeon Master — Phantos" }, { name: "robots", content: "noindex" }];
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInDungeonMaster(email.trim(), password);
    } catch (err: any) {
      setError(err?.status === 400 ? "That email and password don't match a Dungeon Master." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 pt-16">
      <div className="panel p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <AttributeOrb attribute="divine" size="3rem" />
          <div>
            <p className="eyebrow">Restricted</p>
            <h1 className="font-heading text-2xl font-bold text-[#f4e6c3]">Dungeon Master</h1>
          </div>
        </div>
        <p className="mt-4 text-[#c9b78f]">Sign in to add lore, edit entries and render the featured vision.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="dm-email" className="field-label">
              Email
            </label>
            <input
              id="dm-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="dm-password" className="field-label">
              Password
            </label>
            <input
              id="dm-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>
          {error && (
            <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn btn-gold w-full">
            {busy && <span className="spinner" aria-hidden="true" />}
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function VisionPanel() {
  const [config, setConfig] = useState<FeaturedImageConfig | null>(null);
  const [current, setCurrent] = useState<FeaturedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    Promise.all([getFeaturedImageConfig(), getFeaturedImage()])
      .then(([cfg, image]) => {
        setConfig(cfg);
        setCurrent(image);
        setPrompt(image?.prompt || cfg.defaultPrompt);
      })
      .catch((err) => setMessage({ tone: "error", text: errorMessage(err, "Could not load the vision settings.") }));
  }, []);

  const onGenerate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const image = await generateFeaturedImage(prompt);
      setCurrent(image);
      setMessage({ tone: "ok", text: "A new vision has been rendered. It's now on the home page." });
    } catch (err: any) {
      // The proxy in front of the server may give up before the image is done.
      const text =
        err?.status === 0 || err?.status === 504
          ? "The request timed out, but the vision may still be forming. Refresh in a minute to check."
          : errorMessage(err, "The vision could not be rendered.");
      setMessage({ tone: "error", text });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="vision" aria-labelledby="vision-heading" className="panel scroll-mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="vision-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
          Featured Vision
        </h2>
        {config && <span className="text-xs text-[#c9b78f]">Model: {config.model}</span>}
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="relative aspect-[3/2] overflow-hidden rounded border-4 border-[#2b1c10] bg-black/50">
          {current ? (
            <img src={fileUrl(current, current.image, "960x0")} alt="The current featured vision" className="h-full w-full object-cover" />
          ) : (
            <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-[#c9b78f]">
              No vision rendered yet. The home page shows the six dragons until there is one.
            </p>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-[#f2c14e]">
              <span className="spinner !h-8 !w-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="vision-prompt" className="field-label">
            Prompt
          </label>
          <textarea
            id="vision-prompt"
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={8000}
            className="field text-[0.92rem] leading-relaxed"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={busy || !config?.configured || !prompt.trim()}
              className="btn btn-gold"
            >
              {busy && <span className="spinner" aria-hidden="true" />}
              {busy ? "Rendering… (up to a minute or two)" : "Render a new vision"}
            </button>
            {config && prompt !== config.defaultPrompt && (
              <button type="button" onClick={() => setPrompt(config.defaultPrompt)} className="text-sm text-[#c9b78f] underline underline-offset-2 hover:text-[#f4e6c3]">
                Reset to the default prompt
              </button>
            )}
          </div>
          {config && !config.configured && (
            <p className="mt-3 text-sm text-[#ffcfb8]">
              Image generation is off: set <code className="rounded bg-black/40 px-1">OPENAI_API_KEY</code> on the server to enable it.
            </p>
          )}
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 text-sm ${message.tone === "error" ? "text-[#ffb3a1]" : "text-[#a8e6c8]"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function LoreList() {
  const [items, setItems] = useState<(LoreSummary & { updated: string })[] | null>(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    listAllLoreForDm()
      .then(setItems)
      .catch((err) => setError(errorMessage(err, "Could not load the archive.")));
  }, []);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!items || !needle) return items ?? [];
    return items.filter((item) => `${item.title} ${item.author} ${item.category}`.toLowerCase().includes(needle));
  }, [items, filter]);

  const drafts = items?.filter((item) => !item.published).length ?? 0;

  return (
    <section aria-labelledby="entries-heading" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="entries-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
          Entries
          {items && (
            <span className="ml-2 text-sm font-normal text-[#c9b78f]">
              {items.length} total{drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""}
            </span>
          )}
        </h2>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter entries…"
          aria-label="Filter entries"
          className="field !w-full !py-1.5 sm:!w-64"
        />
      </div>

      {error && <p className="mt-4 text-[#ffb3a1]">{error}</p>}
      {!items && !error && <div className="skeleton mt-4 h-64 rounded" />}

      {items && (
        <ul className="mt-4 divide-y divide-[#f2c14e]/10">
          {visible.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <span className="frame-swatch" data-frame={item.category} title={CATEGORIES[item.category].label} />
              <Link to={`/lore/${item.slug}`} className="min-w-0 flex-1 truncate text-[#f4e6c3] hover:text-[#fff2b0]">
                {item.title}
              </Link>
              {!item.published && (
                <span className="rounded-sm bg-[#7d150c]/60 px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wider text-[#ffcfb8]">
                  Draft
                </span>
              )}
              <span className="hidden w-28 shrink-0 text-right text-xs text-[#c9b78f] sm:block">{formatDate(item.updated)}</span>
              <Link to={`/dm/lore/${item.id}`} className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]">
                Edit
              </Link>
            </li>
          ))}
          {!visible.length && <li className="py-6 text-center text-[#c9b78f]">No entries match.</li>}
        </ul>
      )}
    </section>
  );
}

export default function DungeonMaster() {
  // "unknown" until the auth store has been read, so a signed-in DM never
  // sees the sign-in form flash past.
  const [auth, setAuth] = useState<"unknown" | "guest" | "dm">("unknown");

  useEffect(() => {
    const sync = () => setAuth(isDungeonMaster() ? "dm" : "guest");
    sync();
    return onDungeonMasterChange(sync);
  }, []);

  if (auth === "unknown") return <main className="min-h-[50vh]" />;
  if (auth === "guest") return <SignIn />;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Dungeon Master</p>
          <h1 className="font-heading mt-1 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">The DM's Desk</h1>
          <p className="mt-1 text-sm text-[#c9b78f]">Signed in as {dungeonMasterEmail()}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dm/lore/new" className="btn btn-gold">
            + New Lore
          </Link>
          <button type="button" onClick={signOutDungeonMaster} className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <VisionPanel />
        <LoreList />
      </div>
    </main>
  );
}
