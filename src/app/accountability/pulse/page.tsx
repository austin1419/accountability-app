// ─────────────────────────────────────────────
// PulseAI Chat — interactive coaching conversation
//
// Server Component that authenticates the user,
// loads conversation history, and renders the
// chat interface.
// ─────────────────────────────────────────────

import { redirect }              from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient }     from "@/lib/supabase-admin";
import { PulseChat }             from "@/components/pulse/PulseChat";

export const dynamic = "force-dynamic";

export default async function PulseChatPage() {
  // ── Auth ────────────────────────────────────
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  // ── Date ────────────────────────────────────
  const selectedDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // ── Load or create conversation ─────────────
  // Get the most recent conversation for today, or start fresh
  const { data: recentConvo } = await adminSupabase
    .from("ai_conversations")
    .select("conversation_id, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1);

  let conversationId: string;
  let initialMessages: { role: "user" | "assistant"; content: string }[] = [];

  const lastConvoDate = recentConvo?.[0]?.created_at?.slice(0, 10);
  if (recentConvo?.[0] && lastConvoDate === selectedDate) {
    // Resume today's conversation
    conversationId = recentConvo[0].conversation_id;

    const { data: history } = await adminSupabase
      .from("ai_conversations")
      .select("role, content")
      .eq("user_id", profile.id)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    initialMessages = (history ?? []).map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));
  } else {
    // New conversation
    conversationId = crypto.randomUUID();
  }

  // ── Render ──────────────────────────────────
  return (
    <PulseChat
      selectedDate={selectedDate}
      conversationId={conversationId}
      initialMessages={initialMessages}
    />
  );
}
