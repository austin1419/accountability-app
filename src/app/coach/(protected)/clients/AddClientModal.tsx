"use client";

// ─────────────────────────────────────────────
// AddClientModal
//
// Renders the "+ Add Client" button and modal on the coach clients page.
// Creates a new public.users row + first goal in one operation.
// On success, calls router.refresh() so the server component re-fetches
// and the new client appears in the table.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientWithInvite } from "./actions";

type FormState = {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string;
  goalName:       string;
  goalDate:       string;
  startingWeight: string;
};

const EMPTY: FormState = {
  firstName:      "",
  lastName:       "",
  email:          "",
  phone:          "",
  goalName:       "",
  goalDate:       "",
  startingWeight: "",
};

export function AddClientModal() {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [errors,  setErrors]  = useState<Partial<FormState> & { submit?: string }>({});

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleClose() {
    setOpen(false);
    setForm(EMPTY);
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newErrors: typeof errors = {};
    if (!form.firstName.trim()) newErrors.firstName = "Required";
    if (!form.lastName.trim())  newErrors.lastName  = "Required";
    if (!form.email.trim())     newErrors.email     = "Required";
    if (!form.goalName.trim())  newErrors.goalName  = "Required";
    if (!form.goalDate)         newErrors.goalDate  = "Required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const weight = form.startingWeight ? parseFloat(form.startingWeight) : null;
    if (form.startingWeight && (isNaN(weight!) || weight! < 50 || weight! > 600)) {
      setErrors({ startingWeight: "Enter a valid weight (50–600 lbs)" });
      return;
    }

    setLoading(true);
    const result = await createClientWithInvite({
      firstName:      form.firstName.trim(),
      lastName:       form.lastName.trim(),
      email:          form.email.trim(),
      phone:          form.phone.trim() || null,
      goalName:       form.goalName.trim(),
      goalDate:       form.goalDate,
      startingWeight: weight,
    });
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
        <span className="text-sm leading-none">+</span> Add Client
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-gray-900">Add Client</h2>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Jane"
                    className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      errors.firstName ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Smith"
                    className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      errors.lastName ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@example.com"
                  className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errors.email ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">First Goal</p>
              </div>

              {/* Goal name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Goal <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.goalName}
                  onChange={(e) => set("goalName", e.target.value)}
                  placeholder="Lose 30 lbs by summer"
                  className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    errors.goalName ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errors.goalName && <p className="text-xs text-red-500 mt-1">{errors.goalName}</p>}
              </div>

              {/* Goal date + starting weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Target Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.goalDate}
                    onChange={(e) => set("goalDate", e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      errors.goalDate ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errors.goalDate && <p className="text-xs text-red-500 mt-1">{errors.goalDate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Starting Weight <span className="text-gray-400 font-normal">(lbs, optional)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.startingWeight}
                    onChange={(e) => set("startingWeight", e.target.value)}
                    placeholder="215"
                    className={`w-full border rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      errors.startingWeight ? "border-red-300 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {errors.startingWeight && <p className="text-xs text-red-500 mt-1">{errors.startingWeight}</p>}
                </div>
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
                  {loading ? "Creating & sending invite…" : "Add Client & Send Invite"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
