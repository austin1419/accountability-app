"use client";

interface Props {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  multiline?:  boolean;
  helperText?: string;
}

export function TextField({ label, value, onChange, multiline, helperText }: Props) {
  const base =
    "w-full bg-[#141414] border border-[#2A2A2A] rounded px-3 py-2 text-sm text-[#DDD5C0] placeholder-[#555] focus:border-[#B8933A] focus:outline-none transition-colors";

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
    </label>
  );
}
