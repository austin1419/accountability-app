import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { buildClientContext } from "@/lib/ai/buildClientContext";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Use the date from the query string if provided, otherwise default to today (CST).
  const dateParam = request.nextUrl.searchParams.get("date");
  const todayCST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
  }).format(new Date());

  // Validate: must be YYYY-MM-DD and not in the future
  const selectedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= todayCST
      ? dateParam
      : todayCST;

  const clientContext = await buildClientContext(profile.id, selectedDate);
  return NextResponse.json(clientContext);
}
