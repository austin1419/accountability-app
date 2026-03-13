// ─────────────────────────────────────────────
// Single source of truth for projection math.
// Shared by server-queries.ts and progress/page.tsx.
// No DB calls, no "server-only" — pure computation.
// ─────────────────────────────────────────────

export type ChartPoint = { date: string; value: number };

/** CST-aware YYYY-MM-DD string */
function cstDate(d?: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" })
    .format(d ?? new Date());
}

/** Inclusive calendar-day count between two YYYY-MM-DD strings */
function daysBetween(start: string, end: string): number {
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end   + "T00:00:00").getTime();
  return Math.floor((e - s) / 86_400_000) + 1;
}

/**
 * Compute velocity (units/day) from data points within a rolling window.
 * Uses CST dates and inclusive day counting — matches server velocityForWindow.
 */
export function computeVelocity(
  points: ChartPoint[],
  windowDays: number,
): number | null {
  if (points.length < 2) return null;

  const today  = cstDate();
  const cutoff = new Date(today + "T00:00:00");
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cstDate(cutoff);

  const w = points.filter((p) => p.date >= cutoffStr);
  if (w.length < 2) return null;

  const first = w[0];
  const last  = w[w.length - 1];
  const days  = daysBetween(first.date, last.date);
  if (days <= 0) return null;

  return (last.value - first.value) / days;
}

/**
 * Generate projected weekly data points from an anchor.
 * Does NOT include the anchor — callers prepend it for visual continuity.
 */
export function generateProjection(opts: {
  anchor:    ChartPoint;
  velocity:  number;
  goalValue: number | null;
  maxDays?:  number;
}): ChartPoint[] {
  const { anchor, velocity, goalValue, maxDays = 180 } = opts;

  if (velocity === 0) return [];

  const projected: ChartPoint[] = [];
  const cursor   = new Date(anchor.date + "T00:00:00");
  const interval = 7;

  for (let d = interval; d <= maxDays; d += interval) {
    cursor.setDate(cursor.getDate() + interval);
    const dateStr = cstDate(cursor);
    const value   = +(anchor.value + velocity * d).toFixed(2);

    if (goalValue != null) {
      const passedGoal = velocity < 0
        ? value <= goalValue
        : value >= goalValue;
      if (passedGoal) {
        projected.push({ date: dateStr, value: goalValue });
        break;
      }
    }

    projected.push({ date: dateStr, value });
  }

  return projected;
}

/**
 * Convenience: compute projection from raw data points.
 * Computes velocity internally (30d preferred, 7d fallback),
 * validates direction, then delegates to generateProjection.
 */
export function projectFromData(opts: {
  data:      ChartPoint[];
  goalValue: number | null;
  direction: "decrease" | "increase";
  maxDays?:  number;
}): ChartPoint[] {
  const { data, goalValue, direction, maxDays } = opts;
  if (data.length < 2 || goalValue == null) return [];

  const velocity = computeVelocity(data, 30) ?? computeVelocity(data, 7);
  if (velocity == null) return [];

  const movingRight = direction === "decrease" ? velocity < 0 : velocity > 0;
  if (!movingRight) return [];

  return generateProjection({
    anchor: data[data.length - 1],
    velocity,
    goalValue,
    maxDays,
  });
}
