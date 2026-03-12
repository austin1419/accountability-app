// ─────────────────────────────────────────────
// supabase-admin.ts  — SERVER ONLY
//
// Creates a Supabase client using the service role key.
// This key bypasses Row Level Security entirely, so it should
// NEVER be used in the browser or exposed to the client.
//
// Use this client in:
//   - server-queries.ts  (all coach/server-side data queries)
//   - Server Actions     (invite, createClient in Phase 3)
//
// The `server-only` import throws a build error if this file
// is ever accidentally imported from a client component.
// ─────────────────────────────────────────────

import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        // Do not persist sessions or auto-refresh — this is a one-shot server client.
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  );
}
