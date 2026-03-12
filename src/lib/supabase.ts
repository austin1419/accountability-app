// ─────────────────────────────────────────────
// Supabase browser client
//
// Used by client components ("use client") for all data queries and auth.
// createBrowserClient stores the session in cookies (not localStorage),
// so the server can also read the active session via supabase-server.ts.
//
// Import `supabase` from here in any client component.
// For server components, use supabase-server.ts instead.
// ─────────────────────────────────────────────

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
