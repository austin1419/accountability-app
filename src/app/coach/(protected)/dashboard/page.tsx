// ─────────────────────────────────────────────
// /coach/dashboard → redirects to /coach
//
// The main dashboard now lives at /coach.
// This page redirects to avoid stale 3-column layout.
// ─────────────────────────────────────────────

import { redirect } from "next/navigation";

export default function DashboardRedirect() {
  redirect("/coach");
}
