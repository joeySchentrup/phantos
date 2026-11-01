import type { GifResult, PictureType } from "~/types/chat";

/**
 * Chat pictures' rules that don't need a browser or a server: which pictures
 * are sent and shown, their limits, their size on screen, where they are on
 * the chat server, and GIPHY's addresses and answers.
 */

/** The same as the site's other uploads (IMAGE_EXTENSIONS in pb_hooks/phantos/lib.js). Never SVG. */
export const PICTURE_TYPES: PictureType[] = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** A photo is shrunk and re-saved, so it may be big to begin with; a GIF is sent as it is. */
export const PHOTO_MAX_BYTES = 20 * 1024 * 1024;
export const GIF_MAX_BYTES = 15 * 1024 * 1024;
/** A photo's long edge after shrinking. */
export const PHOTO_MAX_EDGE = 2048;
/** The thumbnail the conversation asks for: SHOWN_MAX at 2× density, with a little to spare. */
export const THUMBNAIL = { width: 800, height: 600 };
/** The largest a picture shows in the conversation, in CSS pixels. */
export const SHOWN_MAX = { width: 320, height: 240 };

function startsWith(bytes: Uint8Array, signature: number[], at = 0): boolean {
  return signature.every((byte, i) => bytes[at + i] === byte);
}

/**
 * What a picture is, from its first bytes: never from its name or the type
 * its sender claimed, so a file dressed up as a picture is neither sent nor
 * shown. Null for anything else (SVG included).
 */
export function sniffPictureType(bytes: Uint8Array): PictureType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return "image/gif";
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export function isPictureType(type: unknown): type is PictureType {
  return PICTURE_TYPES.includes(type as PictureType);
}

/** "15 MB". */
export function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Why a picture of this type and size can't be sent, or null when it can. */
export function pictureRefusal(type: PictureType | null, size: number): string | null {
  if (!type) return "Only PNG, JPEG, WebP and GIF pictures can be sent.";
  if (type === "image/gif" && size > GIF_MAX_BYTES) {
    return `That GIF is ${megabytes(size)}. GIFs can be ${megabytes(GIF_MAX_BYTES)} at most.`;
  }
  if (type !== "image/gif" && size > PHOTO_MAX_BYTES) {
    return `That picture is ${megabytes(size)}. Pictures can be ${megabytes(PHOTO_MAX_BYTES)} at most.`;
  }
  return null;
}

/** A width and height scaled down, never up, to fit within a box. Whole pixels, 1 at least. */
export function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** A photo's file name once it has been re-saved: the same name, with the new type's extension. */
export function resavedName(name: string, type: PictureType): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, "").trim() || "picture";
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" }[type];
  return `${base}.${extension}`;
}

/** An `mxc://server/media-id` address, taken apart; null for anything else. */
export function parseMxc(url: unknown): { server: string; mediaId: string } | null {
  const match = /^mxc:\/\/([A-Za-z0-9.-]+(?::\d{1,5})?)\/([A-Za-z0-9_-]+)$/.exec(String(url ?? ""));
  return match ? { server: match[1], mediaId: match[2] } : null;
}

/**
 * Where to fetch a picture from the chat server, with the session's token
 * (its media needs one): a thumbnail for the conversation (animated, so GIFs
 * move), or the whole file for the viewer.
 */
export function mediaUrl(homeserver: string, mxc: string, kind: "thumbnail" | "download"): string | null {
  const parsed = parseMxc(mxc);
  if (!parsed) return null;
  const base = `${homeserver.replace(/\/+$/, "")}/_matrix/client/v1/media/${kind}/${encodeURIComponent(parsed.server)}/${encodeURIComponent(parsed.mediaId)}`;
  if (kind === "download") return base;
  return `${base}?width=${THUMBNAIL.width}&height=${THUMBNAIL.height}&method=scale&animated=true`;
}

/** A picture's caption (Matrix 1.10, MSC2530): its `body`, when that isn't just its file name. */
export function pictureCaption(body: unknown, filename: unknown): string {
  const text = typeof body === "string" ? body.trim() : "";
  if (typeof filename !== "string" || !filename) return "";
  return text === filename.trim() ? "" : text;
}

// ---------------------------------------------------------------------------
// GIPHY
// ---------------------------------------------------------------------------

/** The page asks GIPHY this many at a time. A beta key allows 50 at most. */
export const GIF_PAGE = 24;
/** How far GIPHY lets you page: search, and trending. */
const SEARCH_OFFSET_MAX = 4999;
const TRENDING_OFFSET_MAX = 499;
const QUERY_MAX = 50;

/** Whether an address is one of GIPHY's media hosts: media.giphy.com, media0–9.giphy.com or i.giphy.com, over https. */
export function isGiphyMedia(url: unknown): boolean {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "https:" && /^(media\d?|i)\.giphy\.com$/.test(parsed.hostname);
  } catch {
    return false;
  }
}

/** GIPHY's search for a query, or what's trending while it's empty. */
export function giphyRequestUrl(options: { key: string; rating: string; query: string; offset: number }): string {
  const query = options.query.trim().slice(0, QUERY_MAX);
  const params = new URLSearchParams({
    api_key: options.key,
    limit: String(GIF_PAGE),
    offset: String(Math.max(0, Math.floor(options.offset))),
    rating: options.rating,
  });
  if (query) {
    params.set("q", query);
    params.set("lang", "en");
  }
  return `https://api.giphy.com/v1/gifs/${query ? "search" : "trending"}?${params}`;
}

type Rendition = { url?: unknown; width?: unknown; height?: unknown; size?: unknown };

function rendition(value: Rendition | undefined) {
  const width = Number(value?.width);
  const height = Number(value?.height);
  const size = Number(value?.size);
  if (!value || !isGiphyMedia(value.url) || !(width > 0) || !(height > 0)) return null;
  return { url: String(value.url), width, height, size: size > 0 ? size : 0 };
}

/**
 * GIPHY's answer as the picker shows it: a small preview of each GIF, and the
 * copy to send (the original if it's within GIF_MAX_BYTES, else a smaller
 * one), and the offset of the next page, or null when there's no more.
 */
export function shapeGifs(json: any, query: string): { gifs: GifResult[]; next: number | null } {
  const gifs: GifResult[] = [];
  for (const item of Array.isArray(json?.data) ? json.data : []) {
    const images = item?.images ?? {};
    const preview = rendition(images.fixed_width_downsampled) ?? rendition(images.fixed_width);
    const send = [images.original, images.downsized_medium, images.downsized]
      .map(rendition)
      .find((r) => r && r.size > 0 && r.size <= GIF_MAX_BYTES);
    if (!preview || !send || typeof item.id !== "string") continue;
    gifs.push({
      id: item.id,
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "GIF",
      preview: { url: preview.url, width: preview.width, height: preview.height },
      send,
    });
  }

  const offset = Number(json?.pagination?.offset) || 0;
  const count = Number(json?.pagination?.count) || 0;
  const total = Number(json?.pagination?.total_count) || 0;
  const next = offset + count;
  const max = query.trim() ? SEARCH_OFFSET_MAX : TRENDING_OFFSET_MAX;
  return { gifs, next: count > 0 && next < total && next <= max ? next : null };
}
