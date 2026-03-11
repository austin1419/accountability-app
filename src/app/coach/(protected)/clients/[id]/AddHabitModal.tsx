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
        className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl transition-colors"
      >
        <span className="text-sm leading-none">+</span> Add Habit
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Add Habit</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as Category }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Habit text */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
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
                  className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errors.taskName ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errors.taskName && (
                  <p className="text-xs text-red-500 mt-1">{errors.taskName}</p>
                )}
              </div>

              {/* Submit error */}
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
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
