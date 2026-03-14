// ─────────────────────────────────────────────
// buildCoachSummary — deterministic coach-facing summary
//
// Reads ClientAIContext + ClientAnalysis and produces
// a structured CoachSummary for the coach dashboard.
//
// Every item traces back to a signal key + evidence.
// No LLM, no side effects, pure computation.
// ─────────────────────────────────────────────

import type {
  ClientAIContext,
  ClientAnalysis,
  CoachSummary,
  SummaryItem,
  SummaryPriority,
  InterventionPriority,
  BaseSignal,
} from "./types";

// ── Severity → Priority mapping ──────────────

function severityToPriority(severity: BaseSignal["severity"]): SummaryPriority {
  switch (severity) {
    case "critical": return "urgent";
    case "high":     return "high";
    case "medium":   return "medium";
    default:         return "low";
  }
}

// ── Build risk items ─────────────────────────

function buildRisks(analysis: ClientAnalysis): SummaryItem[] {
  return analysis.riskSignals
    .filter((s) => s.detected)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    })
    .map((s) => ({
      title:     s.label,
      detail:    s.evidence.slice(0, 2).join(". ") || "No additional detail",
      priority:  severityToPriority(s.severity),
      signalKey: s.key,
      evidence:  s.evidence,
    }));
}

// ── Build focus areas ────────────────────────
// Focus areas come from detected patterns + trends that
// suggest where the coach should direct attention.

function buildFocusAreas(analysis: ClientAnalysis, ctx: ClientAIContext): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Plateau → focus on program adjustment
  const plateau = analysis.patternSignals.find((s) => s.key === "plateau");
  if (plateau?.detected) {
    items.push({
      title:     "Program adjustment needed",
      detail:    plateau.evidence[0] ?? "Progress has stalled despite consistent effort",
      priority:  plateau.severity === "high" ? "high" : "medium",
      signalKey: plateau.key,
      evidence:  plateau.evidence,
    });
  }

  // Declining consistency → focus on habit reinforcement
  const consistency = analysis.patternSignals.find((s) => s.key === "consistency");
  if (consistency?.direction === "declining") {
    items.push({
      title:     "Habit consistency declining",
      detail:    consistency.evidence[0] ?? "Compliance dropping across recent window",
      priority:  consistency.severity === "medium" ? "high" : "medium",
      signalKey: consistency.key,
      evidence:  consistency.evidence,
    });
  }

  // Broken/fragile streak → focus on re-engagement
  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  const streakLevel = streak?.metrics?.["streak_level"] as string | undefined;
  if (streakLevel === "broken" || streakLevel === "fragile") {
    items.push({
      title:     streakLevel === "broken" ? "Rebuild daily streak" : "Protect early streak",
      detail:    streak!.evidence[0] ?? "Streak needs attention",
      priority:  streakLevel === "broken" ? "high" : "medium",
      signalKey: streak!.key,
      evidence:  streak!.evidence,
    });
  }

  // Primary trend declining → focus on metric trajectory
  const primaryTrend = analysis.trendSignals.find((s) => s.metric !== "task_completion");
  if (primaryTrend?.direction === "declining") {
    items.push({
      title:     `${capitalize(primaryTrend.metric.replace(/_/g, " "))} trending wrong direction`,
      detail:    primaryTrend.evidence[0] ?? "Primary metric moving away from goal",
      priority:  "high",
      signalKey: primaryTrend.key,
      evidence:  primaryTrend.evidence,
    });
  }

  // No goal set → focus on goal setting
  if (!ctx.goal) {
    const noGoalSignal = analysis.riskSignals.find((s) => s.key === "no_active_goal");
    items.push({
      title:     "Set an active goal",
      detail:    "Client has no active goal — progress tracking and projections unavailable",
      priority:  "high",
      signalKey: noGoalSignal?.key ?? "no_active_goal",
      evidence:  noGoalSignal?.evidence ?? [],
    });
  }

  // Sort by priority
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

// ── Build pattern observations ───────────────

function buildPatterns(analysis: ClientAnalysis, ctx: ClientAIContext): SummaryItem[] {
  const items: SummaryItem[] = [];

  // Always include streak state
  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  if (streak) {
    items.push({
      title:     streak.label,
      detail:    streak.evidence.join(". "),
      priority:  severityToPriority(streak.severity),
      signalKey: streak.key,
      evidence:  streak.evidence,
    });
  }

  // Always include adherence
  const adherence = analysis.patternSignals.find((s) => s.key === "daily_adherence");
  if (adherence?.detected) {
    items.push({
      title:     adherence.label,
      detail:    adherence.evidence.join(". "),
      priority:  severityToPriority(adherence.severity),
      signalKey: adherence.key,
      evidence:  adherence.evidence,
    });
  }

  // Plateau if detected
  const plateau = analysis.patternSignals.find((s) => s.key === "plateau");
  if (plateau?.detected) {
    items.push({
      title:     plateau.label,
      detail:    plateau.evidence.slice(0, 2).join(". "),
      priority:  severityToPriority(plateau.severity),
      signalKey: plateau.key,
      evidence:  plateau.evidence,
    });
  }

  // Consistency observation
  const consistency = analysis.patternSignals.find((s) => s.key === "consistency");
  if (consistency) {
    items.push({
      title:     consistency.label,
      detail:    consistency.evidence.join(". "),
      priority:  severityToPriority(consistency.severity),
      signalKey: consistency.key,
      evidence:  consistency.evidence,
    });
  }

  // Progress status
  const primaryTrend = analysis.trendSignals.find((s) => s.metric !== "task_completion");
  if (primaryTrend?.detected) {
    items.push({
      title:     primaryTrend.label,
      detail:    primaryTrend.evidence.slice(0, 2).join(". "),
      priority:  severityToPriority(primaryTrend.severity),
      signalKey: primaryTrend.key,
      evidence:  primaryTrend.evidence,
    });
  }

  return items;
}

// ── Determine intervention priority ──────────

function deriveIntervention(analysis: ClientAnalysis): {
  intervention: InterventionPriority;
  reason: string;
} {
  const { coachingStatus, riskLevel, momentumState } = analysis;

  if (coachingStatus === "critical") {
    return {
      intervention: "escalate",
      reason:       "Multiple critical risk factors detected — immediate coach attention needed",
    };
  }

  if (coachingStatus === "at_risk") {
    const topRisk = analysis.riskSignals
      .filter((s) => s.detected)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      })[0];

    return {
      intervention: "intervene",
      reason:       topRisk
        ? `Primary concern: ${topRisk.label}`
        : "Client is at risk — proactive coaching recommended",
    };
  }

  if (coachingStatus === "needs_attention") {
    if (momentumState === "stalled") {
      return {
        intervention: "nudge",
        reason:       "Progress has stalled — consider a check-in or program tweak",
      };
    }
    return {
      intervention: "nudge",
      reason:       "Moderate risk signals present — a timely nudge could prevent decline",
    };
  }

  if (coachingStatus === "thriving") {
    return {
      intervention: "none",
      reason:       "Client is thriving — reinforce positive momentum",
    };
  }

  // on_track
  return {
    intervention: "monitor",
    reason:       "Client is on track — continue monitoring",
  };
}

// ── Generate headline ────────────────────────

function generateHeadline(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
): string {
  const name = ctx.client.name.split(" ")[0]; // first name

  switch (analysis.coachingStatus) {
    case "critical":
      return `${name} needs immediate attention — multiple risk factors`;
    case "at_risk": {
      const topRisk = analysis.riskSignals.find((s) => s.detected && s.severity !== "none");
      return `${name} is at risk${topRisk ? `: ${topRisk.label.toLowerCase()}` : ""}`;
    }
    case "needs_attention":
      if (analysis.momentumState === "stalled") {
        return `${name}'s progress has stalled — consider a check-in`;
      }
      return `${name} needs attention — momentum is ${analysis.momentumState}`;
    case "thriving":
      if (analysis.momentumState === "surging") {
        return `${name} is surging — ${ctx.streak}-day streak`;
      }
      return `${name} is thriving — strong momentum`;
    case "on_track":
      return `${name} is on track — steady progress`;
  }
}

// ── Helper ───────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Public API ───────────────────────────────

export function buildCoachSummary(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): CoachSummary {
  const risks      = buildRisks(analysis);
  const focusAreas = buildFocusAreas(analysis, ctx);
  const patterns   = buildPatterns(analysis, ctx);
  const { intervention, reason } = deriveIntervention(analysis);
  const headline   = generateHeadline(analysis, ctx);

  return {
    clientName:         ctx.client.name,
    selectedDate:       ctx.selectedDate,
    coachingStatus:     analysis.coachingStatus,
    riskLevel:          analysis.riskLevel,
    momentumState:      analysis.momentumState,
    overallScore:       analysis.statusScore.overallScore,
    risks,
    focusAreas,
    patterns,
    intervention,
    interventionReason: reason,
    headline,
  };
}
