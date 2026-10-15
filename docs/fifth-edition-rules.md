# The 5e rules on the character sheet

The character sheet and its level-up wizard work from a small rules engine in
`app/lib/fifth/`. It is plain TypeScript: data about classes, species, feats and
spells, and pure functions over a sheet. Nothing in it touches PocketBase.

The rules follow [dnd5e.wikidot.com](https://dnd5e.wikidot.com/), the 2014 rules.
Feature text is a short paraphrase in our own words, and every class, college,
feat and spell links to its wiki page for the rules as written. Keep it that
way: don't paste the wiki's text in.

## What's there now

| Part | State |
|---|---|
| Bard | In full: the 20-level table, every feature, all eight colleges, the whole spell list |
| The other twelve classes | An outline: hit die, saving throws, proficiencies, skill choices, subclass level and label, ASI levels, how they cast. No level table |
| Species | Variant Aasimar (Volo's Guide's aasimar, as Daymond's sheet has it) |
| Feats | The 42 from the Player's Handbook |
| Spells | The bard list only, without Unearthed Arcana spells |

A sheet in a class with only an outline still works: the DM draws it up and
edits the build by hand ("Edit the build" on the sheet). Only the wizard needs a
class in full; for an outlined class it tells the player the DM keeps the levels.

## Where things live

```
app/types/fifth.ts          the shapes below
app/types/sheet.ts          the sheet itself
app/lib/fifth/
  core.ts                   modifiers, proficiency, skills, saves, passives, spell DC
  classes/bard.ts           a class in full: the model to copy
  classes/skeleton.ts       the classes in outline
  classes/index.ts          CLASSES: every class, by key
  species.ts                SPECIES
  feats.ts                  FEATS
  spells/bard.ts            the bard list, as names by spell level
  spells/index.ts           LISTS: each class's list, by class key
  levelUp.ts                planLevelUp, validateChoices, applyLevelUp, blankSheet
  fields.ts                 which sheet fields a player may change (mirrors the server)
testing/fifth.test.ts       the engine's tests
```

## Filling in a class

Take the Fighter as the example. Its wiki page is
[dnd5e.wikidot.com/fighter](https://dnd5e.wikidot.com/fighter).

1. **Move it out of the outline.** Cut the Fighter's entry from
   `classes/skeleton.ts` into a new `classes/fighter.ts` that exports
   `FIGHTER: ClassRules`, and add it to the list in `classes/index.ts`.

2. **Write the table.** One `ClassLevelRow` for each level 1 to 20:

   ```ts
   { level: 2, proficiency: 2, features: ["action-surge"] },
   ```

   - `proficiency` must equal `proficiencyBonus(level)`; a test checks it.
   - `features` lists the keys of the class features gained *or improved* at
     that level. List a feature again at the level it improves (Bardic
     Inspiration is listed at 1, 5, 10 and 15); the wizard replaces the old
     copy on the sheet with the new one.
   - Casters also set `cantrips`, `spellsKnown` (for "known" casters) and
     `slots`, where `slots[0]` is the 1st-level slots. A non-caster leaves
     them out.

3. **Describe each feature** in `features`, keyed as the table names them:

   ```ts
   "action-surge": {
     key: "action-surge",
     name: "Action Surge",
     text: "On your turn, take one additional action.",
     uses: { max: 1, per: "short" },
   },
   ```

   - `uses.max` is a number, or an ability (`"cha"`) when the uses are that
     ability's modifier.
   - An optional `scale` list changes the feature's die (`die: 8` shows as
     "(d8)") or its rest (`per: "short"`) from a level on; see Bardic
     Inspiration in `classes/bard.ts`. A change in the number of uses (Action
     Surge's second use at 17) isn't modelled; mention it in the text.
   - Don't list Ability Score Improvements or the subclass in the table. They
     come from `asiLevels` and `subclassLevel`.

4. **Add the subclasses** in `subclasses`, keyed by their wiki page
   (`fighter:champion` gives the key `champion`). Each lists its features with
   the level gained. A feature that gives the hero something says so in
   `grants`, and the wizard acts on it:

   | `grants` | What the wizard does |
   |---|---|
   | `skills: 3` | asks for three skills, and records the proficiencies |
   | `armor`, `weapons` | adds the proficiencies, asking nothing |
   | `fightingStyle: [...]` | asks for one, and adds it as a feature |
   | `spellsAnyList: 2` | asks for two spells from any list (typed by name when not on the class's list); they don't count against spells known |

5. **Other class rules the wizard reads**:
   - `expertise: [{ level, count }]` asks for that many skills at that level.
   - `magicalSecrets: [{ level, count }]` asks for spells from any list that
     count against spells known.
   - `asiLevels` differ for the Fighter (4, 6, 8, 12, 14, 16, 19) and the Rogue
     (4, 8, 10, 12, 16, 19); the outline already has them right.

6. **Add its spell list**, if it casts: a `spells/<class>.ts` with the names a
   level, as `spells/bard.ts` does, registered in `LISTS` in `spells/index.ts`.
   Keys and wiki links are made from the names (`"Power Word: Stun"` becomes
   `power-word-stun`), which is how the wiki names its pages.

7. **Test it.** Add to `testing/fifth.test.ts`: the table has 20 rows, the
   counts match the wiki for a few levels, every feature the table names is
   described, and each subclass has features at its levels. Then walk a sheet
   through a level or two with `planLevelUp` and `applyLevelUp`, as the
   "taking a level" tests do for Daymond.

### What the wizard can't do yet

These are left to the DM's build editor, on purpose:

- **Prepared casters.** The Cleric, Druid, Paladin, Wizard and Artificer
  prepare spells each day from the whole list. The wizard asks only for
  spells *known*. For these classes, the sheet's `spells_prepared` is a
  day-to-day field the player keeps, and the spells-known steps won't appear,
  since their rows leave `spellsKnown` out.
- **Pact magic.** The Warlock's slots all share one level and come back on a
  short rest, and its invocations aren't modelled. Fill in its table with
  `slots` as its pact slots and keep invocations as features by hand.
- **Multiclassing.** A sheet has one class.
- **Choices a feat brings beyond an ability score** (Skilled's proficiencies,
  Magic Initiate's spells). The DM adds them with "Edit the build".

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
already have come first, marked with their own level: a college never chosen,
expertise or spells never picked. Then come the new level's hit points, its ASI,
its subclass features and its spells.

`validateChoices` checks the answers. `applyLevelUp` turns them into one change
to save: the new level, every build field, current hit points raised by what the
level gave, and an entry in the level log.

The server lets a player change the build only in a save that raises `level` by
exactly one, and not past the level the DM called them to
(`keepPlayerToSheet` in `pb_hooks/phantos/lib.js`). A new column on
`character_sheets` is part of the build unless it is added to `SHEET_DAY_FIELDS`
in both `lib.js` and `app/lib/fifth/fields.ts`. `testing/sheet.test.ts` keeps the
two lists in step and checks every column belongs to one group.
