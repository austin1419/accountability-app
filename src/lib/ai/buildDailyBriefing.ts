// ─────────────────────────────────────────────
// buildDailyBriefing — presentation layer
//
// Pure mapping transform over existing AI outputs.
// No new signal detection. No new compliance math.
// No database queries. No LLM calls.
//
// Accepts the full pipeline output and reshapes it
// into the DailyBriefing data contract for the UI.
// ─────────────────────────────────────────────

import { COMPLIANCE_TARGET } from "@/lib/constants/thresholds";
import type {
  ClientAIContext,
  ClientAnalysis,
  ClientSummary,
  CoachSummary,
  AIFeatureReadiness,
  DailyBriefing,
  BriefingMomentum,
  BriefingRisk,
  ComplianceBar,
  InsightBlock,
  InsightTagType,
  BaseSignal,
} from "./types";

// ═══════════════════════════════════════════════
// 1. MOMENTUM STATE MAPPING
// ═══════════════════════════════════════════════

function mapMomentum(analysis: ClientAnalysis): BriefingMomentum {
  // Override: critical risk always forces at_risk
  if (analysis.riskLevel === "critical") return "at_risk";

  // Map 5-state → 4-state
  switch (analysis.momentumState) {
    case "surging":  return "building";
    case "building": return "building";
    case "steady":
      // Override: high risk + steady → declining
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

  // Derive time-of-day from the build timestamp (server time).
  // This is approximate — the client's actual local time may differ,
  // but CST is the app's reference timezone.
  const hour = new Date().getHours();

  if (hour < 12)      return `Good morning, ${firstName}`;
  if (hour < 17)      return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

// ═══════════════════════════════════════════════
// 4. OPENING MESSAGE
// ═══════════════════════════════════════════════

function buildOpeningMessage(
  clientSummary: ClientSummary,
  momentum: BriefingMomentum,
  ctx: ClientAIContext,
): string {
  const parts: string[] = [];

  // Lead with the top progress item if available
  const topProgress = clientSummary.progressItems[0];
  if (topProgress) {
    parts.push(topProgress.detail);
  }

  // Add the top win if it's different from progress
  const topWin = clientSummary.wins[0];
  if (topWin && topWin.signalKey !== topProgress?.signalKey) {
    parts.push(topWin.detail);
  }

  // If we have nothing from summaries, fall back to momentum-based message
  if (parts.length === 0) {
    switch (momentum) {
      case "building":
        parts.push("You're building strong momentum. Keep showing up.");
        break;
      case "steady":
        parts.push("You're staying consistent. Let's keep it going today.");
        break;
      case "declining":
        parts.push("Let's refocus today. Every small step counts.");
        break;
      case "at_risk":
        parts.push("Today is a fresh start. Your coach is here to help.");
        break;
    }
  }

  return parts.join(" ");
}

// ═══════════════════════════════════════════════
// 5. PRIMARY FOCUS (waterfall)
// ═══════════════════════════════════════════════

function derivePrimaryFocus(
  analysis: ClientAnalysis,
  coachSummary: CoachSummary,
): string {
  // 1. Critical risk
  const criticalRisk = analysis.riskSignals.find(
    (s) => s.detected && s.severity === "critical",
  );
  if (criticalRisk) return criticalRisk.label;

  // 2. Disengagement or broken streak
  const disengagement = analysis.riskSignals.find(
    (s) => s.key === "disengagement" && s.detected &&
           (s.severity === "medium" || s.severity === "high" || s.severity === "critical"),
  );
  if (disengagement) return "Re-engage with your daily habits";

  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  const streakLevel = streak?.metrics?.["streak_level"] as string | undefined;
  if (streakLevel === "broken") return "Rebuild your daily streak";

  // 3. Plateau
  const plateau = analysis.patternSignals.find(
    (s) => s.key === "plateau" && s.detected && s.confidence !== "low",
  );
  if (plateau) return plateau.label;

  // 4. Consistency decline
  const consistency = analysis.patternSignals.find(
    (s) => s.key === "consistency" && s.direction === "declining",
  );
  if (consistency) return consistency.label;

  // 5. Coach focus area fallback
  if (coachSummary.focusAreas.length > 0) {
    return coachSummary.focusAreas[0].title;
  }

  // 6. Momentum reinforcement
  if (analysis.momentumState === "surging" || analysis.momentumState === "building") {
    return "Keep your momentum going";
  }
  return "Stay consistent with your daily habits";
}

// ═══════════════════════════════════════════════
// 6. COMPLIANCE BARS
// ═══════════════════════════════════════════════

function buildComplianceBars(ctx: ClientAIContext): ComplianceBar[] {
  return [
    {
      label:  "This Week",
      value:  ctx.compliance.week.percent,
      status: ctx.compliance.week.percent >= COMPLIANCE_TARGET ? "gold" : "red",
    },
    {
      label:  "This Month",
      value:  ctx.compliance.month.percent,
      status: ctx.compliance.month.percent >= COMPLIANCE_TARGET ? "gold" : "red",
    },
    {
      label:  ctx.goal ? "Goal Progress" : "No Goal Set",
      value:  ctx.goal?.goalProgress ?? 0,
      status: "gold", // goal progress is always gold — it's a journey, not pass/fail
    },
  ];
}

// ═══════════════════════════════════════════════
// 7. INSIGHT BLOCKS
// ═══════════════════════════════════════════════

// ── Signal → InsightBlock mapper ─────────────

function severityToTagType(severity: BaseSignal["severity"]): InsightTagType {
  switch (severity) {
    case "critical": return "red";
    case "high":     return "red";
    case "medium":   return "gold";
    case "low":      return "gray";
    default:         return "gray";
  }
}

function directionToTagType(direction: BaseSignal["direction"]): InsightTagType {
  switch (direction) {
    case "improving": return "gold";
    case "stable":    return "blue";
    case "declining": return "red";
    default:          return "gray";
  }
}

type BlockCandidate = InsightBlock & { _sortPriority: number; _sortCategory: number };

const PRIORITY_ORDER  = { high: 0, medium: 1, low: 2 };
const CATEGORY_ORDER: Record<string, number> = {
  risk: 0, plateau: 1, trend: 2, consistency: 3, momentum: 4,
};

function makeCandidate(
  block: InsightBlock,
  categoryKey: string,
): BlockCandidate {
  return {
    ...block,
    _sortPriority:  PRIORITY_ORDER[block.priority] ?? 2,
    _sortCategory:  CATEGORY_ORDER[categoryKey] ?? 5,
  };
}

// ── Block builders ───────────────────────────

function buildInsightBlocks(analysis: ClientAnalysis): InsightBlock[] {
  const candidates: BlockCandidate[] = [];

  // RISK BLOCKS — one per detected medium+ risk signal
  for (const s of analysis.riskSignals) {
    if (!s.detected || s.severity === "none" || s.severity === "low") continue;

    candidates.push(makeCandidate({
      title:      s.label,
      summary:    s.evidence.slice(0, 2).join(". ") || "Risk factor detected",
      priority:   s.severity === "critical" || s.severity === "high" ? "high" : "medium",
      signalKeys: [s.key],
      evidence:   s.evidence,
      tag:        s.category.toUpperCase(),
      tagType:    severityToTagType(s.severity),
    }, "risk"));
  }

  // MOMENTUM BLOCK — always present (streak signal always exists)
  const streak = analysis.patternSignals.find((s) => s.key === "streak_momentum");
  if (streak) {
    const streakLevel = streak.metrics?.["streak_level"] as string | undefined;
    let tagType: InsightTagType;
    if (streakLevel === "hot" || streakLevel === "building") tagType = "gold";
    else if (streakLevel === "active")                       tagType = "blue";
    else                                                     tagType = "red";

    candidates.push(makeCandidate({
      title:      streak.label,
      summary:    streak.evidence.join(". "),
      priority:   streak.severity === "none" ? "low" : "medium",
      signalKeys: [streak.key],
      evidence:   streak.evidence,
      tag:        "STREAK",
      tagType,
    }, "momentum"));
  }

  // PLATEAU BLOCK
  const plateau = analysis.patternSignals.find((s) => s.key === "plateau" && s.detected);
  if (plateau) {
    // Confidence maps directly to priority
    const priority = plateau.confidence === "high" ? "high"
      : plateau.confidence === "medium" ? "medium"
      : "low";

    candidates.push(makeCandidate({
      title:      plateau.label,
      summary:    plateau.evidence.slice(0, 2).join(". "),
      priority,
      signalKeys: [plateau.key],
      evidence:   plateau.evidence,
      tag:        "PLATEAU",
      tagType:    "red",
    }, "plateau"));
  }

  // TREND BLOCK — primary metric trend (not task_completion)
  const primaryTrend = analysis.trendSignals.find(
    (s) => s.metric !== "task_completion" && s.detected,
  );
  if (primaryTrend) {
    candidates.push(makeCandidate({
      title:      primaryTrend.label,
      summary:    primaryTrend.evidence.slice(0, 2).join(". "),
      priority:   primaryTrend.direction === "declining" ? "high"
                : primaryTrend.direction === "stable"    ? "medium"
                : "low",
      signalKeys: [primaryTrend.key],
      evidence:   primaryTrend.evidence,
      tag:        "PROGRESS",
      tagType:    directionToTagType(primaryTrend.direction),
    }, "trend"));
  }

  // CONSISTENCY BLOCK — only when severity != "none"
  const consistency = analysis.patternSignals.find(
    (s) => s.key === "consistency" && s.severity !== "none",
  );
  if (consistency) {
    candidates.push(makeCandidate({
      title:      consistency.label,
      summary:    consistency.evidence.join(". "),
      priority:   consistency.direction === "declining" ? "high" : "low",
      signalKeys: [consistency.key],
      evidence:   consistency.evidence,
      tag:        "CONSISTENCY",
      tagType:    directionToTagType(consistency.direction),
    }, "consistency"));
  }

  // Sort: priority first, then category order within same priority
  candidates.sort((a, b) =>
    a._sortPriority !== b._sortPriority
      ? a._sortPriority - b._sortPriority
      : a._sortCategory - b._sortCategory,
  );

  // Take top 4, strip internal sort fields
  const selected = candidates.slice(0, 4);

  // Guarantee at least 1 block — if everything was filtered out,
  // the momentum block should always be present. Defensive fallback:
  if (selected.length === 0) {
    selected.push(makeCandidate({
      title:      "Stay consistent",
      summary:    "Keep showing up every day",
      priority:   "low",
      signalKeys: [],
      evidence:   [],
      tag:        "STREAK",
      tagType:    "blue",
    }, "momentum"));
  }

  return selected.map(({ _sortPriority, _sortCategory, ...block }) => block);
}

// ═══════════════════════════════════════════════
// 8. QUICK ACTIONS
// ═══════════════════════════════════════════════

const MAX_ACTIONS        = 4;
const ACTION_MAX_LENGTH  = 40;

function buildQuickActions(clientSummary: ClientSummary): string[] {
  const suggestions = clientSummary.focusSuggestions;

  if (suggestions.length === 0) {
    return ["Complete today's tasks"];
  }

  return suggestions
    .slice(0, MAX_ACTIONS)
    .map((s) => {
      const title = s.title;
      if (title.length <= ACTION_MAX_LENGTH) return title;
      // Truncate at last word boundary
      const truncated = title.slice(0, ACTION_MAX_LENGTH);
      const lastSpace = truncated.lastIndexOf(" ");
      return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    });
}

// ═══════════════════════════════════════════════
// 9. READINESS GATE
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
    headline:        "Your AI coach is getting ready",
    openingMessage:  readiness.blockedReason ?? "Keep logging your daily tasks and progress to unlock your Daily Briefing",
    momentumState:   "steady",
    riskLevel:       "low",
    primaryFocus:    "Keep logging your daily tasks and progress",
    complianceBars:  [],
    insightBlocks:   [],
    quickActions:    ["Complete today's tasks"],
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
): DailyBriefing {
  // Gate check — short-circuit if insufficient data
  if (!readiness.available) {
    return buildGatedBriefing(ctx, readiness);
  }

  const momentumState = mapMomentum(analysis);
  const riskLevel     = mapRisk(analysis);

  return {
    id:              `${ctx.client.userId}-${ctx.selectedDate}`,
    generatedAt:     new Date().toISOString(),
    greeting:        buildGreeting(ctx),
    headline:        clientSummary.headline,
    openingMessage:  buildOpeningMessage(clientSummary, momentumState, ctx),
    momentumState,
    riskLevel,
    primaryFocus:    derivePrimaryFocus(analysis, coachSummary),
    complianceBars:  buildComplianceBars(ctx),
    insightBlocks:   buildInsightBlocks(analysis),
    quickActions:    buildQuickActions(clientSummary),
    sourceSignals:   analysis.allSignals.filter((s) => s.detected).map((s) => s.key),
  };
}
