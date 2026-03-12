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
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#7A1E1E] text-center max-w-xs">{authError}</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-5">
        <p className="text-sm text-[#9A9080]">Loading your account…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-5">

      {/* PULSE Logo + Wordmark */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-16">
            <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={1} fill="none" opacity={0.4} />
            <polygon points="50,14 80,28 90,57 76,82 50,90 24,82 10,57 20,28" stroke="#B8933A" strokeWidth={0.5} fill="none" opacity={0.2} />
            <polyline
              style={{ filter: "drop-shadow(0 0 4px rgba(184,147,58,0.9))" }}
              points="10,50 22,50 27,50 31,34 35,66 39,50 44,50 50,22 56,50 61,50 65,40 69,60 73,50 78,50 90,50"
              stroke="#B8933A" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx="50" cy="50" r="3" fill="#B8933A" />
          </svg>
        </div>
        <p
          className="text-2xl tracking-[0.4em] text-[#F4EEE4] uppercase"
          style={{ fontFamily: "'Cinzel', serif", fontWeight: 900 }}
        >
          PULSE
        </p>
        <p
          className="text-sm text-[#807868] mt-3 max-w-xs mx-auto leading-relaxed"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
        >
          Most apps track what you do. PULSE tracks who you&apos;re becoming.
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#141414] rounded border border-[#252525] w-full max-w-sm p-8">
        <h1
          className="text-base text-[#F4EEE4] mb-1 tracking-wider uppercase"
          style={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}
        >
          Welcome
        </h1>
        <p className="text-sm text-[#9A9080] mb-6">
          Create a password to access your dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] text-[#9A9080] mb-1.5 uppercase tracking-widest"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className="w-full border border-[#252525] rounded px-3 py-2.5 text-sm text-[#DDD5C0] bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] placeholder:text-[#807868]"
            />
          </div>

          <div>
            <label
              className="block text-[10px] text-[#9A9080] mb-1.5 uppercase tracking-widest"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-[#252525] rounded px-3 py-2.5 text-sm text-[#DDD5C0] bg-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#B8933A] focus:border-[#B8933A] placeholder:text-[#807868]"
            />
          </div>

          {error && <p className="text-xs text-[#7A1E1E]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#B8933A] hover:bg-[#C9A44A] disabled:opacity-60 text-[#0D0D0D] text-xs font-semibold py-2.5 rounded transition-colors uppercase tracking-widest"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {loading ? "Setting up…" : "Set Password & Continue"}
          </button>
        </form>
      </div>

    </div>
  );
}
