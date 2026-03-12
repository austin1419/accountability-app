"use client";

// ─────────────────────────────────────────────
// EditWeightsButton (category-aware)
//
// Inline metric editor on the coach client detail page.
// Shows different fields depending on the goal category:
//   weight          → current weight + goal weight
//   body_composition → current/goal BF% + current/goal SMM
//   performance     → current value + goal value
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClientGoalMetrics } from "./actions";

type Props = {
  goalId:       string;
  goalCategory: string;
  // Weight
  currentWeight: number | null;
  goalWeight:    number | null;
  // Body composition
  currentBodyFat: number | null;
  goalBodyFat:    number | null;
  currentSmm:     number | null;
  goalSmm:        number | null;
  // Performance
  currentPerformanceValue: number | null;
  goalPerformanceValue:    number | null;
};

export function EditWeightsButton(props: Props) {
  const { goalId, goalCategory } = props;
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Weight
  const [current, setCurrent] = useState(props.currentWeight?.toString() ?? "");
  const [goal,    setGoal]    = useState(props.goalWeight?.toString()    ?? "");

  // Body composition
  const [currentBf,  setCurrentBf]  = useState(props.currentBodyFat?.toString() ?? "");
  const [goalBf,     setGoalBf]     = useState(props.goalBodyFat?.toString()    ?? "");
  const [currentSmm, setCurrentSmm] = useState(props.currentSmm?.toString()    ?? "");
  const [goalSmm,    setGoalSmm]    = useState(props.goalSmm?.toString()        ?? "");

  // Performance
  const [currentPerf, setCurrentPerf] = useState(props.currentPerformanceValue?.toString() ?? "");
  const [goalPerf,    setGoalPerf]    = useState(props.goalPerformanceValue?.toString()    ?? "");

  function pn(s: string): number | null {
    if (!s.trim()) return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }

  async function handleSave() {
    setError("");

    let patch: Parameters<typeof updateClientGoalMetrics>[1] = {};

    if (goalCategory === "body_composition") {
      patch = {
        current_body_fat: pn(currentBf),
        goal_body_fat:    pn(goalBf),
        current_smm:      pn(currentSmm),
        goal_smm:         pn(goalSmm),
      };
    } else if (goalCategory === "performance") {
      patch = {
        current_performance_value: pn(currentPerf),
        goal_performance_value:    pn(goalPerf),
      };
    } else {
      patch = {
        current_weight: pn(current),
        goal_weight:    pn(goal),
      };
    }

    setLoading(true);
    const result = await updateClientGoalMetrics(goalId, patch);
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    setOpen(false);
    router.refresh();
  }

  const fieldCls = "w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
      >
        Edit metrics
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-3">

      {goalCategory === "weight" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Weight (lbs)</label>
            <input type="number" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="215" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Goal Weight (lbs)</label>
            <input type="number" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="200" className={fieldCls} />
          </div>
        </div>
      )}

      {goalCategory === "body_composition" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Current Body Fat %</label>
              <input type="number" inputMode="decimal" value={currentBf} onChange={(e) => setCurrentBf(e.target.value)} placeholder="25.0" className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Goal Body Fat %</label>
              <input type="number" inputMode="decimal" value={goalBf} onChange={(e) => setGoalBf(e.target.value)} placeholder="20.0" className={fieldCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Current SMM (lbs)</label>
              <input type="number" inputMode="decimal" value={currentSmm} onChange={(e) => setCurrentSmm(e.target.value)} placeholder="78.0" className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Goal SMM (lbs)</label>
              <input type="number" inputMode="decimal" value={goalSmm} onChange={(e) => setGoalSmm(e.target.value)} placeholder="82.0" className={fieldCls} />
            </div>
          </div>
        </div>
      )}

      {goalCategory === "performance" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Value</label>
            <input type="number" inputMode="decimal" value={currentPerf} onChange={(e) => setCurrentPerf(e.target.value)} placeholder="135" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Goal Value</label>
            <input type="number" inputMode="decimal" value={goalPerf} onChange={(e) => setGoalPerf(e.target.value)} placeholder="225" className={fieldCls} />
          </div>
        </div>
      )}

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
