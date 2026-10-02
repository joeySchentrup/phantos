import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/dmHeroEditor";
import {
  cardArtUrl,
  createHero,
  deleteHero,
  errorMessage,
  getHeroById,
  isDungeonMaster,
  updateHero,
} from "../backend/api";
import HeroCard from "../components/HeroCard";
import LoreMarkdown from "../components/LoreMarkdown";
import { tryMakeCardArt } from "../lib/cardArt";
import { ATTRIBUTE_ORDER, ATTRIBUTES, autoSummary } from "../lib/lore";
import type { Hero } from "../types/hero";
import type { LoreAttribute } from "../types/lore";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit Hero — Phantos" }, { name: "robots", content: "noindex" }];
}

const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
];

interface Draft {
  name: string;
  slug: string;
  player: string;
  species: string;
  class: string;
  subclass: string;
  background: string;
  alignment: string;
  faith: string;
  attribute: LoreAttribute;
  summary: string;
  backstory: string;
  published: boolean;
}

const EMPTY: Draft = {
  name: "",
  slug: "",
  player: "",
  species: "",
  class: "",
  subclass: "",
  background: "",
  alignment: "",
  faith: "",
  attribute: "light",
  summary: "",
  backstory: "",
  published: true,
};

/** The short identity fields, two to a row. */
const IDENTITY: { key: keyof Draft; label: string; placeholder: string; max: number }[] = [
  { key: "player", label: "Player", placeholder: "Who plays them", max: 120 },
  { key: "species", label: "Species", placeholder: "e.g. Variant Aasimar", max: 80 },
  { key: "class", label: "Class", placeholder: "e.g. Bard", max: 80 },
  { key: "subclass", label: "Subclass", placeholder: "e.g. College of Lore", max: 80 },
  { key: "background", label: "Background", placeholder: "e.g. Acolyte", max: 80 },
  { key: "faith", label: "Faith", placeholder: "e.g. To the Gods", max: 80 },
];

export default function DmHeroEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [record, setRecord] = useState<Hero | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [removePortrait, setRemovePortrait] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  // Only DMs belong here.
  useEffect(() => {
    if (!isDungeonMaster()) navigate("/dm", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (isNew) {
      setDraft(EMPTY);
      setRecord(null);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    getHeroById(id)
      .then((hero) => {
        if (cancelled) return;
        setRecord(hero);
        setDraft({
          name: hero.name,
          slug: hero.slug,
          player: hero.player,
          species: hero.species,
          class: hero.class,
          subclass: hero.subclass,
          background: hero.background,
          alignment: hero.alignment,
          faith: hero.faith,
          attribute: hero.attribute,
          summary: hero.summary,
          backstory: hero.backstory,
          published: hero.published,
        });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const portraitPreview = useMemo(() => (portraitFile ? URL.createObjectURL(portraitFile) : ""), [portraitFile]);
  useEffect(() => () => {
    if (portraitPreview) URL.revokeObjectURL(portraitPreview);
  }, [portraitPreview]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    setDraft((current) => ({ ...current, backstory: text }));
    setDirty(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData();
    for (const key of ["name", "slug", "player", "species", "class", "subclass", "background", "alignment", "faith", "summary"] as const) {
      data.append(key, draft[key].trim());
    }
    data.append("attribute", draft.attribute);
    data.append("backstory", draft.backstory);
    data.append("published", String(draft.published));
    if (portraitFile) {
      data.append("portrait", portraitFile);
      // The small copy the cards load; the full image stays for this page.
      const cardArt = await tryMakeCardArt(portraitFile);
      if (cardArt) data.append("card_art", cardArt);
    } else if (removePortrait) {
      data.append("portrait", "");
      data.append("card_art", "");
    }

    try {
      const saved = isNew ? await createHero(data) : await updateHero(id!, data);
      setDirty(false);
      navigate(`/heroes/${saved.slug}`);
    } catch (err) {
      setError(errorMessage(err, "The hero could not be saved."));
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!record) return;
    if (!window.confirm(`Delete ${record.name} and all of their updates? This can't be undone.`)) return;
    setSaving(true);
    try {
      await deleteHero(record.id);
      setDirty(false);
      navigate("/heroes");
    } catch (err) {
      setError(errorMessage(err, "The hero could not be deleted."));
      setSaving(false);
    }
  };

  if (status === "missing") {
    return (
      <main className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-heading text-3xl font-bold gold-text">No such hero</h1>
        <Link to="/heroes" className="btn btn-gold mt-8">
          Back to the heroes
        </Link>
      </main>
    );
  }

  const existingPortrait = record?.portrait && !removePortrait ? cardArtUrl(record, record.portrait, record.card_art) : "";
  const previewHero = {
    ...draft,
    id: record?.id,
    collectionId: record?.collectionId,
    slug: draft.slug || record?.slug,
    portrait: portraitFile ? "pending" : removePortrait ? "" : record?.portrait ?? "",
    summary: draft.summary || autoSummary(draft.backstory),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/heroes" className="text-sm text-[#c9b78f] hover:text-[#f4e6c3]">
            ← The Heroes
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">
            {isNew ? "New Hero" : "Edit Hero"}
          </h1>
        </div>
        {record && (
          <Link to={`/heroes/${record.slug}`} className="btn btn-ghost">
            View hero
          </Link>
        )}
      </div>

      {status === "loading" ? (
        <div className="skeleton mt-8 h-[36rem] rounded-xl" />
      ) : (
        <form onSubmit={onSave} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="panel space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="hero-name" className="field-label">
                Name
              </label>
              <input
                id="hero-name"
                required
                maxLength={120}
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                className="field font-card !text-xl"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {IDENTITY.map(({ key, label, placeholder, max }) => (
                <div key={key}>
                  <label htmlFor={`hero-${key}`} className="field-label">
                    {label} <span className="normal-case tracking-normal opacity-70">(optional)</span>
                  </label>
                  <input
                    id={`hero-${key}`}
                    maxLength={max}
                    value={draft[key] as string}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="field"
                  />
                </div>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="hero-alignment" className="field-label">
                  Alignment
                </label>
                <input
                  id="hero-alignment"
                  list="alignments"
                  maxLength={40}
                  value={draft.alignment}
                  onChange={(e) => set("alignment", e.target.value)}
                  placeholder="e.g. Neutral Good"
                  className="field"
                />
                <datalist id="alignments">
                  {ALIGNMENTS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="hero-attribute" className="field-label">
                  Element (orb)
                </label>
                <select
                  id="hero-attribute"
                  value={draft.attribute}
                  onChange={(e) => set("attribute", e.target.value as LoreAttribute)}
                  className="field"
                >
                  {ATTRIBUTE_ORDER.map((a) => (
                    <option key={a} value={a}>
                      {ATTRIBUTES[a].glyph} {ATTRIBUTES[a].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="hero-slug" className="field-label">
                URL name <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <input
                id="hero-slug"
                maxLength={200}
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="made from the name"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="hero-summary" className="field-label">
                Card text <span className="normal-case tracking-normal opacity-70">(optional — defaults to the opening lines)</span>
              </label>
              <textarea
                id="hero-summary"
                rows={2}
                maxLength={600}
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
                className="field"
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <span className="field-label !mb-0">Backstory (Markdown)</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => importRef.current?.click()} className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]">
                    Import .md file
                  </button>
                  <input ref={importRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={onImport} className="hidden" />
                  <div role="tablist" aria-label="Editor mode" className="flex rounded-md border border-[#f2c14e]/30 p-0.5">
                    {(["write", "preview"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={tab === mode}
                        onClick={() => setTab(mode)}
                        className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          tab === mode ? "bg-[#f2c14e] text-[#2a1404]" : "text-[#c9b78f] hover:text-[#f4e6c3]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {tab === "write" ? (
                <textarea
                  aria-label="Backstory"
                  rows={18}
                  value={draft.backstory}
                  onChange={(e) => set("backstory", e.target.value)}
                  placeholder={"Where they came from and what set them on the road.\n\nLink to the lore with [Rokesh](/pantheon/rokesh)."}
                  className="field font-mono !text-[0.9rem] leading-relaxed"
                />
              ) : (
                <div className="scroll max-h-[40rem] overflow-y-auto px-5 py-6 sm:px-8">
                  {draft.backstory.trim() ? (
                    <LoreMarkdown content={draft.backstory} title={draft.name} />
                  ) : (
                    <p className="italic text-[#5b4527]">Nothing to preview yet.</p>
                  )}
                </div>
              )}
              <p className="mt-2 text-sm text-[#c9b78f]">Updates are added on the hero's own page, beneath the backstory.</p>
            </div>

            <div>
              <span className="field-label">Portrait <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <p className="-mt-1 mb-2 text-sm text-[#c9b78f]">
                Fills the card's picture and appears above the backstory. Without one, the card shows a shield on the hero's element.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                  {portraitFile || existingPortrait ? "Replace image" : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setPortraitFile(e.target.files?.[0] ?? null);
                      setRemovePortrait(false);
                      setDirty(true);
                    }}
                  />
                </label>
                {portraitFile && <span className="truncate text-sm text-[#c9b78f]">{portraitFile.name}</span>}
                {(portraitFile || existingPortrait) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPortraitFile(null);
                      setRemovePortrait(!!record?.portrait);
                      setDirty(true);
                    }}
                    className="text-sm text-[#ffb3a1] underline underline-offset-2"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => set("published", e.target.checked)}
                className="h-5 w-5 accent-[#f2c14e]"
              />
              <span>
                <span className="font-semibold text-[#f4e6c3]">Published</span>
                <span className="block text-sm text-[#c9b78f]">Unpublished heroes, and their updates, are drafts only Dungeon Masters can see.</span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-[#f2c14e]/15 pt-5">
              <button type="submit" disabled={saving} className="btn btn-gold">
                {saving && <span className="spinner" aria-hidden="true" />}
                {saving ? "Saving…" : isNew ? "Add to the party" : "Save changes"}
              </button>
              <Link to={record ? `/heroes/${record.slug}` : "/heroes"} className="btn btn-ghost">
                Cancel
              </Link>
              {record && (
                <button type="button" onClick={onDelete} disabled={saving} className="btn btn-danger ml-auto">
                  Delete
                </button>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <p className="field-label text-center">Card preview</p>
            <div className="mx-auto max-w-[16rem] lg:max-w-none">
              <HeroCard hero={previewHero} portraitUrl={portraitPreview || existingPortrait || undefined} />
            </div>
          </aside>
        </form>
      )}
    </main>
  );
}
