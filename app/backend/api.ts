import type { ListResult } from 'pocketbase';
import { DEFAULT_CHART_SLUG } from '../lib/atlas';
import type { Chart, Feature, FeatureInput, Place, PlaceInput, Realm, RealmInput } from '../types/atlas';
import type { Era, EraInput, TimelinePoint, TimelinePointInput } from '../types/chronicle';
import type { ElectrumAccount, ElectrumAccountInput, LevelCost, ShopItem, ShopItemInput } from '../types/electrum';
import type {
  FeaturedImage,
  LoreCategory,
  LoreEntry,
  LoreSummary,
  SearchHit,
} from '../types/lore';
import type { Hero, HeroSummary, HeroUpdate, HeroUpdateInput } from '../types/hero';
import type { PantheonMember, PantheonRank, PantheonSummary } from '../types/pantheon';
import pb from './pocketbaseClient';

const DM_COLLECTION = 'dungeon_masters';

/** Everything a card needs. Bodies can run to 300 KB, so lists leave them out. */
const SUMMARY_FIELDS =
  'id,collectionId,collectionName,slug,title,category,attribute,author,summary,cover,card_art,word_count,published,year,circa,created';

/** Everything a pantheon card needs; the document body stays behind. */
const PANTHEON_FIELDS =
  'id,collectionId,collectionName,slug,name,rank,attributes,domain,summary,image,card_art,published,created';

/** Everything a hero card needs; the backstory stays behind. */
const HERO_FIELDS =
  'id,collectionId,collectionName,slug,name,player,species,class,subclass,background,alignment,faith,attribute,summary,portrait,card_art,published,created';

// ---------------------------------------------------------------------------
// Lore
// ---------------------------------------------------------------------------

export async function listLore(
  page: number,
  perPage: number,
  category?: LoreCategory | ''
): Promise<ListResult<LoreSummary>> {
  try {
    return await pb.collection('lore').getList<LoreSummary>(page, perPage, {
      sort: '-created,-id',
      filter: category ? pb.filter('category = {:category}', { category }) : '',
      fields: SUMMARY_FIELDS,
      // requestKey: null prevents SDK auto-cancellation when pages load concurrently
      requestKey: null,
    });
  } catch (error) {
    console.error('Error listing lore:', error);
    throw error;
  }
}

/** Totals for the hero: how many entries and how many words the archive holds. */
export async function getArchiveStats(): Promise<{ entries: number; words: number }> {
  try {
    const records = await pb.collection('lore').getFullList<{ word_count: number }>({
      fields: 'word_count',
      requestKey: null,
    });
    return {
      entries: records.length,
      words: records.reduce((sum, r) => sum + (r.word_count || 0), 0),
    };
  } catch (error) {
    console.error('Error fetching archive stats:', error);
    throw error;
  }
}

/** One entry with its document, and the cards of the pantheon members it refers to. */
export async function getLoreBySlug(slug: string): Promise<LoreEntry> {
  try {
    return await pb.collection('lore').getFirstListItem<LoreEntry>(pb.filter('slug = {:slug}', { slug }), {
      expand: 'pantheon',
      fields: '*,' + PANTHEON_FIELDS.split(',').map((field) => `expand.pantheon.${field}`).join(','),
      requestKey: null,
    });
  } catch (error) {
    console.error('Error fetching lore:', error);
    throw error;
  }
}

export async function getLoreById(id: string): Promise<LoreEntry> {
  try {
    return await pb.collection('lore').getOne<LoreEntry>(id, { requestKey: null });
  } catch (error) {
    console.error('Error fetching lore:', error);
    throw error;
  }
}

export async function searchLore(
  query: string,
  category?: LoreCategory | ''
): Promise<{ items: SearchHit[]; total: number }> {
  try {
    return await pb.send('/api/phantos/search', {
      method: 'GET',
      query: { q: query, category: category || '' },
      requestKey: 'lore-search',
    });
  } catch (error: any) {
    // A newer keystroke cancelled this search — not an error worth reporting.
    if (error?.isAbort) throw error;
    console.error('Error searching lore:', error);
    throw error;
  }
}

/** Every entry, drafts included, for the DM's desk. */
export async function listAllLoreForDm(): Promise<(LoreSummary & { updated: string })[]> {
  try {
    return await pb.collection('lore').getFullList({
      sort: '-updated',
      fields: SUMMARY_FIELDS + ',updated',
      requestKey: null,
    });
  } catch (error) {
    console.error('Error listing lore for the DM:', error);
    throw error;
  }
}

export async function createLore(data: FormData): Promise<LoreEntry> {
  try {
    return await pb.collection('lore').create<LoreEntry>(data);
  } catch (error) {
    console.error('Error creating lore:', error);
    throw error;
  }
}

export async function updateLore(id: string, data: FormData): Promise<LoreEntry> {
  try {
    return await pb.collection('lore').update<LoreEntry>(id, data);
  } catch (error) {
    console.error('Error updating lore:', error);
    throw error;
  }
}

export async function deleteLore(id: string): Promise<void> {
  try {
    await pb.collection('lore').delete(id);
  } catch (error) {
    console.error('Error deleting lore:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pantheon
// ---------------------------------------------------------------------------

/**
 * The pantheon, or the part of it that matches a search and a rank. It is
 * small enough to fetch whole, so the caller sorts it.
 */
export async function listPantheon(query = '', rank: PantheonRank | '' = ''): Promise<PantheonSummary[]> {
  const clauses: string[] = [];
  for (const term of query.trim().split(/\s+/).filter(Boolean).slice(0, 6)) {
    clauses.push(
      pb.filter('(name ~ {:term} || domain ~ {:term} || attributes ~ {:term} || summary ~ {:term} || content ~ {:term})', { term })
    );
  }
  if (rank) clauses.push(pb.filter('rank = {:rank}', { rank }));

  try {
    return await pb.collection('pantheon').getFullList<PantheonSummary>({
      filter: clauses.join(' && '),
      sort: 'name',
      fields: PANTHEON_FIELDS,
      // One key per page, so a newer keystroke cancels the search before it.
      requestKey: query.trim() ? 'pantheon-search' : null,
    });
  } catch (error: any) {
    if (error?.isAbort) throw error;
    console.error('Error listing the pantheon:', error);
    throw error;
  }
}

export async function getPantheonBySlug(slug: string): Promise<PantheonMember> {
  try {
    return await pb
      .collection('pantheon')
      .getFirstListItem<PantheonMember>(pb.filter('slug = {:slug}', { slug }), { requestKey: null });
  } catch (error) {
    console.error('Error fetching the pantheon member:', error);
    throw error;
  }
}

export async function getPantheonById(id: string): Promise<PantheonMember> {
  try {
    return await pb.collection('pantheon').getOne<PantheonMember>(id, { requestKey: null });
  } catch (error) {
    console.error('Error fetching the pantheon member:', error);
    throw error;
  }
}

/** The lore that refers to a pantheon member, as cards. */
export async function listLoreForPantheon(memberId: string): Promise<LoreSummary[]> {
  try {
    return await pb.collection('lore').getFullList<LoreSummary>({
      filter: pb.filter('pantheon ~ {:id}', { id: memberId }),
      sort: 'title',
      fields: SUMMARY_FIELDS,
      requestKey: null,
    });
  } catch (error) {
    console.error('Error listing lore for the pantheon member:', error);
    throw error;
  }
}

/** How many lore entries refer to each pantheon member, by member id. */
export async function countLoreByPantheon(): Promise<Record<string, number>> {
  try {
    const records = await pb.collection('lore').getFullList<{ pantheon: string[] }>({
      filter: 'pantheon:length > 0',
      fields: 'pantheon',
      requestKey: null,
    });
    const counts: Record<string, number> = {};
    for (const record of records) {
      for (const id of record.pantheon ?? []) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  } catch (error) {
    console.error('Error counting lore by pantheon member:', error);
    throw error;
  }
}

export async function createPantheon(data: FormData): Promise<PantheonMember> {
  try {
    return await pb.collection('pantheon').create<PantheonMember>(data);
  } catch (error) {
    console.error('Error creating the pantheon member:', error);
    throw error;
  }
}

export async function updatePantheon(id: string, data: FormData): Promise<PantheonMember> {
  try {
    return await pb.collection('pantheon').update<PantheonMember>(id, data);
  } catch (error) {
    console.error('Error updating the pantheon member:', error);
    throw error;
  }
}

export async function deletePantheon(id: string): Promise<void> {
  try {
    await pb.collection('pantheon').delete(id);
  } catch (error) {
    console.error('Error deleting the pantheon member:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Heroes
// ---------------------------------------------------------------------------

/** The hero list, or the heroes that match a search. Small enough to fetch whole. */
export async function listHeroes(query = ''): Promise<HeroSummary[]> {
  const clauses: string[] = [];
  for (const term of query.trim().split(/\s+/).filter(Boolean).slice(0, 6)) {
    clauses.push(
      pb.filter(
        '(name ~ {:term} || player ~ {:term} || species ~ {:term} || class ~ {:term} || subclass ~ {:term} || background ~ {:term} || faith ~ {:term} || summary ~ {:term} || backstory ~ {:term})',
        { term }
      )
    );
  }

  try {
    return await pb.collection('heroes').getFullList<HeroSummary>({
      filter: clauses.join(' && '),
      sort: 'name',
      fields: HERO_FIELDS,
      // One key per page, so a newer keystroke cancels the search before it.
      requestKey: query.trim() ? 'hero-search' : null,
    });
  } catch (error: any) {
    if (error?.isAbort) throw error;
    console.error('Error listing heroes:', error);
    throw error;
  }
}

export async function getHeroBySlug(slug: string): Promise<Hero> {
  try {
    return await pb.collection('heroes').getFirstListItem<Hero>(pb.filter('slug = {:slug}', { slug }), { requestKey: null });
  } catch (error) {
    console.error('Error fetching the hero:', error);
    throw error;
  }
}

export async function getHeroById(id: string): Promise<Hero> {
  try {
    return await pb.collection('heroes').getOne<Hero>(id, { requestKey: null });
  } catch (error) {
    console.error('Error fetching the hero:', error);
    throw error;
  }
}

export async function createHero(data: FormData): Promise<Hero> {
  try {
    return await pb.collection('heroes').create<Hero>(data);
  } catch (error) {
    console.error('Error creating the hero:', error);
    throw error;
  }
}

export async function updateHero(id: string, data: FormData): Promise<Hero> {
  try {
    return await pb.collection('heroes').update<Hero>(id, data);
  } catch (error) {
    console.error('Error updating the hero:', error);
    throw error;
  }
}

/** Deletes the hero; their updates go with them, and their electrum is left without a hero. */
export async function deleteHero(id: string): Promise<void> {
  try {
    await pb.collection('heroes').delete(id);
  } catch (error) {
    console.error('Error deleting the hero:', error);
    throw error;
  }
}

/** A hero's updates, newest first. */
export async function listHeroUpdates(heroId: string): Promise<HeroUpdate[]> {
  try {
    return await pb.collection('hero_updates').getFullList<HeroUpdate>({
      filter: pb.filter('hero = {:hero}', { hero: heroId }),
      sort: '-created,-id',
      requestKey: null,
    });
  } catch (error) {
    console.error('Error listing hero updates:', error);
    throw error;
  }
}

/** How many updates each hero has, by hero id. */
export async function countUpdatesByHero(): Promise<Record<string, number>> {
  try {
    const records = await pb.collection('hero_updates').getFullList<{ hero: string }>({ fields: 'hero', requestKey: null });
    const counts: Record<string, number> = {};
    for (const record of records) counts[record.hero] = (counts[record.hero] ?? 0) + 1;
    return counts;
  } catch (error) {
    console.error('Error counting hero updates:', error);
    throw error;
  }
}

/** Creates the update, or edits it when `id` is given. */
export async function saveHeroUpdate(data: HeroUpdateInput, id?: string): Promise<HeroUpdate> {
  try {
    return id
      ? await pb.collection('hero_updates').update<HeroUpdate>(id, data)
      : await pb.collection('hero_updates').create<HeroUpdate>(data);
  } catch (error) {
    console.error('Error saving the hero update:', error);
    throw error;
  }
}

export async function deleteHeroUpdate(id: string): Promise<void> {
  try {
    await pb.collection('hero_updates').delete(id);
  } catch (error) {
    console.error('Error deleting the hero update:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Electrum
// ---------------------------------------------------------------------------

/** An account with the card of its hero, when the visitor may see them. */
const ACCOUNT_QUERY = {
  expand: 'hero',
  fields: '*,' + HERO_FIELDS.split(',').map((field) => `expand.hero.${field}`).join(','),
};

/** The whole ledger, by name: every account, with or without a hero. */
export async function listElectrumAccounts(): Promise<ElectrumAccount[]> {
  try {
    return await pb.collection('electrum_accounts').getFullList<ElectrumAccount>({ sort: 'name,created', ...ACCOUNT_QUERY, requestKey: null });
  } catch (error) {
    console.error('Error listing electrum accounts:', error);
    throw error;
  }
}

/** A hero's account, or null when they have none. */
export async function getElectrumForHero(heroId: string): Promise<ElectrumAccount | null> {
  try {
    const result = await pb.collection('electrum_accounts').getList<ElectrumAccount>(1, 1, {
      filter: pb.filter('hero = {:hero}', { hero: heroId }),
      skipTotal: true,
      requestKey: null,
    });
    return result.items[0] ?? null;
  } catch (error) {
    console.error('Error fetching the electrum account:', error);
    throw error;
  }
}

/** How much electrum each hero holds, by hero id. */
export async function electrumByHero(): Promise<Record<string, number>> {
  try {
    const records = await pb.collection('electrum_accounts').getFullList<{ hero: string; amount: number }>({
      filter: 'hero != ""',
      fields: 'hero,amount',
      requestKey: null,
    });
    const amounts: Record<string, number> = {};
    for (const record of records) amounts[record.hero] = record.amount;
    return amounts;
  } catch (error) {
    console.error('Error listing electrum by hero:', error);
    throw error;
  }
}

/** Opens the account, or changes only the given fields of it when `id` is given. */
export async function saveElectrumAccount(data: Partial<ElectrumAccountInput>, id?: string): Promise<ElectrumAccount> {
  const options = { ...ACCOUNT_QUERY, requestKey: null };
  try {
    return id
      ? await pb.collection('electrum_accounts').update<ElectrumAccount>(id, data, options)
      : await pb.collection('electrum_accounts').create<ElectrumAccount>(data, options);
  } catch (error) {
    console.error('Error saving the electrum account:', error);
    throw error;
  }
}

/**
 * Adds to what an account holds, or takes from it when `change` is negative.
 * Electrum taken as `spent` is counted in the account's spending too. The
 * server does the sum, so two DMs adjusting at once both count.
 */
export async function adjustElectrum(id: string, change: number, spent = false): Promise<ElectrumAccount> {
  const body: Record<string, number> = change >= 0 ? { 'amount+': change } : { 'amount-': -change };
  if (change < 0 && spent) body['spent+'] = -change;
  try {
    return await pb.collection('electrum_accounts').update<ElectrumAccount>(id, body, { ...ACCOUNT_QUERY, requestKey: null });
  } catch (error) {
    console.error('Error adjusting the electrum account:', error);
    throw error;
  }
}

/** The shop, cheapest first. */
export async function listShopItems(): Promise<ShopItem[]> {
  try {
    return await pb.collection('electrum_shop').getFullList<ShopItem>({ sort: 'price,name', requestKey: null });
  } catch (error) {
    console.error('Error listing the electrum shop:', error);
    throw error;
  }
}

/** Creates the shop item, or updates it when `id` is given. */
export async function saveShopItem(data: ShopItemInput, id?: string): Promise<ShopItem> {
  const body = { name: data.name, price: data.price, description: data.description };
  try {
    return id
      ? await pb.collection('electrum_shop').update<ShopItem>(id, body, { requestKey: null })
      : await pb.collection('electrum_shop').create<ShopItem>(body, { requestKey: null });
  } catch (error) {
    console.error('Error saving the shop item:', error);
    throw error;
  }
}

export async function deleteShopItem(id: string): Promise<void> {
  try {
    await pb.collection('electrum_shop').delete(id);
  } catch (error) {
    console.error('Error deleting the shop item:', error);
    throw error;
  }
}

/** What each level costs to reach, lowest level first. */
export async function listLevelCosts(): Promise<LevelCost[]> {
  try {
    return await pb.collection('electrum_levels').getFullList<LevelCost>({ sort: 'level', requestKey: null });
  } catch (error) {
    console.error('Error listing level up costs:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Chronicle
// ---------------------------------------------------------------------------

/** Every entry with an in-universe date, oldest first. Undated lore stays off the timeline. */
export async function listDatedLore(): Promise<LoreSummary[]> {
  try {
    return await pb.collection('lore').getFullList<LoreSummary>({
      filter: 'year != 0',
      sort: 'year,title',
      fields: SUMMARY_FIELDS,
      requestKey: null,
    });
  } catch (error) {
    console.error('Error listing dated lore:', error);
    throw error;
  }
}

/** Every era, oldest first. An era with no start has always been going, so it leads. */
export async function listEras(): Promise<Era[]> {
  try {
    const eras = await pb.collection('eras').getFullList<Era>({ sort: 'start_year,end_year', requestKey: null });
    return [...eras.filter((era) => !era.start_year), ...eras.filter((era) => era.start_year)];
  } catch (error) {
    console.error('Error listing eras:', error);
    throw error;
  }
}

/** Creates the era, or updates it when `id` is given. */
export async function saveEra(data: EraInput, id?: string): Promise<Era> {
  try {
    return id ? await pb.collection('eras').update<Era>(id, data) : await pb.collection('eras').create<Era>(data);
  } catch (error) {
    console.error('Error saving the era:', error);
    throw error;
  }
}

export async function deleteEra(id: string): Promise<void> {
  try {
    await pb.collection('eras').delete(id);
  } catch (error) {
    console.error('Error deleting the era:', error);
    throw error;
  }
}

export async function listTimelinePoints(): Promise<TimelinePoint[]> {
  try {
    return await pb.collection('timeline_points').getFullList<TimelinePoint>({ sort: 'year,created', requestKey: null });
  } catch (error) {
    console.error('Error listing timeline points:', error);
    throw error;
  }
}

/** Creates the point, or updates it when `id` is given. */
export async function saveTimelinePoint(data: TimelinePointInput, id?: string): Promise<TimelinePoint> {
  try {
    return id
      ? await pb.collection('timeline_points').update<TimelinePoint>(id, data)
      : await pb.collection('timeline_points').create<TimelinePoint>(data);
  } catch (error) {
    console.error('Error saving the timeline point:', error);
    throw error;
  }
}

export async function deleteTimelinePoint(id: string): Promise<void> {
  try {
    await pb.collection('timeline_points').delete(id);
  } catch (error) {
    console.error('Error deleting the timeline point:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Atlas
// ---------------------------------------------------------------------------

/** A place with the card of its lore entry, and nothing more of the entry than the card needs. */
const PLACE_QUERY = {
  expand: 'lore',
  fields: '*,' + SUMMARY_FIELDS.split(',').map((field) => `expand.lore.${field}`).join(','),
};

/** Every chart the visitor may see: the default chart first, the rest by name. Drafts only for DMs. */
export async function listCharts(): Promise<Chart[]> {
  try {
    const charts = await pb.collection('charts').getFullList<Chart>({ sort: 'name', requestKey: null });
    return [...charts.filter((chart) => chart.slug === DEFAULT_CHART_SLUG), ...charts.filter((chart) => chart.slug !== DEFAULT_CHART_SLUG)];
  } catch (error) {
    console.error('Error listing charts:', error);
    throw error;
  }
}

export async function getChartBySlug(slug: string): Promise<Chart> {
  try {
    return await pb.collection('charts').getFirstListItem<Chart>(pb.filter('slug = {:slug}', { slug }), { requestKey: null });
  } catch (error) {
    console.error('Error fetching the chart:', error);
    throw error;
  }
}

/**
 * What stands on a chart comes back in the order it was added: the realm
 * drawn last lies on top, and is the one a click finds.
 */
function onChart(chartId: string) {
  return { filter: pb.filter('chart = {:chart}', { chart: chartId }), sort: '@rowid', requestKey: null };
}

/** A chart's places, each with the card of its lore entry when the visitor may read it. */
export async function listPlaces(chartId: string): Promise<Place[]> {
  try {
    return await pb.collection('places').getFullList<Place>({ ...onChart(chartId), ...PLACE_QUERY });
  } catch (error) {
    console.error('Error listing places:', error);
    throw error;
  }
}

export async function listRealms(chartId: string): Promise<Realm[]> {
  try {
    return await pb.collection('realms').getFullList<Realm>(onChart(chartId));
  } catch (error) {
    console.error('Error listing realms:', error);
    throw error;
  }
}

export async function listFeatures(chartId: string): Promise<Feature[]> {
  try {
    return await pb.collection('features').getFullList<Feature>(onChart(chartId));
  } catch (error) {
    console.error('Error listing terrain:', error);
    throw error;
  }
}

/** Creates the place, or updates it when `id` is given. */
export async function savePlace(data: PlaceInput, id?: string): Promise<Place> {
  const body = { chart: data.chart, name: data.name, kind: data.kind, x: data.x, y: data.y, realm: data.realm, lore: data.lore, published: data.published };
  const options = { ...PLACE_QUERY, requestKey: null };
  try {
    return id
      ? await pb.collection('places').update<Place>(id, body, options)
      : await pb.collection('places').create<Place>(body, options);
  } catch (error) {
    console.error('Error saving the place:', error);
    throw error;
  }
}

export async function deletePlace(id: string): Promise<void> {
  try {
    await pb.collection('places').delete(id);
  } catch (error) {
    console.error('Error deleting the place:', error);
    throw error;
  }
}

/** Creates the realm, or updates it when `id` is given. */
export async function saveRealm(data: RealmInput, id?: string): Promise<Realm> {
  const body = {
    chart: data.chart,
    name: data.name,
    standing: data.standing,
    tone: data.tone,
    label: data.label,
    points: data.points,
    lore: data.lore,
    published: data.published,
  };
  try {
    return id
      ? await pb.collection('realms').update<Realm>(id, body, { requestKey: null })
      : await pb.collection('realms').create<Realm>(body, { requestKey: null });
  } catch (error) {
    console.error('Error saving the realm:', error);
    throw error;
  }
}

export async function deleteRealm(id: string): Promise<void> {
  try {
    await pb.collection('realms').delete(id);
  } catch (error) {
    console.error('Error deleting the realm:', error);
    throw error;
  }
}

/** Creates the terrain, or updates it when `id` is given. */
export async function saveFeature(data: FeatureInput, id?: string): Promise<Feature> {
  const body = { chart: data.chart, name: data.name, kind: data.kind, points: data.points, spread: data.spread, published: data.published };
  try {
    return id
      ? await pb.collection('features').update<Feature>(id, body, { requestKey: null })
      : await pb.collection('features').create<Feature>(body, { requestKey: null });
  } catch (error) {
    console.error('Error saving the terrain:', error);
    throw error;
  }
}

export async function deleteFeature(id: string): Promise<void> {
  try {
    await pb.collection('features').delete(id);
  } catch (error) {
    console.error('Error deleting the terrain:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export function fileUrl(
  record: { id: string; collectionId: string; collectionName?: string },
  filename: string,
  thumb?: string
): string {
  if (!filename) return '';
  return pb.files.getURL(record as any, filename, thumb ? { thumb } : undefined);
}

/**
 * What a card shows: the record's card art when it has some, otherwise
 * PocketBase's 480px thumbnail of the original — never the original itself.
 */
export function cardArtUrl(
  record: { id?: string; collectionId?: string; collectionName?: string },
  image: string,
  cardArt?: string
): string {
  if (!image || !record.id || !record.collectionId) return '';
  const stored = record as { id: string; collectionId: string };
  return cardArt ? fileUrl(stored, cardArt) : fileUrl(stored, image, '480x0');
}

/** The image field each card-bearing collection keeps its original in. */
export const CARD_IMAGE_FIELDS = { lore: 'cover', pantheon: 'image', heroes: 'portrait' } as const;

export type CardCollection = keyof typeof CARD_IMAGE_FIELDS;

export interface CardArtJob {
  collection: CardCollection;
  record: { id: string; collectionId: string; collectionName?: string };
  /** What the DM desk calls it while it works. */
  label: string;
  /** The original's filename. */
  image: string;
}

/**
 * Every image whose card art is missing or isn't WebP yet (the upgrade
 * migration's copies keep their original format). Drafts included.
 */
export async function listCardArtJobs(): Promise<CardArtJob[]> {
  const jobs: CardArtJob[] = [];
  for (const [collection, field] of Object.entries(CARD_IMAGE_FIELDS) as [CardCollection, string][]) {
    const nameField = collection === 'lore' ? 'title' : 'name';
    const records = await pb.collection(collection).getFullList<Record<string, string>>({
      filter: `${field} != "" && (card_art = "" || card_art !~ ".webp")`,
      fields: `id,collectionId,collectionName,${field},${nameField}`,
      requestKey: null,
    });
    for (const record of records) {
      jobs.push({
        collection,
        record: { id: record.id, collectionId: record.collectionId, collectionName: record.collectionName },
        label: record[nameField],
        image: record[field],
      });
    }
  }
  return jobs;
}

/** Stores a record's card art without touching anything else on it. */
export async function saveCardArt(collection: CardCollection, id: string, file: File): Promise<void> {
  try {
    const data = new FormData();
    data.append('card_art', file);
    await pb.collection(collection).update(id, data, { requestKey: null });
  } catch (error) {
    console.error('Error saving card art:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Featured image
// ---------------------------------------------------------------------------

export async function getFeaturedImage(): Promise<FeaturedImage | null> {
  try {
    const result = await pb.collection('featured_images').getList<FeaturedImage>(1, 1, {
      sort: '-created',
      requestKey: null,
    });
    return result.items[0] ?? null;
  } catch (error) {
    console.error('Error fetching the featured image:', error);
    return null;
  }
}

/** Uploads a new featured image. The newest one is the home page hero. */
export async function uploadFeaturedImage(image: File, caption: string): Promise<FeaturedImage> {
  try {
    const data = new FormData();
    data.append('image', image);
    data.append('caption', caption.trim());
    return await pb.collection('featured_images').create<FeaturedImage>(data);
  } catch (error) {
    console.error('Error uploading the featured image:', error);
    throw error;
  }
}

/** Removes a featured image; the one before it (or the six dragons) takes its place. */
export async function deleteFeaturedImage(id: string): Promise<void> {
  try {
    await pb.collection('featured_images').delete(id);
  } catch (error) {
    console.error('Error removing the featured image:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Dungeon Master auth
// ---------------------------------------------------------------------------

export function isDungeonMaster(): boolean {
  return pb.authStore.isValid && pb.authStore.record?.collectionName === DM_COLLECTION;
}

export function dungeonMasterEmail(): string {
  return isDungeonMaster() ? String(pb.authStore.record?.email ?? '') : '';
}

/** Calls `callback` whenever the DM signs in or out. Returns an unsubscribe function. */
export function onDungeonMasterChange(callback: (isDm: boolean) => void): () => void {
  return pb.authStore.onChange(() => callback(isDungeonMaster()));
}

export async function signInDungeonMaster(email: string, password: string): Promise<void> {
  try {
    await pb.collection(DM_COLLECTION).authWithPassword(email, password, { requestKey: null });
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

export function signOutDungeonMaster(): void {
  pb.authStore.clear();
}

/** PocketBase errors carry a friendly message plus per-field details. */
export function errorMessage(error: any, fallback = 'Something went wrong.'): string {
  const fields = error?.response?.data;
  if (fields && typeof fields === 'object') {
    const first = Object.entries(fields)[0] as [string, any] | undefined;
    if (first?.[1]?.message) return `${first[0]}: ${first[1].message}`;
  }
  return error?.response?.message || error?.message || fallback;
}
