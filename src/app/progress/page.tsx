"use client";
// ↑ Needed because we have interactive state: logging a new weight entry.

import { useState, useEffect } from "react";
import { mockWeightLog } from "@/lib/mockData";
import type { WeightEntry } from "@/lib/mockData";
import { BottomNav } from "@/components/BottomNav";
import { fetchGoalData, updateCurrentWeight } from "@/lib/queries";
import { DEMO_CLIENT_ID } from "@/lib/config";

// ─────────────────────────────────────────────
// WeightChart — SVG line chart
//
// SVG coordinate system: (0,0) is top-left.
// Higher weight = higher y-value = lower on the screen.
// So the line trends downward as weight decreases — that's the right visual.
// ─────────────────────────────────────────────
function WeightChart({
  data,
  goalWeight,
}: {
  data: WeightEntry[];
  goalWeight: number;
}) {
  if (data.length < 2) return null;

  // Chart layout constants
  const SVG_W   = 300;
  const SVG_H   = 130;
  const PAD_L   = 10;  // left padding
  const PAD_R   = 10;  // right padding
  const PAD_T   = 12;  // top padding
  const PAD_B   = 28;  // bottom padding (room for x-axis labels)
  const chartW  = SVG_W - PAD_L - PAD_R;
  const chartH  = SVG_H - PAD_T - PAD_B;

  // Y axis range: a little below goal and a little above the highest weight
  const allWeights = data.map((d) => d.weight);
  const yMin = goalWeight - 5;
  const yMax = Math.max(...allWeights) + 5;
  const yRange = yMax - yMin;

  // Convert a weight value → SVG y coordinate
  // Higher weight → lower y value in SVG → appears higher on screen
  const toY = (w: number) =>
    PAD_T + chartH * (1 - (w - yMin) / yRange);

  // Convert a data index → SVG x coordinate
  const toX = (i: number) =>
    PAD_L + (i / (data.length - 1)) * chartW;

  // Build the polyline points string: "x0,y0 x1,y1 x2,y2 ..."
  const points = data
    .map((d, i) => `${toX(i)},${toY(d.weight)}`)
    .join(" ");

  const goalY = toY(goalWeight);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full">

      {/* Dashed goal line */}
      <line
        x1={PAD_L} y1={goalY}
        x2={SVG_W - PAD_R} y2={goalY}
        stroke="#22c55e"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.8}
      />
      <text
        x={SVG_W - PAD_R}
        y={goalY - 4}
        fontSize={9}
        fill="#22c55e"
        textAnchor="end"
      >
        Goal {goalWeight} lbs
      </text>

      {/* Weight trend line */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data point dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(d.weight)}
          r={3}
          fill="#3b82f6"
        />
      ))}

      {/* X-axis labels — show every other entry to avoid crowding */}
      {data.map((d, i) =>
        i % 2 === 0 ? (
          <text
            key={i}
            x={toX(i)}
            y={SVG_H - 6}
            fontSize={9}
            fill="#9ca3af"
            textAnchor="middle"
          >
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
  const [weightLog, setWeightLog] = useState<WeightEntry[]>(mockWeightLog);
  const [showForm,  setShowForm]  = useState(false);
  const [input,     setInput]     = useState("");
  const [error,     setError]     = useState("");

  // Goal data loaded from Supabase — starts null until the fetch completes
  const [goalData, setGoalData] = useState<{
    start_weight:   number | null;
    goal_weight:    number | null;
    current_weight: number | null;
  } | null>(null);

  // Load real goal data from Supabase on mount
  useEffect(() => {
    fetchGoalData(DEMO_CLIENT_ID).then((data) => {
      if (data) setGoalData(data);
    });
  }, []);

  // Use Supabase values when available, fall back to mock data
  const startWeight   = goalData?.start_weight   ?? 240;
  const goalWeight    = goalData?.goal_weight     ?? 190;
  const currentWeight = goalData?.current_weight  ?? weightLog[weightLog.length - 1].weight;

  const lostSoFar = startWeight - currentWeight;
  const stillToGo = currentWeight - goalWeight;

  function handleLogWeight() {
    const w = parseFloat(input);
    if (isNaN(w) || w < 50 || w > 500) {
      setError("Enter a valid weight between 50 and 500 lbs.");
      return;
    }

    // Update local state so the chart and stats update immediately
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setWeightLog((prev) => [...prev, { week: today, weight: w }]);
    setGoalData((prev) => prev ? { ...prev, current_weight: w } : prev);

    // Write to Supabase so the Dashboard's Progress ring updates on next visit
    updateCurrentWeight(DEMO_CLIENT_ID, w);

    setInput("");
    setError("");
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">

      {/* ── Header ───────────────────────────────── */}
      <header className="bg-white px-5 pt-10 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-gray-400 mt-1">Weekly weight tracking</p>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* ── Stats row ────────────────────────────── */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { label: "Current",   value: `${currentWeight} lbs`, color: "text-gray-900" },
            { label: "Lost",      value: `${lostSoFar} lbs`,     color: "text-blue-600" },
            { label: "To go",     value: `${stillToGo} lbs`,     color: "text-amber-600" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center"
            >
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* ── Weight Chart ─────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Weight Trend
            </p>
            <span className="text-xs text-gray-400">Goal: {goalWeight} lbs</span>
          </div>
          <WeightChart data={weightLog} goalWeight={goalWeight} />
        </section>

        {/* ── Log Weight ───────────────────────────── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Log Weight
            </p>
            <button
              onClick={() => { setShowForm((v) => !v); setError(""); }}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600"
            >
              {showForm ? "Cancel" : "+ Add entry"}
            </button>
          </div>

          {/* Weight input form — visible only when showForm is true */}
          {showForm && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 215"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="flex items-center text-sm text-gray-400 pr-1">lbs</span>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                onClick={handleLogWeight}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-xl py-2 transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </section>

        {/* ── Weight Log (most recent first) ───────── */}
        <section className="bg-white rounded-2xl px-5 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 py-4 border-b border-gray-50">
            Weight Log
          </p>
          <ul>
            {[...weightLog].reverse().map((entry, i) => {
              // Show the change from the previous entry (if any)
              const prevIndex = weightLog.length - 1 - i - 1;
              const prev = weightLog[prevIndex];
              const change = prev ? entry.weight - prev.weight : null;

              return (
                <li
                  key={i}
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm text-gray-600">{entry.week}</span>
                  <div className="flex items-center gap-3">
                    {/* Show +/- change badge if not the first entry */}
                    {change !== null && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          change < 0
                            ? "bg-green-50 text-green-600"
                            : change > 0
                            ? "bg-red-50 text-red-500"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {change > 0 ? "+" : ""}{change} lbs
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-800">
                      {entry.weight} lbs
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

      </main>

      {/* ── Shared bottom tab bar ─────────────────── */}
      <BottomNav />

    </div>
  );
}
