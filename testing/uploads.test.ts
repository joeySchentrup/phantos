import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

/** The hooks module is CommonJS for PocketBase's VM, so it is evaluated, not imported (see feed.test.ts). */
function loadHooks(): Record<string, (...args: any[]) => any> {
  const module = { exports: {} };
  new Function("module", readFileSync("pb_hooks/phantos/lib.js", "utf8"))(module);
  return module.exports;
}

const { checkUploadNames } = loadHooks();

class BadRequestError extends Error {}

/** A record of a collection with a text field and the given file fields, holding these unsaved uploads. */
function record(uploads: Record<string, string[]>) {
  const fields = [{ name: "title", type: "text" }, ...Object.keys(uploads).map((name) => ({ name, type: "file" }))];
  return {
    collection: () => ({ fields: fields.map((f) => ({ getName: () => f.name, type: () => f.type })) }),
    getUnsavedFiles: (field: string) =>
      (uploads[field] ?? []).map((name) => ({ name, originalName: name.replace(/_[a-z0-9]{10}(?=\.|$)/, "") })),
  };
}

describe("checkUploadNames", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets images through, whatever the case of their extension", () => {
    vi.stubGlobal("BadRequestError", BadRequestError);
    const images = ["map_abc123defg.png", "korre_abc123defg.JPG", "a_abc123defg.jpeg", "b_abc123defg.jfif", "card_abc123defg.webp", "c_abc123defg.gif"];
    expect(() => checkUploadNames(record({ cover: images, card_art: [] }))).not.toThrow();
  });

  it("refuses a file named for anything else, in any file field", () => {
    vi.stubGlobal("BadRequestError", BadRequestError);
    for (const name of ["x_abc123defg.js", "x_abc123defg.mjs", "x_abc123defg.css", "x_abc123defg.svg", "x.png_abc123defg.js", "x_abc123defg.html", "x_abc123defg"]) {
      expect(() => checkUploadNames(record({ cover: ["fine_abc123defg.png"], card_art: [name] }))).toThrow(BadRequestError);
    }
  });

  it("names the file it refused", () => {
    vi.stubGlobal("BadRequestError", BadRequestError);
    expect(() => checkUploadNames(record({ portrait: ["sneaky_abc123defg.js"] }))).toThrow("sneaky.js has to be a PNG, JPEG, WebP or GIF image.");
  });

  it("leaves records without uploads alone", () => {
    expect(() => checkUploadNames(record({}))).not.toThrow();
    expect(() => checkUploadNames(record({ cover: [] }))).not.toThrow();
  });
});
