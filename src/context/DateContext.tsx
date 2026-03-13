"use client";

// ─────────────────────────────────────────────
// DateContext — centralized date selection state
//
// Single source of truth for which date the app is viewing/editing.
// All pages read selectedDate from here instead of computing "today"
// independently. Editable window: today + 2 previous calendar days.
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useCallback } from "react";

type DateContextType = {
  selectedDate: string;           // "YYYY-MM-DD" currently active date
  todayDate: string;              // "YYYY-MM-DD" real today (Chicago TZ)
  setSelectedDate: (date: string) => void;
  isEditable: (date: string) => boolean;
  isViewingPast: boolean;         // true when selectedDate !== todayDate
};

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
}

const DateContext = createContext<DateContextType | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [todayDate] = useState(chicagoToday);
  const [selectedDate, setSelectedDateRaw] = useState(todayDate);

  // Calendar-day comparison (not timestamp-based)
  const isEditable = useCallback(
    (date: string): boolean => {
      const todayMs = new Date(todayDate + "T00:00:00").getTime();
      const dateMs  = new Date(date + "T00:00:00").getTime();
      const diffDays = Math.floor((todayMs - dateMs) / 86_400_000);
      return diffDays >= 0 && diffDays <= 2;
    },
    [todayDate],
  );

  const setSelectedDate = useCallback(
    (date: string) => {
      if (isEditable(date)) {
        setSelectedDateRaw(date);
      }
    },
    [isEditable],
  );

  const isViewingPast = selectedDate !== todayDate;

  return (
    <DateContext.Provider value={{ selectedDate, todayDate, setSelectedDate, isEditable, isViewingPast }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDate() must be used inside <DateProvider>");
  return ctx;
}
