/// <reference path="../../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Server-side helpers for the Phantos archive.
 *
 * PocketBase runs every hook handler in an isolated runtime with no access to
 * the outer scope, so handlers in ../phantos.pb.js require() this module.
 */

const DM_COLLECTION = 'dungeon_masters';

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
// Chronicle record upkeep
// ---------------------------------------------------------------------------

/**
 * Years are negative for BC and positive for AC; 0 means "not set", which for
 * an era is an open end. An era with both ends set has to run forwards.
 */
function prepareEra(record) {
  record.set('name', record.getString('name').trim());
  record.set('description', record.getString('description').replace(/\s+/g, ' ').trim());

  const start = record.getInt('start_year');
  const end = record.getInt('end_year');
  if (start && end && end <= start) {
    throw new BadRequestError('An era has to end after it begins.');
  }
}

/** A point is a single line: line breaks and runs of spaces collapse to one space. */
function preparePoint(record) {
  record.set('text', record.getString('text').replace(/\s+/g, ' ').trim());
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
      year: r.getInt('year'),
      circa: r.getBool('circa'),
      created: r.getString('created'),
      snippet: snippetAround(plainText(scored[i].content), terms),
    });
  }
  return { items: items, total: scored.length };
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
  isDungeonMaster: isDungeonMaster,
  slugify: slugify,
  plainText: plainText,
  countWords: countWords,
  autoSummary: autoSummary,
  prepareLore: prepareLore,
  prepareEra: prepareEra,
  preparePoint: preparePoint,
  search: search,
  ensureDungeonMaster: ensureDungeonMaster,
};
