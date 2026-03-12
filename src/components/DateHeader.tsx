"use client";

// ─────────────────────────────────────────────
// DateHeader — date navigation bar for the dashboard
//
// Shows left arrow / centered date label / right arrow.
// Arrows step one day at a time. Right arrow is disabled on today.
// Tapping the label opens the CalendarModal month view.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarModal } from "./CalendarModal";

interface Props {
  userId:       string; // passed through to CalendarModal for compliance fetch
  selectedDate: string; // "YYYY-MM-DD"
  todayDate:    string; // "YYYY-MM-DD" — real today, used to disable forward nav
}

function formatLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function stepDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function DateHeader({ selectedDate, todayDate, userId }: Props) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isToday = selectedDate === todayDate;

  function navigate(days: number) {
    const next = stepDate(selectedDate, days);
    // Never allow navigating into the future
    if (next <= todayDate) {
      router.push(`/?date=${next}`);
    }
  }

  function handleSelectDate(date: string) {
    router.push(`/?date=${date}`);
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left arrow — always enabled */}
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A] text-2xl transition-colors"
          aria-label="Previous day"
        >
          ‹
        </button>

        {/* Date label — opens calendar */}
        <button
          onClick={() => setCalendarOpen(true)}
          className="flex-1 text-center text-sm font-semibold text-[#DDD5C0] hover:text-[#B8933A] transition-colors px-2 py-1 rounded hover:bg-[#1A1A1A]"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}
          aria-label="Open calendar"
        >
          {formatLabel(selectedDate, todayDate)}
        </button>

        {/* Right arrow — disabled on today */}
        <button
          onClick={() => navigate(1)}
          disabled={isToday}
          className={`w-9 h-9 flex items-center justify-center rounded text-2xl transition-colors ${
            isToday
              ? "text-[#2E2E2E] cursor-not-allowed"
              : "text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A]"
          }`}
          aria-label="Next day"
        >
          ›
        </button>
      </div>

      {calendarOpen && (
        <CalendarModal
          userId={userId}
          selectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={handleSelectDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
}
