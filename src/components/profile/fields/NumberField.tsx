"use client";

interface Props {
  label:       string;
  value:       number | null;
  onChange:    (v: number | null) => void;
  helperText?: string;
  error?:      boolean;
}

export function NumberField({ label, value, onChange, helperText, error }: Props) {
  return (
    <label className="block">
      <span className="block text-sm text-[#C0B9A8] mb-1.5">{label}</span>
      {helperText && <span className="block text-xs text-[#807868] mb-1.5">{helperText}</span>}
      <input
        type="number"
        className={`w-full bg-[#141414] border rounded px-3 py-2 text-sm text-[#DDD5C0] placeholder-[#555] focus:border-[#B8933A] focus:outline-none transition-colors ${
          error ? "border-[#C0392B]" : "border-[#2A2A2A]"
        }`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
      {error && <span className="block text-xs text-[#C0392B] mt-1">Required</span>}
    </label>
  );
}
