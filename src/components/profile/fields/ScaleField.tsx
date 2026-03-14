"use client";

interface Props {
  label:       string;
  value:       number | "";
  onChange:    (v: number) => void;
  min:         number;
  max:         number;
  helperText?: string;
}

export function ScaleField({ label, value, onChange, min, max, helperText }: Props) {
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <fieldset className="block">
      <legend className="block text-sm text-[#C0B9A8] mb-1.5">{label}</legend>
      {helperText && <span className="block text-xs text-[#807868] mb-2">{helperText}</span>}
      <div className="flex gap-1.5 flex-wrap">
        {points.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded border text-sm font-medium transition-colors ${
              value === n
                ? "border-[#B8933A] bg-[#B8933A]/10 text-[#DDD5C0]"
                : "border-[#2A2A2A] bg-[#141414] text-[#807868] hover:border-[#444]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
