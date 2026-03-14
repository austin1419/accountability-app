// ─────────────────────────────────────────────
// computeCompliance — single source of truth for
// compliance percentage calculation.
//
// Replaces 5+ inline copies across server-queries.ts.
// ─────────────────────────────────────────────

/**
 * Compute compliance percentage from completed tasks and expected tasks.
 * Returns an integer 0–100 (or 0 if expected is 0).
 */
export function computeCompliance(completed: number, expected: number): number {
  return expected > 0 ? Math.round((completed / expected) * 100) : 0;
}
