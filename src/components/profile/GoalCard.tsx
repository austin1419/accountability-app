"use client";

import { useEffect, useState } from "react";

interface Props {
  goalName: string | null;
  progress: number;
}

const card: React.CSSProperties = {
  background: "#141414", border: "1px solid #252525", borderRadius: 10,
  padding: 16,
};

export function GoalCard({ goalName, progress }: Props) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDisplayProgress(progress), 80);
    return () => clearTimeout(t);
  }, [progress]);

  if (!goalName) {
    return (
      <section style={card}>
        <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868", margin: 0 }}>
          No active goal.
        </p>
      </section>
    );
  }

  return (
    <section style={card}>
      {/* Goal name */}
      <p style={{
        fontFamily: "'EB Garamond', serif", fontSize: 20, fontWeight: 600,
        color: "#F4EEE4", margin: 0, marginBottom: 12,
      }}>
        {goalName}
      </p>

      {/* Progress row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: "#807868" }}>
          Progress
        </span>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.1em", color: "#B8933A",
        }}>
          {progress}%
        </span>
      </div>

      {/* Progress track */}
      <div style={{ height: 4, background: "#252525", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: 4, background: "#B8933A", borderRadius: 2,
          width: `${displayProgress}%`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </section>
  );
}
