/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds the Atlas with the chart of Hurly: its coast, the 24 realms of the
 * survey of c. 307 AC, nine pieces of terrain and eight places.
 *
 * What the Dungeon Master should know about it:
 *
 * - The realm borders are Voronoi cells fitted to a traced coastline, not the
 *   lines of the hand-drawn map. Drag the corners to where they belong.
 * - The places stand where the lore says they do, no more exactly than that:
 *   Nova Roma on the River of Fate in the Papal State, Keralu as Lakose's
 *   capital, Marshentide in Alachua, Vael-Thamor beneath Hossari, Outpost
 *   Z-73 in Monteforte's highlands, Iverness a day from the River of Fate's
 *   coast. They are meant to be dragged into place. Each names the realm the
 *   lore puts it in, which the fitted borders don't always agree with: Nova
 *   Roma and Iverness sit just over a border until one or the other is moved.
 * - Port Yvander's Embrace is seeded unpublished, as the example draft.
 * - "Utrecht" follows the lore document, not the map's "Uterect".
 *
 * Each place draws the card of the lore entry whose slug it names. A slug
 * that no longer exists leaves the place without a card.
 *
 * Runs once, and not at all if a chart called "hurly" already exists; the
 * Dungeon Master can edit or delete anything it adds.
 */

const CHART = {
  name: 'Hurly',
  slug: 'hurly',
  dateline: 'A political chart · c. 307 AC',
  description: 'As the Kobold Empire keeps it, three years after the Tri-War.',
  width: 1400,
  height: 700,
  land: [
    [[440, 153], [432, 225], [436, 259], [432, 284], [440, 310], [453, 327], [440, 348], [419, 370], [402, 395], [385, 429], [372, 463], [376, 497], [410, 527], [470, 540], [580, 506], [631, 484], [682, 480], [716, 488], [738, 514], [738, 548], [767, 616], [810, 620], [852, 612], [890, 599], [920, 574], [942, 540], [950, 506], [976, 438], [980, 395], [967, 361], [976, 318], [963, 276], [954, 234], [942, 200], [950, 174], [967, 148], [997, 136], [1022, 114], [1018, 89], [988, 72], [954, 72], [920, 89], [886, 110], [844, 148], [801, 136], [750, 127], [691, 127], [631, 132], [580, 119], [529, 123], [478, 136]],
    [[639, 578], [634, 566], [623, 562], [611, 566], [607, 578], [611, 589], [623, 594], [634, 589]],
  ],
  compass: [1120, 546],
  seas: [
    { name: 'Silver Sea', x: 700, y: 70, size: 'large' },
    { name: 'Slaver’s Sea', x: 280, y: 364, size: 'large' },
    { name: 'Coastal Sea', x: 1078, y: 308, size: 'large' },
    { name: 'Blood Sea', x: 700, y: 602, size: 'large' },
    { name: 'Bay of Bliss', x: 651, y: 528, size: 'small' },
  ],
};

const REALMS = [
  { name: 'Hossari', standing: 'Queendom of Hossari, Twilight Stewardship Zone', tone: 0, label: [714, 168], points: [[656, 228], [765, 267], [780, 257], [789, 242], [796, 203], [788, 134], [750, 127], [691, 127], [631, 132], [622, 129]] },
  { name: 'Swedanetil', standing: 'Kingdom of Swedanetil, Twilight Sanctuary-Protectorate', tone: 1, label: [506, 175], points: [[531, 235], [609, 126], [580, 119], [529, 123], [478, 136], [440, 153], [435, 197]] },
  { name: 'Celeste', standing: 'Grand Celestial Magocracy, Imperial Protectorate', tone: 2, label: [605, 179], points: [[543, 267], [609, 288], [656, 228], [622, 129], [609, 126], [531, 235]] },
  { name: 'Fuchs', standing: 'The Order of Fuchs, Imperial Shield-Province', tone: 1, label: [858, 163], points: [[796, 203], [932, 178], [892, 107], [844, 148], [788, 134]] },
  { name: 'Rus', standing: 'Kingdom of Rus, Imperial Protectorate of the North', tone: 0, label: [956, 125], points: [[932, 178], [945, 189], [950, 174], [967, 148], [997, 136], [1022, 114], [1018, 89], [988, 72], [954, 72], [892, 107]] },
  { name: 'Utrecht', standing: 'Province of Utrecht, Imperial Frontier Protectorate', tone: 2, label: [871, 222], points: [[789, 242], [956, 242], [942, 200], [945, 189], [932, 178], [796, 203]] },
  { name: 'Monteforte', standing: 'Fortress-Realm of Monteforte, Subterranean Imperial March', tone: 0, label: [485, 247], points: [[527, 284], [543, 267], [531, 235], [435, 197], [432, 225], [436, 259], [432, 284]] },
  { name: 'Nabatea', standing: 'Grand Republic of Nabatea, Imperial Trade Dominion', tone: 1, label: [480, 297], points: [[517, 328], [527, 284], [432, 284], [440, 310], [448, 320]] },
  { name: 'Napolei', standing: 'Kingdom of Napolei, Imperial Model Protectorate', tone: 3, label: [571, 346], points: [[527, 284], [517, 328], [533, 367], [572, 402], [619, 363], [609, 288], [543, 267]] },
  { name: 'Ishmakale', standing: 'Free State of Ishmakale, Reunified Imperial Protectorate', tone: 1, label: [681, 317], points: [[619, 363], [728, 355], [739, 346], [765, 267], [656, 228], [609, 288]] },
  { name: 'Corsica', standing: 'Province of Corsica, Imperial Reclamation Zone', tone: 1, label: [862, 287], points: [[780, 257], [858, 317], [958, 253], [956, 242], [789, 242]] },
  { name: 'Zorat', standing: 'Territory of Zorat, Imperial Pacification Zone', tone: 2, label: [937, 285], points: [[858, 317], [870, 354], [879, 362], [971, 339], [976, 318], [958, 253]] },
  { name: 'Plana', standing: 'The Planan Nomadlands, Semi-Autonomous March', tone: 3, label: [803, 332], points: [[739, 346], [800, 389], [870, 354], [858, 317], [780, 257], [765, 267]] },
  { name: 'Claire Fontaine', standing: 'Grand Duchy, Imperial Partner-State', tone: 0, label: [484, 338], points: [[448, 320], [453, 327], [440, 348], [421, 367], [533, 367], [517, 328]] },
  { name: 'Mongues', standing: 'The Mongian State, Imperial Industrial Protectorate', tone: 1, label: [519, 434], points: [[572, 402], [533, 367], [421, 367], [399, 401], [552, 466]] },
  { name: 'Heraklion', standing: 'The Imperial City, Heart of the Empire on Hurly', tone: 4, label: [693, 404], points: [[619, 363], [618, 366], [708, 487], [716, 488], [720, 493], [728, 355]] },
  { name: 'Ete', standing: 'Grand Etian Technocracy, Imperial Partner-State', tone: 2, label: [766, 415], points: [[728, 355], [721, 492], [742, 488], [814, 441], [800, 389], [739, 346]] },
  { name: 'Papal State', standing: 'The Holy See of Phantos, Ecclesiastical Protectorate', tone: 4, label: [847, 415], points: [[814, 441], [896, 467], [879, 362], [870, 354], [800, 389]] },
  { name: 'Kambot', standing: 'County of Kambot, Alchemical Protectorate', tone: 0, label: [933, 416], points: [[879, 362], [896, 467], [946, 520], [976, 438], [980, 395], [967, 361], [971, 339]] },
  { name: 'Alachua', standing: 'Protectorate of the Kobold Empire', tone: 0, label: [470, 468], points: [[552, 466], [399, 401], [372, 463], [376, 497], [410, 527], [470, 540], [559, 513]] },
  { name: 'Pomera', standing: 'People’s Republic of Pomera, Protectorate in Rebellion', tone: 2, label: [615, 434], points: [[552, 466], [559, 513], [631, 484], [682, 480], [708, 487], [618, 366], [572, 402]] },
  { name: 'Lakose', standing: 'Kingdom of Lakose, Imperial Sanctuary-Protectorate', tone: 1, label: [862, 514], points: [[896, 467], [814, 441], [742, 488], [917, 576], [942, 540], [946, 520]] },
  { name: 'Xeries', standing: 'Principality of Xeries, Imperial Resource Protectorate', tone: 0, label: [816, 575], points: [[742, 488], [720, 493], [738, 514], [738, 548], [767, 616], [810, 620], [852, 612], [890, 599], [917, 576]] },
  { name: 'Bliss', standing: 'The Isle of Bliss, Imperial Leisure Colony', tone: 0, label: [623, 578], points: [[639, 578], [634, 566], [623, 562], [611, 566], [607, 578], [611, 589], [623, 594], [634, 589]] },
];

const FEATURES = [
  { name: 'Northern Mountain Range', kind: 'mountains', points: [[630, 268], [665, 258], [700, 252], [735, 258], [770, 268]] },
  { name: 'Swedcele Mountains', kind: 'mountains', points: [[440, 222], [468, 214], [498, 222], [528, 232]] },
  { name: 'Monguian Mountains', kind: 'mountains', points: [[432, 392], [465, 380], [500, 384], [535, 392], [562, 402]] },
  { name: 'Rusan Mountains', kind: 'mountains', points: [[915, 100], [945, 90], [975, 98], [1000, 112]] },
  { name: 'Ashmire Forest', kind: 'forest', points: [[700, 322]], spread: 26 },
  { name: 'Great Southern Forest', kind: 'forest', points: [[902, 532]], spread: 30 },
  { name: 'Southern Green', kind: 'forest', points: [[846, 442]], spread: 17 },
  { name: 'Lake of Mystery', kind: 'lake', points: [[830, 480]], spread: 20 },
  { name: 'River of Fate', kind: 'river', points: [[849, 482], [878, 477], [908, 485], [938, 479], [962, 472]] },
];

const PLACES = [
  { name: 'Heraklion', kind: 'capital', x: 693, y: 440, realm: 'Heraklion', lore: 'heraklion-a-musical', published: true },
  { name: 'Nova Roma', kind: 'city', x: 880, y: 466, realm: 'Papal State', lore: 'map-of-nova-roma', published: true },
  { name: 'Iverness', kind: 'city', x: 935, y: 492, realm: 'Lakose', lore: 'the-apostle-to-phanatos', published: true },
  { name: 'Keralu', kind: 'capital', x: 846, y: 528, realm: 'Lakose', lore: 'countries-of-hurly-after-the-tri-war-c-307-ac', published: true },
  { name: 'Marshentide', kind: 'capital', x: 424, y: 500, realm: 'Alachua', lore: 'countries-of-hurly-after-the-tri-war-c-307-ac', published: true },
  { name: 'Vael-Thamor', kind: 'ruin', x: 742, y: 150, realm: 'Hossari', lore: 'history-of-hurley-catholic-lore', published: true },
  { name: 'Outpost Z-73', kind: 'fortress', x: 505, y: 262, realm: 'Monteforte', lore: 'stone-and-shadow', published: true },
  { name: 'Port Yvander’s Embrace', kind: 'port', x: 402, y: 470, realm: 'Alachua', lore: 'countries-of-hurly-c-300-ac', published: false },
];

migrate(
  (app) => {
    try {
      app.findFirstRecordByData('charts', 'slug', CHART.slug);
      return;
    } catch (err) {
      // not there yet
    }

    const chart = new Record(app.findCollectionByNameOrId('charts'));
    for (const field in CHART) chart.set(field, CHART[field]);
    chart.set('published', true);
    app.save(chart);

    const realms = app.findCollectionByNameOrId('realms');
    for (let i = 0; i < REALMS.length; i++) {
      const record = new Record(realms);
      for (const field in REALMS[i]) record.set(field, REALMS[i][field]);
      record.set('chart', chart.id);
      record.set('published', true);
      app.save(record);
    }

    const features = app.findCollectionByNameOrId('features');
    for (let i = 0; i < FEATURES.length; i++) {
      const record = new Record(features);
      for (const field in FEATURES[i]) record.set(field, FEATURES[i][field]);
      record.set('chart', chart.id);
      record.set('published', true);
      app.save(record);
    }

    const places = app.findCollectionByNameOrId('places');
    for (let i = 0; i < PLACES.length; i++) {
      const record = new Record(places);
      for (const field in PLACES[i]) record.set(field, PLACES[i][field]);
      record.set('chart', chart.id);

      // The seed names the entry by slug; the record wants its id.
      let lore = '';
      try {
        lore = app.findFirstRecordByData('lore', 'slug', PLACES[i].lore).id;
      } catch (err) {
        // no such entry: the place stays cardless
      }
      record.set('lore', lore);
      app.save(record);
    }
  },
  (app) => {
    try {
      // Its realms, terrain and places go with it.
      app.delete(app.findFirstRecordByData('charts', 'slug', CHART.slug));
    } catch (err) {
      // already gone
    }
  }
);
