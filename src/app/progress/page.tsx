"use client";

import { useState, useEffect } from "react";
import type { WeightEntry } from "@/lib/mockData";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";
import {
  fetchGoalData,
  updateCurrentWeight,
  fetchWeightLog,
  insertWeightLog,
  fetchProgressLog,
  insertProgressLog,
  updateCurrentMetrics,
} from "@/lib/queries";

// ─────────────────────────────────────────────
// Generic SVG line chart — works for any numeric series
// ─────────────────────────────────────────────
function MetricChart({
  data,
  goalValue,
  goalLabel,
  color = "#3b82f6",
}: {
  data:       { date: string; value: number }[];
  goalValue?: number | null;
  goalLabel?: string;
  color?:     string;
}) {
  if (data.length < 2) return null;

  const SVG_W  = 300;
  const SVG_H  = 130;
  const PAD_L  = 10;
  const PAD_R  = 10;
  const PAD_T  = 12;
  const PAD_B  = 28;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  const allVals = data.map((d) => d.value);
  const minVal  = goalValue != null ? Math.min(...allVals, goalValue) : Math.min(...allVals);
  const maxVal  = goalValue != null ? Math.max(...allVals, goalValue) : Math.max(...allVals);
  const range   = maxVal - minVal || 1;

  const toY = (v: number) => PAD_T + chartH * (1 - (v - minVal) / range);
  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * chartW;

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");

  const shortDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {goalValue != null && (
        <>
          <line
            x1={PAD_L} y1={toY(goalValue)}
            x2={SVG_W - PAD_R} y2={toY(goalValue)}
            stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8}
          />
          {goalLabel && (
            <text x={SVG_W - PAD_R} y={toY(goalValue) - 4} fontSize={9} fill="#22c55e" textAnchor="end">
              {goalLabel}
            </text>
          )}
        </>
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r={3} fill={color} />
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={9} fill="#9ca3af" textAnchor="middle">
            {shortDate(d.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// Original weight chart — keeps "week" label format from WeightEntry
function WeightChart({ data, goalWeight }: { data: WeightEntry[]; goalWeight: number }) {
  if (data.length < 2) return null;

  const SVG_W  = 300;
  const SVG_H  = 130;
  const PAD_L  = 10;
  const PAD_R  = 10;
  const PAD_T  = 12;
  const PAD_B  = 28;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  const allWeights = data.map((d) => d.weight);
  const yMin = goalWeight - 5;
  const yMax = Math.max(...allWeights) + 5;
  const yRange = yMax - yMin;

  const toY = (w: number) => PAD_T + chartH * (1 - (w - yMin) / yRange);
  const toX = (i: number) => PAD_L + (i / (data.length - 1)) * chartW;

  const points = data.map((d, i) => `${toX(i)},${toY(d.weight)}`).join(" ");
  const goalY  = toY(goalWeight);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      <line x1={PAD_L} y1={goalY} x2={SVG_W - PAD_R} y2={goalY}
        stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <text x={SVG_W - PAD_R} y={goalY - 4} fontSize={9} fill="#22c55e" textAnchor="end">
        Goal {goalWeight} lbs
      </text>
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.weight)} r={3} fill="#3b82f6" />
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={9} fill="#9ca3af" textAnchor="middle">
            {d.week}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Progress Page
// ─────────────────────────────────────────────
export default function ProgressPage() {
  const [userId,      setUserId]      = useState<string | null>(null);
  const [goalId,      setGoalId]      = useState<string | null>(null);
  const [weightLog,   setWeightLog]   = useState<WeightEntry[]>([]);
  const [progressLog, setProgressLog] = useState<{
    logged_at:         string;
    body_fat:          number | null;
    smm:               number | null;
    performance_value: number | null;
  }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error,    setError]    = useState("");

  // Weight input
  const [weightInput, setWeightInput] = useState("");

  // Body comp inputs
  const [bfInput,  setBfInput]  = useState("");
  const [smmInput, setSmmInput] = useState("");

  // Performance input
  const [perfInput, setPerfInput] = useState("");

  const [goalData, setGoalData] = useState<{
    id:                       string;
    goal_name:                string | null;
    goal_category:            string;
    start_weight:             number | null;
    goal_weight:              number | null;
    current_weight:           number | null;
    starting_body_fat:        number | null;
    current_body_fat:         number | null;
    goal_body_fat:            number | null;
    starting_smm:             number | null;
    current_smm:              number | null;
    goal_smm:                 number | null;
    performance_metric_name:  string | null;
    performance_unit:         string | null;
    performance_direction:    string | null;
    starting_performance_value: number | null;
    current_performance_value:  number | null;
    goal_performance_value:     number | null;
  } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!profile) return;
      setUserId(profile.id);

      const data = await fetchGoalData(profile.id);
      if (data) {
        setGoalData(data as typeof goalData);
        setGoalId(data.id);

        if (data.goal_category === "weight") {
          fetchWeightLog(profile.id).then(setWeightLog);
        } else {
          fetchProgressLog(profile.id, data.id).then(setProgressLog);
        }
      }
    }
    init();
  }, []);

  const category = goalData?.goal_category ?? "weight";

  // ── Weight handlers ───────────────────────────
  async function handleLogWeight() {
    if (!userId) return;
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 50 || w > 500) { setError("Enter a valid weight between 50 and 500 lbs."); return; }
    const r1 = await insertWeightLog(userId, w);
    if (r1.error) { setError(r1.error); return; }
    const r2 = await updateCurrentWeight(userId, w);
    if (r2.error) { setError(r2.error); return; }
    const label = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setWeightLog((prev) => [...prev, { week: label, weight: w }]);
    setGoalData((prev) => prev ? { ...prev, current_weight: w } : prev);
    setWeightInput("");
    setError("");
    setShowForm(false);
  }

  // ── Body comp handlers ────────────────────────
  async function handleLogBodyComp() {
    if (!userId || !goalId) return;
    const bf  = bfInput.trim()  ? parseFloat(bfInput)  : null;
    const smm = smmInput.trim() ? parseFloat(smmInput) : null;
    if (bf === null && smm === null) { setError("Enter at least one value."); return; }
    if (bf  != null && (isNaN(bf)  || bf  < 1 || bf  > 60)) { setError("Body fat % must be 1–60."); return; }
    if (smm != null && (isNaN(smm) || smm < 30 || smm > 300)) { setError("SMM must be 30–300 lbs."); return; }

    const patch: { body_fat?: number | null; smm?: number | null } = {};
    if (bf  != null) patch.body_fat = bf;
    if (smm != null) patch.smm      = smm;
    const r1 = await insertProgressLog(userId, goalId, patch);
    if (r1.error) { setError(r1.error); return; }
    const r2 = await updateCurrentMetrics(userId, {
      current_body_fat: bf  ?? undefined,
      current_smm:      smm ?? undefined,
    });
    if (r2.error) { setError(r2.error); return; }

    const today  = new Date().toISOString().split("T")[0];
    const logObj = { logged_at: today, body_fat: bf, smm, performance_value: null };
    setProgressLog((prev) => {
      const without = prev.filter((e) => e.logged_at !== today);
      return [...without, logObj].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    });
    setGoalData((prev) => prev ? { ...prev, current_body_fat: bf ?? prev.current_body_fat, current_smm: smm ?? prev.current_smm } : prev);
    setBfInput("");
    setSmmInput("");
    setError("");
    setShowForm(false);
  }

  // ── Performance handlers ──────────────────────
  async function handleLogPerformance() {
    if (!userId || !goalId) return;
    const v = parseFloat(perfInput);
    if (isNaN(v)) { setError("Enter a valid number."); return; }

    const r1 = await insertProgressLog(userId, goalId, { performance_value: v });
    if (r1.error) { setError(r1.error); return; }
    const r2 = await updateCurrentMetrics(userId, { current_performance_value: v });
    if (r2.error) { setError(r2.error); return; }

    const today  = new Date().toISOString().split("T")[0];
    const logObj = { logged_at: today, body_fat: null, smm: null, performance_value: v };
    setProgressLog((prev) => {
      const without = prev.filter((e) => e.logged_at !== today);
      return [...without, logObj].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    });
    setGoalData((prev) => prev ? { ...prev, current_performance_value: v } : prev);
    setPerfInput("");
    setError("");
    setShowForm(false);
  }

  const inputCls = "flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400";
  const saveBtnCls = "w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl py-2 transition-colors";

  // ─────────────────────────────────────────────
  // WEIGHT VIEW
  // ─────────────────────────────────────────────
  if (category === "weight") {
    const startWeight   = goalData?.start_weight   ?? 240;
    const goalWeight    = goalData?.goal_weight     ?? 190;
    const currentWeight = goalData?.current_weight  ?? weightLog[weightLog.length - 1]?.weight ?? 0;
    const lostSoFar     = startWeight - currentWeight;
    const stillToGo     = currentWeight - goalWeight;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
        <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-sm text-gray-400 mt-1">Weekly weight tracking</p>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <section className="grid grid-cols-3 gap-3">
            {[
              { label: "Current", value: `${currentWeight} lbs`, color: "text-gray-900" },
              { label: "Lost",    value: `${lostSoFar} lbs`,     color: "text-blue-600" },
              { label: "To go",   value: `${stillToGo} lbs`,     color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </section>
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Weight Trend</p>
              <span className="text-xs text-gray-400">Goal: {goalWeight} lbs</span>
            </div>
            <WeightChart data={weightLog} goalWeight={goalWeight} />
          </section>
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Log Weight</p>
              <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-blue-500 hover:text-blue-600">
                {showForm ? "Cancel" : "+ Add entry"}
              </button>
            </div>
            {showForm && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" placeholder="e.g. 215" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className={inputCls} />
                  <span className="flex items-center text-sm text-gray-400 pr-1">lbs</span>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleLogWeight} className={saveBtnCls}>Save</button>
              </div>
            )}
          </section>
          <section className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 py-4 border-b border-gray-50">Weight Log</p>
            <ul>
              {[...weightLog].reverse().map((entry, i) => {
                const prevIndex = weightLog.length - 1 - i - 1;
                const prev      = weightLog[prevIndex];
                const change    = prev ? entry.weight - prev.weight : null;
                return (
                  <li key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{entry.week}</span>
                    <div className="flex items-center gap-3">
                      {change !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${change < 0 ? "bg-green-50 text-green-600" : change > 0 ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"}`}>
                          {change > 0 ? "+" : ""}{change} lbs
                        </span>
                      )}
                      <span className="text-sm font-semibold text-gray-800">{entry.weight} lbs</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // BODY COMPOSITION VIEW
  // ─────────────────────────────────────────────
  if (category === "body_composition") {
    const bfSeries   = progressLog.filter((e) => e.body_fat != null).map((e) => ({ date: e.logged_at, value: e.body_fat! }));
    const smmSeries  = progressLog.filter((e) => e.smm     != null).map((e) => ({ date: e.logged_at, value: e.smm!     }));

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
        <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
          <p className="text-sm text-gray-400 mt-1">Body composition tracking</p>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Stats */}
          <section className="grid grid-cols-2 gap-3">
            {[
              { label: "Body Fat", value: goalData?.current_body_fat != null ? `${goalData.current_body_fat}%` : "—",    sub: goalData?.goal_body_fat != null ? `Goal: ${goalData.goal_body_fat}%` : undefined },
              { label: "SMM",      value: goalData?.current_smm      != null ? `${goalData.current_smm} lbs` : "—",      sub: goalData?.goal_smm      != null ? `Goal: ${goalData.goal_smm} lbs` : undefined },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
                <p className="text-lg font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                {s.sub && <p className="text-xs text-gray-300 mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </section>

          {/* Body fat chart */}
          {bfSeries.length >= 2 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Body Fat Trend</p>
              <MetricChart
                data={bfSeries}
                goalValue={goalData?.goal_body_fat}
                goalLabel={goalData?.goal_body_fat != null ? `Goal ${goalData.goal_body_fat}%` : undefined}
                color="#8b5cf6"
              />
            </section>
          )}

          {/* SMM chart */}
          {smmSeries.length >= 2 && (
            <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Muscle (SMM) Trend</p>
              <MetricChart
                data={smmSeries}
                goalValue={goalData?.goal_smm}
                goalLabel={goalData?.goal_smm != null ? `Goal ${goalData.goal_smm} lbs` : undefined}
                color="#3b82f6"
              />
            </section>
          )}

          {/* Log entry */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Log Measurements</p>
              <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-blue-500 hover:text-blue-600">
                {showForm ? "Cancel" : "+ Add entry"}
              </button>
            </div>
            {showForm && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Body Fat %</label>
                    <input type="number" inputMode="decimal" placeholder="25.0" value={bfInput} onChange={(e) => setBfInput(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SMM (lbs)</label>
                    <input type="number" inputMode="decimal" placeholder="78.0" value={smmInput} onChange={(e) => setSmmInput(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button onClick={handleLogBodyComp} className={saveBtnCls}>Save</button>
              </div>
            )}
          </section>

          {/* History log */}
          <section className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 py-4 border-b border-gray-50">History</p>
            <ul>
              {[...progressLog].reverse().map((entry, i) => (
                <li key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-800">
                    {entry.body_fat != null && <span>{entry.body_fat}%</span>}
                    {entry.smm      != null && <span>{entry.smm} lbs SMM</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
        <BottomNav />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // PERFORMANCE VIEW
  // ─────────────────────────────────────────────
  const perfSeries = progressLog.filter((e) => e.performance_value != null).map((e) => ({ date: e.logged_at, value: e.performance_value! }));
  const metricName = goalData?.performance_metric_name ?? "Performance";
  const unitLabel  = goalData?.performance_unit ?? "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-gray-400 mt-1">{metricName} tracking</p>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Stats */}
        {(() => {
          const dir     = goalData?.performance_direction ?? "increase";
          const start   = goalData?.starting_performance_value ?? null;
          const current = goalData?.current_performance_value  ?? null;
          const goal    = goalData?.goal_performance_value     ?? null;
          const improved = (start != null && current != null)
            ? (dir === "increase" ? current - start : start - current)
            : null;
          const toGoal = (goal != null && current != null)
            ? (dir === "increase" ? goal - current : current - goal)
            : null;
          const fmt = (v: number | null) =>
            v != null ? `${v}${unitLabel ? ` ${unitLabel}` : ""}` : "—";
          return (
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: "Current",  value: fmt(current)  },
                { label: "Improved", value: improved != null ? `+${improved}${unitLabel ? ` ${unitLabel}` : ""}` : "—" },
                { label: "To Goal",  value: fmt(toGoal)   },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </section>
          );
        })()}

        {/* Chart */}
        {perfSeries.length >= 2 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{metricName} Trend</p>
              {unitLabel && <span className="text-xs text-gray-400">{unitLabel}</span>}
            </div>
            <MetricChart
              data={perfSeries}
              goalValue={goalData?.goal_performance_value}
              goalLabel={goalData?.goal_performance_value != null ? `Goal ${goalData.goal_performance_value}${unitLabel ? ` ${unitLabel}` : ""}` : undefined}
              color="#f59e0b"
            />
          </section>
        )}

        {/* Log entry */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Log {metricName}</p>
            <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-blue-500 hover:text-blue-600">
              {showForm ? "Cancel" : "+ Add entry"}
            </button>
          </div>
          {showForm && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" placeholder="e.g. 185" value={perfInput} onChange={(e) => setPerfInput(e.target.value)} className={inputCls} />
                {unitLabel && <span className="flex items-center text-sm text-gray-400 pr-1">{unitLabel}</span>}
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button onClick={handleLogPerformance} className={saveBtnCls}>Save</button>
            </div>
          )}
        </section>

        {/* History log */}
        <section className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 py-4 border-b border-gray-50">History</p>
          <ul>
            {[...progressLog].reverse().map((entry, i) => (
              <li key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="text-sm font-semibold text-gray-800">
                  {entry.performance_value}{unitLabel ? ` ${unitLabel}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
