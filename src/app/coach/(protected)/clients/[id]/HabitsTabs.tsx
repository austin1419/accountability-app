"use client";

// ─────────────────────────────────────────────
// HabitsTabs
//
// Tab switcher for Assigned Habits vs Old Habits on the coach client
// detail page. Owns both lists in local state (initialized from server
// props) so removing a habit updates the UI instantly without a round-trip.
// ─────────────────────────────────────────────

import { useState } from "react";
import { categoryColors } from "@/lib/mockData";
import { removeClientHabit } from "./actions";
import { DeleteHabitButton } from "./DeleteHabitButton";

type ActiveHabit   = { id: string; task_name: string; category: string | null };
type ArchivedHabit = { id: string; task_name: string; category: string | null; removal_reason: string | null };

export function HabitsTabs({
  active,
  archived,
}: {
  active:   ActiveHabit[];
  archived: ArchivedHabit[];
}) {
  const [tab,           setTab]           = useState<"active" | "archived">("active");
  const [activeTasks,   setActiveTasks]   = useState<ActiveHabit[]>(active);
  const [archivedTasks, setArchivedTasks] = useState<ArchivedHabit[]>(archived);

  async function handleRemove(taskId: string, reason: string) {
    const task = activeTasks.find((t) => t.id === taskId);
    if (!task) return;

    const archivedTask: ArchivedHabit = { ...task, removal_reason: reason || null };

    // Optimistic update: move it from active → archived immediately
    setActiveTasks((prev) => prev.filter((t) => t.id !== taskId));
    setArchivedTasks((prev) => [archivedTask, ...prev]);

    // Persist to Supabase via server action (admin client bypasses RLS)
    await removeClientHabit(taskId, reason || undefined);
  }

  const habits = tab === "active" ? activeTasks : archivedTasks;

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-[#252525]">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
            tab === "active"
              ? "border-[#B8933A] text-[#B8933A]"
              : "border-transparent text-[#9A9080] hover:text-[#DDD5C0] hover:bg-[#1A1A1A]"
          }`}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Assigned Habits
          {activeTasks.length > 0 && (
            <span className="ml-1.5 text-[#807868] font-normal">({activeTasks.length})</span>
          )}
        </button>
        <button
          onClick={() => setTab("archived")}
          className={`px-4 py-2 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px cursor-pointer ${
            tab === "archived"
              ? "border-[#B8933A] text-[#B8933A]"
              : "border-transparent text-[#9A9080] hover:text-[#DDD5C0] hover:bg-[#1A1A1A]"
          }`}
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          Old Habits
          {archivedTasks.length > 0 && (
            <span className="ml-1.5 text-[#807868] font-normal">({archivedTasks.length})</span>
          )}
        </button>
      </div>

      {/* Habit list */}
      {habits.length === 0 ? (
        <p className="text-sm text-[#9A9080]">
          {tab === "active" ? "No habits assigned yet." : "No old habits."}
        </p>
      ) : (
        <ul className="divide-y divide-[#252525]">
          {habits.map((task) => {
            const colorClass =
              categoryColors[task.category ?? ""] ?? "bg-gray-100 text-gray-500";
            const reason = "removal_reason" in task ? (task as ArchivedHabit).removal_reason : null;
            return (
              <li key={task.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded flex-shrink-0 mt-0.5 ${colorClass}`}>
                  {task.category ?? "General"}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="text-sm text-[#DDD5C0]">{task.task_name}</span>
                  {reason && (
                    <span className="block text-xs text-[#807868] italic mt-0.5">{reason}</span>
                  )}
                </span>
                {tab === "active" && (
                  <DeleteHabitButton taskName={task.task_name} onConfirm={(reason) => handleRemove(task.id, reason)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
