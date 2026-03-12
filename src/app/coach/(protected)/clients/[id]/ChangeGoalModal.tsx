"use client";

// ─────────────────────────────────────────────
// ChangeGoalModal
//
// 3-step modal for replacing a client's active goal:
//   Step 1 — Reason for change (required)
//   Step 2 — New goal name, category, target date
//   Step 3 — Category-specific starting/goal metrics (all optional)
//
// On submit, calls changeClientGoal() server action then router.refresh()
// so the server component re-fetches and the goal card updates immediately.
// ─────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeClientGoal, type NewGoalData } from "./actions";

type Step = 1 | 2 | 3;
type Category = "weight" | "body_composition" | "performance";

const STEP_TITLES: Record<Step, string> = {
  1: "Reason for Change",
  2: "New Goal Details",
  3: "Starting Metrics",
};

const INPUT_BASE =
  "w-full border rounded bg-[#1A1A1A] px-3 py-2 text-sm text-[#DDD5C0] placeholder:text-[#807868] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A]";
const LABEL_BASE =
  "block text-xs uppercase tracking-wider text-[#9A9080] mb-1";

export function ChangeGoalModal({
  clientId,
  clientName,
}: {
  clientId:   string;
  clientName: string;
}) {
  const router = useRouter();

  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [reason,      setReason]      = useState("");
  const [reasonError, setReasonError] = useState("");

  // Step 2 — shared
  const [goalName,      setGoalName]      = useState("");
  const [goalNameError, setGoalNameError] = useState("");
  const [category,      setCategory]      = useState<Category>("weight");
  const [goalDate,      setGoalDate]      = useState("");

  // Step 3 — weight
  const [startWeight, setStartWeight] = useState("");
  const [goalWeight,  setGoalWeight]  = useState("");

  // Step 3 — body composition
  const [startBF,  setStartBF]  = useState("");
  const [goalBF,   setGoalBF]   = useState("");
  const [startSMM, setStartSMM] = useState("");
  const [goalSMM,  setGoalSMM]  = useState("");

  // Step 3 — performance
  const [metricName,      setMetricName]      = useState("");
  const [metricUnit,      setMetricUnit]      = useState("");
  const [metricDirection, setMetricDirection] = useState("Higher is better");
  const [startPerf,       setStartPerf]       = useState("");
  const [goalPerf,        setGoalPerf]        = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);

  function reset() {
    setStep(1);
    setReason(""); setReasonError("");
    setGoalName(""); setGoalNameError(""); setCategory("weight"); setGoalDate("");
    setStartWeight(""); setGoalWeight("");
    setStartBF(""); setGoalBF(""); setStartSMM(""); setGoalSMM("");
    setMetricName(""); setMetricUnit(""); setMetricDirection("Higher is better");
    setStartPerf(""); setGoalPerf("");
    setSubmitError(null);
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function toNum(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }

  function handleNextFromStep1() {
    if (!reason.trim()) {
      setReasonError("A reason is required.");
      return;
    }
    setReasonError("");
    setStep(2);
  }

  function handleNextFromStep2() {
    if (!goalName.trim()) {
      setGoalNameError("Goal name is required.");
      return;
    }
    setGoalNameError("");
    setStep(3);
  }

  async function handleSubmit() {
    setLoading(true);
    setSubmitError(null);

    const shared = {
      goal_name: goalName.trim(),
      goal_date: goalDate || null,
    };

    let newGoalData: NewGoalData;

    if (category === "weight") {
      newGoalData = {
        goal_category: "weight",
        ...shared,
        start_weight: toNum(startWeight),
        goal_weight:  toNum(goalWeight),
      };
    } else if (category === "body_composition") {
      newGoalData = {
        goal_category:    "body_composition",
        ...shared,
        starting_body_fat: toNum(startBF),
        goal_body_fat:     toNum(goalBF),
        starting_smm:      toNum(startSMM),
        goal_smm:          toNum(goalSMM),
      };
    } else {
      newGoalData = {
        goal_category:               "performance",
        ...shared,
        performance_metric_name:     metricName.trim() || null,
        performance_unit:            metricUnit.trim() || null,
        performance_direction:       metricDirection || null,
        starting_performance_value:  toNum(startPerf),
        goal_performance_value:      toNum(goalPerf),
      };
    }

    const result = await changeClientGoal(clientId, reason.trim(), newGoalData);
    setLoading(false);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    handleClose();
    router.refresh();
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#9A9080] hover:text-[#C9A44A] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-3 py-1.5 rounded cursor-pointer transition-all duration-150"
        style={{ fontFamily: "'Cinzel', serif" }}
      >
        Change Goal
      </button>

      {/* Modal */}
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
              <div>
                <h2
                  className="text-base text-[#F4EEE4]"
                  style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
                >
                  Change Goal
                </h2>
                <p className="text-xs text-[#9A9080] mt-0.5">
                  Step {step} of 3 · {STEP_TITLES[step]}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-[#9A9080] hover:text-[#DDD5C0] text-xl leading-none cursor-pointer transition-colors duration-150"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* ── Step 1: Reason ─────────────────────── */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-5">
                <p className="text-sm text-[#9A9080]">
                  You are changing the active goal for{" "}
                  <strong className="text-[#DDD5C0] font-medium">{clientName}</strong>.
                  The current goal will be closed and a new one created.
                </p>

                <div>
                  <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>
                    Reason for change <span className="text-[#7A1E1E]">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                    placeholder="e.g. Completed weight loss phase, moving to body recomposition"
                    rows={3}
                    className={`${INPUT_BASE} resize-none ${reasonError ? "border-[#7A1E1E]" : "border-[#252525]"}`}
                  />
                  {reasonError && <p className="text-xs text-[#7A1E1E] mt-1">{reasonError}</p>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-4 py-2 rounded cursor-pointer transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleNextFromStep1}
                    className="bg-[#B8933A] hover:bg-[#C9A44A] text-[#0D0D0D] text-xs font-semibold px-5 py-2 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Goal details ────────────────── */}
            {step === 2 && (
              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>
                    Goal name <span className="text-[#7A1E1E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => { setGoalName(e.target.value); setGoalNameError(""); }}
                    placeholder="e.g. Body Recomposition 2026"
                    className={`${INPUT_BASE} ${goalNameError ? "border-[#7A1E1E]" : "border-[#252525]"}`}
                  />
                  {goalNameError && <p className="text-xs text-[#7A1E1E] mt-1">{goalNameError}</p>}
                </div>

                <div>
                  <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className={`${INPUT_BASE} border-[#252525] cursor-pointer`}
                  >
                    <option value="weight">Weight</option>
                    <option value="body_composition">Body Composition</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>

                <div>
                  <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>
                    Target date{" "}
                    <span className="text-[#807868] font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                    className={`${INPUT_BASE} border-[#252525]`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-4 py-2 rounded cursor-pointer transition-all duration-150"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextFromStep2}
                    className="bg-[#B8933A] hover:bg-[#C9A44A] text-[#0D0D0D] text-xs font-semibold px-5 py-2 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Metrics ─────────────────────── */}
            {step === 3 && (
              <div className="px-6 py-5 space-y-5">
                <p className="text-xs text-[#9A9080]">
                  All fields are optional — you can update them later from the goal card.
                </p>

                {/* Weight */}
                {category === "weight" && (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Starting weight (lbs)", val: startWeight, set: setStartWeight },
                      { label: "Goal weight (lbs)",     val: goalWeight,  set: setGoalWeight  },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>{label}</label>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder="—"
                          className={`${INPUT_BASE} border-[#252525]`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Body composition */}
                {category === "body_composition" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Starting BF%", val: startBF, set: setStartBF },
                        { label: "Goal BF%",     val: goalBF,  set: setGoalBF  },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>{label}</label>
                          <input
                            type="number"
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            placeholder="—"
                            className={`${INPUT_BASE} border-[#252525]`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Starting SMM (lbs)", val: startSMM, set: setStartSMM },
                        { label: "Goal SMM (lbs)",     val: goalSMM,  set: setGoalSMM  },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>{label}</label>
                          <input
                            type="number"
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            placeholder="—"
                            className={`${INPUT_BASE} border-[#252525]`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance */}
                {category === "performance" && (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>Metric name</label>
                      <input
                        type="text"
                        value={metricName}
                        onChange={(e) => setMetricName(e.target.value)}
                        placeholder="e.g. Deadlift, Mile time"
                        className={`${INPUT_BASE} border-[#252525]`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>Unit</label>
                        <input
                          type="text"
                          value={metricUnit}
                          onChange={(e) => setMetricUnit(e.target.value)}
                          placeholder="lbs, min, reps…"
                          className={`${INPUT_BASE} border-[#252525]`}
                        />
                      </div>
                      <div>
                        <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>Direction</label>
                        <select
                          value={metricDirection}
                          onChange={(e) => setMetricDirection(e.target.value)}
                          className={`${INPUT_BASE} border-[#252525] cursor-pointer`}
                        >
                          <option value="Higher is better">Higher is better</option>
                          <option value="Lower is better">Lower is better</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Starting value", val: startPerf, set: setStartPerf },
                        { label: "Goal value",     val: goalPerf,  set: setGoalPerf  },
                      ].map(({ label, val, set }) => (
                        <div key={label}>
                          <label className={LABEL_BASE} style={{ fontFamily: "'Cinzel', serif" }}>{label}</label>
                          <input
                            type="number"
                            value={val}
                            onChange={(e) => set(e.target.value)}
                            placeholder="—"
                            className={`${INPUT_BASE} border-[#252525]`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submitError && <p className="text-xs text-[#7A1E1E]">{submitError}</p>}

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="text-xs text-[#9A9080] hover:text-[#DDD5C0] border border-[#252525] hover:border-[#C9A44A] hover:bg-[#1A1A1A] px-4 py-2 rounded cursor-pointer transition-all duration-150 disabled:opacity-50"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-60 text-[#0D0D0D] text-xs font-semibold px-5 py-2 rounded border border-[#B8933A] cursor-pointer transition-all duration-150 uppercase tracking-widest"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {loading ? "Saving…" : "Change Goal"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
