"use client";

// ─────────────────────────────────────────────
// CalendarModal — month grid overlay for date selection
//
// Shows all days in a month, colored by compliance level.
// Opened when the user taps the date label in DateHeader.
// ─────────────────────────────────────────────

import { useEffect, useState } from "react";
import { fetchMonthCompliance } from "@/lib/queries";

interface Props {
  userId:       string;                    // public.users.id for compliance fetch
  selectedDate: string;                    // "YYYY-MM-DD" currently selected
  todayDate:    string;                    // "YYYY-MM-DD" real today (can't go past)
  onSelectDate: (date: string) => void;   // called with the chosen date
  onClose:      () => void;
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getComplianceStyle(
  dateStr:    string,
  todayDate:  string,
  compliance: Record<string, number>,
): string {
  // Future dates — dimmed, not interactive
  if (dateStr > todayDate) return "opacity-30 cursor-not-allowed text-gray-400";

  const pct = compliance[dateStr];
  if (pct === undefined) return "text-gray-500";           // no data
  if (pct < 34)          return "bg-red-100 text-red-700";
  if (pct < 67)          return "bg-yellow-100 text-yellow-700";
  return                        "bg-green-100 text-green-700";
}

export function CalendarModal({ userId, selectedDate, todayDate, onSelectDate, onClose }: Props) {
  // Initialize view to the month of the selected date
  const initDate  = new Date(selectedDate + "T00:00:00");
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-indexed
  const [compliance, setCompliance] = useState<Record<string, number>>({});

  // Fetch compliance data whenever the viewed month changes
  useEffect(() => {
    fetchMonthCompliance(userId, viewYear, viewMonth + 1).then(setCompliance);
  }, [viewYear, viewMonth]);

  // Month navigation
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    const now = new Date();
    // Don't navigate past current real month
    if (viewYear === now.getFullYear() && viewMonth === now.getMonth()) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const now = new Date();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const monthLabel     = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year:  "numeric",
  });

  // Build the grid: leading empty cells + numbered days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    // Backdrop — click outside to dismiss
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Modal sheet — stops propagation so inner clicks don't dismiss */}
      <div
        className="bg-white rounded-t-2xl w-full max-w-md px-5 pt-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 text-xl"
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800">{monthLabel}</span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-xl ${
              isCurrentMonth
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-500 hover:bg-gray-100"
            }`}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isFuture   = dateStr > todayDate;
            const isSelected = dateStr === selectedDate;
            const styleClass = getComplianceStyle(dateStr, todayDate, compliance);

            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => { onSelectDate(dateStr); onClose(); }}
                className={[
                  "mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                  styleClass,
                  isSelected ? "ring-2 ring-blue-500 ring-offset-1" : "",
                ].join(" ")}
                aria-label={dateStr}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-5 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-200 inline-block" /> ≥67%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-200 inline-block" /> 34–66%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-200 inline-block" /> &lt;34%
          </span>
        </div>
      </div>
    </div>
  );
}
