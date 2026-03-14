"use client";

interface Props {
  label:       string;
  value:       number | "";
  onChange:    (v: number | "") => void;
  helperText?: string;
}

export function NumberField({ label, value, onChange, helperText }: Props) {
  return (
    <label className="block">
      <span className="block text-sm text-[#C0B9A8] mb-1.5">{label}</span>
      {helperText && <span className="block text-xs text-[#807868] mb-1.5">{helperText}</span>}
      <input
        type="number"
        className="w-full bg-[#141414] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#DDD5C0] placeholder-[#555] focus:border-[#B8933A] focus:outline-none transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </label>
  );
}
