import { useEffect, useState } from "react";
import {
  ABILITIES,
  classLine,
  classRules,
  featByKey,
  initiative,
  modifier,
  ordinal,
  passiveScore,
  proficiencyBonus,
  saveBonus,
  signed,
  SKILLS,
  skillBonus,
  speciesName,
  spellAttack,
  spellByKey,
  spellLink,
  spellName,
  spellSaveDc,
  usesMax,
  wikidot,
} from "~/lib/fifth";
import type { Hero } from "~/types/hero";
import type { Attack, CharacterSheet as Sheet, Money, SheetFeature, SheetPatch } from "~/types/sheet";
import { Fact, Pips, Stepper, TextBlock } from "./SheetFields";

interface CharacterSheetProps {
  sheet: Sheet;
  hero: Pick<Hero, "name" | "player" | "background" | "alignment" | "species">;
  /** The hero's player and the DMs change the day-to-day fields here. */
  canEdit: boolean;
  onSave: (patch: SheetPatch) => Promise<void>;
}

const ABILITY_SHORT: Record<string, string> = { str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" };

function Section({ title, action, children, className = "" }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`sheet-section ${className}`}>
      <h3 className="sheet-section__title">
        <span>{title}</span>
        {action && <span className="no-print flex gap-1.5">{action}</span>}
      </h3>
      {children}
    </section>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="sheet-box">
      <div className="sheet-box__value">{children}</div>
      <div className="sheet-label">{label}</div>
    </div>
  );
}

/** Where a feature's uses are counted: its rules key, so a renamed feature (d6 → d8) keeps its count. */
const usesKey = (feature: SheetFeature) => feature.key || feature.name;

/**
 * A hero's 5e character sheet, laid out like the printed one: who they are,
 * their abilities, saves and skills, combat, features, gear and spells. The
 * numbers are worked out from the build by app/lib/fifth; the day-to-day
 * fields are edited in place by those allowed.
 */
export default function CharacterSheet({ sheet, hero, canEdit, onSave }: CharacterSheetProps) {
  const rules = classRules(sheet.class);
  const prof = proficiencyBonus(sheet.level);
  const hitDie = rules?.hitDie;
  // Fire and forget: a failed save shows its error on the page, and the sheet reloads.
  const save = (patch: SheetPatch) => onSave(patch).catch(() => undefined);
  const edit = canEdit ? save : undefined;

  const shortRest = () => {
    const uses_spent = { ...sheet.uses_spent };
    for (const feature of sheet.features) if (feature.uses?.per === "short") delete uses_spent[usesKey(feature)];
    return save({ uses_spent });
  };
  const longRest = () => {
    if (!window.confirm("Take a long rest? Hit points, spell slots and every feature's uses come back, and half your Hit Dice.")) return;
    return save({
      current_hp: sheet.max_hp,
      temp_hp: 0,
      hit_dice_used: Math.max(0, sheet.hit_dice_used - Math.max(1, Math.floor(sheet.level / 2))),
      slots_used: {},
      uses_spent: {},
      death_saves: { successes: 0, failures: 0 },
    });
  };

  return (
    <article className="sheet sheet-page" aria-label={`${hero.name}'s character sheet`}>
      {/* Who they are */}
      <div className="sheet__plate">
        <div>
          <p className="sheet__name">{hero.name}</p>
          <p className="sheet-label mt-1">Character name</p>
        </div>
        <div className="sheet__facts">
          <Fact label="Class & level">{classLine(sheet)}</Fact>
          <Fact label="Species">{speciesName(sheet.species) || hero.species}</Fact>
          <Fact label="Background">{hero.background}</Fact>
          <Fact label="Alignment">{hero.alignment}</Fact>
          <Fact label="Player">{hero.player}</Fact>
          <Fact label="Experience">Milestone</Fact>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Abilities */}
        <div className="grid content-start grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-1 lg:gap-2.5">
          {ABILITIES.map(({ key, label }) => (
            <div key={key} className="sheet-ability">
              <span className="sheet-label">{label}</span>
              <span className="sheet-ability__mod">{signed(modifier(sheet.abilities[key]))}</span>
              <span className="sheet-ability__score">{sheet.abilities[key]}</span>
            </div>
          ))}
        </div>

        {/* Saves and skills */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Box label="Proficiency bonus">{signed(prof)}</Box>
            <div className="sheet-box">
              <div className="sheet-box__value">
                <Pips total={1} used={sheet.inspiration ? 1 : 0} label="Inspiration" onSet={edit && ((n) => edit({ inspiration: n > 0 }))} />
              </div>
              <div className="sheet-label">Inspiration</div>
            </div>
          </div>
          <Section title="Saving throws">
            {ABILITIES.map(({ key, label }) => (
              <div key={key} className="sheet-row">
                <span className={sheet.saves.includes(key) ? "sheet-check sheet-check--proficient" : "sheet-check"} aria-label={sheet.saves.includes(key) ? "Proficient" : undefined} />
                <span className="sheet-row__bonus">{signed(saveBonus(sheet, key))}</span>
                <span>{label}</span>
                <span />
              </div>
            ))}
          </Section>
          <Section title="Skills">
            {SKILLS.map(({ key, label, ability }) => {
              const rank = sheet.skills[key];
              return (
                <div key={key} className="sheet-row">
                  <span
                    className={
                      rank === "expertise" ? "sheet-check sheet-check--expert" : rank === "proficient" ? "sheet-check sheet-check--proficient" : "sheet-check"
                    }
                    title={rank === "expertise" ? "Expertise" : rank === "proficient" ? "Proficient" : undefined}
                  />
                  <span className="sheet-row__bonus">{signed(skillBonus(sheet, key))}</span>
                  <span>{label}</span>
                  <span className="sheet-label !tracking-[0.08em]">{ABILITY_SHORT[ability]}</span>
                </div>
              );
            })}
          </Section>
          <div className="grid grid-cols-3 gap-2">
            <Box label="Passive Perception">{passiveScore(sheet, "perception")}</Box>
            <Box label="Passive Insight">{passiveScore(sheet, "insight")}</Box>
            <Box label="Passive Investigation">{passiveScore(sheet, "investigation")}</Box>
          </div>
        </div>

        {/* Combat */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="sheet-box">
              <div className="sheet-box__value">
                {canEdit ? <Stepper value={sheet.ac} min={0} max={40} label="Armor class" onCommit={(ac) => save({ ac })} /> : sheet.ac}
              </div>
              <div className="sheet-label">Armor class</div>
            </div>
            <Box label="Initiative">{signed(initiative(sheet))}</Box>
            <Box label="Speed">{sheet.defenses.speed} ft.</Box>
          </div>

          <Section
            title="Hit points"
            action={
              canEdit && (
                <>
                  <button type="button" className="sheet-button" onClick={shortRest}>
                    Short rest
                  </button>
                  <button type="button" className="sheet-button" onClick={longRest}>
                    Long rest
                  </button>
                </>
              )
            }
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="sheet-box__value">{sheet.max_hp}</div>
                <div className="sheet-label">Maximum</div>
              </div>
              <div>
                <div className="sheet-box__value">
                  {canEdit ? (
                    <Stepper value={sheet.current_hp} min={0} max={sheet.max_hp} label="Current hit points" onCommit={(current_hp) => save({ current_hp })} />
                  ) : (
                    sheet.current_hp
                  )}
                </div>
                <div className="sheet-label">Current</div>
              </div>
              <div>
                <div className="sheet-box__value">
                  {canEdit ? (
                    <Stepper value={sheet.temp_hp} min={0} max={999} label="Temporary hit points" onCommit={(temp_hp) => save({ temp_hp })} />
                  ) : (
                    sheet.temp_hp || "—"
                  )}
                </div>
                <div className="sheet-label">Temporary</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="sheet-label">
                  Hit dice · {sheet.level}
                  {hitDie ? `d${hitDie}` : ""} · {sheet.level - sheet.hit_dice_used} left
                </p>
                <div className="mt-1">
                  <Pips total={sheet.level} used={sheet.hit_dice_used} label="Hit dice spent" onSet={edit && ((hit_dice_used) => edit({ hit_dice_used }))} />
                </div>
              </div>
              <div>
                <p className="sheet-label">Death saves</p>
                <div className="mt-1 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-16">Successes</span>
                    <Pips
                      total={3}
                      used={sheet.death_saves.successes}
                      label="Death save successes"
                      onSet={edit && ((successes) => edit({ death_saves: { ...sheet.death_saves, successes } }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16">Failures</span>
                    <Pips
                      total={3}
                      used={sheet.death_saves.failures}
                      failure
                      label="Death save failures"
                      onSet={edit && ((failures) => edit({ death_saves: { ...sheet.death_saves, failures } }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="sheet-label" htmlFor="sheet-conditions">
                Conditions
              </label>
              {canEdit ? (
                <ConditionsInput value={sheet.conditions} onCommit={(conditions) => save({ conditions })} />
              ) : (
                <p className="text-[0.95rem]">{sheet.conditions || "None"}</p>
              )}
            </div>
          </Section>

          <Section title="Defenses & senses">
            <dl className="space-y-1.5 text-[0.95rem]">
              <ListLine label="Resistances" items={sheet.defenses.resistances} />
              <ListLine label="Immunities" items={sheet.defenses.immunities} />
              <ListLine label="Senses" items={sheet.defenses.senses} />
            </dl>
          </Section>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Attacks attacks={sheet.attacks} canEdit={canEdit} onSave={(attacks) => onSave({ attacks })} />
          <Section title="Features & traits">
            {sheet.features.length ? (
              <ul className="space-y-3">
                {sheet.features.map((feature, i) => {
                  const max = usesMax(feature, sheet);
                  const key = usesKey(feature);
                  return (
                    <li key={`${key}-${i}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-semibold">
                          {feature.link ? (
                            <a href={feature.link} target="_blank" rel="noopener noreferrer" className="sheet-link">
                              {feature.name}
                            </a>
                          ) : (
                            feature.name
                          )}
                          <span className="ml-2 text-xs font-normal text-[#5b4527]">{feature.source}</span>
                        </p>
                        {max !== null && (
                          <span className="flex items-center gap-2 text-xs text-[#5b4527]">
                            <Pips
                              total={max}
                              used={Math.min(max, sheet.uses_spent[key] ?? 0)}
                              label={`${feature.name} uses spent`}
                              onSet={edit && ((n) => edit({ uses_spent: { ...sheet.uses_spent, [key]: n } }))}
                            />
                            {max} / {feature.uses!.per} rest
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[0.92rem] leading-snug">{feature.text}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm italic text-[#5b4527]">No features yet.</p>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Proficiencies & languages">
            <dl className="space-y-1.5 text-[0.95rem]">
              <ListLine label="Armor" items={sheet.proficiencies.armor} />
              <ListLine label="Weapons" items={sheet.proficiencies.weapons} />
              <ListLine label="Tools" items={sheet.proficiencies.tools} />
              <ListLine label="Languages" items={sheet.proficiencies.languages} />
            </dl>
          </Section>
          <Section title="Feats">
            {sheet.feats.length ? (
              <ul className="space-y-1">
                {sheet.feats.map((feat) => {
                  const rule = featByKey(feat.key);
                  return (
                    <li key={feat.key}>
                      {rule ? (
                        <a href={wikidot(`feat:${rule.slug}`)} target="_blank" rel="noopener noreferrer" className="sheet-link font-semibold">
                          {feat.name}
                        </a>
                      ) : (
                        <span className="font-semibold">{feat.name}</span>
                      )}
                      {feat.note && <span className="ml-2 text-sm text-[#5b4527]">{feat.note}</span>}
                      {rule && <p className="text-[0.92rem] leading-snug">{rule.summary}</p>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm italic text-[#5b4527]">No feats.</p>
            )}
          </Section>
          <Equipment sheet={sheet} canEdit={canEdit} onSave={onSave} />
        </div>
      </div>

      <Spells sheet={sheet} canEdit={canEdit} onSave={save} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Notes">
          <TextBlock
            value={sheet.notes}
            label="Notes"
            canEdit={canEdit}
            placeholder="Nothing noted yet."
            rows={8}
            onSave={(notes) => onSave({ notes })}
          />
        </Section>
        <LevelLog sheet={sheet} />
      </div>
    </article>
  );
}

function ListLine({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <dt className="sheet-label pt-1">{label}</dt>
      <dd>{items.length ? items.join(", ") : <span className="text-[#5b4527]">—</span>}</dd>
    </div>
  );
}

function ConditionsInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      id="sheet-conditions"
      className="sheet-input mt-1"
      value={text}
      maxLength={400}
      placeholder="None"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function Attacks({ attacks, canEdit, onSave }: { attacks: Attack[]; canEdit: boolean; onSave: (attacks: Attack[]) => Promise<void> }) {
  const [draft, setDraft] = useState<Attack[] | null>(null);
  const [busy, setBusy] = useState(false);
  const change = (i: number, field: keyof Attack, value: string) =>
    setDraft((rows) => rows?.map((row, j) => (j === i ? { ...row, [field]: value } : row)) ?? null);
  const save = async () => {
    setBusy(true);
    try {
      await onSave((draft ?? []).filter((row) => row.name.trim()).map((row) => ({ ...row, name: row.name.trim() })));
      setDraft(null);
    } catch {
      // The page shows what went wrong; the draft stays open to try again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Attacks & cantrips"
      action={
        canEdit &&
        !draft && (
          <button type="button" className="sheet-button" onClick={() => setDraft(attacks.map((a) => ({ ...a })))}>
            Edit
          </button>
        )
      }
    >
      {draft ? (
        <div className="space-y-2">
          {draft.map((row, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_4rem_minmax(0,1fr)_auto] gap-1.5">
              <input className="sheet-input" aria-label="Name" placeholder="Name" value={row.name} onChange={(e) => change(i, "name", e.target.value)} />
              <input className="sheet-input" aria-label="Attack bonus" placeholder="+0" value={row.bonus} onChange={(e) => change(i, "bonus", e.target.value)} />
              <input className="sheet-input" aria-label="Damage and type" placeholder="1d6 piercing" value={row.damage} onChange={(e) => change(i, "damage", e.target.value)} />
              <button type="button" className="sheet-button" aria-label={`Remove ${row.name || "this attack"}`} onClick={() => setDraft(draft.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="sheet-button" onClick={() => setDraft([...draft, { name: "", bonus: "", damage: "", note: "" }])}>
              + Attack
            </button>
            <button type="button" className="sheet-button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="sheet-button" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : attacks.length ? (
        <table className="w-full text-left text-[0.95rem]">
          <thead>
            <tr className="sheet-label">
              <th className="pb-1 font-bold">Name</th>
              <th className="pb-1 font-bold">Hit</th>
              <th className="pb-1 font-bold">Damage / type</th>
            </tr>
          </thead>
          <tbody>
            {attacks.map((attack, i) => (
              <tr key={i} className="border-t border-[#8a6d3b]/25">
                <td className="py-1 pr-2">{attack.name}</td>
                <td className="py-1 pr-2 tabular-nums">{attack.bonus}</td>
                <td className="py-1">{attack.damage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm italic text-[#5b4527]">No attacks written down.</p>
      )}
    </Section>
  );
}

const COINS: (keyof Money)[] = ["cp", "sp", "ep", "gp", "pp"];

function Equipment({ sheet, canEdit, onSave }: { sheet: Sheet; canEdit: boolean; onSave: (patch: SheetPatch) => Promise<void> }) {
  const [draft, setDraft] = useState<{ equipment: string; money: Money } | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await onSave(draft);
      setDraft(null);
    } catch {
      // The page shows what went wrong; the draft stays open to try again.
    } finally {
      setBusy(false);
    }
  };
  const purse = COINS.filter((coin) => sheet.money[coin]).map((coin) => `${sheet.money[coin].toLocaleString()} ${coin}`);

  return (
    <Section
      title="Equipment & money"
      action={
        canEdit &&
        !draft && (
          <button type="button" className="sheet-button" onClick={() => setDraft({ equipment: sheet.equipment, money: { ...sheet.money } })}>
            Edit
          </button>
        )
      }
    >
      {draft ? (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-1.5">
            {COINS.map((coin) => (
              <label key={coin} className="text-center">
                <input
                  className="sheet-input text-center tabular-nums"
                  inputMode="numeric"
                  value={draft.money[coin]}
                  onChange={(e) =>
                    setDraft({ ...draft, money: { ...draft.money, [coin]: Math.max(0, Math.round(Number(e.target.value.replace(/\D/g, "")) || 0)) } })
                  }
                />
                <span className="sheet-label">{coin}</span>
              </label>
            ))}
          </div>
          <textarea
            aria-label="Equipment"
            rows={6}
            className="sheet-input"
            placeholder="One item a line"
            value={draft.equipment}
            onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
          />
          <div className="flex gap-2">
            <button type="button" className="sheet-button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className="sheet-button" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[0.95rem]">
            <span className="sheet-label mr-2">Purse</span>
            {purse.length ? purse.join(" · ") : <span className="text-[#5b4527]">Empty</span>}
          </p>
          {sheet.equipment ? (
            <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed">{sheet.equipment}</p>
          ) : (
            <p className="mt-2 text-sm italic text-[#5b4527]">No equipment written down.</p>
          )}
        </>
      )}
    </Section>
  );
}

function Spells({ sheet, canEdit, onSave }: { sheet: Sheet; canEdit: boolean; onSave: (patch: SheetPatch) => Promise<void> }) {
  const rules = classRules(sheet.class);
  const ability = sheet.spellcasting.ability;
  const { cantrips, known, racial, bonus } = sheet.spellcasting;
  if (!ability && !cantrips.length && !known.length && !racial.length && !bonus.length) return null;

  const slots = rules?.table?.[sheet.level - 1]?.slots ?? [];
  const levelOf = (key: string) => spellByKey(key)?.level;
  const tagged = [
    ...cantrips.map((key) => ({ key, tag: "" })),
    ...racial.map((key) => ({ key, tag: "Species" })),
    ...known.map((key) => ({ key, tag: "" })),
    ...bonus.map((key) => ({ key, tag: "Secret" })),
  ];
  const highest = Math.max(slots.length, ...tagged.map((s) => levelOf(s.key) ?? 0));
  const levels = Array.from({ length: highest + 1 }, (_, level) => level);
  const unknown = tagged.filter((s) => levelOf(s.key) === undefined && !cantrips.includes(s.key) && !racial.includes(s.key));
  const at = (level: number) =>
    tagged.filter((s) => {
      const lvl = levelOf(s.key);
      if (lvl === undefined) return level === 0 && (cantrips.includes(s.key) || racial.includes(s.key));
      return lvl === level;
    });

  return (
    <Section title="Spellcasting" className="mt-4">
      {ability && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-md">
          <Box label="Ability">{ability.toUpperCase()}</Box>
          <Box label="Save DC">{spellSaveDc(sheet)}</Box>
          <Box label="Attack bonus">{signed(spellAttack(sheet) ?? 0)}</Box>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => {
          const spells = at(level);
          const total = level > 0 ? slots[level - 1] ?? 0 : 0;
          if (!spells.length && !total) return null;
          const used = Math.min(total, sheet.slots_used[String(level)] ?? 0);
          return (
            <div key={level}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8a6d3b]/45 pb-1">
                <span className="sheet-label !text-[0.7rem] !text-[#5a1a0a]">{level === 0 ? "Cantrips" : `${ordinal(level)} level`}</span>
                {total > 0 && (
                  <Pips
                    total={total}
                    used={used}
                    label={`${ordinal(level)}-level slots spent`}
                    onSet={canEdit ? (n) => onSave({ slots_used: { ...sheet.slots_used, [String(level)]: n } }) : undefined}
                  />
                )}
              </div>
              <SpellList spells={spells} />
            </div>
          );
        })}
        {unknown.length > 0 && (
          <div>
            <div className="border-b border-[#8a6d3b]/45 pb-1">
              <span className="sheet-label !text-[0.7rem] !text-[#5a1a0a]">From other lists</span>
            </div>
            <SpellList spells={unknown} />
          </div>
        )}
      </div>
      {!cantrips.length && !known.length && (
        <p className="mt-3 text-sm italic text-[#5b4527]">No spells chosen yet; the level-up wizard asks for them.</p>
      )}
    </Section>
  );
}

function SpellList({ spells }: { spells: { key: string; tag: string }[] }) {
  if (!spells.length) return <p className="mt-1 text-sm italic text-[#5b4527]">None known.</p>;
  return (
    <ul className="mt-1 space-y-0.5 text-[0.95rem]">
      {spells.map(({ key, tag }) => (
        <li key={`${key}-${tag}`}>
          <a href={spellLink(key)} target="_blank" rel="noopener noreferrer" className="sheet-link">
            {spellName(key)}
          </a>
          {tag && <span className="ml-2 text-xs text-[#5b4527]">{tag}</span>}
        </li>
      ))}
    </ul>
  );
}

function LevelLog({ sheet }: { sheet: Sheet }) {
  const entries = [...sheet.level_log].sort((a, b) => b.level - a.level);
  return (
    <Section title="Levels taken">
      {entries.length ? (
        <ol className="space-y-2.5">
          {entries.map((entry) => (
            <li key={entry.level}>
              <p className="font-semibold">
                Level {entry.level}
                <span className="ml-2 text-sm font-normal text-[#5b4527]">
                  +{entry.hp_gained} HP
                  {entry.hp_mode === "roll" ? " (rolled)" : entry.hp_mode === "average" ? " (average)" : ""}
                  {entry.date ? ` · ${entry.date}` : ""}
                </span>
              </p>
              {entry.choices.length > 0 && (
                <dl className="mt-0.5 space-y-0.5 text-[0.9rem]">
                  {entry.choices.map(({ step, chose }) => (
                    <div key={step}>
                      <dt className="inline text-[#5b4527]">{step}: </dt>
                      <dd className="inline">{chose}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm italic text-[#5b4527]">No levels recorded.</p>
      )}
    </Section>
  );
}
