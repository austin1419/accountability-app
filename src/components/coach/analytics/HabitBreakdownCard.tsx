// ─────────────────────────────────────────────
// HabitBreakdownCard — placeholder for habit performance
//
// Displays a structured placeholder until per-habit
// compliance data is exposed via the backend.
// ─────────────────────────────────────────────

import { SectionHeader } from "./SectionHeader";

interface HabitBreakdownCardProps {
  title: string;
  subtitle?: string;
}

export function HabitBreakdownCard({ title, subtitle }: HabitBreakdownCardProps) {
  return (
    <div
      className="rounded-[7px] border border-[#1A1A1A]"
      style={{ background: "#0D0D0D", padding: "16px 20px" }}
    >
      <SectionHeader title={title} subtitle={subtitle} />

      <div className="flex flex-col items-center py-6">
        <span style={{ fontSize: "18px", color: "#2A2010" }}>&#9776;</span>
        <p
          className="mt-2 text-center"
          style={{ fontFamily: "'EB Garamond', serif", fontSize: "11px", fontStyle: "italic", color: "#4A3F2A", maxWidth: "200px" }}
        >
          Per-habit adherence breakdown will appear here once habit-level compliance data is available.
        </p>
      </div>
    </div>
  );
}
