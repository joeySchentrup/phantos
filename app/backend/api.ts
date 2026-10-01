import type { ListResult } from 'pocketbase';
import type { Era, EraInput, TimelinePoint, TimelinePointInput } from '../types/chronicle';
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
  'id,collectionId,collectionName,slug,title,category,attribute,author,summary,cover,word_count,published,year,circa,created';

/** Everything a pantheon card needs; the document body stays behind. */
const PANTHEON_FIELDS =
  'id,collectionId,collectionName,slug,name,rank,attributes,domain,summary,image,published,created';

/** Everything a hero card needs; the backstory stays behind. */
const HERO_FIELDS =
  'id,collectionId,collectionName,slug,name,player,species,class,subclass,background,alignment,faith,attribute,summary,portrait,published,created';

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

/** Deletes the hero; their updates go with them. */
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
