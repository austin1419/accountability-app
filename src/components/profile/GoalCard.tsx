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
          <p className="text-base font-semibold text-[#DDD5C0] leading-snug mb-5">
            {goalName}
          </p>

          <p
            className="text-4xl font-bold text-[#DDD5C0] mb-3"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {progress}
            <span className="text-2xl text-[#9A9080]">%</span>
          </p>

          <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
            <div
              style={{
                width:      `${displayProgress}%`,
                height:     "100%",
                background: "#B8933A",
                borderRadius: "9999px",
                transition: "width 900ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-[#9A9080]">No active goal.</p>
      )}
    </section>
  );
}
