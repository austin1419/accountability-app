// ─────────────────────────────────────────────
// resolveCoachId — SERVER ONLY
//
// Resolves the current authenticated coach's user ID.
// Redirects if not authenticated or not a coach.
// Shared across all coach pages.
// ─────────────────────────────────────────────

import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function resolveCoachId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/coach/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .eq("role", "coach")
    .maybeSingle();

  if (!data) redirect("/login");
  return data.id;
}
