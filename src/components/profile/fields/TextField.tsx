"use client";

interface Props {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  multiline?:  boolean;
  helperText?: string;
  error?:      boolean;
}

export function TextField({ label, value, onChange, multiline, helperText, error }: Props) {
  const base =
    `w-full bg-[#141414] border rounded px-3 py-2 text-sm text-[#DDD5C0] placeholder-[#555] focus:border-[#B8933A] focus:outline-none transition-colors ${
      error ? "border-[#C0392B]" : "border-[#2A2A2A]"
    }`;

  return (
    <label className="block">
      <span className="block text-sm text-[#C0B9A8] mb-1.5">{label}</span>
      {helperText && <span className="block text-xs text-[#807868] mb-1.5">{helperText}</span>}
      {multiline ? (
        <textarea
          className={`${base} resize-none min-h-[80px]`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={base}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <span className="block text-xs text-[#C0392B] mt-1">Required</span>}
    </label>
  );
}
