import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/dmPantheonEditor";
import {
  cardArtUrl,
  createPantheon,
  deletePantheon,
  errorMessage,
  getPantheonById,
  isDungeonMaster,
  updatePantheon,
} from "../backend/api";
import LoreMarkdown from "../components/LoreMarkdown";
import PantheonCard from "../components/PantheonCard";
import { tryMakeCardArt } from "../lib/cardArt";
import { ATTRIBUTE_ORDER, ATTRIBUTES, autoSummary } from "../lib/lore";
import { RANK_ORDER, RANKS } from "../lib/pantheon";
import type { LoreAttribute } from "../types/lore";
import type { PantheonMember, PantheonRank } from "../types/pantheon";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit Pantheon — Phantos" }, { name: "robots", content: "noindex" }];
}

interface Draft {
  name: string;
  slug: string;
  rank: PantheonRank;
  attribute: LoreAttribute;
  /** A Greater Dragon's other parent element; "" for a single element. */
  second: LoreAttribute | "";
  domain: string;
  summary: string;
  content: string;
  published: boolean;
}

const EMPTY: Draft = {
  name: "",
  slug: "",
  rank: "other",
  attribute: "light",
  second: "",
  domain: "",
  summary: "",
  content: "",
  published: true,
};

export default function DmPantheonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [record, setRecord] = useState<PantheonMember | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(isNew ? "ready" : "loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

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
    getPantheonById(id)
      .then((member) => {
        if (cancelled) return;
        setRecord(member);
        setDraft({
          name: member.name,
          slug: member.slug,
          rank: member.rank,
          attribute: member.attributes[0] ?? "light",
          second: member.attributes[1] ?? "",
          domain: member.domain,
          summary: member.summary,
          content: member.content,
          published: member.published,
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

  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const attributes: LoreAttribute[] =
    draft.second && draft.second !== draft.attribute ? [draft.attribute, draft.second] : [draft.attribute];

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const data = new FormData();
    data.append("name", draft.name.trim());
    data.append("slug", draft.slug.trim());
    data.append("rank", draft.rank);
    for (const attribute of attributes) data.append("attributes", attribute);
    data.append("domain", draft.domain.trim());
    data.append("summary", draft.summary.trim());
    data.append("content", draft.content);
    data.append("published", String(draft.published));
    if (imageFile) {
      data.append("image", imageFile);
      // The small copy the cards load; the full image stays for this page.
      const cardArt = await tryMakeCardArt(imageFile);
      if (cardArt) data.append("card_art", cardArt);
    } else if (removeImage) {
      data.append("image", "");
      data.append("card_art", "");
    }

    try {
      const saved = isNew ? await createPantheon(data) : await updatePantheon(id!, data);
      setDirty(false);
      navigate(`/pantheon/${saved.slug}`);
    } catch (err) {
      setError(errorMessage(err, "The member could not be saved."));
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!record) return;
    if (!window.confirm(`Remove ${record.name} from the pantheon? Lore that refers to them stays, without the link. This can't be undone.`)) return;
    setSaving(true);
    try {
      await deletePantheon(record.id);
      setDirty(false);
      navigate("/pantheon");
    } catch (err) {
      setError(errorMessage(err, "The member could not be removed."));
      setSaving(false);
    }
  };

  if (status === "missing") {
    return (
      <main className="mx-auto max-w-xl px-4 pt-24 text-center">
        <h1 className="font-heading text-3xl font-bold gold-text">No such member</h1>
        <Link to="/pantheon" className="btn btn-gold mt-8">
          Back to the pantheon
        </Link>
      </main>
    );
  }

  const existingImage = record?.image && !removeImage ? cardArtUrl(record, record.image, record.card_art) : "";
  const previewMember = {
    ...draft,
    attributes,
    id: record?.id,
    collectionId: record?.collectionId,
    slug: draft.slug || record?.slug,
    image: imageFile ? "pending" : removeImage ? "" : record?.image ?? "",
    summary: draft.summary || autoSummary(draft.content),
  };

  return (
    <main className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/pantheon" className="text-sm text-[#c9b78f] hover:text-[#f4e6c3]">
            ← The Pantheon
          </Link>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[#f4e6c3] sm:text-4xl">
            {isNew ? "New Pantheon Member" : "Edit Pantheon Member"}
          </h1>
        </div>
        {record && (
          <Link to={`/pantheon/${record.slug}`} className="btn btn-ghost">
            View member
          </Link>
        )}
      </div>

      {status === "loading" ? (
        <div className="skeleton mt-8 h-[36rem] rounded-xl" />
      ) : (
        <form onSubmit={onSave} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="panel space-y-5 p-5 sm:p-6">
            <div>
              <label htmlFor="member-name" className="field-label">
                Name
              </label>
              <input
                id="member-name"
                required
                maxLength={120}
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                className="field font-card !text-xl"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="member-rank" className="field-label">
                  Rank (card frame)
                </label>
                <select
                  id="member-rank"
                  value={draft.rank}
                  onChange={(e) => set("rank", e.target.value as PantheonRank)}
                  className="field"
                >
                  {RANK_ORDER.map((rank) => (
                    <option key={rank} value={rank}>
                      {RANKS[rank].label} — {RANKS[rank].description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="member-domain" className="field-label">
                  Domain <span className="normal-case tracking-normal opacity-70">(optional)</span>
                </label>
                <input
                  id="member-domain"
                  maxLength={80}
                  value={draft.domain}
                  onChange={(e) => set("domain", e.target.value)}
                  placeholder="e.g. Lightning, Night"
                  className="field"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="member-attribute" className="field-label">
                  Element
                </label>
                <select
                  id="member-attribute"
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
              <div>
                <label htmlFor="member-second" className="field-label">
                  Second element <span className="normal-case tracking-normal opacity-70">(for a child of two)</span>
                </label>
                <select
                  id="member-second"
                  value={draft.second}
                  onChange={(e) => set("second", e.target.value as LoreAttribute | "")}
                  className="field"
                >
                  <option value="">None</option>
                  {ATTRIBUTE_ORDER.filter((a) => a !== draft.attribute).map((a) => (
                    <option key={a} value={a}>
                      {ATTRIBUTES[a].glyph} {ATTRIBUTES[a].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="member-slug" className="field-label">
                URL name <span className="normal-case tracking-normal opacity-70">(optional)</span>
              </label>
              <input
                id="member-slug"
                maxLength={200}
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="made from the name"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="member-summary" className="field-label">
                Card text <span className="normal-case tracking-normal opacity-70">(optional — defaults to the opening lines)</span>
              </label>
              <textarea
                id="member-summary"
                rows={2}
                maxLength={600}
                value={draft.summary}
                onChange={(e) => set("summary", e.target.value)}
                className="field"
              />
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <span className="field-label !mb-0">Description (Markdown)</span>
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
              {tab === "write" ? (
                <textarea
                  aria-label="Description"
                  rows={16}
                  value={draft.content}
                  onChange={(e) => set("content", e.target.value)}
                  placeholder={"Who they are, what they made, how they are honoured.\n\nLink to another member with [Rokesh](/pantheon/rokesh)."}
                  className="field font-mono !text-[0.9rem] leading-relaxed"
                />
              ) : (
                <div className="scroll max-h-[40rem] overflow-y-auto px-5 py-6 sm:px-8">
                  {draft.content.trim() ? (
                    <LoreMarkdown content={draft.content} title={draft.name} />
                  ) : (
                    <p className="italic text-[#5b4527]">Nothing to preview yet.</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <span className="field-label">Portrait <span className="normal-case tracking-normal opacity-70">(optional)</span></span>
              <p className="-mt-1 mb-2 text-sm text-[#c9b78f]">
                Fills the card's picture and appears above the description. Without one, the card shows its element.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]">
                  {imageFile || existingImage ? "Replace image" : "Choose image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      setImageFile(e.target.files?.[0] ?? null);
                      setRemoveImage(false);
                      setDirty(true);
                    }}
                  />
                </label>
                {imageFile && <span className="truncate text-sm text-[#c9b78f]">{imageFile.name}</span>}
                {(imageFile || existingImage) && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setRemoveImage(!!record?.image);
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
                <span className="block text-sm text-[#c9b78f]">Unpublished members are drafts only Dungeon Masters can see.</span>
              </span>
            </label>

            <p className="text-sm text-[#c9b78f]">
              Lore is linked to a member from the lore editor; linked entries appear at the bottom of the member's page.
            </p>

            {error && (
              <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-[#f2c14e]/15 pt-5">
              <button type="submit" disabled={saving} className="btn btn-gold">
                {saving && <span className="spinner" aria-hidden="true" />}
                {saving ? "Saving…" : isNew ? "Add to the pantheon" : "Save changes"}
              </button>
              <Link to={record ? `/pantheon/${record.slug}` : "/pantheon"} className="btn btn-ghost">
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
              <PantheonCard member={previewMember} imageUrl={imagePreview || existingImage || undefined} />
            </div>
          </aside>
        </form>
      )}
    </main>
  );
}
