interface Props {
  streak: number;
}

export function StreakCard({ streak }: Props) {
  return (
    <section
      className="rounded p-5 text-center"
      style={{
        background: "linear-gradient(135deg, #C9A44A 0%, #B8933A 60%, #A07828 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(184,147,58,0.3)",
      }}
    >
      <p
        className="text-5xl font-bold text-[#0B0B0B]"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        {streak}
      </p>
      <p
        className="text-xs uppercase tracking-widest text-[#0B0B0B] mt-2 opacity-70"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Day Streak
      </p>
    </section>
  );
}
