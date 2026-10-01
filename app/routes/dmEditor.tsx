import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/dmEditor";
import {
  createLore,
  deleteLore,
  errorMessage,
  fileUrl,
  getLoreById,
  isDungeonMaster,
  listPantheon,
  updateLore,
} from "../backend/api";
import LoreCard from "../components/LoreCard";
import LoreMarkdown from "../components/LoreMarkdown";
import PantheonPicker from "../components/PantheonPicker";
import YearField from "../components/YearField";
import {
  ATTRIBUTE_ORDER,
  ATTRIBUTES,
  autoSummary,
  CATEGORIES,
  CATEGORY_ORDER,
  estimateWords,
  titleFromFilename,
} from "../lib/lore";
import type { LoreAttribute, LoreCategory, LoreEntry } from "../types/lore";
import type { PantheonSummary } from "../types/pantheon";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit Lore — Phantos" }, { name: "robots", content: "noindex" }];
}

interface Draft {
  title: string;
  slug: string;
  category: LoreCategory;
  attribute: LoreAttribute;
  author: string;
  summary: string;
  content: string;
  published: boolean;
  year: number;
  circa: boolean;
  /** Ids of the pantheon members this entry refers to. */
  pantheon: string[];
}

const EMPTY: Draft = {
  title: "",
  slug: "",
  category: "tale",
  attribute: "light",
  author: "",
  summary: "",
  content: "",
  published: true,
  year: 0,
  circa: false,
  pantheon: [],
};

export default function DmEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [record, setRecord] = useState<LoreEntry | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pantheon, setPantheon] = useState<PantheonSummary[]>([]);
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
    getLoreById(id)
      .then((lore) => {
        if (cancelled) return;
        setRecord(lore);
        setDraft({
          title: lore.title,
          slug: lore.slug,
          category: lore.category,
          attribute: lore.attribute,
          author: lore.author,
          summary: lore.summary,
          content: lore.content,
          published: lore.published,
          year: lore.year,
          circa: lore.circa,
          pantheon: lore.pantheon ?? [],
        });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("missing"));
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  useEffect(() => {
    listPantheon()
      .then(setPantheon)
      .catch(() => setPantheon([]));
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : ""), [coverFile]);
  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    setDraft((current) => ({
      ...current,
      content: text,
      title: current.title || titleFromFilename(file.name),
    }));
    setDirty(true);
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData();
    data.append("title", draft.title.trim());
    data.append("slug", draft.slug.trim());
    data.append("category", draft.category);
    data.append("attribute", draft.attribute);
    data.append("author", draft.author.trim());
    data.append("summary", draft.summary.trim());
    data.append("content", draft.content);
    data.append("published", String(draft.published));
    data.append("year", String(draft.year));
    data.append("circa", String(draft.circa && draft.year !== 0));
    // An empty value clears the links; otherwise one value for each member.
    if (!draft.pantheon.length) data.append("pantheon", "");
    for (const memberId of draft.pantheon) data.append("pantheon", memberId);
    if (coverFile) data.append("cover", coverFile);
    else if (removeCover) data.append("cover", "");

    try {
      const saved = isNew ? await createLore(data) : await updateLore(id!, data);
      setDirty(false);
      navigate(`/lore/${saved.slug}`);
    } catch (err) {
      setError(errorMessage(err, "The entry could not be saved."));
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!record) return;
    if (!window.confirm(`Delete “${record.title}” from the archive? This can't be undone.`)) return;
    setSaving(true);
    try {
      await deleteLore(record.id);
      setDirty(false);
      navigate("/dm");
    } catch (err) {
      setError(errorMessage(err, "The entry could not be deleted."));
      setSaving(false);
    }
  };

  if (status === "missing") {
    return (
      <main className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-heading text-3xl font-bold gold-text">No such entry</h1>
        <Link to="/dm" className="btn btn-gold mt-8">
          Back to the desk
        </Link>
      </main>
    );
  }

  const existingCover = record?.cover && !removeCover ? fileUrl(record, record.cover, "480x0") : "";
  const previewLore = {
    ...draft,
    id: record?.id,
    collectionId: record?.collectionId,
    slug: draft.slug || record?.slug,
    cover: coverFile ? "pending" : removeCover ? "" : record?.cover ?? "",
    word_count: estimateWords(draft.content),
    created: record?.created ?? new Date().toISOString(),
    summary: draft.summary || autoSummary(draft.content),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/dm" className="text-sm text-[#c9b78f] hover:text-[#f4e6c3]">
            ← The DM's Desk
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">
            {isNew ? "New Lore" : "Edit Lore"}
          </h1>
        </div>
        {record && (
          <Link to={`/lore/${record.slug}`} className="btn btn-ghost">
            View entry
          </Link>
        )}
      </div>

      {status === "loading" ? (
        <div className="skeleton mt-8 h-[36rem] rounded-xl" />
      ) : (
        <form onSubmit={onSave} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="panel space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="lore-title" className="field-label">
                Title
              </label>
              <input
                id="lore-title"
                required
                maxLength={300}
                value={draft.title}
                onChange={(e) => set("title", e.target.value)}
                className="field font-card !text-xl"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="lore-category" className="field-label">
                  Card frame
                </label>
                <select
                  id="lore-category"
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value as LoreCategory)}
                  className="field"
                >
                  {CATEGORY_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIES[c].label} — {CATEGORIES[c].description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lore-attribute" className="field-label">
                  Attribute
                </label>
                <select
                  id="lore-attribute"
                  value={draft.attribute}
                  onChange={(e) => set("attribute", e.target.value as LoreAttribute)}
                  className="field"
                >
                  {ATTRIBUTE_ORDER.map((a) => (
                    <option key={a} value={a}>
                      {ATTRIBUTES[a].glyph} {ATTRIBUTES[a].label} ({ATTRIBUTES[a].dragon})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="lore-author" className="field-label">
                  Voice / author <span className="normal-case tracking-normal opacity-70">(optional)</span>
                </label>
                <input
                  id="lore-author"
                  maxLength={200}
                  value={draft.author}
                  onChange={(e) => set("author", e.target.value)}
                  placeholder="e.g. Rokesh, Krase Frain"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="lore-slug" className="field-label">
                  URL name <span className="normal-case tracking-normal opacity-70">(optional)</span>
                </label>
                <input
                  id="lore-slug"
                  maxLength={200}
                  value={draft.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="made from the title"
                  className="field"
                />
              </div>
            </div>

            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
              <YearField
                id="lore-year"
                label={<>In-universe date <span className="normal-case tracking-normal opacity-70">(optional)</span></>}
                year={draft.year}
                onChange={(year) => set("year", year)}
                placeholder="e.g. 307"
              />
              <label className="flex cursor-pointer items-center gap-3 sm:pt-6">
                <input
                  type="checkbox"
                  checked={draft.circa}
                  onChange={(e) => set("circa", e.target.checked)}
                  className="h-5 w-5 accent-[#f2c14e]"
                />
                <span className="text-[#f4e6c3]">Circa: the year is approximate</span>
              </label>
              <p className="text-sm text-[#c9b78f] sm:col-span-2">
                The year puts this entry on the Chronicle. Leave it blank to keep the entry off the timeline.
              </p>
            </div>

            <div>
              <label htmlFor="lore-summary" className="field-label">
                Card text <span className="normal-case tracking-normal opacity-70">(optional — defaults to the opening lines)</span>
              </label>
              <textarea
                id="lore-summary"
                rows={2}
                maxLength={600}
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
                className="field"
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <span className="field-label !mb-0">Document (Markdown)</span>
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
                  aria-label="Document"
                  rows={22}
                  value={draft.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder={"# A heading\n\nWrite the lore in Markdown — headings, **bold**, tables and footnotes[^1] all work.\n\n[^1]: Like this."}
                  className="field font-mono !text-[0.9rem] leading-relaxed"
                />
              ) : (
                <div className="scroll max-h-[40rem] overflow-y-auto px-5 py-6 sm:px-8">
                  {draft.content.trim() ? (
                    <LoreMarkdown content={draft.content} title={draft.title} />
                  ) : (
                    <p className="italic text-[#5b4527]">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <span className="field-label">Card art <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <p className="-mt-1 mb-2 text-sm text-[#c9b78f]">
                Fills the card's picture and appears above the text, opening full size on click. Use it for illustrations or maps. Without one, the card shows its element's emblem.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                  {coverFile || existingCover ? "Replace image" : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setCoverFile(e.target.files?.[0] ?? null);
                      setRemoveCover(false);
                      setDirty(true);
                    }}
                  />
                </label>
                {coverFile && <span className="truncate text-sm text-[#c9b78f]">{coverFile.name}</span>}
                {(coverFile || existingCover) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setRemoveCover(!!record?.cover);
                      setDirty(true);
                    }}
                    className="text-sm text-[#ffb3a1] underline underline-offset-2"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="field-label">Pantheon <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <p className="-mt-1 mb-2 text-sm text-[#c9b78f]">
                The members this entry refers to. They are listed under the document, and the entry appears on each
                member's page.
              </p>
              <PantheonPicker members={pantheon} selected={draft.pantheon} onChange={(ids) => set("pantheon", ids)} />
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
                <span className="block text-sm text-[#c9b78f]">Unpublished entries are drafts only Dungeon Masters can see.</span>
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
                {saving ? "Saving…" : isNew ? "Add to the archive" : "Save changes"}
              </button>
              <Link to={record ? `/lore/${record.slug}` : "/dm"} className="btn btn-ghost">
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
              <LoreCard lore={previewLore} coverUrl={coverPreview || existingCover || undefined} />
            </div>
          </aside>
        </form>
      )}
    </main>
  );
}
