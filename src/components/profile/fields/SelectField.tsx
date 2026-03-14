"use client";

interface Props {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  options:     string[];
  helperText?: string;
  error?:      boolean;
}

export function SelectField({ label, value, onChange, options, helperText, error }: Props) {
  return (
    <fieldset className="block">
      <legend className="block text-sm text-[#C0B9A8] mb-1.5">{label}</legend>
      {helperText && <span className="block text-xs text-[#807868] mb-1.5">{helperText}</span>}
      {error && <span className="block text-xs text-[#C0392B] mb-1.5">Required</span>}
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
              value === opt
                ? "border-[#B8933A] bg-[#B8933A]/10 text-[#DDD5C0]"
                : error
                ? "border-[#C0392B]/40 bg-[#141414] text-[#807868] hover:border-[#444]"
                : "border-[#2A2A2A] bg-[#141414] text-[#807868] hover:border-[#444]"
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === opt ? "border-[#B8933A]" : "border-[#555]"
              }`}
            >
              {value === opt && <span className="w-2 h-2 rounded-full bg-[#B8933A]" />}
            </span>
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
