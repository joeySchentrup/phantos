import { fitWithin, PHOTO_MAX_EDGE, pictureRefusal, resavedName, sniffPictureType } from "~/lib/chatImages";
import type { PreparedPicture } from "~/types/chat";

/**
 * Getting a picture ready to send, in the browser. A photo is shrunk to
 * PHOTO_MAX_EDGE and re-saved, which also drops what it carries besides the
 * picture (a phone photo carries where it was taken). A GIF goes as it is, so
 * it keeps moving: a canvas would keep only its first frame. The same canvas
 * work as card art (cardArt.ts).
 */

const WEBP_QUALITY = 0.85;
const JPEG_QUALITY = 0.85;

/** A picture that can't be sent, with the reason, to show as it is. */
export class PictureRefused extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    // Turned the way the camera held it, which re-saving then keeps.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PictureRefused("That picture couldn't be read.");
  }
}

/** A photo or GIF, checked and made ready to send. Throws PictureRefused with the reason it can't be. */
export async function preparePicture(file: Blob, name: string): Promise<PreparedPicture> {
  const type = sniffPictureType(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const refusal = pictureRefusal(type, file.size);
  if (refusal || !type) throw new PictureRefused(refusal ?? "That picture can't be sent.");

  const bitmap = await decode(file);
  try {
    if (type === "image/gif") {
      return { blob: new Blob([file], { type }), mimetype: type, width: bitmap.width, height: bitmap.height, name: resavedName(name, type) };
    }

    const size = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE, PHOTO_MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new PictureRefused("This browser can't re-save the photo, so it can't be sent.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    let blob = await toBlob(canvas, "image/webp", WEBP_QUALITY);
    // A browser that can't write WebP quietly hands back a PNG instead.
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob || (blob.type !== "image/webp" && blob.type !== "image/jpeg")) {
      throw new PictureRefused("This browser can't re-save the photo, so it can't be sent.");
    }
    const saved = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
    return { blob, mimetype: saved, width: size.width, height: size.height, name: resavedName(name, saved) };
  } finally {
    bitmap.close();
  }
}
