"use client";

// ─────────────────────────────────────────────
// DateHeader — date navigation bar
//
// Shows left arrow / centered date label / right arrow.
// Arrows step one day — any past date is viewable.
// Tapping the label opens the CalendarModal month view.
// Reads/writes selectedDate from DateContext.
//
// variant="default"  → dashboard style (bordered card, larger)
// variant="compact"  → slim strip for Tasks / Record tabs
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarModal } from "./CalendarModal";
import { useDate } from "@/context/DateContext";

interface Props {
  userId?: string;  // passed through to CalendarModal for compliance fetch
  variant?: "default" | "compact";
  onNavigate?: (date: string) => void; // optional — dashboard pushes URL params
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

export function DateHeader({ userId, variant = "default", onNavigate }: Props) {
  const router = useRouter();
  const { selectedDate, todayDate, setSelectedDate } = useDate();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const isToday = selectedDate === todayDate;
  const isCompact = variant === "compact";

  function navigate(days: number) {
    const next = stepDate(selectedDate, days);
    if (next <= todayDate) {
      setSelectedDate(next);
      if (onNavigate) {
        onNavigate(next);
      } else if (variant === "default") {
        router.push(`/?date=${next}`);
      }
    }
  }

  return (
    <>
      <div className={
        isCompact
          ? "border-b border-[#252525] bg-[#0D0D0D]"
          : "mx-5 mb-3 border border-[#252525] rounded-lg bg-[#141414]"
      }>
        <div className={
          isCompact
            ? "flex items-center justify-between px-3 py-1.5"
            : "flex items-center justify-between px-4 py-3"
        }>
        {/* Left arrow — any past date is viewable */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center justify-center rounded transition-colors text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A] ${
            isCompact ? "w-7 h-7 text-lg" : "w-9 h-9 text-2xl"
          }`}
          aria-label="Previous day"
        >
          ‹
        </button>

        {/* Date label — opens calendar */}
        <button
          onClick={() => setCalendarOpen(true)}
          className={`flex-1 text-center font-semibold text-[#DDD5C0] hover:text-[#B8933A] transition-colors px-2 py-1 rounded hover:bg-[#1A1A1A] ${
            isCompact ? "text-xs" : "text-base"
          }`}
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.08em" }}
          aria-label="Open calendar"
        >
          {formatLabel(selectedDate, todayDate)}
        </button>

        {/* Right arrow — disabled on today */}
        <button
          onClick={() => navigate(1)}
          disabled={isToday}
          className={`flex items-center justify-center rounded transition-colors ${
            isCompact ? "w-7 h-7 text-lg" : "w-9 h-9 text-2xl"
          } ${
            isToday
              ? "text-[#2E2E2E] cursor-not-allowed"
              : "text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A]"
          }`}
          aria-label="Next day"
        >
          ›
        </button>
      </div>
      </div>

      {calendarOpen && (
        <CalendarModal
          userId={userId ?? ""}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
}
