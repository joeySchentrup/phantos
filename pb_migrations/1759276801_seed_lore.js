/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds the archive with the original lore documents from /lore.
 *
 * The files ship inside the Docker image at /pb/lore (LORE_DIR). Each entry
 * below maps one file to its card: category (the card frame), attribute (the
 * elemental orb), and a one-line summary for the feed. Markdown files become
 * the record's content; images become the cover of a map entry.
 *
 * Entries are created in this order, so the last ones are the newest cards in
 * the feed; the maps go first.
 *
 * Runs once. If the folder can't be found the migration fails loudly, so it is
 * retried on the next start instead of leaving an empty archive behind.
 */

const ENTRIES = [
  {"file": "World map.jpg", "title": "Map of the World", "slug": "map-of-the-world", "category": "map", "attribute": "ice", "author": "", "summary": "The known world: the great continent of Neua with Cove Point and the Kobold Coast, the crescent of Korre, and Hurley across the sea."},
  {"file": "Hurley political map.jpg", "title": "Political Map of Hurly", "slug": "political-map-of-hurly", "category": "map", "attribute": "earth", "author": "", "summary": "The nations of Hurly from Rus to Xeries, between the Silver Sea, the Slaver's Sea, and the Blood Sea."},
  {"file": "Korre.jpg", "title": "Map of Korre", "slug": "map-of-korre", "category": "map", "attribute": "fire", "author": "", "summary": "The crescent continent of Korre: the Gnomish Republic, the Elven Confederacy, the Dwelven Lands, the Jordan Kingdom, and the Kobold city across the Rocky Sea."},
  {"file": "Map of Nova Roma.png", "title": "Map of Nova Roma", "slug": "map-of-nova-roma", "category": "map", "attribute": "divine", "author": "", "summary": "Many paths, one light. The eternal city on Phanatos, its districts named for the six dragons, around the Cathedral of St. Surculus on the River of Fate."},
  {"file": "A New Revelation by Erosia (Ferdinand).md", "title": "A New Revelation by Erosia", "slug": "a-new-revelation-by-erosia", "category": "myth", "attribute": "dark", "author": "Oracle of Erosia", "summary": "The Oracle of Erosia speaks to Duke Ferdinand of the Master between Kalistos and the dragons, and of the Enpeecies and Peecies who live beneath him."},
  {"file": "Alice.md", "title": "Alice", "slug": "alice", "category": "tale", "attribute": "earth", "author": "", "summary": "The saga of Alice, a young Metabold of the Imperial Kobold Secret Service, from the order out of Korland to the stone crown and beyond."},
  {"file": "Archmagister Vartemus Luxor the Infallible bio.md", "title": "Archmagister Vartemus Luxor the Infallible", "slug": "archmagister-vartemus-luxor-the-infallible", "category": "chronicle", "attribute": "arcane", "author": "", "summary": "A biography of the abrasive archmagister and philosopher whose skepticism marked the twilight of the High Drynell Period."},
  {"file": "Ashes of Dawn.md", "title": "Ashes of Dawn", "slug": "ashes-of-dawn", "category": "dragon", "attribute": "fire", "author": "Vlaurunga", "summary": "A recollection of Vlaurunga, Primal Dragon of Fire, who likes mortals, their taverns, and losing money to them at cards."},
  {"file": "Catholic D&D Encyclopaedia.md", "title": "Catholic D&D Encyclopaedia", "slug": "catholic-d-and-d-encyclopaedia", "category": "codex", "attribute": "light", "author": "", "summary": "An A–Z of the heroes, peoples, and factions of Hurly, from Aleia of Hossari to the Avengers of the Hurlen Alliance."},
  {"file": "Chione_ Volume 1_ The Child of Destiney.md", "title": "Chione, Volume 1: The Child of Destiny", "slug": "chione-volume-1-the-child-of-destiny", "category": "tale", "attribute": "earth", "author": "", "summary": "Beginning in 1 AC on the crescent continent of Korre, the first thirty years of Chione's life amid the Kobold Empire and the Federation that stands against it."},
  {"file": "Comment prendre soin d’une Pierre d’Amour.md", "title": "Comment prendre soin d’une Pierre d’Amour", "slug": "comment-prendre-soin-dune-pierre-damour", "category": "dispatch", "attribute": "earth", "author": "Kedgelony de Korland", "summary": "« La pierre se souvient. » A Kobold-language handbook for new keepers of a living love stone, published with the Kedgelony's approval."},
  {"file": "Countries of Hurly after the Tri-War c. 307 AC.md", "title": "Countries of Hurly after the Tri-War (c. 307 AC)", "slug": "countries-of-hurly-after-the-tri-war-c-307-ac", "category": "chronicle", "attribute": "earth", "author": "", "summary": "A geopolitical survey of Hurly three years after the Tri-War, when nearly every state lives as a protectorate of the Kobold Empire."},
  {"file": "Countries of Hurly c. 300 AC.md", "title": "Countries of Hurly (c. 300 AC)", "slug": "countries-of-hurly-c-300-ac", "category": "chronicle", "attribute": "light", "author": "", "summary": "A snapshot of every nation of Hurly between the Great Hurlen War and the Tri-War: rulers, borders, and the shape of the land."},
  {"file": "Dark-Ruler Ha-Des_ The Last Emperor of Drynell.md", "title": "Dark-Ruler Ha-Des: The Last Emperor of Drynell", "slug": "dark-ruler-ha-des-the-last-emperor-of-drynell", "category": "chronicle", "attribute": "dark", "author": "", "summary": "Some names are preserved because men are afraid to forget them. The true history behind the monster of Hurly's bedtime stories."},
  {"file": "Dnd Languages and Equvilents.md", "title": "D&D Languages and Equivalents", "slug": "d-and-d-languages-and-equivalents", "category": "codex", "attribute": "arcane", "author": "", "summary": "The tongues of Phantos and the real-world languages that give them voice at the table: Kobold is French, Twili is Welsh, Draconic is Gaelic."},
  {"file": "Draconic Pantheon.md", "title": "The Greater Dragon Pantheon of Hurly", "slug": "the-greater-dragon-pantheon-of-hurly", "category": "myth", "attribute": "divine", "author": "", "summary": "The Six Primal Dragons and the fifteen Greater Dragons born of their unions, each a domain of balance, relationship, and transformation."},
  {"file": "Dragons and their creatures.md", "title": "Dragons and Their Creatures", "slug": "dragons-and-their-creatures", "category": "codex", "attribute": "divine", "author": "", "summary": "Which Primal Dragon shaped which peoples, from Ouro'ras's humans and elves to Rokesh's Kobolds and centaurs."},
  {"file": "DRAGONS WALK AMONG US.md", "title": "Dragons Walk Among Us???", "slug": "dragons-walk-among-us", "category": "dispatch", "attribute": "light", "author": "J. W. Pindlewick", "summary": "Citizens of Hurly, WAKE UP. An opinion column submitted to The Heraklion Lantern by an independent dracological investigator."},
  {"file": "Electrum.md", "title": "Electrum", "slug": "electrum", "category": "codex", "attribute": "arcane", "author": "", "summary": "The Electrum shop, the level-up cost calculator, and the ledger of who holds how much electrum."},
  {"file": "Empire Secures the Sky_ Kobold Alliance with the Harpies of Neua Reshapes the Continental Balance.md", "title": "Empire Secures the Sky: Kobold Alliance with the Harpies of Neua Reshapes the Continental Balance", "slug": "empire-secures-the-sky", "category": "dispatch", "attribute": "earth", "author": "Marcellin Veyre", "summary": "NEW KORLAND, NEUA: the Kobold Empire enters an alliance with the Harpy Eyries, and the Coalition cries foul."},
  {"file": "Epic Poem for DND by Lisette.md", "title": "Epic Poem for D&D", "slug": "epic-poem-for-d-and-d", "category": "tale", "attribute": "light", "author": "Lisette", "summary": "An epic in cantos of the Seven Emperors of Drynell, beginning with Metapo, the Fortunate Flame."},
  {"file": "Excerpts from the Journal of Aderic Vale.md", "title": "Excerpts from the Journal of Aderic Vale", "slug": "excerpts-from-the-journal-of-aderic-vale", "category": "tale", "attribute": "fire", "author": "Aderic Vale", "summary": "The journal of the first Metal Adventurer, who met a red-haired woman on the road when she fell out of a tree."},
  {"file": "Greater Dragons.md", "title": "Greater Dragons", "slug": "greater-dragons", "category": "codex", "attribute": "divine", "author": "", "summary": "The fifteen Greater Dragons at a glance: their parent elements and the domains they govern."},
  {"file": "Heraklion.md", "title": "Heraklion (A Musical)", "slug": "heraklion-a-musical", "category": "tale", "attribute": "light", "author": "", "summary": "Excerpt from the musical: General Karl of Ismakale lays siege to the city of splendor while High Priestess Rosio keeps the faith."},
  {"file": "History of Hurley (Catholic Lore).md", "title": "History of Hurley (Catholic Lore)", "slug": "history-of-hurley-catholic-lore", "category": "chronicle", "attribute": "light", "author": "", "summary": "A timeline of the continent from the Erosian Wars and the rise of Drynell to the Hurlen War and the Tri-War."},
  {"file": "History of the Kobold Empire (Catholic Lore).md", "title": "History of the Kobold Empire (Catholic Lore)", "slug": "history-of-the-kobold-empire-catholic-lore", "category": "chronicle", "attribute": "earth", "author": "", "summary": "From the Great Kobold Exile and the taming of the snawks to the empire of the Kledgelony."},
  {"file": "Hurlen Calendar description.md", "title": "The Hurlen Calendar", "slug": "the-hurlen-calendar", "category": "codex", "attribute": "divine", "author": "", "summary": "Fifteen months named for the Greater Dragons, six-day weeks named for the Primal Dragons, and four holy days that belong to no month at all."},
  {"file": "News Bulletin---The Hurlen War_ One Year Later.md", "title": "The Hurlen War: One Year Later", "slug": "the-hurlen-war-one-year-later", "category": "dispatch", "attribute": "earth", "author": "Krase Frain", "summary": "The amazing reporter Krase Frain looks back on the War of the Worlds. Long live the Empress! Long live Rokesh!"},
  {"file": "On the Seven Artifacts_ A Treatise by Archmagister Vartemus Luxor the Infallible.md", "title": "On the Seven Artifacts", "slug": "on-the-seven-artifacts", "category": "dispatch", "attribute": "arcane", "author": "Vartemus Luxor the Infallible", "summary": "The Archmagister Emeritus corrects the historical record on the so-called divine relics, for those unfortunate enough to be educated elsewhere."},
  {"file": "Pierres d_Amour.md", "title": "Pierres d’Amour", "slug": "pierres-damour", "category": "myth", "attribute": "earth", "author": "", "summary": "How Quintara Lotus, who truly loved Rokesh, made a gift that became the first of the love stones."},
  {"file": "SANCTUM DEI IN PHANATOS.md", "title": "Sanctum Dei in Phanatos", "slug": "sanctum-dei-in-phanatos", "category": "myth", "attribute": "divine", "author": "", "summary": "A solemn inquiry into whether Kalistos, the One-Before-the-First, is the Triune God confessed in the Creed."},
  {"file": "Snawk Report.md", "title": "Snawk Venom and Its Uses", "slug": "snawk-venom-and-its-uses", "category": "dispatch", "attribute": "earth", "author": "Dr. Lotus", "summary": "A paper on how snawk venom made the Metabolds and shaped modern Imperial Kobold society."},
  {"file": "Stone and Shadow.md", "title": "Stone and Shadow", "slug": "stone-and-shadow", "category": "tale", "attribute": "earth", "author": "", "summary": "At Outpost Z-73 in the fog of Monteforte, a guard named Louis is the only one who speaks when she returns."},
  {"file": "Story of the Two Children.md", "title": "The Story of the Two Children", "slug": "the-story-of-the-two-children", "category": "myth", "attribute": "light", "author": "Miathra 5", "summary": "How the Six Primal Dragons made Quint to rule the day and Erosia to rule the night, and how the night rebelled."},
  {"file": "The Apostle to Phanatos.md", "title": "The Apostle to Phanatos", "slug": "the-apostle-to-phanatos", "category": "tale", "attribute": "divine", "author": "", "summary": "Auxiliary Bishop Roger Barron dreams of a garden not of this Earth and is sent to preach to a world beyond his own."},
  {"file": "The Dragon Doctor.md", "title": "The Dragon Doctor", "slug": "the-dragon-doctor", "category": "dragon", "attribute": "arcane", "author": "Quintara Lotus", "summary": "Quintara Lotus, who never understood why creation requires a plan, tells how she poured mana into an empty world."},
  {"file": "The Fixated Father.md", "title": "The Fixated Father", "slug": "the-fixated-father", "category": "dragon", "attribute": "earth", "author": "Rokesh", "summary": "I remember when the earth was quiet. Rokesh, dragon of the earth, recalls the stone, the beasts, and the Kobolds he loved too well."},
  {"file": "The Frozen Watcher.md", "title": "The Frozen Watcher", "slug": "the-frozen-watcher", "category": "dragon", "attribute": "ice", "author": "Yvander", "summary": "They call Yvander cold. She has never cared enough to tell them they mistook coldness for the absence of love."},
  {"file": "The Last to Choose.md", "title": "The Last to Choose", "slug": "the-last-to-choose", "category": "dragon", "attribute": "dark", "author": "Golestandt", "summary": "A lament of Golestandt, who remembers the night before there was sorrow and the Twili rising from moonless pools."},
  {"file": "The Phantosian V. 1.md", "title": "The Phantosian, Volume 1", "slug": "the-phantosian-volume-1", "category": "codex", "attribute": "divine", "author": "", "summary": "The collected compendium: timelines, the pantheon, the calendar, the great myths, and the countries of Hurly in one volume."},
  {"file": "The Prophecy of the St Surculus.md", "title": "The Prophecy of St. Surculus", "slug": "the-prophecy-of-st-surculus", "category": "myth", "attribute": "divine", "author": "", "summary": "Look upon the tree which was planted in the first garden: the prophecy of the branch that passed beyond the veil and took root beneath another heaven."},
  {"file": "The Seven Emperors of Drynell.md", "title": "The Seven Emperors of Drynell", "slug": "the-seven-emperors-of-drynell", "category": "chronicle", "attribute": "light", "author": "", "summary": "Seven crowns for seven hands: a folk legend of the emperors who rose and fell with the lost artifacts of Drynell."},
  {"file": "The Shattering and the Severing_ A Tale of the Hurlen War.md", "title": "The Shattering and the Severing", "slug": "the-shattering-and-the-severing", "category": "tale", "attribute": "dark", "author": "", "summary": "In the three-hundredth year of the Age of Concord, Gillian Gearson broke an ancient seal in Hossari, and Erosia rose from the twilight."},
  {"file": "The Stories We Inherited from the Light.md", "title": "The Stories We Inherited from the Light", "slug": "the-stories-we-inherited-from-the-light", "category": "tale", "attribute": "dark", "author": "", "summary": "A Twili tale from within the Twilight, told in the violet courts of Nhal'Sereth, where no sun rises and there are still shadows."},
  {"file": "The Tale of the Thread and the Loom.md", "title": "The Tale of the Thread and the Loom", "slug": "the-tale-of-the-thread-and-the-loom", "category": "myth", "attribute": "light", "author": "", "summary": "A fable of Quint and Erosia, woven rather than born, and the balance of the world they were given to share."},
  {"file": "The Twilight Weave_ A Twili Creation Myth.md", "title": "The Twilight Weave", "slug": "the-twilight-weave", "category": "myth", "attribute": "dark", "author": "", "summary": "A Twili creation myth: Golestandt looked inward, listened to the hush between heartbeats, and wove the creatures of dusk."},
  {"file": "The Well of Nine Drops.md", "title": "The Well of Nine Drops", "slug": "the-well-of-nine-drops", "category": "tale", "attribute": "ice", "author": "", "summary": "Hidden in an impossible valley, a well that grants any wish, but only to those most in need. A weary traveler named Eli finds it."},
  {"file": "The Window to the Light.md", "title": "The Window to the Light", "slug": "the-window-to-the-light", "category": "dragon", "attribute": "light", "author": "Ouro’ras", "summary": "In the beginning there was Light, not mine, never mine. Ouro'ras on being a window, not the flame."},
  {"file": "TOP SECRET - The Children of Rokesh.md", "title": "TOP SECRET: The Children of Rokesh", "slug": "top-secret-the-children-of-rokesh", "category": "dispatch", "attribute": "earth", "author": "Special Agent Mathalus, KSB", "summary": "Threat assessment: HIGH. A Kobold Security Bureau dossier on the cult that would depose Empress Joan."},
  {"file": "Vlarunga_s Kids.md", "title": "Vlaurunga's Kids", "slug": "vlaurungas-kids", "category": "dragon", "attribute": "fire", "author": "Vlaurunga", "summary": "Vlaurunga has never understood why everyone thinks creation ought to be gentle."},
  {"file": "What happened in Doran.md", "title": "What Happened in Doran", "slug": "what-happened-in-doran", "category": "tale", "attribute": "earth", "author": "", "summary": "A name spoken in hushed reverence beneath Korland: Alice, Metabold of the IKSS, sent on the mission that went wrong in Doran."},
];

function loreDir(app) {
  const fromEnv = $os.getenv('LORE_DIR');
  if (fromEnv) return fromEnv.replace(/[\/]+$/, '');
  return app.dataDir() + '/../lore';
}

/** Rough word count of a markdown document (ignores table rules and markup). */
function countWords(markdown) {
  const text = markdown
    .replace(/\[\^[^\]]*\]/g, ' ')
    .replace(/\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>|`\[\]{}~-]+/g, ' ');
  const words = text.split(/\s+/);
  let n = 0;
  for (let i = 0; i < words.length; i++) {
    if (/[\p{L}\p{N}]/u.test(words[i])) n++;
  }
  return n;
}

migrate(
  (app) => {
    const dir = loreDir(app);
    const collection = app.findCollectionByNameOrId('lore');

    for (let i = 0; i < ENTRIES.length; i++) {
      const entry = ENTRIES[i];
      const path = dir + '/' + entry.file;

      try {
        $os.stat(path);
      } catch (err) {
        throw new Error(
          'Lore seed file not found: ' + path + '. Set LORE_DIR to the folder holding the lore documents.'
        );
      }

      const record = new Record(collection);
      record.set('title', entry.title);
      record.set('slug', entry.slug);
      record.set('category', entry.category);
      record.set('attribute', entry.attribute);
      record.set('author', entry.author);
      record.set('summary', entry.summary);
      record.set('published', true);

      if (/\.md$/i.test(entry.file)) {
        const content = toString($os.readFile(path));
        record.set('content', content);
        record.set('word_count', countWords(content));
      } else {
        record.set('cover', $filesystem.fileFromPath(path));
        record.set('word_count', 0);
      }

      app.save(record);
    }
  },
  (app) => {
    const slugs = ENTRIES.map((e) => e.slug);
    for (let i = 0; i < slugs.length; i++) {
      try {
        app.delete(app.findFirstRecordByData('lore', 'slug', slugs[i]));
      } catch (err) {
        // already gone
      }
    }
  }
);
