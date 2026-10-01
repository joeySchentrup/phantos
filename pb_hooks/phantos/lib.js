/// <reference path="../../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Server-side helpers for the Phantos archive.
 *
 * PocketBase runs every hook handler in an isolated runtime with no access to
 * the outer scope, so handlers in ../phantos.pb.js require() this module.
 */

const DM_COLLECTION = 'dungeon_masters';

/**
 * The scene the featured image is rendered from. Distilled from the lore: the
 * six Primal Dragons given Phanatos by Kalistos, the Kobold citadel of
 * Korland, and Erosia's twilight returning over Hurly. DMs can rewrite it
 * from the DM page before generating.
 */
const DEFAULT_PROMPT = [
  'Epic fantasy key art in the style of a painted collectible trading card illustration.',
  'The six Primal Dragons of the world of Phanatos circle a storm-lit sky above the continent of Hurly:',
  'Ouro’ras, a radiant golden dragon of Light; Golestandt, a vast shadow-black dragon of Darkness;',
  'Vlaurunga, a crimson-and-ember dragon of Fire; Yvander, a pale glacier-blue dragon of Ice;',
  'Quintara Lotus, a shimmering violet-and-teal dragon of the Arcane; and Rokesh, a gem-scaled basalt dragon of Earth.',
  'Far below, the crystal-veined basalt towers of Korland, citadel of the Kobold Empire, glow on a volcanic island.',
  'On the horizon a violet rift of twilight tears open, where a pale crowned queen and an army of Twili wait in shadow.',
  'Dramatic rim lighting, rich saturated color, deep golds against twilight purples, painterly and highly detailed,',
  'cinematic wide composition. No text, no lettering, no logos, no card frame or borders.',
].join(' ');

function config() {
  return {
    apiKey: $os.getenv('OPENAI_API_KEY'),
    baseUrl: ($os.getenv('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: $os.getenv('OPENAI_IMAGE_MODEL') || 'gpt-image-2.5-sunburst',
    quality: $os.getenv('OPENAI_IMAGE_QUALITY') || 'high',
  };
}

function isDungeonMaster(auth) {
  return !!auth && auth.collection().name === DM_COLLECTION;
}

/** findFirstRecordByFilter throws when nothing matches; we want null. */
function findOne(app, collection, filter, params) {
  try {
    return app.findFirstRecordByFilter(collection, filter, params || {});
  } catch (err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function slugify(text) {
  const slug = String(text || '')
    .replace(/&/g, ' and ')
    .replace(/['\u2019]/g, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= 80) return slug;

  // Long headlines: stop at the last whole word that fits.
  const cut = slug.slice(0, 80);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > 40 ? cut.slice(0, lastDash) : cut;
}

/** Picks `base`, or `base-2`, `base-3`… — whichever no other lore record uses. */
function uniqueSlug(app, base, excludeId) {
  const root = base || 'lore';
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? root : root + '-' + n;
    const clash = findOne(app, 'lore', 'slug = {:slug} && id != {:id}', { slug: candidate, id: excludeId || '' });
    if (!clash) return candidate;
  }
  return root + '-' + $security.randomStringWithAlphabet(6, 'abcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * Browsers send form text with CRLF line endings, and the JS VM's multiline
 * `$` only matches before LF, so lore is stored and parsed with LF only.
 */
function normalizeNewlines(text) {
  return String(text || '').replace(/\r\n?/g, '\n');
}

/** Flattens markdown into readable plain text for snippets and summaries. */
function plainText(markdown) {
  return normalizeNewlines(markdown)
    .replace(/\[\^[^\]]*\]:?/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    .replace(/\|/g, ' ')
    .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1')
    .replace(/\\$/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(markdown) {
  const words = plainText(markdown).split(' ');
  let n = 0;
  for (let i = 0; i < words.length; i++) {
    if (/[A-Za-z0-9\u00C0-\u024F]/.test(words[i])) n++;
  }
  return n;
}

/** Trims to at most `max` characters on a word boundary, adding an ellipsis. */
function clip(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, '') + '\u2026';
}

function autoSummary(markdown) {
  const withoutHeadings = normalizeNewlines(markdown).replace(/^\s{0,3}#{1,6}\s+.*$/gm, '');
  return clip(plainText(withoutHeadings), 220);
}

// ---------------------------------------------------------------------------
// Lore record upkeep
// ---------------------------------------------------------------------------

/**
 * Fills in the derived fields of a lore record before it is saved. Takes the
 * hook's app so the slug check runs inside the same transaction as the save.
 */
function prepareLore(app, record) {
  const content = normalizeNewlines(record.getString('content'));
  record.set('content', content);

  const requested = slugify(record.getString('slug'));
  const base = requested || slugify(record.getString('title'));
  record.set('slug', uniqueSlug(app, base, record.id));

  record.set('word_count', countWords(content));

  if (!record.getString('summary').trim() && content) {
    record.set('summary', autoSummary(content));
  }
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

const CATEGORIES = ['tale', 'chronicle', 'myth', 'dispatch', 'codex', 'dragon', 'map'];

function searchTerms(query) {
  const terms = [];
  const parts = String(query || '').trim().split(/\s+/);
  for (let i = 0; i < parts.length && terms.length < 6; i++) {
    const t = parts[i].replace(/^["'(]+|["'),.;:!?]+$/g, '');
    if (t) terms.push(t);
  }
  return terms;
}

function countOccurrences(haystack, needle, cap) {
  let n = 0;
  let from = 0;
  while (n < cap) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    n++;
    from = at + needle.length;
  }
  return n;
}

/** A window of plain text around the first hit, cut on word boundaries. */
function snippetAround(text, terms) {
  const lower = text.toLowerCase();
  let at = -1;
  for (let i = 0; i < terms.length; i++) {
    const idx = lower.indexOf(terms[i].toLowerCase());
    if (idx !== -1 && (at === -1 || idx < at)) at = idx;
  }
  if (at === -1) return '';

  let start = Math.max(0, at - 90);
  let end = Math.min(text.length, at + 170);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < at) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > at) end = space;
  }
  return (start > 0 ? '\u2026' : '') + text.slice(start, end) + (end < text.length ? '\u2026' : '');
}

function search(query, category, includeDrafts, limit) {
  const terms = searchTerms(query);
  if (!terms.length) return { items: [], total: 0 };

  const params = {};
  const clauses = [];
  for (let i = 0; i < terms.length; i++) {
    const key = 't' + i;
    params[key] = terms[i];
    clauses.push(
      '(title ~ {:' + key + '} || summary ~ {:' + key + '} || author ~ {:' + key + '} || content ~ {:' + key + '})'
    );
  }
  if (!includeDrafts) clauses.push('published = true');
  if (category && CATEGORIES.indexOf(category) !== -1) {
    params.category = category;
    clauses.push('category = {:category}');
  }

  const records = $app.findRecordsByFilter('lore', clauses.join(' && '), '-created', 500, 0, params);

  const scored = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const title = r.getString('title').toLowerCase();
    const summary = r.getString('summary').toLowerCase();
    const author = r.getString('author').toLowerCase();
    const content = r.getString('content');
    const contentLower = content.toLowerCase();

    let score = 0;
    for (let j = 0; j < terms.length; j++) {
      const t = terms[j].toLowerCase();
      if (title.indexOf(t) !== -1) score += 40;
      if (author.indexOf(t) !== -1) score += 15;
      if (summary.indexOf(t) !== -1) score += 10;
      score += countOccurrences(contentLower, t, 25);
    }
    if (title === String(query).trim().toLowerCase()) score += 100;

    scored.push({ record: r, score: score, content: content });
  }

  scored.sort((a, b) => b.score - a.score);

  const items = [];
  for (let i = 0; i < scored.length && i < limit; i++) {
    const r = scored[i].record;
    items.push({
      id: r.id,
      collectionId: r.collection().id,
      collectionName: 'lore',
      slug: r.getString('slug'),
      title: r.getString('title'),
      category: r.getString('category'),
      attribute: r.getString('attribute'),
      author: r.getString('author'),
      summary: r.getString('summary'),
      cover: r.getString('cover'),
      word_count: r.getInt('word_count'),
      published: r.getBool('published'),
      created: r.getString('created'),
      snippet: snippetAround(plainText(scored[i].content), terms),
    });
  }
  return { items: items, total: scored.length };
}

// ---------------------------------------------------------------------------
// Featured image
// ---------------------------------------------------------------------------

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** The JS VM has no atob, and fileFromBytes wants plain byte values. */
function base64ToBytes(b64) {
  const lookup = {};
  for (let i = 0; i < B64_ALPHABET.length; i++) lookup[B64_ALPHABET.charAt(i)] = i;
  lookup['-'] = 62;
  lookup['_'] = 63;

  const clean = String(b64).replace(/[^A-Za-z0-9+/_-]/g, '');
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    buffer = (buffer << 6) | lookup[clean.charAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function apiError(res) {
  try {
    if (res.json && res.json.error && res.json.error.message) return res.json.error.message;
  } catch (err) {
    // fall through
  }
  return 'HTTP ' + res.statusCode;
}

/** Renders a new featured image with OpenAI and stores it. Returns the record. */
function generateFeaturedImage(prompt) {
  const cfg = config();
  if (!cfg.apiKey) {
    throw new Error('Image generation is not configured. Set OPENAI_API_KEY on the server.');
  }

  const res = $http.send({
    method: 'POST',
    url: cfg.baseUrl + '/images/generations',
    headers: {
      Authorization: 'Bearer ' + cfg.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      prompt: prompt,
      size: '1536x1024',
      quality: cfg.quality,
      output_format: 'webp',
      output_compression: 90,
      n: 1,
    }),
    timeout: 300,
  });

  if (res.statusCode !== 200) {
    throw new Error('The image service refused the request: ' + apiError(res));
  }

  const data = res.json && res.json.data && res.json.data[0];
  if (!data || !data.b64_json) {
    throw new Error('The image service returned no image.');
  }

  const record = new Record($app.findCollectionByNameOrId('featured_images'));
  record.set('image', $filesystem.fileFromBytes(base64ToBytes(data.b64_json), 'phantos-featured.webp'));
  record.set('prompt', prompt);
  record.set('model', cfg.model);
  $app.save(record);
  return record;
}

// ---------------------------------------------------------------------------
// Dungeon Master bootstrap
// ---------------------------------------------------------------------------

/**
 * Creates the DM account named by DM_EMAIL / DM_PASSWORD if it doesn't exist
 * yet. On a brand-new database this runs before the migrations have created
 * the collection; the 1759276802 migration covers that first start.
 */
function ensureDungeonMaster(app) {
  const email = ($os.getenv('DM_EMAIL') || '').trim();
  const password = $os.getenv('DM_PASSWORD') || '';
  if (!email || !password) return;

  let collection;
  try {
    collection = app.findCollectionByNameOrId(DM_COLLECTION);
  } catch (err) {
    return;
  }

  if (findOne(app, DM_COLLECTION, 'email = {:email}', { email: email })) return;

  const record = new Record(collection);
  record.set('email', email);
  record.set('name', 'Dungeon Master');
  record.set('verified', true);
  record.setPassword(password);
  app.save(record);
  app.logger().info('Created Dungeon Master account', 'email', email);
}

module.exports = {
  DEFAULT_PROMPT: DEFAULT_PROMPT,
  config: config,
  isDungeonMaster: isDungeonMaster,
  slugify: slugify,
  plainText: plainText,
  countWords: countWords,
  autoSummary: autoSummary,
  prepareLore: prepareLore,
  search: search,
  base64ToBytes: base64ToBytes,
  generateFeaturedImage: generateFeaturedImage,
  ensureDungeonMaster: ensureDungeonMaster,
};
