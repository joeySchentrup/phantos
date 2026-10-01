/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds the first hero: Daymond Greystone, with the backstory his player wrote
 * and the identity from his character sheet (stats and gear stay on the
 * sheet). He starts with no updates; the DM adds those as the campaign goes.
 *
 * Runs once; a hero whose URL name is already taken is left alone.
 */

const HEROES = [
  {
    name: 'Daymond Greystone',
    slug: 'daymond-greystone',
    player: 'Joey',
    species: 'Variant Aasimar',
    class: 'Bard',
    subclass: '',
    background: 'Acolyte',
    alignment: 'Neutral Good',
    faith: 'To the Gods',
    attribute: 'light',
    summary:
      'A celestial-born bard of the Sanctuary of Luthiel, whose bagpipes carry its prayers to the heavens. Content in his faith, he has not yet heard the ill omens calling him beyond the walls.',
    backstory: [
      'Daymond Greystone had never known a life beyond the walls of the Sanctuary of Luthiel, nor had he ever desired one. From the moment he was old enough to understand his celestial heritage, he devoted himself fully to the service of the divine. The sanctuary was his home, his sacred duty, and his purpose. There, he studied the holy texts, tended to the sick, and played the bagpipes as part of the sacred rites, his melodies carrying prayers to the heavens. The elders often spoke of the outside world with wary reverence—filled with both wonder and temptation, beauty and corruption. But Daymond felt no pull toward it. His faith was strong, and his heart was content.',
      'Yet, in the stillness of the sanctuary’s grand halls, whispers of uncertainty had begun to stir. The high priests spoke in hushed tones of ill omens—of dark forces growing in the lands beyond, of divine visions warning of an approaching storm. Daymond listened, but only as an observer; surely, this was a trial meant for great warriors and champions, not a humble bard devoted to his faith. Even when he played his bagpipes beneath the moonlit sky, he felt nothing but the warmth of the sanctuary’s protection. He told himself that his place was here, where he could bring comfort to the faithful, not out in the unknown world where danger lurked.',
      'But the gods had a way of calling their chosen, even when they were not ready to listen. Unbeknownst to Daymond, forces were already moving beyond the sanctuary’s walls, threads of fate weaving toward him. Soon, a choice would come—one that would test his faith like never before. But for now, he remained blissfully unaware, playing his bagpipes in the great halls, believing his path had already been set.',
    ].join('\n\n'),
  },
];

const FIELDS = ['name', 'slug', 'player', 'species', 'class', 'subclass', 'background', 'alignment', 'faith', 'attribute', 'summary', 'backstory'];

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('heroes');

    for (let i = 0; i < HEROES.length; i++) {
      const hero = HEROES[i];
      try {
        app.findFirstRecordByData('heroes', 'slug', hero.slug);
        continue;
      } catch (err) {
        // not there yet
      }

      const record = new Record(collection);
      for (let j = 0; j < FIELDS.length; j++) record.set(FIELDS[j], hero[FIELDS[j]]);
      record.set('published', true);
      app.save(record);
    }
  },
  (app) => {
    for (let i = 0; i < HEROES.length; i++) {
      try {
        app.delete(app.findFirstRecordByData('heroes', 'slug', HEROES[i].slug));
      } catch (err) {
        // already gone
      }
    }
  }
);
