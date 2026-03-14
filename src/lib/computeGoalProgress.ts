// ─────────────────────────────────────────────
// computeGoalProgress — single source of truth
//
// Returns 0–100 representing how far toward the goal the user has progressed.
// Works for all three goal categories: weight, body_composition, performance.
//
// Imported by server-queries.ts, profile/page.tsx, and any future AI consumers.
// ─────────────────────────────────────────────

export type GoalMetrics = {
  goal_category:              string;
  // Weight
  start_weight:               number | null;
  goal_weight:                number | null;
  current_weight:             number | null;
  // Body composition
  starting_body_fat:          number | null;
  current_body_fat:           number | null;
  goal_body_fat:              number | null;
  starting_smm:               number | null;
  current_smm:                number | null;
  goal_smm:                   number | null;
  // Performance
  performance_metric_name:    string | null;
  performance_unit:           string | null;
  performance_direction:      string | null;
  starting_performance_value: number | null;
  current_performance_value:  number | null;
  goal_performance_value:     number | null;
};

export function computeGoalProgress(g: GoalMetrics): number {
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

  if (g.goal_category === "body_composition") {
    const parts: number[] = [];
    if (g.starting_body_fat != null && g.current_body_fat != null && g.goal_body_fat != null
        && g.starting_body_fat - g.goal_body_fat > 0) {
      parts.push(clamp(((g.starting_body_fat - g.current_body_fat) / (g.starting_body_fat - g.goal_body_fat)) * 100));
    }
    if (g.starting_smm != null && g.current_smm != null && g.goal_smm != null
        && g.goal_smm - g.starting_smm > 0) {
      parts.push(clamp(((g.current_smm - g.starting_smm) / (g.goal_smm - g.starting_smm)) * 100));
    }
    return parts.length === 0 ? 0 : Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  if (g.goal_category === "performance") {
    const { performance_direction: dir, starting_performance_value: s,
            current_performance_value: c, goal_performance_value: goal } = g;
    if (s == null || c == null || goal == null || dir == null) return 0;
    if (dir === "increase") return goal - s <= 0 ? 0 : clamp(((c - s) / (goal - s)) * 100);
    return s - goal <= 0 ? 0 : clamp(((s - c) / (s - goal)) * 100);
  }

  // Default: weight
  const { start_weight: s, current_weight: c, goal_weight: goal } = g;
  if (s == null || c == null || goal == null || s - goal <= 0) return 0;
  return clamp(((s - c) / (s - goal)) * 100);
}
