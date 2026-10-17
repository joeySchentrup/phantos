/**
 * The paladin spell list, from https://dnd5e.wikidot.com/spells:paladin,
 * without the Unearthed Arcana playtest spells. Written as one list of names a
 * level; keys and wikidot pages are made from the names (see ./index.ts).
 * The paladin has no cantrips, so the first list is empty.
 */
export const PALADIN_SPELL_NAMES: string[][] = [
  // Cantrips
  [],
  // 1st level
  [
    "Bless",
    "Ceremony",
    "Command",
    "Compelled Duel",
    "Cure Wounds",
    "Detect Evil and Good",
    "Detect Magic",
    "Detect Poison and Disease",
    "Divine Favor",
    "Heroism",
    "Protection from Evil and Good",
    "Purify Food and Drink",
    "Searing Smite",
    "Shield of Faith",
    "Thunderous Smite",
    "Wrathful Smite",
  ],
  // 2nd level
  [
    "Aid",
    "Branding Smite",
    "Find Steed",
    "Gentle Repose",
    "Lesser Restoration",
    "Locate Object",
    "Magic Weapon",
    "Prayer of Healing",
    "Protection from Poison",
    "Warding Bond",
    "Zone of Truth",
  ],
  // 3rd level
  [
    "Aura of Vitality",
    "Blinding Smite",
    "Create Food and Water",
    "Crusader's Mantle",
    "Daylight",
    "Dispel Magic",
    "Elemental Weapon",
    "Magic Circle",
    "Remove Curse",
    "Revivify",
    "Spirit Shroud",
  ],
  // 4th level
  [
    "Aura of Life",
    "Aura of Purity",
    "Banishment",
    "Death Ward",
    "Find Greater Steed",
    "Locate Creature",
    "Staggering Smite",
  ],
  // 5th level
  [
    "Banishing Smite",
    "Circle of Power",
    "Destructive Wave",
    "Dispel Evil and Good",
    "Geas",
    "Holy Weapon",
    "Raise Dead",
    "Summon Celestial",
  ],
];
