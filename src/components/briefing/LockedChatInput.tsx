"use client";

const cinzel = "'Cinzel', serif";
const garamond = "'EB Garamond', serif";

export function LockedChatInput() {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%",
      transform: "translateX(-50%)",
      width: "100%", maxWidth: 420,
      background: "linear-gradient(transparent, #0D0D0D 20%)",
      padding: "24px 20px 24px",
      paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#141414", border: "1px solid #252525",
        borderRadius: 24, padding: "12px 16px",
        opacity: 0.5,
      }}>
        <span style={{
          fontFamily: garamond, fontSize: 14, fontStyle: "italic",
          color: "#807868", flex: 1,
        }}>
          Ask your AI coach...
        </span>
        <span style={{
          fontFamily: cinzel, fontSize: 7, fontWeight: 700,
          letterSpacing: "0.12em", color: "#3A3020",
          textTransform: "uppercase",
          background: "rgba(184,147,58,0.06)",
          border: "1px solid #2A2A1A",
          borderRadius: 3, padding: "3px 8px",
          whiteSpace: "nowrap",
        }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}
