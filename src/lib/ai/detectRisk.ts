// ─────────────────────────────────────────────
// detectRisk — deterministic risk signal detection
//
// Reads ClientAIContext and produces RiskSignal[].
// Each signal follows BaseSignal with human-readable
// evidence for downstream explainability.
//
// No LLM, no side effects, pure computation.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  RiskSignal,
  SignalSeverity,
  SignalConfidence,
  SignalDirection,
} from "./types";

// ── Thresholds ───────────────────────────────

const COMPLIANCE_CRITICAL      = 30;
const COMPLIANCE_LOW           = 50;
const COMPLIANCE_DROP_MODERATE = 10;
const COMPLIANCE_DROP_SEVERE   = 20;

const DISENGAGE_DAYS_EARLY     = 7;
const DISENGAGE_DAYS_MODERATE  = 14;
const DISENGAGE_DAYS_SEVERE    = 21;

// ── Internal helpers (preserved from v1) ─────

function daysSinceLastLog(ctx: ClientAIContext): number {
  const selectedDate = new Date(ctx.selectedDate + "T00:00:00").getTime();

  const candidates: string[] = [];
  if (ctx.weightLog.length > 0) {
    candidates.push(ctx.weightLog[ctx.weightLog.length - 1].date);
  }
  if (ctx.progressLog.length > 0) {
    candidates.push(ctx.progressLog[ctx.progressLog.length - 1].date);
  }

  if (candidates.length === 0) return 999;

  const latestLog = candidates.sort().pop()!;
  const logTime   = new Date(latestLog + "T00:00:00").getTime();
  return Math.max(0, Math.floor((selectedDate - logTime) / 86_400_000));
}

// ── Signal builders ──────────────────────────

function detectComplianceBelowTarget(ctx: ClientAIContext): RiskSignal {
  const { week, month, overall } = ctx.compliance;
  const detected = week.percent < COMPLIANCE_TARGET;

  let severity: SignalSeverity = "none";
  if (week.percent < COMPLIANCE_CRITICAL)   severity = "critical";
  else if (week.percent < COMPLIANCE_LOW)   severity = "high";
  else if (detected)                        severity = "medium";

  const evidence: string[] = [];
  if (detected) {
    evidence.push(`Week compliance is ${week.percent}%, below the ${COMPLIANCE_TARGET}% target`);
    evidence.push(`Month compliance is ${month.percent}%`);
    evidence.push(`Overall compliance is ${overall.percent}%`);
    if (ctx.compliance.today.total > 0) {
      const missed = ctx.compliance.today.total - ctx.compliance.today.completed;
      if (missed > 0) evidence.push(`${missed} of ${ctx.compliance.today.total} tasks incomplete today`);
    }
  }

  return {
    key:        "compliance_below_target",
    label:      detected
      ? `Week compliance ${week.percent}% is below ${COMPLIANCE_TARGET}% target`
      : `Week compliance ${week.percent}% meets target`,
    detected,
    severity,
    confidence: "high",
    category:   "compliance",
    evidence,
    metrics: {
      compliance_week:    week.percent,
      compliance_month:   month.percent,
      compliance_overall: overall.percent,
      target:             COMPLIANCE_TARGET,
    },
  };
}

function detectComplianceDeclining(ctx: ClientAIContext): RiskSignal {
  const { week, month, overall } = ctx.compliance;
  const weekVsMonth   = week.percent - month.percent;
  const weekVsOverall = week.percent - overall.percent;

  let direction: SignalDirection;
  let detected = false;
  let severity: SignalSeverity = "none";

  if (week.percent < COMPLIANCE_CRITICAL) {
    direction = "declining";
    detected  = true;
    severity  = "critical";
  } else if (weekVsMonth <= -COMPLIANCE_DROP_SEVERE) {
    direction = "declining";
    detected  = true;
    severity  = "high";
  } else if (weekVsMonth <= -COMPLIANCE_DROP_MODERATE) {
    direction = "declining";
    detected  = true;
    severity  = "medium";
  } else if (weekVsMonth >= COMPLIANCE_DROP_MODERATE) {
    direction = "improving";
  } else {
    direction = "stable";
  }

  const evidence: string[] = [];
  if (detected) {
    evidence.push(`7-day compliance (${week.percent}%) is ${Math.abs(weekVsMonth)} points lower than 30-day (${month.percent}%)`);
    if (weekVsOverall < -5) {
      evidence.push(`Also ${Math.abs(weekVsOverall)} points below overall average (${overall.percent}%)`);
    }
  } else if (direction === "improving") {
    evidence.push(`7-day compliance (${week.percent}%) is ${weekVsMonth} points above 30-day (${month.percent}%)`);
  }

  return {
    key:        "compliance_drop",
    label:      detected
      ? `Compliance declining: week ${Math.abs(weekVsMonth)} points below month`
      : `Compliance trajectory is ${direction}`,
    detected,
    severity,
    confidence: Math.abs(weekVsMonth) >= COMPLIANCE_DROP_SEVERE ? "high" : "medium",
    direction,
    category:   "compliance",
    evidence,
    metrics: {
      compliance_7d:   week.percent,
      compliance_30d:  month.percent,
      week_vs_month:   weekVsMonth,
      week_vs_overall: weekVsOverall,
    },
  };
}

function detectDisengagement(ctx: ClientAIContext): RiskSignal {
  const daysSince = daysSinceLastLog(ctx);

  const indicators: string[] = [];
  const evidence: string[] = [];

  if (ctx.tasks.length > 0 && ctx.compliance.today.completed === 0) {
    indicators.push("zero_tasks_today");
    evidence.push(`0 of ${ctx.compliance.today.total} tasks completed today`);
  }

  if (ctx.streak === 0 && ctx.tasks.length > 0) {
    indicators.push("streak_broken");
    evidence.push("Daily streak is broken (0 consecutive days)");
  }

  if (ctx.compliance.week.percent < COMPLIANCE_LOW) {
    indicators.push("week_compliance_below_50");
    evidence.push(`Week compliance is only ${ctx.compliance.week.percent}%`);
  }

  if (daysSince >= DISENGAGE_DAYS_EARLY) {
    indicators.push("no_recent_log");
    evidence.push(`No weight or progress log for ${daysSince} days`);
  }

  if (!ctx.goal) {
    indicators.push("no_active_goal");
    evidence.push("No active goal is set");
  }

  if (ctx.tasks.length === 0) {
    indicators.push("no_active_tasks");
    evidence.push("No active tasks are assigned");
  }

  let severity: SignalSeverity = "none";
  let confidence: SignalConfidence = "low";

  if (daysSince >= DISENGAGE_DAYS_SEVERE || indicators.length >= 4) {
    severity   = "high";
    confidence = "high";
  } else if (daysSince >= DISENGAGE_DAYS_MODERATE || indicators.length >= 3) {
    severity   = "medium";
    confidence = "high";
  } else if (daysSince >= DISENGAGE_DAYS_EARLY || indicators.length >= 2) {
    severity   = "low";
    confidence = "medium";
  }

  const detected = severity !== "none";

  return {
    key:        "disengagement",
    label:      detected
      ? `Disengagement risk: ${indicators.length} warning indicators`
      : "No disengagement indicators",
    detected,
    severity,
    confidence,
    category:   "engagement",
    evidence,
    metrics: {
      days_since_log:   daysSince,
      indicator_count:  indicators.length,
      streak:           ctx.streak,
    },
  };
}

function detectProgressBehind(ctx: ClientAIContext): RiskSignal {
  const t = ctx.progressTrends;
  const detected = t?.status === "behind";

  const evidence: string[] = [];
  if (detected && t) {
    evidence.push(`Progress trend status is "behind"`);
    if (t.projectedDate && t.goalDate) {
      const proj = new Date(t.projectedDate + "T00:00:00").getTime();
      const goal = new Date(t.goalDate      + "T00:00:00").getTime();
      const gap  = Math.round((proj - goal) / 86_400_000);
      evidence.push(`Projected completion is ${gap} days after goal date`);
      evidence.push(`Goal date: ${t.goalDate}, projected: ${t.projectedDate}`);
    }
    if (t.velocity30d != null) {
      evidence.push(`30-day velocity: ${t.velocity30d.toFixed(3)} ${t.unit}/day`);
    }
  }

  return {
    key:        "progress_behind",
    label:      detected
      ? "Progress is behind schedule"
      : t ? `Progress is ${t.status}` : "No progress data",
    detected,
    severity:   detected ? "medium" : "none",
    confidence: t?.velocity30d != null ? "high" : t?.velocity7d != null ? "medium" : "low",
    category:   "progress",
    evidence,
    metrics: {
      status:          t?.status ?? null,
      velocity_7d:     t?.velocity7d ?? null,
      velocity_30d:    t?.velocity30d ?? null,
      projected_date:  t?.projectedDate ?? null,
      goal_date:       t?.goalDate ?? null,
    },
  };
}

function detectNoGoal(ctx: ClientAIContext): RiskSignal {
  const detected = !ctx.goal;

  return {
    key:        "no_active_goal",
    label:      detected ? "No active goal set" : `Goal: ${ctx.goal!.goalName}`,
    detected,
    severity:   detected ? "medium" : "none",
    confidence: "high",
    category:   "behavior",
    evidence:   detected
      ? ["Client has no active goal — progress tracking and projections unavailable"]
      : [],
    metrics:    detected
      ? {}
      : { goal_progress: ctx.goal!.goalProgress, goal_category: ctx.goal!.goal_category },
  };
}

function detectLowStatusScore(ctx: ClientAIContext): RiskSignal {
  const score    = ctx.statusScore.overallScore;
  const detected = score < 40;

  let severity: SignalSeverity = "none";
  if (score < 20)      severity = "high";
  else if (score < 40) severity = "medium";

  const evidence: string[] = [];
  if (detected) {
    evidence.push(`Overall status score is ${score}%`);
    evidence.push(`Compliance component: ${ctx.statusScore.complianceScore}%`);
    evidence.push(`Progress component: ${ctx.statusScore.progressScore}%`);
    evidence.push("Score is weighted 60% compliance + 40% progress");
  }

  return {
    key:        "low_status_score",
    label:      detected
      ? `Overall status score is low (${score}%)`
      : `Status score is ${score}%`,
    detected,
    severity,
    confidence: "high",
    category:   "progress",
    evidence,
    metrics: {
      overall_score:    score,
      compliance_score: ctx.statusScore.complianceScore,
      progress_score:   ctx.statusScore.progressScore,
    },
  };
}

// ── Public API ───────────────────────────────

export function detectRisk(ctx: ClientAIContext): RiskSignal[] {
  return [
    detectComplianceBelowTarget(ctx),
    detectComplianceDeclining(ctx),
    detectDisengagement(ctx),
    detectProgressBehind(ctx),
    detectNoGoal(ctx),
    detectLowStatusScore(ctx),
  ];
}
