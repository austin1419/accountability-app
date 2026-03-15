// ─────────────────────────────────────────────
// Notes — placeholder page
// ─────────────────────────────────────────────

export default function NotesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <svg viewBox="0 0 100 100" fill="none" width="28" height="28" className="mb-4">
        <polygon
          points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20"
          stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.5}
        />
        <polyline
          points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50"
          stroke="#B8933A" strokeWidth={3} fill="none"
          strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="50" cy="50" r="4" fill="#B8933A" />
      </svg>
      <p
        className="text-[#807868] uppercase"
        style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em" }}
      >
        Notes
      </p>
      <p
        className="mt-3 text-[#4A3F2A]"
        style={{ fontFamily: "'EB Garamond', serif", fontSize: "13px", fontStyle: "italic" }}
      >
        Coming soon.
      </p>
    </div>
  );
}
