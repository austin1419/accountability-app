"use client";
// ─────────────────────────────────────────────
// TasksContext — shared task state across pages
//
// Consumes DateContext to know which date to load tasks for.
// Re-fetches tasks whenever selectedDate changes.
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Task } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { fetchTasksForDate, upsertTaskLog, fetchStreak } from "@/lib/queries";
import { useDate } from "@/context/DateContext";

// ── Shape of what the context exposes ─────────
type TasksContextType = {
  tasks: Task[];
  toggleTask: (id: string) => void;
  completedCount: number;
  totalCount: number;
  compliancePercent: number;
  streak: number;
};

// ── Create the context (starts empty — provider fills it in) ──
const TasksContext = createContext<TasksContextType | null>(null);

// ── Provider ──────────────────────────────────
// Wrap this around your app (in layout.tsx) so any page can access task state.
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { selectedDate } = useDate();
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks,  setTasks]  = useState<Task[]>([]);
  const [streak, setStreak] = useState(0);
  const initializedRef = useRef(false);

  // Resolve the current user's public.users id on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!profile) return;

      setUserId(profile.id);
      initializedRef.current = true;
    }
    init();
  }, []);

  // Re-fetch tasks whenever userId or selectedDate changes
  useEffect(() => {
    if (!userId) return;
    fetchTasksForDate(userId, selectedDate).then(setTasks);
    fetchStreak(userId).then(setStreak);
  }, [userId, selectedDate]);

  const toggleTask = useCallback((id: string) => {
    if (!userId) return;
    // Optimistic update: flip the checkbox immediately so the UI feels instant
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;

      const newDone = !task.done;

      // Write to Supabase with the selected date (streak refreshes on next date change)
      upsertTaskLog(id, userId, newDone, selectedDate);

      return prev.map((t) => (t.id === id ? { ...t, done: newDone } : t));
    });
  }, [userId, selectedDate]);

  const completedCount    = tasks.filter((t) => t.done).length;
  const totalCount        = tasks.length;
  const compliancePercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  const value = useMemo(() => ({
    tasks, toggleTask, completedCount, totalCount, compliancePercent, streak,
  }), [tasks, toggleTask, completedCount, totalCount, compliancePercent, streak]);

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────
// Call useTasks() in any client component to access shared task state.
// Throws a clear error if used outside the provider.
export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks() must be used inside <TasksProvider>");
  return ctx;
}
