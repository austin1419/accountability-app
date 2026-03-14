"use client";

// ─────────────────────────────────────────────
// SignOutButton
//
// Calls supabase.auth.signOut() and redirects to the given login page.
// Used in both the coach nav and the client header.
// ─────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SignOutButton({
  redirectTo = "/login",
  className  = "",
  style,
  children   = "Sign out",
}: {
  redirectTo?: string;
  className?:  string;
  style?:      React.CSSProperties;
  children?:   React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className={className} style={style}>
      {children}
    </button>
  );
}
