"use server";

import { createAdminClient } from "@/lib/supabase-admin";

export async function updateClientWeights(
  goalId: string,
  data: { currentWeight: number | null; goalWeight: number | null },
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("goals")
    .update({
      current_weight: data.currentWeight,
      goal_weight:    data.goalWeight,
    })
    .eq("id", goalId);

  if (error) {
    console.error("[updateClientWeights] failed:", error.message);
    return { error: "Failed to update weights. Please try again." };
  }

  return {};
}
