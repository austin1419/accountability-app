"use client";

import { useState, useEffect } from "react";
import type { WeightEntry } from "@/lib/mockData";
import { BottomNav }     from "@/components/BottomNav";
import { EditingBanner } from "@/components/EditingBanner";
import { supabase } from "@/lib/supabase";
import { useDate } from "@/context/DateContext";
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
  color = "#B8933A",
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
            stroke="#C9A44A" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8}
          />
          {goalLabel && (
            <text x={SVG_W - PAD_R} y={toY(goalValue) - 4} fontSize={9} fill="#C9A44A" textAnchor="end">
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
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={9} fill="#807868" textAnchor="middle">
            {shortDate(d.date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Dual-line chart for body composition recomposition.
// Body Fat (crimson) and SMM (gold) share the same time axis
// but use independent Y scales — so the diverging trend
// (BF decreasing, SMM increasing) is visible regardless of units.
// ─────────────────────────────────────────────
const BF_COLOR  = "#C04040";
const SMM_COLOR = "#B89B3A";

function DualMetricChart({
  bfData,
  smmData,
  goalBf,
  goalSmm,
}: {
  bfData:  { date: string; value: number }[];
  smmData: { date: string; value: number }[];
  goalBf?:  number | null;
  goalSmm?: number | null;
}) {
  const hasBf  = bfData.length  >= 2;
  const hasSmm = smmData.length >= 2;
  if (!hasBf && !hasSmm) return null;

  const SVG_W  = 300;
  const SVG_H  = 150;
  const PAD_L  = 32;
  const PAD_R  = 32;
  const PAD_T  = 20;
  const PAD_B  = 28;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  // Unified time axis from all available dates across both series
  const allDates = [
    ...new Set([...bfData.map((d) => d.date), ...smmData.map((d) => d.date)]),
  ].sort();

  const toX = (date: string) => {
    const i = allDates.indexOf(date);
    return allDates.length <= 1 ? PAD_L : PAD_L + (i / (allDates.length - 1)) * chartW;
  };

  // BF Y scale — left axis (descending values = improvement)
  const bfVals  = [...bfData.map((d) => d.value), ...(goalBf  != null ? [goalBf]  : [])];
  const bfMin   = bfVals.length  ? Math.min(...bfVals)  : 0;
  const bfMax   = bfVals.length  ? Math.max(...bfVals)  : 1;
  const bfRange = bfMax - bfMin || 1;
  const toYBf   = (v: number) => PAD_T + chartH * (1 - (v - bfMin) / bfRange);

  // SMM Y scale — right axis (ascending values = improvement)
  const smmVals  = [...smmData.map((d) => d.value), ...(goalSmm != null ? [goalSmm] : [])];
  const smmMin   = smmVals.length ? Math.min(...smmVals) : 0;
  const smmMax   = smmVals.length ? Math.max(...smmVals) : 1;
  const smmRange = smmMax - smmMin || 1;
  const toYSmm   = (v: number) => PAD_T + chartH * (1 - (v - smmMin) / smmRange);

  const shortDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">
      {/* Legend */}
      <circle cx={PAD_L}      cy={8} r={3} fill={BF_COLOR}  />
      <text   x={PAD_L + 7}   y={12} fontSize={9} fill={BF_COLOR}>Body Fat</text>
      <circle cx={PAD_L + 58} cy={8} r={3} fill={SMM_COLOR} />
      <text   x={PAD_L + 65}  y={12} fontSize={9} fill={SMM_COLOR}>SMM</text>

      {/* BF goal dashed line */}
      {hasBf && goalBf != null && (
        <line
          x1={PAD_L} y1={toYBf(goalBf)} x2={SVG_W - PAD_R} y2={toYBf(goalBf)}
          stroke={BF_COLOR} strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
        />
      )}

      {/* SMM goal dashed line */}
      {hasSmm && goalSmm != null && (
        <line
          x1={PAD_L} y1={toYSmm(goalSmm)} x2={SVG_W - PAD_R} y2={toYSmm(goalSmm)}
          stroke={SMM_COLOR} strokeWidth={1} strokeDasharray="4 3" opacity={0.4}
        />
      )}

      {/* BF line (crimson) */}
      {hasBf && (
        <>
          <polyline
            points={bfData.map((d) => `${toX(d.date)},${toYBf(d.value)}`).join(" ")}
            fill="none" stroke={BF_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
          {bfData.map((d, i) => (
            <circle key={`bf-${i}`} cx={toX(d.date)} cy={toYBf(d.value)} r={3} fill={BF_COLOR} />
          ))}
        </>
      )}

      {/* SMM line (gold) */}
      {hasSmm && (
        <>
          <polyline
            points={smmData.map((d) => `${toX(d.date)},${toYSmm(d.value)}`).join(" ")}
            fill="none" stroke={SMM_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
          {smmData.map((d, i) => (
            <circle key={`smm-${i}`} cx={toX(d.date)} cy={toYSmm(d.value)} r={3} fill={SMM_COLOR} />
          ))}
        </>
      )}

      {/* Left Y axis labels (BF%) */}
      {hasBf && (
        <>
          <text x={PAD_L - 2} y={PAD_T + 4}        fontSize={8} fill={BF_COLOR}  textAnchor="end">{bfMax.toFixed(1)}%</text>
          <text x={PAD_L - 2} y={PAD_T + chartH}   fontSize={8} fill={BF_COLOR}  textAnchor="end">{bfMin.toFixed(1)}%</text>
        </>
      )}

      {/* Right Y axis labels (SMM lbs) */}
      {hasSmm && (
        <>
          <text x={SVG_W - PAD_R + 2} y={PAD_T + 4}      fontSize={8} fill={SMM_COLOR} textAnchor="start">{smmMax.toFixed(0)}</text>
          <text x={SVG_W - PAD_R + 2} y={PAD_T + chartH} fontSize={8} fill={SMM_COLOR} textAnchor="start">{smmMin.toFixed(0)}</text>
        </>
      )}

      {/* X axis date labels */}
      {allDates.map((date, i) =>
        i % 2 === 0 ? (
          <text key={date} x={toX(date)} y={SVG_H - 6} fontSize={9} fill="#807868" textAnchor="middle">
            {shortDate(date)}
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
        stroke="#C9A44A" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <text x={SVG_W - PAD_R} y={goalY - 4} fontSize={9} fill="#C9A44A" textAnchor="end">
        Goal {goalWeight} lbs
      </text>
      <polyline points={points} fill="none" stroke="#B8933A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.weight)} r={3} fill="#B8933A" />
      ))}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={9} fill="#807868" textAnchor="middle">
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
  const { selectedDate } = useDate();
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
    const r1 = await insertWeightLog(userId, w, selectedDate);
    if (r1.error) { setError(r1.error); return; }
    // Re-fetch full log — sorted by logged_at ASC — then use the LATEST entry
    // to update current_weight. This prevents backfilling an older date from
    // overwriting a newer measurement.
    const freshLog = await fetchWeightLog(userId);
    setWeightLog(freshLog);
    const latestWeight = freshLog.length > 0 ? freshLog[freshLog.length - 1].weight : w;
    const r2 = await updateCurrentWeight(userId, latestWeight);
    if (r2.error) { setError(r2.error); return; }
    setGoalData((prev) => prev ? { ...prev, current_weight: latestWeight } : prev);
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
    const r1 = await insertProgressLog(userId, goalId, patch, selectedDate);
    if (r1.error) { setError(r1.error); return; }
    // Re-fetch full log — sorted by logged_at ASC — then derive the latest
    // bf and smm values to update current_* fields. Walking backwards ensures
    // we find the most recent non-null value for each metric independently.
    const freshLog = await fetchProgressLog(userId, goalId);
    setProgressLog(freshLog);
    let latestBf:  number | null = null;
    let latestSmm: number | null = null;
    for (let i = freshLog.length - 1; i >= 0; i--) {
      if (latestBf  === null && freshLog[i].body_fat != null) latestBf  = freshLog[i].body_fat;
      if (latestSmm === null && freshLog[i].smm      != null) latestSmm = freshLog[i].smm;
      if (latestBf !== null && latestSmm !== null) break;
    }
    const metricsPatch: { current_body_fat?: number | null; current_smm?: number | null } = {};
    if (latestBf  != null) metricsPatch.current_body_fat = latestBf;
    if (latestSmm != null) metricsPatch.current_smm      = latestSmm;
    if (Object.keys(metricsPatch).length > 0) {
      const r2 = await updateCurrentMetrics(userId, metricsPatch);
      if (r2.error) { setError(r2.error); return; }
    }
    setGoalData((prev) => prev ? { ...prev, current_body_fat: latestBf ?? prev.current_body_fat, current_smm: latestSmm ?? prev.current_smm } : prev);
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

    const r1 = await insertProgressLog(userId, goalId, { performance_value: v }, selectedDate);
    if (r1.error) { setError(r1.error); return; }
    // Re-fetch full log — sorted by logged_at ASC — then use the latest
    // performance entry to update current_performance_value.
    const freshLog = await fetchProgressLog(userId, goalId);
    setProgressLog(freshLog);
    let latestPerf: number | null = null;
    for (let i = freshLog.length - 1; i >= 0; i--) {
      if (freshLog[i].performance_value != null) { latestPerf = freshLog[i].performance_value; break; }
    }
    if (latestPerf != null) {
      const r2 = await updateCurrentMetrics(userId, { current_performance_value: latestPerf });
      if (r2.error) { setError(r2.error); return; }
    }
    setGoalData((prev) => prev ? { ...prev, current_performance_value: latestPerf ?? prev.current_performance_value } : prev);
    setPerfInput("");
    setError("");
    setShowForm(false);
  }

  const inputCls = "flex-1 border border-[#252525] rounded px-4 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] placeholder:text-[#807868]";
  const saveBtnCls = "w-full bg-[#B8933A] hover:bg-[#C9A44A] text-[#0D0D0D] text-xs font-semibold rounded py-2.5 transition-colors uppercase tracking-widest";

  // ─────────────────────────────────────────────
  // WEIGHT VIEW
  // ─────────────────────────────────────────────
  if (category === "weight") {
    const startWeight = goalData?.start_weight ?? null;
    const goalWeight  = goalData?.goal_weight  ?? 190;
    // Derive "current" from the latest weight log on or before selectedDate.
    // Never fall forward to a future metric. Show "—" if no data exists yet.
    const asOfEntries   = weightLog.filter((e) => e.logged_at <= selectedDate);
    const currentWeight = asOfEntries.length > 0
      ? asOfEntries[asOfEntries.length - 1].weight
      : null;
    const improved = (startWeight != null && currentWeight != null) ? startWeight - currentWeight : null;
    const stillToGo = currentWeight != null ? currentWeight - goalWeight : null;

    return (
      <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">
        <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
          <h1
            className="text-2xl text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >Progress</h1>
          <p className="text-sm text-[#9A9080] mt-1">Weekly weight tracking</p>
        </header>
        <EditingBanner />
        <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <section className="grid grid-cols-4 gap-2">
            {[
              { label: "Starting", value: startWeight   != null ? `${startWeight} lbs`          : "—", color: "text-[#9A9080]" },
              { label: "Current",  value: currentWeight != null ? `${currentWeight} lbs`         : "—", color: "text-[#DDD5C0]" },
              { label: "Improved", value: improved      != null ? `${improved.toFixed(1)} lbs`   : "—", color: "text-[#B8933A]" },
              { label: "To Goal",  value: stillToGo     != null ? `${stillToGo.toFixed(1)} lbs`  : "—", color: "text-[#9A9080]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#141414] rounded p-3 border border-[#252525] flex flex-col items-center">
                <p className={`text-sm font-bold ${s.color} text-center`}>{s.value}</p>
                <p className="text-[10px] text-[#9A9080] mt-0.5 text-center">{s.label}</p>
              </div>
            ))}
          </section>
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>Weight Trend</p>
              <span className="text-xs text-[#9A9080]">Goal: {goalWeight} lbs</span>
            </div>
            <WeightChart data={weightLog} goalWeight={goalWeight} />
          </section>
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>Log Weight</p>
              <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-[#B8933A] hover:text-[#C9A44A]">
                {showForm ? "Cancel" : "+ Add entry"}
              </button>
            </div>
            {showForm && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input type="number" inputMode="decimal" placeholder="e.g. 215" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} className={inputCls} />
                  <span className="flex items-center text-sm text-[#9A9080] pr-1">lbs</span>
                </div>
                {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}
                <button onClick={handleLogWeight} className={saveBtnCls}>Save</button>
              </div>
            )}
          </section>
          <section className="bg-[#141414] rounded px-5 border border-[#252525]">
            <p className="text-xs uppercase tracking-widest text-[#9A9080] py-4 border-b border-[#252525]" style={{ fontFamily: "'Cinzel', serif" }}>Weight Log</p>
            <ul>
              {[...weightLog].slice(-7).reverse().map((entry, i) => {
                const sliceOffset = Math.max(0, weightLog.length - 7);
                const prevIndex   = sliceOffset + (Math.min(weightLog.length, 7) - 1 - i) - 1;
                const prev        = weightLog[prevIndex];
                const change    = prev ? entry.weight - prev.weight : null;
                return (
                  <li key={i} className="flex items-center justify-between py-3 border-b border-[#252525] last:border-0">
                    <span className="text-sm text-[#9A9080]">{entry.week}</span>
                    <div className="flex items-center gap-3">
                      {change !== null && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded border border-[#252525] bg-[#141414] ${change < 0 ? "text-[#B8933A]" : change > 0 ? "text-[#7A1E1E]" : "text-[#9A9080]"}`}>
                          {change > 0 ? "+" : ""}{change} lbs
                        </span>
                      )}
                      <span className="text-sm font-semibold text-[#DDD5C0]">{entry.weight} lbs</span>
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
    const bfSeries  = progressLog.filter((e) => e.body_fat != null).map((e) => ({ date: e.logged_at, value: e.body_fat! }));
    const smmSeries = progressLog.filter((e) => e.smm     != null).map((e) => ({ date: e.logged_at, value: e.smm!     }));

    // Derive "current" from the latest log entry on or before selectedDate
    const asOfLog = progressLog.filter((e) => e.logged_at <= selectedDate);
    let currBf:  number | null = null;
    let currSmm: number | null = null;
    for (let i = asOfLog.length - 1; i >= 0; i--) {
      if (currBf  === null && asOfLog[i].body_fat != null) currBf  = asOfLog[i].body_fat;
      if (currSmm === null && asOfLog[i].smm      != null) currSmm = asOfLog[i].smm;
      if (currBf !== null && currSmm !== null) break;
    }

    const startBf  = goalData?.starting_body_fat  ?? null;
    const goalBf   = goalData?.goal_body_fat       ?? null;
    const bfImproved = (startBf != null && currBf != null) ? startBf - currBf        : null;
    const bfToGoal   = (currBf  != null && goalBf  != null) ? currBf - goalBf         : null;

    const startSmm = goalData?.starting_smm ?? null;
    const goalSmm  = goalData?.goal_smm     ?? null;
    const smmImproved = (startSmm != null && currSmm != null) ? currSmm - startSmm   : null;
    const smmToGoal   = (currSmm  != null && goalSmm  != null) ? goalSmm - currSmm    : null;

    const fmtBf  = (v: number | null) => v != null ? `${v.toFixed(1)}%`   : "—";
    const fmtSmm = (v: number | null) => v != null ? `${v.toFixed(1)} lbs` : "—";

    return (
      <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">
        <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
          <h1
            className="text-2xl text-[#F4EEE4] tracking-wide"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
          >Progress</h1>
          <p className="text-sm text-[#9A9080] mt-1">Body composition tracking</p>
        </header>
        <EditingBanner />
        <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* Body Fat row */}
          <section>
            <p className="text-[10px] uppercase tracking-widest text-[#C04040] mb-2 px-0.5" style={{ fontFamily: "'Cinzel', serif" }}>Body Fat</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Starting", value: fmtBf(startBf),   color: "text-[#9A9080]" },
                { label: "Current",  value: fmtBf(currBf),    color: "text-[#DDD5C0]" },
                { label: "Improved", value: bfImproved != null ? `${bfImproved.toFixed(1)}%`  : "—", color: "text-[#B8933A]" },
                { label: "To Goal",  value: bfToGoal   != null ? `${bfToGoal.toFixed(1)}%`    : "—", color: "text-[#9A9080]" },
              ].map((s) => (
                <div key={s.label} className="bg-[#141414] rounded p-3 border border-[#252525] flex flex-col items-center">
                  <p className={`text-sm font-bold ${s.color} text-center`}>{s.value}</p>
                  <p className="text-[10px] text-[#9A9080] mt-0.5 text-center">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Muscle (SMM) row */}
          <section>
            <p className="text-[10px] uppercase tracking-widest text-[#B89B3A] mb-2 px-0.5" style={{ fontFamily: "'Cinzel', serif" }}>Muscle (SMM)</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Starting", value: fmtSmm(startSmm),  color: "text-[#9A9080]" },
                { label: "Current",  value: fmtSmm(currSmm),   color: "text-[#DDD5C0]" },
                { label: "Improved", value: smmImproved != null ? `${smmImproved.toFixed(1)} lbs` : "—", color: "text-[#B8933A]" },
                { label: "To Goal",  value: smmToGoal   != null ? `${smmToGoal.toFixed(1)} lbs`   : "—", color: "text-[#9A9080]" },
              ].map((s) => (
                <div key={s.label} className="bg-[#141414] rounded p-3 border border-[#252525] flex flex-col items-center">
                  <p className={`text-sm font-bold ${s.color} text-center`}>{s.value}</p>
                  <p className="text-[10px] text-[#9A9080] mt-0.5 text-center">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recomposition chart — BF and SMM on same graph */}
          {(bfSeries.length >= 2 || smmSeries.length >= 2) && (
            <section className="bg-[#141414] rounded p-5 border border-[#252525]">
              <p className="text-xs uppercase tracking-widest text-[#9A9080] mb-4" style={{ fontFamily: "'Cinzel', serif" }}>Recomposition Trend</p>
              <DualMetricChart
                bfData={bfSeries}
                smmData={smmSeries}
                goalBf={goalBf}
                goalSmm={goalSmm}
              />
            </section>
          )}

          {/* Log entry */}
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>Log Measurements</p>
              <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-[#B8933A] hover:text-[#C9A44A]">
                {showForm ? "Cancel" : "+ Add entry"}
              </button>
            </div>
            {showForm && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#9A9080] mb-1">Body Fat %</label>
                    <input type="number" inputMode="decimal" placeholder="25.0" value={bfInput} onChange={(e) => setBfInput(e.target.value)} className="w-full border border-[#252525] rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] placeholder:text-[#807868]" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9A9080] mb-1">SMM (lbs)</label>
                    <input type="number" inputMode="decimal" placeholder="78.0" value={smmInput} onChange={(e) => setSmmInput(e.target.value)} className="w-full border border-[#252525] rounded px-3 py-2 text-sm text-[#DDD5C0] bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] placeholder:text-[#807868]" />
                  </div>
                </div>
                {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}
                <button onClick={handleLogBodyComp} className={saveBtnCls}>Save</button>
              </div>
            )}
          </section>

          {/* History log */}
          <section className="bg-[#141414] rounded px-5 border border-[#252525]">
            <p className="text-xs uppercase tracking-widest text-[#9A9080] py-4 border-b border-[#252525]" style={{ fontFamily: "'Cinzel', serif" }}>History</p>
            <ul>
              {[...progressLog].reverse().map((entry, i) => (
                <li key={i} className="flex items-center justify-between py-3 border-b border-[#252525] last:border-0">
                  <span className="text-sm text-[#9A9080]">{new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <div className="flex items-center gap-3 text-sm font-semibold text-[#DDD5C0]">
                    {entry.body_fat != null && <span style={{ color: BF_COLOR }}>{entry.body_fat}%</span>}
                    {entry.smm      != null && <span style={{ color: SMM_COLOR }}>{entry.smm} lbs SMM</span>}
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
    <div className="min-h-screen bg-[#111111] flex flex-col max-w-md mx-auto">
      <header className="bg-[#0D0D0D] px-5 pt-10 pb-5 border-b border-[#252525]">
        <h1
          className="text-2xl text-[#F4EEE4] tracking-wide"
          style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
        >Progress</h1>
        <p className="text-sm text-[#9A9080] mt-1">{metricName} tracking</p>
      </header>
      <EditingBanner />
      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Stats */}
        {(() => {
          const dir   = goalData?.performance_direction ?? "increase";
          const start = goalData?.starting_performance_value ?? null;
          const goal  = goalData?.goal_performance_value     ?? null;
          // Derive "current" from the latest log entry on or before selectedDate
          const asOfPerf = progressLog.filter((e) => e.logged_at <= selectedDate);
          let current: number | null = null;
          for (let i = asOfPerf.length - 1; i >= 0; i--) {
            if (asOfPerf[i].performance_value != null) { current = asOfPerf[i].performance_value; break; }
          }
          const improved = (start != null && current != null)
            ? (dir === "increase" ? current - start : start - current)
            : null;
          const toGoal = (goal != null && current != null)
            ? (dir === "increase" ? goal - current : current - goal)
            : null;
          const fmt = (v: number | null) =>
            v != null ? `${v}${unitLabel ? ` ${unitLabel}` : ""}` : "—";
          return (
            <section className="grid grid-cols-4 gap-2">
              {[
                { label: "Starting", value: fmt(start)   },
                { label: "Current",  value: fmt(current) },
                { label: "Improved", value: improved != null ? `+${improved}${unitLabel ? ` ${unitLabel}` : ""}` : "—" },
                { label: "To Goal",  value: fmt(toGoal)  },
              ].map((s) => (
                <div key={s.label} className="bg-[#141414] rounded p-3 border border-[#252525] flex flex-col items-center">
                  <p className="text-sm font-bold text-[#DDD5C0] text-center">{s.value}</p>
                  <p className="text-[10px] text-[#9A9080] mt-0.5 text-center">{s.label}</p>
                </div>
              ))}
            </section>
          );
        })()}

        {/* Chart */}
        {perfSeries.length >= 2 && (
          <section className="bg-[#141414] rounded p-5 border border-[#252525]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>{metricName} Trend</p>
              {unitLabel && <span className="text-xs text-[#9A9080]">{unitLabel}</span>}
            </div>
            <MetricChart
              data={perfSeries}
              goalValue={goalData?.goal_performance_value}
              goalLabel={goalData?.goal_performance_value != null ? `Goal ${goalData.goal_performance_value}${unitLabel ? ` ${unitLabel}` : ""}` : undefined}
              color="#B8933A"
            />
          </section>
        )}

        {/* Log entry */}
        <section className="bg-[#141414] rounded p-5 border border-[#252525]">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-[#9A9080]" style={{ fontFamily: "'Cinzel', serif" }}>Log {metricName}</p>
            <button onClick={() => { setShowForm((v) => !v); setError(""); }} className="text-xs font-semibold text-[#B8933A] hover:text-[#C9A44A]">
              {showForm ? "Cancel" : "+ Add entry"}
            </button>
          </div>
          {showForm && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" placeholder="e.g. 185" value={perfInput} onChange={(e) => setPerfInput(e.target.value)} className={inputCls} />
                {unitLabel && <span className="flex items-center text-sm text-[#9A9080] pr-1">{unitLabel}</span>}
              </div>
              {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}
              <button onClick={handleLogPerformance} className={saveBtnCls}>Save</button>
            </div>
          )}
        </section>

        {/* History log */}
        <section className="bg-[#141414] rounded px-5 border border-[#252525]">
          <p className="text-xs uppercase tracking-widest text-[#9A9080] py-4 border-b border-[#252525]" style={{ fontFamily: "'Cinzel', serif" }}>History</p>
          <ul>
            {[...progressLog].reverse().map((entry, i) => (
              <li key={i} className="flex items-center justify-between py-3 border-b border-[#252525] last:border-0">
                <span className="text-sm text-[#9A9080]">{new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                <span className="text-sm font-semibold text-[#DDD5C0]">
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
