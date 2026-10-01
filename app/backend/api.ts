import type { ListResult } from 'pocketbase';
import type { Era, EraInput, TimelinePoint, TimelinePointInput } from '../types/chronicle';
import type {
  FeaturedImage,
  LoreCategory,
  LoreEntry,
  LoreSummary,
  SearchHit,
} from '../types/lore';
import pb from './pocketbaseClient';

const DM_COLLECTION = 'dungeon_masters';

/** Everything a card needs. Bodies can run to 300 KB, so lists leave them out. */
const SUMMARY_FIELDS =
  'id,collectionId,collectionName,slug,title,category,attribute,author,summary,cover,word_count,published,year,circa,created';

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

export async function getLoreBySlug(slug: string): Promise<LoreEntry> {
  try {
    return await pb
      .collection('lore')
      .getFirstListItem<LoreEntry>(pb.filter('slug = {:slug}', { slug }), { requestKey: null });
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
