"use client";

// ─────────────────────────────────────────────
// CalendarModal — month grid overlay for date selection
//
// Shows all days in a month, colored by compliance level.
// Any past date is selectable for viewing.
// Read-only indicator shown on dates outside the edit window.
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import { fetchMonthCompliance } from "@/lib/queries";
import { useDate } from "@/context/DateContext";

interface Props {
  userId:  string;
  onClose: () => void;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarModal({ userId, onClose }: Props) {
  const { selectedDate, todayDate, setSelectedDate } = useDate();

  // Initialize view to the month of the selected date
  const initDate  = new Date(selectedDate + "T00:00:00");
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-indexed
  const [compliance, setCompliance] = useState<Record<string, number>>({});

  // Fetch compliance data whenever the viewed month changes
  useEffect(() => {
    fetchMonthCompliance(userId, viewYear, viewMonth + 1).then(setCompliance);
  }, [userId, viewYear, viewMonth]);

  // Month navigation
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const now = new Date();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year:  "numeric",
  });

  // Build the grid: leading empty cells + numbered days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Monthly compliance bar — month-to-date, excluding future days
  const todayDay = todayDate.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)
    ? parseInt(todayDate.split("-")[2], 10)
    : (viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth()))
      ? daysInMonth
      : 0;

  let completeDays = 0;
  for (let d = 1; d <= todayDay; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (compliance[dateStr] === 100) completeDays++;
  }
  const monthCompliancePct = todayDay > 0 ? Math.round((completeDays / todayDay) * 100) : 0;

  function getComplianceStyle(dateStr: string): string {
    const isFuture  = dateStr > todayDate;
    const pct       = compliance[dateStr];

    // Future — dim
    if (isFuture) return "opacity-20 cursor-not-allowed text-[#9A9080]";

    // Past dates are all selectable — compliance coloring only
    if (pct === undefined) return "text-[#9A9080]";
    if (pct === 100)       return "bg-green-900/50 text-green-400";
    if (pct >= 34)         return "bg-yellow-900/50 text-yellow-400";
    return                        "bg-red-900/50 text-red-400";
  }

  function handleDayClick(dateStr: string) {
    if (dateStr > todayDate) return;
    setSelectedDate(dateStr);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl w-full max-w-md px-5 pt-5 pb-6 shadow-xl"
        style={{ background: "#141414", border: "1px solid #252525", borderBottom: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A] text-xl transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span
            className="text-sm font-semibold text-[#DDD5C0]"
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: "0.06em" }}
          >
            {monthLabel}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-xl transition-colors ${
              isCurrentMonth
                ? "text-[#2E2E2E] cursor-not-allowed"
                : "text-[#9A9080] hover:bg-[#252525] hover:text-[#B8933A]"
            }`}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-[#807868] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const dateStr    = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture   = dateStr > todayDate;
            const isToday    = dateStr === todayDate;
            const isSelected = dateStr === selectedDate;
            const styleClass = getComplianceStyle(dateStr);

            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => handleDayClick(dateStr)}
                className={[
                  "mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                  styleClass,
                  isToday ? "ring-2 ring-[#B8933A] ring-offset-1 ring-offset-[#141414]" : "",
                  isSelected && !isToday ? "ring-2 ring-[#DDD5C0] ring-offset-1 ring-offset-[#141414]" : "",
                ].join(" ")}
                aria-label={dateStr}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[#807868]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400/50 inline-block" /> Complete
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/50 inline-block" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/50 inline-block" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9A9080]/30 inline-block" /> No data
          </span>
        </div>

        {/* Monthly compliance bar */}
        <div className="mt-4 pt-4 border-t border-[#252525]">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] uppercase tracking-widest text-[#9A9080]"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Monthly Compliance
            </span>
            <span className="text-xs font-semibold text-[#DDD5C0]">{monthCompliancePct}%</span>
          </div>
          <div className="h-1.5 bg-[#252525] rounded overflow-hidden">
            <div
              className="h-full rounded transition-all duration-500 bg-[#B8933A]"
              style={{ width: `${monthCompliancePct}%` }}
            />
          </div>
          <p className="text-[10px] text-[#807868] mt-1">
            {completeDays} of {todayDay} days fully complete
          </p>
        </div>
      </div>
    </div>
  );
}
