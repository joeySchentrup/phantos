import { useEffect, useMemo, useState } from "react";
import { errorMessage, saveSheet } from "~/backend/api";
import {
  ABILITIES,
  ABILITY_CAP,
  ABILITY_LABELS,
  applyLevelUp,
  describeChoice,
  FEATS,
  featByKey,
  modifier,
  planLevelUp,
  proficiencyBonus,
  signed,
  validateChoices,
  wikidot,
} from "~/lib/fifth";
import type { AsiChoice, Choices, HpChoice, LevelStep, SwapChoice } from "~/types/fifth";
import type { Ability, CharacterSheet } from "~/types/sheet";

interface LevelUpWizardProps {
  sheet: CharacterSheet;
  /** Called with the saved sheet, or with null when the wizard is closed without taking the level. */
  onDone: (saved: CharacterSheet | null) => void;
}

const REVIEW = "review";

/**
 * Takes the next level, one decision at a time: anything the sheet missed at
 * earlier levels first, then the new level's hit points, improvements and
 * spells, then a review of everything before it is saved in one go.
 */
export default function LevelUpWizard({ sheet, onDone }: LevelUpWizardProps) {
  const [choices, setChoices] = useState<Choices>({});
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const plan = useMemo(() => planLevelUp(sheet, choices), [sheet, choices]);
  const errors = useMemo(() => validateChoices(sheet, plan, choices), [sheet, plan, choices]);
  const ids = [...plan.steps.map((s) => s.id), REVIEW];
  const at = Math.max(0, ids.indexOf(current || ids[0]));
  const step = plan.steps[at];
  const started = Object.keys(choices).length > 0;

  // Warn before leaving with choices made.
  useEffect(() => {
    if (!started) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [started]);

  const answer = (id: string, value: Choices[string]) => setChoices((c) => ({ ...c, [id]: value }));
  const go = (index: number) => {
    setError("");
    setCurrent(ids[Math.min(ids.length - 1, Math.max(0, index))]);
  };
  const cancel = () => {
    if (started && !window.confirm("Stop taking this level? Your choices so far are lost.")) return;
    onDone(null);
  };

  const finish = async () => {
    setBusy(true);
    setError("");
    try {
      const patch = applyLevelUp(sheet, choices);
      onDone(await saveSheet(sheet.id, patch));
    } catch (err) {
      setError(errorMessage(err, "The level could not be saved."));
      setBusy(false);
    }
  };

  const stepDone = (s: LevelStep) => !errors[s.id] && (s.optional || choices[s.id] !== undefined);
  const allDone = plan.steps.every(stepDone);

  return (
    <section aria-labelledby="wizard-heading" className="panel p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Level up</p>
          <h2 id="wizard-heading" className="font-heading mt-1 text-2xl font-bold text-[#f4e6c3] sm:text-3xl">
            {plan.rules.name} {plan.to}
          </h2>
        </div>
        <button type="button" onClick={cancel} className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]" disabled={busy}>
          Not now
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <ol className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Steps">
          {plan.steps.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === at ? "step" : undefined}
                className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm ${
                  i === at ? "bg-[#f2c14e]/15 text-[#fff2b0]" : "text-[#c9b78f] hover:text-[#f4e6c3]"
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[0.65rem] ${
                    stepDone(s) ? "border-[#f2c14e] bg-[#f2c14e] text-[#2a1404]" : "border-[#c9b78f]/60"
                  }`}
                  aria-hidden="true"
                >
                  {stepDone(s) ? "✓" : i + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal">
                  {s.title}
                  {s.level < plan.to && <span className="ml-1 text-xs text-[#c9b78f]">· level {s.level}</span>}
                </span>
              </button>
            </li>
          ))}
          <li className="shrink-0">
            <button
              type="button"
              onClick={() => go(ids.length - 1)}
              aria-current={at === ids.length - 1 ? "step" : undefined}
              className={`flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm ${
                at === ids.length - 1 ? "bg-[#f2c14e]/15 text-[#fff2b0]" : "text-[#c9b78f] hover:text-[#f4e6c3]"
              }`}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#c9b78f]/60 text-[0.65rem]" aria-hidden="true">
                ★
              </span>
              Review
            </button>
          </li>
        </ol>

        <div className="min-w-0">
          {step ? (
            <StepView
              step={step}
              sheet={sheet}
              late={step.level < plan.to}
              value={choices[step.id]}
              error={choices[step.id] !== undefined ? errors[step.id] : undefined}
              onChange={(value) => answer(step.id, value)}
            />
          ) : (
            <Review sheet={sheet} choices={choices} errors={errors} />
          )}

          {error && (
            <p role="alert" className="mt-4 rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#f2c14e]/15 pt-4">
            <button type="button" className="btn btn-ghost" onClick={() => go(at - 1)} disabled={at === 0 || busy}>
              Back
            </button>
            {step ? (
              <button type="button" className="btn btn-gold" onClick={() => go(at + 1)} disabled={!stepDone(step)}>
                {step.optional && choices[step.id] === undefined ? "Skip" : "Next"}
              </button>
            ) : (
              <button type="button" className="btn btn-gold" onClick={finish} disabled={!allDone || busy}>
                {busy && <span className="spinner" aria-hidden="true" />}
                {busy ? "Saving…" : `Take level ${plan.to}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepView({
  step,
  sheet,
  late,
  value,
  error,
  onChange,
}: {
  step: LevelStep;
  sheet: CharacterSheet;
  late: boolean;
  value: Choices[string];
  error?: string;
  onChange: (value: Choices[string]) => void;
}) {
  return (
    <div>
      <h3 className="font-heading text-xl font-bold text-[#f4e6c3]">{step.title}</h3>
      {late && (
        <p className="mt-1 text-sm text-[#f2c14e]">
          Missed at level {step.level}: your sheet should already have this, so it comes first.
        </p>
      )}
      <p className="mt-2 text-[#e9dbb8]">
        {step.text}
        {step.link && (
          <>
            {" "}
            <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-[#f2c14e] underline underline-offset-2">
              The rules
            </a>
          </>
        )}
      </p>
      <div className="mt-4">
        {step.pick && <PickStep step={step} value={Array.isArray(value) ? value : []} onChange={onChange} />}
        {step.kind === "hp" && <HpStep step={step} value={value as HpChoice | undefined} onChange={onChange} />}
        {step.kind === "asi" && <AsiStep sheet={sheet} value={value as AsiChoice | undefined} onChange={onChange} />}
        {step.kind === "swap" && <SwapStep step={step} value={value as SwapChoice | undefined} onChange={onChange} />}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ffcfb8]">
          {error}
        </p>
      )}
    </div>
  );
}

function PickStep({ step, value, onChange }: { step: LevelStep; value: string[]; onChange: (value: string[]) => void }) {
  const pick = step.pick!;
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");
  const single = pick.count === 1;
  const full = value.length >= pick.count;
  const shown = pick.options.filter((o) => !filter || o.label.toLowerCase().includes(filter.toLowerCase()));
  const typed = value.filter((v) => !pick.options.some((o) => o.key === v));
  const toggle = (key: string) => {
    if (single) return onChange([key]);
    onChange(value.includes(key) ? value.filter((v) => v !== key) : full ? value : [...value, key]);
  };

  return (
    <div>
      <p className="text-sm text-[#c9b78f]">
        {value.length} of {pick.count} chosen
      </p>
      {pick.options.length > 10 && (
        <input
          type="search"
          className="field mt-2 !py-1.5"
          placeholder="Filter…"
          aria-label="Filter the choices"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2" role={single ? "radiogroup" : "group"} aria-label={step.title}>
        {shown.map((option) => {
          const chosen = value.includes(option.key);
          const disabled = !chosen && !single && full;
          return (
            <label
              key={option.key}
              className={chosen ? "wizard-option wizard-option--chosen" : disabled ? "wizard-option wizard-option--disabled" : "wizard-option"}
            >
              <input
                type={single ? "radio" : "checkbox"}
                name={step.id}
                className="mt-1 accent-[#f2c14e]"
                checked={chosen}
                disabled={disabled}
                onChange={() => toggle(option.key)}
              />
              <span className="min-w-0">
                <span className="font-semibold text-[#f4e6c3]">{option.label}</span>
                {option.link && (
                  <a
                    href={option.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-[#f2c14e] underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    rules
                  </a>
                )}
                {option.detail && <span className="block text-sm text-[#c9b78f]">{option.detail}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {pick.allowCustom && (
        <div className="mt-4">
          <label className="field-label" htmlFor={`${step.id}-custom`}>
            A spell from another class's list
          </label>
          <div className="flex gap-2">
            <input
              id={`${step.id}-custom`}
              className="field !py-1.5"
              placeholder="Fireball"
              value={custom}
              maxLength={80}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem]"
              disabled={!custom.trim() || full}
              onClick={() => {
                onChange([...value, custom.trim()]);
                setCustom("");
              }}
            >
              Add
            </button>
          </div>
          {typed.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {typed.map((name) => (
                <li key={name} className="flex items-center gap-1 rounded border border-[#f2c14e]/40 px-2 py-0.5 text-sm text-[#f4e6c3]">
                  {name}
                  <button type="button" aria-label={`Remove ${name}`} className="text-[#c9b78f] hover:text-[#ffcfb8]" onClick={() => onChange(value.filter((v) => v !== name))}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function HpStep({ step, value, onChange }: { step: LevelStep; value: HpChoice | undefined; onChange: (value: HpChoice) => void }) {
  const { die, conMod, average } = step.hp!;
  const [roll, setRoll] = useState(value?.mode === "roll" ? String(value.roll) : "");
  const total = (n: number) => Math.max(1, n + conMod);
  const setRolled = (text: string) => {
    setRoll(text);
    onChange({ mode: "roll", roll: Number(text) || 0 });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={value?.mode === "average" ? "wizard-option wizard-option--chosen" : "wizard-option"}>
        <input type="radio" name={step.id} className="mt-1 accent-[#f2c14e]" checked={value?.mode === "average"} onChange={() => onChange({ mode: "average" })} />
        <span>
          <span className="font-semibold text-[#f4e6c3]">Take the average</span>
          <span className="block text-sm text-[#c9b78f]">
            {average} {signed(conMod)} CON = <strong className="text-[#f4e6c3]">{total(average)} hit points</strong>
          </span>
        </span>
      </label>
      <label className={value?.mode === "roll" ? "wizard-option wizard-option--chosen" : "wizard-option"}>
        <input
          type="radio"
          name={step.id}
          className="mt-1 accent-[#f2c14e]"
          checked={value?.mode === "roll"}
          onChange={() => setRolled(roll)}
        />
        <span className="min-w-0">
          <span className="font-semibold text-[#f4e6c3]">Roll a d{die}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#c9b78f]">
            <input
              aria-label={`Your d${die} roll`}
              inputMode="numeric"
              className="field !w-16 !py-1 text-center"
              value={roll}
              placeholder={`1–${die}`}
              onChange={(e) => setRolled(e.target.value.replace(/\D/g, "").slice(0, 2))}
            />
            <button type="button" className="btn btn-ghost !px-2 !py-1 !text-[0.65rem]" onClick={() => setRolled(String(1 + Math.floor(Math.random() * die)))}>
              Roll for me
            </button>
            {value?.mode === "roll" && value.roll >= 1 && value.roll <= die && (
              <span>
                {value.roll} {signed(conMod)} CON = <strong className="text-[#f4e6c3]">{total(value.roll)}</strong>
              </span>
            )}
          </span>
        </span>
      </label>
    </div>
  );
}

function AsiStep({ sheet, value, onChange }: { sheet: CharacterSheet; value: AsiChoice | undefined; onChange: (value: AsiChoice) => void }) {
  const mode = value?.mode;
  const abilities = value && "abilities" in value ? value.abilities ?? [] : [];
  const feat = value?.mode === "feat" ? featByKey(value.feat) : undefined;
  const taken = new Set(sheet.feats.map((f) => f.key));
  const after = (a: Ability) => {
    let score = sheet.abilities[a];
    if (mode === "+2" && abilities[0] === a) score += 2;
    if (mode === "+1+1" && abilities.includes(a)) score += 1;
    if (mode === "feat" && abilities[0] === a) score += 1;
    return score;
  };
  const select = (i: number, label: string, options: Ability[] = ABILITIES.map((x) => x.key)) => (
    <select
      aria-label={label}
      className="field !py-1.5"
      value={abilities[i] ?? ""}
      onChange={(e) => {
        // Keep each select's answer in its own place, chosen or not.
        const next = Array.from({ length: mode === "+1+1" ? 2 : 1 }, (_, j) => abilities[j] ?? "") as Ability[];
        next[i] = e.target.value as Ability;
        onChange({ ...(value as AsiChoice), abilities: next } as AsiChoice);
      }}
    >
      <option value="">Choose an ability</option>
      {options.map((a) => (
        <option key={a} value={a} disabled={sheet.abilities[a] >= ABILITY_CAP}>
          {ABILITY_LABELS[a]} ({sheet.abilities[a]})
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="How to improve">
        {(
          [
            ["+2", "+2 to one ability"],
            ["+1+1", "+1 to two abilities"],
            ["feat", "A feat instead"],
          ] as const
        ).map(([m, label]) => (
          <label key={m} className={mode === m ? "wizard-option wizard-option--chosen" : "wizard-option"}>
            <input
              type="radio"
              name="asi-mode"
              className="mt-1 accent-[#f2c14e]"
              checked={mode === m}
              onChange={() => onChange(m === "feat" ? { mode: "feat", feat: "" } : ({ mode: m, abilities: [] } as AsiChoice))}
            />
            <span className="font-semibold text-[#f4e6c3]">{label}</span>
          </label>
        ))}
      </div>

      {mode === "+2" && select(0, "The ability to raise by 2")}
      {mode === "+1+1" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {select(0, "The first ability to raise by 1")}
          {select(1, "The second ability to raise by 1")}
        </div>
      )}
      {mode === "feat" && (
        <div className="space-y-3">
          <select
            aria-label="Feat"
            className="field !py-1.5"
            value={value?.mode === "feat" ? value.feat : ""}
            onChange={(e) => onChange({ mode: "feat", feat: e.target.value, abilities: [] })}
          >
            <option value="">Choose a feat</option>
            {FEATS.map((f) => (
              <option key={f.key} value={f.key} disabled={taken.has(f.key)}>
                {f.name}
              </option>
            ))}
          </select>
          {feat && (
            <p className="text-sm text-[#e9dbb8]">
              {feat.summary}{" "}
              <a href={wikidot(`feat:${feat.slug}`)} target="_blank" rel="noopener noreferrer" className="text-[#f2c14e] underline underline-offset-2">
                The rules
              </a>
            </p>
          )}
          {feat?.abilityIncrease && select(0, `The ability ${feat.name} raises by 1`, feat.abilityIncrease)}
        </div>
      )}

      {mode && mode !== "feat" && (
        <table className="w-full max-w-md text-sm text-[#e9dbb8]">
          <tbody>
            {ABILITIES.map(({ key, label }) => (
              <tr key={key} className={after(key) !== sheet.abilities[key] ? "text-[#fff2b0]" : ""}>
                <td className="py-0.5">{label}</td>
                <td className="py-0.5 text-right tabular-nums">
                  {sheet.abilities[key]} → {after(key)} ({signed(modifier(after(key)))})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SwapStep({ step, value, onChange }: { step: LevelStep; value: SwapChoice | undefined; onChange: (value: SwapChoice | undefined) => void }) {
  const swap = step.swap!;
  const forget = value?.forget ?? "";
  const learn = value?.learn ?? "";
  const set = (next: Partial<SwapChoice>) => {
    const merged = { forget, learn, ...next };
    onChange(merged.forget || merged.learn ? merged : undefined);
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label>
        <span className="field-label">Forget</span>
        <select className="field !py-1.5" value={forget} onChange={(e) => set({ forget: e.target.value })}>
          <option value="">Keep every spell</option>
          {swap.forget.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="field-label">Learn in its place</span>
        <select className="field !py-1.5" value={learn} disabled={!forget} onChange={(e) => set({ learn: e.target.value })}>
          <option value="">Choose a spell</option>
          {swap.learn.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label} ({o.detail})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Review({ sheet, choices, errors }: { sheet: CharacterSheet; choices: Choices; errors: Record<string, string> }) {
  const plan = planLevelUp(sheet, choices);
  const missing = plan.steps.filter((s) => !s.optional && (choices[s.id] === undefined || errors[s.id]));
  let preview: ReturnType<typeof applyLevelUp> | null = null;
  try {
    preview = missing.length ? null : applyLevelUp(sheet, choices);
  } catch {
    preview = null;
  }

  return (
    <div>
      <h3 className="font-heading text-xl font-bold text-[#f4e6c3]">Review</h3>
      {missing.length > 0 ? (
        <p className="mt-2 text-[#ffcfb8]">Still to decide: {missing.map((s) => s.title).join(", ")}.</p>
      ) : (
        <p className="mt-2 text-[#e9dbb8]">Everything below is saved together when you take the level.</p>
      )}

      <dl className="mt-4 space-y-2 text-[#e9dbb8]">
        {plan.steps.map((s) =>
          choices[s.id] !== undefined || !s.optional ? (
            <div key={s.id} className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <dt className="text-sm text-[#c9b78f]">
                {s.title}
                {s.level < plan.to ? ` (level ${s.level})` : ""}
              </dt>
              <dd>{choices[s.id] !== undefined && !errors[s.id] ? describeChoice(s, choices[s.id]) : "—"}</dd>
            </div>
          ) : null
        )}
      </dl>

      {plan.gains.length > 0 && (
        <div className="mt-5">
          <p className="field-label">Gained with no choice</p>
          <ul className="space-y-1.5 text-[#e9dbb8]">
            {plan.gains.map((g) => (
              <li key={g.key ?? g.name}>
                <span className="font-semibold text-[#f4e6c3]">{g.name}</span>
                <span className="ml-2 text-sm text-[#c9b78f]">{g.source}</span>
                <span className="block text-sm">{g.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <p className="mt-5 rounded border border-[#f2c14e]/30 bg-[#f2c14e]/10 px-3 py-2 text-[#fff2b0]">
          Hit points {sheet.max_hp} → {preview.max_hp}. Proficiency bonus {signed(proficiencyBonus(sheet.level))} →{" "}
          {signed(proficiencyBonus(plan.to))}.
        </p>
      )}
    </div>
  );
}
