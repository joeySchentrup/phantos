import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/dm";
import {
  deleteFeaturedImage,
  dungeonMasterEmail,
  errorMessage,
  fileUrl,
  getFeaturedImage,
  isDungeonMaster,
  listAllLoreForDm,
  onDungeonMasterChange,
  signInDungeonMaster,
  signOutDungeonMaster,
  uploadFeaturedImage,
} from "../backend/api";
import AttributeOrb from "../components/AttributeOrb";
import { CATEGORIES, formatDate } from "../lib/lore";
import type { FeaturedImage, LoreSummary } from "../types/lore";

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
        <p className="mt-4 text-[#c9b78f]">Sign in to add lore, edit entries and choose the featured image.</p>

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

function FeaturedImagePanel() {
  const [current, setCurrent] = useState<FeaturedImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const load = () =>
    getFeaturedImage()
      .then((image) => {
        setCurrent(image);
        setCaption(image?.caption ?? "");
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const clearChoice = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const onSave = async () => {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const image = await uploadFeaturedImage(file, caption);
      setCurrent(image);
      clearChoice();
      setMessage({ tone: "ok", text: "The featured image is updated on the home page." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "The image could not be uploaded.") });
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    if (!current) return;
    if (!window.confirm("Remove the current featured image? The previous one, or the six dragons, will show instead.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteFeaturedImage(current.id);
      await load();
      setMessage({ tone: "ok", text: "Featured image removed." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err, "The image could not be removed.") });
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || (current ? fileUrl(current, current.image, "960x0") : "");

  return (
    <section id="vision" aria-labelledby="vision-heading" className="panel scroll-mt-6 p-5 sm:p-6">
      <h2 id="vision-heading" className="font-heading text-xl font-bold text-[#f4e6c3]">
        Featured Image
      </h2>
      <p className="mt-1 text-sm text-[#c9b78f]">
        The hero at the top of the home page. Wide images work best; it's shown at 3:2.
      </p>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,18rem)_1fr]">
        <div className="relative aspect-[3/2] overflow-hidden rounded border-4 border-[#2b1c10] bg-black/50">
          {loading ? (
            <div className="skeleton absolute inset-0" />
          ) : shown ? (
            <img src={shown} alt={preview ? "The image you chose" : "The current featured image"} className="h-full w-full object-cover" />
          ) : (
            <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-[#c9b78f]">
              No featured image yet. The home page shows the six dragons until there is one.
            </p>
          )}
          {preview && (
            <span className="absolute left-2 top-2 rounded-sm bg-[#7d150c]/80 px-1.5 py-px text-[0.65rem] font-bold uppercase tracking-wider text-[#ffe9dc]">
              Preview
            </span>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-[#f2c14e]">
              <span className="spinner !h-8 !w-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <span className="field-label">Image</span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                {file ? "Choose another" : "Choose image"}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setMessage(null);
                  }}
                />
              </label>
              {file && (
                <>
                  <span className="min-w-0 truncate text-sm text-[#c9b78f]">{file.name}</span>
                  <button type="button" onClick={clearChoice} className="text-sm text-[#c9b78f] underline underline-offset-2 hover:text-[#f4e6c3]">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="vision-caption" className="field-label">
              Caption <span className="normal-case tracking-normal opacity-70">(optional — shown under the image)</span>
            </label>
            <textarea
              id="vision-caption"
              rows={3}
              maxLength={600}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="field text-[0.95rem] leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={onSave} disabled={busy || !file} className="btn btn-gold">
              {busy && <span className="spinner" aria-hidden="true" />}
              Set as featured image
            </button>
            {current && (
              <button type="button" onClick={onRemove} disabled={busy} className="btn btn-ghost">
                Remove current
              </button>
            )}
          </div>

          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-[#ffb3a1]" : "text-[#a8e6c8]"}`}>
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
        <FeaturedImagePanel />
        <LoreList />
      </div>
    </main>
  );
}
