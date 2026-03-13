"use client";

// ─────────────────────────────────────────────
// DateSync — syncs server-derived date into DateContext
//
// Placed in the dashboard (server component) to ensure the context
// matches the URL on initial load / page refresh.
// ─────────────────────────────────────────────

import { useEffect } from "react";
import { useDate } from "@/context/DateContext";

export function DateSync({ date }: { date: string }) {
  const { setSelectedDate } = useDate();
  useEffect(() => {
    setSelectedDate(date);
  }, [date, setSelectedDate]);
  return null;
}
