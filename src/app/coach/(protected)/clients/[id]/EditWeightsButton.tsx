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

  const fieldCls = "w-full border border-[#252525] rounded px-2.5 py-1.5 text-sm text-[#DDD5C0] bg-[#0D0D0D] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#B8933A] hover:text-[#C9A44A] font-medium border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-2.5 py-1 rounded cursor-pointer transition-all duration-150"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Edit metrics
      </button>
    );
  }

  return (
    <div className="mt-3 p-3 bg-[#1A1A1A] rounded border border-[#252525] space-y-3">

      {goalCategory === "weight" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Current Weight (lbs)</label>
            <input type="number" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="215" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Weight (lbs)</label>
            <input type="number" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="200" className={fieldCls} />
          </div>
        </div>
      )}

      {goalCategory === "body_composition" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Current Body Fat %</label>
              <input type="number" inputMode="decimal" value={currentBf} onChange={(e) => setCurrentBf(e.target.value)} placeholder="25.0" className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Body Fat %</label>
              <input type="number" inputMode="decimal" value={goalBf} onChange={(e) => setGoalBf(e.target.value)} placeholder="20.0" className={fieldCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Current SMM (lbs)</label>
              <input type="number" inputMode="decimal" value={currentSmm} onChange={(e) => setCurrentSmm(e.target.value)} placeholder="78.0" className={fieldCls} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal SMM (lbs)</label>
              <input type="number" inputMode="decimal" value={goalSmm} onChange={(e) => setGoalSmm(e.target.value)} placeholder="82.0" className={fieldCls} />
            </div>
          </div>
        </div>
      )}

      {goalCategory === "performance" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Current Value</label>
            <input type="number" inputMode="decimal" value={currentPerf} onChange={(e) => setCurrentPerf(e.target.value)} placeholder="135" className={fieldCls} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#9A9080] mb-1" style={{ fontFamily: "'Cinzel', serif" }}>Goal Value</label>
            <input type="number" inputMode="decimal" value={goalPerf} onChange={(e) => setGoalPerf(e.target.value)} placeholder="225" className={fieldCls} />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-xs font-semibold bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-60 text-[#0D0D0D] px-3 py-1.5 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          disabled={loading}
          className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#252525] px-2.5 py-1 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}
