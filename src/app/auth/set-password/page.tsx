"use client";

// ─────────────────────────────────────────────
// /auth/set-password — Set Password
//
// Clients land here after /auth/confirm exchanges the invite token and
// writes a valid session cookie. The session is already in cookies at
// this point — no token exchange needed on this page.
//
// We verify the session exists before showing the form. If it doesn't,
// we show the real error instead of silently failing on updateUser.
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready,     setReady]     = useState(false);
  const [authError, setAuthError] = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        setAuthError(
          "Session not found. Your invite link may have expired or already been used. " +
          "Please ask your coach to send a new invite."
        );
      }
    });
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
      // Show the real Supabase error — do not swallow it.
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-red-500 text-center max-w-xs">{authError}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm text-gray-400">Loading your account…</p>
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
