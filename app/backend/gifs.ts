import { GIF_MAX_BYTES, giphyRequestUrl, isGiphyMedia, megabytes, shapeGifs } from "../lib/chatImages";
import type { GifResult, GifSettings } from "../types/chat";

/**
 * GIF search: the only file that talks to GIPHY. GIPHY asks that its search
 * be called from the browser, so the page does, with the key PocketBase hands
 * approved players and DMs (the chat config route). Nothing reaches GIPHY
 * once a GIF is sent: it's uploaded to the chat server like any picture.
 *
 * No referrer goes with any of it, so GIPHY never sees which room was open.
 */

export async function searchGifs(
  gifs: GifSettings,
  query: string,
  offset: number,
  signal?: AbortSignal
): Promise<{ gifs: GifResult[]; next: number | null }> {
  let response: Response;
  try {
    response = await fetch(giphyRequestUrl({ key: gifs.key, rating: gifs.rating, query, offset }), {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") throw error;
    throw new Error("GIF search isn't answering. Try again in a little while.");
  }
  if (response.status === 429) throw new Error("GIF search is busy: it allows 100 searches an hour. Try again later.");
  if (!response.ok) throw new Error("GIF search isn't answering. Try again in a little while.");
  return shapeGifs(await response.json(), query);
}

/** Downloads a GIF the picker chose, from GIPHY's media hosts only. */
export async function downloadGif(url: string): Promise<Blob> {
  if (!isGiphyMedia(url)) throw new Error("That GIF isn't from GIPHY.");
  const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error("That GIF couldn't be downloaded.");
  const blob = await response.blob();
  if (blob.size > GIF_MAX_BYTES) throw new Error(`That GIF is over ${megabytes(GIF_MAX_BYTES)}.`);
  return blob;
}
