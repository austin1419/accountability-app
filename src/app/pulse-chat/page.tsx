// ─────────────────────────────────────────────
// Pulse Chat — Internal Test Page (Server Component)
//
// Fetches real client context via buildClientContext,
// then passes it to the chat UI for scenario detection.
// ─────────────────────────────────────────────

import { redirect }                   from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }          from "@/lib/supabase-admin";
import { buildClientContext }         from "@/lib/ai/buildClientContext";
import { PulseChatTest }              from "./PulseChatTest";

export const dynamic = "force-dynamic";

export default async function PulseChatTestPage() {
  // ── Auth ────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date (CST) ─────────────────────────────
  const selectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // ── Build full client context ───────────────
  const clientContext = await buildClientContext(profile.id, selectedDate);

  return <PulseChatTest clientContext={clientContext} />;
}
