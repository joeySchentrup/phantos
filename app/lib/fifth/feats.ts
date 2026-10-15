/**
 * The Player's Handbook feats, offered in place of an Ability Score
 * Improvement. Each has its wikidot page written out, since a page's name is
 * not always the feat's in kebab case.
 */
import type { FeatRef } from "~/types/fifth";

const ANY = ["str", "dex", "con", "int", "wis", "cha"] as const;

export const FEATS: FeatRef[] = [
  { key: "actor", name: "Actor", slug: "actor", abilityIncrease: ["cha"], summary: "+1 Charisma; deceive as someone else, and mimic voices." },
  { key: "alert", name: "Alert", slug: "alert", summary: "+5 to initiative; you can't be surprised while conscious." },
  { key: "athlete", name: "Athlete", slug: "athlete", abilityIncrease: ["str", "dex"], summary: "+1 Strength or Dexterity; climb and stand with ease." },
  { key: "charger", name: "Charger", slug: "charger", summary: "Dash, then attack or shove as a bonus action, with a bonus." },
  { key: "crossbow-expert", name: "Crossbow Expert", slug: "crossbow-expert", summary: "Ignore loading; shoot in melee; a bonus hand crossbow attack." },
  { key: "defensive-duelist", name: "Defensive Duelist", slug: "defensive-duelist", summary: "Your reaction adds your proficiency bonus to AC against a melee hit." },
  { key: "dual-wielder", name: "Dual Wielder", slug: "dual-wielder", summary: "+1 AC while wielding two weapons; any one-handed weapons will do." },
  { key: "dungeon-delver", name: "Dungeon Delver", slug: "dungeon-delver", summary: "Find secret doors and avoid traps." },
  { key: "durable", name: "Durable", slug: "durable", abilityIncrease: ["con"], summary: "+1 Constitution; Hit Dice heal at least twice your CON modifier." },
  { key: "elemental-adept", name: "Elemental Adept", slug: "elemental-adept", summary: "Your spells of one damage type ignore resistance to it." },
  { key: "grappler", name: "Grappler", slug: "grappler", summary: "Advantage on attacks against creatures you grapple; pin them." },
  { key: "great-weapon-master", name: "Great Weapon Master", slug: "great-weapon-master", summary: "−5 to hit for +10 damage with heavy weapons; a bonus attack on a crit or kill." },
  { key: "healer", name: "Healer", slug: "healer", summary: "A healer's kit stabilises and restores hit points." },
  { key: "heavily-armored", name: "Heavily Armored", slug: "heavily-armored", abilityIncrease: ["str"], summary: "+1 Strength; proficiency with heavy armor." },
  { key: "heavy-armor-master", name: "Heavy Armor Master", slug: "heavy-armor-master", abilityIncrease: ["str"], summary: "+1 Strength; nonmagical weapon damage to you drops by 3 in heavy armor." },
  { key: "inspiring-leader", name: "Inspiring Leader", slug: "inspiring-leader", summary: "A ten-minute speech gives up to six allies temporary hit points." },
  { key: "keen-mind", name: "Keen Mind", slug: "keen-mind", abilityIncrease: ["int"], summary: "+1 Intelligence; you always know north, the hour, and what you saw." },
  { key: "lightly-armored", name: "Lightly Armored", slug: "lightly-armored", abilityIncrease: ["str", "dex"], summary: "+1 Strength or Dexterity; proficiency with light armor." },
  { key: "linguist", name: "Linguist", slug: "linguist", abilityIncrease: ["int"], summary: "+1 Intelligence; three languages; write ciphers." },
  { key: "lucky", name: "Lucky", slug: "lucky", summary: "Three luck points a long rest, to roll another d20." },
  { key: "mage-slayer", name: "Mage Slayer", slug: "mage-slayer", summary: "Punish nearby casters; advantage on saves against their spells." },
  { key: "magic-initiate", name: "Magic Initiate", slug: "magic-initiate", summary: "Two cantrips and a 1st-level spell from another class's list." },
  { key: "martial-adept", name: "Martial Adept", slug: "martial-adept", summary: "Two Battle Master manoeuvres and a superiority die." },
  { key: "medium-armor-master", name: "Medium Armor Master", slug: "medium-armor-master", summary: "No stealth penalty, and +3 DEX to AC, in medium armor." },
  { key: "mobile", name: "Mobile", slug: "mobile", summary: "+10 feet of speed; slip away from creatures you attack." },
  { key: "moderately-armored", name: "Moderately Armored", slug: "moderately-armored", abilityIncrease: ["str", "dex"], summary: "+1 Strength or Dexterity; proficiency with medium armor and shields." },
  { key: "mounted-combatant", name: "Mounted Combatant", slug: "mounted-combatant", summary: "Advantage against smaller unmounted foes; protect your mount." },
  { key: "observant", name: "Observant", slug: "observant", abilityIncrease: ["int", "wis"], summary: "+1 Intelligence or Wisdom; +5 to passive Perception and Investigation; read lips." },
  { key: "polearm-master", name: "Polearm Master", slug: "polearm-master", summary: "A bonus butt-end attack; opportunity attacks as foes approach." },
  { key: "resilient", name: "Resilient", slug: "resilient", abilityIncrease: [...ANY], grantsSave: true, summary: "+1 to an ability, and proficiency in its saving throws." },
  { key: "ritual-caster", name: "Ritual Caster", slug: "ritual-caster", summary: "A ritual book of a class's ritual spells." },
  { key: "savage-attacker", name: "Savage Attacker", slug: "savage-attacker", summary: "Once a turn, reroll a melee weapon's damage and take either." },
  { key: "sentinel", name: "Sentinel", slug: "sentinel", summary: "Opportunity attacks stop a creature in its tracks." },
  { key: "sharpshooter", name: "Sharpshooter", slug: "sharpshooter", summary: "−5 to hit for +10 damage at range; ignore cover and long-range disadvantage." },
  { key: "shield-master", name: "Shield Master", slug: "shield-master", summary: "Shove with your shield as a bonus action; shield DEX saves." },
  { key: "skilled", name: "Skilled", slug: "skilled", summary: "Proficiency in any three skills or tools (ask the DM to add them)." },
  { key: "skulker", name: "Skulker", slug: "skulker", summary: "Hide when lightly obscured; a missed shot doesn't give you away." },
  { key: "spell-sniper", name: "Spell Sniper", slug: "spell-sniper", summary: "Double the range of attack spells; learn an attack cantrip." },
  { key: "tavern-brawler", name: "Tavern Brawler", slug: "tavern-brawler", abilityIncrease: ["str", "con"], summary: "+1 Strength or Constitution; a d4 unarmed strike; grapple as a bonus action." },
  { key: "tough", name: "Tough", slug: "tough", summary: "+2 hit points for every level." },
  { key: "war-caster", name: "War Caster", slug: "war-caster", summary: "Advantage on concentration saves; cast a spell as an opportunity attack." },
  { key: "weapon-master", name: "Weapon Master", slug: "weapon-master", abilityIncrease: ["str", "dex"], summary: "+1 Strength or Dexterity; proficiency with four weapons." },
];

export function featByKey(key: string): FeatRef | undefined {
  return FEATS.find((feat) => feat.key === key);
}
