// ─────────────────────────────────────────────
// buildSignals — adapter between the progress
// engine and the deterministic coaching engine.
//
// Transforms a ClientAIContext (assembled by
// buildClientContext) into the ScenarioSignals
// format required by detectScenario().
//
// No DB calls. No side effects. Pure derivation.
// ─────────────────────────────────────────────

import type { ClientAIContext, JournalEntry } from "@/lib/ai/types";
import type { ScenarioSignals } from "./detectScenario";

/**
 * Derive the weight trend from recent weight log entries.
 *
 * Compares the most recent weight to the average of the
 * prior 5 entries to classify the trend.
 */
function deriveWeightTrend(
  ctx: ClientAIContext,
): ScenarioSignals["weightTrend"] {
  const log = ctx.weightLog;
  if (log.length < 2) return null;

  const latest = log[log.length - 1].weight;
  const prior = log[log.length - 2].weight;

  // Spike: single-day jump of 2+ lbs with no compliance explanation
  if (latest - prior >= 2) return "spike";

  // Use 7-day velocity from progressTrends when available
  const v7 = ctx.progressTrends?.velocity7d;
  if (v7 != null) {
    if (Math.abs(v7) < 0.02) return "flat";  // < 0.14 lbs/week
    return v7 > 0 ? "up" : "down";
  }

  // Fallback: compare last two entries
  const diff = latest - prior;
  if (Math.abs(diff) < 0.5) return "flat";
  return diff > 0 ? "up" : "down";
}

/**
 * Calculate days until goal deadline from the selected date.
 */
function deriveGoalDeadlineDays(ctx: ClientAIContext): number | null {
  const goalDate = ctx.goal?.goalDate;
  if (!goalDate) return null;

  const selected = new Date(`${ctx.selectedDate}T12:00:00`);
  const deadline = new Date(`${goalDate}T12:00:00`);
  const diffMs = deadline.getTime() - selected.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Map progressTrends.status to the ScenarioSignals goalPaceStatus.
 * Filters out "no_data" → null.
 */
function deriveGoalPaceStatus(
  ctx: ClientAIContext,
): ScenarioSignals["goalPaceStatus"] {
  const status = ctx.progressTrends?.status;
  if (!status || status === "no_data") return null;
  return status; // "ahead" | "on_track" | "behind"
}

/**
 * Derive journal-based boolean signals.
 * Returns null for each signal when no journal entry exists.
 *
 * Exported so coach-side queries can reuse the same signal
 * logic without building a full ClientAIContext.
 */
export function deriveJournalSignals(journal: JournalEntry | null) {
  const j = journal;
  if (!j) {
    return {
      sleepDeficit: null,
      recoveryDeficit: null,
      nutritionSlip: null,
      trainingGap: null,
      highStressLowEnergy: null,
      lowReadiness: null,
    } as const;
  }

  // sleep_deficit: slept < 6 hours OR reported not rested
  const sleepDeficit =
    (j.sleepHours != null && j.sleepHours < 6)
    || j.feltRested === false;

  // recovery_deficit: sleep deficit + no recovery work
  const recoveryDeficit = sleepDeficit && j.recoveryWork === false;

  // nutrition_slip: missed protein OR missed hydration OR drank alcohol
  const nutritionSlip =
    j.proteinHit === false
    || j.hydrationHit === false
    || j.alcohol === true;

  // training_gap: did not train AND did not do zone 2
  const trainingGap =
    j.trainedToday === false && j.zone2Cardio === false;

  // high_stress_low_energy: stress >= 4 AND energy <= 2
  const highStressLowEnergy =
    j.stressLevel != null && j.energyLevel != null
    && j.stressLevel >= 4 && j.energyLevel <= 2;

  // low_readiness: not rested AND energy <= 2
  const lowReadiness =
    j.feltRested === false
    && j.energyLevel != null && j.energyLevel <= 2;

  return {
    sleepDeficit,
    recoveryDeficit,
    nutritionSlip,
    trainingGap,
    highStressLowEnergy,
    lowReadiness,
  };
}

/**
 * Build ScenarioSignals from a ClientAIContext.
 *
 * This is the single adapter between the progress data
 * layer (buildClientContext) and the coaching engine
 * (detectScenario → buildCoachResponse).
 */
export function buildScenarioSignals(ctx: ClientAIContext): ScenarioSignals {
  const nutritionTasks = ctx.tasks.filter(
    (t) => t.category?.toLowerCase() === "nutrition",
  );

  const journal = deriveJournalSignals(ctx.journalEntry);

  return {
    // Tasks
    tasksCompletedToday: ctx.compliance.today.completed,
    totalTasks:          ctx.compliance.today.total,

    // Streak
    streak: ctx.streak,

    // Compliance
    weeklyCompliance: ctx.compliance.week.percent,

    // Day of week (0 = Sunday)
    dayOfWeek: new Date(`${ctx.selectedDate}T12:00:00`).getDay(),

    // Weight
    weightTrend: deriveWeightTrend(ctx),

    // Goal timeline
    goalDeadlineDays: deriveGoalDeadlineDays(ctx),

    // Nutrition
    hasNutritionTasks:  nutritionTasks.length > 0,
    nutritionTasksDone: nutritionTasks.length > 0
      && nutritionTasks.every((t) => t.done),

    // Previous week compliance — not directly available in
    // ClientAIContext. Set to null; can be populated later
    // when historical compliance data is added to the context.
    previousWeekCompliance: null,

    // Goal pace
    goalPaceStatus: deriveGoalPaceStatus(ctx),

    // Journal-derived signals
    ...journal,
  };
}
