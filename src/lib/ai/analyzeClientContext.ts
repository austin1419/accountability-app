// ─────────────────────────────────────────────
// analyzeClientContext — top-level signal aggregator
//
// Combines risk detection and pattern detection into
// a single ClientAnalysis object. Derives top-level
// states (riskLevel, momentumState, coachingStatus)
// from the underlying signals.
//
// This is the sole entry point for all downstream
// AI consumers:
//   - Coach summaries
//   - Client insights
//   - Intervention logic
//   - PulseAI chat context
//
// Deterministic. No LLM. No DB calls. No side effects.
// ─────────────────────────────────────────────

import { detectRisk } from "./detectRisk";
import { detectPatterns } from "./detectPatterns";
import type {
  ClientAIContext,
  ClientAnalysis,
  BaseSignal,
  RiskSignal,
  PatternSignal,
  TrendSignal,
  RiskLevel,
  MomentumState,
  CoachingStatus,
} from "./types";

// ── Derive riskLevel from risk signals ───────

function deriveRiskLevel(riskSignals: RiskSignal[]): RiskLevel {
  const detected = riskSignals.filter((s) => s.detected);
  if (detected.length === 0) return "low";

  const hasCritical = detected.some((s) => s.severity === "critical");
  const highCount   = detected.filter((s) => s.severity === "high").length;
  const medCount    = detected.filter((s) => s.severity === "medium").length;

  if (hasCritical)    return "critical";
  if (highCount >= 2) return "critical";
  if (highCount >= 1) return "high";
  if (medCount >= 3)  return "high";
  if (medCount >= 1)  return "moderate";
  return "low";
}

// ── Derive momentumState from pattern + trend signals ──

function deriveMomentum(
  patternSignals: PatternSignal[],
  trendSignals: TrendSignal[],
  riskLevel: RiskLevel,
): MomentumState {
  const streak      = patternSignals.find((s) => s.key === "streak_momentum");
  const plateau     = patternSignals.find((s) => s.key === "plateau");
  const consistency = patternSignals.find((s) => s.key === "consistency");
  const primaryTrend = trendSignals.find((s) => s.metric !== "task_completion");

  const streakLevel  = streak?.metrics?.["streak_level"] as string | undefined;
  const weekComp     = (consistency?.metrics?.["compliance_week"] as number | undefined) ?? 0;

  // Surging: hot streak + high compliance + positive trend
  if (
    streakLevel === "hot" &&
    weekComp >= 85 &&
    primaryTrend?.direction === "improving"
  ) {
    return "surging";
  }

  // Building: building/hot streak + good compliance + not declining
  if (
    (streakLevel === "building" || streakLevel === "hot") &&
    weekComp >= 70 &&
    primaryTrend?.direction !== "declining"
  ) {
    return "building";
  }

  // Stalled: plateau detected with medium+ confidence, or severe disengagement
  if (plateau?.detected && plateau.confidence !== "low") {
    return "stalled";
  }

  // Slipping: high/critical risk or declining consistency
  if (riskLevel === "critical" || riskLevel === "high") {
    return "slipping";
  }
  if (consistency?.direction === "declining" && consistency.severity !== "none") {
    return "slipping";
  }

  return "steady";
}

// ── Derive coachingStatus from risk + momentum ──

function deriveCoachingStatus(
  riskLevel: RiskLevel,
  momentum: MomentumState,
): CoachingStatus {
  // Critical risk always takes priority
  if (riskLevel === "critical") return "critical";

  // High risk = at_risk regardless of momentum
  if (riskLevel === "high") return "at_risk";

  // Map momentum states with risk modifiers
  if (momentum === "surging")  return "thriving";
  if (momentum === "building") return riskLevel === "moderate" ? "on_track" : "thriving";
  if (momentum === "stalled")  return "needs_attention";
  if (momentum === "slipping") return riskLevel === "moderate" ? "at_risk" : "needs_attention";

  // Steady
  if (riskLevel === "moderate") return "needs_attention";
  return "on_track";
}

// ── Public API ───────────────────────────────

export function analyzeClientContext(ctx: ClientAIContext): ClientAnalysis {
  const riskSignals                      = detectRisk(ctx);
  const { patternSignals, trendSignals } = detectPatterns(ctx);

  // Derive top-level states FROM signals
  const riskLevel      = deriveRiskLevel(riskSignals);
  const momentumState  = deriveMomentum(patternSignals, trendSignals, riskLevel);
  const coachingStatus = deriveCoachingStatus(riskLevel, momentumState);

  // Flatten all signals for easy iteration
  const allSignals: BaseSignal[] = [
    ...riskSignals,
    ...patternSignals,
    ...trendSignals,
  ];

  return {
    selectedDate:  ctx.selectedDate,
    analyzedAt:    new Date().toISOString(),
    riskSignals,
    patternSignals,
    trendSignals,
    allSignals,
    riskLevel,
    momentumState,
    coachingStatus,
    statusScore:   ctx.statusScore,
  };
}
