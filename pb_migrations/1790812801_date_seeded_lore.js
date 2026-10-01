/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Gives the seeded lore its in-universe date, so it appears on the Chronicle.
 *
 * How each entry was dated:
 * - a story or history sits where its events happen (where they begin, if
 *   they span years);
 * - an in-world document (a report, a column, a decree) sits where it was
 *   written;
 * - reference material and maps sit in the campaign's present, c. 307 AC,
 *   unless they describe an earlier moment.
 *
 * Negative years are BC, positive are AC. `circa` marks every date the lore
 * implies rather than states. Notes on the ones that needed a judgment call:
 *
 * - Creation (-11000): the lore gives no year for the Great Hatching, only
 *   that it came before the Erosian Wars of c. 10000 BC. This is a placeholder
 *   that sorts the Era of Awakening first.
 * - The Apostle to Phanatos (125): Sanctum Dei is signed after the Hurlen War
 *   in the "2207th Year of Grace"; counting back to a bishop of the 2020s puts
 *   his arrival about 180 years before the war's end. The Papal State is
 *   already a nation by 195 AC, which fits.
 * - The Hurlen Calendar (1): the year the count begins.
 * - Alice and What Happened in Doran (298): Alice is "barely more than a
 *   whelp" at Doran and already the Reaper by the war of 301–304 AC.
 *
 * Two tales give nothing to date them by ("long ago", "distant antiquity")
 * and are left for the Dungeon Master: The Well of Nine Drops and Excerpts
 * from the Journal of Aderic Vale.
 *
 * Only entries that still have no date are touched, so a DM's own dates are
 * never overwritten.
 */

const CREATION = -11000;

const DATES = [
  // The Era of Awakening
  { slug: 'the-greater-dragon-pantheon-of-hurly', year: CREATION, circa: true },
  { slug: 'greater-dragons', year: CREATION, circa: true },
  { slug: 'dragons-and-their-creatures', year: CREATION, circa: true },
  { slug: 'pierres-damour', year: CREATION, circa: true },
  { slug: 'the-dragon-doctor', year: CREATION, circa: true },
  { slug: 'the-fixated-father', year: CREATION, circa: true },
  { slug: 'the-frozen-watcher', year: CREATION, circa: true },
  { slug: 'the-window-to-the-light', year: CREATION, circa: true },
  { slug: 'vlaurungas-kids', year: CREATION, circa: true },

  // The Erosian Wars, c. 10000 BC
  { slug: 'the-story-of-the-two-children', year: -10000, circa: true },
  { slug: 'the-tale-of-the-thread-and-the-loom', year: -10000, circa: true },
  { slug: 'the-twilight-weave', year: -10000, circa: true },
  { slug: 'the-last-to-choose', year: -10000, circa: true },
  { slug: 'history-of-hurley-catholic-lore', year: -10000, circa: true },

  // Drynell, c. 9500–8500 BC
  { slug: 'the-seven-emperors-of-drynell', year: -9500, circa: true },
  { slug: 'epic-poem-for-d-and-d', year: -9500, circa: true },
  { slug: 'history-of-the-kobold-empire-catholic-lore', year: -9000, circa: true },
  { slug: 'dark-ruler-ha-des-the-last-emperor-of-drynell', year: -8500, circa: true },
  { slug: 'ashes-of-dawn', year: -8500, circa: true },

  // Vartemus Luxor, c. 1100–980 BC
  { slug: 'archmagister-vartemus-luxor-the-infallible', year: -1100, circa: true },
  { slug: 'on-the-seven-artifacts', year: -1000, circa: true },

  // The Age of Concord
  { slug: 'chione-volume-1-the-child-of-destiny', year: 1, circa: false },
  { slug: 'the-hurlen-calendar', year: 1, circa: true },
  { slug: 'heraklion-a-musical', year: 33, circa: false },
  { slug: 'the-apostle-to-phanatos', year: 125, circa: true },
  { slug: 'the-prophecy-of-st-surculus', year: 150, circa: true },

  // The eve of the Hurlen War
  { slug: 'alice', year: 298, circa: true },
  { slug: 'what-happened-in-doran', year: 298, circa: true },
  { slug: 'the-stories-we-inherited-from-the-light', year: 299, circa: true },
  { slug: 'the-shattering-and-the-severing', year: 300, circa: false },
  { slug: 'countries-of-hurly-c-300-ac', year: 300, circa: true },
  { slug: 'political-map-of-hurly', year: 300, circa: true },
  { slug: 'snawk-venom-and-its-uses', year: 300, circa: true },
  { slug: 'top-secret-the-children-of-rokesh', year: 300, circa: true },

  // The Hurlen War (the Tri-War), 301–304 AC
  { slug: 'catholic-d-and-d-encyclopaedia', year: 301, circa: true },
  { slug: 'the-hurlen-war-one-year-later', year: 302, circa: false },
  { slug: 'a-new-revelation-by-erosia', year: 302, circa: true },
  { slug: 'stone-and-shadow', year: 302, circa: true },

  // After the war
  { slug: 'sanctum-dei-in-phanatos', year: 305, circa: true },
  { slug: 'countries-of-hurly-after-the-tri-war-c-307-ac', year: 307, circa: true },
  { slug: 'empire-secures-the-sky', year: 307, circa: true },
  { slug: 'dragons-walk-among-us', year: 307, circa: true },
  { slug: 'comment-prendre-soin-dune-pierre-damour', year: 307, circa: true },
  { slug: 'the-phantosian-volume-1', year: 307, circa: true },
  { slug: 'electrum', year: 307, circa: true },
  { slug: 'd-and-d-languages-and-equivalents', year: 307, circa: true },
  { slug: 'map-of-the-world', year: 307, circa: true },
  { slug: 'map-of-korre', year: 307, circa: true },
  { slug: 'map-of-nova-roma', year: 307, circa: true },
];

migrate(
  (app) => {
    // Plain SQL, so the save hooks don't recount words or bump `updated`.
    for (let i = 0; i < DATES.length; i++) {
      app
        .db()
        .newQuery('UPDATE lore SET year = {:year}, circa = {:circa} WHERE slug = {:slug} AND year = 0')
        .bind(DATES[i])
        .execute();
    }
  },
  (app) => {
    for (let i = 0; i < DATES.length; i++) {
      app
        .db()
        .newQuery('UPDATE lore SET year = 0, circa = FALSE WHERE slug = {:slug} AND year = {:year}')
        .bind(DATES[i])
        .execute();
    }
  }
);
