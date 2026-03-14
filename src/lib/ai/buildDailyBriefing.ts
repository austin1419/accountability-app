// ─────────────────────────────────────────────
// buildDailyBriefing — presentation layer
//
// Pure mapping transform over existing AI outputs.
// No new signal detection. No new compliance math.
// No database queries. No LLM calls.
//
// Produces a single cohesive coaching message that
// reads like a note from a real coach — not a
// technical dashboard or analytics report.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  ClientAnalysis,
  ClientSummary,
  CoachSummary,
  AIFeatureReadiness,
  AIMemory,
  DailyBriefing,
  BriefingMomentum,
  BriefingRisk,
  BriefingMetric,
  CoachingMessage,
} from "./types";

// ═══════════════════════════════════════════════
// 1. MOMENTUM STATE MAPPING
// ═══════════════════════════════════════════════

function mapMomentum(analysis: ClientAnalysis): BriefingMomentum {
  if (analysis.riskLevel === "critical") return "at_risk";

  switch (analysis.momentumState) {
    case "surging":  return "building";
    case "building": return "building";
    case "steady":
      return analysis.riskLevel === "high" ? "declining" : "steady";
    case "slipping": return "declining";
    case "stalled":  return "at_risk";
  }
}

// ═══════════════════════════════════════════════
// 2. RISK LEVEL MAPPING
// ═══════════════════════════════════════════════

function mapRisk(analysis: ClientAnalysis): BriefingRisk {
  switch (analysis.riskLevel) {
    case "critical": return "high";
    case "high":     return "high";
    case "moderate": return "medium";
    case "low":      return "low";
  }
}

// ═══════════════════════════════════════════════
// 3. GREETING
// ═══════════════════════════════════════════════

function buildGreeting(ctx: ClientAIContext): string {
  const firstName = ctx.client.name.split(" ")[0];
  const hour = new Date().getHours();

  if (hour < 12)  return `Good morning, ${firstName}`;
  if (hour < 17)  return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

// ═══════════════════════════════════════════════
// 4. COACHING MESSAGE
// ═══════════════════════════════════════════════

/**
 * Build the snapshot — a brief summary of how things are going.
 * Synthesizes task completion + momentum + top progress signal.
 * Uses coaching language only — no technical terms.
 */
function buildSnapshot(
  ctx: ClientAIContext,
  _analysis: ClientAnalysis,
  clientSummary: ClientSummary,
  momentum: BriefingMomentum,
): string {
  const weekPct = ctx.compliance.week.percent;
  const streak  = ctx.streak;
  const goalPct = ctx.goal?.goalProgress ?? 0;

  // Lead with the top progress observation if available
  const topProgress = clientSummary.progressItems[0];
  if (topProgress) {
    return topProgress.detail;
  }

  // Goal progress + streak narrative
  if (goalPct > 0 && streak >= 3) {
    return `You're ${goalPct}% toward your goal and on a ${streak}-day streak. Strong consistency.`;
  }

  // Good week + streak
  if (weekPct >= COMPLIANCE_TARGET && streak >= 3) {
    return `You've completed ${weekPct}% of your tasks this week with a ${streak}-day streak. Solid work.`;
  }
  if (weekPct >= COMPLIANCE_TARGET) {
    return `You've hit ${weekPct}% of your tasks this week. Solid effort.`;
  }

  // Momentum-based fallback
  switch (momentum) {
    case "building":
      return "You're building good momentum. Keep showing up.";
    case "steady":
      return "You're staying consistent. Your habits are holding.";
    case "declining":
      return "Things have slowed down a bit this week. Let's talk about why.";
    case "at_risk":
      return "You've been less active lately. Today is a good day to reset.";
  }
}

/**
 * Build the insight — one meaningful observation based on the data.
 * Picks the single most important signal to surface.
 *
 * IMPORTANT: Uses client-summary and coach-summary language only.
 * Raw signal evidence can contain technical terms ("velocity",
 * "threshold", "spread") that don't belong in a coaching message.
 */
function buildInsight(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
  clientSummary: ClientSummary,
  coachSummary: CoachSummary,
): string {
  // 1. Critical/high risk — translate to coaching language
  const urgentRisk = analysis.riskSignals.find(
    (s) => s.detected && (s.severity === "critical" || s.severity === "high"),
  );
  if (urgentRisk) {
    // Use coach focus areas (already in coaching language) instead of raw evidence
    const coachFocus = coachSummary.risks[0];
    if (coachFocus) return coachFocus.detail;
    // Fallback: construct coaching-safe message from risk category
    if (urgentRisk.category === "compliance") {
      return "Your task completion has dropped — that's the habit to rebuild first.";
    }
    if (urgentRisk.category === "engagement") {
      return "You've been less active recently. Getting back on track starts with today.";
    }
    if (urgentRisk.category === "progress") {
      return "Your progress has slowed, but the bigger signal right now is daily consistency.";
    }
    return "There are a few things to address — let's focus on the most important one today.";
  }

  // 2. Plateau — coaching language
  const plateau = analysis.patternSignals.find(
    (s) => s.key === "plateau" && s.detected && s.confidence !== "low",
  );
  if (plateau) {
    const weekPct = ctx.compliance.week.percent;
    if (weekPct >= COMPLIANCE_TARGET) {
      return "Your weight has held steady despite strong effort — your body may need time to adjust, or it might be time for your coach to tweak things.";
    }
    return "Progress has stalled a bit. Tightening up your daily habits is the first lever to pull.";
  }

  // 3. Top win — positive reinforcement (already coaching language)
  const topWin = clientSummary.wins[0];
  if (topWin) {
    return topWin.detail;
  }

  // 4. Primary trend — use client summary (coaching language)
  const trendProgress = clientSummary.progressItems.find(
    (item) => item.signalKey.startsWith("trend_"),
  );
  if (trendProgress) {
    return trendProgress.detail;
  }

  // 5. Coach focus area (already coaching language)
  if (coachSummary.focusAreas.length > 0) {
    return coachSummary.focusAreas[0].detail;
  }

  // 6. Task-based observation
  const todayPct = ctx.compliance.today.percent;
  if (todayPct === 100) {
    return "You've completed all your tasks today — that's the behavior that compounds.";
  }
  if (todayPct > 0) {
    return "You're making progress today. Finishing strong builds the habit.";
  }

  return "Your consistency is what drives results. Keep showing up.";
}

/**
 * Build the guidance — a short coaching statement.
 * Contextual to the current momentum and risk state.
 */
function buildGuidance(
  _analysis: ClientAnalysis,
  coachSummary: CoachSummary,
  momentum: BriefingMomentum,
): string {
  // Use coach intervention reason if available and noteworthy
  if (coachSummary.intervention === "intervene" || coachSummary.intervention === "escalate") {
    return coachSummary.interventionReason;
  }

  // Momentum-tuned coaching statement
  switch (momentum) {
    case "building":
      return "You're in a great rhythm. Don't overthink it — just keep doing what you're doing.";
    case "steady":
      return "Consistency is the game. Stay locked in on today's tasks.";
    case "declining":
      return "A dip is normal. What matters is what you do today. Pick one task and start there.";
    case "at_risk":
      return "No judgment — just a reset. Focus on completing even one task today to rebuild the habit.";
  }
}

/**
 * Build the action — one clear, actionable suggestion.
 * Derived from client-facing focus suggestions.
 */
function buildAction(
  ctx: ClientAIContext,
  clientSummary: ClientSummary,
  _analysis: ClientAnalysis,
): string {
  // Use the top focus suggestion if available
  const topSuggestion = clientSummary.focusSuggestions[0];
  if (topSuggestion) {
    return topSuggestion.title;
  }

  // Incomplete tasks today → nudge toward completion
  const incompleteTasks = ctx.tasks.filter((t) => !t.done);
  if (incompleteTasks.length > 0) {
    if (incompleteTasks.length === 1) {
      return `Finish "${incompleteTasks[0].name}" to close out today.`;
    }
    return `You have ${incompleteTasks.length} tasks left today. Start with the easiest one.`;
  }

  // All done today
  if (ctx.tasks.length > 0 && incompleteTasks.length === 0) {
    return "All tasks done today. Log your progress if you haven't already.";
  }

  return "Complete today's tasks to keep building momentum.";
}

/**
 * Enrich the insight with relevant memory context.
 * If a memory adds meaningful depth to the base insight,
 * append it as a natural follow-up sentence.
 */
function enrichInsightWithMemory(
  baseInsight: string,
  memories: AIMemory[],
  ctx: ClientAIContext,
): string {
  if (memories.length === 0) return baseInsight;

  // Look for a pattern memory that adds context
  const patternMemory = memories.find((m) => m.memoryType === "pattern");
  if (patternMemory) {
    // Weekend pattern + it's a weekend
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && patternMemory.memoryText.toLowerCase().includes("weekend")) {
      return `${baseInsight} Weekends have been tough for you before — staying aware of that is half the battle.`;
    }
    // Compliance drop pattern
    if (patternMemory.memoryText.toLowerCase().includes("dropped")) {
      return `${baseInsight} You've had dips like this before and bounced back.`;
    }
  }

  // Recent milestone reinforcement
  const milestone = memories.find((m) => m.memoryType === "milestone");
  if (milestone && ctx.streak > 0) {
    // Only reference if the milestone is relevant to current state
    if (milestone.memoryText.includes("streak") && ctx.streak >= 3) {
      return `${baseInsight} You've built streaks before — this one is worth protecting.`;
    }
  }

  return baseInsight;
}

function buildCoachingMessage(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  clientSummary: ClientSummary,
  coachSummary: CoachSummary,
  momentum: BriefingMomentum,
  memories: AIMemory[],
): CoachingMessage {
  const baseInsight = buildInsight(analysis, ctx, clientSummary, coachSummary);

  return {
    snapshot: buildSnapshot(ctx, analysis, clientSummary, momentum),
    insight:  enrichInsightWithMemory(baseInsight, memories, ctx),
    guidance: buildGuidance(analysis, coachSummary, momentum),
    action:   buildAction(ctx, clientSummary, analysis),
  };
}

// ═══════════════════════════════════════════════
// 5. SUPPORTING METRICS
// ═══════════════════════════════════════════════

function buildMetrics(ctx: ClientAIContext): BriefingMetric[] {
  const metrics: BriefingMetric[] = [];

  // Weekly compliance
  const weekPct = ctx.compliance.week.percent;
  metrics.push({
    label:  "This Week",
    value:  `${weekPct}%`,
    status: weekPct >= COMPLIANCE_TARGET ? "gold" : "red",
  });

  // Monthly compliance
  const monthPct = ctx.compliance.month.percent;
  metrics.push({
    label:  "This Month",
    value:  `${monthPct}%`,
    status: monthPct >= COMPLIANCE_TARGET ? "gold" : "red",
  });

  // Goal progress (if goal exists)
  if (ctx.goal) {
    metrics.push({
      label:  "Goal Progress",
      value:  `${ctx.goal.goalProgress}%`,
      status: "gold",
    });
  }

  // Streak
  if (ctx.streak > 0) {
    metrics.push({
      label:  "Streak",
      value:  `${ctx.streak} day${ctx.streak === 1 ? "" : "s"}`,
      status: ctx.streak >= 3 ? "gold" : "neutral",
    });
  }

  return metrics;
}

// ═══════════════════════════════════════════════
// 6. GATED BRIEFING
// ═══════════════════════════════════════════════

function buildGatedBriefing(
  ctx: ClientAIContext,
  readiness: AIFeatureReadiness,
): DailyBriefing {
  const firstName = ctx.client.name.split(" ")[0];

  return {
    id:              `${ctx.client.userId}-${ctx.selectedDate}-gated`,
    generatedAt:     new Date().toISOString(),
    greeting:        `Hey, ${firstName}`,
    momentumState:   "steady",
    riskLevel:       "low",
    coachingMessage: {
      snapshot: "Your AI coach is getting ready.",
      insight:  readiness.blockedReason ?? "Keep logging your daily tasks and progress to unlock your Daily Briefing.",
      guidance: "The more consistently you log, the better your coaching will be.",
      action:   "Complete today's tasks",
    },
    metrics:         [],
    sourceSignals:   [],
  };
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

export function buildDailyBriefing(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  clientSummary: ClientSummary,
  coachSummary: CoachSummary,
  readiness: AIFeatureReadiness,
  memories: AIMemory[] = [],
): DailyBriefing {
  if (!readiness.available) {
    return buildGatedBriefing(ctx, readiness);
  }

  const momentumState = mapMomentum(analysis);
  const riskLevel     = mapRisk(analysis);

  return {
    id:              `${ctx.client.userId}-${ctx.selectedDate}`,
    generatedAt:     new Date().toISOString(),
    greeting:        buildGreeting(ctx),
    momentumState,
    riskLevel,
    coachingMessage: buildCoachingMessage(ctx, analysis, clientSummary, coachSummary, momentumState, memories),
    metrics:         buildMetrics(ctx),
    sourceSignals:   analysis.allSignals.filter((s) => s.detected).map((s) => s.key),
  };
}
