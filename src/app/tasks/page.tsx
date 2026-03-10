"use client";
// ↑ Still needed — this page calls useTasks() which is a React hook.

import { TaskItem }  from "@/components/TaskItem";
import { BottomNav } from "@/components/BottomNav";
import { useTasks }  from "@/context/TasksContext";

export default function TasksPage() {
  // Read tasks and toggleTask from shared context instead of local useState.
  // Changes made here are instantly reflected on the Dashboard's compliance wheel.
  const { tasks, toggleTask, completedCount, totalCount, compliancePercent } = useTasks();

  const allDone = completedCount === totalCount;

  // Group tasks by category so we can render them in sections
  const categories = [...new Set(tasks.map((t) => t.category))];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
        <p className="text-sm text-gray-400">{today}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Today&apos;s Tasks</h1>

        {/* Compliance summary line */}
        <p className="text-sm text-gray-500 mt-1">
          <span className="font-semibold text-gray-800">{completedCount}</span> of{" "}
          <span className="font-semibold text-gray-800">{totalCount}</span> complete
          {" · "}
          <span
            className={`font-semibold ${
              compliancePercent >= 70 ? "text-green-600" : "text-amber-500"
            }`}
          >
            {compliancePercent}%
          </span>
        </p>

        {/* Thin progress bar */}
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              compliancePercent >= 70 ? "bg-green-500" : "bg-amber-400"
            }`}
            style={{ width: `${compliancePercent}%` }}
          />
        </div>
      </header>

      {/* ── Task sections ────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Show a congratulations banner when everything is done */}
        {allDone && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
            <p className="text-green-700 font-semibold text-sm">
              All done today! Great work 🎉
            </p>
          </div>
        )}

        {/* One card per category */}
        {categories.map((category) => {
          const categoryTasks = tasks.filter((t) => t.category === category);
          const catDone       = categoryTasks.filter((t) => t.done).length;

          return (
            <section
              key={category}
              className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100"
            >
              {/* Category header row */}
              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  {category}
                </p>
                <p className="text-xs text-gray-400">
                  {catDone}/{categoryTasks.length}
                </p>
              </div>

              {/* Tasks in this category — onToggle makes them interactive */}
              <ul>
                {categoryTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                ))}
              </ul>
            </section>
          );
        })}

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
