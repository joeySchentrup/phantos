import type { ListResult } from 'pocketbase';
import type {
  FeaturedImage,
  FeaturedImageConfig,
  LoreCategory,
  LoreEntry,
  LoreSummary,
  SearchHit,
} from '../types/lore';
import pb from './pocketbaseClient';

const DM_COLLECTION = 'dungeon_masters';

/** Everything a card needs. Bodies can run to 300 KB, so lists leave them out. */
const SUMMARY_FIELDS =
  'id,collectionId,collectionName,slug,title,category,attribute,author,summary,cover,word_count,published,created';

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

export async function getFeaturedImageConfig(): Promise<FeaturedImageConfig> {
  try {
    return await pb.send('/api/phantos/featured-image', { method: 'GET', requestKey: null });
  } catch (error) {
    console.error('Error fetching featured image settings:', error);
    throw error;
  }
}

/** Renders a new featured image on the server. Can take a minute or two. */
export async function generateFeaturedImage(prompt: string): Promise<FeaturedImage> {
  try {
    return await pb.send('/api/phantos/featured-image', {
      method: 'POST',
      body: { prompt },
      requestKey: null,
    });
  } catch (error) {
    console.error('Error generating the featured image:', error);
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
