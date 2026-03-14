"use client";

import { useState, useRef, useEffect } from "react";
import type { ClientAIContext } from "@/lib/ai/types";

type ChatMessage = {
  role: "user" | "coach";
  text: string;
  scenario?: string;
};

type Props = {
  clientContext: ClientAIContext;
};

type ConversationEntry = {
  role: "user" | "coach";
  message: string;
};

export function PulseChatTest({ clientContext }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/pulse-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientContext,
          userMessage: text,
          conversationHistory: history,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "coach",
            text: data.aiMessage ?? data.deterministicMessage ?? data.message,
            scenario: data.scenario,
          },
        ]);
        setHistory(data.conversationHistory ?? []);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "coach", text: `Error: ${data.error ?? res.statusText}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: `Network error: ${err instanceof Error ? err.message : "unknown"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Context summary for debug ───────────────
  const ctxSummary = [
    `streak: ${clientContext.streak}`,
    `today: ${clientContext.compliance.today.completed}/${clientContext.compliance.today.total}`,
    `week: ${clientContext.compliance.week.percent}%`,
    clientContext.goal ? `goal: ${clientContext.goal.goalName}` : "no goal",
  ].join(" · ");

  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "#0D0D0D",
      color: "#F4EEE4",
      fontFamily: "'EB Garamond', serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #252525",
      }}>
        <h1 style={{
          fontSize: 14,
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "#B8933A",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Pulse Chat (Internal Test)
        </h1>
        <p style={{
          fontSize: 11,
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          color: "#807868",
          margin: "6px 0 0",
        }}>
          {ctxSummary}
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {messages.length === 0 && (
          <p style={{ color: "#807868", fontSize: 14, fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
            Send a message to test the coaching engine.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "85%",
          }}>
            <div style={{
              background: msg.role === "user" ? "#1A1A12" : "#141414",
              border: `1px solid ${msg.role === "user" ? "#2A2A1A" : "#252525"}`,
              borderRadius: msg.role === "user"
                ? "16px 16px 4px 16px"
                : "16px 16px 16px 4px",
              padding: "10px 14px",
            }}>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {msg.text}
              </p>
            </div>
            {msg.scenario && (
              <span style={{
                display: "block",
                fontSize: 10,
                fontFamily: "'Cinzel', serif",
                color: "#807868",
                marginTop: 4,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                scenario: {msg.scenario}
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ alignSelf: "flex-start", maxWidth: "85%" }}>
            <div style={{
              background: "#141414",
              border: "1px solid #252525",
              borderRadius: "16px 16px 16px 4px",
              padding: "10px 14px",
            }}>
              <p style={{ margin: 0, fontSize: 14, color: "#807868" }}>...</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 20px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        borderTop: "1px solid #252525",
        display: "flex",
        gap: 8,
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: "#141414",
            border: "1px solid #252525",
            borderRadius: 20,
            padding: "10px 16px",
            fontSize: 14,
            fontFamily: "'EB Garamond', serif",
            color: "#F4EEE4",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            background: "#B8933A",
            border: "none",
            borderRadius: 20,
            padding: "10px 20px",
            fontSize: 12,
            fontFamily: "'Cinzel', serif",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#0D0D0D",
            cursor: loading || !input.trim() ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
            textTransform: "uppercase",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
