/**
 * The Barbarian, in full: the level table, its features and all nine paths,
 * from https://dnd5e.wikidot.com/barbarian. Feature text is a short paraphrase;
 * the link has the rules as written.
 */
import type { ClassLevelRow, ClassRules, SubclassRules } from "~/types/fifth";

const TABLE: ClassLevelRow[] = [
  { level: 1, proficiency: 2, features: ["rage", "unarmored-defense"] },
  { level: 2, proficiency: 2, features: ["reckless-attack", "danger-sense"] },
  { level: 3, proficiency: 2, features: ["rage"] },
  { level: 4, proficiency: 2, features: [] },
  { level: 5, proficiency: 3, features: ["extra-attack", "fast-movement"] },
  { level: 6, proficiency: 3, features: ["rage"] },
  { level: 7, proficiency: 3, features: ["feral-instinct"] },
  { level: 8, proficiency: 3, features: [] },
  { level: 9, proficiency: 4, features: ["rage", "brutal-critical"] },
  { level: 10, proficiency: 4, features: [] },
  { level: 11, proficiency: 4, features: ["relentless-rage"] },
  { level: 12, proficiency: 4, features: ["rage"] },
  { level: 13, proficiency: 5, features: ["brutal-critical"] },
  { level: 14, proficiency: 5, features: [] },
  { level: 15, proficiency: 5, features: ["persistent-rage"] },
  { level: 16, proficiency: 5, features: ["rage"] },
  { level: 17, proficiency: 6, features: ["rage", "brutal-critical"] },
  { level: 18, proficiency: 6, features: ["indomitable-might"] },
  { level: 19, proficiency: 6, features: [] },
  { level: 20, proficiency: 6, features: ["rage", "primal-champion"] },
];

const PATHS: Record<string, SubclassRules> = {
  berserker: {
    key: "berserker",
    name: "Path of the Berserker",
    slug: "barbarian:berserker",
    source: "Player's Handbook",
    summary: "Fury unleashed: a frenzy of extra attacks, a mind no fear can touch, and blows returned in kind.",
    features: [
      {
        level: 3,
        key: "frenzy",
        name: "Frenzy",
        text: "When you rage, you can go into a frenzy: for the rest of the rage you can make one melee weapon attack as a bonus action each turn after the first. When the rage ends, you gain a level of exhaustion.",
      },
      {
        level: 6,
        key: "mindless-rage",
        name: "Mindless Rage",
        text: "You can't be charmed or frightened while raging; an effect already on you is suspended for the rage.",
      },
      {
        level: 10,
        key: "intimidating-presence",
        name: "Intimidating Presence",
        text: "As an action, a creature you can see within 30 feet must make a Wisdom save (DC 8 + your proficiency bonus + your Charisma modifier) or be frightened of you until the end of your next turn; you can keep it frightened with your action each turn. A creature that succeeds is immune for 24 hours.",
      },
      {
        level: 14,
        key: "retaliation",
        name: "Retaliation",
        text: "When a creature within 5 feet damages you, you can use your reaction to make a melee weapon attack against it.",
      },
    ],
  },
  "totem-warrior": {
    key: "totem-warrior",
    name: "Path of the Totem Warrior",
    slug: "barbarian:totem-warrior",
    source: "Player's Handbook",
    summary: "Guided by an animal spirit: a totem's gift in each rage, beast rituals, and the spirit's aspects as you grow.",
    features: [
      {
        level: 3,
        key: "spirit-seeker",
        name: "Spirit Seeker",
        text: "You can cast beast sense and speak with animals, but only as rituals.",
        grants: { spells: ["beast-sense", "speak-with-animals"] },
      },
      {
        level: 3,
        key: "totem-spirit",
        name: "Totem Spirit",
        text: "Choose a totem spirit and gain its feature while raging. You carry a totem object made from the animal, and may take on a touch of its look.",
        grants: {
          choose: {
            count: 1,
            options: [
              { key: "totem-bear", name: "Totem Spirit: Bear", text: "While raging, you have resistance to all damage but psychic." },
              { key: "totem-eagle", name: "Totem Spirit: Eagle", text: "While raging and not in heavy armor, opportunity attacks against you have disadvantage, and you can Dash as a bonus action." },
              { key: "totem-elk", name: "Totem Spirit: Elk", text: "While raging and not in heavy armor, your walking speed rises by 15 feet." },
              { key: "totem-tiger", name: "Totem Spirit: Tiger", text: "While raging, add 10 feet to your long jump and 3 feet to your high jump." },
              { key: "totem-wolf", name: "Totem Spirit: Wolf", text: "While raging, your friends have advantage on melee attack rolls against any hostile creature within 5 feet of you." },
            ],
          },
        },
      },
      {
        level: 6,
        key: "aspect-of-the-beast",
        name: "Aspect of the Beast",
        text: "Choose a totem animal, the same as before or another, and gain a magical benefit from it.",
        grants: {
          choose: {
            count: 1,
            options: [
              { key: "aspect-bear", name: "Aspect of the Beast: Bear", text: "Your carrying capacity is doubled, and you have advantage on Strength checks to push, pull, lift or break objects." },
              { key: "aspect-eagle", name: "Aspect of the Beast: Eagle", text: "You can see a mile away in fine detail, and dim light doesn't hinder your Wisdom (Perception) checks." },
              { key: "aspect-elk", name: "Aspect of the Beast: Elk", text: "Your travel pace is doubled, and so is that of up to ten companions within 60 feet of you." },
              { key: "aspect-tiger", name: "Aspect of the Beast: Tiger", text: "You gain proficiency in two of Athletics, Acrobatics, Stealth and Survival; the DM adds them to the sheet." },
              { key: "aspect-wolf", name: "Aspect of the Beast: Wolf", text: "You can track while travelling at a fast pace, and move stealthily at a normal pace." },
            ],
          },
        },
      },
      {
        level: 10,
        key: "spirit-walker",
        name: "Spirit Walker",
        text: "You can cast commune with nature, but only as a ritual: a spirit of one of your totem animals brings the answers.",
        grants: { spells: ["commune-with-nature"] },
      },
      {
        level: 14,
        key: "totemic-attunement",
        name: "Totemic Attunement",
        text: "Choose a totem animal, the same as before or another, and gain its benefit while raging.",
        grants: {
          choose: {
            count: 1,
            options: [
              { key: "attunement-bear", name: "Totemic Attunement: Bear", text: "While raging, hostile creatures within 5 feet have disadvantage on attacks against anyone but you or another with this feature, unless they can't see or hear you or can't be frightened." },
              { key: "attunement-eagle", name: "Totemic Attunement: Eagle", text: "While raging, you have a flying speed equal to your walking speed, in short bursts: you fall if you end your turn in the air." },
              { key: "attunement-elk", name: "Totemic Attunement: Elk", text: "While raging, as a bonus action during your move you can pass through a Large or smaller creature's space; it must make a Strength save (DC 8 + your Strength modifier + your proficiency bonus) or be knocked prone and take 1d12 + your Strength modifier bludgeoning damage." },
              { key: "attunement-tiger", name: "Totemic Attunement: Tiger", text: "While raging, if you move 20 feet in a straight line toward a Large or smaller target before a melee weapon attack on it, you can make another melee weapon attack against it as a bonus action." },
              { key: "attunement-wolf", name: "Totemic Attunement: Wolf", text: "While raging, when you hit a Large or smaller creature with a melee weapon attack you can use a bonus action to knock it prone." },
            ],
          },
        },
      },
    ],
  },
  "ancestral-guardian": {
    key: "ancestral-guardian",
    name: "Path of the Ancestral Guardian",
    slug: "barbarian:ancestral-guardian",
    source: "Xanathar's Guide to Everything",
    summary: "Warded by the warriors of the past: spirits that hinder your foe, shield your friends, and answer when consulted.",
    features: [
      {
        level: 3,
        key: "ancestral-protectors",
        name: "Ancestral Protectors",
        text: "While raging, the first creature you hit each turn has disadvantage on attacks against anyone but you until your next turn, and anyone else it hits has resistance to the damage.",
      },
      {
        level: 6,
        key: "spirit-shield",
        name: "Spirit Shield",
        text: "While raging, when another creature you can see within 30 feet takes damage, you can use your reaction to reduce it by 2d6 (3d6 at 10th level, 4d6 at 14th).",
      },
      {
        level: 10,
        key: "consult-the-spirits",
        name: "Consult the Spirits",
        text: "Cast augury or clairvoyance without a slot or material components, with Wisdom as your spellcasting ability; clairvoyance sends an ancestral spirit to the place instead of a sensor.",
        uses: { max: 1, per: "short" },
      },
      {
        level: 14,
        key: "vengeful-ancestors",
        name: "Vengeful Ancestors",
        text: "When Spirit Shield reduces an attack's damage, the attacker takes force damage equal to the amount prevented.",
      },
    ],
  },
  "storm-herald": {
    key: "storm-herald",
    name: "Path of the Storm Herald",
    slug: "barbarian:storm-herald",
    source: "Xanathar's Guide to Everything",
    summary: "Rage as a mantle of primal weather: an aura of desert heat, sea lightning or tundra frost that grows with you.",
    features: [
      {
        level: 3,
        key: "storm-aura",
        name: "Storm Aura",
        text: "While raging, a 10-foot aura surrounds you. Its effect fires when you enter the rage and again as a bonus action each turn; saves against it are DC 8 + your proficiency bonus + your Constitution modifier. Choose the aura's environment; you can change it whenever you gain a barbarian level.",
        grants: {
          choose: {
            count: 1,
            options: [
              { key: "storm-desert", name: "Storm Aura: Desert", text: "Every other creature in the aura takes 2 fire damage (3 at 5th level, 4 at 10th, 5 at 15th, 6 at 20th)." },
              { key: "storm-sea", name: "Storm Aura: Sea", text: "One creature you can see in the aura makes a Dexterity save or takes 1d6 lightning damage, half on a success (2d6 at 10th level, 3d6 at 15th, 4d6 at 20th)." },
              { key: "storm-tundra", name: "Storm Aura: Tundra", text: "Each creature of your choice in the aura gains 2 temporary hit points (3 at 5th level, 4 at 10th, 5 at 15th, 6 at 20th)." },
            ],
          },
        },
      },
      {
        level: 6,
        key: "storm-soul",
        name: "Storm Soul",
        text: "Your aura's environment shapes you even out of rage. Desert: resistance to fire, no harm from extreme heat, and a touch that lights a flammable object. Sea: resistance to lightning, water breathing and a 30-foot swimming speed. Tundra: resistance to cold, no harm from extreme cold, and a touch that freezes a 5-foot cube of water for a minute.",
      },
      {
        level: 10,
        key: "shielding-storm",
        name: "Shielding Storm",
        text: "Each creature of your choice in your Storm Aura shares the damage resistance Storm Soul gave you.",
      },
      {
        level: 14,
        key: "raging-storm",
        name: "Raging Storm",
        text: "Desert: when a creature in your aura hits you, your reaction makes it save on Dexterity or take fire damage equal to half your barbarian level. Sea: when you hit a creature in your aura, your reaction makes it save on Strength or fall prone. Tundra: when your aura fires, one creature in it must save on Strength or have its speed drop to 0 until your next turn.",
      },
    ],
  },
  zealot: {
    key: "zealot",
    name: "Path of the Zealot",
    slug: "barbarian:zealot",
    source: "Xanathar's Guide to Everything",
    summary: "A god's rage made flesh: divine damage on every turn, a rallying cry, and a fury that death itself must wait on.",
    features: [
      {
        level: 3,
        key: "divine-fury",
        name: "Divine Fury",
        text: "While raging, the first creature you hit each turn with a weapon attack takes an extra 1d6 + half your barbarian level in necrotic or radiant damage; choose the type when you gain this feature.",
      },
      {
        level: 3,
        key: "warrior-of-the-gods",
        name: "Warrior of the Gods",
        text: "A spell whose only effect is to bring you back to life needs no material components when cast on you.",
      },
      {
        level: 6,
        key: "fanatical-focus",
        name: "Fanatical Focus",
        text: "Once a rage, when you fail a saving throw while raging you can reroll it, and must use the new roll.",
      },
      {
        level: 10,
        key: "zealous-presence",
        name: "Zealous Presence",
        text: "As a bonus action, a battle cry gives up to ten other creatures within 60 feet that can hear you advantage on attack rolls and saving throws until the start of your next turn.",
        uses: { max: 1, per: "long" },
      },
      {
        level: 14,
        key: "rage-beyond-death",
        name: "Rage Beyond Death",
        text: "While raging, 0 hit points doesn't knock you unconscious. You still make death saves and take their consequences, but if they would kill you, you die only when the rage ends, and only if you are still at 0.",
      },
    ],
  },
  beast: {
    key: "beast",
    name: "Path of the Beast",
    slug: "barbarian:beast",
    source: "Tasha's Cauldron of Everything",
    summary: "A bestial spark that bursts out in rage: natural weapons, a shifting form, a rabid curse, and a hunt your friends can join.",
    features: [
      {
        level: 3,
        key: "form-of-the-beast",
        name: "Form of the Beast",
        text: "When you rage, you can grow a natural weapon that counts as a simple melee weapon and uses Strength; choose its form each rage. Bite: 1d8 piercing, and once a turn when it damages a creature you regain hit points equal to your proficiency bonus if below half. Claws: 1d6 slashing, and once a turn an Attack with a claw brings one more claw attack. Tail: 1d8 piercing with reach, and your reaction adds a d8 to your AC against an attack from within 10 feet.",
      },
      {
        level: 6,
        key: "bestial-soul",
        name: "Bestial Soul",
        text: "Your natural weapons count as magical. After each rest, choose until the next: a swimming speed and water breathing, a climbing speed that takes difficult surfaces and ceilings, or a jump lengthened by a Strength (Athletics) check once a turn.",
      },
      {
        level: 10,
        key: "infectious-fury",
        name: "Infectious Fury",
        text: "When you hit a creature with your natural weapons while raging, it must make a Wisdom save (DC 8 + your Constitution modifier + your proficiency bonus) or either use its reaction to make a melee attack against a creature you choose, or take 2d12 psychic damage. You can use this a number of times equal to your proficiency bonus, regained on a long rest.",
        uses: { max: "prof", per: "long" },
      },
      {
        level: 14,
        key: "call-the-hunt",
        name: "Call the Hunt",
        text: "When you rage, choose up to your Constitution modifier of willing creatures (one at least) within 30 feet: you gain 5 temporary hit points for each that accepts, and until the rage ends each of them can add a d6 to one damage roll a turn. You can use this a number of times equal to your proficiency bonus, regained on a long rest.",
        uses: { max: "prof", per: "long" },
      },
    ],
  },
  "wild-magic": {
    key: "wild-magic",
    name: "Path of Wild Magic",
    slug: "barbarian:wild-magic",
    source: "Tasha's Cauldron of Everything",
    summary: "Rage suffused with wild magic: a surge on the Wild Magic table each rage, magic sensed and shared, and backlash when hurt.",
    features: [
      {
        level: 3,
        key: "magic-awareness",
        name: "Magic Awareness",
        text: "As an action, until the end of your next turn you know where every spell and magic item within 60 feet is, and each spell's school. You can use this a number of times equal to your proficiency bonus, regained on a long rest.",
        uses: { max: "prof", per: "long" },
      },
      {
        level: 3,
        key: "wild-surge",
        name: "Wild Surge",
        text: "When you enter your rage, roll on the Wild Magic table for the effect it produces; saves against it are DC 8 + your proficiency bonus + your Constitution modifier.",
      },
      {
        level: 6,
        key: "bolstering-magic",
        name: "Bolstering Magic",
        text: "As an action, touch a creature (yourself included) to give it either a d3 on every attack roll and ability check for 10 minutes, or a spell slot back of a level up to a d3 roll (once a long rest for that creature). You can use this a number of times equal to your proficiency bonus, regained on a long rest.",
        uses: { max: "prof", per: "long" },
      },
      {
        level: 10,
        key: "unstable-backlash",
        name: "Unstable Backlash",
        text: "Right after you take damage or fail a saving throw while raging, you can use your reaction to roll on the Wild Magic table; the new effect replaces the current one.",
      },
      {
        level: 14,
        key: "controlled-surge",
        name: "Controlled Surge",
        text: "Whenever you roll on the Wild Magic table, roll twice and choose; a matching pair lets you pick any effect on the table.",
      },
    ],
  },
  battlerager: {
    key: "battlerager",
    name: "Path of the Battlerager",
    slug: "barbarian:battlerager",
    source: "Sword Coast Adventurer's Guide",
    summary: "Dwarven axe-idiots in spiked armour: the armour is a weapon, recklessness a shield, and every blow against you a wound.",
    features: [
      {
        level: 3,
        key: "battlerager-armor",
        name: "Battlerager Armor",
        text: "While raging in spiked armor, you can make a melee weapon attack with the spikes as a bonus action for 1d4 piercing damage, using Strength; a successful grapple also deals 3 piercing damage. The path is for dwarves in the Forgotten Realms; the DM decides here.",
      },
      {
        level: 6,
        key: "reckless-abandon",
        name: "Reckless Abandon",
        text: "When you use Reckless Attack while raging, you gain temporary hit points equal to your Constitution modifier (1 at least), which vanish when the rage ends.",
      },
      {
        level: 10,
        key: "battlerager-charge",
        name: "Battlerager Charge",
        text: "While raging, you can take the Dash action as a bonus action.",
      },
      {
        level: 14,
        key: "spiked-retribution",
        name: "Spiked Retribution",
        text: "While raging in spiked armor and not incapacitated, a creature within 5 feet that hits you with a melee attack takes 3 piercing damage.",
      },
    ],
  },
  giant: {
    key: "giant",
    name: "Path of the Giant",
    slug: "barbarian:giant",
    source: "Bigby Presents: Glory of the Giants",
    summary: "The primal might of giants: you grow Large as you rage, your weapon burns with an element, and you hurl friend and foe alike.",
    features: [
      {
        level: 3,
        key: "giants-power",
        name: "Giant's Power",
        text: "You learn Giant (or another language if you know it), and the druidcraft or thaumaturgy cantrip, cast with Wisdom; the DM adds the cantrip to the sheet.",
      },
      {
        level: 3,
        key: "giants-havoc",
        name: "Giant's Havoc",
        text: "While raging, your Rage Damage bonus applies to thrown weapon attacks made with Strength, your reach grows by 5 feet, and you become Large if there is room.",
      },
      {
        level: 6,
        key: "elemental-cleaver",
        name: "Elemental Cleaver",
        text: "When you rage, infuse a weapon you hold with acid, cold, fire, thunder or lightning: its damage becomes that type, it deals an extra 1d6 of it, and it gains the thrown property (20/60) and returns to your hand. A bonus action while raging changes the type.",
      },
      {
        level: 10,
        key: "mighty-impel",
        name: "Mighty Impel",
        text: "As a bonus action while raging, move a Medium or smaller creature within your reach to a space you can see within 30 feet; an unwilling one makes a Strength save (DC 8 + your proficiency bonus + your Strength modifier) to resist, and falls if nothing holds it up.",
      },
      {
        level: 14,
        key: "demiurgic-colossus",
        name: "Demiurgic Colossus",
        text: "When you rage, your reach grows by 10 feet, you can become Large or Huge, Mighty Impel moves Large or smaller creatures, and Elemental Cleaver's extra damage is 2d6.",
      },
    ],
  },
};

export const BARBARIAN: ClassRules = {
  key: "barbarian",
  name: "Barbarian",
  slug: "barbarian",
  hitDie: 12,
  saves: ["str", "con"],
  subclassLevel: 3,
  subclassLabel: "Primal Path",
  asiLevels: [4, 8, 12, 16, 19],
  caster: "none",
  skillChoices: { count: 2, from: ["animal-handling", "athletics", "intimidation", "nature", "perception", "survival"] },
  proficiencies: {
    armor: ["Light armor", "Medium armor", "Shields"],
    weapons: ["Simple weapons", "Martial weapons"],
    tools: [],
  },
  table: TABLE,
  subclasses: PATHS,
  features: {
    rage: {
      key: "rage",
      name: "Rage",
      text: "As a bonus action, rage for a minute while not in heavy armor: advantage on Strength checks and saves, resistance to bludgeoning, piercing and slashing damage, and a bonus to Strength melee damage of +2 (+3 at 9th level, +4 at 16th). You can't cast or concentrate while raging, and it ends early if you are knocked out or a turn passes without attacking or being hurt. At 20th level you can rage without limit.",
      uses: { max: 2, per: "long" },
      scale: [
        { level: 1, max: 2 },
        { level: 3, max: 3 },
        { level: 6, max: 4 },
        { level: 12, max: 5 },
        { level: 17, max: 6 },
      ],
    },
    "unarmored-defense": {
      key: "unarmored-defense",
      name: "Unarmored Defense",
      text: "While you wear no armor, your AC is 10 + your Dexterity modifier + your Constitution modifier. A shield still counts.",
    },
    "reckless-attack": {
      key: "reckless-attack",
      name: "Reckless Attack",
      text: "When you make your first attack on your turn, you can attack recklessly: advantage on Strength melee attack rolls this turn, and attacks against you have advantage until your next turn.",
    },
    "danger-sense": {
      key: "danger-sense",
      name: "Danger Sense",
      text: "You have advantage on Dexterity saving throws against effects you can see, unless you are blinded, deafened or incapacitated.",
    },
    "extra-attack": {
      key: "extra-attack",
      name: "Extra Attack",
      text: "You attack twice, instead of once, whenever you take the Attack action on your turn.",
    },
    "fast-movement": {
      key: "fast-movement",
      name: "Fast Movement",
      text: "Your speed rises by 10 feet while you aren't wearing heavy armor.",
    },
    "feral-instinct": {
      key: "feral-instinct",
      name: "Feral Instinct",
      text: "You have advantage on initiative rolls, and if surprised you can still act on your first turn, so long as you rage before doing anything else.",
    },
    "brutal-critical": {
      key: "brutal-critical",
      name: "Brutal Critical",
      text: "On a critical hit with a melee attack, roll one extra weapon damage die (two at 13th level, three at 17th).",
    },
    "relentless-rage": {
      key: "relentless-rage",
      name: "Relentless Rage",
      text: "When you drop to 0 hit points while raging and don't die outright, make a DC 10 Constitution save to drop to 1 instead. The DC rises by 5 each time, and resets on a rest.",
    },
    "persistent-rage": {
      key: "persistent-rage",
      name: "Persistent Rage",
      text: "Your rage ends early only if you fall unconscious or choose to end it.",
    },
    "indomitable-might": {
      key: "indomitable-might",
      name: "Indomitable Might",
      text: "If a Strength check totals less than your Strength score, use the score instead.",
    },
    "primal-champion": {
      key: "primal-champion",
      name: "Primal Champion",
      text: "Your Strength and Constitution rise by 4, and their maximum is now 24. The DM raises the scores on the sheet.",
    },
  },
};
