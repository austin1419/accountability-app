// ─────────────────────────────────────────────
// Coaching Profile — client-side query functions
//
// Fetch and upsert coaching_profile_answers rows.
// Uses the browser Supabase client (RLS-protected).
// ─────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";
import type { SavedAnswers } from "./types";

/**
 * Load all saved answers for a user + section.
 * Returns a flat map: { questionKey: value }
 */
export async function fetchCoachingAnswers(
  userId: string,
  sectionKey: string,
): Promise<SavedAnswers> {
  const { data, error } = await supabase
    .from("coaching_profile_answers")
    .select("question_key, answer_value_json")
    .eq("user_id", userId)
    .eq("section_key", sectionKey);

  if (error) {
    console.error("[fetchCoachingAnswers] failed:", error);
    return {};
  }

  const result: SavedAnswers = {};
  for (const row of data ?? []) {
    result[row.question_key] = row.answer_value_json;
  }
  return result;
}

/**
 * Save answers for a section. Upserts one row per question.
 * Only writes questions that have a non-empty value.
 */
export async function upsertCoachingAnswers(
  userId: string,
  sectionKey: string,
  answers: SavedAnswers,
): Promise<{ error?: string }> {
  const rows: {
    user_id: string;
    section_key: string;
    question_key: string;
    answer_value_json: Json;
    updated_at: string;
  }[] = Object.entries(answers)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined &&
      !(Array.isArray(v) && v.length === 0))
    .map(([questionKey, value]) => ({
      user_id: userId,
      section_key: sectionKey,
      question_key: questionKey,
      answer_value_json: value as Json,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return {};

  const { error } = await supabase
    .from("coaching_profile_answers")
    .upsert(rows, { onConflict: "user_id,section_key,question_key" });

  if (error) {
    console.error("[upsertCoachingAnswers] failed:", error);
    return { error: "Failed to save answers." };
  }
  return {};
}

/**
 * Fetch all coaching profile answers for a user (all sections).
 * Returns a nested map: { sectionKey: { questionKey: value } }
 */
export async function fetchAllCoachingAnswers(
  userId: string,
): Promise<Record<string, SavedAnswers>> {
  const { data, error } = await supabase
    .from("coaching_profile_answers")
    .select("section_key, question_key, answer_value_json")
    .eq("user_id", userId);

  if (error) {
    console.error("[fetchAllCoachingAnswers] failed:", error);
    return {};
  }

  const result: Record<string, SavedAnswers> = {};
  for (const row of data ?? []) {
    if (!result[row.section_key]) result[row.section_key] = {};
    result[row.section_key][row.question_key] = row.answer_value_json;
  }
  return result;
}
