"use client";

// ─────────────────────────────────────────────
// /auth/confirm — Set Password
//
// Clients land here after clicking their invite email link.
// Supabase appends session tokens to the URL hash:
//   /auth/confirm#access_token=...&refresh_token=...&type=invite
//
// The Supabase browser client detects those hash params automatically
// and fires an SIGNED_IN auth state change. We then show a form
// so the client can set a permanent password for their account.
// After saving, they're redirected to the client dashboard.
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [ready,    setReady]    = useState(false);
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    // Primary path: parse hash tokens from the URL and set the session directly.
    // More reliable than waiting for onAuthStateChange, which can fire during
    // Supabase client initialization — before this useEffect registers.
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => { if (!error) setReady(true); });
      return;
    }

    // Fallback: check for an existing session (e.g. page reload after token exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session) {
          setReady(true);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Failed to set password. Please try again.");
      return;
    }

    // Sign out the invite session so the client starts fresh from login.
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-gray-400">Verifying your invite…</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          On iPhone? If this screen does not proceed, open the link in{" "}
          <strong className="text-gray-500">Safari</strong> to complete your setup.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">

      {/* Brand */}
      <div className="mb-8 text-center">
        <p className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-1">
          IronTribe <span className="text-gray-800">PULSE</span>
        </p>
        <p className="text-xs text-gray-400">Set up your account</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome!</h1>
        <p className="text-sm text-gray-400 mb-6">
          Create a password to access your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? "Setting up…" : "Set Password & Continue"}
          </button>
        </form>
      </div>

    </div>
  );
}
