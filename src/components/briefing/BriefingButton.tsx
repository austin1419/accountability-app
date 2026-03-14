"use client";

import { useRouter } from "next/navigation";

type Props = {
  available: boolean;
};

export function BriefingButton({ available }: Props) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/accountability/briefing")}
      style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        cursor: "pointer",
        border: available ? "1.5px solid #B8933A" : "1.5px solid #3A3020",
        borderRadius: 5,
        padding: "7px 14px",
        background: available ? "rgba(184,147,58,0.12)" : "rgba(184,147,58,0.04)",
        color: available ? "#D4A84B" : "#807868",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {available ? "View" : "Preparing"}
    </button>
  );
}
