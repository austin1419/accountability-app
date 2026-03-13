"use client";
// ↑ Still needed — this page calls useTasks() which is a React hook.

import { TaskItem }  from "@/components/TaskItem";
import { BottomNav } from "@/components/BottomNav";
import { StreakCard } from "@/components/StreakCard";
import { useTasks }  from "@/context/TasksContext";

export default function TasksPage() {
  // Read tasks and toggleTask from shared context instead of local useState.
  // Changes made here are instantly reflected on the Dashboard's compliance wheel.
  const { tasks, toggleTask, completedCount, totalCount, compliancePercent, streak } = useTasks();

  const allDone = completedCount === totalCount;

  // Group tasks by category so we can render them in sections
  const categories = [...new Set(tasks.map((t) => t.category))];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
        <p className="text-sm text-[#9A9080]">{today}</p>
        <h1
          className="text-2xl text-[#F4EEE4] mt-1 tracking-wide"
          style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
        >
          Today&apos;s Reckoning
        </h1>

        {/* Compliance summary line */}
        <p className="text-sm text-[#9A9080] mt-1">
          <span className="font-semibold text-[#DDD5C0]">{completedCount}</span> of{" "}
          <span className="font-semibold text-[#DDD5C0]">{totalCount}</span> complete
          {" · "}
          <span
            className={`font-semibold ${
              compliancePercent >= 70 ? "text-[#B8933A]" : "text-[#7A1E1E]"
            }`}
          >
            {compliancePercent}%
          </span>
        </p>

        {/* Thin progress bar */}
        <div className="mt-3 h-1.5 bg-[#252525] rounded overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-500 ${
              compliancePercent >= 70 ? "bg-[#B8933A]" : "bg-[#7A1E1E]"
            }`}
            style={{ width: `${compliancePercent}%` }}
          />
        </div>
      </header>

      {/* ── Task sections ────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Show a completion banner when everything is done */}
        {allDone && (
          <div className="bg-[#141414] border border-[#B8933A] rounded p-4 text-center">
            <p
              className="text-[#B8933A] text-sm"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Faithful today. Now do it again tomorrow.
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
              className="bg-[#141414] rounded px-5 border border-[#252525]"
            >
              {/* Category header row */}
              <div className="flex items-center justify-between py-3 border-b border-[#252525]">
                <p
                  className="text-xs uppercase tracking-widest text-[#9A9080]"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {category}
                </p>
                <p className="text-xs text-[#9A9080]">
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

        <StreakCard streak={streak} />

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
