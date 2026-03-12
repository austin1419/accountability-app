"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Verifies the caller is an authenticated coach.
// Returns the coach's internal users.id on success, or an error object on failure.
async function assertCoach(): Promise<{ error: string } | null>;
async function assertCoach(withId: true): Promise<{ error: string } | { coachId: string }>;
async function assertCoach(withId?: true): Promise<{ error: string } | { coachId: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();
  if (!data) return { error: "Unauthorized." };
  if (withId) return { coachId: data.id };
  return null;
}

export async function updateClientWeights(
  goalId: string,
  data: { currentWeight: number | null; goalWeight: number | null },
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

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

export async function updateClientGoalMetrics(
  goalId: string,
  patch: {
    // Weight
    current_weight?:             number | null;
    goal_weight?:                number | null;
    // Body composition
    current_body_fat?:           number | null;
    goal_body_fat?:              number | null;
    current_smm?:                number | null;
    goal_smm?:                   number | null;
    // Performance
    current_performance_value?:  number | null;
    goal_performance_value?:     number | null;
  }
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { error } = await supabase.from("goals").update(patch).eq("id", goalId);
  if (error) {
    console.error("[updateClientGoalMetrics] failed:", error.message);
    return { error: "Failed to update metrics. Please try again." };
  }
  return {};
}

export async function addClientHabit(
  goalId:   string,
  taskName: string,
  category: string,
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tasks")
    .insert({ goal_id: goalId, task_name: taskName, category });

  if (error) {
    console.error("[addClientHabit] insert failed:", error.message);
    return { error: "Failed to save habit. Please try again." };
  }

  return {};
}

export async function reactivateClient(
  clientId: string,
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: true, archive_reason: null })
    .eq("id", clientId);

  if (error) {
    console.error("[reactivateClient] failed:", error.message);
    return { error: "Failed to reactivate client. Please try again." };
  }

  return {};
}

export async function archiveClient(
  clientId: string,
  reason?: string,
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("users")
    .update({ is_active: false, archive_reason: reason ?? null })
    .eq("id", clientId);

  if (error) {
    console.error("[archiveClient] failed:", error.message);
    return { error: "Failed to archive client. Please try again." };
  }

  return {};
}

export async function addClientNote(
  clientId: string,
  note: string,
): Promise<{ error?: string; id?: string; created_at?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, note })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("[addClientNote] failed:", error.message);
    return { error: "Failed to save note. Please try again." };
  }

  return { id: data.id, created_at: data.created_at };
}

export async function removeClientHabit(
  taskId: string,
  reason?: string,
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tasks")
    .update({ is_active: false, removal_reason: reason ?? null })
    .eq("id", taskId);

  if (error) {
    console.error("[removeClientHabit] failed:", error.message);
    return { error: "Failed to remove habit. Please try again." };
  }

  return {};
}

// ── changeClientGoal ──────────────────────────────────────────────
//
// Closes the client's current active goal and opens a new one.
//
// Steps:
//   1. Verify caller is a coach (captures coach id for audit trail)
//   2. Verify clientId belongs to an active client user
//   3. Find the client's current active goal
//   4. Mark it inactive (is_active=false, completed_at, change_reason, completed_by)
//   5. Insert a new goal row with is_active=true and the new category/values
//   6. On insert failure, restore the old goal to is_active=true (compensating update)
//
// Does NOT touch: tasks, task_logs, weight_logs, progress_logs, client_notes.

type WeightGoalData = {
  goal_category: "weight";
  goal_name:     string;
  goal_date?:    string | null;
  start_weight?: number | null;
  goal_weight?:  number | null;
};

type BodyCompGoalData = {
  goal_category:    "body_composition";
  goal_name:        string;
  goal_date?:       string | null;
  starting_body_fat?: number | null;
  goal_body_fat?:     number | null;
  starting_smm?:      number | null;
  goal_smm?:          number | null;
};

type PerformanceGoalData = {
  goal_category:              "performance";
  goal_name:                  string;
  goal_date?:                 string | null;
  performance_metric_name?:   string | null;
  performance_unit?:          string | null;
  performance_direction?:     string | null;
  starting_performance_value?: number | null;
  goal_performance_value?:     number | null;
};

export type NewGoalData = WeightGoalData | BodyCompGoalData | PerformanceGoalData;

export async function changeClientGoal(
  clientId:   string,
  reason:     string,
  newGoalData: NewGoalData,
): Promise<{ error?: string }> {

  // 1. Auth — capture coach id for the audit trail
  const authResult = await assertCoach(true);
  if ("error" in authResult) return authResult;
  const { coachId } = authResult;

  const admin = createAdminClient();

  // 2. Verify the target is an active client user (ownership + existence check)
  const { data: clientUser } = await admin
    .from("users")
    .select("id")
    .eq("id", clientId)
    .eq("role", "client")
    .eq("is_active", true)
    .maybeSingle();

  if (!clientUser) return { error: "Client not found or not active." };

  // 3. Find the current active goal
  const { data: currentGoal } = await admin
    .from("goals")
    .select("id")
    .eq("user_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  if (!currentGoal) return { error: "No active goal found for this client." };

  // 4. Close the current goal
  const { error: closeError } = await admin
    .from("goals")
    .update({
      is_active:     false,
      completed_at:  new Date().toISOString(),
      change_reason: reason.trim() || null,
      completed_by:  coachId,
    })
    .eq("id", currentGoal.id);

  if (closeError) {
    console.error("[changeClientGoal] failed to close current goal:", closeError.message);
    return { error: "Failed to close current goal. Please try again." };
  }

  // 5. Insert the new active goal
  const { error: insertError } = await admin
    .from("goals")
    .insert({
      user_id:   clientId,
      is_active: true,
      ...newGoalData,
    });

  if (insertError) {
    console.error("[changeClientGoal] failed to insert new goal:", insertError.message);
    // 6. Compensating update — restore the old goal so the client is not left without one
    await admin
      .from("goals")
      .update({ is_active: true, completed_at: null, change_reason: null, completed_by: null })
      .eq("id", currentGoal.id);
    return { error: "Failed to create new goal. Please try again." };
  }

  return {};
}

export async function permanentlyDeleteClient(
  clientId: string,
): Promise<{ error?: string }> {
  const authError = await assertCoach();
  if (authError) return authError;

  const supabase = createAdminClient();

  // Verify the client exists and is archived — only archived clients can be permanently deleted
  const { data: client } = await supabase
    .from("users")
    .select("id, auth_id, is_active")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { error: "Client not found." };
  if (client.is_active) return { error: "Only archived clients can be permanently deleted." };

  // Step 1: Delete public.users row.
  // All app data cascades automatically:
  //   goals → tasks → task_logs (via task_id)
  //   task_logs (via user_id)
  //   progress_logs (via user_id and goal_id)
  //   weight_logs (via user_id)
  //   client_notes (via client_id)
  const { error: deleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", clientId);

  if (deleteError) {
    console.error("[permanentlyDeleteClient] public.users delete failed:", deleteError.message);
    return { error: "Failed to delete client. Please try again." };
  }

  // Step 2: Delete auth.users record — frees the email for reuse.
  // Must happen after public.users is deleted because public.users.auth_id
  // references auth.users(id) with NO ACTION, which blocks auth deletion while the reference exists.
  if (client.auth_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(client.auth_id);
    if (authError) {
      // App data is already gone. Auth account is orphaned but holds no usable data.
      // Log for manual cleanup if needed.
      console.error("[permanentlyDeleteClient] auth.users delete failed:", authError.message);
    }
  }

  return {};
}
