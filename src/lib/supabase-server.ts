// ─────────────────────────────────────────────
// supabase-server.ts
//
// Creates a Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Reads the user's session from cookies so the server
// knows who is logged in and can include their JWT in database requests.
//
// Import createServerClient from here whenever you need to call
// supabase.auth.getUser() inside a server component or layout.
// ─────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // The middleware keeps the session refreshed.
          }
        },
      },
    }
  );
}
