// ─────────────────────────────────────────────
// Behavior Pattern Detection — shared types
// ─────────────────────────────────────────────

export type PatternType =
  | "habit_failure_cluster"
  | "habit_streak"
  | "stress_rising"
  | "energy_declining"
  | "compliance_momentum"
  | "intervention_loop";

export type PatternSeverity = "positive" | "neutral" | "warning" | "critical";

export interface BehaviorPattern {
  patternType: PatternType;
  severity: PatternSeverity;
  summary: string;
  confidenceScore: number;
  relatedEventIds: string[];
}
