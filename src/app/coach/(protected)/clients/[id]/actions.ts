"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Verifies the caller is an authenticated coach. Returns an error object if not.
async function assertCoach(): Promise<{ error: string } | null> {
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
