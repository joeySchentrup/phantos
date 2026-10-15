/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds Daymond Greystone's character sheet from his D&D Beyond sheet: a
 * 3rd-level Bard, called to 6th. His college, his expertise and his spells
 * were never chosen there, so the level-up wizard asks for them first.
 *
 * Runs once; does nothing without Daymond, or when he already has a sheet.
 * Calling him to level 6 here costs no electrum.
 */

const SLUG = 'daymond-greystone';
const AASIMAR = 'https://dnd5e.wikidot.com/lineage:aasimar';
const BARD = 'https://dnd5e.wikidot.com/bard';

const SHEET = {
  level: 3,
  target_level: 6,
  class: 'bard',
  subclass: '',
  species: 'variant-aasimar',
  max_hp: 18,
  abilities: { str: 11, dex: 12, con: 10, int: 14, wis: 13, cha: 15 },
  saves: ['dex', 'cha'],
  skills: { history: 'proficient', insight: 'proficient', perception: 'proficient', persuasion: 'proficient', religion: 'proficient' },
  proficiencies: {
    armor: ['Light armor'],
    weapons: ['Simple weapons'],
    tools: ['Bagpipes', "Calligrapher's Supplies", 'Fiddle', 'Zulkoon'],
    languages: ['Celestial', 'Common'],
  },
  defenses: { speed: 30, senses: ['Darkvision 60 ft.'], resistances: ['Necrotic', 'Radiant'], immunities: [] },
  features: [
    {
      key: 'darkvision',
      name: 'Darkvision',
      source: 'Variant Aasimar',
      level: 1,
      text: 'You see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light, in shades of grey.',
      link: AASIMAR,
    },
    {
      key: 'celestial-resistance',
      name: 'Celestial Resistance',
      source: 'Variant Aasimar',
      level: 1,
      text: 'You have resistance to necrotic and radiant damage.',
      link: AASIMAR,
    },
    {
      key: 'healing-hands',
      name: 'Healing Hands',
      source: 'Variant Aasimar',
      level: 1,
      text: 'As an action, touch a creature to restore a number of hit points equal to your level.',
      link: AASIMAR,
      uses: { max: 1, per: 'long' },
    },
    {
      key: 'light-bearer',
      name: 'Light Bearer',
      source: 'Variant Aasimar',
      level: 1,
      text: 'You know the light cantrip. Charisma is your spellcasting ability for it.',
      link: AASIMAR,
    },
    {
      key: 'spellcasting',
      name: 'Spellcasting',
      source: 'Bard 1',
      level: 1,
      text: 'You cast the bard spells you know with Charisma, using a musical instrument as your focus, and can cast any you know that have the ritual tag as rituals.',
      link: BARD,
    },
    {
      key: 'bardic-inspiration',
      name: 'Bardic Inspiration (d6)',
      source: 'Bard 1',
      level: 1,
      text: 'As a bonus action, give one creature within 60 feet that can hear you an Inspiration die. Once in the next 10 minutes, it can add the die to an ability check, attack roll or saving throw.',
      link: BARD,
      uses: { max: 'cha', per: 'long' },
    },
    {
      key: 'jack-of-all-trades',
      name: 'Jack of All Trades',
      source: 'Bard 2',
      level: 2,
      text: "Add half your proficiency bonus, rounded down, to any ability check that doesn't already include your proficiency bonus.",
      link: BARD,
    },
    {
      key: 'song-of-rest',
      name: 'Song of Rest (d6)',
      source: 'Bard 2',
      level: 2,
      text: 'If you perform during a short rest, friendly creatures who spend Hit Dice to regain hit points regain an extra die’s worth.',
      link: BARD,
    },
  ],
  feats: [],
  spellcasting: { ability: 'cha', cantrips: [], known: [], racial: ['light'], bonus: [] },
  level_log: [
    { level: 1, date: '', hp_gained: 8, hp_mode: 'first', choices: [] },
    { level: 2, date: '', hp_gained: 5, hp_mode: 'average', choices: [] },
    { level: 3, date: '', hp_gained: 5, hp_mode: 'average', choices: [] },
  ],

  current_hp: 18,
  temp_hp: 0,
  hit_dice_used: 0,
  ac: 11,
  inspiration: false,
  uses_spent: {},
  slots_used: {},
  spells_prepared: [],
  attacks: [{ name: 'Unarmed Strike', bonus: '+2', damage: '1 bludgeoning', note: '' }],
  money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  death_saves: { successes: 0, failures: 0 },
  equipment: '',
  conditions: '',
  notes: 'Milestone advancement.',
};

migrate(
  (app) => {
    let hero;
    try {
      hero = app.findFirstRecordByData('heroes', 'slug', SLUG);
    } catch (err) {
      return; // no Daymond, no sheet
    }
    try {
      app.findFirstRecordByData('character_sheets', 'hero', hero.id);
      return; // he has one already
    } catch (err) {
      // not there yet
    }

    const record = new Record(app.findCollectionByNameOrId('character_sheets'));
    record.set('hero', hero.id);
    for (const field in SHEET) record.set(field, SHEET[field]);
    app.save(record);
  },
  (app) => {
    try {
      const hero = app.findFirstRecordByData('heroes', 'slug', SLUG);
      app.delete(app.findFirstRecordByData('character_sheets', 'hero', hero.id));
    } catch (err) {
      // already gone
    }
  }
);
