"use client";

interface Props {
  label:       string;
  value:       string[];
  onChange:    (v: string[]) => void;
  options:     string[];
  helperText?: string;
}

export function MultiSelectField({ label, value, onChange, options, helperText }: Props) {
  const toggle = (opt: string) => {
    onChange(
      value.includes(opt)
        ? value.filter((v) => v !== opt)
        : [...value, opt],
    );
  };

  return (
    <fieldset className="block">
      <legend className="block text-sm text-[#C0B9A8] mb-1.5">{label}</legend>
      {helperText && <span className="block text-xs text-[#807868] mb-1.5">{helperText}</span>}
      <div className="space-y-1.5">
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <label
              key={opt}
              className={`flex items-center gap-2.5 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
                selected
                  ? "border-[#B8933A] bg-[#B8933A]/10 text-[#DDD5C0]"
                  : "border-[#2A2A2A] bg-[#141414] text-[#807868] hover:border-[#444]"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected}
                onChange={() => toggle(opt)}
              />
              <span
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                  selected ? "border-[#B8933A] bg-[#B8933A]/20" : "border-[#555]"
                }`}
              >
                {selected && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#B8933A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
