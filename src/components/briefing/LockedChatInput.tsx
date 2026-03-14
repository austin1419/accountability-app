"use client";

import { useRouter } from "next/navigation";

const garamond = "'EB Garamond', serif";

export function LockedChatInput() {
  const router = useRouter();

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%",
      transform: "translateX(-50%)",
      width: "100%", maxWidth: 420,
      background: "linear-gradient(transparent, #0D0D0D 20%)",
      padding: "24px 20px 24px",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
    }}>
      <button
        onClick={() => router.push("/accountability/pulse")}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#141414", border: "1px solid #252525",
          borderRadius: 24, padding: "12px 16px",
          width: "100%", cursor: "pointer",
          transition: "border-color 0.2s",
        }}
      >
        <span style={{
          fontFamily: garamond, fontSize: 14, fontStyle: "italic",
          color: "#807868", flex: 1, textAlign: "left",
        }}>
          Ask your AI coach...
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
            stroke="#B8933A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            opacity={0.5}
          />
        </svg>
      </button>
    </div>
  );
}
