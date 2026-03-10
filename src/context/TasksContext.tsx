"use client";
// ─────────────────────────────────────────────
// TasksContext — shared task state across pages
//
// Why this exists:
//   The Dashboard and Tasks pages are separate routes. React state
//   created inside one page (e.g. useState in tasks/page.tsx) is
//   destroyed the moment you navigate away. Context stores the state
//   *above* both pages in the root layout, so both share the same data.
//
// What changed from mock data:
//   - On mount, tasks are fetched from Supabase (real IDs, real completion status)
//   - When a task is toggled, the new status is written to task_logs in Supabase
//   - The Dashboard re-reads from Supabase on next navigation, so the compliance
//     wheel reflects the real saved data
// ─────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from "react";
import type { Task } from "@/lib/mockData";
import { fetchTodaysTasks, upsertTaskLog } from "@/lib/queries";
import { DEMO_CLIENT_ID } from "@/lib/config";

// ── Shape of what the context exposes ─────────
type TasksContextType = {
  tasks: Task[];
  toggleTask: (id: string) => void;
  completedCount: number;
  totalCount: number;
  compliancePercent: number;
};

// ── Create the context (starts empty — provider fills it in) ──
const TasksContext = createContext<TasksContextType | null>(null);

// ── Provider ──────────────────────────────────
// Wrap this around your app (in layout.tsx) so any page can access task state.
export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Load tasks from Supabase when the app first loads
  useEffect(() => {
    fetchTodaysTasks(DEMO_CLIENT_ID).then(setTasks);
  }, []);

  function toggleTask(id: string) {
    // Optimistic update: flip the checkbox immediately so the UI feels instant
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;

      const newDone = !task.done;

      // Write the new status to Supabase in the background (fire-and-forget)
      // The Dashboard will pick up the saved value on next navigation
      upsertTaskLog(id, DEMO_CLIENT_ID, newDone);

      return prev.map((t) => (t.id === id ? { ...t, done: newDone } : t));
    });
  }

  const completedCount    = tasks.filter((t) => t.done).length;
  const totalCount        = tasks.length;
  const compliancePercent = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  return (
    <TasksContext.Provider
      value={{ tasks, toggleTask, completedCount, totalCount, compliancePercent }}
    >
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
