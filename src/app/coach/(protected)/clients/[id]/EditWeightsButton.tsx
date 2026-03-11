"use client";

// ─────────────────────────────────────────────
// EditWeightsButton
//
// Inline edit for Current Weight and Goal Weight on the coach client detail page.
// Coaches use this after weigh-ins or when a client adjusts their goal.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientWeights } from "./actions";

export function EditWeightsButton({
  goalId,
  currentWeight,
  goalWeight,
}: {
  goalId:        string;
  currentWeight: number | null;
  goalWeight:    number | null;
}) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [current, setCurrent] = useState(currentWeight?.toString() ?? "");
  const [goal,    setGoal]    = useState(goalWeight?.toString()    ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSave() {
    setError("");
    const cw = current ? parseFloat(current) : null;
    const gw = goal    ? parseFloat(goal)    : null;

    if (current && (isNaN(cw!) || cw! < 50 || cw! > 600)) {
      setError("Current weight must be 50–600 lbs");
      return;
    }
    if (goal && (isNaN(gw!) || gw! < 50 || gw! > 600)) {
      setError("Goal weight must be 50–600 lbs");
      return;
    }

    setLoading(true);
    const result = await updateClientWeights(goalId, { currentWeight: cw, goalWeight: gw });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
      >
        Edit weights
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Current Weight (lbs)</label>
          <input
            type="number"
            inputMode="decimal"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="215"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Goal Weight (lbs)</label>
          <input
            type="number"
            inputMode="decimal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="200"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          disabled={loading}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
