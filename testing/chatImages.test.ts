import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fitWithin,
  GIF_MAX_BYTES,
  giphyRequestUrl,
  isGiphyMedia,
  mediaUrl,
  parseMxc,
  PHOTO_MAX_BYTES,
  PICTURE_TYPES,
  pictureCaption,
  pictureRefusal,
  resavedName,
  shapeGifs,
  sniffPictureType,
} from "~/lib/chatImages";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("sniffPictureType", () => {
  it("knows a picture by its first bytes", () => {
    expect(sniffPictureType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffPictureType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffPictureType(bytes("GIF89a"))).toBe("image/gif");
    expect(sniffPictureType(bytes("GIF87a"))).toBe("image/gif");
    expect(sniffPictureType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
  });

  it("refuses anything else, whatever it's called", () => {
    expect(sniffPictureType(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffPictureType(bytes("<!DOCTYPE html>"))).toBeNull();
    expect(sniffPictureType(bytes("RIFF", 0, 0, 0, 0, "WAVE"))).toBeNull();
    expect(sniffPictureType(bytes("GIF90a"))).toBeNull();
    expect(sniffPictureType(new Uint8Array())).toBeNull();
  });
});

describe("picture types", () => {
  it("are the site's other uploads, less nothing and plus nothing", () => {
    // IMAGE_EXTENSIONS in the hooks: png, jpg, jpeg, jfif, webp, gif.
    const hooks = readFileSync("pb_hooks/phantos/lib.js", "utf8");
    const extensions = /const IMAGE_EXTENSIONS = \[([^\]]*)\]/.exec(hooks)![1];
    expect(extensions).toContain("'.png'");
    expect(extensions).toContain("'.webp'");
    expect(extensions).toContain("'.gif'");
    expect(PICTURE_TYPES).toEqual(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  });
});

describe("pictureRefusal", () => {
  it("lets through photos up to 20 MB and GIFs up to 15 MB", () => {
    expect(pictureRefusal("image/jpeg", PHOTO_MAX_BYTES)).toBeNull();
    expect(pictureRefusal("image/gif", GIF_MAX_BYTES)).toBeNull();
    expect(pictureRefusal("image/jpeg", PHOTO_MAX_BYTES + 1)).toMatch(/20 MB at most/);
    expect(pictureRefusal("image/gif", GIF_MAX_BYTES + 1)).toMatch(/15 MB at most/);
    expect(pictureRefusal(null, 10)).toMatch(/PNG, JPEG, WebP and GIF/);
  });
});

describe("fitWithin", () => {
  it("scales down to fit, keeping the shape, and never up", () => {
    expect(fitWithin(4000, 3000, 2048, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(1000, 4000, 320, 240)).toEqual({ width: 60, height: 240 });
    expect(fitWithin(200, 100, 320, 240)).toEqual({ width: 200, height: 100 });
    expect(fitWithin(10000, 1, 320, 240)).toEqual({ width: 320, height: 1 });
  });

  it("keeps a box for a picture whose size wasn't sent", () => {
    expect(fitWithin(0, 0, 320, 240)).toEqual({ width: 320, height: 240 });
  });
});

describe("resavedName", () => {
  it("gives a re-saved photo its new type's extension", () => {
    expect(resavedName("IMG_2041.HEIC.jpg", "image/webp")).toBe("IMG_2041.HEIC.webp");
    expect(resavedName("map", "image/jpeg")).toBe("map.jpg");
    expect(resavedName(".png", "image/webp")).toBe("picture.webp");
  });
});

describe("chat server media", () => {
  it("takes an mxc address apart, and nothing else", () => {
    expect(parseMxc("mxc://localhost:8008/zSTrWMJsZYHZiQTEmlXLlKQy")).toEqual({
      server: "localhost:8008",
      mediaId: "zSTrWMJsZYHZiQTEmlXLlKQy",
    });
    expect(parseMxc("https://example.com/a.png")).toBeNull();
    expect(parseMxc("mxc://example.com/../../admin")).toBeNull();
    expect(parseMxc("mxc://example.com/a?b")).toBeNull();
    expect(parseMxc(undefined)).toBeNull();
  });

  it("asks for an animated thumbnail for the conversation, and the file for the viewer", () => {
    const mxc = "mxc://matrix.example.com/abc_123";
    expect(mediaUrl("https://matrix.example.com/", mxc, "thumbnail")).toBe(
      "https://matrix.example.com/_matrix/client/v1/media/thumbnail/matrix.example.com/abc_123?width=800&height=600&method=scale&animated=true"
    );
    expect(mediaUrl("https://matrix.example.com", mxc, "download")).toBe(
      "https://matrix.example.com/_matrix/client/v1/media/download/matrix.example.com/abc_123"
    );
    expect(mediaUrl("https://matrix.example.com", "nope", "download")).toBeNull();
  });

  it("reads a caption as Matrix 1.10 does: a body that isn't the file name", () => {
    expect(pictureCaption("The map of Korland", "map.webp")).toBe("The map of Korland");
    expect(pictureCaption("map.webp", "map.webp")).toBe("");
    expect(pictureCaption("map.webp", undefined)).toBe("");
  });
});

describe("GIPHY", () => {
  it("downloads only from GIPHY's media hosts, over https", () => {
    expect(isGiphyMedia("https://media2.giphy.com/media/v1.Y2lk/abc/giphy.gif?cid=1&rid=giphy.gif")).toBe(true);
    expect(isGiphyMedia("https://media.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(isGiphyMedia("https://i.giphy.com/abc.gif")).toBe(true);
    expect(isGiphyMedia("http://media.giphy.com/media/abc/giphy.gif")).toBe(false);
    expect(isGiphyMedia("https://media.giphy.com.evil.example/abc.gif")).toBe(false);
    expect(isGiphyMedia("https://evil.example/media.giphy.com/abc.gif")).toBe(false);
    expect(isGiphyMedia("https://api.giphy.com/v1/gifs/trending")).toBe(false);
  });

  it("searches for a query, and shows what's trending without one", () => {
    const search = new URL(giphyRequestUrl({ key: "k", rating: "pg-13", query: "  dragon fire ", offset: 24 }));
    expect(search.origin + search.pathname).toBe("https://api.giphy.com/v1/gifs/search");
    expect(search.searchParams.get("q")).toBe("dragon fire");
    expect(search.searchParams.get("offset")).toBe("24");
    expect(search.searchParams.get("rating")).toBe("pg-13");
    const trending = new URL(giphyRequestUrl({ key: "k", rating: "g", query: " ", offset: 0 }));
    expect(trending.pathname).toBe("/v1/gifs/trending");
    expect(trending.searchParams.has("q")).toBe(false);
    expect(new URL(giphyRequestUrl({ key: "k", rating: "g", query: "x".repeat(80), offset: 0 })).searchParams.get("q")).toHaveLength(50);
  });

  const media = (name: string, size: number, w = 480, h = 270) => ({
    url: `https://media1.giphy.com/media/abc/${name}.gif?cid=1`,
    width: String(w),
    height: String(h),
    size: String(size),
  });

  it("keeps only what the picker shows, and sends the original when it isn't too big", () => {
    const shaped = shapeGifs(
      {
        data: [
          {
            id: "abc",
            title: "Dragon GIF",
            url: "https://giphy.com/gifs/abc",
            user: { username: "someone" },
            images: { fixed_width_downsampled: media("200w_d", 50_000, 200, 113), original: media("giphy", 4_000_000) },
          },
        ],
        pagination: { total_count: 100, count: 24, offset: 0 },
      },
      "dragon"
    );
    expect(shaped.gifs).toEqual([
      {
        id: "abc",
        title: "Dragon GIF",
        preview: { url: "https://media1.giphy.com/media/abc/200w_d.gif?cid=1", width: 200, height: 113 },
        send: { url: "https://media1.giphy.com/media/abc/giphy.gif?cid=1", width: 480, height: 270, size: 4_000_000 },
      },
    ]);
    expect(shaped.next).toBe(24);
  });

  it("sends a smaller copy of a GIF too big to send, and skips one with no copy to send", () => {
    const shaped = shapeGifs(
      {
        data: [
          {
            id: "big",
            title: "",
            images: {
              fixed_width: media("200w", 90_000, 200, 200),
              original: media("giphy", GIF_MAX_BYTES + 1),
              downsized_medium: media("giphy-downsized-medium", 4_900_000),
            },
          },
          { id: "huge", title: "Huge", images: { fixed_width: media("200w", 1, 200, 200), original: media("giphy", GIF_MAX_BYTES * 2) } },
          { id: "elsewhere", title: "Elsewhere", images: { fixed_width: { url: "https://evil.example/a.gif", width: "1", height: "1" } } },
        ],
        pagination: { total_count: 2, count: 2, offset: 0 },
      },
      "big"
    );
    expect(shaped.gifs.map((g) => [g.id, g.title, g.send.size])).toEqual([["big", "GIF", 4_900_000]]);
    expect(shaped.next).toBeNull();
  });

  it("stops paging where GIPHY does", () => {
    expect(shapeGifs({ data: [], pagination: { total_count: 9999, count: 24, offset: 480 } }, "").next).toBeNull();
    expect(shapeGifs({ data: [], pagination: { total_count: 9999, count: 24, offset: 480 } }, "cat").next).toBe(504);
    expect(shapeGifs({}, "cat")).toEqual({ gifs: [], next: null });
  });
});
