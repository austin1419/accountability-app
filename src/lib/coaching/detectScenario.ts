// ─────────────────────────────────────────────
// detectScenario — determines which coaching
// scenario applies based on client signals.
//
// Placeholder logic with simple conditions.
// Not connected to UI or API yet.
// ─────────────────────────────────────────────

import type { CoachingScenario } from "./scenarios";

export type ScenarioSignals = {
  tasksCompletedToday: number;
  totalTasks: number;
  streak: number;
  weeklyCompliance: number;
  dayOfWeek: number;
  weightTrend: "up" | "down" | "flat" | "spike" | null;
  goalDeadlineDays: number | null;
  hasNutritionTasks: boolean;
  nutritionTasksDone: boolean;
  previousWeekCompliance: number | null;
  goalPaceStatus: "ahead" | "on_track" | "behind" | null;

  // Journal-derived signals (null = no journal entry for the day)
  sleepDeficit: boolean | null;
  recoveryDeficit: boolean | null;
  nutritionSlip: boolean | null;
  trainingGap: boolean | null;
  highStressLowEnergy: boolean | null;
  lowReadiness: boolean | null;
};

export function detectScenario(signals: ScenarioSignals): CoachingScenario {
  // Client completed every task today — clean sweep
  if (signals.tasksCompletedToday === signals.totalTasks && signals.totalTasks > 0) {
    return "perfect_day";
  }

  // Weight jumped up but compliance is solid — reassure, don't alarm
  if (signals.weightTrend === "spike" && signals.weeklyCompliance >= 70) {
    return "scale_spike_reassurance";
  }

  // Goal deadline is within 14 days — urgency coaching
  if (signals.goalDeadlineDays != null && signals.goalDeadlineDays <= 14) {
    return "goal_deadline_approaching";
  }

  // ── Journal health signals (high priority) ───
  // Health-safety signals outprioritize task-level nudges.
  // If the client is sleep-deprived, drained, or under-recovered,
  // that matters more than which task category was missed.

  if (signals.lowReadiness === true) {
    return "low_readiness";
  }

  if (signals.highStressLowEnergy === true) {
    return "high_stress_low_energy";
  }

  if (signals.recoveryDeficit === true) {
    return "recovery_deficit";
  }

  if (signals.sleepDeficit === true) {
    return "sleep_deficit";
  }

  // Training tasks done but nutrition tasks missed — targeted nudge
  if (signals.hasNutritionTasks && !signals.nutritionTasksDone && signals.tasksCompletedToday > 0) {
    return "training_only_no_nutrition";
  }

  // ── Journal behavioral signals (lower priority) ──
  // Nutrition slips and training gaps are important but sit
  // below task-level scenario detection.

  if (signals.nutritionSlip === true) {
    return "nutrition_slip";
  }

  if (signals.trainingGap === true) {
    return "training_gap";
  }

  // Streak hit a milestone (7, 14, 21, 30) — celebrate and reinforce
  if ([7, 14, 21, 30].includes(signals.streak)) {
    return "streak_milestone";
  }

  // Client is ahead of goal pace — acknowledge and push
  if (signals.goalPaceStatus === "ahead") {
    return "goal_pace_ahead";
  }

  // Compliance recovering from a bad previous week
  if (
    signals.previousWeekCompliance != null
    && signals.previousWeekCompliance < 50
    && signals.weeklyCompliance >= 50
  ) {
    return "compliance_recovering";
  }

  // Mid-week and compliance is low — intervene before the week is lost
  if (signals.weeklyCompliance < 50 && signals.dayOfWeek >= 3) {
    return "midweek_rescue";
  }

  // Weight flat and compliance is high — plateau coaching
  if (signals.weightTrend === "flat" && signals.weeklyCompliance >= 75) {
    return "consistency_plateau";
  }

  // Early streak building (2–4 days) — encourage without over-celebrating
  if (signals.streak >= 2 && signals.streak <= 4) {
    return "early_streak";
  }

  // Solid streak with good weekly compliance — keep momentum going
  if (signals.streak >= 5 && signals.weeklyCompliance >= 70) {
    return "momentum_reinforcement";
  }

  // Default — general momentum coaching
  return "momentum_reinforcement";
}
