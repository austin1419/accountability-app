"use client";
// ↑ Still needed — this page calls useTasks() which is a React hook.

import { TaskItem }      from "@/components/TaskItem";
import { BottomNav }     from "@/components/BottomNav";
import { StreakCard }     from "@/components/StreakCard";
import { EditingBanner } from "@/components/EditingBanner";
import { DateHeader }    from "@/components/DateHeader";
import { useTasks }      from "@/context/TasksContext";
import { useDate }       from "@/context/DateContext";

const CATEGORY_LABELS: Record<string, string> = {
  Activity:         "Labor",
  Nutrition:        "Nourish",
  "Sleep/Recovery": "Sabbath",
  Supplements:      "Tend",
};

const CATEGORY_ORDER = ["Activity", "Nutrition", "Supplements", "Sleep/Recovery"];

export default function TasksPage() {
  const { tasks, toggleTask, completedCount, totalCount, compliancePercent, streak } = useTasks();
  const { selectedDate, isViewingPast, isEditable } = useDate();
  const canEdit = isEditable(selectedDate);

  const allDone = completedCount === totalCount;

  // Group tasks by category, sorted by CATEGORY_ORDER
  const categorySet = new Set(tasks.map((t) => t.category));
  const categories = [
    ...CATEGORY_ORDER.filter((c) => categorySet.has(c)),
    ...[...categorySet].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
        <h1
          className="text-2xl text-[#F4EEE4] tracking-wide"
          style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
        >
          {isViewingPast ? "Past Reckoning" : "Today\u2019s Reckoning"}
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

      {/* Compact date slider */}
      <DateHeader variant="compact" />

      <EditingBanner />

      {/* ── Task sections ────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Show a completion banner when everything is done */}
        {allDone && (
          <div className={`bg-[#141414] border rounded p-4 text-center ${totalCount === 0 ? "border-[#252525]" : "border-[#B8933A]"}`}>
            <p
              className={`text-sm ${totalCount === 0 ? "text-[#807868]" : "text-[#B8933A]"}`}
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {totalCount === 0 ? "Begin your habits to start your streak." : "Faithful today. Now do it again tomorrow."}
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
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <p className="text-xs text-[#9A9080]">
                  {catDone}/{categoryTasks.length}
                </p>
              </div>

              {/* Tasks in this category — onToggle makes them interactive */}
              <ul>
                {categoryTasks.map((task) => (
                  <TaskItem key={task.id} task={task} onToggle={canEdit ? toggleTask : undefined} />
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
