// ─────────────────────────────────────────────
// Supabase client
//
// This file creates a single connection to your Supabase database.
// Import `supabase` from here whenever you need to read or write data.
//
// Example (later, when we connect real data):
//   import { supabase } from "@/lib/supabase"
//   const { data } = await supabase.from("goals").select("*")
// ─────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The `!` at the end tells TypeScript "trust me, this value exists."
// If the env vars are missing, it will fail at runtime with a clear error.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
