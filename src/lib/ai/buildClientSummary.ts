// ─────────────────────────────────────────────
// buildClientSummary — deterministic client-facing summary
//
// Reads ClientAIContext + ClientAnalysis and produces
// a structured ClientSummary for client-facing insights.
//
// Tone: encouraging, actionable, evidence-based.
// Never exposes raw risk language to the client.
// Every item traces back to a signal key + evidence.
//
// No LLM, no side effects, pure computation.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  ClientAnalysis,
  ClientSummary,
  SummaryItem,
  SummaryPriority,
} from "./types";

// ── Progress interpretation ──────────────────
// Translate metric trends into client-friendly observations.

function buildProgressItems(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Goal progress
  if (ctx.goal) {
    const pct = ctx.goal.goalProgress;
    const goalName = ctx.goal.goalName;

    let detail: string;
    if (pct >= 90)      detail = `Almost there — ${pct}% of the way to your goal`;
    else if (pct >= 70) detail = `Strong progress — ${pct}% toward your goal`;
    else if (pct >= 40) detail = `Making progress — ${pct}% toward your goal`;
    else if (pct > 0)   detail = `Early stages — ${pct}% toward your goal`;
    else                 detail = "Just getting started — every step counts";

    items.push({
      title:     goalName,
      detail,
      priority:  "medium",
      signalKey: "goal_progress",
      evidence:  [`Goal progress: ${pct}%`, `Goal: ${goalName}`],
    });
  }

  // Primary metric trend
  const primaryTrend = analysis.trendSignals.find((s) => s.metric !== "task_completion");
  if (primaryTrend?.detected) {
    const dir = primaryTrend.direction;
    let detail: string;

    if (dir === "improving") {
      detail = "Your numbers are moving in the right direction";
    } else if (dir === "stable") {
      detail = "Your numbers are holding steady";
    } else if (dir === "declining") {
      detail = "Your numbers have shifted — stay focused on your daily habits";
    } else {
      detail = "Tracking more data will help us see your trend";
    }

    // Add specific metric change if available
    const weekChange = primaryTrend.windows?.["7d"]?.change;
    if (weekChange != null && weekChange !== 0) {
      const metricLabel = primaryTrend.metric.replace(/_/g, " ");
      const sign = weekChange > 0 ? "+" : "";
      detail += ` (${metricLabel} ${sign}${weekChange} this week)`;
    }

    items.push({
      title:     `${capitalize(primaryTrend.metric.replace(/_/g, " "))} trend`,
      detail,
      priority:  dir === "declining" ? "high" : "low",
      signalKey: primaryTrend.key,
      evidence:  primaryTrend.evidence,
    });
  }

  // Projected completion
  if (primaryTrend?.projectedDate && ctx.goal?.goalDate) {
    const gap = primaryTrend.goalDateGap;
    let detail: string;

    if (gap != null && gap <= 0) {
      detail = `On pace to reach your goal${gap < -7 ? " ahead of schedule" : " on time"}`;
    } else if (gap != null) {
      detail = "Current pace needs a boost to hit your target date — small daily wins add up";
    } else {
      detail = "Keep logging to refine your projected timeline";
    }

    items.push({
      title:     "Projected timeline",
      detail,
      priority:  gap != null && gap > 0 ? "medium" : "low",
      signalKey: primaryTrend.key,
      evidence:  [`Projected: ${primaryTrend.projectedDate}`, `Goal date: ${ctx.goal.goalDate}`],
    });
  }

  return items;
}

// ── Wins / positive reinforcement ────────────
// Surface everything that's going well.

function buildWins(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Streak wins
  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  const streakLevel = streak?.metrics?.["streak_level"] as string | undefined;

  if (ctx.streak >= 14) {
    items.push({
      title:     `${ctx.streak}-day streak`,
      detail:    "Exceptional consistency — this level of discipline drives real results",
      priority:  "high",
      signalKey: streak?.key ?? "streak_momentum",
      evidence:  streak?.evidence ?? [],
    });
  } else if (ctx.streak >= 7) {
    items.push({
      title:     `${ctx.streak}-day streak`,
      detail:    "A full week of consistency — momentum is building",
      priority:  "medium",
      signalKey: streak?.key ?? "streak_momentum",
      evidence:  streak?.evidence ?? [],
    });
  } else if (ctx.streak >= 3) {
    items.push({
      title:     `${ctx.streak}-day streak`,
      detail:    "Solid start — keep this going and it becomes a habit",
      priority:  "medium",
      signalKey: streak?.key ?? "streak_momentum",
      evidence:  streak?.evidence ?? [],
    });
  }

  // Today's completion
  if (ctx.compliance.today.total > 0 && ctx.compliance.today.completed === ctx.compliance.today.total) {
    items.push({
      title:     "All tasks complete today",
      detail:    `${ctx.compliance.today.total} out of ${ctx.compliance.today.total} — perfect day`,
      priority:  "medium",
      signalKey: "daily_adherence",
      evidence:  [`${ctx.compliance.today.completed}/${ctx.compliance.today.total} tasks completed`],
    });
  }

  // Compliance above target
  if (ctx.compliance.week.percent >= COMPLIANCE_TARGET) {
    const consistency = analysis.patternSignals.find((s) => s.key === "consistency");
    items.push({
      title:     `${ctx.compliance.week.percent}% weekly compliance`,
      detail:    ctx.compliance.week.percent >= 90
        ? "Elite-level adherence this week"
        : "Meeting your compliance target — consistent effort pays off",
      priority:  "low",
      signalKey: consistency?.key ?? "consistency",
      evidence:  consistency?.evidence ?? [`Week: ${ctx.compliance.week.percent}%`],
    });
  }

  // Improving compliance (week > month)
  const compDrop = analysis.riskSignals.find((s) => s.key === "compliance_drop");
  if (compDrop?.direction === "improving") {
    items.push({
      title:     "Compliance improving",
      detail:    "Your recent effort is trending up compared to last month",
      priority:  "low",
      signalKey: compDrop.key,
      evidence:  compDrop.evidence,
    });
  }

  // Progress ahead of schedule
  const primaryTrend = analysis.trendSignals.find((s) => s.metric !== "task_completion");
  if (primaryTrend?.direction === "improving" && primaryTrend.goalDateGap != null && primaryTrend.goalDateGap < -7) {
    items.push({
      title:     "Ahead of schedule",
      detail:    `Current pace has you reaching your goal ${Math.abs(primaryTrend.goalDateGap)} days early`,
      priority:  "medium",
      signalKey: primaryTrend.key,
      evidence:  primaryTrend.evidence,
    });
  }

  // Goal progress milestones
  if (ctx.goal) {
    const pct = ctx.goal.goalProgress;
    if (pct >= 75) {
      items.push({
        title:     `${pct}% to goal`,
        detail:    "The finish line is in sight — stay locked in",
        priority:  "medium",
        signalKey: "goal_progress",
        evidence:  [`Goal progress: ${pct}%`],
      });
    } else if (pct >= 50) {
      items.push({
        title:     `Halfway there — ${pct}%`,
        detail:    "You've crossed the halfway mark — strong foundation built",
        priority:  "low",
        signalKey: "goal_progress",
        evidence:  [`Goal progress: ${pct}%`],
      });
    }
  }

  return items;
}

// ── Focus suggestions ────────────────────────
// Actionable, encouraging items for the client.
// Never uses "risk" language.

function buildFocusSuggestions(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Broken streak → rebuild
  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  const streakLevel = streak?.metrics?.["streak_level"] as string | undefined;

  if (streakLevel === "broken") {
    items.push({
      title:     "Start a new streak today",
      detail:    "Complete all your tasks today to start building momentum again",
      priority:  "high",
      signalKey: streak!.key,
      evidence:  streak!.evidence,
    });
  } else if (streakLevel === "fragile") {
    items.push({
      title:     "Keep your streak alive",
      detail:    `You're at ${ctx.streak} day${ctx.streak === 1 ? "" : "s"} — finishing today locks in your momentum`,
      priority:  "medium",
      signalKey: streak!.key,
      evidence:  streak!.evidence,
    });
  }

  // Incomplete tasks today
  const adherence = analysis.patternSignals.find((s) => s.key === "daily_adherence");
  const missed = (adherence?.metrics?.["missed"] as number | undefined) ?? 0;
  if (missed > 0 && missed <= 3) {
    const incomplete = ctx.tasks.filter((t) => !t.done);
    items.push({
      title:     `${missed} task${missed === 1 ? "" : "s"} left today`,
      detail:    `Finish up: ${incomplete.map((t) => t.name).join(", ")}`,
      priority:  "medium",
      signalKey: adherence?.key ?? "daily_adherence",
      evidence:  adherence?.evidence ?? [],
    });
  } else if (missed > 3) {
    items.push({
      title:     `${missed} tasks remaining today`,
      detail:    "Pick the most impactful ones and knock them out",
      priority:  "high",
      signalKey: adherence?.key ?? "daily_adherence",
      evidence:  adherence?.evidence ?? [],
    });
  }

  // Week compliance below target
  if (ctx.compliance.week.percent < COMPLIANCE_TARGET && ctx.compliance.week.percent > 0) {
    items.push({
      title:     "Build consistency this week",
      detail:    `Week compliance is ${ctx.compliance.week.percent}% — aim for ${COMPLIANCE_TARGET}%+ by completing today's tasks`,
      priority:  "medium",
      signalKey: "compliance_below_target",
      evidence:  [`Week: ${ctx.compliance.week.percent}%`, `Target: ${COMPLIANCE_TARGET}%`],
    });
  }

  // Plateau → try something different (client-friendly)
  const plateau = analysis.patternSignals.find((s) => s.key === "plateau");
  if (plateau?.detected) {
    items.push({
      title:     "Mix things up",
      detail:    "Your effort has been consistent — your coach may suggest adjustments to break through",
      priority:  "medium",
      signalKey: plateau.key,
      evidence:  plateau.evidence,
    });
  }

  // No recent logs
  const disengagement = analysis.riskSignals.find((s) => s.key === "disengagement");
  const daysSince = (disengagement?.metrics?.["days_since_log"] as number | undefined) ?? 0;
  if (daysSince >= 7) {
    items.push({
      title:     "Log your progress",
      detail:    `It's been ${daysSince} days since your last check-in — a quick log helps you and your coach stay aligned`,
      priority:  daysSince >= 14 ? "high" : "medium",
      signalKey: disengagement?.key ?? "disengagement",
      evidence:  disengagement?.evidence ?? [],
    });
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

// ── Generate headline ────────────────────────

function generateHeadline(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
): string {
  const { momentumState } = analysis;

  // Positive states
  if (momentumState === "surging") {
    return ctx.streak >= 14
      ? `${ctx.streak}-day streak — you're on fire`
      : "Crushing it — keep this energy going";
  }

  if (momentumState === "building") {
    return ctx.streak >= 7
      ? `${ctx.streak} days strong — momentum is building`
      : "Building momentum — great trajectory";
  }

  // Neutral
  if (momentumState === "steady") {
    if (ctx.compliance.today.completed === ctx.compliance.today.total && ctx.compliance.today.total > 0) {
      return "Solid day — all tasks complete";
    }
    return "Staying steady — keep showing up";
  }

  // Needs attention (client-friendly framing)
  if (momentumState === "stalled") {
    return "Time to break through — your coach is here to help";
  }

  // Slipping
  return "Every day is a fresh start — let's lock in today";
}

// ── Helper ───────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Public API ───────────────────────────────

export function buildClientSummary(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): ClientSummary {
  const progressItems  = buildProgressItems(analysis, ctx);
  const wins           = buildWins(analysis, ctx);
  const focusSuggestions = buildFocusSuggestions(analysis, ctx);
  const headline       = generateHeadline(analysis, ctx);

  return {
    clientName:      ctx.client.name,
    selectedDate:    ctx.selectedDate,
    momentumState:   analysis.momentumState,
    progressItems,
    wins,
    focusSuggestions,
    headline,
  };
}
