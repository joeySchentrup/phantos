/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Links the seeded lore to the pantheon members it refers to.
 *
 * An entry is linked to every member it names, however briefly, under any of
 * the spellings the documents use (Vlarunga, Kallisto, Quinn, Lotus). Two
 * things that look like names are not: "Dr. Lotus", who signs the snawk
 * report, and Port Yvander's Embrace, which is a harbour. Entries that speak
 * only of "the dragons" or "the Twins" without naming one are left unlinked.
 *
 * Only entries with no links yet are touched, and only members that exist are
 * linked, so a Dungeon Master's own choices are never overwritten.
 */

const LINKS = {
  'a-new-revelation-by-erosia': ['kalistos', 'erosia'],
  'alice': ['kalistos', 'rokesh', 'erosia'],
  'ashes-of-dawn': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'caltheris'],
  'catholic-d-and-d-encyclopaedia': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'quint', 'erosia'],
  'chione-volume-1-the-child-of-destiny': ['golestandt', 'quintara-lotus', 'rokesh', 'quint', 'erosia'],
  'comment-prendre-soin-dune-pierre-damour': ['rokesh'],
  'countries-of-hurly-after-the-tri-war-c-307-ac': ['quintara-lotus', 'rokesh', 'quint', 'erosia', 'agape'],
  'countries-of-hurly-c-300-ac': ['quint', 'erosia'],
  'the-greater-dragon-pantheon-of-hurly': ['ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'jinshi', 'agape', 'caltheris', 'zinareth', 'tiraxis', 'lurien', 'nekthar', 'varkaleth', 'velcrin', 'dregmora', 'volundra', 'ignivar', 'pyroxis', 'cryomelle', 'glaedwyn'],
  'dragons-and-their-creatures': ['ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh'],
  'dragons-walk-among-us': ['ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh'],
  'excerpts-from-the-journal-of-aderic-vale': ['vlaurunga'],
  'greater-dragons': ['jinshi', 'agape', 'caltheris', 'zinareth', 'tiraxis', 'lurien', 'nekthar', 'varkaleth', 'velcrin', 'dregmora', 'volundra', 'ignivar', 'pyroxis', 'cryomelle', 'glaedwyn'],
  'heraklion-a-musical': ['ouroras'],
  'history-of-hurley-catholic-lore': ['erosia'],
  'history-of-the-kobold-empire-catholic-lore': ['rokesh', 'erosia'],
  'the-hurlen-calendar': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'quint', 'erosia', 'jinshi', 'agape', 'caltheris', 'zinareth', 'tiraxis', 'lurien', 'nekthar', 'varkaleth', 'velcrin', 'dregmora', 'volundra', 'ignivar', 'pyroxis', 'cryomelle', 'glaedwyn'],
  'the-hurlen-war-one-year-later': ['rokesh', 'erosia'],
  'pierres-damour': ['ouroras', 'golestandt', 'quintara-lotus', 'rokesh', 'jinshi', 'agape'],
  'sanctum-dei-in-phanatos': ['kalistos'],
  'snawk-venom-and-its-uses': ['rokesh'],
  'stone-and-shadow': ['rokesh', 'erosia'],
  'the-story-of-the-two-children': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'quint', 'erosia'],
  'the-apostle-to-phanatos': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'erosia', 'jinshi', 'agape'],
  'the-dragon-doctor': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'rokesh', 'erosia', 'agape'],
  'the-fixated-father': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'quintara-lotus', 'rokesh', 'jinshi', 'agape'],
  'the-frozen-watcher': ['ouroras', 'golestandt', 'yvander', 'quintara-lotus', 'rokesh'],
  'the-last-to-choose': ['ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'quint', 'erosia'],
  'the-phantosian-volume-1': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'quint', 'erosia', 'jinshi', 'agape', 'caltheris', 'zinareth', 'tiraxis', 'lurien', 'nekthar', 'varkaleth', 'velcrin', 'dregmora', 'volundra', 'ignivar', 'pyroxis', 'cryomelle', 'glaedwyn'],
  'the-seven-emperors-of-drynell': ['erosia'],
  'the-shattering-and-the-severing': ['rokesh', 'quint', 'erosia'],
  'the-stories-we-inherited-from-the-light': ['golestandt', 'quint', 'erosia'],
  'the-tale-of-the-thread-and-the-loom': ['quint', 'erosia'],
  'the-twilight-weave': ['golestandt', 'quint', 'erosia'],
  'the-window-to-the-light': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh'],
  'top-secret-the-children-of-rokesh': ['rokesh'],
  'vlaurungas-kids': ['kalistos', 'ouroras', 'golestandt', 'vlaurunga', 'yvander', 'quintara-lotus', 'rokesh', 'nekthar', 'ignivar', 'pyroxis'],
  'what-happened-in-doran': ['rokesh'],
};

migrate(
  (app) => {
    const ids = {};
    const members = app.findRecordsByFilter('pantheon', 'slug != ""', '', 0, 0);
    for (let i = 0; i < members.length; i++) {
      ids[members[i].getString('slug')] = members[i].id;
    }

    for (const slug in LINKS) {
      const linked = [];
      for (let i = 0; i < LINKS[slug].length; i++) {
        if (ids[LINKS[slug][i]]) linked.push(ids[LINKS[slug][i]]);
      }
      if (!linked.length) continue;

      // Plain SQL, so the save hooks don't recount words or bump `updated`.
      app
        .db()
        .newQuery("UPDATE lore SET pantheon = {:pantheon} WHERE slug = {:slug} AND (pantheon = '[]' OR pantheon = '' OR pantheon IS NULL)")
        .bind({ pantheon: JSON.stringify(linked), slug: slug })
        .execute();
    }
  },
  (app) => {
    for (const slug in LINKS) {
      app.db().newQuery("UPDATE lore SET pantheon = '[]' WHERE slug = {:slug}").bind({ slug: slug }).execute();
    }
  }
);
