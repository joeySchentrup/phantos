import { useState } from "react";
import { deleteSheet, errorMessage, saveSheet } from "~/backend/api";
import { ABILITIES, CLASSES, classRules, featByKey, keyOf, SKILLS, SPECIES, speciesKey, speciesName, spellByKey, spellName } from "~/lib/fifth";
import type { Ability, CharacterSheet, SheetFeature, SheetPatch, Skill, SkillRank } from "~/types/sheet";

interface SheetBuildEditorProps {
  sheet: CharacterSheet;
  /** Called with the saved sheet, or null when the edit is cancelled. */
  onDone: (saved: CharacterSheet | null) => void;
  onDeleted: () => void;
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** A spell as written by the DM: its key when the rules know it, else the name as typed. */
const spellKeyOf = (name: string) => (spellByKey(keyOf(name)) ? keyOf(name) : name);

/** "2/long", "cha/short", "level/short", "prof/long": a feature's uses, as typed. */
function usesText(feature: SheetFeature): string {
  return feature.uses ? `${feature.uses.max}/${feature.uses.per}` : "";
}

function parseUses(text: string): SheetFeature["uses"] | undefined | null {
  const t = text.trim().toLowerCase();
  if (!t) return undefined;
  const match = t.match(/^(\d+|str|dex|con|int|wis|cha|level|prof)\s*\/\s*(short|long)$/);
  if (!match) return null;
  const max = /^\d+$/.test(match[1]) ? Number(match[1]) : (match[1] as Ability | "level" | "prof");
  return { max, per: match[2] as "short" | "long" };
}

interface FeatureDraft {
  key?: string;
  name: string;
  source: string;
  level: string;
  uses: string;
  text: string;
  link?: string;
}

/**
 * The DM's hand on a sheet's build: for drawing up a hero's sheet, or
 * putting right what the wizard can't do (a class the rules know only in
 * outline, a feat's extra proficiencies). Players never see this.
 */
export default function SheetBuildEditor({ sheet, onDone, onDeleted }: SheetBuildEditorProps) {
  const [cls, setCls] = useState(sheet.class);
  const [subclass, setSubclass] = useState(sheet.subclass);
  const [species, setSpecies] = useState(speciesName(sheet.species));
  const [level, setLevel] = useState(String(sheet.level));
  const [maxHp, setMaxHp] = useState(String(sheet.max_hp));
  const [abilities, setAbilities] = useState<Record<Ability, string>>(
    Object.fromEntries(ABILITIES.map(({ key }) => [key, String(sheet.abilities[key])])) as Record<Ability, string>
  );
  const [saves, setSaves] = useState<Ability[]>(sheet.saves);
  const [skills, setSkills] = useState(sheet.skills);
  const [armor, setArmor] = useState(sheet.proficiencies.armor.join("\n"));
  const [weapons, setWeapons] = useState(sheet.proficiencies.weapons.join("\n"));
  const [tools, setTools] = useState(sheet.proficiencies.tools.join("\n"));
  const [languages, setLanguages] = useState(sheet.proficiencies.languages.join("\n"));
  const [speed, setSpeed] = useState(String(sheet.defenses.speed));
  const [senses, setSenses] = useState(sheet.defenses.senses.join("\n"));
  const [resistances, setResistances] = useState(sheet.defenses.resistances.join("\n"));
  const [immunities, setImmunities] = useState(sheet.defenses.immunities.join("\n"));
  const [castWith, setCastWith] = useState<Ability | "">(sheet.spellcasting.ability);
  const [cantrips, setCantrips] = useState(sheet.spellcasting.cantrips.map(spellName).join("\n"));
  const [known, setKnown] = useState(sheet.spellcasting.known.map(spellName).join("\n"));
  const [racial, setRacial] = useState(sheet.spellcasting.racial.map(spellName).join("\n"));
  const [bonus, setBonus] = useState(sheet.spellcasting.bonus.map(spellName).join("\n"));
  const [features, setFeatures] = useState<FeatureDraft[]>(
    sheet.features.map((f) => ({ key: f.key, name: f.name, source: f.source, level: String(f.level), uses: usesText(f), text: f.text, link: f.link }))
  );
  const [feats, setFeats] = useState(sheet.feats.map((f) => ({ name: f.name, note: f.note })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rules = classRules(cls);
  const subclasses = rules?.subclasses ? Object.values(rules.subclasses) : [];

  const setFeature = (i: number, field: keyof FeatureDraft, value: string) =>
    setFeatures((list) => list.map((f, j) => (j === i ? { ...f, [field]: value } : f)));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const whole = (text: string) => Math.round(Number(text));
    const lvl = whole(level);
    if (!(lvl >= 1 && lvl <= 20)) return setError("The level is a whole number from 1 to 20.");
    for (const { key, label } of ABILITIES) {
      const n = whole(abilities[key]);
      if (!(n >= 1 && n <= 30)) return setError(`${label} is a score from 1 to 30.`);
    }
    const builtFeatures: SheetFeature[] = [];
    for (const f of features) {
      if (!f.name.trim()) continue;
      const uses = parseUses(f.uses);
      if (uses === null) return setError(`${f.name}'s uses are a number or an ability, a slash, and short or long: "2/long", "cha/short".`);
      const feature: SheetFeature = { name: f.name.trim(), source: f.source.trim(), level: Math.max(1, whole(f.level) || 1), text: f.text.trim() };
      if (f.key) feature.key = f.key;
      if (f.link) feature.link = f.link;
      if (uses) feature.uses = uses;
      builtFeatures.push(feature);
    }

    const patch: SheetPatch = {
      class: cls.trim(),
      subclass: subclass.trim(),
      species: speciesKey(species),
      level: lvl,
      max_hp: Math.max(1, whole(maxHp) || 1),
      abilities: Object.fromEntries(ABILITIES.map(({ key }) => [key, whole(abilities[key])])) as Record<Ability, number>,
      saves,
      skills,
      proficiencies: { armor: lines(armor), weapons: lines(weapons), tools: lines(tools), languages: lines(languages) },
      defenses: { speed: Math.max(0, whole(speed) || 0), senses: lines(senses), resistances: lines(resistances), immunities: lines(immunities) },
      spellcasting: {
        ability: castWith,
        cantrips: lines(cantrips).map(spellKeyOf),
        known: lines(known).map(spellKeyOf),
        racial: lines(racial).map(spellKeyOf),
        bonus: lines(bonus).map(spellKeyOf),
      },
      features: builtFeatures,
      feats: feats
        .filter((f) => f.name.trim())
        .map((f) => ({ key: featByKey(keyOf(f.name))?.key ?? keyOf(f.name), name: f.name.trim(), note: f.note.trim() })),
    };

    setBusy(true);
    try {
      onDone(await saveSheet(sheet.id, patch));
    } catch (err) {
      setError(errorMessage(err, "The sheet could not be saved."));
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this character sheet? Its level log and everything on it go too. This can't be undone.")) return;
    setBusy(true);
    try {
      await deleteSheet(sheet.id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, "The sheet could not be deleted."));
      setBusy(false);
    }
  };

  const area = (label: string, value: string, set: (v: string) => void, hint = "One a line") => (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea rows={3} className="field !text-sm" placeholder={hint} value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <form onSubmit={onSubmit} className="panel space-y-6 p-4 sm:p-6" aria-label="Edit the build">
      <div>
        <p className="eyebrow">Dungeon Master</p>
        <h2 className="font-heading mt-1 text-2xl font-bold text-[#f4e6c3]">Edit the build</h2>
        <p className="mt-1 text-sm text-[#c9b78f]">
          Changes here skip the level-up wizard. Use it to draw up a sheet, or to put right what the rules can't do yet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="field-label">Class</span>
          <select className="field" value={CLASSES[cls] ? cls : ""} onChange={(e) => setCls(e.target.value)}>
            {!CLASSES[cls] && <option value="">{cls || "Choose a class"}</option>}
            {Object.values(CLASSES).map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
                {c.table ? "" : " (outline)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">{rules?.subclassLabel ?? "Subclass"}</span>
          {subclasses.length ? (
            <select className="field" value={subclass} onChange={(e) => setSubclass(e.target.value)}>
              <option value="">None yet</option>
              {subclasses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input className="field" value={subclass} maxLength={40} onChange={(e) => setSubclass(e.target.value)} />
          )}
        </label>
        <label className="block">
          <span className="field-label">Species</span>
          <input className="field" list="sheet-species" value={species} maxLength={80} onChange={(e) => setSpecies(e.target.value)} />
          <datalist id="sheet-species">
            {Object.values(SPECIES).map((s) => (
              <option key={s.key} value={s.name} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="field-label">Level</span>
          <input className="field" inputMode="numeric" value={level} onChange={(e) => setLevel(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Max hit points</span>
          <input className="field" inputMode="numeric" value={maxHp} onChange={(e) => setMaxHp(e.target.value)} />
        </label>
      </div>

      <fieldset>
        <legend className="field-label">Abilities and saving throws</legend>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-center text-xs text-[#c9b78f]" htmlFor={`ability-${key}`}>
                {label}
              </label>
              <input
                id={`ability-${key}`}
                className="field text-center"
                inputMode="numeric"
                value={abilities[key]}
                onChange={(e) => setAbilities({ ...abilities, [key]: e.target.value })}
              />
              <label className="mt-1 flex items-center justify-center gap-1 text-xs text-[#c9b78f]">
                <input
                  type="checkbox"
                  className="accent-[#f2c14e]"
                  checked={saves.includes(key)}
                  onChange={(e) => setSaves(e.target.checked ? [...saves, key] : saves.filter((s) => s !== key))}
                />
                Save
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Skills</legend>
        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-2 text-sm text-[#e9dbb8]">
              {label}
              <select
                className="field !w-36 !py-1 !text-sm"
                value={skills[key] ?? ""}
                onChange={(e) => {
                  const next = { ...skills };
                  if (e.target.value) next[key as Skill] = e.target.value as SkillRank;
                  else delete next[key as Skill];
                  setSkills(next);
                }}
              >
                <option value="">—</option>
                <option value="proficient">Proficient</option>
                <option value="expertise">Expertise</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {area("Armor", armor, setArmor)}
        {area("Weapons", weapons, setWeapons)}
        {area("Tools", tools, setTools)}
        {area("Languages", languages, setLanguages)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="field-label">Speed (ft.)</span>
          <input className="field" inputMode="numeric" value={speed} onChange={(e) => setSpeed(e.target.value)} />
        </label>
        {area("Senses", senses, setSenses)}
        {area("Resistances", resistances, setResistances)}
        {area("Immunities", immunities, setImmunities)}
      </div>

      <fieldset>
        <legend className="field-label">Spellcasting</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="field-label">Casts with</span>
            <select className="field" value={castWith} onChange={(e) => setCastWith(e.target.value as Ability | "")}>
              <option value="">Doesn't cast</option>
              {ABILITIES.map(({ key, label }) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {area("Cantrips", cantrips, setCantrips, "One spell a line")}
          {area("Spells known", known, setKnown, "One spell a line")}
          {area("From the species", racial, setRacial, "One spell a line")}
          {area("Not counted (secrets)", bonus, setBonus, "One spell a line")}
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Features and traits</legend>
        <p className="mb-2 text-xs text-[#c9b78f]">Uses are written as a number or an ability, then the rest: 2/long, cha/short. Leave blank when they aren't counted.</p>
        <div className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="rounded border border-[#f2c14e]/15 p-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_4.5rem_6.5rem_auto]">
                <input className="field !py-1.5" aria-label="Name" placeholder="Name" value={f.name} onChange={(e) => setFeature(i, "name", e.target.value)} />
                <input className="field !py-1.5" aria-label="Source" placeholder="Bard 1" value={f.source} onChange={(e) => setFeature(i, "source", e.target.value)} />
                <input className="field !py-1.5" aria-label="Level" placeholder="Lvl" value={f.level} onChange={(e) => setFeature(i, "level", e.target.value)} />
                <input className="field !py-1.5" aria-label="Uses" placeholder="2/long" value={f.uses} onChange={(e) => setFeature(i, "uses", e.target.value)} />
                <button type="button" className="btn btn-danger !px-3 !py-1 !text-[0.7rem]" onClick={() => setFeatures(features.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
              <textarea className="field mt-2 !text-sm" rows={2} aria-label="What it does" value={f.text} onChange={(e) => setFeature(i, "text", e.target.value)} />
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]"
            onClick={() => setFeatures([...features, { name: "", source: "", level: level, uses: "", text: "" }])}
          >
            + Feature
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="field-label">Feats</legend>
        <div className="space-y-2">
          {feats.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                className="field !py-1.5"
                aria-label="Feat"
                placeholder="Lucky"
                value={f.name}
                onChange={(e) => setFeats(feats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <input
                className="field !py-1.5"
                aria-label="Note"
                placeholder="+1 Charisma"
                value={f.note}
                onChange={(e) => setFeats(feats.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
              />
              <button type="button" className="btn btn-danger !px-3 !py-1 !text-[0.7rem]" onClick={() => setFeats(feats.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost !px-3 !py-1 !text-[0.7rem]" onClick={() => setFeats([...feats, { name: "", note: "" }])}>
            + Feat
          </button>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#f2c14e]/15 pt-5">
        <button type="submit" className="btn btn-gold" disabled={busy}>
          {busy && <span className="spinner" aria-hidden="true" />}
          {busy ? "Saving…" : "Save the build"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onDone(null)} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger ml-auto" onClick={onDelete} disabled={busy}>
          Delete sheet
        </button>
      </div>
    </form>
  );
}
