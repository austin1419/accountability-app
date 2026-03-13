"use client";

import { useEffect, useState } from "react";

interface Props {
  goalName: string | null;
  progress: number;
}

export function GoalCard({ goalName, progress }: Props) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    // Tiny delay so the browser paints the 0% bar first, then animates
    const t = setTimeout(() => setDisplayProgress(progress), 80);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <section className="bg-[#141414] rounded p-5 border border-[#252525]">
      <p
        className="text-xs uppercase tracking-widest text-[#9A9080] mb-4"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Current Goal
      </p>

      {goalName ? (
        <>
          <p className="text-sm font-semibold text-[#DDD5C0] leading-snug mb-3">
            {goalName}
          </p>

          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-[#9A9080]">Progress</p>
            <p className="text-xs font-semibold text-[#B8933A]">{progress}%</p>
          </div>

          <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500"
              style={{ width: `${displayProgress}%`, backgroundColor: "#B8933A" }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-[#807868]">No active goal.</p>
      )}
    </section>
  );
}
