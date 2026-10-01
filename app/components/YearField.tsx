import { useEffect, useState } from "react";
import { joinYear, type YearSuffix } from "~/lib/chronicle";

interface YearFieldProps {
  id: string;
  label: React.ReactNode;
  /** Negative for BC, positive for AC, 0 for none. */
  year: number;
  onChange: (year: number) => void;
  required?: boolean;
  placeholder?: string;
}

/** A year on the Hurlen count: a number and whether it is BC or AC. */
export default function YearField({ id, label, year, onChange, required, placeholder }: YearFieldProps) {
  // Kept apart from `year` so the choice survives while the number is blank.
  const [suffix, setSuffix] = useState<YearSuffix>(year < 0 ? "BC" : "AC");

  useEffect(() => {
    if (year) setSuffix(year < 0 ? "BC" : "AC");
  }, [year]);

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          step={1}
          required={required}
          value={year ? Math.abs(year) : ""}
          onChange={(e) => onChange(joinYear(Number(e.target.value), suffix))}
          placeholder={placeholder}
          className="field min-w-0"
        />
        <select
          aria-label="BC or AC"
          value={suffix}
          onChange={(e) => {
            const next = e.target.value as YearSuffix;
            setSuffix(next);
            onChange(joinYear(year, next));
          }}
          className="field !w-auto"
        >
          <option value="BC">BC</option>
          <option value="AC">AC</option>
        </select>
      </div>
    </div>
  );
}
