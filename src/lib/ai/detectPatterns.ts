// ─────────────────────────────────────────────
// detectPatterns — deterministic pattern detection
//
// Reads ClientAIContext and produces PatternSignal[]
// and TrendSignal[]. Each signal carries human-readable
// evidence for downstream explainability.
//
// No LLM, no side effects, pure computation.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  MetricDelta,
  PatternSignal,
  TrendSignal,
  TrendWindowData,
  TrendWindow,
  SignalSeverity,
  SignalConfidence,
  SignalDirection,
} from "./types";

// ═══════════════════════════════════════════════
// PATTERN SIGNALS
// ═══════════════════════════════════════════════

// ── Streak ───────────────────────────────────

function detectStreak(ctx: ClientAIContext): PatternSignal {
  const s = ctx.streak;

  let severity: SignalSeverity;
  let direction: SignalDirection;
  let label: string;

  if (s >= 14) {
    severity  = "none";
    direction = "improving";
    label     = `${s}-day streak — exceptional consistency`;
  } else if (s >= 7) {
    severity  = "none";
    direction = "improving";
    label     = `${s}-day streak — strong momentum building`;
  } else if (s >= 3) {
    severity  = "none";
    direction = "improving";
    label     = `${s}-day streak — positive habit formation`;
  } else if (s >= 1) {
    severity  = "low";
    direction = "stable";
    label     = `${s}-day streak — early momentum, needs reinforcement`;
  } else {
    severity  = "medium";
    direction = "declining";
    label     = "No active streak — streak reset";
  }

  const evidence: string[] = [];
  if (s > 0) {
    evidence.push(`${s} consecutive days with all tasks completed`);
  } else if (ctx.tasks.length > 0) {
    evidence.push("Streak is at 0 — no consecutive all-complete days");
    if (ctx.compliance.today.completed > 0) {
      evidence.push(`${ctx.compliance.today.completed} of ${ctx.compliance.today.total} tasks done today`);
    }
  } else {
    evidence.push("No active tasks to track streak against");
  }

  return {
    key:        "streak_momentum",
    label,
    detected:   true,  // streak state is always present
    severity,
    confidence: "high",
    direction,
    category:   "streak",
    evidence,
    metrics: {
      current_streak:    s,
      streak_level:      s >= 14 ? "hot" : s >= 7 ? "building" : s >= 3 ? "active" : s >= 1 ? "fragile" : "broken",
      tasks_today_done:  ctx.compliance.today.completed,
      tasks_today_total: ctx.compliance.today.total,
    },
  };
}

// ── Plateau ──────────────────────────────────

function detectPlateau(ctx: ClientAIContext): PatternSignal {
  // Need compliance data and progress data to detect a plateau
  if (!ctx.progressTrends || ctx.compliance.week.percent < COMPLIANCE_TARGET) {
    return {
      key:        "plateau",
      label:      "No plateau detected",
      detected:   false,
      severity:   "none",
      confidence: "low",
      category:   "plateau",
      evidence:   ctx.compliance.week.percent < COMPLIANCE_TARGET
        ? ["Compliance too low to distinguish plateau from non-adherence"]
        : ["Insufficient progress data for plateau detection"],
      metrics:    {},
    };
  }

  const { velocity7d, velocity30d, goalCategory, currentValue, goalValue, startValue, metricLabel } = ctx.progressTrends;

  if ((velocity7d == null && velocity30d == null) || currentValue == null || goalValue == null) {
    return {
      key:        "plateau",
      label:      "No plateau detected",
      detected:   false,
      severity:   "none",
      confidence: "low",
      category:   "plateau",
      evidence:   ["Not enough velocity or metric data for plateau analysis"],
      metrics:    {},
    };
  }

  const totalGap = Math.abs(goalValue - (startValue ?? currentValue));
  if (totalGap === 0) {
    return {
      key:        "plateau",
      label:      "Goal already reached",
      detected:   false,
      severity:   "none",
      confidence: "high",
      category:   "plateau",
      evidence:   ["Start value equals goal value — no gap to track"],
      metrics:    {},
    };
  }

  // Threshold: less than 0.5% of total gap per day = effectively flat
  const flatThreshold = totalGap * 0.005;

  const v7  = velocity7d  != null ? Math.abs(velocity7d)  : null;
  const v30 = velocity30d != null ? Math.abs(velocity30d) : null;

  const is7dFlat  = v7  != null && v7  < flatThreshold;
  const is30dFlat = v30 != null && v30 < flatThreshold;

  if (!is7dFlat && !is30dFlat) {
    return {
      key:        "plateau",
      label:      "No plateau detected — velocity is sufficient",
      detected:   false,
      severity:   "none",
      confidence: "high",
      category:   "plateau",
      evidence:   [`${metricLabel} velocity is above flat threshold`],
      metrics: {
        velocity_7d:     velocity7d,
        velocity_30d:    velocity30d,
        flat_threshold:  +flatThreshold.toFixed(4),
      },
    };
  }

  // Estimate days flat from log data
  let daysFlat = 0;
  if (goalCategory === "weight" && ctx.weightLog.length >= 2) {
    daysFlat = estimateFlatDays(
      ctx.weightLog.map((e) => ({ date: e.date, value: e.weight })),
      flatThreshold,
    );
  } else if (ctx.progressLog.length >= 2) {
    const values = extractPrimaryProgressValues(ctx);
    if (values.length >= 2) {
      daysFlat = estimateFlatDays(values, flatThreshold);
    }
  }

  let confidence: SignalConfidence;
  let severity: SignalSeverity;

  if (is30dFlat && is7dFlat && daysFlat >= 14) {
    confidence = "high";
    severity   = "high";
  } else if ((is30dFlat || is7dFlat) && daysFlat >= 7) {
    confidence = "medium";
    severity   = "medium";
  } else {
    confidence = "low";
    severity   = "low";
  }

  const detected = confidence !== "low";

  const evidence: string[] = [];
  if (daysFlat > 0) {
    evidence.push(`${metricLabel} unchanged for approximately ${daysFlat} days`);
  } else {
    evidence.push(`${metricLabel} velocity is near zero`);
  }
  evidence.push(`Monthly compliance is ${ctx.compliance.month.percent}% — effort is present`);
  if (is7dFlat && velocity7d != null) {
    evidence.push(`7-day velocity: ${velocity7d.toFixed(4)} (flat threshold: ${flatThreshold.toFixed(4)})`);
  }
  if (is30dFlat && velocity30d != null) {
    evidence.push(`30-day velocity: ${velocity30d.toFixed(4)} (flat threshold: ${flatThreshold.toFixed(4)})`);
  }

  return {
    key:        "plateau",
    label:      detected
      ? (daysFlat > 0
        ? `${metricLabel} unchanged for ~${daysFlat} days despite ${ctx.compliance.month.percent}% compliance`
        : `${metricLabel} velocity near zero despite good compliance`)
      : "Possible early plateau — monitoring",
    detected,
    severity,
    confidence,
    direction:  "stable",
    category:   "plateau",
    evidence,
    metrics: {
      days_flat:           daysFlat,
      velocity_7d:         velocity7d,
      velocity_30d:        velocity30d,
      flat_threshold:      +flatThreshold.toFixed(4),
      compliance_month:    ctx.compliance.month.percent,
    },
  };
}

/** Walk backwards through sorted data points, count consecutive days with < threshold change */
function estimateFlatDays(
  points: { date: string; value: number }[],
  dailyThreshold: number,
): number {
  if (points.length < 2) return 0;

  let flatDays = 0;
  const lastValue = points[points.length - 1].value;

  for (let i = points.length - 2; i >= 0; i--) {
    const diff = Math.abs(points[i].value - lastValue);
    if (diff > dailyThreshold * 7) break;

    const d1 = new Date(points[i].date + "T00:00:00").getTime();
    const d2 = new Date(points[points.length - 1].date + "T00:00:00").getTime();
    flatDays = Math.floor((d2 - d1) / 86_400_000);
  }

  return flatDays;
}

/** Extract primary metric values from progress logs based on goal category */
function extractPrimaryProgressValues(
  ctx: ClientAIContext,
): { date: string; value: number }[] {
  if (!ctx.progressTrends) return [];

  const metric = ctx.progressTrends.metricLabel;

  return ctx.progressLog
    .map((entry) => {
      let value: number | null = null;
      if (metric === "Body Fat")                  value = entry.bodyFat;
      else if (metric === "Skeletal Muscle Mass") value = entry.smm;
      else                                        value = entry.performanceValue;
      return value != null ? { date: entry.date, value } : null;
    })
    .filter((e): e is { date: string; value: number } => e != null);
}

// ── Consistency ──────────────────────────────
// Compares compliance across windows to detect consistency patterns.

function detectConsistency(ctx: ClientAIContext): PatternSignal {
  const { week, month, overall } = ctx.compliance;

  const spread = Math.max(week.percent, month.percent, overall.percent)
               - Math.min(week.percent, month.percent, overall.percent);

  const allAboveTarget = week.percent >= COMPLIANCE_TARGET
    && month.percent >= COMPLIANCE_TARGET
    && overall.percent >= COMPLIANCE_TARGET;

  let direction: SignalDirection;
  let severity: SignalSeverity = "none";
  let label: string;

  if (allAboveTarget && spread <= 10) {
    direction = "stable";
    label     = "Highly consistent compliance across all windows";
  } else if (allAboveTarget) {
    direction = week.percent > month.percent ? "improving" : "stable";
    label     = "Compliance above target in all windows";
  } else if (week.percent >= COMPLIANCE_TARGET && month.percent < COMPLIANCE_TARGET) {
    direction = "improving";
    label     = "Recent compliance recovering — week above target, month still below";
  } else if (week.percent < COMPLIANCE_TARGET && month.percent >= COMPLIANCE_TARGET) {
    direction = "declining";
    severity  = "medium";
    label     = "Recent compliance dropping — week below target despite strong month";
  } else {
    direction = "declining";
    severity  = "medium";
    label     = "Compliance below target across multiple windows";
  }

  const evidence: string[] = [
    `Week: ${week.percent}%, Month: ${month.percent}%, Overall: ${overall.percent}%`,
    `Spread across windows: ${spread} points`,
  ];
  if (allAboveTarget) {
    evidence.push(`All windows above ${COMPLIANCE_TARGET}% target`);
  }

  return {
    key:        "consistency",
    label,
    detected:   true,
    severity,
    confidence: "high",
    direction,
    category:   "consistency",
    evidence,
    metrics: {
      compliance_week:    week.percent,
      compliance_month:   month.percent,
      compliance_overall: overall.percent,
      spread,
    },
  };
}

// ── Adherence ────────────────────────────────
// Today's task completion pattern.

function detectAdherence(ctx: ClientAIContext): PatternSignal {
  const { today } = ctx.compliance;

  if (today.total === 0) {
    return {
      key:        "daily_adherence",
      label:      "No tasks assigned",
      detected:   false,
      severity:   "none",
      confidence: "high",
      category:   "adherence",
      evidence:   ["No active tasks to measure adherence against"],
      metrics:    {},
    };
  }

  const pct     = today.percent;
  const missed  = today.total - today.completed;
  const allDone = missed === 0;

  let severity: SignalSeverity = "none";
  if (pct === 0)                        severity = "high";
  else if (pct < 50)                    severity = "medium";
  else if (pct < COMPLIANCE_TARGET)     severity = "low";

  const evidence: string[] = [
    `${today.completed} of ${today.total} tasks completed today (${pct}%)`,
  ];

  if (allDone) {
    evidence.push("All tasks completed for the day");
  } else {
    const incomplete = ctx.tasks.filter((t) => !t.done);
    if (incomplete.length <= 5) {
      evidence.push(`Incomplete: ${incomplete.map((t) => t.name).join(", ")}`);
    } else {
      evidence.push(`${missed} tasks still incomplete`);
    }
  }

  return {
    key:        "daily_adherence",
    label:      allDone
      ? `All ${today.total} tasks completed today`
      : `${missed} of ${today.total} tasks incomplete today`,
    detected:   true,
    severity,
    confidence: "high",
    direction:  allDone ? "stable" : pct > 50 ? "stable" : "declining",
    category:   "adherence",
    evidence,
    metrics: {
      completed:  today.completed,
      total:      today.total,
      percent:    pct,
      missed,
    },
  };
}

// ═══════════════════════════════════════════════
// TREND SIGNALS
// ═══════════════════════════════════════════════

function buildTrendSignals(ctx: ClientAIContext): TrendSignal[] {
  const signals: TrendSignal[] = [];

  // ── Primary metric trend ───────────────────

  if (ctx.progressTrends) {
    const t = ctx.progressTrends;

    const bestVelocity = t.velocity30d ?? t.velocity7d;
    let direction: SignalDirection = "no_data";

    if (bestVelocity != null) {
      const isDecrease = t.goalCategory === "weight" || t.metricLabel === "Body Fat";
      if (Math.abs(bestVelocity) < 0.001) {
        direction = "stable";
      } else if (isDecrease) {
        direction = bestVelocity < 0 ? "improving" : "declining";
      } else {
        direction = bestVelocity > 0 ? "improving" : "declining";
      }
    }

    let goalDateGap: number | null = null;
    if (t.projectedDate && t.goalDate) {
      const proj = new Date(t.projectedDate + "T00:00:00").getTime();
      const goal = new Date(t.goalDate      + "T00:00:00").getTime();
      goalDateGap = Math.round((proj - goal) / 86_400_000);
    }

    const metricKey = t.metricLabel.toLowerCase().replace(/\s+/g, "_");

    // Build windows
    const windows: Partial<Record<TrendWindow, TrendWindowData>> = {};
    if (t.velocity7d != null) {
      windows["7d"] = { change: +(t.velocity7d * 7).toFixed(2), velocity: t.velocity7d };
    }
    if (t.velocity30d != null) {
      windows["30d"] = { change: +(t.velocity30d * 30).toFixed(2), velocity: t.velocity30d };
    }

    // Add summary deltas where available
    const summaryKey = t.metricLabel === "Weight" ? "weight"
      : t.metricLabel === "Body Fat" ? "bodyFat"
      : t.metricLabel === "Skeletal Muscle Mass" ? "smm"
      : null;
    const summaryData = summaryKey
      ? ctx.progressSummary[summaryKey as keyof typeof ctx.progressSummary]
      : null;
    if (summaryData?.week && windows["7d"]) {
      windows["7d"].change = summaryData.week.change;
    }
    if (summaryData?.month && windows["30d"]) {
      windows["30d"].change = summaryData.month.change;
    }

    const evidence: string[] = [];
    evidence.push(`${t.metricLabel} trend: ${direction}`);
    if (t.velocity7d  != null) evidence.push(`7-day velocity: ${t.velocity7d.toFixed(4)} ${t.unit}/day`);
    if (t.velocity30d != null) evidence.push(`30-day velocity: ${t.velocity30d.toFixed(4)} ${t.unit}/day`);
    if (t.currentValue != null && t.goalValue != null) {
      evidence.push(`Current: ${t.currentValue} ${t.unit}, Goal: ${t.goalValue} ${t.unit}`);
    }
    if (goalDateGap != null) {
      evidence.push(goalDateGap <= 0
        ? `Projected to finish ${Math.abs(goalDateGap)} days ahead of schedule`
        : `Projected to finish ${goalDateGap} days behind schedule`);
    }

    let severity: SignalSeverity = "none";
    if (direction === "declining") severity = "medium";
    if (t.status === "behind")    severity = "medium";

    signals.push({
      key:           `trend_${metricKey}`,
      label:         `${t.metricLabel}: ${direction === "improving" ? "moving toward goal" : direction === "declining" ? "moving away from goal" : direction}`,
      detected:      direction !== "no_data",
      severity,
      confidence:    t.velocity30d != null ? "high" : t.velocity7d != null ? "medium" : "low",
      direction,
      category:      "trend",
      evidence,
      metric:        metricKey,
      windows,
      projectedDate: t.projectedDate,
      goalDateGap,
      metrics: {
        start_value:   t.startValue,
        current_value: t.currentValue,
        goal_value:    t.goalValue,
        status:        t.status,
      },
    });
  }

  // ── Secondary metric trends ────────────────
  // Body comp goals: add the alternate metric (BF or SMM)
  // Non-weight goals: add weight as secondary

  const secondaryEntries: { key: string; label: string; data: { week: MetricDelta | null; month: MetricDelta | null } }[] = [];

  if (ctx.progressTrends?.goalCategory === "body_composition") {
    const altKey   = ctx.progressTrends.metricLabel === "Body Fat" ? "smm" : "bodyFat";
    const altLabel = ctx.progressTrends.metricLabel === "Body Fat" ? "Skeletal Muscle Mass" : "Body Fat";
    const altData  = ctx.progressSummary[altKey];
    if (altData && (altData.week || altData.month)) {
      secondaryEntries.push({ key: altKey === "smm" ? "smm" : "body_fat", label: altLabel, data: altData });
    }
  }

  if (ctx.progressTrends?.goalCategory !== "weight" && ctx.progressSummary.weight) {
    const wd = ctx.progressSummary.weight;
    if (wd.week || wd.month) {
      secondaryEntries.push({ key: "weight", label: "Weight", data: wd });
    }
  }

  for (const entry of secondaryEntries) {
    const windows: Partial<Record<TrendWindow, TrendWindowData>> = {};
    if (entry.data.week)  windows["7d"]  = { change: entry.data.week.change,  velocity: null };
    if (entry.data.month) windows["30d"] = { change: entry.data.month.change, velocity: null };

    const evidence: string[] = [];
    if (entry.data.week)  evidence.push(`${entry.label} 7-day change: ${entry.data.week.change > 0 ? "+" : ""}${entry.data.week.change}`);
    if (entry.data.month) evidence.push(`${entry.label} 30-day change: ${entry.data.month.change > 0 ? "+" : ""}${entry.data.month.change}`);

    signals.push({
      key:           `trend_${entry.key}`,
      label:         `${entry.label}: secondary metric`,
      detected:      true,
      severity:      "none",
      confidence:    entry.data.month ? "medium" : "low",
      direction:     "no_data",
      category:      "trend",
      evidence,
      metric:        entry.key,
      windows,
      projectedDate: null,
      goalDateGap:   null,
      metrics: {
        week_change:  entry.data.week?.change ?? null,
        month_change: entry.data.month?.change ?? null,
      },
    });
  }

  // ── Task completion trend ──────────────────

  const tc = ctx.compliance;
  let tcDirection: SignalDirection = "stable";
  if (tc.week.percent > tc.month.percent + 10)      tcDirection = "improving";
  else if (tc.week.percent < tc.month.percent - 10)  tcDirection = "declining";

  const tcEvidence: string[] = [
    `Task completion: week ${tc.week.percent}%, month ${tc.month.percent}%, overall ${tc.overall.percent}%`,
  ];
  if (tc.today.total > 0) {
    tcEvidence.push(`Today: ${tc.today.completed}/${tc.today.total} (${tc.today.percent}%)`);
  }

  signals.push({
    key:           "trend_task_completion",
    label:         `Task completion trend: ${tcDirection}`,
    detected:      true,
    severity:      tcDirection === "declining" ? "low" : "none",
    confidence:    "high",
    direction:     tcDirection,
    category:      "trend",
    evidence:      tcEvidence,
    metric:        "task_completion",
    windows: {
      "7d":  { change: tc.week.percent,    velocity: null },
      "30d": { change: tc.month.percent,   velocity: null },
    },
    projectedDate: null,
    goalDateGap:   null,
    metrics: {
      week_percent:    tc.week.percent,
      month_percent:   tc.month.percent,
      overall_percent: tc.overall.percent,
    },
  });

  return signals;
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

export function detectPatterns(ctx: ClientAIContext): {
  patternSignals: PatternSignal[];
  trendSignals:   TrendSignal[];
} {
  const patternSignals: PatternSignal[] = [
    detectStreak(ctx),
    detectPlateau(ctx),
    detectConsistency(ctx),
    detectAdherence(ctx),
  ];

  const trendSignals = buildTrendSignals(ctx);

  return { patternSignals, trendSignals };
}
