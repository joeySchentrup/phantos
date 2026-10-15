/** Everything the song list needs — lyrics stay behind until a song is opened. */
export interface Song {
  id: string;
  collectionId: string;
  collectionName?: string;
  slug: string;
  title: string;
  /** Who wrote or sang it, as the DM put it ("Sung by Lisette"); may be empty. */
  credit: string;
  /** The MP3's filename. */
  audio: string;
  /** Whole seconds; 0 when not known. */
  duration: number;
  published: boolean;
  created: string;
}

export interface SongEntry extends Song {
  /** Plain text; its line breaks are the verse. */
  lyrics: string;
  updated: string;
}
