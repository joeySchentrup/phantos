/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds the Pantheon from what the lore says of it: Kalistos, the Six Primal
 * Dragons, the Twins and the fifteen Greater Dragons.
 *
 * The text is drawn from the seeded documents: the pantheon tables, the
 * calendar, the myths of the Twins and the dragons' own recollections.
 *
 * Portraits: the Dungeon Master has already given each Primal Dragon's
 * recollection its card art. Where that lore entry still exists and has a
 * cover, the image is copied to the dragon's pantheon card. Nobody else has a
 * portrait of their own yet, so their cards show their element instead.
 *
 * Runs once; a member whose URL name is already taken is left alone.
 */

const ELEMENTS = {
  light: { label: 'Light', slug: 'ouroras', name: 'Ouro’ras' },
  dark: { label: 'Darkness', slug: 'golestandt', name: 'Golestandt' },
  fire: { label: 'Fire', slug: 'vlaurunga', name: 'Vlaurunga' },
  ice: { label: 'Ice', slug: 'yvander', name: 'Yvander' },
  arcane: { label: 'the Arcane', slug: 'quintara-lotus', name: 'Quintara Lotus' },
  earth: { label: 'Earth', slug: 'rokesh', name: 'Rokesh' },
};

/** The fifteen, in the order of the months they give their names to. */
const GREATER = [
  { name: 'Jinshi', of: ['light', 'dark'], domain: 'Life', text: 'The first and leader of the Greater Dragons; embodies harmony, healing, and the sacred breath of being.', more: 'Jinshi, daughter of Ouro’ras and Golestandt, was the first of the Greater Dragons and was appointed their leader. Her siblings revere her, for she does not only embody harmony: she nurtures it.' },
  { name: 'Agape', of: ['arcane', 'earth'], domain: 'Love', text: 'Born of true divine affection; governs connection, unity, and sacrificial compassion.', more: 'Agape was the last of the fifteen, and the only one born rather than made. Quintara Lotus did not wish to create just any dragon with Rokesh, so she made the *pierres d’amour*, the love stones, as a gift for his Kobolds. Rokesh loved them, and so loved her, and Agape was the fruit of that love. With her birth the stones changed: their small souls became stronger and their bonds truer.\n\nShe rules the unseen thread that ties all beings together, and is said not to balance the other fourteen but to complete them.\n\nAfter the Tri-War, shrines to Rokesh, Agape and [Erosia](/pantheon/erosia) rose across Ishmakale as symbols of memory, balance and reconciliation.' },
  { name: 'Caltheris', of: ['light', 'fire'], domain: 'Lightning', text: 'Herald of divine judgment and energy; dragon of inspiration, rebellion, and speed.', more: 'Vlaurunga, recalling how slowly she fell in love with a mortal, remarks that love descending like lightning “would have been Caltheris’s style”.' },
  { name: 'Zinareth', of: ['light', 'ice'], domain: 'Mischief', text: 'Trickster dragon of holy chaos; disrupts with purpose, mocks the proud, frees the bound.' },
  { name: 'Tiraxis', of: ['light', 'arcane'], domain: 'Paradox', text: 'Mystical riddler; speaks in contradiction, governs duality, magical tension, and hidden truth.' },
  { name: 'Lurien', of: ['light', 'earth'], domain: 'Growth', text: 'Patient nourisher of fields, stoneworks, and civilizations; spirit of quiet flourishing.' },
  { name: 'Nekthar', of: ['dark', 'fire'], domain: 'Destruction', text: 'Volcano-blooded wrath; patron of war, cataclysm, and cleansing flame.', more: 'Nekthar is among the Greater Dragons who call Vlaurunga irresponsible, and thinks she should command armies.' },
  { name: 'Varkaleth', of: ['dark', 'ice'], domain: 'Acid', text: 'Dragon of corrosion and entropy; feared guardian of unmaking and bodily decay.' },
  { name: 'Velcrin', of: ['dark', 'arcane'], domain: 'Secrets', text: 'Keeper of the lost and forbidden; rules prophecy, forgotten tongues, and buried truths.' },
  { name: 'Dregmora', of: ['dark', 'earth'], domain: 'Decay', text: 'Oversees death’s necessity and the fertility of rot; ensures cycles remain sacred.' },
  { name: 'Volundra', of: ['fire', 'ice'], domain: 'Storms', text: 'Dragon of weather, pressure, and unpredictability; dances in the clash of elements.' },
  { name: 'Ignivar', of: ['fire', 'arcane'], domain: 'Alchemy', text: 'Crafter of invention and transmutation; source of magical innovation and wild brilliance.', more: 'Ignivar once tried to explain to Vlaurunga that her children needed “structured divine instruction”. She threw him into a lake.' },
  { name: 'Pyroxis', of: ['fire', 'earth'], domain: 'Metal', text: 'Patron of the forge and industry; smith of weapons and guardian of stone cities.', more: 'Pyroxis is among the Greater Dragons who call Vlaurunga irresponsible, and thinks she should oversee every forge.' },
  { name: 'Cryomelle', of: ['ice', 'arcane'], domain: 'Time', text: 'Controls rhythm, memory, and destiny’s frozen flow; cold clockmaker of fate.' },
  { name: 'Glaedwyn', of: ['ice', 'earth'], domain: 'Plants', text: 'Tender of the wild and green; governs forests, root wisdom, and living growth.' },
];

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth'];

function link(element) {
  return '[' + ELEMENTS[element].name + '](/pantheon/' + ELEMENTS[element].slug + ')';
}

/** "- [Jinshi](/pantheon/jinshi), Greater Dragon of Life, with [Golestandt](…)" for each child of `element`. */
function childrenOf(element) {
  const lines = [];
  for (let i = 0; i < GREATER.length; i++) {
    const g = GREATER[i];
    const at = g.of.indexOf(element);
    if (at === -1) continue;
    lines.push('- [' + g.name + '](/pantheon/' + g.name.toLowerCase() + '), Greater Dragon of ' + g.domain + ', with ' + link(g.of[1 - at]));
  }
  return lines.join('\n');
}

function greaterContent(g, index) {
  const parts = [
    '**' + g.name + '** is the Greater Dragon of ' + g.domain + ', one of the fifteen born of two Primal Dragons: ' +
      link(g.of[0]) + ', Dragon of ' + ELEMENTS[g.of[0]].label + ', and ' + link(g.of[1]) + ', Dragon of ' + ELEMENTS[g.of[1]].label + '.',
    g.text,
  ];
  if (g.more) parts.push(g.more);
  parts.push('## In the calendar\n\n**' + g.name + '** is the ' + ORDINALS[index] + ' of the fifteen months of the Hurlen year.');
  return parts.join('\n\n');
}

const MEMBERS = [
  {
    name: 'Kalistos',
    slug: 'kalistos',
    rank: 'creator',
    attributes: ['divine'],
    domain: 'All Things',
    summary: 'The One-Before-the-First, Maker of the Heavens. He gave Phanatos to the Six Primal Dragons and governs it through them.',
    content: [
      '**Kalistos** is the creator: the One-Before-the-First, Maker of the Heavens, Hidden Architect of Time. He gave the world of Phanatos to the Six Primal Dragons, who keep it for him. Some tellings write his name Kallisto.',
      'Kalistos seldom acts upon Phanatos directly. He governs through those he made: the Primal Dragons, the Greater Dragons and the Twins. [Ouro’ras](/pantheon/ouroras) calls himself only a ray of the Light that Kalistos is, and [Rokesh](/pantheon/rokesh) “only a creature beneath Kalistos”.',
      '## In the calendar\n\nTwo of the four holy days that belong to no month are his. The **Day of the Flame Crown** marks the new year with reflection and gratitude, and the **Day of the Breath Eternal** is kept in midsummer as the “Sigh of Creation”. The corrective **Day of Realignment**, added roughly every three years, is dedicated to him as well.',
      '## In the Church\n\nThe apostolic constitution *Sanctum Dei in Phanatos* declares that Kalistos is the same God confessed in the Creed, and that the dragons and the Twins are his created ministers: to be honoured, never adored.',
      '## Other tellings\n\nThe Oracle of Erosia teaches that another being, the Master, stands between Kalistos and the dragons.',
    ].join('\n\n'),
  },
  {
    name: 'Ouro’ras',
    slug: 'ouroras',
    rank: 'primal',
    attributes: ['light'],
    domain: 'Light',
    portrait: 'the-window-to-the-light',
    summary: 'Dragon of Light and maker of the thinking peoples. He founded Heraklion, and calls himself a window, not the flame.',
    content: [
      '**Ouro’ras** is the Dragon of Light, one of the Six Primal Dragons to whom [Kalistos](/pantheon/kalistos) gave Phanatos. With his light he made the sentient peoples of the world. Of the Six he is the one who most insists that creation was *entrusted* to them, and must be tended.',
      '## Creations\n\nHumans, Elves, Dwarves, Dwelves, Gnomes, Halflings and Satyrs.',
      '## Children\n\n' + childrenOf('light'),
      '## Heraklion\n\nOuro’ras laid the foundations of Heraklion himself, “a lamp upon a stand”: a city to show what mortals might accomplish when their lives were rightly ordered. In the musical *Heraklion*, High Priestess Rosio sings that he built its walls for his chosen people. Ismakale’s cannon brought them down in 33 AC.\n\nWhen the city began to pray to him rather than through him, he called himself a window mistaken for the light: “Why have you begun worshiping the glass?” Since then he has intervened less, so that his children might look past the ray to its source.',
      '## Among the Six\n\nHe steps in where the others will not, for their children as well as his own, and prays to Kalistos when a matter is beyond him. [Vlaurunga](/pantheon/vlaurunga) calls him unbearable; he calls her irresponsible. In the Erosian War it was Ouro’ras who told [Golestandt](/pantheon/golestandt) to choose.',
      '## In the calendar\n\n**Ouroday**, the first day of the six-day week, is named for him.',
    ].join('\n\n'),
  },
  {
    name: 'Golestandt',
    slug: 'golestandt',
    rank: 'primal',
    attributes: ['dark'],
    domain: 'Darkness',
    portrait: 'the-last-to-choose',
    summary: 'Dragon of Darkness and maker of the Twili. The last of the Six to choose a champion against Erosia, he has hidden beneath the world ever since.',
    content: [
      '**Golestandt** is the Dragon of Darkness, one of the Six Primal Dragons. To him darkness was never empty but quiet: “the silence between one heartbeat and the next”. From that quiet he made the creatures of the night.',
      '## Creations\n\nThe Twili, the first and foremost of his children, who rose from moonless pools and learned from him the language of silence. *Dragons and Their Creatures* also counts the Husks in his family, the Erosians, so named because they sided with Erosia.',
      '## Children\n\n' + childrenOf('dark'),
      '## The Erosian War\n\nGolestandt loved [Erosia](/pantheon/erosia), “our daughter of night”, and watched the world praise her brother and fear her. He said nothing, which he calls the first sin for which he has never forgiven himself.\n\nWhen the Twili followed her into rebellion and the first night refused to end, he refused, again and again, to arm a champion against his own children. He was the last of the Six to choose. His champion received not a blessing but an apology, and stood with [Quint](/pantheon/quint) and the other five to seal Erosia and the Twili in the Twilight Realm.\n\nAfterwards he went down beneath the deepest places of the world, and withdrew his voice from prophets and his face from temples.',
      '## Other tellings\n\nIn the Twili creation myth, *The Twilight Weave*, it is Golestandt who calls the Twins forth.',
      '## In the calendar\n\n**Golestday**, the sixth and last day of the week, is named for him.',
    ].join('\n\n'),
  },
  {
    name: 'Vlaurunga',
    slug: 'vlaurunga',
    rank: 'primal',
    attributes: ['fire'],
    domain: 'Fire',
    portrait: 'vlaurungas-kids',
    summary: 'Dragon of Fire, mother of fire spirits, Infernals and Tieflings. She leaves her children to grow strong, and wanders the world behind a mortal face.',
    content: [
      '**Vlaurunga** is the Dragon of Fire, one of the Six Primal Dragons. She made her children in the burning heart of the world, where “safe things do not grow strong”, and then left them to find out what they would become. Her name is also written Vlarunga.',
      '## Creations\n\nThe spirits of flame, the Infernals forged of iron, copper, sulfur and stone, the Fire Genasi and the Tieflings. Older tellings call her the mother of machines and metallic beings; by [Quintara Lotus](/pantheon/quintara-lotus)’s account, the automata were Lotus’s gift to Vlaurunga’s children.',
      '## Children\n\n' + childrenOf('fire'),
      '## Among mortals\n\nVlaurunga keeps “a dozen faces” and travels as a mortal: a Tiefling mercenary, a human adventurer, once a dwarven blacksmith for twelve years.\n\n- As **Vala** she travelled with Aderic Vale and, on the summit of Mount Cerath, gave him power over metal. He became the first Metal Adventurer.\n- As **Vara**, in the last days of Drynell, she loved the swordsman Verrik Dawn and raised a daughter, Lyla, in Dawncross. When an imperial magistrate had them killed, she burned her way up the chain of command to the throne of Ha-Des. Finding the emperor beyond her reach, she destroyed his name instead: history remembers only Ha-Des, the Dark Ruler.',
      '## Among the Six\n\nShe holds that she cares for her children enough not to live their lives for them. [Ouro’ras](/pantheon/ouroras) calls that irresponsible, and several of the Greater Dragons agree with him.',
      '## In the calendar\n\n**Vlaurday**, the fourth day of the week, is named for her.',
    ].join('\n\n'),
  },
  {
    name: 'Yvander',
    slug: 'yvander',
    rank: 'primal',
    attributes: ['ice'],
    domain: 'Ice',
    portrait: 'the-frozen-watcher',
    summary: 'Dragon of Ice and Mother of Waters. From a cavern beneath a glacier she watches every one of her children, and almost never answers.',
    content: [
      '**Yvander** is the Dragon of Ice, one of the Six Primal Dragons, called Mother of Waters by those who pray to her. She made the seas cold enough to stir, and filled them with life.',
      '## Creations\n\nThe creatures of the sea, and the water-born peoples who could look back at her. Her family is the Aquisi: the Lanyarui, the Water Genasi and the Zorat.',
      '## Children\n\n' + childrenOf('ice'),
      '## The Frozen Watcher\n\nRather than rule among her children, Yvander went farther north than any of them had travelled and carved a cavern beneath a glacier. Its walls of ice show every ocean, river and shore her waters touch, and every one of her children.\n\nShe hears every prayer and answers few, so that her children live their own lives: “A child who always knows her mother’s answer never discovers her own.” When she does act it passes for fortune: a current that shifts without reason, ice that breaks beneath an army but bears a fleeing child.\n\n> They have mistaken coldness for the absence of love.',
      '## In the calendar\n\n**Yvanday**, the third day of the week, is named for her.',
    ].join('\n\n'),
  },
  {
    name: 'Quintara Lotus',
    slug: 'quintara-lotus',
    rank: 'primal',
    attributes: ['arcane'],
    domain: 'Arcane',
    portrait: 'the-dragon-doctor',
    summary: 'Dragon of the Arcane. She poured mana into an empty world to see what would happen, and made the pierres d’amour for love of Rokesh.',
    content: [
      '**Quintara Lotus**, often simply Lotus, is the Dragon of the Arcane, one of the Six Primal Dragons. Where the others planned, she poured mana into the empty world to see what would emerge.',
      '## Creations\n\nThe creatures born of magic. Her family is the Arcanites: Aarakocra, Aasimar, Air Genasi, Changelings, Fairies, Goblins, Goliaths, Hobgoblins and Orcs.',
      '## Children\n\n' + childrenOf('arcane'),
      '## Gifts\n\nLotus left a gift (“experiments, really”) for the children of each of the Six:\n\n- **For Golestandt’s children**, a gateway to a realm of perfect night. After they followed Erosia it became their prison: the Twilight Realm.\n- **For Ouro’ras’s children**, the Artifacts and the craft of making them, a knowledge lost after Ha-Des.\n- **For Vlaurunga’s children**, the automata: machines that labour without tiring, but need fire mana to move.\n- **For Yvander’s children**, a potion that reshapes the body for land or sea. Mortals turned it into a punishment.\n- **For her own children**, the focuses: the crystals, rods, staffs and rings now found in nearly every magical tradition.\n- **For Rokesh’s children**, the *pierres d’amour*: living stones of love.',
      '## Rokesh and Agape\n\nThe pierres were how she told [Rokesh](/pantheon/rokesh) that she loved him: “I love what you love because I love you.” They are the only two of the Six to have fallen in love, and their daughter [Agape](/pantheon/agape), the Greater Dragon of Love, was born rather than made.',
      '## In the calendar\n\n**Lotusday**, the fifth day of the week, is named for her.',
    ].join('\n\n'),
  },
  {
    name: 'Rokesh',
    slug: 'rokesh',
    rank: 'primal',
    attributes: ['earth'],
    domain: 'Earth',
    portrait: 'the-fixated-father',
    summary: 'Dragon of Earth, father of beasts, gems and Kobolds. He loves the Kobolds so well that he once forgot the rest of creation.',
    content: [
      '**Rokesh** is the Dragon of Earth, one of the Six Primal Dragons. He raised the mountains, hid gemstones beneath plain stone, and made the beasts and wild creatures of the land.',
      '## Creations\n\nThe beasts, and the Silicae: Centaurs, Earth Genasi, Gemoids, Kobolds, Lizardfolk, Minotaurs, Sciurians and Tabaxi.',
      '## Children\n\n' + childrenOf('earth'),
      '## The Kobolds\n\nRokesh shaped the Kobolds from the earth itself, stone for their flesh and crystal for their eyes, and by his own admission “forgot everything else”. They are still his favourites.\n\nAmong the Kobolds his worship shapes the state. The Kledgelony, their council of elders and religious leaders, declared Vercingetorix the Chosen Emperor of Rokesh in 72 BC, and the Children of Rokesh are a cult of the old religion who resent Chionite influence in the Empire.',
      '## Quintara Lotus and Agape\n\nIt was [Quintara Lotus](/pantheon/quintara-lotus) who drew his eyes back to the rest of creation, by making the *pierres d’amour* for the Kobolds he loved. They are the only two of the Six to have fallen in love, and their daughter is [Agape](/pantheon/agape), the Greater Dragon of Love.',
      '## In the calendar\n\n**Rokday**, the second day of the week, is named for him.',
    ].join('\n\n'),
  },
  {
    name: 'Quint',
    slug: 'quint',
    rank: 'twin',
    attributes: ['light'],
    domain: 'Day',
    summary: 'The Twin of the day, bright and laughing. With six champions he cast his sister into the Twilight and became ruler of both day and night.',
    content: [
      '**Quint**, also written Quinn, is the Twin of the day. When the Six Primal Dragons had finished their creations they made two final beings, the culmination of all their powers: Quint to rule the day and [Erosia](/pantheon/erosia) to rule the night.',
      'Bright and laughing (the Radiant Fool, in the Twili telling), he was praised by the people of the day while his sister went unthanked, and his jokes cut more deeply than he knew.',
      '## The Erosian War\n\nWhen Erosia held the night in place and the Twili overran the people of the day, Quint was beaten and fled to the dragons. They promised him champions, one for each of the Six. With them he defeated Erosia and banished her and the Twili to the Twilight Realm, and became the one ruler of both day and night.',
      '## Legacy\n\n- Hyperion, the Eternal City, is widely held to have been built by Quint and Erosia together in the Era of the Children.\n- The prophecy spoken at Erosia’s defeat promised that champions would be born anew when she returned.\n- The **Day of the First Light**, one of the four holy days that belong to no month, celebrates him with a festival of sunrise, laughter and hope.',
    ].join('\n\n'),
  },
  {
    name: 'Erosia',
    slug: 'erosia',
    rank: 'twin',
    attributes: ['dark'],
    domain: 'Night',
    summary: 'The Twin of the night. She rose with the Twili and was sealed in the Twilight Realm; ten thousand years later she returned, and now walks the world in penance.',
    content: [
      '**Erosia** is the Twin of the night, made by the Six Primal Dragons alongside her brother [Quint](/pantheon/quint) as the culmination of their powers. She guided dreams and guarded the dark, and the Twili loved her as a sister. Their telling names her the Hidden Mirror.',
      '## The Erosian War\n\nThe people of the day praised Quint and feared the night. Erosia’s sorrow turned to anger, and with the Twili she rose in the first rebellion: the night that did not end. Quint and the six Draconic Champions struck her down, c. 10000 BC, and sealed her and the Twili in the Twilight Realm. [Golestandt](/pantheon/golestandt), who loved her as a daughter, was the last of the dragons to arm a champion against her.\n\nA prophecy followed her defeat:\n\n> The one who was cast out from this world shall return when one of the light who follows the dark lights the bridge for darkness to return.',
      '## The return\n\n- Around 4000 BC the Dark Cult arose, believing that Erosia must be brought back from the Twilight.\n- In the three-hundredth year of the Age of Concord, Gillian Gearson broke an ancient seal in Hossari. Erosia rose with the Twili and the Husks, and the Hurlen War (the Tri-War) began.\n- Beneath the roots of Yggdrasil the champions confronted her, and “she remembered love”. Her armies dissolved like mist at dawn. In 304 AC Erosia was reformed: she now wanders the world in penance, her form mortal and her power sealed.',
      '## Remembrance\n\nThe **Day of the Deep Veil**, one of the four holy days that belong to no month, honours her with a solemn twilight vigil and dream rite. After the Tri-War, shrines to Rokesh, [Agape](/pantheon/agape) and Erosia rose across Ishmakale as symbols of memory, balance and reconciliation.',
    ].join('\n\n'),
  },
];

for (let i = 0; i < GREATER.length; i++) {
  const g = GREATER[i];
  MEMBERS.push({
    name: g.name,
    slug: g.name.toLowerCase(),
    rank: 'greater',
    attributes: g.of,
    domain: g.domain,
    summary: g.text,
    content: greaterContent(g, i),
  });
}

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pantheon');
    // Kept open until the end: a copied file is only read when its record is saved.
    const files = app.newFilesystem();

    try {
      for (let i = 0; i < MEMBERS.length; i++) {
        const member = MEMBERS[i];
        try {
          app.findFirstRecordByData('pantheon', 'slug', member.slug);
          continue;
        } catch (err) {
          // not there yet
        }

        const record = new Record(collection);
        record.set('name', member.name);
        record.set('slug', member.slug);
        record.set('rank', member.rank);
        record.set('attributes', member.attributes);
        record.set('domain', member.domain);
        record.set('summary', member.summary);
        record.set('content', member.content);
        record.set('published', true);

        if (member.portrait) {
          try {
            const lore = app.findFirstRecordByData('lore', 'slug', member.portrait);
            const cover = lore.getString('cover');
            if (cover) record.set('image', files.getReuploadableFile(lore.baseFilesPath() + '/' + cover, true));
          } catch (err) {
            // No such entry, or its image is gone: the card shows its element instead.
          }
        }

        app.save(record);
      }
    } finally {
      files.close();
    }
  },
  (app) => {
    for (let i = 0; i < MEMBERS.length; i++) {
      try {
        app.delete(app.findFirstRecordByData('pantheon', 'slug', MEMBERS[i].slug));
      } catch (err) {
        // already gone
      }
    }
  }
);
