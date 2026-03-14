// ─────────────────────────────────────────────
// isAnswered — single source of truth for whether
// a coaching profile answer counts as "answered".
//
// Used by: form validation, save filtering,
// section completion, overall progress bar.
// ─────────────────────────────────────────────

import type { InputType } from "@/lib/coachingProfile/types";

/**
 * Determines whether a saved answer value counts as meaningfully answered.
 *
 * - text / textarea: trimmed string must be non-empty
 * - single_select:   non-empty string
 * - multi_select:    array with at least one item
 * - number / scale:  valid finite number
 * - null / undefined / whitespace-only → not answered
 */
export function isAnswered(value: unknown, inputType?: InputType): boolean {
  if (value === null || value === undefined) return false;

  switch (inputType) {
    case "text":
    case "textarea":
    case "single_select":
      return typeof value === "string" && value.trim().length > 0;

    case "multi_select":
      return Array.isArray(value) && value.length > 0;

    case "number":
    case "scale":
      return typeof value === "number" && Number.isFinite(value);

    default:
      // Fallback for unknown input types — apply general checks
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "number") return Number.isFinite(value);
      return false;
  }
}
