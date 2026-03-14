"use client";

import { useState, useEffect } from "react";
import type { WeightEntry } from "@/lib/mockData";
import { BottomNav }     from "@/components/BottomNav";
import { EditingBanner } from "@/components/EditingBanner";
import { DateHeader }    from "@/components/DateHeader";
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
import { projectFromData } from "@/lib/projection";

// ── Shared inline styles ─────────────────────
const sectionLabel: React.CSSProperties = {
  fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
  letterSpacing: "0.2em", color: "#4A3F2A", textTransform: "uppercase",
  marginBottom: 8,
};
const card: React.CSSProperties = {
  background: "#141414", border: "1px solid #252525", borderRadius: 10,
};
const dividerStyle: React.CSSProperties = {
  height: 1, background: "#1A1A1A", margin: "14px 0",
};

// ─────────────────────────────────────────────
// Generic SVG line chart — works for any numeric series
// Optional projectedData renders as a white dashed line
// ─────────────────────────────────────────────
function MetricChart({
  data,
  goalValue,
  goalLabel,
  color = "#B8933A",
  projectedData,
}: {
  data:           { date: string; value: number }[];
  goalValue?:     number | null;
  goalLabel?:     string;
  color?:         string;
  projectedData?: { date: string; value: number }[];
}) {
  if (data.length < 2) return null;

  const allPoints = [...data, ...(projectedData ?? [])];

  const SVG_W  = 300;
  const SVG_H  = 130;
  const PAD_L  = 10;
  const PAD_R  = 10;
  const PAD_T  = 12;
  const PAD_B  = 28;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  const allVals = allPoints.map((d) => d.value);
  const minVal  = goalValue != null ? Math.min(...allVals, goalValue) : Math.min(...allVals);
  const maxVal  = goalValue != null ? Math.max(...allVals, goalValue) : Math.max(...allVals);
  const range   = maxVal - minVal || 1;

  const toY = (v: number) => PAD_T + chartH * (1 - (v - minVal) / range);
  const totalLen = allPoints.length;
  const toX = (i: number) => PAD_L + (i / (totalLen - 1)) * chartW;

  const actualPoints = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");

  const shortDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Projected line starts from last actual point (anchor for visual continuity)
  const projPoints = projectedData && projectedData.length > 0
    ? [data[data.length - 1], ...projectedData]
        .map((d, i) => `${toX(data.length - 1 + i)},${toY(d.value)}`)
        .join(" ")
    : null;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%" }}>
      {/* Grid line at goal */}
      {goalValue != null && (
        <>
          <line
            x1={PAD_L} y1={toY(goalValue)}
            x2={SVG_W - PAD_R} y2={toY(goalValue)}
            stroke="#B8933A" strokeWidth={1} strokeDasharray="5 4" opacity={0.5}
          />
          {goalLabel && (
            <text x={SVG_W - PAD_R} y={toY(goalValue) + 12} fontSize={9} fill="#B8933A" textAnchor="end" opacity={0.6}
              style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
              {goalLabel}
            </text>
          )}
        </>
      )}
      <polyline points={actualPoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r={4} fill={color} />
      ))}
      {projPoints && (
        <polyline points={projPoints} fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
      )}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={11} fill="#4A3F2A" textAnchor="middle"
            style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
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
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%" }}>
      {/* Legend */}
      <circle cx={PAD_L}      cy={8} r={3} fill={BF_COLOR}  />
      <text   x={PAD_L + 7}   y={12} fontSize={9} fill={BF_COLOR}
        style={{ fontFamily: "'EB Garamond', serif" }}>Body Fat</text>
      <circle cx={PAD_L + 58} cy={8} r={3} fill={SMM_COLOR} />
      <text   x={PAD_L + 65}  y={12} fontSize={9} fill={SMM_COLOR}
        style={{ fontFamily: "'EB Garamond', serif" }}>SMM</text>

      {/* BF goal dashed line */}
      {hasBf && goalBf != null && (
        <line
          x1={PAD_L} y1={toYBf(goalBf)} x2={SVG_W - PAD_R} y2={toYBf(goalBf)}
          stroke={BF_COLOR} strokeWidth={1} strokeDasharray="5 4" opacity={0.4}
        />
      )}

      {/* SMM goal dashed line */}
      {hasSmm && goalSmm != null && (
        <line
          x1={PAD_L} y1={toYSmm(goalSmm)} x2={SVG_W - PAD_R} y2={toYSmm(goalSmm)}
          stroke={SMM_COLOR} strokeWidth={1} strokeDasharray="5 4" opacity={0.4}
        />
      )}

      {/* BF line (crimson) */}
      {hasBf && (
        <>
          <polyline
            points={bfData.map((d) => `${toX(d.date)},${toYBf(d.value)}`).join(" ")}
            fill="none" stroke={BF_COLOR} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          />
          {bfData.map((d, i) => (
            <circle key={`bf-${i}`} cx={toX(d.date)} cy={toYBf(d.value)} r={4} fill={BF_COLOR} />
          ))}
        </>
      )}

      {/* SMM line (gold) */}
      {hasSmm && (
        <>
          <polyline
            points={smmData.map((d) => `${toX(d.date)},${toYSmm(d.value)}`).join(" ")}
            fill="none" stroke={SMM_COLOR} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          />
          {smmData.map((d, i) => (
            <circle key={`smm-${i}`} cx={toX(d.date)} cy={toYSmm(d.value)} r={4} fill={SMM_COLOR} />
          ))}
        </>
      )}

      {/* Left Y axis labels (BF%) */}
      {hasBf && (
        <>
          <text x={PAD_L - 2} y={PAD_T + 4}        fontSize={8} fill={BF_COLOR}  textAnchor="end"
            style={{ fontFamily: "'EB Garamond', serif" }}>{bfMax.toFixed(1)}%</text>
          <text x={PAD_L - 2} y={PAD_T + chartH}   fontSize={8} fill={BF_COLOR}  textAnchor="end"
            style={{ fontFamily: "'EB Garamond', serif" }}>{bfMin.toFixed(1)}%</text>
        </>
      )}

      {/* Right Y axis labels (SMM lbs) */}
      {hasSmm && (
        <>
          <text x={SVG_W - PAD_R + 2} y={PAD_T + 4}      fontSize={8} fill={SMM_COLOR} textAnchor="start"
            style={{ fontFamily: "'EB Garamond', serif" }}>{smmMax.toFixed(0)}</text>
          <text x={SVG_W - PAD_R + 2} y={PAD_T + chartH} fontSize={8} fill={SMM_COLOR} textAnchor="start"
            style={{ fontFamily: "'EB Garamond', serif" }}>{smmMin.toFixed(0)}</text>
        </>
      )}

      {/* X axis date labels */}
      {allDates.map((date, i) =>
        i % 2 === 0 ? (
          <text key={date} x={toX(date)} y={SVG_H - 6} fontSize={11} fill="#4A3F2A" textAnchor="middle"
            style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
            {shortDate(date)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// Original weight chart — keeps "week" label format from WeightEntry
// Optional projectedData renders as a white dashed line
function WeightChart({ data, goalWeight, projectedData }: { data: WeightEntry[]; goalWeight: number; projectedData?: { value: number }[] }) {
  if (data.length < 2) return null;

  const totalLen = data.length + (projectedData?.length ?? 0);

  const SVG_W  = 300;
  const SVG_H  = 130;
  const PAD_L  = 10;
  const PAD_R  = 10;
  const PAD_T  = 12;
  const PAD_B  = 28;
  const chartW = SVG_W - PAD_L - PAD_R;
  const chartH = SVG_H - PAD_T - PAD_B;

  const allWeights = [...data.map((d) => d.weight), ...(projectedData ?? []).map((d) => d.value)];
  const yMin = Math.min(goalWeight, ...allWeights) - 5;
  const yMax = Math.max(...allWeights) + 5;
  const yRange = yMax - yMin;

  const toY = (w: number) => PAD_T + chartH * (1 - (w - yMin) / yRange);
  const toX = (i: number) => PAD_L + (i / (totalLen - 1)) * chartW;

  const points = data.map((d, i) => `${toX(i)},${toY(d.weight)}`).join(" ");
  const goalY  = toY(goalWeight);

  // Projected line starts from last actual point
  const projPoints = projectedData && projectedData.length > 0
    ? [{ value: data[data.length - 1].weight }, ...projectedData]
        .map((d, i) => `${toX(data.length - 1 + i)},${toY(d.value)}`)
        .join(" ")
    : null;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%" }}>
      <line x1={PAD_L} y1={goalY} x2={SVG_W - PAD_R} y2={goalY}
        stroke="#B8933A" strokeWidth={1} strokeDasharray="5 4" opacity={0.5} />
      <text x={SVG_W - PAD_R} y={goalY + 12} fontSize={9} fill="#B8933A" textAnchor="end" opacity={0.6}
        style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
        Goal {goalWeight} lbs
      </text>
      <polyline points={points} fill="none" stroke="#B8933A" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.weight)} r={4} fill="#B8933A" />
      ))}
      {projPoints && (
        <polyline points={projPoints} fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
      )}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text key={i} x={toX(i)} y={SVG_H - 6} fontSize={11} fill="#4A3F2A" textAnchor="middle"
            style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
            {d.week}
          </text>
        ) : null
      )}
    </svg>
  );
}

// Projection math is in @/lib/projection.ts (single source of truth)

// ─────────────────────────────────────────────
// Status badge config — inline styled
// ─────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  ahead:    { label: "Ahead",    color: "#4CAF50" },
  on_track: { label: "On Track", color: "#B8933A" },
  behind:   { label: "Behind",   color: "#7A1E1E" },
  no_data:  { label: "No Data",  color: "#807868" },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.no_data;
  return (
    <span style={{
      fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
      letterSpacing: "0.15em", color: cfg.color, textTransform: "uppercase",
      border: `1.5px solid ${cfg.color}`, borderRadius: 4,
      padding: "5px 11px", whiteSpace: "nowrap", marginTop: 4,
    }}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Date-range filter — slices data to 7d, 30d, or all
// ─────────────────────────────────────────────
type ChartRange = "7d" | "30d" | "all";

function filterByDateRange<T>(
  data: T[],
  range: ChartRange,
  getDate: (item: T) => string,
): T[] {
  if (range === "all") return data;
  const days = range === "7d" ? 7 : 30;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const cutoff = new Date(today + "T00:00:00");
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => getDate(d) >= cutoffStr);
}

function RangeTabs({ value, onChange }: { value: ChartRange; onChange: (r: ChartRange) => void }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
      {(["7d", "30d", "all"] as const).map((r) => {
        const isActive = value === r;
        return (
          <button
            key={r}
            onClick={() => onChange(r)}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: 7, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "4px 9px", borderRadius: 3, cursor: "pointer",
              border: isActive ? "1px solid #B8933A" : "1px solid #252525",
              background: isActive ? "rgba(184,147,58,0.1)" : "transparent",
              color: isActive ? "#B8933A" : "#4A3F2A",
            }}
          >
            {r === "all" ? "Since Start" : r.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat tile helper
// ─────────────────────────────────────────────
function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...card, padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{
        fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 600,
        color, lineHeight: 1.1,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 700,
        letterSpacing: "0.15em", color: "#807868", textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Progress Page
// ─────────────────────────────────────────────
export default function ProgressPage() {
  const { selectedDate, isEditable } = useDate();
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

  // Chart range
  const [chartRange, setChartRange] = useState<ChartRange>("all");

  // Status score
  const [statusData, setStatusData] = useState<{
    progressStatus: "ahead" | "on_track" | "behind" | "no_data";
    progressScore:  number;
    complianceScore: number;
    overallScore:    number;
  } | null>(null);

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

  // Re-fetch status score whenever selectedDate changes
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/status-score?date=${selectedDate}`)
      .then((r) => r.ok ? r.json() : null)
      .then(setStatusData);
  }, [userId, selectedDate]);

  const category = goalData?.goal_category ?? "weight";

  // ── Weight handlers ───────────────────────────
  async function handleLogWeight() {
    if (!userId) return;
    if (!isEditable(selectedDate)) { setError("This date is read-only."); return; }
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
    if (!isEditable(selectedDate)) { setError("This date is read-only."); return; }
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
    if (!isEditable(selectedDate)) { setError("This date is read-only."); return; }
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

  const inputStyle: React.CSSProperties = {
    flex: 1, border: "1px solid #252525", borderRadius: 6,
    padding: "8px 14px", fontSize: 14, color: "#DDD5C0",
    background: "#1A1A1A", outline: "none",
    fontFamily: "'EB Garamond', serif",
  };
  const saveBtnStyle: React.CSSProperties = {
    width: "100%", background: "#B8933A", color: "#0D0D0D",
    fontSize: 10, fontWeight: 700, fontFamily: "'Cinzel', serif",
    letterSpacing: "0.15em", textTransform: "uppercase",
    borderRadius: 6, padding: "10px 0", border: "none", cursor: "pointer",
  };

  // ── Tracking subtitle per category ──
  const trackingSubtitle =
    category === "weight" ? "Weekly weight tracking"
    : category === "body_composition" ? "Body composition tracking"
    : `${goalData?.performance_metric_name ?? "Performance"} tracking`;

  // ─────────────────────────────────────────────
  // SHARED PAGE SHELL
  // ─────────────────────────────────────────────
  function PageShell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col max-w-md mx-auto">

        {/* ── Header ── */}
        <header style={{ padding: "40px 20px 14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h1 style={{
                fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 22,
                letterSpacing: "0.05em", color: "#F4EEE4", margin: 0, marginBottom: 3,
              }}>
                Progress
              </h1>
              <p style={{
                fontFamily: "'EB Garamond', serif", fontStyle: "italic",
                fontSize: 14, color: "#807868", margin: 0,
              }}>
                {trackingSubtitle}
              </p>
            </div>
            <StatusBadge status={statusData?.progressStatus ?? null} />
          </div>
        </header>

        <DateHeader variant="compact" />
        <EditingBanner />

        {/* ── Scrollable content ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {children}
        </main>

        <BottomNav />
      </div>
    );
  }

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
      <PageShell>
        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Snapshot ── */}
        <p style={sectionLabel}>Snapshot</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatTile label="Starting"  value={startWeight   != null ? `${startWeight} lbs`        : "—"} color="#F4EEE4" />
          <StatTile label="Current"   value={currentWeight != null ? `${currentWeight} lbs`       : "—"} color="#F4EEE4" />
          <StatTile label="Improved"  value={improved      != null ? `${improved.toFixed(1)} lbs` : "—"} color="#B8933A" />
          <StatTile label="Remaining" value={stillToGo     != null ? `${stillToGo.toFixed(1)} lbs` : "—"} color="#F4EEE4" />
        </div>

        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Weight Trend ── */}
        <p style={sectionLabel}>Weight Trend</p>
        <div style={{ ...card, padding: 16 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
            }}>
              Trend Chart
            </span>
            <span style={{
              fontFamily: "'EB Garamond', serif", fontStyle: "italic",
              fontSize: 13, color: "#4A3F2A",
            }}>
              Goal: {goalWeight} lbs
            </span>
          </div>
          <RangeTabs value={chartRange} onChange={setChartRange} />
          {(() => {
            const filtered = filterByDateRange(weightLog, chartRange, (e) => e.logged_at);
            return (
              <WeightChart
                data={filtered}
                goalWeight={goalWeight}
                projectedData={
                  projectFromData({
                    data: filtered.map((e) => ({ date: e.logged_at, value: e.weight })),
                    goalValue: goalWeight,
                    direction: goalWeight < (startWeight ?? Infinity) ? "decrease" : "increase",
                  }).map((p) => ({ value: p.value }))
                }
              />
            );
          })()}
        </div>

        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Log Weight Tile ── */}
        <div style={{
          ...card, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
          }}>
            Log Weight
          </span>
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); }}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.12em", color: "#B8933A", textTransform: "uppercase",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            {showForm ? "Cancel" : "+ Add Entry"}
          </button>
        </div>

        {/* Log Weight Form (expands below tile) */}
        {showForm && (
          <div style={{ ...card, padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number" inputMode="decimal" placeholder="e.g. 215"
                value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868" }}>lbs</span>
            </div>
            {error && <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#7A1E1E", margin: 0 }}>{error}</p>}
            <button onClick={handleLogWeight} style={saveBtnStyle}>Save</button>
          </div>
        )}

        {/* ── Spacer ── */}
        <div style={{ height: 8 }} />

        {/* ── Weight Log ── */}
        <p style={sectionLabel}>Weight Log</p>
        <div style={{ ...card, overflow: "hidden" }}>
          {[...weightLog].slice(-7).reverse().map((entry, i) => {
            const sliceOffset = Math.max(0, weightLog.length - 7);
            const prevIndex   = sliceOffset + (Math.min(weightLog.length, 7) - 1 - i) - 1;
            const prev        = weightLog[prevIndex];
            const change      = prev ? entry.weight - prev.weight : null;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  borderTop: i > 0 ? "1px solid #1A1A1A" : "none",
                }}
              >
                <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#807868" }}>
                  {entry.week}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {change !== null && (
                    <span style={{
                      fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
                      letterSpacing: "0.1em", color: "#B8933A",
                      background: "rgba(184,147,58,0.08)", border: "1px solid #3A3020",
                      borderRadius: 3, padding: "2px 7px",
                    }}>
                      {change > 0 ? "+" : ""}{change} lbs
                    </span>
                  )}
                  <span style={{
                    fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 600,
                    color: change === null ? "#807868" : "#F4EEE4",
                  }}>
                    {entry.weight} lbs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </PageShell>
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
      <PageShell>
        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Body Fat Snapshot ── */}
        <p style={{ ...sectionLabel, color: BF_COLOR }}>Body Fat</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatTile label="Starting"  value={fmtBf(startBf)} color="#F4EEE4" />
          <StatTile label="Current"   value={fmtBf(currBf)}  color="#F4EEE4" />
          <StatTile label="Improved"  value={bfImproved != null ? `${bfImproved.toFixed(1)}%` : "—"} color="#B8933A" />
          <StatTile label="Remaining" value={bfToGoal   != null ? `${bfToGoal.toFixed(1)}%`   : "—"} color="#F4EEE4" />
        </div>

        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Muscle (SMM) Snapshot ── */}
        <p style={{ ...sectionLabel, color: SMM_COLOR }}>Muscle (SMM)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatTile label="Starting"  value={fmtSmm(startSmm)} color="#F4EEE4" />
          <StatTile label="Current"   value={fmtSmm(currSmm)}  color="#F4EEE4" />
          <StatTile label="Improved"  value={smmImproved != null ? `${smmImproved.toFixed(1)} lbs` : "—"} color="#B8933A" />
          <StatTile label="Remaining" value={smmToGoal   != null ? `${smmToGoal.toFixed(1)} lbs`   : "—"} color="#F4EEE4" />
        </div>

        {/* ── Divider ── */}
        <div style={dividerStyle} />

        {/* ── Recomposition Chart ── */}
        {(bfSeries.length >= 2 || smmSeries.length >= 2) && (
          <>
            <p style={sectionLabel}>Recomposition Trend</p>
            <div style={{ ...card, padding: 16 }}>
              <RangeTabs value={chartRange} onChange={setChartRange} />
              <DualMetricChart
                bfData={filterByDateRange(bfSeries, chartRange, (e) => e.date)}
                smmData={filterByDateRange(smmSeries, chartRange, (e) => e.date)}
                goalBf={goalBf}
                goalSmm={goalSmm}
              />
            </div>
            <div style={dividerStyle} />
          </>
        )}

        {/* ── Log Measurements Tile ── */}
        <div style={{
          ...card, padding: "14px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
          }}>
            Log Measurements
          </span>
          <button
            onClick={() => { setShowForm((v) => !v); setError(""); }}
            style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.12em", color: "#B8933A", textTransform: "uppercase",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            {showForm ? "Cancel" : "+ Add Entry"}
          </button>
        </div>

        {/* Log Form */}
        {showForm && (
          <div style={{ ...card, padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#807868", display: "block", marginBottom: 4 }}>Body Fat %</label>
                <input type="number" inputMode="decimal" placeholder="25.0" value={bfInput} onChange={(e) => setBfInput(e.target.value)}
                  style={{ ...inputStyle, width: "100%", flex: "unset" }} />
              </div>
              <div>
                <label style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#807868", display: "block", marginBottom: 4 }}>SMM (lbs)</label>
                <input type="number" inputMode="decimal" placeholder="78.0" value={smmInput} onChange={(e) => setSmmInput(e.target.value)}
                  style={{ ...inputStyle, width: "100%", flex: "unset" }} />
              </div>
            </div>
            {error && <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#7A1E1E", margin: 0 }}>{error}</p>}
            <button onClick={handleLogBodyComp} style={saveBtnStyle}>Save</button>
          </div>
        )}

        {/* ── Spacer ── */}
        <div style={{ height: 8 }} />

        {/* ── History Log ── */}
        <p style={sectionLabel}>History</p>
        <div style={{ ...card, overflow: "hidden" }}>
          {[...progressLog].reverse().map((entry, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid #1A1A1A" : "none",
              }}
            >
              <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#807868" }}>
                {new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {entry.body_fat != null && (
                  <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, fontWeight: 600, color: BF_COLOR }}>
                    {entry.body_fat}%
                  </span>
                )}
                {entry.smm != null && (
                  <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, fontWeight: 600, color: SMM_COLOR }}>
                    {entry.smm} lbs SMM
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  // ─────────────────────────────────────────────
  // PERFORMANCE VIEW
  // ─────────────────────────────────────────────
  const perfSeries = progressLog.filter((e) => e.performance_value != null).map((e) => ({ date: e.logged_at, value: e.performance_value! }));
  const metricName = goalData?.performance_metric_name ?? "Performance";
  const unitLabel  = goalData?.performance_unit ?? "";

  return (
    <PageShell>
      {/* ── Divider ── */}
      <div style={dividerStyle} />

      {/* ── Snapshot ── */}
      <p style={sectionLabel}>Snapshot</p>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatTile label="Starting"  value={fmt(start)}   color="#F4EEE4" />
            <StatTile label="Current"   value={fmt(current)} color="#F4EEE4" />
            <StatTile label="Improved"  value={improved != null ? `+${improved}${unitLabel ? ` ${unitLabel}` : ""}` : "—"} color="#B8933A" />
            <StatTile label="Remaining" value={fmt(toGoal)}  color="#F4EEE4" />
          </div>
        );
      })()}

      {/* ── Divider ── */}
      <div style={dividerStyle} />

      {/* ── Chart ── */}
      {perfSeries.length >= 2 && (
        <>
          <p style={sectionLabel}>{metricName} Trend</p>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
                letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
              }}>
                Trend Chart
              </span>
              {unitLabel && (
                <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: "italic", fontSize: 13, color: "#4A3F2A" }}>
                  {unitLabel}
                </span>
              )}
            </div>
            <RangeTabs value={chartRange} onChange={setChartRange} />
            {(() => {
              const filtered = filterByDateRange(perfSeries, chartRange, (e) => e.date);
              return filtered.length >= 2 ? (
                <MetricChart
                  data={filtered}
                  goalValue={goalData?.goal_performance_value}
                  goalLabel={goalData?.goal_performance_value != null ? `Goal ${goalData.goal_performance_value}${unitLabel ? ` ${unitLabel}` : ""}` : undefined}
                  color="#B8933A"
                  projectedData={projectFromData({
                    data: filtered,
                    goalValue: goalData?.goal_performance_value ?? null,
                    direction: (goalData?.performance_direction === "decrease") ? "decrease" : "increase",
                  })}
                />
              ) : (
                <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 13, color: "#807868", textAlign: "center", padding: "16px 0" }}>
                  Not enough data for this range
                </p>
              );
            })()}
          </div>
          <div style={dividerStyle} />
        </>
      )}

      {/* ── Log Entry Tile ── */}
      <div style={{
        ...card, padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
          letterSpacing: "0.2em", color: "#807868", textTransform: "uppercase",
        }}>
          Log {metricName}
        </span>
        <button
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          style={{
            fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", color: "#B8933A", textTransform: "uppercase",
            background: "none", border: "none", cursor: "pointer", padding: 0,
          }}
        >
          {showForm ? "Cancel" : "+ Add Entry"}
        </button>
      </div>

      {/* Log Form */}
      {showForm && (
        <div style={{ ...card, padding: 16, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="number" inputMode="decimal" placeholder="e.g. 185"
              value={perfInput} onChange={(e) => setPerfInput(e.target.value)}
              style={inputStyle}
            />
            {unitLabel && <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 14, color: "#807868" }}>{unitLabel}</span>}
          </div>
          {error && <p style={{ fontFamily: "'EB Garamond', serif", fontSize: 12, color: "#7A1E1E", margin: 0 }}>{error}</p>}
          <button onClick={handleLogPerformance} style={saveBtnStyle}>Save</button>
        </div>
      )}

      {/* ── Spacer ── */}
      <div style={{ height: 8 }} />

      {/* ── History Log ── */}
      <p style={sectionLabel}>History</p>
      <div style={{ ...card, overflow: "hidden" }}>
        {[...progressLog].reverse().map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: i > 0 ? "1px solid #1A1A1A" : "none",
            }}
          >
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, color: "#807868" }}>
              {new Date(entry.logged_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 17, fontWeight: 600, color: "#F4EEE4" }}>
              {entry.performance_value}{unitLabel ? ` ${unitLabel}` : ""}
            </span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
