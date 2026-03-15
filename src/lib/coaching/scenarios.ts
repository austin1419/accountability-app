// ─────────────────────────────────────────────
// Deterministic coaching scenarios detected by
// the PULSE accountability engine based on
// client signals (compliance, streak, weight,
// goal pace, etc.).
//
// Not connected to UI or logic yet — this file
// only defines the scenario list.
// ─────────────────────────────────────────────

export type CoachingScenario =
  | "training_only_no_nutrition"
  | "goal_deadline_approaching"
  | "compliance_recovering"
  | "consistency_plateau"
  | "scale_spike_reassurance"
  | "early_streak"
  | "momentum_reinforcement"
  | "perfect_day"
  | "streak_milestone"
  | "goal_pace_ahead"
  | "midweek_rescue"
  // Journal-derived scenarios
  | "sleep_deficit"
  | "recovery_deficit"
  | "nutrition_slip"
  | "training_gap"
  | "high_stress_low_energy"
  | "low_readiness";

export const coachingScenarios: CoachingScenario[] = [
  "training_only_no_nutrition",
  "goal_deadline_approaching",
  "compliance_recovering",
  "consistency_plateau",
  "scale_spike_reassurance",
  "early_streak",
  "momentum_reinforcement",
  "perfect_day",
  "streak_milestone",
  "goal_pace_ahead",
  "midweek_rescue",
  "sleep_deficit",
  "recovery_deficit",
  "nutrition_slip",
  "training_gap",
  "high_stress_low_energy",
  "low_readiness",
];
