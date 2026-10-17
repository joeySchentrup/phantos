# The 5e rules on the character sheet

The character sheet and its level-up wizard work from a small rules engine in
`app/lib/fifth/`. It is plain TypeScript: data about classes, species, feats and
spells, and pure functions over a sheet. Nothing in it touches PocketBase.

The rules follow [dnd5e.wikidot.com](https://dnd5e.wikidot.com/), the 2014 rules.
Feature text is a short paraphrase in our own words, and every class, subclass,
feat and spell links to its wiki page for the rules as written. Keep it that
way: don't paste the wiki's text in.

## What's there now

| Part | State |
|---|---|
| The thirteen classes | In full: the 20-level table, every feature of the core table (not Tasha's optional ones), every official subclass the wiki lists (no Unearthed Arcana) |
| Species | Variant Aasimar (Volo's Guide's aasimar, as Daymond's sheet has it) |
| Feats | The 42 from the Player's Handbook |
| Spells | Every class's list, without Unearthed Arcana spells |

The wizard can take a level in any class. What it can't decide for a class is
left as a feature's text, and the DM fills it in by hand ("Edit the build" on
the sheet); see "What the wizard can't do" below.

## Where things live

```
app/types/fifth.ts          the shapes below
app/types/sheet.ts          the sheet itself
app/lib/fifth/
  core.ts                   modifiers, proficiency, skills, saves, passives, spell DC, a feature's uses
  classes/<class>.ts        a class in full; bard.ts is the model the others follow
  classes/index.ts          CLASSES: every class, by key
  fightingStyles.ts         the fighting styles, by name, with their text
  species.ts                SPECIES
  feats.ts                  FEATS
  spells/<class>.ts         a class's spell list, as names by spell level
  spells/index.ts           LISTS: each class's list, by class key
  levelUp.ts                planLevelUp, validateChoices, applyLevelUp, blankSheet
  fields.ts                 which sheet fields a player may change (mirrors the server)
testing/fifth.test.ts       the engine's tests
```

## How a class is written

Take the Fighter as the example: `classes/fighter.ts`, from
[dnd5e.wikidot.com/fighter](https://dnd5e.wikidot.com/fighter).

1. **The outline**: `key`, `name`, `slug` (its wiki page), `hitDie`, `saves`,
   `subclassLevel` and `subclassLabel`, `asiLevels`, how it casts (`caster`
   and `castingAbility`), `skillChoices` and `proficiencies`. This is all a
   sheet needs to be drawn up; everything below is for the wizard.

2. **The table.** One `ClassLevelRow` for each level 1 to 20:

   ```ts
   { level: 2, proficiency: 2, features: ["action-surge"] },
   ```

   - `proficiency` must equal `proficiencyBonus(level)`; a test checks it.
   - `features` lists the keys of the class features gained *or improved* at
     that level. List a feature again at the level it improves (Bardic
     Inspiration is listed at 1, 5, 10 and 15); the wizard replaces the old
     copy on the sheet with the new one.
   - Casters also set `cantrips`, `spellsKnown` and `slots`, where `slots[0]`
     is the 1st-level slots. A non-caster leaves them out. The wizard asks for
     new cantrips and spells wherever a row's count rises above the last, so:
     - a "known" caster (Bard, Ranger, Sorcerer) and the Warlock set
       `spellsKnown`, and may swap one spell at each level;
     - a prepared caster (Cleric, Druid, Paladin, Artificer) leaves
       `spellsKnown` out: the player prepares from the whole list each day,
       in the sheet's day-to-day `spells_prepared`;
     - the Wizard is prepared but sets `spellsKnown` to its spellbook's size
       (6, then 2 more a level), so it is asked for two spells to copy in;
     - the Warlock's `slots` are its pact slots at their level (`[0, 2]` at
       3rd), so the highest spell level it can choose follows from them.
   - Don't list Ability Score Improvements or the subclass in the table. They
     come from `asiLevels` and `subclassLevel`.

3. **Each feature**, in `features`, keyed as the table names them:

   ```ts
   "action-surge": {
     key: "action-surge",
     name: "Action Surge",
     text: "On your turn, take one additional action.",
     uses: { max: 1, per: "short" },
   },
   ```

   - `uses.max` is a number, an ability (`"cha"`) when the uses are that
     ability's modifier, `"level"` when they equal the class level (Ki
     points, Sorcery Points), or `"prof"` when they equal the proficiency
     bonus (Bladesong, Giant's Might).
   - An optional `scale` list changes the feature's die (`die: 8` shows as
     "(d8)"), its rest (`per: "short"`) or its uses (`max: 3`) from a level
     on; see Bardic Inspiration in `classes/bard.ts` and Rage in
     `classes/barbarian.ts`. List the feature in the table at each of those
     levels.
   - A feature that gives the hero something says so in `grants` (below).

4. **The subclasses** in `subclasses`, keyed by their wiki page
   (`fighter:champion` gives the key `champion`). Each lists its features with
   the level gained, and the same `grants`:

   | `grants` | What the wizard does |
   |---|---|
   | `skills: 3` | asks for three skills, and records the proficiencies |
   | `armor`, `weapons`, `tools` | adds the proficiencies, asking nothing |
   | `fightingStyle: [...]` | asks for one of the named styles (`fightingStyles.ts`), and adds it as a feature |
   | `spellsAnyList: 2` | asks for two spells from any list (typed by name when not on the class's list); they don't count against spells known |
   | `spells: [...]` | adds those spell keys outright (a domain's spells), not counting against spells known |
   | `choose: { count, options }` | asks for `count` of the options (a Metamagic, a manoeuvre, a totem), and records each as a feature keyed `<feature>:<option>` |

   `choose.count` is a number, or a count by level for a class feature the
   table lists more than once (`{ 3: 2, 10: 1, 17: 1 }` for Metamagic). An
   option already on the sheet is never offered again, so option keys are
   unique across the class (`totem-bear`, `aspect-bear`). A fighting style or
   a choice a class feature offered at an earlier level, and the sheet never
   recorded, is asked first at the next level, as a missed step.

5. **Other class rules the wizard reads**:
   - `expertise: [{ level, count }]` asks for that many skills at that level.
   - `magicalSecrets: [{ level, count }]` asks for spells from any list that
     count against spells known.
   - `asiLevels` differ for the Fighter (4, 6, 8, 12, 14, 16, 19) and the Rogue
     (4, 8, 10, 12, 16, 19).

6. **Its spell list**, if it casts: a `spells/<class>.ts` with the names a
   level, as `spells/bard.ts` does, registered in `LISTS` in `spells/index.ts`.
   Keys and wiki links are made from the names (`"Power Word: Stun"` becomes
   `power-word-stun`), which is how the wiki names its pages. A key in
   `grants.spells` is written the same way.

7. **Its tests** in `testing/fifth.test.ts`: the table has 20 rows, the
   counts match the wiki for a few levels, every feature the table names is
   described, and each subclass has features at its levels. A few classes
   also walk a sheet through a level with `planLevelUp` and `applyLevelUp`,
   as the "taking a level" tests do for Daymond.

### What the wizard can't do

These are left to the DM's build editor, on purpose:

- **Preparing spells.** The Cleric, Druid, Paladin, Wizard and Artificer
  prepare spells each day; the sheet's `spells_prepared` is a day-to-day field
  the player keeps.
- **Eldritch Invocations and Mystic Arcanum.** The Warlock's invocations have
  prerequisites the engine doesn't model, and its arcanum is a spell outside
  its slots; both are features with text, and the DM records what is chosen.
- **A subclass's own spellcasting** (Eldritch Knight, Arcane Trickster) and
  **a Circle of the Land's spells**, which depend on the land chosen.
- **Choices of other kinds**: Battle Master manoeuvres and the like are
  `choose` grants, but a feature whose options have level prerequisites (a
  Way of the Four Elements discipline) or that change each day (Kensei
  weapons, infusions) is text.
- **A number of uses that isn't a number, an ability, the level or the
  proficiency bonus** (a Psi Warrior's dice, twice the bonus): text.
- **Multiclassing.** A sheet has one class.
- **Choices a feat brings beyond an ability score** (Skilled's proficiencies,
  Magic Initiate's spells).

## Adding a species

Add an entry to `SPECIES` in `species.ts`, keyed by its name in kebab case:

```ts
"hill-dwarf": {
  key: "hill-dwarf",
  name: "Hill Dwarf",
  slug: "lineage:dwarf",
  abilityBonuses: { con: 2, wis: 1 },
  speed: 25,
  senses: ["Darkvision 60 ft."],
  resistances: ["Poison"],
  languages: ["Common", "Dwarvish"],
  traits: [{ key: "dwarven-toughness", name: "Dwarven Toughness", text: "Your hit point maximum rises by 1 for every level." }],
  spells: [],
},
```

A hero whose species field reads "Hill Dwarf" then gets these when the DM draws
up their sheet. A species the rules don't know is kept as its name, and the DM
fills its traits in by hand.

## Adding a feat

Add it to `FEATS` in `feats.ts` with its wiki page written out (`slug`). Don't
derive it from the name: the wiki doesn't always use the name, as with
Dwarven Fortitude at `feat:dwarven-resilience`. A half feat lists the abilities
it can raise in `abilityIncrease`, and the wizard asks which.

## How a level is taken

`planLevelUp(sheet, choices)` returns the steps for the next level. It plans
again as answers come in, since some steps depend on others (choosing the
College of Lore brings its three skills). Steps for anything the sheet should
already have come first, marked with their own level: a subclass never chosen,
expertise, a fighting style or spells never picked. Then come the new level's
hit points, its ASI, its class and subclass features' choices, and its spells.

`validateChoices` checks the answers. `applyLevelUp` turns them into one change
to save: the new level, every build field, current hit points raised by what the
level gave, and an entry in the level log.

The server lets a player change the build only in a save that raises `level` by
exactly one, and not past the level the DM called them to
(`keepPlayerToSheet` in `pb_hooks/phantos/lib.js`). A new column on
`character_sheets` is part of the build unless it is added to `SHEET_DAY_FIELDS`
in both `lib.js` and `app/lib/fifth/fields.ts`. `testing/sheet.test.ts` keeps the
two lists in step and checks every column belongs to one group.
