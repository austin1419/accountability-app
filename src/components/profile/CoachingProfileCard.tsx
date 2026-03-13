// ─────────────────────────────────────────────
// CoachingProfileCard — placeholder checklist
//
// Shows "3 / 7 sections complete" with a visual checklist.
// All items are static placeholders for now.
// ─────────────────────────────────────────────

const SECTIONS = [
  { label: "Personal Info",      done: true },
  { label: "Health History",     done: true },
  { label: "Goals & Motivation", done: true },
  { label: "Nutrition Habits",   done: false },
  { label: "Training History",   done: false },
  { label: "Lifestyle & Sleep",  done: false },
  { label: "Preferences",       done: false },
];

export function CoachingProfileCard() {
  const completed = SECTIONS.filter((s) => s.done).length;

  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525]">
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-xs uppercase tracking-widest text-[#9A9080]"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Coaching Profile
        </p>
        <p className="text-xs text-[#9A9080]">
          <span className="font-semibold text-[#DDD5C0]">{completed}</span> / {SECTIONS.length} complete
        </p>
      </div>

      <ul className="space-y-2.5">
        {SECTIONS.map((section) => (
          <li key={section.label} className="flex items-center gap-3">
            {/* Checkbox visual */}
            <div
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                section.done
                  ? "bg-[#B8933A]/20 border-[#B8933A]"
                  : "bg-[#1A1A1A] border-[#333]"
              }`}
            >
              {section.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#B8933A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              className={`text-sm ${
                section.done ? "text-[#DDD5C0]" : "text-[#807868]"
              }`}
            >
              {section.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
