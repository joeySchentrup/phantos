/**
 * Card art: the small, square copy of an image that the cards load, so the
 * lists never download a full-size photo. Full pages keep the original.
 *
 * It is made in the browser when a DM saves an image (and by the DM desk for
 * older images), because only the browser can encode WebP here — PocketBase's
 * own resizer keeps the original format.
 */

/** Side of the square copy: a ~300px card at 2× density, with a little to spare. */
export const CARD_ART_SIZE = 720;

const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

/** The centred square that the card's picture box (object-fit: cover) shows. */
export function squareCrop(width: number, height: number): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

/** Card art that predates WebP encoding (or came from PocketBase's resizer) gets re-made. */
export function isFinishedCardArt(filename: string | undefined): boolean {
  return !!filename && /\.webp$/i.test(filename);
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Crops an image to the centred square, scales it to CARD_ART_SIZE (never up),
 * and encodes it as WebP — or JPEG on a browser that can't write WebP.
 */
export async function makeCardArt(image: Blob): Promise<File> {
  const bitmap = await createImageBitmap(image);
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const size = Math.min(side, CARD_ART_SIZE);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser can't draw images.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

    let blob = await toBlob(canvas, "image/webp", WEBP_QUALITY);
    // A browser that can't write WebP quietly hands back a PNG instead.
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) throw new Error("The card art could not be encoded.");

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `card.${extension}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

/**
 * makeCardArt for a save that must go ahead regardless: an image the browser
 * can't decode just goes without card art (its cards use a thumbnail, and the
 * DM desk tries again later).
 */
export async function tryMakeCardArt(image: Blob): Promise<File | null> {
  try {
    return await makeCardArt(image);
  } catch (error) {
    console.warn("Card art could not be made:", error);
    return null;
  }
}
