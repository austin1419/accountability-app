"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ClientAIContext } from "@/lib/ai/types";

type ChatMessage = {
  role: "user" | "coach";
  text: string;
  scenario?: string;
};

type ConversationEntry = {
  role: "user" | "coach";
  message: string;
};

export function PulseChatModal({ isOpen, onClose, selectedDate }: { isOpen: boolean; onClose: () => void; selectedDate: string }) {
  const [clientContext, setClientContext] = useState<ClientAIContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track which date the cached context was built for
  const [contextDate, setContextDate] = useState<string | null>(null);

  // Fetch client context when modal opens or selected date changes
  useEffect(() => {
    if (!isOpen) return;
    if (clientContext && contextDate === selectedDate) return; // already loaded for this date
    setContextLoading(true);
    fetch(`/api/pulse/context?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setClientContext(data);
        setContextDate(selectedDate);
      })
      .catch((err) => console.error("[PulseChatModal] context fetch failed:", err))
      .finally(() => setContextLoading(false));
  }, [isOpen, selectedDate, clientContext, contextDate]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when context loads
  useEffect(() => {
    if (isOpen && clientContext && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, clientContext]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !clientContext) return;

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
  }, [input, loading, clientContext, history]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}
      >
        {/* Modal — full-height card sliding up from bottom */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#0D0D0D",
            border: "1px solid #2A2A1A",
            borderRadius: "16px 16px 0 0",
            width: "100%",
            maxWidth: 480,
            height: "85dvh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #252525",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg viewBox="0 0 100 100" fill="none" width={22} height={22}>
                <polygon points="50,3 87,20 97,57 80,90 50,97 20,90 3,57 13,20" stroke="#B8933A" strokeWidth={2.5} fill="none" opacity={0.5} />
                <polyline points="14,50 24,50 28,50 32,36 36,64 40,50 45,50 50,24 55,50 60,50 64,41 68,59 72,50 76,50 86,50" stroke="#B8933A" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="50" cy="50" r="4" fill="#B8933A" />
              </svg>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.18em", color: "#F4EEE4", textTransform: "uppercase",
              }}>
                Pulse AI
              </span>
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                border: "1px solid #2A2A1A", background: "none",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#807868", fontSize: 16,
                fontFamily: "sans-serif", lineHeight: 1,
              }}
            >
              &#x2715;
            </button>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            {contextLoading && (
              <p style={{
                color: "#807868", fontSize: 14, fontStyle: "italic",
                textAlign: "center", marginTop: 40,
                fontFamily: "'EB Garamond', serif",
              }}>
                Loading your coaching context...
              </p>
            )}

            {!contextLoading && messages.length === 0 && (
              <p style={{
                color: "#807868", fontSize: 14, fontStyle: "italic",
                textAlign: "center", marginTop: 40,
                fontFamily: "'EB Garamond', serif",
              }}>
                Ask your coach anything.
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
                  <p style={{
                    margin: 0, fontSize: 14, lineHeight: 1.5,
                    whiteSpace: "pre-wrap", color: "#F4EEE4",
                    fontFamily: "'EB Garamond', serif",
                  }}>
                    {msg.text}
                  </p>
                </div>
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
                  <p style={{
                    margin: 0, fontSize: 14, color: "#807868",
                    fontFamily: "'EB Garamond', serif",
                  }}>...</p>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input — pinned at bottom */}
          <div style={{
            padding: "12px 20px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid #252525",
            display: "flex",
            gap: 8,
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="Type a message..."
              disabled={contextLoading}
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
              disabled={loading || !input.trim() || contextLoading}
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
                cursor: loading || !input.trim() || contextLoading ? "default" : "pointer",
                opacity: loading || !input.trim() || contextLoading ? 0.4 : 1,
                textTransform: "uppercase",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
