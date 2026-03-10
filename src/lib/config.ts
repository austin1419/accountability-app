// ─────────────────────────────────────────────
// App config constants
//
// DEMO_CLIENT_ID is a temporary stand-in for a real auth session.
// It matches the client row inserted by supabase/seed.sql.
//
// Once we add Supabase Auth, this gets replaced with:
//   const { data: { session } } = await supabase.auth.getSession()
//   const userId = session.user.id
// ─────────────────────────────────────────────

export const DEMO_CLIENT_ID = "00000000-0000-0000-0000-000000000002";
