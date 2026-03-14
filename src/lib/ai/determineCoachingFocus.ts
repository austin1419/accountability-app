// ─────────────────────────────────────────────
// determineCoachingFocus — prioritization layer
//
// Deterministic engine that selects the single most
// important coaching focus for the user today.
//
// Runs AFTER signal detection and BEFORE briefing
// generation. The selected focus drives the tone,
// content, and framing of the coaching message.
//
// Priority order (highest → lowest):
//   1. Disengagement risk (client going dark)
//   2. Compliance crisis (< 30% week)
//   3. Broken streak + declining adherence
//   4. Plateau with good adherence
//   5. Consistency decline (week < month)
//   6. Low daily adherence (today < 50%)
//   7. Progress pacing (behind schedule)
//   8. Streak protection (active streak at risk)
//   9. Momentum reinforcement (things going well)
//
// No LLM. No side effects. Pure computation.
// ─────────────────────────────────────────────

import type {
  ClientAIContext,
  ClientAnalysis,
  AIMemory,
  KnowledgeContext,
  CoachingFocus,
  CoachingFocusArea,
  CoachingFocusMode,
} from "./types";

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function findSignal(analysis: ClientAnalysis, key: string) {
  return analysis.allSignals.find((s) => s.key === key);
}

function findRisk(analysis: ClientAnalysis, key: string) {
  return analysis.riskSignals.find((s) => s.key === key);
}

function findPattern(analysis: ClientAnalysis, key: string) {
  return analysis.patternSignals.find((s) => s.key === key);
}

function hasMemoryType(memories: AIMemory[], type: string): boolean {
  return memories.some((m) => m.memoryType === type);
}

function hasMemoryText(memories: AIMemory[], keyword: string): boolean {
  return memories.some((m) => m.memoryText.toLowerCase().includes(keyword.toLowerCase()));
}

function makeFocus(
  primaryFocus: CoachingFocusArea,
  focusMode: CoachingFocusMode,
  focusReason: string,
  supportingSignals: string[],
  secondaryFocus?: CoachingFocusArea,
): CoachingFocus {
  return { primaryFocus, focusMode, focusReason, supportingSignals, secondaryFocus };
}

// ═══════════════════════════════════════════════
// PRIORITY CASCADE
// ═══════════════════════════════════════════════
//
// Each check returns a CoachingFocus or null.
// First non-null result wins.

function checkDisengagement(
  analysis: ClientAnalysis,
  memories: AIMemory[],
): CoachingFocus | null {
  const signal = findRisk(analysis, "disengagement");
  if (!signal?.detected) return null;

  if (signal.severity === "high" || signal.severity === "critical") {
    return makeFocus(
      "disengagement_risk",
      "encourage",
      "Client is showing strong signs of disengagement — multiple warning indicators active",
      ["disengagement"],
    );
  }

  if (signal.severity === "medium") {
    // If they've disengaged before, escalate the framing
    const priorDisengagement = hasMemoryText(memories, "disengagement");
    return makeFocus(
      "disengagement_risk",
      priorDisengagement ? "correct" : "encourage",
      priorDisengagement
        ? "Disengagement pattern recurring — this has happened before"
        : "Early disengagement signs — intervene before it deepens",
      ["disengagement"],
    );
  }

  return null;
}

function checkComplianceCrisis(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): CoachingFocus | null {
  const signal = findRisk(analysis, "compliance_below_target");
  if (!signal?.detected) return null;

  if (signal.severity === "critical") {
    return makeFocus(
      "compliance_crisis",
      "simplify",
      "Week completion under 30% — simplify everything, focus on one task",
      ["compliance_below_target"],
      "adherence",
    );
  }

  if (signal.severity === "high") {
    // Check if this is a drop from a previously good pattern
    const drop = findRisk(analysis, "compliance_drop");
    const isDroppingFast = drop?.detected && drop.severity !== "none";
    return makeFocus(
      "compliance_crisis",
      isDroppingFast ? "correct" : "simplify",
      isDroppingFast
        ? "Compliance dropping fast — was higher recently, need to identify the blocker"
        : "Week completion under 50% — reduce complexity and rebuild the habit",
      ["compliance_below_target", ...(isDroppingFast ? ["compliance_drop"] : [])],
    );
  }

  return null;
}

function checkBrokenStreak(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): CoachingFocus | null {
  const streak = findPattern(analysis, "streak_momentum");
  if (!streak) return null;

  const streakLevel = streak.metrics?.["streak_level"] as string | undefined;
  if (streakLevel !== "broken") return null;

  // Broken streak + declining adherence = focus on rebuilding
  const adherence = findPattern(analysis, "daily_adherence");
  const todayBad = adherence?.detected && adherence.severity !== "none";

  return makeFocus(
    "adherence",
    "encourage",
    todayBad
      ? "Streak broken and today's tasks are behind — focus on completing something today"
      : "Streak broken — today is the day to start a new one",
    ["streak_momentum", ...(todayBad ? ["daily_adherence"] : [])],
    "consistency",
  );
}

function checkPlateau(
  analysis: ClientAnalysis,
  ctx: ClientAIContext,
  knowledge: KnowledgeContext | undefined,
): CoachingFocus | null {
  const signal = findPattern(analysis, "plateau");
  if (!signal?.detected || signal.confidence === "low") return null;

  // Plateau + good adherence = the interesting case (doing the work but not seeing results)
  const weekPct = ctx.compliance.week.percent;
  if (weekPct < 60) return null; // Low adherence is the real problem, not plateau

  const hasPlateauKnowledge = knowledge?.matchedScenarios.includes("fat_loss_plateau") ?? false;

  return makeFocus(
    "plateau",
    "caution",
    weekPct >= 80
      ? "Weight has stalled despite strong effort — may need a coaching adjustment"
      : "Plateau detected with moderate adherence — tighten habits before changing the plan",
    ["plateau", ...(hasPlateauKnowledge ? ["knowledge:fat_loss_plateau"] : [])],
  );
}

function checkConsistencyDecline(
  analysis: ClientAnalysis,
): CoachingFocus | null {
  const signal = findPattern(analysis, "consistency");
  if (!signal || signal.direction !== "declining") return null;
  if (signal.severity === "none") return null;

  return makeFocus(
    "consistency",
    "correct",
    "Recent consistency is dropping below the monthly average — catch it early",
    ["consistency"],
    "adherence",
  );
}

function checkDailyAdherence(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): CoachingFocus | null {
  const signal = findPattern(analysis, "daily_adherence");
  if (!signal?.detected) return null;

  // Only trigger as primary focus if today is significantly behind
  if (signal.severity === "high") {
    return makeFocus(
      "adherence",
      "simplify",
      "Zero tasks completed today — pick the single most important one and start",
      ["daily_adherence"],
    );
  }

  if (signal.severity === "medium") {
    return makeFocus(
      "adherence",
      "correct",
      "Less than half of today's tasks done — there's still time to finish strong",
      ["daily_adherence"],
    );
  }

  return null;
}

function checkProgressPacing(
  analysis: ClientAnalysis,
  memories: AIMemory[],
): CoachingFocus | null {
  const signal = findRisk(analysis, "progress_behind");
  if (!signal?.detected) return null;

  const hadPriorPacingIssue = hasMemoryText(memories, "behind") || hasMemoryText(memories, "pace");

  return makeFocus(
    "progress_pacing",
    hadPriorPacingIssue ? "correct" : "caution",
    hadPriorPacingIssue
      ? "Progress is behind schedule again — the daily habits are what close the gap"
      : "Current pace is behind the goal timeline — consistency is the lever",
    ["progress_behind"],
  );
}

function checkStreakProtection(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
): CoachingFocus | null {
  const streak = findPattern(analysis, "streak_momentum");
  if (!streak) return null;

  const streakLevel = streak.metrics?.["streak_level"] as string | undefined;
  const streakCount = ctx.streak;

  // Active streak (3+) with today's tasks not yet complete = protect it
  if (streakCount >= 3 && (streakLevel === "active" || streakLevel === "building" || streakLevel === "hot")) {
    const adherence = findPattern(analysis, "daily_adherence");
    const todayIncomplete = adherence?.detected && adherence.severity !== "none";

    if (todayIncomplete) {
      return makeFocus(
        "streak_protection",
        "reinforce",
        `${streakCount}-day streak is at risk — finish today's tasks to keep it alive`,
        ["streak_momentum", "daily_adherence"],
      );
    }
  }

  return null;
}

function checkMomentum(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  memories: AIMemory[],
): CoachingFocus {
  // This is the default / fallback — things are going reasonably well
  const streak = ctx.streak;
  const signals: string[] = [];

  if (analysis.momentumState === "surging" || analysis.momentumState === "building") {
    signals.push("streak_momentum");

    // Check for milestone memory — reinforce the journey
    const hasMilestone = hasMemoryType(memories, "milestone");
    return makeFocus(
      "momentum",
      "reinforce",
      hasMilestone
        ? "Strong momentum with milestone history — reinforce identity and consistency"
        : `Momentum is ${analysis.momentumState} — keep doing what's working`,
      signals,
    );
  }

  if (analysis.momentumState === "steady") {
    return makeFocus(
      "momentum",
      streak >= 3 ? "reinforce" : "encourage",
      streak >= 3
        ? "Steady state with an active streak — consistency is the priority"
        : "Holding steady — today's effort builds tomorrow's momentum",
      ["streak_momentum", "consistency"],
    );
  }

  // Slipping or stalled but nothing else triggered above
  return makeFocus(
    "consistency",
    "encourage",
    "Momentum has slowed — focus on showing up today",
    ["streak_momentum"],
  );
}

// ═══════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════

/**
 * Determine the primary coaching focus for today.
 *
 * Runs a priority cascade through the analysis, context,
 * memories, and knowledge. Returns the single most
 * behaviorally important focus with a recommended
 * coaching mode.
 *
 * The cascade is ordered from most urgent (disengagement)
 * to least urgent (momentum reinforcement). First match wins.
 */
export function determineCoachingFocus(
  ctx: ClientAIContext,
  analysis: ClientAnalysis,
  memories: AIMemory[] = [],
  knowledge?: KnowledgeContext,
): CoachingFocus {
  return (
    checkDisengagement(analysis, memories) ??
    checkComplianceCrisis(ctx, analysis) ??
    checkBrokenStreak(ctx, analysis) ??
    checkPlateau(analysis, ctx, knowledge) ??
    checkConsistencyDecline(analysis) ??
    checkDailyAdherence(ctx, analysis) ??
    checkProgressPacing(analysis, memories) ??
    checkStreakProtection(ctx, analysis) ??
    checkMomentum(ctx, analysis, memories)
  );
}
