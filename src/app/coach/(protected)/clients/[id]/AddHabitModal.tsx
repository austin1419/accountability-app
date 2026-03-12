"use client";

// ─────────────────────────────────────────────
// AddHabitModal
//
// Renders the "+ Add Habit" button and modal on the coach client detail page.
// Inserts a task into the tasks table under the client's active goal.
// On success, calls router.refresh() so the server component re-fetches
// and the new habit appears in the Assigned Habits list.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addClientHabit } from "./actions";

const CATEGORIES = ["Activity", "Nutrition", "Sleep/Recovery", "Supplements"] as const;
type Category = (typeof CATEGORIES)[number];

type FormState = {
  category: Category;
  taskName: string;
};

const EMPTY: FormState = {
  category: "Activity",
  taskName: "",
};

export function AddHabitModal({ goalId }: { goalId: string }) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [errors,  setErrors]  = useState<{ taskName?: string; submit?: string }>({});

  function handleClose() {
    setOpen(false);
    setForm(EMPTY);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.taskName.trim()) {
      setErrors({ taskName: "Required" });
      return;
    }

    setLoading(true);
    const result = await addClientHabit(goalId, form.taskName.trim(), form.category);
    setLoading(false);

    if (result.error) {
      setErrors({ submit: result.error });
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#B8933A] hover:bg-[#C9A44A] text-[#0D0D0D] px-3 py-1.5 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        <span className="text-sm leading-none">+</span> Add Habit
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-[#141414] rounded border border-[#252525] w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#252525]">
              <h2 className="text-base text-[#F4EEE4]" style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>Add Habit</h2>
              <button
                onClick={handleClose}
                className="text-[#9A9080] hover:text-[#DDD5C0] text-xl leading-none cursor-pointer transition-colors duration-150"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Category */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as Category }))}
                  className="w-full border border-[#252525] rounded bg-[#1A1A1A] px-3 py-2 text-sm text-[#DDD5C0] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Habit text */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                  Habit
                </label>
                <input
                  type="text"
                  value={form.taskName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, taskName: e.target.value }));
                    setErrors((prev) => ({ ...prev, taskName: "" }));
                  }}
                  placeholder="Walk 30 minutes"
                  className={`w-full border rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] ${
                    errors.taskName ? "border-[#7A1E1E]" : "border-[#252525]"
                  }`}
                />
                {errors.taskName && (
                  <p className="text-xs text-[#7A1E1E] mt-1">{errors.taskName}</p>
                )}
              </div>

              {/* Submit error */}
              {errors.submit && (
                <p className="text-sm text-[#7A1E1E]">{errors.submit}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-4 py-2 rounded cursor-pointer transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-60 text-[#0D0D0D] text-xs font-semibold px-5 py-2 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {loading ? "Saving…" : "Add Habit"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
