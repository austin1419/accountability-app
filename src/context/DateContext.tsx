"use client";

// ─────────────────────────────────────────────
// DateContext — centralized date selection state
//
// Single source of truth for which date the app is viewing/editing.
// All pages read selectedDate from here instead of computing "today"
// independently.
//
// VIEW: any past date can be selected and viewed.
// EDIT: only today + previous 3 calendar days are editable.
//
// todayDate refreshes on visibilitychange so midnight crossings
// don't leave the edit window and isViewingPast stale.
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

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
  const [todayDate, setTodayDate] = useState(chicagoToday);
  const [selectedDate, setSelectedDateRaw] = useState(todayDate);

  // Refresh todayDate when the tab regains focus (handles midnight crossings)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        const now = chicagoToday();
        setTodayDate((prev) => {
          if (prev !== now) {
            // If selectedDate was "today", advance it to the new today
            setSelectedDateRaw((sel) => sel === prev ? now : sel);
            return now;
          }
          return prev;
        });
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Edit window: today + 3 previous calendar days (4 days total)
  const isEditable = useCallback(
    (date: string): boolean => {
      const todayMs = new Date(todayDate + "T00:00:00").getTime();
      const dateMs  = new Date(date + "T00:00:00").getTime();
      const diffDays = Math.floor((todayMs - dateMs) / 86_400_000);
      return diffDays >= 0 && diffDays <= 3;
    },
    [todayDate],
  );

  // Navigation: allow any past date (not future)
  const setSelectedDate = useCallback(
    (date: string) => {
      if (date <= todayDate) {
        setSelectedDateRaw(date);
      }
    },
    [todayDate],
  );

  const isViewingPast = selectedDate !== todayDate;

  const value = useMemo(() => ({
    selectedDate, todayDate, setSelectedDate, isEditable, isViewingPast,
  }), [selectedDate, todayDate, setSelectedDate, isEditable, isViewingPast]);

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const ctx = useContext(DateContext);
  if (!ctx) throw new Error("useDate() must be used inside <DateProvider>");
  return ctx;
}
