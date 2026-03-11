// ─────────────────────────────────────────────
// middleware.ts
//
// Runs on every request before any page renders.
// Two responsibilities:
//   1. Refresh the Supabase auth session so it stays alive between requests.
//   2. Redirect unauthenticated users to the correct login page.
//
// Role-based access (coach vs client) is verified in the layouts,
// which can do a fast DB lookup after the session is confirmed.
// ─────────────────────────────────────────────

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Start with a pass-through response.
  // IMPORTANT: the session refresh MUST happen before any conditional returns.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies to both the request (for downstream middleware)
          // and the response (so the browser receives the refreshed token).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT add logic between createServerClient and getUser().
  // getUser() refreshes the session token. Skipping it breaks session handling.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protect coach routes ──────────────────────────────────────
  const isCoachRoute = pathname.startsWith("/coach") && !pathname.startsWith("/coach/login");
  if (isCoachRoute && !user) {
    return NextResponse.redirect(new URL("/coach/login", request.url));
  }

  // ── Protect client routes ─────────────────────────────────────
  const clientPaths = ["/", "/tasks", "/progress", "/accountability"];
  const isClientRoute = clientPaths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
  );
  if (isClientRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Coach on client route → send to HabitOS ──────────────────
  // Coaches have app_metadata.role = 'coach' set in Supabase Auth dashboard.
  // This prevents coaches from accidentally seeing the client app.
  const role = user?.app_metadata?.role as string | undefined;
  if (isClientRoute && user && role === "coach") {
    return NextResponse.redirect(new URL("/coach", request.url));
  }

  // ── Authenticated users don't need to see login pages ─────────
  if (user && pathname === "/login") {
    const dest = role === "coach" ? "/coach" : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }
  if (user && pathname === "/coach/login") {
    return NextResponse.redirect(new URL("/coach", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
