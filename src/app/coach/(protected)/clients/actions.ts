"use server";

// ─────────────────────────────────────────────
// Coach Server Actions
//
// Runs on the server — safe to use the admin (service role) client here.
// Called directly from AddClientModal (client component).
// ─────────────────────────────────────────────

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";

export async function createClientWithInvite(data: {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string | null;
  goalName:       string;
  goalDate:       string;
  startingWeight: number | null;
}): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // ── 1. Create public.users row ────────────────────────────────
  const { data: newUser, error: userError } = await supabase
    .from("users")
    .insert({
      name:         `${data.firstName} ${data.lastName}`,
      email:        data.email,
      phone_number: data.phone,
      role:         "client",
    })
    .select("id")
    .single();

  if (userError) {
    if (userError.code === "23505") {
      return { error: "A client with that email already exists." };
    }
    console.error("[createClientWithInvite] users insert failed:", userError.message);
    return { error: "Failed to create client. Please try again." };
  }

  // ── 2. Create the client's first goal ─────────────────────────
  const { error: goalError } = await supabase
    .from("goals")
    .insert({
      user_id:      newUser.id,
      goal_name:    data.goalName,
      goal_date:    data.goalDate,
      start_weight: data.startingWeight,
    });

  if (goalError) {
    // Roll back the user row so there's no orphan record
    await supabase.from("users").delete().eq("id", newUser.id);
    console.error("[createClientWithInvite] goals insert failed:", goalError.message);
    return { error: "Failed to save goal. Please try again." };
  }

  // ── 3. Derive the site URL for the invite redirect ────────────
  // Using the request host so this works in both local dev and production
  // without requiring an extra env variable.
  const headersList = await headers();
  const host        = headersList.get("host") ?? "localhost:3000";
  const protocol    = host.includes("localhost") ? "http" : "https";
  const siteUrl     = `${protocol}://${host}`;

  // ── 4. Send the Supabase invite email ─────────────────────────
  // This creates the auth.users row and sends the "Accept Invite" email.
  // The on_auth_user_created trigger auto-links auth_id on the
  // public.users row we just created (matches by email).
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    data.email,
    { redirectTo: `${siteUrl}/auth/confirm` },
  );

  if (inviteError) {
    // DB records exist but no auth account was created.
    // The coach can retry by inviting the client manually from the Supabase dashboard.
    console.error("[createClientWithInvite] invite failed:", inviteError.message);
    return {
      error:
        "Client record created, but the invite email failed to send. " +
        "You can send the invite manually from the Supabase dashboard.",
    };
  }

  return {};
}
