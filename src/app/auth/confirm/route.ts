// ─────────────────────────────────────────────
// /auth/confirm — Token Exchange (Route Handler)
//
// Supabase redirects here after the client clicks the invite email link.
// The token is exchanged SERVER-SIDE so the session is written as a proper
// HTTP Set-Cookie header before the browser ever loads /auth/set-password.
//
// Handles both formats Supabase may send:
//   ?token_hash=...&type=invite   (OTP verification — current Supabase default)
//   ?code=...                     (PKCE exchange code — if PKCE flow is enabled)
//
// Why a Route Handler instead of client-side verifyOtp in a useEffect?
// Client-side verifyOtp writes the session to document.cookie via JS. This
// races with React rendering, doesn't produce a proper Set-Cookie header, and
// is invisible to middleware and server components. The Route Handler approach
// sets the session atomically in the HTTP response.
// ─────────────────────────────────────────────

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type      = searchParams.get("type");
  const code      = searchParams.get("code");

  const supabase = await createServerSupabaseClient();

  // ── OTP verification flow (token_hash + type) ──────────────────
  if (tokenHash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
    if (!error) {
      return NextResponse.redirect(new URL("/auth/set-password", request.url));
    }
    console.error("[/auth/confirm] verifyOtp failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=invite_expired", request.url));
  }

  // ── PKCE code exchange flow ─────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/set-password", request.url));
    }
    console.error("[/auth/confirm] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(new URL("/login?error=invite_expired", request.url));
  }

  // ── No token — nothing to exchange ─────────────────────────────
  return NextResponse.redirect(new URL("/login?error=invalid_invite", request.url));
}
