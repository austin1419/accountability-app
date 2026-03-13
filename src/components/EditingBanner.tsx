"use client";

// ─────────────────────────────────────────────
// EditingBanner — shown when viewing/editing a past day
//
// Displays "Editing March 12" with a "Back to Today" button.
// Renders only when selectedDate !== todayDate.
// ─────────────────────────────────────────────

import { useDate } from "@/context/DateContext";

export function EditingBanner() {
  const { selectedDate, todayDate, setSelectedDate, isViewingPast } = useDate();

  if (!isViewingPast) return null;

  const label = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
  });

  return (
    <div
      className="mx-5 mt-3 flex items-center justify-between px-4 py-2.5 rounded-lg border border-[#B8933A]/40"
      style={{ background: "rgba(184, 147, 58, 0.08)" }}
    >
      <span
        className="text-sm font-semibold text-[#B8933A]"
        style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.04em" }}
      >
        Editing {label}
      </span>
      <button
        onClick={() => setSelectedDate(todayDate)}
        className="text-xs font-semibold text-[#DDD5C0] hover:text-[#B8933A] transition-colors px-3 py-1 rounded border border-[#252525] bg-[#1A1A1A]"
      >
        Back to Today
      </button>
    </div>
  );
}
