interface Props {
  streak: number;
}

export function StreakCard({ streak }: Props) {
  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525] text-center">
      <p
        className="text-5xl font-bold text-[#B8933A]"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        {streak}
      </p>
      <p
        className="text-xs uppercase tracking-widest text-[#9A9080] mt-2"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Day Streak
      </p>
    </section>
  );
}
